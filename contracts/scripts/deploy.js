const { ethers, network } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying to ${network.name} as ${deployer.address}\n`);

  const token = await ethers.deployContract('StakeToken');
  await token.waitForDeployment();
  const tokenReceipt = await token.deploymentTransaction().wait();
  console.log(`StakeToken: ${token.target} (block ${tokenReceipt.blockNumber})`);

  const staking = await ethers.deployContract('Staking', [token.target]);
  await staking.waitForDeployment();
  const stakingReceipt = await staking.deploymentTransaction().wait();
  console.log(`Staking:    ${staking.target} (block ${stakingReceipt.blockNumber})`);

  const tx = await token.setMinter(staking.target);
  await tx.wait();
  console.log(`setMinter(${staking.target}) done\n`);

  console.log('--- copy these into the web app env files ---');
  console.log(`TOKEN_ADDRESS=${token.target}`);
  console.log(`STAKING_ADDRESS=${staking.target}`);
  console.log(`DEPLOY_BLOCK=${tokenReceipt.blockNumber}`);
  console.log('\n--- verify on Etherscan ---');
  console.log(`npx hardhat verify --network ${network.name} ${token.target}`);
  console.log(`npx hardhat verify --network ${network.name} ${staking.target} ${token.target}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
