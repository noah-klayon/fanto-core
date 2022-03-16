// This is a script for deploying your contracts. You can adapt it to deploy

import { ethers, network, upgrades } from "hardhat";

// yours, or create new ones.
async function main() {
    // This is just a convenience check
    if (network.name === "hardhat") {
      console.warn(
        "You are trying to deploy a contract to the Hardhat Network, which" +
          "gets automatically created and destroyed every time. Use the Hardhat" +
          " option '--network localhost'"
      );
    }
    const proxyAddress = getTokenAddress();
  
    // ethers is avaialble in the global scope
    const [deployer] = await ethers.getSigners();
    console.log(
      "Deploying the contracts with the account:",
      await deployer.getAddress()
    );
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const Token = await ethers.getContractFactory("UpgradableKToken")
    const token = await upgrades.upgradeProxy(proxyAddress, Token);
  
    console.log("Token address:", token.address);
  }

  function getTokenAddress() {
    const fs = require("fs");
    const contractsDir = __dirname + "/../../frontend/src/contracts";
  
    return JSON.parse(fs.readFileSync(contractsDir + "/contract-address-upgradable.json")).Token
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  