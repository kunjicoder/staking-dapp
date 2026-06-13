import { ethers } from 'ethers';
import { config } from './config.js';
import { provider, token, staking } from './chain.js';
import { supabase } from './supabase.js';

// Alchemy's free tier caps eth_getLogs at a 10-block range, so we scan in
// 10-block chunks, at most MAX_CHUNKS_PER_CYCLE per 15s cycle (catching up on
// backlog gradually), and persist last_block after every chunk.
const CHUNK_BLOCKS = 10;
const MAX_CHUNKS_PER_CYCLE = 20;

const TYPE_BY_EVENT = { Staked: 'stake', Unstaked: 'unstake', Claimed: 'reward' };

const stakingTopics = Object.keys(TYPE_BY_EVENT).map((name) => staking.interface.getEvent(name).topicHash);
const transferTopic = token.interface.getEvent('Transfer').topicHash;
const zeroAddressTopic = ethers.zeroPadValue(ethers.ZeroAddress, 32);

const blockTsCache = new Map(); // blockNumber -> ISO timestamp

async function blockTimestamp(blockNumber) {
  if (blockTsCache.has(blockNumber)) return blockTsCache.get(blockNumber);
  const block = await provider.getBlock(blockNumber);
  const iso = new Date(Number(block.timestamp) * 1000).toISOString();
  blockTsCache.set(blockNumber, iso);
  if (blockTsCache.size > 2000) {
    // crude cap: drop the oldest entries
    for (const key of [...blockTsCache.keys()].slice(0, 1000)) blockTsCache.delete(key);
  }
  return iso;
}

async function getLastBlock() {
  const { data, error } = await supabase.from('indexer_state').select('last_block').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) {
    const { error: insErr } = await supabase.from('indexer_state').insert({ id: 1, last_block: 0 });
    if (insErr) throw insErr;
    return 0;
  }
  return Number(data.last_block);
}

async function setLastBlock(block) {
  const { error } = await supabase.from('indexer_state').upsert({ id: 1, last_block: block });
  if (error) throw error;
}

async function toRow(log, eventType, wallet, amount) {
  return {
    tx_hash: log.transactionHash.toLowerCase(),
    log_index: log.index,
    event_type: eventType,
    wallet: wallet.toLowerCase(),
    amount: amount.toString(),
    block_number: log.blockNumber,
    ts: await blockTimestamp(log.blockNumber),
  };
}

// One eth_getLogs per contract: the three staking events are OR-ed into a
// single topic filter, and token mints are pre-filtered by from == 0x0.
async function scanChunk(fromBlock, toBlock) {
  const [stakingLogs, mintLogs] = await Promise.all([
    provider.getLogs({
      address: config.stakingAddress,
      fromBlock,
      toBlock,
      topics: [stakingTopics],
    }),
    provider.getLogs({
      address: config.tokenAddress,
      fromBlock,
      toBlock,
      topics: [transferTopic, zeroAddressTopic],
    }),
  ]);

  const rows = [];
  // A reward claim may mint tokens (Transfer from 0x0) in the same tx as the
  // staking Claimed event — those mints are rewards, not faucet claims. The
  // pair always shares a block, so chunking can't split it.
  const rewardTxs = new Set();

  for (const log of stakingLogs) {
    const parsed = staking.interface.parseLog(log);
    const eventType = TYPE_BY_EVENT[parsed.name];
    if (eventType === 'reward') rewardTxs.add(log.transactionHash.toLowerCase());
    rows.push(await toRow(log, eventType, parsed.args.user, parsed.args.amount));
  }
  for (const log of mintLogs) {
    const parsed = token.interface.parseLog(log);
    const to = parsed.args.to.toLowerCase();
    if (to === config.stakingAddress) continue; // mint to staking contract = reward pool funding
    if (rewardTxs.has(log.transactionHash.toLowerCase())) continue; // reward mint, already recorded
    rows.push(await toRow(log, 'claim', parsed.args.to, parsed.args.value));
  }
  return rows;
}

let running = false;

export async function indexerCycle() {
  if (running) return; // skip overlapping cycles
  running = true;
  try {
    const last = await getLastBlock();
    const latest = await provider.getBlockNumber();
    let fromBlock = Math.max(last + 1, config.deployBlock);

    let chunks = 0;
    let stored = 0;
    const cycleStart = fromBlock;
    while (fromBlock <= latest && chunks < MAX_CHUNKS_PER_CYCLE) {
      const toBlock = Math.min(latest, fromBlock + CHUNK_BLOCKS - 1);
      const rows = await scanChunk(fromBlock, toBlock);
      if (rows.length) {
        const { error } = await supabase
          .from('events')
          .upsert(rows, { onConflict: 'tx_hash,log_index', ignoreDuplicates: true });
        if (error) throw error;
        stored += rows.length;
      }
      await setLastBlock(toBlock); // persist per chunk so progress survives a failure
      fromBlock = toBlock + 1;
      chunks += 1;
    }

    if (chunks > 0 && stored > 0) {
      console.log(`[indexer] blocks ${cycleStart}-${fromBlock - 1}: stored ${stored} events`);
    }
    if (fromBlock <= latest) {
      console.log(`[indexer] catching up — ${latest - fromBlock + 1} blocks behind`);
    }
  } catch (err) {
    console.error('[indexer] cycle failed:', err.message ?? err);
  } finally {
    running = false;
  }
}

export function startIndexer() {
  indexerCycle();
  setInterval(indexerCycle, 15_000);
  console.log(`[indexer] polling every 15s (${CHUNK_BLOCKS}-block chunks, max ${MAX_CHUNKS_PER_CYCLE}/cycle)`);
}
