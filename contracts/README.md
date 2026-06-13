# Contracts

Hardhat project for the STK staking dApp: `StakeToken.sol` (ERC-20 + faucet + one-time minter grant) and `Staking.sol` (per-second reward accrual, rewards minted on claim).

## Env vars

Copy `.env.example` to `.env` (gitignored) and fill in:

| Var | Description |
| --- | --- |
| `SEPOLIA_RPC_URL` | Sepolia JSON-RPC endpoint |
| `PRIVATE_KEY` | Deployer wallet private key (needs Sepolia ETH) |
| `ETHERSCAN_API_KEY` | For `hardhat verify` |

## Commands

```bash
npm install
npx hardhat test                                    # run the 16-test suite locally
npx hardhat run scripts/deploy.js --network sepolia # deploy + setMinter
```

The deploy script deploys the token, deploys staking with the token address, calls `setMinter(staking)`, and prints:

- `TOKEN_ADDRESS`, `STAKING_ADDRESS`, `DEPLOY_BLOCK` — paste into `backend/.env` and both `*/.env.local` files
- ready-to-run verify commands:

```bash
npx hardhat verify --network sepolia <TOKEN_ADDRESS>
npx hardhat verify --network sepolia <STAKING_ADDRESS> <TOKEN_ADDRESS>
```

## Reward model

`REWARD_RATE = 1e12` reward-wei per second per whole staked token →
each staked STK earns ~31.5 STK/year (~3154% APR, intentionally high for a demo).
Staking 100 STK earns 0.006 STK per minute, visible at 4 display decimals.
Accounting is the O(1) accumulator pattern (`rewardPerTokenStored` /
`userRewardPerTokenPaid` / `rewards`), updated on every stake/unstake/claim.

## After deploying

Re-copy the artifacts if you change the contracts:

```bash
copy artifacts\contracts\StakeToken.sol\StakeToken.json ..\shared\abi\StakeToken.json
copy artifacts\contracts\Staking.sol\Staking.json ..\shared\abi\Staking.json
```
