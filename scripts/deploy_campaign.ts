import { ethers } from "hardhat";
import {
  deployContract,
  printRunEnv,
  updateContractJsonFile
} from "./api/zzmApi";

const zzmApi = require("./api/zzmApi");

async function main() {
  const [deployer] = await ethers.getSigners();
  await printRunEnv(`Deploying campaign.. `);

  // Deploy campaign contract
  const campaign = await deployContract("ZzmCampaign");

  updateContractJsonFile(campaign.address, "ZzmCampaign");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
