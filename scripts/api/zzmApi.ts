import { Contract } from "ethers";
import fs from "fs";
import { artifacts, ethers, network, upgrades } from "hardhat";
import wait from "waait";

const bignumber = require("@ethersproject/bignumber");

export const MaxUint256 = /*#__PURE__*/ bignumber.BigNumber.from(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

export async function contractAt(name: string, address = "") {
  if (address.length === 0) {
    address = getContractAddress(name);
  }

  try {
    const contract = await ethers.getContractAt(name, address);
    // console.log("Contract(%s) resolved to %s", name, address);
    return contract;
  } catch (error) {
    console.error("Contract(%s) doesn't exist for address(%s)", name, address);
  }
  return null;
}

export async function tokenContractAt(name: string) {
  return await contractAt("UpgradableKToken", getContractAddress(name));
}

export function getContractAddresses() {
  const fs = require("fs");
  const contractsDir = __dirname + "/../contracts";
  const addressFilename = contractsDir + "/contract-address.json";
  const addressJson = fs.readFileSync(addressFilename, "utf-8");
  return JSON.parse(addressJson);
}

export function getContractAddress(contractName: string) {
  return getContractAddresses()[contractName];
}

export function tokenContractEntries() {
  const nonTokenContracts = [
    "WKLAY",
    "ZzmFactory",
    "ZzmRouter",
    "ZzmPair",
    "ZzmFarm",
  ];
  return Object.entries(getContractAddresses()).filter(
    ([key, value]) => !nonTokenContracts.includes(key)
  );
}

export async function createPair2(
  factory: any,
  token0Address: string,
  token1Address: string
) {
  // pair 가 있으면 address 가 리턴되고
  // pair 가 없으면 새로 생성한 주소를 리턴한다.
  let pairAddress;

  pairAddress = await factory.getPair(token0Address, token1Address);
  if (pairAddress == "0x0000000000000000000000000000000000000000") {
    const receipt = await factory.createPair(token0Address, token1Address);
    console.log(
      "Pair not exist. Creating pair.. txCreatePair: %o",
      receipt.hash
    );
    await wait(3000);

    pairAddress = await factory.getPair(token0Address, token1Address);
    console.log("pair address: %s", pairAddress);
  } else {
    console.log("Pair exists. pair address: %s", pairAddress);
  }

  return pairAddress;
}

export async function getReserves(
  factory: any,
  token0Address: string,
  token1Address: string
) {
  const pairAddress = await factory.getPair(token0Address, token1Address);
  const pair = await contractAt("ZzmPair", pairAddress);
  const reserves = await pair?.getReserves();
  return { pair, reserves };
}

export async function allPairsLength(factory: Contract) {
  const length = await factory.allPairsLength();
  return length;
}

export async function addLiquidity(
  router: Contract,
  factory: Contract,
  token0: Contract,
  token1: Contract,
  amount0: any,
  amount1: any,
  toAddress: string
) {
  await token0.approve(router.address, amount0);
  await token1.approve(router.address, amount1);
  const res = await router.addLiquidity(
    token0.address,
    token1.address,
    amount0,
    amount1,
    0,
    0,
    toAddress,
    100000 * 10 ** 6
  );

  // const pairAddress = await factory.getPair(token0.address, token1.address);
  // console.log("pairAddress: ", pairAddress);

  return res;
}

export async function addLiquidityKLAY(
  router: Contract,
  factory: Contract,
  token0: Contract,
  amount0: any,
  klayAmount: any,
  toAddress: string
) {
  await token0.approve(router.address, amount0);
  const res = await router.addLiquidityETH(
    token0.address,
    amount0,
    0,
    0,
    toAddress,
    100000 * 10 ** 6,
    { value: klayAmount }
  );

  // const pairAddress = await factory.getPair(token0.address, token1.address);
  // console.log("pairAddress: ", pairAddress);

  return res;
}

export async function approve(
  tokenName: string,
  tokenAddress: string,
  toAddress: string,
  amount: any
) {
  const contract = await contractAt("UpgradableKToken", tokenAddress);
  await contract?.approve(toAddress, amount);
  console.log(
    "Token Contract(%s) approved router(%s) to spend up to MaxUint256",
    tokenName,
    toAddress
  );
}

export async function tokenTransfer(
  token: Contract,
  tokenName: string,
  fromAddr: string,
  toAddr: string,
  amount: any
) {
  const printBalances = async () => {
    console.log(
      "Token(%s) balance (from): %s",
      tokenName,
      ethers.utils.formatEther(await token.balanceOf(fromAddr))
    );
    console.log(
      "Token(%s) balance (to): %s",
      tokenName,
      ethers.utils.formatEther(await token.balanceOf(toAddr))
    );
  };

  // await printBalances();

  await token.transfer(toAddr, amount);
  // console.log("Transfered %s", ethers.utils.formatEther(amount));
  await wait(5000);

  // await printBalances();
}

export async function deployContract(name: string, ...args: any[]) {
  const Contract = await ethers.getContractFactory(name);
  const contract = await Contract.deploy(...args);
  await contract.deployed();
  console.log("Contract(%s) created. address: %s", name, contract.address);

  return contract;
}

export async function deployTokenContract(
  router: Contract,
  symbol: string,
  amount: string
) {
  const name = "UpgradableKToken";
  const Contract = await ethers.getContractFactory(name);
  const contract = await upgrades.deployProxy(
    Contract,
    [`${symbol}Token`, `${symbol}`, amount],
    { initializer: "initialize" }
  );
  await contract.deployed();
  console.log("Token Contract(%s) created. address:", symbol, contract.address);

  return contract;
}

export function resetContractJsonFile() {
  const contractsDir = __dirname + "/../contracts";
  const addressFilename = contractsDir + "/contract-address.json";
  const abiFilename = contractsDir + "/contract-abi.json";

  if (fs.existsSync(addressFilename)) {
    fs.unlinkSync(addressFilename);
  }

  if (fs.existsSync(abiFilename)) {
    fs.unlinkSync(abiFilename);
  }
}

export function updateContractJsonFile(
  address: string,
  contractName: string,
  tokenName?: string // key for address and abi. if omitted, contractName will be used.
) {
  const contractsDir = __dirname + "/../contracts";
  const addressFilename = contractsDir + "/contract-address.json";
  const abiFilename = contractsDir + "/contract-abi.json";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  let addresses: any = {};
  let abis: any = {};
  if (fs.existsSync(addressFilename)) {
    const addressJson = fs.readFileSync(addressFilename, "utf-8");
    addresses = JSON.parse(addressJson) as any;
  }
  if (fs.existsSync(abiFilename)) {
    const abiJson = fs.readFileSync(abiFilename, "utf-8");
    abis = JSON.parse(abiJson) as any;
  }

  try {
    const key = tokenName ? tokenName : contractName;
    const skipAbi = tokenName != undefined;

    addresses[key] = address;
    fs.writeFileSync(
      addressFilename,
      JSON.stringify(addresses, null, 2),
      "utf-8"
    );

    const artifact = artifacts.readArtifactSync(contractName);
    if (!skipAbi) {
      // FTN 혹은 크리에이터 토큰은 abi 추가하지 않음
      abis[key] = artifact.abi;
      fs.writeFileSync(abiFilename, JSON.stringify(abis, null, 2), "utf-8");
    }
  } catch (e) {
    console.error(e);
  } finally {
  }
}

export async function printRunEnv(description: string) {
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.getBalance();
  console.log("==================================================");
  console.log(description);
  console.log("- network: %s", network.name);
  console.log("- account: %s", deployer.address);
  console.log("- balance: %s", parseInt(balance.toString()) / 10 ** 18);
  console.log("==================================================");
}

// --------------------------------------------------
// deploy functions
// --------------------------------------------------

// module.exports = {
// MaxUint256,
// // contract
// // contractAt,
// tokenContractAt,
// getContractAddress,
// tokenContractEntries,
// // factory
// createPair2,
// getReserves,
// allPairsLength,
// // router
// addLiquidity,
// addLiquidityKLAY,
// // token
// tokenTransfer,
// approve,
// // deploy & json
// deployContract,
// deployTokenContract,
// resetContractJsonFile,
// updateContractJsonFile,
// };
