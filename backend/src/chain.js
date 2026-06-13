import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAbi(name) {
  const file = path.resolve(__dirname, '../../shared/abi', `${name}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  // accept either a raw ABI array or a full Hardhat artifact ({ abi: [...] })
  return Array.isArray(json) ? json : json.abi;
}

export const provider = new ethers.JsonRpcProvider(config.rpcUrl);
export const token = new ethers.Contract(config.tokenAddress, loadAbi('StakeToken'), provider);
export const staking = new ethers.Contract(config.stakingAddress, loadAbi('Staking'), provider);

export async function readPosition(wallet) {
  const [balance, staked, pending] = await Promise.all([
    token.balanceOf(wallet),
    staking.stakedBalance(wallet),
    staking.pendingRewards(wallet),
  ]);
  return {
    wallet: wallet.toLowerCase(),
    tokenBalance: balance.toString(),
    stakedBalance: staked.toString(),
    pendingRewards: pending.toString(),
  };
}
