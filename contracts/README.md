# Contracts

Hardhat project for the STK staking dApp — two Solidity contracts (built on OpenZeppelin v5, Solidity 0.8.24) deployed on Sepolia.

## Overview

- **`StakeToken.sol`** — an ERC-20 token with a built-in faucet. `claim()` mints 100 STK per call, gated by a 6-hour per-wallet cooldown enforced on-chain (`nextClaimTime(account)` exposes the next eligible timestamp). Reward minting is delegated to the staking contract through a one-time, owner-only `setMinter` grant that cannot be changed once set.
- **`Staking.sol`** — stake and unstake STK and earn rewards that accrue every second. Rewards are computed with the O(1) accumulator pattern (`rewardPerTokenStored` / `userRewardPerTokenPaid`), updated on every stake/unstake/claim, and minted on `claimRewards()`. State-changing entrypoints are protected with `ReentrancyGuard`.

Event signatures consumed by the backend indexer: `Staked`, `Unstaked`, `Claimed` (all `address indexed user, uint256 amount`) and the ERC-20 `Transfer` (faucet claims are mints, `from == 0x0`).

## Deployed addresses (Sepolia)

| Contract | Address |
| --- | --- |
| StakeToken | [`0x8D8450F9a785167dCbE2595475D5c03f0E850cf7`](https://sepolia.etherscan.io/address/0x8D8450F9a785167dCbE2595475D5c03f0E850cf7) |
| Staking | [`0x6A6fD4Cf0455E63543f6552083df6F7deb647f7C`](https://sepolia.etherscan.io/address/0x6A6fD4Cf0455E63543f6552083df6F7deb647f7C) |

Deploy block: `11044588`.

## Configuration

Copy `.env.example` to `.env` (gitignored) and fill in:

| Var | Description |
| --- | --- |
| `SEPOLIA_RPC_URL` | Sepolia JSON-RPC endpoint |
| `PRIVATE_KEY` | Deployer wallet private key (needs Sepolia ETH) |
| `ETHERSCAN_API_KEY` | Required for `hardhat verify` |

## Usage

```bash
npm install
npx hardhat test                                    # run the test suite locally
npx hardhat run scripts/deploy.js --network sepolia # deploy token + staking, then setMinter
```

The deploy script deploys the token, deploys staking against the token address, calls `setMinter(staking)`, and prints:

- `TOKEN_ADDRESS`, `STAKING_ADDRESS`, `DEPLOY_BLOCK` — to paste into `backend/.env` and both `*/.env.local` files
- ready-to-run verification commands:

```bash
npx hardhat verify --network sepolia <TOKEN_ADDRESS>
npx hardhat verify --network sepolia <STAKING_ADDRESS> <TOKEN_ADDRESS>
```

## Reward model

`REWARD_RATE = 1e12` reward-wei per second per whole staked token, so each staked STK earns ~31.5 STK/year (~3154% APR — intentionally high for a demo). Staking 100 STK yields ~0.006 STK per minute, visible at 4 display decimals.

## Updating the shared ABIs

After any change to the contracts, recompile and re-copy the artifacts the web apps consume:

```bash
npx hardhat compile
copy artifacts\contracts\StakeToken.sol\StakeToken.json ..\shared\abi\StakeToken.json
copy artifacts\contracts\Staking.sol\Staking.json ..\shared\abi\Staking.json
```
