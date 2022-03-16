import { Contract } from "ethers";

import { expect } from "chai";
import { ethers, upgrades, waffle } from "hardhat";

// 참고: https://github.com/pancakeswap/pancake-swap-periphery/blob/master/test/UniswapV2Router01.spec.ts

describe("ZzmRouter contract", function () {
  const MaxUint256 = 10 * 10 ** 9;
  const MINIMUM_LIQUIDITY = 1000;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const provider = waffle.provider;

  let contractFactory;
  let zzmFactory: Contract, zzmRouter: Contract, tokenA: Contract, tokenB: Contract;

  let wKlay: any;
  let owner: any;
  let addr1: any;
  let addr2: any; // wallet address 라고 가정

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // ZzmFactory
    contractFactory = await ethers.getContractFactory("ZzmFactory");
    zzmFactory = await contractFactory.deploy(owner.address);
    console.log("Factory is created at ", zzmFactory.address);

    // WKLAY
    contractFactory = await ethers.getContractFactory("WKLAY");
    wKlay = await contractFactory.deploy();
    console.log("WKLAY is created at ", wKlay.address);

    // ZzmRouter
    contractFactory = await ethers.getContractFactory("ZzmRouter");
    zzmRouter = await contractFactory.deploy(zzmFactory.address, wKlay.address);
    console.log("Router is created at ", zzmRouter.address);

    // Token A
    contractFactory = await ethers.getContractFactory("UpgradableKToken");
    tokenA = await upgrades.deployProxy(
      contractFactory,
      ["token A", "tokenA", 1000000],
      { initializer: "initialize" }
    );
    console.log("tokenA is created at ", tokenA.address);

    // Token B
    contractFactory = await ethers.getContractFactory("UpgradableKToken");
    tokenB = await upgrades.deployProxy(
      contractFactory,
      ["token B", "tokenB", 1000000],
      { initializer: "initialize" }
    );
    console.log("tokenB is created at ", tokenB.address);

    // approve contract
    await tokenA.approve(zzmRouter.address, MaxUint256);
    await tokenB.approve(zzmRouter.address, MaxUint256);

    // addr1: init token amount setting
    await tokenA.transfer(addr1.address, 90000);
    await tokenB.transfer(addr1.address, 60000);
    console.log("init token setting done");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await zzmRouter.signer.getAddress()).to.equal(owner.address);
    });
  });

  describe("addLiquidity and removeLiquidity", function () {
    const amountTokenA = 10000;
    const amountTokenB = 40000;
    const amountETH = 40000;
    const expectedLiquidity = 20000;

    it("Should add/remove liquidity (tokenA, tokenB) pair", async function () {
      let pairAddress, lpBalance;

      // pair 생성 전
      pairAddress = await zzmFactory.getPair(tokenA.address, tokenB.address);
      expect(pairAddress).to.equal(ZERO_ADDRESS);

      console.log(
        "Before tokenA balance: ",
        (await tokenA.balanceOf(owner.address)).toString()
      );
      console.log(
        "Before tokenB balance: ",
        (await tokenB.balanceOf(owner.address)).toString()
      );

      console.log(tokenA.address);
      console.log("b=", tokenB.address);
      console.log(addr2.address);
      // add liquidity (tokenA, tokenB) pair, pair 선 생성
      await zzmRouter.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountTokenA,
        amountTokenB,
        0,
        0,
        addr2.address,
        MaxUint256
      );
      console.log("bbb");

      console.log(
        "After tokenA balance: ",
        (await tokenA.balanceOf(owner.address)).toString()
      );
      console.log(
        "After tokenB balance: ",
        (await tokenB.balanceOf(owner.address)).toString()
      );

      pairAddress = await zzmFactory.getPair(tokenA.address, tokenB.address);
      console.log("AB Pair Address: ", pairAddress);

      const pairContract = await ethers.getContractAt("ZzmPair", pairAddress);
      expect(await pairContract.factory()).to.equal(zzmFactory.address);

      lpBalance = (await pairContract.balanceOf(addr2.address)).toNumber();
      console.log(lpBalance);

      expect(lpBalance).to.equal(expectedLiquidity - MINIMUM_LIQUIDITY);

      // approve
      await pairContract.connect(addr2).approve(zzmRouter.address, MaxUint256);

      // remove liquidity (tokenA, tokenB) pair
      await zzmRouter
        .connect(addr2)
        .removeLiquidity(
          tokenA.address,
          tokenB.address,
          lpBalance,
          0,
          0,
          owner.address,
          MaxUint256
        );

      console.log(
        "After removeLiquidity tokenA balance: ",
        (await tokenA.balanceOf(owner.address)).toString()
      );
      console.log(
        "After removeLiquidity tokenB balance: ",
        (await tokenB.balanceOf(owner.address)).toString()
      );

      lpBalance = (await pairContract.balanceOf(addr2.address)).toNumber();
      console.log(lpBalance);

      expect(lpBalance).to.equal(0);
    });

    it("Should ETH <-> WETH", async function () {
      let balance, wBalance;
      balance = await provider.getBalance(wKlay.address);
      console.log("before provider ETH: ", balance.toString());
      console.log(
        "before owner WETH: ",
        (await wKlay.balanceOf(owner.address)).toString()
      );
      console.log(
        "before addr1 WETH: ",
        (await wKlay.balanceOf(addr1.address)).toString()
      );

      // owner sent ETH
      await owner.sendTransaction({ to: wKlay.address, value: amountETH });
      balance = await provider.getBalance(wKlay.address);
      wBalance = await wKlay.balanceOf(owner.address);
      console.log("after provider ETH: ", balance.toString());
      console.log("after owner WETH: ", wBalance.toString());
      expect(balance).to.equal(amountETH);
      expect(wBalance).to.equal(amountETH);

      // addr1 sent ETH
      await addr1.sendTransaction({ to: wKlay.address, value: amountETH });
      balance = await provider.getBalance(wKlay.address);
      wBalance = await wKlay.balanceOf(addr1.address);
      console.log("after provider ETH: ", balance.toString());
      console.log("after addr1 WETH: ", wBalance.toString());
      expect(balance).to.equal(amountETH * 2);
      expect(wBalance).to.equal(amountETH);

      // addr1 withdraw wETH
      await wKlay.connect(addr1).withdraw(amountETH);
      balance = await provider.getBalance(wKlay.address);
      wBalance = await wKlay.balanceOf(addr1.address);
      console.log("after withdraw, provider ETH: ", balance.toString());
      console.log("after withdraw, addr1 WETH: ", wBalance.toString());
      expect(balance).to.equal(amountETH);
      expect(wBalance).to.equal(0);
    });

    it("Should add/remove liquidityETH (tokenA, ETH) pair", async function () {
      let pairAddress, lpBalance;

      // pair 생성 전
      pairAddress = await zzmFactory.getPair(tokenA.address, wKlay.address);
      console.log("Pair Address: ", pairAddress);
      expect(pairAddress).to.equal(ZERO_ADDRESS);

      console.log(
        "Before ETH: ",
        (await provider.getBalance(addr1.address)).toString()
      );
      console.log(
        "Before tokenA balance: ",
        (await tokenA.balanceOf(addr1.address)).toString()
      );

      await tokenA.connect(addr1).approve(zzmRouter.address, MaxUint256);

      // add liquidity (tokenA, tokenB) pair, pair 선 생성
      await zzmRouter
        .connect(addr1)
        .addLiquidityETH(
          tokenA.address,
          amountTokenA,
          0,
          0,
          addr2.address,
          MaxUint256,
          { value: amountETH }
        );

      console.log(
        "After ETH: ",
        (await provider.getBalance(addr1.address)).toString()
      );
      console.log(
        "After tokenA balance: ",
        (await tokenA.balanceOf(addr1.address)).toString()
      );

      pairAddress = await zzmFactory.getPair(tokenA.address, wKlay.address);
      console.log("AB Pair Address: ", pairAddress);

      const pairContract = await ethers.getContractAt("ZzmPair", pairAddress);
      expect(await pairContract.factory()).to.equal(zzmFactory.address);

      lpBalance = (await pairContract.balanceOf(addr2.address)).toNumber();
      console.log(lpBalance);

      expect(lpBalance).to.equal(expectedLiquidity - MINIMUM_LIQUIDITY);

      // approve
      await pairContract.connect(addr2).approve(zzmRouter.address, MaxUint256);

      // remove liquidity (tokenA, tokenB) pair
      await zzmRouter
        .connect(addr2)
        .removeLiquidityETH(
          tokenA.address,
          lpBalance,
          0,
          0,
          addr1.address,
          MaxUint256
        );

      console.log(
        "After removeLiquidity ETH: ",
        (await provider.getBalance(addr1.address)).toString()
      );
      console.log(
        "After removeLiquidity tokenA balance: ",
        (await tokenA.balanceOf(addr1.address)).toString()
      );

      lpBalance = (await pairContract.balanceOf(addr2.address)).toNumber();
      console.log(lpBalance);

      expect(lpBalance).to.equal(0);
    });
  });

  describe("swapExactTokensForTokens", function () {
    const amountTokenA = 50000;
    const amountTokenB = 100000;
    const amountSwap = 10000;
    const amountExpectedOutput = 16624;

    it("happy path", async function () {
      // add liquidity (tokenA, tokenB) pair, pair 선 생성
      await zzmRouter.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountTokenA,
        amountTokenB,
        0,
        0,
        owner.address,
        MaxUint256
      );

      const balanceBeforeTokenA = (
        await tokenA.balanceOf(addr1.address)
      ).toNumber();
      const balanceBeforeTokenB = (
        await tokenB.balanceOf(addr1.address)
      ).toNumber();
      console.log("Before tokenA balance: ", balanceBeforeTokenA);
      console.log("Before tokenB balance: ", balanceBeforeTokenB);

      // approve
      await tokenA.connect(addr1).approve(zzmRouter.address, MaxUint256);

      // swap
      await zzmRouter
        .connect(addr1)
        .swapExactTokensForTokens(
          amountSwap,
          0,
          [tokenA.address, tokenB.address],
          addr1.address,
          MaxUint256
        );

      const balanceAfterTokenA = (
        await tokenA.balanceOf(addr1.address)
      ).toNumber();
      const balanceAfterTokenB = (
        await tokenB.balanceOf(addr1.address)
      ).toNumber();
      console.log("After tokenA balance: ", balanceAfterTokenA);
      console.log("After tokenB balance: ", balanceAfterTokenB);
      expect(balanceAfterTokenA).to.equal(balanceBeforeTokenA - amountSwap);
      expect(balanceAfterTokenB).to.equal(
        balanceBeforeTokenB + amountExpectedOutput
      );
    });
  });

  describe("swapExactETHForTokens", function () {
    const amountETH = 50000;
    const amountTokenA = 100000;
    const amountSwap = 10000; // ETH
    const amountExpectedOutput = 16624;

    it("happy path", async function () {
      // approve
      await tokenA.approve(zzmRouter.address, MaxUint256);

      // add liquidity (tokenA, tokenB) pair, pair 선 생성
      await zzmRouter.addLiquidityETH(
        tokenA.address,
        amountTokenA,
        0,
        0,
        addr2.address,
        MaxUint256,
        { value: amountETH }
      );

      const balanceBeforeTokenA = (
        await tokenA.balanceOf(addr1.address)
      ).toNumber();
      const balanceBeforeETH = await provider.getBalance(addr1.address); // too big
      console.log("Before tokenA balance: ", balanceBeforeTokenA);
      console.log("Before ETH balance: ", balanceBeforeETH.toString());

      // swap
      await zzmRouter
        .connect(addr1)
        .swapExactETHForTokens(
          0,
          [wKlay.address, tokenA.address],
          addr1.address,
          MaxUint256,
          { value: amountSwap }
        );

      const balanceAfterTokenA = (
        await tokenA.balanceOf(addr1.address)
      ).toNumber();
      const balanceAfterETH = await provider.getBalance(addr1.address); // too big
      console.log("After tokenA balance: ", balanceAfterTokenA);
      console.log("After ETH balance: ", balanceAfterETH.toString());
      expect(balanceAfterTokenA).to.equal(
        balanceBeforeTokenA + amountExpectedOutput
      );
    });
  });
});
