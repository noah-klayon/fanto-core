import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, upgrades, waffle } from "hardhat";

describe("ZzmFarm contract", function () {
    const MaxUint256 = 10 * 10 ** 9;
    const MINIMUM_LIQUIDITY = 1000;
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const provider = waffle.provider;

    let contractFactory;
    let zzmFarm: Contract, ftn: Contract, st1: Contract, st2: Contract, st3: Contract;

    let owner: any;
    let alice: any;
    let bob: any;  // wallet address 라고 가정
    let carl: any;

    beforeEach(async function () {
        [owner, alice, bob, carl] = await ethers.getSigners();

        // FTN
        contractFactory = await ethers.getContractFactory("UpgradableKToken");
        ftn = await upgrades.deployProxy(contractFactory, ['token FTN', 'ftn', 1000000],
          {initializer: 'initialize'});
        console.log("ftn is created at ", ftn.address);

        // st1
        contractFactory = await ethers.getContractFactory("UpgradableKToken");
        st1 = await upgrades.deployProxy(contractFactory, ['st 1', 'st1', 1000000],
          {initializer: 'initialize'});
        console.log("st1 is created at ", st1.address);

        // st2
        contractFactory = await ethers.getContractFactory("UpgradableKToken");
        st2 = await upgrades.deployProxy(contractFactory, ['st 2', 'st2', 1000000],
            {initializer: 'initialize'});
        console.log("st2 is created at ", st2.address);

        // st3
        contractFactory = await ethers.getContractFactory("UpgradableKToken");
        st3 = await upgrades.deployProxy(contractFactory, ['st 3', 'st3', 1000000],
            {initializer: 'initialize'});
        console.log("st3 is created at ", st3.address);

        // addr1: init token amount setting
        await st1.transfer(alice.address, 5000);
        await st1.transfer(bob.address, 5000);
        await st1.transfer(carl.address, 5000);

        await st2.transfer(alice.address, 5000);
        await st2.transfer(bob.address, 5000);
        await st2.transfer(carl.address, 5000);

        await st3.transfer(alice.address, 5000);
        await st3.transfer(bob.address, 5000);
        await st3.transfer(carl.address, 5000);
        console.log("init token setting done");

        const currentBlock = await ethers.provider.getBlockNumber();
        const startBlock = currentBlock + 5;
        console.log("farm start block: ", startBlock);

        // ZzmFarm
        contractFactory = await ethers.getContractFactory("ZzmFarm");
        let rewardPerBlock = 100;
        zzmFarm = await contractFactory.deploy(ftn.address, rewardPerBlock, startBlock);

        await ftn.approve(zzmFarm.address, 100000);
        await zzmFarm.fund(10000);
        console.log("Fund is done");

        // add lp to pool
        await zzmFarm.add(5, st1.address, false);
        await zzmFarm.add(3, st2.address, false);
        await zzmFarm.add(2, st3.address, false);
        console.log("Pool added at ", zzmFarm.address);

        const poolLength = await zzmFarm.poolLength();
        expect(poolLength).to.equal(3);

        await Promise.all([
            st1.connect(alice).approve(zzmFarm.address, MaxUint256),
            st1.connect(bob).approve(zzmFarm.address, MaxUint256),
            st2.connect(alice).approve(zzmFarm.address, MaxUint256),
            st2.connect(bob).approve(zzmFarm.address, MaxUint256),
            st3.connect(alice).approve(zzmFarm.address, MaxUint256),
            st3.connect(bob).approve(zzmFarm.address, MaxUint256),
        ]);
        console.log("approve is done");

        await zzmFarm.connect(alice).deposit(0, 1600);
        console.log("alice blockNumber=", await ethers.provider.getBlockNumber());
        await zzmFarm.connect(bob).deposit(0, 400);
        console.log("bob blockNumber=", await ethers.provider.getBlockNumber());
        console.log("Deposit is done");
    });

    it("Check pending reward in same pool", async function () {
        let aliceReward;
        let bobReward;
        let curBlockNumber;
        let prevAliceReward = (await zzmFarm.pending(0, alice.address)).toNumber();
        let prevBobReward = (await zzmFarm.pending(0, bob.address)).toNumber();

        for (let i=0; i<10; i++) {
            await provider.send("evm_mine", []);
            aliceReward = await zzmFarm.pending(0, alice.address);
            expect(aliceReward).to.equal(+prevAliceReward + 40);
            prevAliceReward = aliceReward;

            bobReward = await zzmFarm.pending(0, bob.address);
            expect(bobReward).to.equal(+prevBobReward + 10);
            prevBobReward = bobReward;
            curBlockNumber = await ethers.provider.getBlockNumber();
            console.log("[reward] alice=", aliceReward.toString(), ", bob=", bobReward.toString(), ", blockNumber=", curBlockNumber);
        }
    });

    // ST1:ST2:ST3 = 5:3:2
    it("Check pending reward in other pool", async function () {
        let aliceRewardOfST1;
        let aliceRewardOfST2;

        await zzmFarm.connect(alice).deposit(1, 1600);
        // console.log("alice blockNumber=", await ethers.provider.getBlockNumber());
        await zzmFarm.connect(bob).deposit(1, 400);
        // console.log("bob blockNumber=", await ethers.provider.getBlockNumber());

        for (let i=0; i<10; i++) {
            await provider.send("evm_mine", []);
            aliceRewardOfST1 = (await zzmFarm.pending(0, alice.address)).toString();
            aliceRewardOfST2 = (await zzmFarm.pending(1, alice.address)).toString();
            console.log("aliceRewardOfST1=", aliceRewardOfST1, ", aliceRewardOfST2=", aliceRewardOfST2);
        }
    });

    it("Claim reward", async function () {
        for (let i=0; i<10; i++) {
            await provider.send("evm_mine", []);
        }

        let aliceReward = await zzmFarm.pending(0, alice.address);
        let bobReward = await zzmFarm.pending(0, bob.address);
        let curBlockNumber = await ethers.provider.getBlockNumber();
        console.log("[reward] alice=", aliceReward.toString(), ", bob=", bobReward.toString(), ", blockNumber=", curBlockNumber);

        let ftnBalanceOfBob = await ftn.balanceOf(bob.address);
        console.log("[before claim] bob ftn=", ftnBalanceOfBob.toString());
        // check claim event
        await expect(await zzmFarm.connect(bob).claim(0))
            .to.emit(zzmFarm, 'Claim')
            .withArgs(bob.address, 0)

        ftnBalanceOfBob = await ftn.balanceOf(bob.address);
        console.log("[after claim] bob ftn=", ftnBalanceOfBob.toString());
        expect(ftnBalanceOfBob).to.equal(+bobReward + 10);
        aliceReward = await zzmFarm.pending(0, alice.address);
        bobReward = await zzmFarm.pending(0, bob.address);
        curBlockNumber = await ethers.provider.getBlockNumber();
        console.log("[after withdraw reward] alice=", aliceReward.toString(), ", bob=", bobReward.toString(), ", blockNumber=", curBlockNumber);
        expect(bobReward).to.equal(0);
    });
});