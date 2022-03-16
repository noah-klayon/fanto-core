import { ethers } from "hardhat";
import { contractAt, printRunEnv, tokenContractAt } from "./api/zzmApi";

const zzmApi = require("./api/zzmApi");

async function main() {
  const [deployer] = await ethers.getSigners();
  await printRunEnv(`Deploying campaign.. `);

  // Deploy campaign contract
  const campaign = await contractAt("ZzmCampaign");
  const RYVG = await tokenContractAt("RYVG");
  const KBT = await tokenContractAt("KBT");
  const UNQT = await tokenContractAt("UNQT");

  if (!campaign || !RYVG || !KBT || !UNQT) {
    throw Error("One of required contracts is null.");
  }

  const creator = "0x946BEd7E198a38b0f4630658CEB6903DA0af060c"; // noah
  await campaign.add("RYVG", RYVG.address, creator, "RYVG Campaign #1", 2, 3);
  await campaign.add("RYVG", RYVG.address, creator, "RYVG Campaign #2", 5, 2);
  await campaign.add("RYVG", RYVG.address, creator, "RYVG Campaign #3", 10, 1);
  await campaign.add("KBT", KBT.address, creator, "KBT Campaign #1", 12, 3);
  await campaign.add("KBT", KBT.address, creator, "KBT Campaign #2", 7, 2);
  await campaign.add("UNQT", UNQT.address, creator, "UNQT Campaign #1", 8, 3);
  
  console.log("Sample campaigns added.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
