import { ethers } from "hardhat";
import {
  deployContract,
  printRunEnv,
  updateContractJsonFile,
  tokenContractAt,
} from "./api/zzmApi";

const zzmApi = require("./api/zzmApi");

async function main() {
  const [deployer] = await ethers.getSigners();
  await printRunEnv(`Deploying farm.. `);

  // Deploy farm contract
  const ftn = await tokenContractAt("FTN");
  if (!ftn) {
    throw Error("FTN contract is null.");
  }

  // 참고. 보상 가능한 기간은 ethFundAmount / (ethRewardPerBlock * 3600 * 24) 가 된다.
  const ethRewardPerBlock = 0.001; // TODO 블록 당 보상량 계산해서 수정 필요
  const ethFundAmount = 100000; // TODO 펀드 수량 계산해서 수정 필요

  const rewardPerBlock = ethers.utils.parseEther(ethRewardPerBlock.toString());
  const currentBlock = await ethers.provider.getBlockNumber();
  const startBlock = currentBlock + 100; // NOTE 컨트랙트 배포 후 startBlock 이내에 fund가 되어야 함
  const farm = await deployContract(
    "ZzmFarm",
    ftn.address,
    rewardPerBlock,
    startBlock
  );

  // approve
  await ftn.approve(farm.address, zzmApi.MaxUint256);

  // fund
  // TODO 총 보상량만큼 미리 펀드 필요
  // 일부만 펀드로 넣는 경우, 펀드 금액이 떨어지기 전에 추가로 펀드할 수 있다. 그렇지 않은 경우 다시 Farm contract 배포 필요.
  const fundAmount = ethers.utils.parseEther(ethFundAmount.toString());
  await farm.fund(fundAmount);

  // v2에서는 사용하지 않음
  // // init : 첫번째(index: 0)에 반드시 zero address token을 넣어둔다.
  // const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  // await farm.add(0, ZERO_ADDRESS, false);

  updateContractJsonFile(farm.address, "ZzmFarm");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
