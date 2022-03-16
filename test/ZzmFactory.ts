import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, upgrades } from "hardhat";

describe("ZzmFactory contract", function () {
  let contractFactory;
  let zzmFactory: Contract, tokenA: Contract, tokenB: Contract;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // ZzmFactory
    contractFactory = await ethers.getContractFactory("ZzmFactory");
    zzmFactory = await contractFactory.deploy(owner.address);
    console.log("Factory is created at ", zzmFactory.address);

    // tokenA
    contractFactory = await ethers.getContractFactory("UpgradableKToken");
    tokenA = await upgrades.deployProxy(
      contractFactory,
      ["token A", "tokenA", 10000],
      { initializer: "initialize" }
    );
    console.log("tokenA is created at ", tokenA.address);

    // tokenB
    contractFactory = await ethers.getContractFactory("UpgradableKToken");
    tokenB = await upgrades.deployProxy(
      contractFactory,
      ["token B", "tokenB", 10000],
      { initializer: "initialize" }
    );
    console.log("tokenB is created at ", tokenB.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await zzmFactory.feeToSetter.call()).to.equal(owner.address);
    });
  });

  describe("factoryContract.createPair()", function () {
    it("Should create (tokenA, tokenB) pair", async function () {
      expect(await zzmFactory.allPairsLength()).to.equal(0);

      // create (tokenA, tokenB) pair
      await zzmFactory.createPair(tokenA.address, tokenB.address);

      expect(await zzmFactory.allPairsLength()).to.equal(1);

      const pair = await zzmFactory.allPairs(0);
      console.log("Pair Contract Address: ", pair);

      const pair1 = await zzmFactory.getPair(tokenA.address, tokenB.address);
      const pair2 = await zzmFactory.getPair(tokenB.address, tokenA.address);
      expect(pair).to.equal(pair1);
      expect(pair).to.equal(pair2);
    });
  });
});
