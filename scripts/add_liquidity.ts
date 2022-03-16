import { ethers } from "hardhat";
import wait from "waait";
import {
  addLiquidity,
  addLiquidityKLAY,
  allPairsLength,
  contractAt,
  createPair2,
  getReserves,
  printRunEnv,
  tokenContractAt,
} from "./api/zzmApi";

async function main() {
  const tokenName = process.env.TOKEN ?? "";
  const [deployer] = await ethers.getSigners();
  await printRunEnv(`Adding liquidity (${tokenName})..`);

  const factory = await contractAt("ZzmFactory");
  const router = await contractAt("ZzmRouter");
  const wklay = await contractAt("WKLAY");
  const ftn = await tokenContractAt("FTN");
  const token = await tokenContractAt(tokenName);

  if (!factory || !router || !wklay || !ftn || !token) {
    throw Error("One of required contracts is null.");
  }

  const isFtnWklayPool = tokenName === "FTN";
  const token1 = isFtnWklayPool ? ftn : token;
  const token2 = isFtnWklayPool ? wklay : ftn;
  const amount1 = isFtnWklayPool ? "100" : "210000";
  const amount2 = isFtnWklayPool ? "10" : "21000";

  // 유동성 풀이 있으면 패스, 없으면 풀을 만들고 처리될 때까지 대기
  const pairAddress = await createPair2(
    factory,
    token1.address,
    token2.address
  );

  // 유동성 추가
  if (isFtnWklayPool) {
    const receipt = await addLiquidityKLAY(
      router,
      factory,
      token1,
      ethers.utils.parseEther(amount1), // token
      ethers.utils.parseEther(amount2), // ftn
      deployer.address
    );
    console.log("addLiquidity hash=%s", receipt.hash);
  } else {
    const receipt = await addLiquidity(
      router,
      factory,
      token1,
      token2,
      ethers.utils.parseEther(amount1), // token
      ethers.utils.parseEther(amount2), // ftn
      deployer.address
    );
    console.log("addLiquidity hash=%s", receipt.hash);
  }
  // 유동청 추가가 처리되기까지 대기
  await wait(5000);

  // 처리 완료 후 Pair 상태 조회
  const pairContract = await contractAt("ZzmPair", pairAddress);
  const lpBalance = await pairContract?.balanceOf(deployer.address);
  console.log("- lpBalance: %s", ethers.utils.formatEther(lpBalance));
  console.log("- allPairs: %s", await allPairsLength(factory));
  const reserves = await getReserves(factory, token1.address, token2.address);
  console.log(
    "- reserves=(%s, %s, %s)",
    reserves.pair?.address,
    ethers.utils.formatEther(reserves.reserves._reserve0),
    ethers.utils.formatEther(reserves.reserves._reserve1)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
