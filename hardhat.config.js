const { solidity } = require("ethereum-waffle")

require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()


const { GOERLI_RPC_URL, PRIVATE_KEY, COINMARKETCAP_API_KEY, ETHERSCAN_API_KEY } = process.env


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {

  defaultNetwork: "hardhat",
  networks: {
      localhost: {
        url: "http://127.0.0.1:8545/",
          chainId: 31337,
      },
      goerli: {
          url: GOERLI_RPC_URL,
          accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
          saveDeployments: true,
          chainId: 5,
      },

  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  gasReporter :{
    enabled: false,
    outputFile : 'gas-report.txt',
    noColors: true,
    currency: 'USD',
    coinmarketcap: COINMARKETCAP_API_KEY 
  },
  contractSizer: {
    runOnCompile: false,
    only: ["Raffle"],
},

  solidity: {
    compilers: [
        {
            version: "0.8.7",
        },
        {
            version: "0.4.24",
        },
    ],
},
namedAccounts: {
  deployer: {
      default: 0, // here this will by default take the first account as deployer
  },
},

mocha: {
  timeout: 300000
},


      
}



