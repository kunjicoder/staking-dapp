const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture, time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const CLAIM_AMOUNT = ethers.parseUnits('100', 18);
const COOLDOWN = 6 * 60 * 60;

describe('StakeToken', function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const token = await ethers.deployContract('StakeToken');
    return { token, owner, alice, bob };
  }

  describe('faucet claim', function () {
    it('mints 100 STK to a brand-new address immediately', async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(token.connect(alice).claim()).to.changeTokenBalance(token, alice, CLAIM_AMOUNT);
    });

    it('reverts on an immediate second claim', async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await token.connect(alice).claim();
      await expect(token.connect(alice).claim()).to.be.revertedWith('StakeToken: claim cooldown active');
    });

    it('allows claiming again after the cooldown', async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await token.connect(alice).claim();
      await time.increase(COOLDOWN + 1);
      await expect(token.connect(alice).claim()).to.changeTokenBalance(token, alice, CLAIM_AMOUNT);
      expect(await token.balanceOf(alice)).to.equal(CLAIM_AMOUNT * 2n);
    });

    it('nextClaimTime is 0 before first claim and lastClaim + 6h after', async function () {
      const { token, alice } = await loadFixture(deployFixture);
      expect(await token.nextClaimTime(alice)).to.equal(0);
      const tx = await token.connect(alice).claim();
      const block = await ethers.provider.getBlock(tx.blockNumber);
      expect(await token.nextClaimTime(alice)).to.equal(block.timestamp + COOLDOWN);
    });
  });

  describe('minter', function () {
    it('only the minter can call mintRewards', async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await expect(token.connect(alice).mintRewards(alice, 1n)).to.be.revertedWith(
        'StakeToken: caller is not the minter'
      );
      // even the owner cannot mint without being the minter
      await expect(token.connect(owner).mintRewards(owner, 1n)).to.be.revertedWith(
        'StakeToken: caller is not the minter'
      );
      await token.connect(owner).setMinter(bob.address);
      await expect(token.connect(bob).mintRewards(alice, 5n)).to.changeTokenBalance(token, alice, 5n);
    });

    it('setMinter is owner-only and one-time', async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await expect(token.connect(alice).setMinter(alice.address)).to.be.revertedWithCustomError(
        token,
        'OwnableUnauthorizedAccount'
      );
      await token.connect(owner).setMinter(bob.address);
      await expect(token.connect(owner).setMinter(alice.address)).to.be.revertedWith(
        'StakeToken: minter already set'
      );
    });
  });
});
