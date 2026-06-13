// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {StakeToken} from "./StakeToken.sol";

/// @title Staking
/// @notice Stake STK, accrue rewards per second, rewards are minted on claim.
///
/// Reward model — fixed per-token emission, O(1) accumulator:
///   REWARD_RATE = 1e12 reward-wei per second per whole staked token (1e18 wei).
///   Per staked STK that is 1e12 * 31_536_000 s/yr = 3.15e19 wei ≈ 31.5 STK/year
///   (~3154% APR — deliberately high so a demo user sees rewards move quickly).
///   Staking 100 STK earns 100 * 1e12 * 60 = 6e15 wei = 0.006 STK per minute,
///   which is clearly visible at 4 display decimals within a minute.
///
/// Accumulator (Synthetix-style, but emission is per-token so no division by
/// totalStaked is needed):
///   rewardPerTokenStored — accumulated reward-wei per 1e18 staked-wei
///   userRewardPerTokenPaid[u] — checkpoint of the accumulator at u's last touch
///   rewards[u] — settled-but-unclaimed rewards for u
contract Staking is ReentrancyGuard {
    StakeToken public immutable token;

    uint256 public constant REWARD_RATE = 1e12; // reward-wei / second / 1e18 staked-wei

    uint256 public totalStaked;
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;

    mapping(address => uint256) private _staked;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);

    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "Staking: zero token");
        token = StakeToken(tokenAddress);
        lastUpdateTime = block.timestamp;
    }

    // ---------- reward accounting ----------

    function rewardPerToken() public view returns (uint256) {
        return rewardPerTokenStored + (block.timestamp - lastUpdateTime) * REWARD_RATE;
    }

    function _updateReward(address account) internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        rewards[account] = _earned(account, rewardPerTokenStored);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }

    function _earned(address account, uint256 currentRewardPerToken) internal view returns (uint256) {
        return
            rewards[account] +
            (_staked[account] * (currentRewardPerToken - userRewardPerTokenPaid[account])) /
            1e18;
    }

    // ---------- views ----------

    function stakedBalance(address account) external view returns (uint256) {
        return _staked[account];
    }

    function pendingRewards(address account) external view returns (uint256) {
        return _earned(account, rewardPerToken());
    }

    // ---------- mutations (checks-effects-interactions + nonReentrant) ----------

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Staking: zero amount");
        _updateReward(msg.sender);
        _staked[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
        require(token.transferFrom(msg.sender, address(this), amount), "Staking: transferFrom failed");
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Staking: zero amount");
        require(amount <= _staked[msg.sender], "Staking: amount exceeds staked balance");
        _updateReward(msg.sender);
        _staked[msg.sender] -= amount;
        totalStaked -= amount;
        emit Unstaked(msg.sender, amount);
        require(token.transfer(msg.sender, amount), "Staking: transfer failed");
    }

    function claimRewards() external nonReentrant {
        _updateReward(msg.sender);
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "Staking: no rewards to claim");
        rewards[msg.sender] = 0;
        emit Claimed(msg.sender, reward);
        token.mintRewards(msg.sender, reward);
    }
}
