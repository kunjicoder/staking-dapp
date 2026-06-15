# Shared ABIs

Contract ABIs shared by all three web apps (`frontend/`, `admin/`, and the backend indexer). These are the full Hardhat artifacts (`{ "abi": [...], "bytecode": ..., ... }`) copied verbatim from `contracts/artifacts/contracts/`.

Each app imports them through a small `unwrap()` helper that accepts **either** a raw ABI array or a full artifact object, so both formats work without code changes.

## Files

| File | Source |
| --- | --- |
| `StakeToken.json` | `contracts/artifacts/contracts/StakeToken.sol/StakeToken.json` |
| `Staking.json` | `contracts/artifacts/contracts/Staking.sol/Staking.json` |

## Updating after a contract change

Recompile in the Hardhat project and re-copy both artifacts:

```bash
cd contracts
npx hardhat compile
copy artifacts\contracts\StakeToken.sol\StakeToken.json ..\shared\abi\StakeToken.json
copy artifacts\contracts\Staking.sol\Staking.json ..\shared\abi\Staking.json
```

## Event signatures the indexer depends on

Keep these stable — the backend indexer matches on them:

- `Staked(address indexed user, uint256 amount)`
- `Unstaked(address indexed user, uint256 amount)`
- `Claimed(address indexed user, uint256 amount)`
- `Transfer(address indexed from, address indexed to, uint256 value)` — faucet claims are mints (`from == 0x0`)
