const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture, time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const HUNDRED = ethers.parseUnits('100', 18);
const REWARD_RATE = 10n ** 12n; // reward-wei / second / 1e18 staked-wei

// expected rewards for `staked` wei over `seconds`
const expectedRewards = (staked, seconds) => (staked * REWARD_RATE * BigInt(seconds)) / 10n ** 18n;
// tolerance: a few seconds of accrual on the staked amount (block timestamps drift by ±1s per tx)
const tolerance = (staked) => expectedRewards(staked, 5);

describe('Staking', function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const token = await ethers.deployContract('StakeToken');
    const staking = await ethers.deployContract('Staking', [token.target]);
    await token.setMinter(staking.target);
    // fund both users via the faucet
    await token.connect(alice).claim();
    await token.connect(bob).claim();
    return { token, staking, owner, alice, bob };
  }

  describe('stake', function () {
    it('reverts without prior approval', async function () {
      const { token, staking, alice } = await loadFixture(deployFixture);
      await expect(staking.connect(alice).stake(HUNDRED)).to.be.revertedWithCustomError(
        token,
        'ERC20InsufficientAllowance'
      );
    });

    it('reverts on zero amount', async function () {
      const { staking, alice } = await loadFixture(deployFixture);
      await expect(staking.connect(alice).stake(0)).to.be.revertedWith('Staking: zero amount');
    });

    it('approve + stake moves tokens and updates stakedBalance/totalStaked, emits Staked', async function () {
      const { token, staking, alice } = await loadFixture(deployFixture);
      await token.connect(alice).approve(staking.target, HUNDRED);
      await expect(staking.connect(alice).stake(HUNDRED))
        .to.emit(staking, 'Staked')
        .withArgs(alice.address, HUNDRED);
      expect(await token.balanceOf(alice)).to.equal(0);
      expect(await token.balanceOf(staking.target)).to.equal(HUNDRED);
      expect(await staking.stakedBalance(alice)).to.equal(HUNDRED);
      expect(await staking.totalStaked()).to.equal(HUNDRED);
    });
  });

  describe('rewards', function () {
    it('accrue per second at the documented rate', async function () {
      const { token, staking, alice } = await loadFixture(deployFixture);
      await token.connect(alice).approve(staking.target, HUNDRED);
      await staking.connect(alice).stake(HUNDRED);

      await time.increase(600); // 10 minutes
      const expected = expectedRewards(HUNDRED, 600); // 100 * 1e12 * 600 = 0.06 STK
      expect(await staking.pendingRewards(alice)).to.be.closeTo(expected, tolerance(HUNDRED));
    });

    it('claimRewards mints rewards, emits Claimed, and resets pending', async function () {
      const { token, staking, alice } = await loadFixture(deployFixture);
      await token.connect(alice).approve(staking.target, HUNDRED);
      await staking.connect(alice).stake(HUNDRED);
      await time.increase(600);

      const before = await token.balanceOf(alice);
      const tx = await staking.connect(alice).claimRewards();
      await expect(tx).to.emit(staking, 'Claimed');
      const minted = (await token.balanceOf(alice)) - before;
      expect(minted).to.be.closeTo(expectedRewards(HUNDRED, 600), tolerance(HUNDRED));
      // pending resets (a second or two may accrue after the claim block)
      expect(await staking.pendingRewards(alice)).to.be.closeTo(0n, tolerance(HUNDRED));
    });

    it('reverts when there is nothing to claim', async function () {
      const { staking, alice } = await loadFixture(deployFixture);
      await expect(staking.connect(alice).claimRewards()).to.be.revertedWith('Staking: no rewards to claim');
    });

    it('two stakers accrue proportionally to their stakes', async function () {
      const { token, staking, alice, bob } = await loadFixture(deployFixture);
      const half = HUNDRED / 2n;
      await token.connect(alice).approve(staking.target, HUNDRED);
      await token.connect(bob).approve(staking.target, half);
      await staking.connect(alice).stake(HUNDRED); // 100 STK
      await staking.connect(bob).stake(half); // 50 STK

      await time.increase(3600);
      const aliceRewards = await staking.pendingRewards(alice);
      const bobRewards = await staking.pendingRewards(bob);
      // alice staked 2x bob's amount → ~2x the rewards
      expect(aliceRewards).to.be.closeTo(bobRewards * 2n, tolerance(HUNDRED) * 2n);
      expect(bobRewards).to.be.closeTo(expectedRewards(half, 3600), tolerance(half));
    });
  });

  describe('unstake', function () {
    it('partial then full unstake returns tokens and updates accounting', async function () {
      const { token, staking, alice } = await loadFixture(deployFixture);
      await token.connect(alice).approve(staking.target, HUNDRED);
      await staking.connect(alice).stake(HUNDRED);

      const half = HUNDRED / 2n;
      await expect(staking.connect(alice).unstake(half))
        .to.emit(staking, 'Unstaked')
        .withArgs(alice.address, half);
      expect(await staking.stakedBalance(alice)).to.equal(half);
      expect(await staking.totalStaked()).to.equal(half);

      await staking.connect(alice).unstake(half);
      expect(await staking.stakedBalance(alice)).to.equal(0);
      expect(await staking.totalStaked()).to.equal(0);
      expect(await token.balanceOf(alice)).to.equal(HUNDRED);
    });

    it('cannot unstake more than staked', async function () {
      const { token, staking, alice } = await loadFixture(deployFixture);
      await token.connect(alice).approve(staking.target, HUNDRED);
      await staking.connect(alice).stake(HUNDRED);
      await expect(staking.connect(alice).unstake(HUNDRED + 1n)).to.be.revertedWith(
        'Staking: amount exceeds staked balance'
      );
    });

    it('rewards accrued before a full unstake remain claimable', async function () {
      const { token, staking, alice } = await loadFixture(deployFixture);
      await token.connect(alice).approve(staking.target, HUNDRED);
      await staking.connect(alice).stake(HUNDRED);
      await time.increase(600);
      await staking.connect(alice).unstake(HUNDRED);

      const pending = await staking.pendingRewards(alice);
      expect(pending).to.be.closeTo(expectedRewards(HUNDRED, 600), tolerance(HUNDRED));

      // accrual stops once fully unstaked
      await time.increase(600);
      expect(await staking.pendingRewards(alice)).to.equal(pending);

      const before = await token.balanceOf(alice);
      await staking.connect(alice).claimRewards();
      expect((await token.balanceOf(alice)) - before).to.equal(pending);
    });
  });
});
