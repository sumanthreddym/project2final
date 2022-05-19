const hardhat = require('hardhat');

async function main () {
  const HealthMarket = await ethers.getContractFactory('HealthMarket');
  const healthMarket = await HealthMarket.deploy();
  await healthMarket.deployed();

  console.log('Contract deployed at', healthMarket.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
