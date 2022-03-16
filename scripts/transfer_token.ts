import { ethers } from "hardhat";
import { printRunEnv, tokenContractAt, tokenTransfer } from "./api/zzmApi";

const zzmApi = require("./api/zzmApi");

async function main() {
  const tokenName = process.env.TOKEN ?? "";
  const [deployer] = await ethers.getSigners();
  await printRunEnv(`Transfer tokens (${tokenName})..`);

  const token = await tokenContractAt(tokenName);

  // Send token to developers
  const addresses = [
    "0x946BEd7E198a38b0f4630658CEB6903DA0af060c", // noah
    "0x4783d1d3be8fb094b5cbe528ece09de2c8b900a5", // jake
  ];
  const amount = "10000";

  for (const address of addresses) {
    await tokenTransfer(
      token!,
      tokenName,
      deployer.address,
      address,
      ethers.utils.parseEther(amount)
    );

    const balance = await token!.balanceOf(address);
    console.log(
      "Token(%s) %s transfered to %s. balance=%s",
      tokenName,
      amount,
      address,
      ethers.utils.formatEther(balance)
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
