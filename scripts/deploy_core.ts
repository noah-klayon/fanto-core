import { ethers } from "hardhat";
import {
  deployContract,
  printRunEnv,
  resetContractJsonFile,
  updateContractJsonFile,
} from "./api/zzmApi";

const zzmApi = require("./api/zzmApi");

async function main() {
  const [deployer] = await ethers.getSigners();
  await printRunEnv("Deploying contracts..");

  // Deploy core contracts
  const wklay = await deployContract("WKLAY");
  const factory = await deployContract("ZzmFactory", deployer.address);
  const pair = await deployContract("ZzmPair");

  resetContractJsonFile();
  updateContractJsonFile(wklay.address, "WKLAY");
  updateContractJsonFile(factory.address, "ZzmFactory");
  updateContractJsonFile(pair.address, "ZzmPair");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
