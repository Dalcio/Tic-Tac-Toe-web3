import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for TicTacToe smart contract
 *
 * Usage:
 * - Local: npx hardhat run scripts/deploy.ts --network localhost
 * - Sepolia: npx hardhat run scripts/deploy.ts --network sepolia
 * - Mumbai: npx hardhat run scripts/deploy.ts --network mumbai
 */
async function main() {
  console.log("🎮 Deploying TicTacToe contract...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy the contract
  console.log("⏳ Deploying TicTacToe contract...");
  const TicTacToe = await ethers.getContractFactory("TicTacToe");
  const ticTacToe = await TicTacToe.deploy();

  await ticTacToe.waitForDeployment();

  const contractAddress = await ticTacToe.getAddress();
  console.log("✅ TicTacToe deployed to:", contractAddress);

  // Get deployment transaction
  const deploymentTx = ticTacToe.deploymentTransaction();
  if (deploymentTx) {
    console.log("📝 Transaction hash:", deploymentTx.hash);

    // Wait for confirmations on testnets
    const network = await ethers.provider.getNetwork();
    if (Number(network.chainId) !== 31337) {
      // Not localhost
      console.log("⏳ Waiting for confirmations...");
      await deploymentTx.wait(3);
      console.log("✅ Confirmed!");
    }
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    timestamp: new Date().toISOString(),
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(
    deploymentsDir,
    `deployment-${deploymentInfo.chainId}.json`,
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: ${deploymentFile}`);

  // Copy ABI to lib folder for frontend
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "TicTacToe.sol",
    "TicTacToe.json",
  );
  const libDir = path.join(__dirname, "..", "lib", "contracts");

  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiFile = path.join(libDir, "TicTacToe.json");
    fs.writeFileSync(
      abiFile,
      JSON.stringify({ abi: artifact.abi, address: contractAddress }, null, 2),
    );
    console.log(`📄 ABI saved to: ${abiFile}`);
  }

  // Auto-update .env.local with contract address
  const envLocalPath = path.join(__dirname, "..", ".env.local");
  const envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
  fs.writeFileSync(envLocalPath, envContent);
  console.log(`📄 .env.local updated with contract address`);

  console.log("\n🎉 Deployment complete!\n");
  console.log("=".repeat(50));
  console.log("🚀 Ready to play! Open http://localhost:3000");
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
