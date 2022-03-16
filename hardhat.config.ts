import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";

// import "@typechain/hardhat";
// import "hardhat-gas-reporter";
// import "solidity-coverage";

require("hardhat-klaytn-patch");
// import "hardhat-klaytn-patch";

dotenv.config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const privateKey = `${process.env.REACT_APP_PRIVATE_KEY}`;
const accessKeyId = "KASKIXJAWJQQDG89HCVT549A";
const secretAccessKey = "6AHMNN1UEm43en1YXScgTbNoKMdxYLlPySVcZmk_";
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.6",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    baobab: {
      url: "https://kaikas.baobab.klaytn.net:8651/",
      accounts: [privateKey],
      gas: 3000000,
      gasPrice: 0x5d21dba00,
    },
    cypress: {
      url: "https://node-api.klaytnapi.com/v1/klaytn",
      accounts: [privateKey],
      gasPrice: 0x5d21dba00,
      httpHeaders: {
        "x-chain-id": "8217",
        Authorization:
          "Basic " +
          Buffer.from(accessKeyId + ":" + secretAccessKey).toString("base64"),
      },
    },
  },
  // gasReporter: {
  //   enabled: process.env.REPORT_GAS !== undefined,
  //   currency: "USD",
  // },
};

export default config;
