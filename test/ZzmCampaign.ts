import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, upgrades, waffle } from "hardhat";

describe("ZzmCampaign contract", function () {
  const MaxUint256 = 10 * 10 ** 9;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  let contractFactory;
  let zzmCampaign: Contract, st1: Contract, st2: Contract, st3: Contract;

  let owner: any;
  let alice: any;
  let bob: any; // wallet address 라고 가정
  let carl: any;
  let cr1: any, cr2: any, cr3: any;

  beforeEach(async function () {
    [owner, alice, bob, carl, cr1, cr2, cr3] = await ethers.getSigners();

    // ZzmCampaign
    contractFactory = await ethers.getContractFactory("ZzmCampaign");
    zzmCampaign = await contractFactory.deploy();
    await zzmCampaign.deployed();
    console.log("ZzmCampaign deployed. address: %s", zzmCampaign.address);

    // st1
    contractFactory = await ethers.getContractFactory("UpgradableKToken");
    st1 = await upgrades.deployProxy(
      contractFactory,
      ["SocialToken 1", "st1", 1000000],
      { initializer: "initialize" }
    );
    console.log("Token(st1) deployed. address: %s", st1.address);

    // st2
    contractFactory = await ethers.getContractFactory("UpgradableKToken");
    st2 = await upgrades.deployProxy(
      contractFactory,
      ["SocialToken 2", "st2", 1000000],
      { initializer: "initialize" }
    );
    console.log("Token(st2) deployed. address: %s", st2.address);

    // st3
    contractFactory = await ethers.getContractFactory("UpgradableKToken");
    st3 = await upgrades.deployProxy(
      contractFactory,
      ["SocialToken 3", "st3", 1000000],
      { initializer: "initialize" }
    );
    console.log("Token(st3) deployed. address: %s", st3.address);

    // Initial token distribution
    await st1.transfer(alice.address, 5000);
    await st1.transfer(bob.address, 5000);
    await st1.transfer(carl.address, 5000);
    await st2.transfer(alice.address, 5000);
    await st2.transfer(bob.address, 5000);
    await st2.transfer(carl.address, 5000);
    await st3.transfer(alice.address, 5000);
    await st3.transfer(bob.address, 5000);
    await st3.transfer(carl.address, 5000);
    console.log("Token(st1) alice=%s", await st1.balanceOf(alice.address));
    console.log("Token(st2) alice=%s", await st2.balanceOf(alice.address));
    console.log("Token(st3) alice=%s", await st3.balanceOf(alice.address));
    console.log("Token(st1) bob=%s", await st1.balanceOf(bob.address));
    console.log("Token(st2) bob=%s", await st2.balanceOf(bob.address));
    console.log("Token(st3) bob=%s", await st3.balanceOf(bob.address));
    console.log("Token(st1) carl=%s", await st1.balanceOf(carl.address));
    console.log("Token(st2) carl=%s", await st2.balanceOf(carl.address));
    console.log("Token(st3) carl=%s", await st3.balanceOf(carl.address));

    await Promise.all([
      st1.connect(alice).approve(zzmCampaign.address, MaxUint256),
      st1.connect(bob).approve(zzmCampaign.address, MaxUint256),
      st1.connect(carl).approve(zzmCampaign.address, MaxUint256),
      st2.connect(alice).approve(zzmCampaign.address, MaxUint256),
      st2.connect(bob).approve(zzmCampaign.address, MaxUint256),
      st2.connect(carl).approve(zzmCampaign.address, MaxUint256),
      st3.connect(alice).approve(zzmCampaign.address, MaxUint256),
      st3.connect(bob).approve(zzmCampaign.address, MaxUint256),
      st3.connect(carl).approve(zzmCampaign.address, MaxUint256),
    ]);
    console.log("Prepared to approve.");
  });

  it("Campaign functions", async function () {
    const price1 = 10,
      price2 = 50,
      price3 = 100;
    const count1 = 5,
      count2 = 3,
      count3 = 1;

    // 캠페인 생성
    await zzmCampaign.connect(cr1).add(
      "ST1",
      st1.address,
      cr1.address,
      "Campaign #1",
      price1,
      count1
    );
    await zzmCampaign.connect(cr2).add(
      "ST2",
      st2.address,
      cr2.address,
      "Campaign #2",
      price2,
      count2
    );
    await zzmCampaign.connect(cr3).add(
      "ST3",
      st3.address,
      cr3.address,
      "Campaign #3",
      price3,
      count3
    );
    expect(await zzmCampaign.campaignLength()).to.equal(3);
      
    // 캠페인 조회
    const campaign = await zzmCampaign.campaignById(1);
    expect(campaign[0]).greaterThan(0);

    // 캠페인 조회
    const campaigns = await zzmCampaign.campaignsBySymbol("ST1");
    expect(campaigns.length).to.equal(1);
    console.log(JSON.stringify(campaigns));

    // 캠페인 구매
    const balance_alice = await st1.balanceOf(alice.address);
    const balance_cr1 = await st1.balanceOf(cr1.address);
    await zzmCampaign.connect(alice).buyCampaign(1, price1, "alice@m.com");
    expect(await st1.balanceOf(alice.address)).to.equal(balance_alice - price1);
    expect(await st1.balanceOf(cr1.address)).to.equal(balance_cr1 + price1);

    await zzmCampaign.connect(alice).buyCampaign(2, price2, "alice@m.com");
    await zzmCampaign.connect(alice).buyCampaign(3, price3, "alice@m.com");
    await zzmCampaign.connect(bob).buyCampaign(1, price1, "bob@m.com");
    await zzmCampaign.connect(bob).buyCampaign(2, price2, "bob@m.com");

    // event 체크 : sold 카운트 확인 (1번 캠페인 3번째 구매)
    await expect(await zzmCampaign.connect(carl).buyCampaign(1, price1, "carl@m.com"))
        .to.emit(zzmCampaign, 'BuyCampaign')
        .withArgs(carl.address,  1, price1, 3);

    const addresses1 = await zzmCampaign.campaignAddresses(1);
    const addresses2 = await zzmCampaign.campaignAddresses(2);
    const addresses3 = await zzmCampaign.campaignAddresses(3);
    expect(addresses1.length).to.equal(3);
    expect(addresses2.length).to.equal(2);
    expect(addresses3.length).to.equal(1);

    // 예외 테스트 (중복 구매)
    await expect(
      zzmCampaign.connect(alice).buyCampaign(1, price1, "alice@m.com")
    ).to.be.revertedWith("ZzmCampaign: ALREADY_BOUGHT");

    // 예외 테스트 (입금액 부족)
    await expect(
      zzmCampaign.connect(carl).buyCampaign(2, price2 - 1, "carl@m.com")
    ).to.be.revertedWith("ZzmCampaign: INSUFFICIENT_AMOUNT");

    // 예외 테스트 (판매 완료)
    await expect(
      zzmCampaign.connect(bob).buyCampaign(3, price3, "bob@m.com")
    ).to.be.revertedWith("ZzmCampaign: SOLD_OUT");

    // 내가 구매한 캠페인
    const myCampaign1_alice = await zzmCampaign.myCampaign(1, alice.address);
    const myCampaign2_alice = await zzmCampaign.myCampaign(2, alice.address);
    const myCampaign3_alice = await zzmCampaign.myCampaign(3, alice.address);
    expect(myCampaign1_alice[0]).to.equal(price1);
    expect(myCampaign2_alice[0]).to.equal(price2);
    expect(myCampaign3_alice[0]).to.equal(price3);

    const myCampaign1_bob = await zzmCampaign.myCampaign(1, bob.address);
    const myCampaign2_bob = await zzmCampaign.myCampaign(2, bob.address);
    const myCampaign3_bob = await zzmCampaign.myCampaign(3, bob.address);
    expect(myCampaign1_bob[0]).to.equal(price1);
    expect(myCampaign2_bob[0]).to.equal(price2);
    expect(myCampaign3_bob[0]).to.equal(0);

    const myCampaign1_carl = await zzmCampaign.myCampaign(1, carl.address);
    const myCampaign2_carl = await zzmCampaign.myCampaign(2, carl.address);
    const myCampaign3_carl = await zzmCampaign.myCampaign(3, carl.address);
    expect(myCampaign1_carl[0]).to.equal(price1);
    expect(myCampaign2_carl[0]).to.equal(0);
    expect(myCampaign3_carl[0]).to.equal(0);

    // 내가 구매한 모든 캠페인
    const myCampaigns1 = await zzmCampaign.myCampaigns(alice.address);
    const myCampaigns2 = await zzmCampaign.myCampaigns(bob.address);
    const myCampaigns3 = await zzmCampaign.myCampaigns(carl.address);
    expect(myCampaigns1.length).to.equal(3);
    expect(myCampaigns2.length).to.equal(2);
    expect(myCampaigns3.length).to.equal(1);

    // 캠페인에 참여한 사용자
    const users1 = await zzmCampaign.campaignUsers(1);
    const users2 = await zzmCampaign.campaignUsers(2);
    const users3 = await zzmCampaign.campaignUsers(3);
    expect(users1[0].length).to.equal(3);
    expect(users2[0].length).to.equal(2);
    expect(users3[0].length).to.equal(1);
  });
});
