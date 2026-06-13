# STK Staking dApp

A Web3 staking dApp on Sepolia: an ERC-20 token with a faucet (`claim()` mints 100 STK with an on-chain cooldown) and a staking contract that pays rewards over time.

## Architecture

```
┌────────────┐     SIWE + JWT      ┌─────────────┐    service key   ┌──────────┐
│ frontend/  │ ──────────────────► │  backend/   │ ───────────────► │ Supabase │
│ Next.js    │     REST (JSON)     │  Express    │                  │ events   │
│ :3000      │                     │  :4000      │ ◄─── indexer ─── │ state    │
└────────────┘                     │             │     (15s poll)   └──────────┘
┌────────────┐                     │             │
│ admin/     │ ──────────────────► │             │ ◄──── ethers ───► Sepolia RPC
│ Next.js    │   admin JWT only    └─────────────┘
│ :3001      │
└────────────┘
      │  wagmi/viem (wallet txs: claim / approve / stake / unstake / claimRewards)
      ▼
   MetaMask ──────────────────────────────────────────────────────► Sepolia
```

- **contracts/** — Hardhat project: `StakeToken.sol` (ERC-20, faucet mints 100 STK / 6h cooldown, one-time minter grant) and `Staking.sol` (per-second reward accrual, ~3154% APR demo rate, rewards minted on claim). See [contracts/README.md](contracts/README.md) for deploy/verify instructions.
- **backend/** — Express API + on-chain event indexer. Polls Sepolia every 15s for `Staked` / `Unstaked` / `Claimed` and faucet mints (`Transfer` from `0x0`), stores them idempotently in Supabase. Auth is Sign-In-With-Ethereum → 24h JWT; wallets listed in `ADMIN_ADDRESSES` get `role: admin`.
- **frontend/** — user app: dashboard, faucet claim with countdown, approve→stake flow, unstake, claim rewards, history.
- **admin/** — admin-only dashboard: overview with charts (recharts), per-wallet staker table with live on-chain balances, filterable activity feed.
- **shared/abi/** — contract artifacts (ABI) imported by all three web apps, copied from `contracts/artifacts/` (see [shared/abi/README.md](shared/abi/README.md)).

All API amounts are raw 18-decimal uint256 values serialized as strings; frontends format with `formatUnits`.

## Prerequisites

- Node.js 20+
- A Supabase project with these tables:

```sql
create table events (
  id bigint generated always as identity primary key,
  tx_hash text, log_index int, event_type text, wallet text,
  amount numeric, block_number bigint, ts timestamptz,
  unique (tx_hash, log_index)
);
create table indexer_state (id int primary key default 1, last_block bigint);
```

- A Sepolia RPC URL and MetaMask with Sepolia ETH.

## Running locally

Run each app in its own terminal, **backend first**.

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env   # then fill in every value
npm run dev              # http://localhost:4000
```

### 2. User frontend

```bash
cd frontend
npm install
copy .env.example .env.local   # then fill in addresses
npm run dev                    # http://localhost:3000
```

### 3. Admin app

```bash
cd admin
npm install
copy .env.example .env.local   # then fill in addresses
npm run dev                    # http://localhost:3001
```

## Environment variables

### backend/.env

| Var | Description |
| --- | --- |
| `PORT` | API port (default 4000) |
| `SEPOLIA_RPC_URL` | Sepolia JSON-RPC endpoint |
| `TOKEN_ADDRESS` | Deployed StakeToken address |
| `STAKING_ADDRESS` | Deployed Staking address |
| `DEPLOY_BLOCK` | Block the contracts were deployed at (indexer start) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase **service role** key (server-side only) |
| `JWT_SECRET` | Long random string for signing JWTs |
| `ADMIN_ADDRESSES` | Comma-separated admin wallet addresses |
| `FRONTEND_ORIGINS` | Comma-separated CORS origins (e.g. `http://localhost:3000,http://localhost:3001`) |

### frontend/.env.local and admin/.env.local

| Var | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:4000`) |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Deployed StakeToken address |
| `NEXT_PUBLIC_STAKING_ADDRESS` | Deployed Staking address |

## API summary

| Route | Auth | Description |
| --- | --- | --- |
| `GET /health` | — | Liveness check |
| `GET /auth/nonce` | — | SIWE nonce (5-min expiry, single use) |
| `POST /auth/login` | — | `{ message, signature }` → `{ token, wallet, role }` |
| `GET /api/stats` | — | TVL (live on-chain) + event counts |
| `GET /api/activity?limit=` | — | Recent events, newest first |
| `GET /api/me/position` | JWT | Live balance / staked / rewards for the JWT wallet |
| `GET /api/me/activity` | JWT | The JWT wallet's events |
| `GET /api/admin/stakers` | admin | Every seen wallet with live on-chain position (30s cache) |
| `GET /api/admin/activity?type=&wallet=&from=&to=&limit=&offset=` | admin | Filterable, paginated feed |
| `GET /api/admin/stats` | admin | Totals + 14-day per-day counts and cumulative-staked series |
| `GET /api/admin/wallet/:address` | admin | Position + activity for one wallet |

## Deployed addresses (fill in)

| What | Value |
| --- | --- |
| StakeToken (Sepolia) | `TODO` |
| Staking (Sepolia) | `TODO` |
| Deploy block | `TODO` |

## Live URLs (fill in)

| App | URL |
| --- | --- |
| Backend API | `TODO` |
| User frontend | `TODO` |
| Admin app | `TODO` |
