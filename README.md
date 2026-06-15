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

```bash
# 1. Backend  →  http://localhost:4000
cd backend
npm install
cp .env.example .env            # then fill in every value
npm run dev

# 2. User frontend  →  http://localhost:3000
cd frontend
npm install
cp .env.example .env.local      # then fill in addresses + API URL
npm run dev

# 3. Admin app  →  http://localhost:3001
cd admin
npm install
cp .env.example .env.local      # then fill in addresses + API URL
npm run dev
```

> On Windows, use `copy` instead of `cp`.

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
| `FRONTEND_ORIGINS` | Comma-separated CORS origins, no trailing slash (drives CORS + the SIWE domain check) |

### frontend/.env.local and admin/.env.local

| Var | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL, no trailing slash (e.g. `http://localhost:4000`) |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Deployed StakeToken address |
| `NEXT_PUBLIC_STAKING_ADDRESS` | Deployed Staking address |
| `NEXT_PUBLIC_RPC_URL` | *(optional)* Dedicated Sepolia RPC for browser reads; falls back to the public RPC if unset |

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

## Security considerations

**Secrets & configuration**
- `.env` files are gitignored — only `.env.example` templates are committed. No secrets live in the repo.
- `SUPABASE_SERVICE_KEY` is used **server-side only** (it bypasses row-level security) and is never sent to a browser or bundled into the frontends.
- `JWT_SECRET` must be a long random value, set only on the backend host.
- Frontends only ever receive `NEXT_PUBLIC_*` values (API URL, public contract addresses, optional RPC) — never service keys or signing secrets.

**Authentication & authorization**
- Login is Sign-In-With-Ethereum: nonces are single-use with a 5-minute TTL, and the backend verifies the signature, the `chainId` (Sepolia), and the message `domain` against the allow-listed origins.
- Sessions are 24h JWTs signed with `JWT_SECRET`; every protected route re-verifies the token server-side.
- Admin access is decided **on the server** from `ADMIN_ADDRESSES` (encoded into the JWT as `role`), never trusted from the client.
- CORS is restricted to the origins in `FRONTEND_ORIGINS`; the same list drives the SIWE domain check.

**On-chain**
- The faucet cooldown and all reward accounting are enforced **on-chain**; the backend/UI only read state and cannot grant tokens.
- Wallet transactions are signed client-side in the user's wallet — the apps never handle private keys.

**Known limitations (by design, testnet demo)**
- JWTs are stored in `localStorage`, which is readable by JavaScript (XSS exposure) — acceptable for a testnet demo, but a production app should prefer httpOnly cookies.
- The contracts are **unaudited** and the reward rate (~3154% APR) is a deliberately high demo value, not realistic economics.
- STK is a **Sepolia testnet** token with no real value; the faucet mints freely within its cooldown.

## Deployed addresses

Both contracts are **verified** on Sepolia Etherscan (source is browsable under the **Contract → Code** tab).

| What | Value |
| --- | --- |
| StakeToken (Sepolia) | [`0x8D8450F9a785167dCbE2595475D5c03f0E850cf7`](https://sepolia.etherscan.io/address/0x8D8450F9a785167dCbE2595475D5c03f0E850cf7#code) |
| Staking (Sepolia) | [`0x6A6fD4Cf0455E63543f6552083df6F7deb647f7C`](https://sepolia.etherscan.io/address/0x6A6fD4Cf0455E63543f6552083df6F7deb647f7C#code) |
| Deploy block | `11044588` |

## Live URLs

| App | URL |
| --- | --- |
| Backend API | https://staking-dapp-x1az.onrender.com |
| User frontend | https://kunjicoder-staking-dapp.vercel.app |
| Admin app | https://staking-dapp-six-rho.vercel.app |
