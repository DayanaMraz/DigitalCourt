const { ethers } = require("hardhat");

async function main() {
  console.log("🏛️  Deploying Digital Court System with FHEVM...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy the DigitalCourt contract
  console.log("⚖️  Deploying DigitalCourt contract...");
  const DigitalCourt = await ethers.getContractFactory("DigitalCourt");
  const digitalCourt = await DigitalCourt.deploy();
  
  await digitalCourt.waitForDeployment();
  const contractAddress = await digitalCourt.getAddress();

  console.log("✅ DigitalCourt deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Transaction Hash:", digitalCourt.deploymentTransaction().hash);
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(" + network.chainId + ")");
  
  if (network.chainId === 11155111n) { // Sepolia
    console.log("🔍 Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
  } else if (network.chainId === 8009n) { // Zama Devnet
    console.log("🔍 Zama Explorer:", `https://main.explorer.zama.ai/address/${contractAddress}`);
  }

  // Initialize the contract with some sample jurors (optional)
  console.log("\n⚖️  Setting up initial configuration...");
  
  try {
    // Certify the deployer as the first juror for testing
    const tx1 = await digitalCourt.certifyJuror(deployer.address);
    await tx1.wait();
    console.log("✅ Deployer certified as juror");
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 Summary:");
    console.log("   - Contract: DigitalCourt");
    console.log("   - Address:", contractAddress);
    console.log("   - Network:", network.name);
    console.log("   - Gas Used: Estimation varies by network");
    console.log("   - Features: FHE Privacy Voting, Case Management, Jury System");
    
  } catch (error) {
    console.log("⚠️  Initial setup failed:", error.message);
    console.log("   Contract deployed successfully but initialization failed.");
    console.log("   You can manually initialize it later.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });