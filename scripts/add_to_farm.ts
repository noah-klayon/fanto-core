import { ethers } from "hardhat";
import {
  contractAt, printRunEnv,
  tokenContractAt
} from "./api/zzmApi";

async function main() {
  const tokenName = process.env.TOKEN ?? "";
  const [deployer] = await ethers.getSigners();
  await printRunEnv(`Adding to Farm (${tokenName}).. `);

  // Deploy token contract
  const farm = await contractAt("ZzmFarm");
  const token = await tokenContractAt(tokenName);

  if (!farm || !token) {
    throw Error("One of required contracts is null.");
  }

  console.log("farm: %s", farm.address);
  console.log("token: %s", token.address);

  // allocPoint는 1000으로 시작
  // 추후 비율에 따라 다른 값을 넣을수도 있다.
  const tx = await farm.add(1000, token.address, false);
  console.log("added to farm. hash=%s", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
