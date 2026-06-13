// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title StakeToken (STK)
/// @notice ERC-20 with a public faucet (100 STK per claim, 6h per-wallet cooldown)
///         and a one-time-assignable minter that may mint staking rewards.
contract StakeToken is ERC20, Ownable {
    uint256 public constant CLAIM_AMOUNT = 100e18;
    uint256 public constant CLAIM_COOLDOWN = 6 hours;

    /// @notice last faucet claim timestamp per wallet (0 = never claimed)
    mapping(address => uint256) public lastClaimAt;

    /// @notice the only address allowed to call mintRewards (the staking contract)
    address public minter;

    constructor() ERC20("StakeToken", "STK") Ownable(msg.sender) {}

    /// @notice Faucet: mints 100 STK to the caller. A brand-new address can
    ///         claim immediately; afterwards a 6-hour cooldown applies.
    function claim() external {
        uint256 last = lastClaimAt[msg.sender];
        require(
            last == 0 || block.timestamp >= last + CLAIM_COOLDOWN,
            "StakeToken: claim cooldown active"
        );
        lastClaimAt[msg.sender] = block.timestamp;
        _mint(msg.sender, CLAIM_AMOUNT);
    }

    /// @notice Unix timestamp when `account` may claim next. 0 if it has never
    ///         claimed (i.e. can claim now); a past timestamp also means claimable.
    function nextClaimTime(address account) external view returns (uint256) {
        uint256 last = lastClaimAt[account];
        return last == 0 ? 0 : last + CLAIM_COOLDOWN;
    }

    /// @notice One-time grant of reward-minting rights (intended for the staking contract).
    function setMinter(address newMinter) external onlyOwner {
        require(minter == address(0), "StakeToken: minter already set");
        require(newMinter != address(0), "StakeToken: zero minter");
        minter = newMinter;
    }

    /// @notice Mints staking rewards. Callable only by the minter.
    function mintRewards(address to, uint256 amount) external {
        require(msg.sender == minter, "StakeToken: caller is not the minter");
        _mint(to, amount);
    }
}
