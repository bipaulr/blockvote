const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Election = await hre.ethers.getContractFactory("Election");
  const election = await Election.deploy("MEC ELECTION 2026");
  await election.waitForDeployment();

  const address = await election.getAddress();
  console.log("Election deployed to:", address);

  // Save address + ABI for backend and frontend
  const artifact = await hre.artifacts.readArtifact("Election");
  const deployInfo = {
    address,
    abi: artifact.abi,
    network: "localhost",
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync("./deploy-info.json", JSON.stringify(deployInfo, null, 2));
  fs.writeFileSync("./backend/deploy-info.json", JSON.stringify(deployInfo, null, 2));
  fs.writeFileSync("./frontend/src/utils/deploy-info.json", JSON.stringify(deployInfo, null, 2));

  console.log("deploy-info.json written to backend and frontend");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
