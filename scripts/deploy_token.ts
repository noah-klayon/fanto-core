import { ethers } from "hardhat";
import {
  approve,
  deployTokenContract,
  getContractAddress,
  MaxUint256,
  printRunEnv,
  updateContractJsonFile,
} from "./api/zzmApi";

const zzmApi = require("./api/zzmApi");

async function main() {
  const tokenName = process.env.TOKEN ?? "";
  const [deployer] = await ethers.getSigners();
  await printRunEnv(`Deploying Token (${tokenName}).. `);

  // Deploy token contract
  const routerAddress = getContractAddress("ZzmRouter");
  const contract = await deployTokenContract(
    routerAddress,
    tokenName,
    "2100000" // TODO: constant
  );

  updateContractJsonFile(contract.address, "UpgradableKToken", tokenName);

  await approve(tokenName, contract.address, routerAddress, MaxUint256);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
