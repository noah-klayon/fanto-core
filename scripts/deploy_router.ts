import { ethers } from "hardhat";
import {
  approve,
  deployContract,
  getContractAddress,
  MaxUint256,
  printRunEnv,
  tokenContractEntries,
  updateContractJsonFile,
} from "./api/zzmApi";

const zzmApi = require("./api/zzmApi");

async function main() {
  const [deployer] = await ethers.getSigners();
  await printRunEnv("Deploying router..");

  // Deploy router contract
  const router = await deployContract(
    "ZzmRouter",
    getContractAddress("ZzmFactory"),
    getContractAddress("WKLAY")
  );

  updateContractJsonFile(router.address, "ZzmRouter");

  // Router 가 변경되면 기존에 있던 크리에이터 토큰에 대해 approve 실행해야 함
  for (const entry of tokenContractEntries()) {
    await approve(entry[0], entry[1] as string, router.address, MaxUint256);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
