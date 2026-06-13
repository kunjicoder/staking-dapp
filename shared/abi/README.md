# Shared ABIs

These are the **real Hardhat artifacts** copied from `contracts/artifacts/contracts/`
(full artifact format, `{ "abi": [...], ... }`). All three apps unwrap either a raw
ABI array or an artifact, so both formats work.

If you change the contracts, recompile and re-copy:

```
cd contracts
npx hardhat compile
copy artifacts\contracts\StakeToken.sol\StakeToken.json ..\shared\abi\StakeToken.json
copy artifacts\contracts\Staking.sol\Staking.json ..\shared\abi\Staking.json
```

Event shapes the backend indexer depends on (confirmed in these artifacts):

- `Staked(address indexed user, uint256 amount)`
- `Unstaked(address indexed user, uint256 amount)`
- `Claimed(address indexed user, uint256 amount)`
- `Transfer(address indexed from, address indexed to, uint256 value)` (faucet claims are mints: `from == 0x0`)
