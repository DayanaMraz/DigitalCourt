# Hello FHEVM Tutorial: Building Your First Confidential dApp

## 🚀 Welcome to Fully Homomorphic Encryption on Blockchain!

This tutorial will guide you through building your first confidential dApp using FHEVM (Fully Homomorphic Encryption Virtual Machine). We'll create a **Digital Court System** where votes are encrypted and private, but the final results are publicly verifiable.

**What you'll learn:**
- How to use encrypted data types in smart contracts
- Building a complete dApp with privacy-preserving features
- Integrating frontend with FHE-enabled contracts
- Best practices for confidential blockchain applications

## 🎯 Prerequisites

**You should have:**
- Basic Solidity knowledge (variables, functions, modifiers)
- Experience with React/Next.js
- Familiarity with Ethereum development tools
- MetaMask wallet installed

**No advanced math or cryptography knowledge required!**

## 📚 What is FHEVM?

FHEVM enables **computation on encrypted data** without decrypting it. Think of it like:
- ✅ A sealed ballot box where votes can be counted without opening individual ballots
- ✅ Computing on private data while keeping it private
- ✅ Public verification of results without revealing private inputs

**Key Benefits:**
- **Privacy**: Your data stays encrypted throughout computation
- **Verifiability**: Results are cryptographically provable
- **Decentralization**: No trusted third parties needed

## 🏗️ Project Overview

We're building a **Digital Court System** where:
1. **Judges** can create legal cases
2. **Jurors** cast encrypted votes (guilty/innocent)
3. **Results** are publicly revealed without exposing individual votes

**Privacy Features:**
- Individual votes remain encrypted
- Vote tallies are computed on encrypted data
- Only final results are decrypted and revealed

## 🛠️ Setting Up Your Development Environment

### Step 1: Clone and Install

```bash
# Clone the project
git clone https://github.com/YourUsername/digital-court-fhe
cd digital-court-fhe

# Install dependencies
npm install

# Install additional FHE dependencies
npm install fhevmjs ethers@^6.8.0
```

### Step 2: Project Structure

```
digital-court-fhe/
├── contracts/
│   ├── DigitalCourt.sol      # Main contract with FHE
│   ├── TFHE.sol              # FHE type definitions
│   ├── FHELib.sol            # FHE utility functions
│   └── MockFHEVM.sol         # Local testing mock
├── pages/
│   ├── index.js              # Frontend React app
│   └── _app.js               # App configuration
├── package.json
└── next.config.js
```

## 🔐 Understanding FHE Data Types

FHEVM introduces special encrypted data types:

```solidity
// Traditional Solidity
uint8 publicVote = 1;        // Everyone can see this is 1

// FHEVM Encrypted Types
euint8 privateVote;          // Encrypted, nobody can see the value
euint32 voteCount;           // Encrypted counter
```

**Available Types:**
- `euint8`, `euint16`, `euint32`, `euint64` - Encrypted unsigned integers
- `ebool` - Encrypted boolean values

## 📝 Smart Contract Implementation

### Step 1: Basic Contract Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TFHE.sol";
import "./FHELib.sol";

contract DigitalCourt is Ownable {
    // We'll build this step by step
}
```

### Step 2: Defining Data Structures

```solidity
struct JurorVote {
    euint8 encryptedVote;        // 0 = innocent, 1 = guilty (FHE encrypted)
    bool hasVoted;               // Public: whether they voted
    uint256 timestamp;           // Public: when they voted
    bytes32 commitment;          // Public: prevents double voting
}

struct LegalCase {
    string title;                        // Public: case title
    string description;                  // Public: case details
    address judge;                       // Public: who created the case
    uint256 endTime;                     // Public: voting deadline

    // The magic: encrypted vote counters
    euint32 encryptedGuiltyVotes;        // Secret: guilty vote count
    euint32 encryptedInnocentVotes;      // Secret: innocent vote count

    bool active;                         // Public: is voting open?
    bool revealed;                       // Public: are results revealed?
    bool verdict;                        // Public: final decision (after reveal)

    mapping(address => JurorVote) jurorVotes;
    address[] jurors;
}
```

**Key Insight:** Mix public and private data strategically!
- Public: Metadata everyone should see
- Private: Sensitive data that affects computation

### Step 3: Creating Cases

```solidity
function createCase(
    string calldata title,
    string calldata description,
    string calldata evidenceHash,
    uint256 requiredJurors
) external returns (uint256) {
    uint256 caseId = caseCount++;
    LegalCase storage newCase = cases[caseId];

    // Set public information
    newCase.title = title;
    newCase.description = description;
    newCase.judge = msg.sender;
    newCase.active = true;

    // Initialize encrypted counters to 0
    newCase.encryptedGuiltyVotes = FHE.asEuint32(0);
    newCase.encryptedInnocentVotes = FHE.asEuint32(0);

    // IMPORTANT: Allow contract to access encrypted data
    FHE.allow(newCase.encryptedGuiltyVotes, address(this));
    FHE.allow(newCase.encryptedInnocentVotes, address(this));

    return caseId;
}
```

**FHE Key Concept:** `FHE.allow()` grants permission to read encrypted data

### Step 4: The Heart of Privacy - Encrypted Voting

```solidity
function castPrivateVote(
    uint256 caseId,
    uint8 vote,              // 0=innocent, 1=guilty (will be encrypted)
    bytes32 commitment       // Prevents replay attacks
) external {
    require(vote <= 1, "Invalid vote");
    require(!cases[caseId].jurorVotes[msg.sender].hasVoted, "Already voted");

    LegalCase storage legalCase = cases[caseId];

    // Step 1: Encrypt the vote
    euint8 encryptedVote = FHE.asEuint8(vote);
    FHE.allow(encryptedVote, address(this));

    // Step 2: Store encrypted vote
    legalCase.jurorVotes[msg.sender] = JurorVote({
        encryptedVote: encryptedVote,
        hasVoted: true,
        timestamp: block.timestamp,
        commitment: commitment
    });

    // Step 3: Update encrypted counters
    euint32 vote32 = FHE.asEuint32(encryptedVote);

    // Add to guilty votes if vote=1, otherwise add 0
    legalCase.encryptedGuiltyVotes = FHE.add(legalCase.encryptedGuiltyVotes, vote32);

    // Add to innocent votes if vote=0, otherwise add 0
    // innocent = 1 - vote (if vote=0 then 1-0=1, if vote=1 then 1-1=0)
    euint32 one = FHE.asEuint32(1);
    euint32 innocentVote = FHE.sub(one, vote32);
    legalCase.encryptedInnocentVotes = FHE.add(legalCase.encryptedInnocentVotes, innocentVote);

    // Only emit that a vote was cast, not what the vote was!
    emit VoteCast(caseId, msg.sender, block.timestamp);
}
```

**🔍 What's Happening Here:**
1. **Encryption**: `FHE.asEuint8(vote)` encrypts the vote
2. **Homomorphic Addition**: `FHE.add()` adds to encrypted counters without decryption
3. **Privacy**: Individual votes stay encrypted throughout the process

### Step 5: Revealing Results

```solidity
function revealResults(uint256 caseId) external onlyJudge(caseId) {
    LegalCase storage legalCase = cases[caseId];
    require(!legalCase.revealed, "Already revealed");

    // The only place we decrypt: final results
    uint32 guiltyVotes = FHE.decrypt(legalCase.encryptedGuiltyVotes);
    uint32 innocentVotes = FHE.decrypt(legalCase.encryptedInnocentVotes);

    // Determine verdict
    legalCase.verdict = guiltyVotes > innocentVotes;
    legalCase.revealed = true;

    emit CaseRevealed(caseId, legalCase.verdict, guiltyVotes, innocentVotes, legalCase.jurors.length);
}
```

**Key Point:** Decryption only happens when results need to be public!

## 🌐 Frontend Integration

### Step 1: Setting Up FHE Instance

```javascript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Mock FHE for development/demo
const mockFhevmInstance = {
  encrypt8: (value) => value,
  initialized: true
};

export default function Home() {
  const [fhevmInstance, setFhevmInstance] = useState(null);

  useEffect(() => {
    // In production, you'd initialize real FHEVM here
    setFhevmInstance(mockFhevmInstance);
  }, []);

  // ... rest of component
}
```

### Step 2: Connecting to Contract

```javascript
const CONTRACT_ADDRESS = "0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51";
const CONTRACT_ABI = [
  // Your contract ABI here
];

const connectWallet = async () => {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      setAccount(address);
      setContract(contractInstance);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }
};
```

### Step 3: Creating a Case

```javascript
const [caseTitle, setCaseTitle] = useState('');
const [caseDescription, setCaseDescription] = useState('');

const createCase = async () => {
  if (!contract) return;

  try {
    const tx = await contract.createCase(
      caseTitle,
      caseDescription,
      "evidence-hash-ipfs", // In real app, upload evidence to IPFS
      5 // Required jurors
    );

    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    console.log('Case created successfully!');

  } catch (error) {
    console.error('Error creating case:', error);
  }
};
```

### Step 4: Casting Encrypted Votes

```javascript
const [selectedVote, setSelectedVote] = useState(null); // 0 or 1

const castVote = async (caseId) => {
  if (!contract || selectedVote === null) return;

  try {
    // Generate commitment (prevents double voting)
    const commitment = ethers.keccak256(
      ethers.toUtf8Bytes(`${account}-${caseId}-${Date.now()}`)
    );

    const tx = await contract.castPrivateVote(
      caseId,
      selectedVote, // This gets encrypted in the contract
      commitment
    );

    console.log('Vote transaction sent:', tx.hash);
    await tx.wait();
    console.log('Vote cast successfully!');

  } catch (error) {
    console.error('Error casting vote:', error);
  }
};
```

**UI Component Example:**
```javascript
const VotingInterface = ({ caseId }) => (
  <div>
    <h3>Cast Your Vote</h3>
    <button
      onClick={() => setSelectedVote(0)}
      className={selectedVote === 0 ? 'selected' : ''}
    >
      🟢 Innocent
    </button>
    <button
      onClick={() => setSelectedVote(1)}
      className={selectedVote === 1 ? 'selected' : ''}
    >
      🔴 Guilty
    </button>

    <button
      onClick={() => castVote(caseId)}
      disabled={selectedVote === null}
    >
      Cast Encrypted Vote 🔐
    </button>
  </div>
);
```

## 🚀 Deployment Guide

### Step 1: Local Development

```bash
# Terminal 1: Start local blockchain (if using Hardhat)
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: Start frontend
npm run dev
```

### Step 2: Testnet Deployment

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Update CONTRACT_ADDRESS in frontend
# Deploy frontend to Vercel
vercel deploy
```

### Step 3: Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_NETWORK_NAME=sepolia
PRIVATE_KEY=your_private_key_for_deployment
```

## 🧪 Testing Your dApp

### Test Scenario: Complete Voting Process

1. **Setup Phase:**
   ```javascript
   // Connect wallet
   await connectWallet();

   // Certify yourself as juror (owner only)
   await contract.certifyJuror(yourAddress);
   ```

2. **Create a Test Case:**
   ```javascript
   const tx = await contract.createCase(
     "Test Case: Theft of Digital Assets",
     "A case to test our FHE voting system",
     "evidence-hash",
     3 // Need 3 jurors
   );
   ```

3. **Authorize Jurors:**
   ```javascript
   await contract.authorizeJuror(0, juror1Address);
   await contract.authorizeJuror(0, juror2Address);
   await contract.authorizeJuror(0, juror3Address);
   ```

4. **Cast Encrypted Votes:**
   ```javascript
   // Each juror votes privately
   await contract.castPrivateVote(0, 1, commitment1); // Guilty
   await contract.castPrivateVote(0, 0, commitment2); // Innocent
   await contract.castPrivateVote(0, 1, commitment3); // Guilty
   ```

5. **Reveal Results:**
   ```javascript
   await contract.revealResults(0);
   // Result: Guilty (2-1), but individual votes remain private!
   ```

## 🔒 Privacy Analysis

**What Stays Private:**
- ✅ Individual vote choices (0 or 1)
- ✅ Vote tallies during voting period
- ✅ Intermediate computation states

**What Becomes Public:**
- ✅ Final vote counts (after reveal)
- ✅ Final verdict (guilty/innocent)
- ✅ Metadata (case details, timing, participants)

**Security Properties:**
- **Vote Privacy**: Individual choices never revealed
- **Verifiability**: Anyone can verify the final tally is correct
- **Integrity**: Votes cannot be changed once cast
- **Availability**: Results available to everyone after reveal

## 🎯 Learning Exercises

### Exercise 1: Add More Vote Options
Extend the system to support 3 options: Guilty, Innocent, Abstain

```solidity
// Hint: Use euint8 with values 0, 1, 2
// Update vote counting logic accordingly
```

### Exercise 2: Weighted Voting
Give jurors different vote weights based on reputation

```solidity
struct JurorVote {
    euint8 encryptedVote;
    euint8 encryptedWeight; // New: encrypted weight
    // ... other fields
}
```

### Exercise 3: Anonymous Jury Selection
Implement encrypted jury selection where even jury membership is private

## 🚨 Common Pitfalls and Solutions

### Problem 1: "FHE.allow() not called"
```solidity
// ❌ Wrong
euint8 vote = FHE.asEuint8(1);
// Use vote immediately -> Error!

// ✅ Correct
euint8 vote = FHE.asEuint8(1);
FHE.allow(vote, address(this));
// Now you can use vote
```

### Problem 2: "Mixing encrypted and plain data"
```solidity
// ❌ Wrong
euint8 encrypted = FHE.asEuint8(1);
uint8 plain = 1;
uint8 result = encrypted + plain; // Type error!

// ✅ Correct
euint8 encrypted = FHE.asEuint8(1);
euint8 plainAsEncrypted = FHE.asEuint8(1);
euint8 result = FHE.add(encrypted, plainAsEncrypted);
```

### Problem 3: "Premature decryption"
```solidity
// ❌ Wrong - decrypting too early
uint8 vote1 = FHE.decrypt(encryptedVote1);
uint8 vote2 = FHE.decrypt(encryptedVote2);
uint8 sum = vote1 + vote2;

// ✅ Correct - compute on encrypted data
euint8 encryptedSum = FHE.add(encryptedVote1, encryptedVote2);
uint8 sum = FHE.decrypt(encryptedSum); // Only decrypt final result
```

## 🌟 Best Practices

### 1. Minimize Decryption
```solidity
// Only decrypt when absolutely necessary
// Prefer computing on encrypted data
```

### 2. Use Access Control
```solidity
// Control who can decrypt results
modifier onlyAuthorized() {
    require(hasPermission[msg.sender], "Not authorized");
    _;
}
```

### 3. Gas Optimization
```solidity
// FHE operations are expensive
// Batch operations when possible
// Use appropriate data types (euint8 vs euint32)
```

### 4. Error Handling
```javascript
// Frontend: Handle FHE initialization gracefully
try {
  const result = await contract.someFunction();
} catch (error) {
  if (error.code === 'FHE_NOT_READY') {
    // Show loading state
  }
}
```

## 🎉 Congratulations!

You've built your first confidential dApp with FHEVM! You now understand:

- ✅ How to use encrypted data types in smart contracts
- ✅ Privacy-preserving computation patterns
- ✅ Frontend integration with FHE contracts
- ✅ When to encrypt, compute, and decrypt data

### Next Steps:
1. **Deploy to mainnet** when FHEVM goes live
2. **Explore advanced patterns** like encrypted state machines
3. **Join the community** and build the privacy-first future

### Resources:
- **FHEVM Documentation**: [Link to official docs]
- **Community Discord**: [Link to Discord]
- **GitHub Repository**: [Link to this tutorial's code]

---

**🔐 You're now ready to build privacy-preserving dApps that protect user data while maintaining blockchain transparency!**

*Happy building! 🚀*