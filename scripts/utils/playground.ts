import { Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import wait from "waait";
import {
  addLiquidity,
  addLiquidityKLAY,
  allPairsLength,
  contractAt,
  createPair2,
  getReserves,
  printRunEnv,
  tokenTransfer,
} from "../api/zzmApi";

async function main() {
  await printRunEnv("Running Playground..");

  const [deployer] = await ethers.getSigners();

  // ----- 컨트랙트들을 새로 배포하고 그 컨트랙트들을 사용
  const { wklay, factory, router, ftn, st1, st2, st3 } =
    await deployAndGetContracts();

  // ----- 기존에 배포된 컨트랙트들을 사용 (contract-address.json 로드)
  // sh scripts/zzm_deploy.sh 실행 후 생긴 파일 로드함
  // const { wklay, factory, router, ftn, st1, st2, st3 } =
  //     await getExistingContractsFromFile('PSIK', 'DJYO', 'AKMU');

  // // ----- 새로운 토큰 생성
  // newTokenName = "BrandToken3";
  // newTokenSymbol = "BR3";
  // newTokenSupply = 1000000;
  // const newToken = await deployUpgradableKToken(
  //   newTokenName,
  //   newTokenSymbol,
  //   newTokenSupply
  // );
  // console.log("newToken=%s", newToken.address);

  // ----- 유동성 풀 생성
  // 유동성 풀이 있으면 패스, 없으면 풀을 만들고 처리될때까지 대기
  const pairAddress0 = await createPair2(factory, wklay.address, ftn.address);
  const pairAddress1 = await createPair2(factory, st1.address, ftn.address);
  const pairAddress2 = await createPair2(factory, st2.address, ftn.address);
  const pairAddress3 = await createPair2(factory, st3.address, ftn.address);

  // ----- 유동성 추가
  const amount10000 = ethers.utils.parseEther("10000");
  const amount100 = ethers.utils.parseEther("100");
  const amount10 = ethers.utils.parseEther("10");
  const amount1 = ethers.utils.parseEther("1");

  const sendSocialToken = async (toAddress: string) => {
    await tokenTransfer(ftn, "FTN", deployer.address, toAddress, amount10000);
    await tokenTransfer(st1, "ST1", deployer.address, toAddress, amount10000);
    await tokenTransfer(st2, "ST2", deployer.address, toAddress, amount10000);
    await tokenTransfer(st3, "ST3", deployer.address, toAddress, amount10000);
  };
  // // 생성한 토큰 transfer to frontend developer
  // const toAddress1 = "0x946BEd7E198a38b0f4630658CEB6903DA0af060c"; // noah
  // const toAddress2 = "0x4783d1d3be8fb094b5cbe528ece09de2c8b900a5"; // jake
  // const toAddress3 = "0x98D3aB148D45fA70ac613109e0F92472729303E4"; // martin

  // await sendSocialToken(toAddress3);
  // await sendSocialToken(toAddress1);
  // await sendSocialToken(toAddress2);

  const result0 = await addLiquidityKLAY(
    router,
    factory,
    ftn,
    amount10000,
    amount1,
    deployer.address
  );
  console.log("addLiquidity result=%s", result0);

  const result1 = await addLiquidity(
    router,
    factory,
    st1,
    ftn,
    amount10000,
    amount10000,
    deployer.address
  );
  console.log("addLiquidity result=%s", result1);

  const result2 = await addLiquidity(
    router,
    factory,
    st2,
    ftn,
    amount10000,
    amount10000,
    deployer.address
  );
  console.log("addLiquidity result=%s", result2);

  const result3 = await addLiquidity(
    router,
    factory,
    st3,
    ftn,
    amount10000,
    amount10000,
    deployer.address
  );
  console.log("addLiquidity result=%s", result3);

  // 유동청 추가가 처리되기까지 대기
  await wait(5000);

  const pairContract0 = await ethers.getContractAt("ZzmPair", pairAddress0);
  const lpBalance0 = await pairContract0.balanceOf(deployer.address);
  console.log("wKLAY-FTN LP: ", lpBalance0.toString());

  const pairContract1 = await ethers.getContractAt("ZzmPair", pairAddress1);
  const lpBalance1 = await pairContract1.balanceOf(deployer.address);
  console.log("ST1-FTN LP: ", lpBalance1.toString());

  const pairContract2 = await ethers.getContractAt("ZzmPair", pairAddress2);
  const lpBalance2 = await pairContract2.balanceOf(deployer.address);
  console.log("ST2-FTN LP: ", lpBalance2.toString());

  const pairContract3 = await ethers.getContractAt("ZzmPair", pairAddress3);
  const lpBalance3 = await pairContract3.balanceOf(deployer.address);
  console.log("ST3-FTN LP: ", lpBalance3.toString());

  // ----- 유동성 풀 갯수 조회
  const pairs = await allPairsLength(factory);
  console.log("allPairsLength: %s", pairs);

  // ----- 유동성 풀의 reserve 조회
  const reserves0 = await getReserves(factory, wklay.address, ftn.address);
  console.log(
    "reserves=(%s, %s, %s)",
    reserves0.pair?.address,
    ethers.utils.formatEther(reserves0.reserves._reserve0),
    ethers.utils.formatEther(reserves0.reserves._reserve1)
  );

  const reserves1 = await getReserves(factory, st1.address, ftn.address);
  console.log(
    "reserves=(%s, %s, %s)",
    reserves1.pair?.address,
    ethers.utils.formatEther(reserves1.reserves._reserve0),
    ethers.utils.formatEther(reserves1.reserves._reserve1)
  );

  const reserves2 = await getReserves(factory, st2.address, ftn.address);
  console.log(
    "reserves=(%s, %s, %s)",
    reserves2.pair?.address,
    ethers.utils.formatEther(reserves2.reserves._reserve0),
    ethers.utils.formatEther(reserves2.reserves._reserve1)
  );

  const reserves3 = await getReserves(factory, st3.address, ftn.address);
  console.log(
    "reserves=(%s, %s, %s)",
    reserves3.pair?.address,
    ethers.utils.formatEther(reserves3.reserves._reserve0),
    ethers.utils.formatEther(reserves3.reserves._reserve1)
  );

  // // ----- 토큰 정보 조회
  // const token0Info = await getTokenInfo(token0.address);
  // console.log(
  //   "Token(%s): %s, %s, %s",
  //   token0Info.address,
  //   token0Info.name,
  //   token0Info.symbol,
  //   ethers.utils.formatEther(token0Info.totalSupply)
  // );
  // const token1Info = await getTokenInfo(token0.address);
  // console.log(
  //   "Token(%s): %s, %s, %s",
  //   token1Info.address,
  //   token1Info.name,
  //   token1Info.symbol,
  //   ethers.utils.formatEther(token1Info.totalSupply)
  // );
}

async function deployAndGetContracts() {
  async function deployWKlay() {
    const contractName = "WKLAY";
    const Contract = await ethers.getContractFactory(contractName);
    const contract = await Contract.deploy();
    await _deployPostProcess(contract, contractName);
    return contract;
  }

  async function deployZzmFactory() {
    const [deployer] = await ethers.getSigners();
    const contractName = "ZzmFactory";
    const Contract = await ethers.getContractFactory(contractName);
    const contract = await Contract.deploy(deployer.address);
    await _deployPostProcess(contract, contractName);
    return contract;
  }

  async function deployZzmRouter(factoryAddress: string, wklayAddress: string) {
    const contractName = "ZzmRouter";
    const Contract = await ethers.getContractFactory(contractName);
    const contract = await Contract.deploy(factoryAddress, wklayAddress);
    await _deployPostProcess(contract, contractName);
    return contract;
  }

  async function deployUpgradableKToken(
    name: string,
    symbol: string,
    amount: any
  ) {
    const contractName = "UpgradableKToken";
    const Contract = await ethers.getContractFactory(contractName);
    const contract = await upgrades.deployProxy(
      Contract,
      [name, symbol, amount],
      {
        initializer: "initialize",
      }
    );
    await _deployPostProcess(contract, contractName + "(" + symbol + ")");
    return contract;
  }

  const wklay = await deployWKlay();
  const factory = await deployZzmFactory();
  const router = await deployZzmRouter(factory.address, wklay.address);
  const ftn = await deployUpgradableKToken("FTN Token", "FTN", 1000000);
  const st1 = await deployUpgradableKToken("SocialToken1", "ST1", 1000000);
  const st2 = await deployUpgradableKToken("SocialToken2", "ST2", 1000000);
  const st3 = await deployUpgradableKToken("SocialToken3", "ST3", 1000000);
  const result = { wklay, factory, router, ftn, st1, st2, st3 };
  console.log("=====");
  Object.entries(result).forEach((entry) =>
    console.log('%sAddr: "%s",', entry[0], entry[1].address)
  );
  console.log("=====");
  return result;
}

async function getExistingContractsFromFile(stName = "") {
  const fs = require("fs");
  const contractsDir = __dirname + "/../../frontend/src/contracts";
  const addressFilename = contractsDir + "/contract-address.json";
  const addressJson = fs.readFileSync(addressFilename, "utf-8");
  const addresses = JSON.parse(addressJson);

  const wklay = await contractAt("WKLAY", addresses["WKLAY"]);
  const factory = await contractAt("ZzmFactory", addresses["ZzmFactory"]);
  const router = await contractAt("ZzmRouter", addresses["ZzmRouter"]);
  const farm = await contractAt("ZzmFarm", addresses["ZzmFarm"]);
  const ftn = await contractAt("UpgradableKToken", addresses["FTN"]);

  let st = null;
  const socialTokens = [];
  const nonErc20Contracts = [
    "WKLAY",
    "ZzmFactory",
    "ZzmRouter",
    "ZzmPair",
    "ZzmFarm",
  ];
  for (const [key] of Object.entries(addresses)) {
    // for (key in addresses) {
    if (!nonErc20Contracts.includes(key)) {
      // erc20 social token
      const token = await contractAt("UpgradableKToken", addresses[key]);
      socialTokens.push(token);

      if (key === stName) {
        st = token;
      }
    }
  }

  const result = { wklay, factory, router, farm, ftn, st, socialTokens };
  return result;
}

async function _deployPostProcess(contract: Contract, contractName: string) {
  await contract.deployed();
  console.log("%s\t%s", contractName, contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
