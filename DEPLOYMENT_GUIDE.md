# Complete Deployment Guide: Digital Court FHE dApp

## 🚀 Deployment Overview

This guide covers the complete deployment process from local development to production deployment on FHEVM networks. Follow these steps to get your Digital Court dApp running live.

## 📋 Prerequisites Checklist

Before starting deployment, ensure you have:

- [x] **Node.js 16+** installed
- [x] **Git** for version control
- [x] **MetaMask** wallet with testnet ETH
- [x] **Vercel account** (for frontend deployment)
- [x] **GitHub repository** for code hosting
- [x] **Basic understanding** of blockchain deployment

## 🛠️ Local Development Setup

### Step 1: Project Initialization

```bash
# Clone or create your project
git clone https://github.com/YourUsername/digital-court-fhe
cd digital-court-fhe

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### Step 2: Environment Configuration

Create `.env.local`:
```bash
# Contract Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51
NEXT_PUBLIC_NETWORK_NAME=sepolia

# FHEVM Configuration (for production)
NEXT_PUBLIC_FHEVM_NETWORK_URL=https://devnet.zama.ai
NEXT_PUBLIC_FHEVM_GATEWAY_URL=https://gateway.devnet.zama.ai

# Development Settings
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ENVIRONMENT=development

# Deployment Keys (keep secure!)
PRIVATE_KEY=your_private_key_here
INFURA_PROJECT_ID=your_infura_project_id
```

### Step 3: Local Testing

```bash
# Start development server
npm run dev

# Open in browser
# http://localhost:3000

# Test core functionality:
# 1. Wallet connection
# 2. Contract interaction
# 3. Vote casting
# 4. Transaction monitoring
```

## 🌐 Testnet Deployment

### Step 1: Hardhat Configuration

Create `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: "auto",
      gas: "auto"
    },
    zama: {
      url: "https://devnet.zama.ai",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8009,
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY
    }
  }
};
```

### Step 2: Deployment Script

Create `scripts/deploy.js`:
```javascript
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Digital Court deployment...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy DigitalCourt contract
  console.log("🔨 Deploying DigitalCourt contract...");
  const DigitalCourt = await ethers.getContractFactory("DigitalCourt");
  const digitalCourt = await DigitalCourt.deploy();

  await digitalCourt.waitForDeployment();
  const contractAddress = await digitalCourt.getAddress();

  console.log("✅ DigitalCourt deployed to:", contractAddress);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const caseCount = await digitalCourt.caseCount();
  console.log("📊 Initial case count:", caseCount.toString());

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasUsed: (await digitalCourt.deploymentTransaction().wait()).gasUsed.toString()
  };

  console.log("📋 Deployment Summary:");
  console.table(deploymentInfo);

  // Update environment file
  console.log("📝 Update your .env.local with:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_NETWORK_NAME=${network.name}`);

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
```

### Step 3: Deploy to Sepolia Testnet

```bash
# Get testnet ETH from faucets:
# https://sepoliafaucet.com/
# https://faucet.sepolia.dev/

# Deploy contract
npx hardhat run scripts/deploy.js --network sepolia

# Expected output:
# 🚀 Starting Digital Court deployment...
# 📝 Deploying contracts with account: 0x...
# 💰 Account balance: 0.1 ETH
# 🔨 Deploying DigitalCourt contract...
# ✅ DigitalCourt deployed to: 0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51

# Verify on Etherscan
npx hardhat verify --network sepolia 0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51
```

### Step 4: Update Frontend Configuration

Update `.env.local`:
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51
NEXT_PUBLIC_NETWORK_NAME=sepolia
NEXT_PUBLIC_ENVIRONMENT=testnet
```

Test the integration:
```bash
npm run dev
# Verify contract connection works
# Test voting functionality
```

## 🌟 Production Deployment

### Step 1: Frontend Deployment to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# ? Set up and deploy "digital-court-fhe"? [Y/n] y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] n
# ? What's your project's name? digital-court-fhe
# ? In which directory is your code located? ./

# Configure environment variables in Vercel dashboard:
# https://vercel.com/your-username/digital-court-fhe/settings/environment-variables

# Production deployment
vercel --prod
```

### Step 2: Environment Variables in Vercel

Set these in Vercel dashboard:
```
NEXT_PUBLIC_CONTRACT_ADDRESS = 0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51
NEXT_PUBLIC_NETWORK_NAME = sepolia
NEXT_PUBLIC_FHEVM_NETWORK_URL = https://devnet.zama.ai
NEXT_PUBLIC_FHEVM_GATEWAY_URL = https://gateway.devnet.zama.ai
NEXT_PUBLIC_ENVIRONMENT = production
```

### Step 3: Custom Domain (Optional)

```bash
# Add custom domain in Vercel dashboard
# Or via CLI:
vercel domains add your-domain.com
```

### Step 4: SSL and Security Headers

Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## 🔐 FHEVM Production Deployment

### Step 1: FHEVM Network Setup

For production FHEVM deployment:

```javascript
// Update hardhat.config.js
networks: {
  zama_mainnet: {
    url: "https://mainnet.zama.ai", // When available
    accounts: [process.env.MAINNET_PRIVATE_KEY],
    chainId: 8008, // Actual mainnet chain ID
    gasPrice: "auto"
  }
}
```

### Step 2: Production FHE Configuration

Update frontend for production FHE:

```javascript
// In your FHE initialization
const initProductionFHE = async () => {
  if (process.env.NODE_ENV === 'production') {
    // Use real FHEVM
    const instance = await createFhevmInstance({
      networkUrl: process.env.NEXT_PUBLIC_FHEVM_NETWORK_URL,
      gatewayUrl: process.env.NEXT_PUBLIC_FHEVM_GATEWAY_URL
    });
    return instance;
  } else {
    // Use mock for development
    return mockFhevmInstance;
  }
};
```

## 📊 Monitoring and Analytics

### Step 1: Error Tracking

Add error tracking (optional):
```bash
npm install @sentry/react @sentry/nextjs
```

Configure in `next.config.js`:
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Your existing config
};

module.exports = withSentryConfig(nextConfig, {
  org: "your-org",
  project: "digital-court",
});
```

### Step 2: Analytics Integration

Add to `pages/_app.js`:
```javascript
import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Simple analytics (or use Google Analytics)
const trackPageView = (url) => {
  if (typeof window !== 'undefined') {
    // Track page views
    console.log('Page view:', url);
  }
};

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      trackPageView(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return <Component {...pageProps} />;
}
```

## 🧪 Testing Production Deployment

### Automated Testing Checklist

Create `tests/production.test.js`:
```javascript
const { expect } = require('chai');
const { ethers } = require('ethers');

describe('Production Deployment Tests', function() {
  let contract;
  let provider;

  before(async function() {
    // Connect to deployed contract
    provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_KEY');
    contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );
  });

  it('Should have correct contract address', async function() {
    expect(contract.address).to.be.a('string');
    expect(contract.address).to.match(/^0x[a-fA-F0-9]{40}$/);
  });

  it('Should have initial state', async function() {
    const caseCount = await contract.caseCount();
    expect(caseCount).to.equal(0);
  });

  it('Should respond to view functions', async function() {
    const response = await contract.getCases(0, 10);
    expect(response).to.be.an('array');
  });
});
```

Run tests:
```bash
npm test
```

### Manual Testing Steps

1. **Wallet Connection**
   - [ ] MetaMask connects successfully
   - [ ] Correct network detected
   - [ ] Account address displayed

2. **Contract Interaction**
   - [ ] Contract instance created
   - [ ] View functions return data
   - [ ] Write functions work with wallet

3. **FHE Functionality**
   - [ ] FHE initialization completes
   - [ ] Vote encryption works (or mock)
   - [ ] Transactions succeed

4. **UI/UX Testing**
   - [ ] Responsive design works
   - [ ] Error messages are clear
   - [ ] Loading states display properly
   - [ ] Transaction feedback works

## 🚨 Troubleshooting Common Issues

### Issue 1: Contract Not Deployed
```
Error: Contract call reverted without reason
```

**Solution:**
```bash
# Check if contract exists
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS

# If not, redeploy
npx hardhat run scripts/deploy.js --network sepolia
```

### Issue 2: FHE Initialization Fails
```
Error: FHE instance failed to initialize
```

**Solution:**
```javascript
// Add fallback to mock
const initFHE = async () => {
  try {
    const instance = await createFhevmInstance(config);
    return instance;
  } catch (error) {
    console.warn('FHE failed, using mock:', error);
    return mockFhevmInstance; // Fallback for demo
  }
};
```

### Issue 3: Vercel Build Fails
```
Error: Module not found
```

**Solution:**
```bash
# Check dependencies
npm ls

# Install missing dependencies
npm install

# Clear cache and rebuild
rm -rf .next node_modules package-lock.json
npm install
```

### Issue 4: MetaMask Connection Issues
```
Error: User rejected the request
```

**Solution:**
```javascript
// Add better error handling
const connectWallet = async () => {
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  } catch (error) {
    if (error.code === 4001) {
      alert('Please approve the connection to continue');
    } else {
      alert('Connection failed: ' + error.message);
    }
  }
};
```

## 🔄 Continuous Deployment

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Build project
      run: npm run build

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

## 📈 Scaling Considerations

### Performance Optimization
1. **Contract Optimization**
   - Use smaller data types where possible
   - Batch operations to reduce gas costs
   - Implement pagination for large datasets

2. **Frontend Optimization**
   - Enable Next.js image optimization
   - Implement code splitting
   - Use React.memo for expensive components

3. **Infrastructure Scaling**
   - Use Vercel Edge Functions for API routes
   - Implement caching strategies
   - Monitor performance metrics

### Security Best Practices
1. **Smart Contract Security**
   - Regular security audits
   - Use OpenZeppelin patterns
   - Implement proper access controls

2. **Frontend Security**
   - Validate all user inputs
   - Use HTTPS everywhere
   - Implement CSP headers

## 🎉 Deployment Success Checklist

- [ ] **Contract deployed** and verified on blockchain explorer
- [ ] **Frontend deployed** and accessible via public URL
- [ ] **Wallet integration** working across different browsers
- [ ] **FHE functionality** operational (or mock working)
- [ ] **Transaction monitoring** displaying correct information
- [ ] **Error handling** providing helpful user feedback
- [ ] **Mobile responsive** design working on all devices
- [ ] **Security headers** properly configured
- [ ] **Performance** meets acceptable standards
- [ ] **Monitoring** and analytics setup completed

## 📞 Post-Deployment Support

### Documentation for Users
Create user-facing documentation:
- How to connect wallet
- How to vote on cases
- Understanding transaction fees
- Privacy guarantees explanation

### Community Support
- Set up Discord/Telegram for user support
- Create FAQ documentation
- Provide tutorial videos
- Regular community updates

---

**🚀 Congratulations! Your Digital Court FHE dApp is now live and ready to demonstrate the power of privacy-preserving blockchain applications!**

**Live Demo:** https://digital-court.vercel.app/
**Contract:** https://sepolia.etherscan.io/address/0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51
**GitHub:** https://github.com/YourUsername/digital-court-fhe