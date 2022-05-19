const hardhat = require('hardhat');
const path = require('path');
const HealthMarket = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'HealthMarket.sol', 'HealthMarket.json'));
const contract = new web3.eth.Contract(HealthMarket.abi, { data: HealthMarket.bytecode });

const privateKey = process.env.PRIVATE_KEY;
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
console.log(account);

(async () => {
  console.log('started deployment')
  const tx = contract.deploy();
  const gas = await tx.estimateGas();
  let gasPrice = await web3.eth.getGasPrice();
  var BN = web3.utils.BN;

  gasPrice = Math.ceil(new BN(gasPrice) * 1.40);
  console.log(tx.encodeABI())
  console.log(gas)
  console.log(gasPrice)
  const createTransaction = await account.signTransaction(
    {
      data: tx.encodeABI(),
      gas,
      gasPrice
    }
  );

  const createReceipt = await web3.eth.sendSignedTransaction(createTransaction.rawTransaction);
  console.log('Contract deployed at', createReceipt.contractAddress);
})();
