import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network, upgrades, waffle } from "hardhat";

const Web3 = require("web3");
const web3 = new Web3(network.provider);

describe("ZzmRouter contract", function () {
    const MaxUint256 = web3.utils.toWei('100000000', 'ether') /*10 * 10 ** 9*/;
    const MINIMUM_LIQUIDITY = 1000;
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const provider = waffle.provider;

    let owner: any;
    let addr1: any;
    let addr2: any;

    let contractFactory;
    let zzmFactory: Contract, zzmRouter: Contract;
    let zzmLib: Contract;
    let klayAndZzmPair: Contract, zzmAndSocialTokenAPair: Contract;

    let wKlay: Contract, zzmToken: Contract, socialTokenA: Contract, socialTokenB: Contract;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        contractFactory = await ethers.getContractFactory("ZzmLibrary");
        zzmLib = await contractFactory.deploy();

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

        // zzm token
        contractFactory = await ethers.getContractFactory("UpgradableKToken");
        zzmToken = await upgrades.deployProxy(contractFactory, ['zzm gov token', 'zzm', 1000000],
            {initializer: 'initialize'});
        console.log("zzmToken is created at ", zzmToken.address);

        // socialTokenA
        contractFactory = await ethers.getContractFactory("UpgradableKToken");
        socialTokenA = await upgrades.deployProxy(contractFactory, ['socialA', 'stA', 1000000],
            {initializer: 'initialize'});
        console.log("socialTokenA is created at ", socialTokenA.address);

        // socialTokenB
        contractFactory = await ethers.getContractFactory("UpgradableKToken");
        socialTokenB = await upgrades.deployProxy(contractFactory, ['socialB', 'stB', 1000000],
            {initializer: 'initialize'});
        console.log("socialTokenB is created at ", socialTokenB.address);

        // approve contract
        await zzmToken.approve(zzmRouter.address, MaxUint256);
        await socialTokenA.approve(zzmRouter.address, MaxUint256);
        await socialTokenB.approve(zzmRouter.address, MaxUint256);

        // addr1: init token amount setting
        await zzmToken.transfer(addr1.address, web3.utils.toWei('100000', 'ether')); // owner's zzmToken: 900000
        await socialTokenA.transfer(addr1.address, web3.utils.toWei('100000', 'ether')); // owner's tokenA: 900000
        await socialTokenB.transfer(addr1.address, web3.utils.toWei('100000', 'ether')); // owner's tokenA: 900000
        console.log("init token setting done");

        await zzmRouter.addLiquidityETH(
            zzmToken.address,
            web3.utils.toWei('5000', 'ether'),
            0,
            0,
            owner.address,
            MaxUint256,
            {value: web3.utils.toWei('5000', 'ether')});

        await zzmRouter.addLiquidity(
            zzmToken.address,
            socialTokenA.address,
            web3.utils.toWei('5000', 'ether'),
            web3.utils.toWei('5000', 'ether'),
            0,
            0,
            owner.address,
            MaxUint256);

        await zzmRouter.addLiquidity(
            zzmToken.address,
            socialTokenB.address,
            web3.utils.toWei('5000', 'ether'),
            web3.utils.toWei('5000', 'ether'),
            0,
            0,
            owner.address,
            MaxUint256);

        // addr1 has lp
        // - klay-zzm : 5000 * 10**18 - 1000
        // - zzm-stA : 5000 * 10**18 - 1000
        // - zzm-stB : 5000 * 10**18 - 1000
        const klayAndZzmPairAddress = await zzmFactory.getPair(wKlay.address, zzmToken.address);
        klayAndZzmPair = await ethers.getContractAt('ZzmPair', klayAndZzmPairAddress);
        expect((await klayAndZzmPair.factory())).to.equal(zzmFactory.address);
        console.log("klay zzm pair balance before swap : ", (await klayAndZzmPair.balanceOf(owner.address)).toString());

        const zzmAndSocialTokenAPairAddress = await zzmFactory.getPair(zzmToken.address, socialTokenA.address);
        zzmAndSocialTokenAPair = await ethers.getContractAt('ZzmPair', zzmAndSocialTokenAPairAddress);
        expect((await zzmAndSocialTokenAPair.factory())).to.equal(zzmFactory.address);
        console.log("zzm socialA pair totalSupply before swap : ", (await zzmAndSocialTokenAPair.totalSupply()).toString());
        console.log("zzm socialA pair balance before swap : ", (await zzmAndSocialTokenAPair.balanceOf(owner.address)).toString());
    });

    it('swap and add liquidity', async function () {
        console.log("addr2 klay balance before swap: ", (await provider.getBalance(addr2.address)).toString());
        console.log("addr2 zzm balance before swap: ", (await zzmToken.balanceOf(addr2.address)).toString());
        console.log("addr2 stA balance before swap: ", (await socialTokenA.balanceOf(addr2.address)).toString());
        console.log("addr2 zzm socialA pair balance before swap : ", (await zzmAndSocialTokenAPair.balanceOf(addr2.address)).toString());

        // approve
        await zzmToken.connect(addr2).approve(zzmRouter.address, MaxUint256);
        await socialTokenA.connect(addr2).approve(zzmRouter.address, MaxUint256);

        // swap & add liquidity
        const etherAmountForSwap = web3.utils.toWei('100', 'ether');
        await zzmRouter.connect(addr2).swapETHAndAddLiquidity(
            [wKlay.address, zzmToken.address, socialTokenA.address],
            addr2.address,
            MaxUint256,
            {value: etherAmountForSwap});

        let balanceOfSocialTokenA = (await socialTokenA.balanceOf(addr2.address)).toString();
        console.log("addr2 klay balance after swap: ", (await provider.getBalance(addr2.address)).toString());
        console.log("addr2 zzm balance after swap: ", (await zzmToken.balanceOf(addr2.address)).toString());
        console.log("addr2 stA balance after swap: ", balanceOfSocialTokenA);
        console.log("addr2 zzm socialA pair balance after swap : ", (await zzmAndSocialTokenAPair.balanceOf(addr2.address)).toString());
        console.log("zzm socialA pair totalSupply after swap : ", (await zzmAndSocialTokenAPair.totalSupply()).toString());

        await zzmRouter.connect(addr2).swapETHAndAddLiquidity(
            [wKlay.address, zzmToken.address, socialTokenA.address],
            addr2.address,
            MaxUint256,
            {value: etherAmountForSwap});

        balanceOfSocialTokenA = (await socialTokenA.balanceOf(addr2.address)).toString();
        console.log("addr2 klay balance after swap2: ", (await provider.getBalance(addr2.address)).toString());
        console.log("addr2 zzm balance after swap2: ", (await zzmToken.balanceOf(addr2.address)).toString());
        console.log("addr2 stA balance after swap2: ", balanceOfSocialTokenA);
        console.log("addr2 zzm socialA pair balance after swap2: ", (await zzmAndSocialTokenAPair.balanceOf(addr2.address)).toString());
        console.log("zzm socialA pair totalSupply after swap2: ", (await zzmAndSocialTokenAPair.totalSupply()).toString());
    });
});