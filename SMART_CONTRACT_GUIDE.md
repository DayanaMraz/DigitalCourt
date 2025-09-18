# Smart Contract Deep Dive: FHE-Powered Digital Court

## 📋 Overview

This guide provides an in-depth explanation of the DigitalCourt smart contract, focusing on how Fully Homomorphic Encryption (FHE) enables private voting while maintaining public verifiability.

## 🏗️ Contract Architecture

### Dependencies
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TFHE.sol";      // FHE type definitions
import "./FHELib.sol";    // FHE utility functions
```

**Security Features:**
- `Ownable`: Role-based access control
- `ReentrancyGuard`: Prevents reentrancy attacks
- `TFHE`: Provides encrypted data types (`euint8`, `euint32`, etc.)
- `FHELib`: Helper functions for FHE operations

## 🔐 Core Data Structures

### JurorVote Structure
```solidity
struct JurorVote {
    euint8 encryptedVote;        // 🔒 PRIVATE: 0=innocent, 1=guilty
    bool hasVoted;               // 🌐 PUBLIC: voting status
    uint256 timestamp;           // 🌐 PUBLIC: when vote was cast
    bytes32 commitment;          // 🌐 PUBLIC: prevents replay attacks
}
```

**Design Rationale:**
- **Encrypted Vote**: The actual vote choice remains private throughout the process
- **Public Metadata**: Timestamps and voting status enable transparency without revealing choices
- **Commitment Scheme**: Prevents double voting and manipulation

### LegalCase Structure
```solidity
struct LegalCase {
    // Public metadata
    string title;
    string description;
    string evidenceHash;
    address judge;
    uint256 startTime;
    uint256 endTime;
    uint256 requiredJurors;
    bool active;
    bool revealed;
    bool verdict;                    // Final result (after decryption)

    // Private encrypted counters
    euint32 encryptedGuiltyVotes;    // 🔒 Secret tally
    euint32 encryptedInnocentVotes;  // 🔒 Secret tally

    // Mappings for vote management
    mapping(address => JurorVote) jurorVotes;
    address[] jurors;
    mapping(address => bool) authorizedJurors;
}
```

**Privacy Model:**
- **During Voting**: Vote tallies are encrypted, no one knows the current count
- **After Reveal**: Only final results are decrypted, individual votes stay private

## 🔧 Core Functions

### 1. Case Creation
```solidity
function createCase(
    string calldata title,
    string calldata description,
    string calldata evidenceHash,
    uint256 requiredJurors
) external returns (uint256) {
    // Input validation
    require(bytes(title).length > 0, "Title cannot be empty");
    require(requiredJurors >= MIN_JURORS && requiredJurors <= MAX_JURORS, "Invalid juror count");

    uint256 caseId = caseCount++;
    LegalCase storage newCase = cases[caseId];

    // Set public information
    newCase.title = title;
    newCase.description = description;
    newCase.evidenceHash = evidenceHash;
    newCase.judge = msg.sender;
    newCase.startTime = block.timestamp;
    newCase.endTime = block.timestamp + VOTING_DURATION;
    newCase.requiredJurors = requiredJurors;
    newCase.active = true;

    // 🔑 Initialize encrypted counters to 0
    newCase.encryptedGuiltyVotes = FHE.asEuint32(0);
    newCase.encryptedInnocentVotes = FHE.asEuint32(0);

    // 🔑 Grant contract permission to access encrypted data
    FHE.allow(newCase.encryptedGuiltyVotes, address(this));
    FHE.allow(newCase.encryptedInnocentVotes, address(this));

    emit CaseCreated(caseId, title, msg.sender, newCase.startTime, newCase.endTime, requiredJurors);
    return caseId;
}
```

**Key FHE Concepts:**
1. **Initialization**: `FHE.asEuint32(0)` creates an encrypted zero
2. **Access Control**: `FHE.allow()` grants permission to read/manipulate encrypted data
3. **Public/Private Split**: Metadata is public, vote tallies are private

### 2. Private Voting (The Heart of the System)
```solidity
function castPrivateVote(
    uint256 caseId,
    uint8 vote,              // Plain input: 0 or 1
    bytes32 commitment       // Prevents replay attacks
) external validCase(caseId) votingActive(caseId) onlyAuthorizedJuror(caseId) nonReentrant {
    LegalCase storage legalCase = cases[caseId];
    require(!legalCase.jurorVotes[msg.sender].hasVoted, "Already voted");
    require(vote <= 1, "Invalid vote value");
    require(commitment != bytes32(0), "Invalid commitment");

    // 🔑 Step 1: Encrypt the vote
    euint8 encryptedVote = FHE.asEuint8(vote);
    FHE.allow(encryptedVote, address(this));

    // 🔑 Step 2: Store encrypted vote
    legalCase.jurorVotes[msg.sender] = JurorVote({
        encryptedVote: encryptedVote,
        hasVoted: true,
        timestamp: block.timestamp,
        commitment: commitment
    });

    legalCase.jurors.push(msg.sender);

    // 🔑 Step 3: Update encrypted counters using homomorphic operations
    euint32 vote32 = FHE.asEuint32(encryptedVote);

    // Add to guilty counter: if vote=1, adds 1; if vote=0, adds 0
    legalCase.encryptedGuiltyVotes = FHE.add(legalCase.encryptedGuiltyVotes, vote32);

    // Add to innocent counter: adds (1-vote)
    euint32 one = FHE.asEuint32(1);
    euint32 innocentVote = FHE.sub(one, vote32);
    legalCase.encryptedInnocentVotes = FHE.add(legalCase.encryptedInnocentVotes, innocentVote);

    emit VoteCast(caseId, msg.sender, block.timestamp);
}
```

**Homomorphic Computation Logic:**
```
For vote = 0 (Innocent):
- guiltyVotes += 0
- innocentVotes += (1-0) = 1

For vote = 1 (Guilty):
- guiltyVotes += 1
- innocentVotes += (1-1) = 0
```

**Security Features:**
- **Encryption**: Vote is encrypted immediately upon entry
- **Access Control**: Multiple modifiers ensure only authorized jurors can vote
- **Commitment**: Prevents double voting and front-running
- **Reentrancy Protection**: Guards against recursive calls

### 3. Result Revelation
```solidity
function revealResults(uint256 caseId) external validCase(caseId) onlyJudge(caseId) {
    LegalCase storage legalCase = cases[caseId];
    require(!legalCase.active, "Voting still active");
    require(!legalCase.revealed, "Results already revealed");
    require(legalCase.jurors.length >= MIN_JURORS, "Insufficient jurors");

    // 🔑 ONLY place where decryption happens
    uint32 guiltyVotes = FHE.decrypt(legalCase.encryptedGuiltyVotes);
    uint32 innocentVotes = FHE.decrypt(legalCase.encryptedInnocentVotes);

    // Determine verdict based on majority
    legalCase.verdict = guiltyVotes > innocentVotes;
    legalCase.revealed = true;

    // Reward participating jurors
    for (uint256 i = 0; i < legalCase.jurors.length; i++) {
        jurorReputation[legalCase.jurors[i]] += 5;
    }

    emit CaseRevealed(caseId, legalCase.verdict, guiltyVotes, innocentVotes, legalCase.jurors.length);
}
```

**Critical Design Decision:** Decryption only occurs when results need to be public. This preserves privacy throughout the voting process while enabling public verification of the final outcome.

## 🛡️ Security Analysis

### Access Control Matrix
| Function | Judge | Juror | Owner | Public |
|----------|-------|-------|-------|--------|
| createCase | ✅ | ✅ | ✅ | ✅ |
| authorizeJuror | ✅ | ❌ | ❌ | ❌ |
| castPrivateVote | ❌ | ✅* | ❌ | ❌ |
| revealResults | ✅ | ❌ | ❌ | ❌ |
| certifyJuror | ❌ | ❌ | ✅ | ❌ |

*Only authorized jurors for specific case

### Privacy Guarantees

**What Remains Private:**
1. Individual vote choices throughout the entire process
2. Interim vote tallies during voting period
3. Vote patterns and correlations

**What Becomes Public:**
1. Final aggregated results (after reveal)
2. Participation metadata (who voted, when)
3. Case information and outcomes

### Attack Resistance

**Prevented Attacks:**
1. **Vote Buying**: Can't prove how you voted
2. **Coercion**: Individual votes never revealed
3. **Result Manipulation**: Cryptographic integrity
4. **Double Voting**: Commitment scheme prevention
5. **Reentrancy**: OpenZeppelin guards

**Potential Attacks:**
1. **Timing Analysis**: When votes are cast is public
2. **Judge Corruption**: Judge controls result revelation
3. **Juror Selection Bias**: Judge authorizes jurors

## ⚡ Gas Optimization Strategies

### 1. Efficient Data Types
```solidity
// Use smallest necessary encrypted types
euint8 vote;     // Better than euint32 for single votes
euint32 counter; // Appropriate for vote tallies
```

### 2. Batch Operations
```solidity
// Authorize multiple jurors in single transaction
function authorizeJurors(uint256 caseId, address[] calldata jurors) external {
    // Batch processing reduces gas per juror
}
```

### 3. Access Pattern Optimization
```solidity
// Cache storage reads in memory
LegalCase storage legalCase = cases[caseId]; // Single SLOAD
// Use legalCase.field instead of cases[caseId].field
```

## 🧪 Testing Strategies

### Unit Tests
```solidity
contract DigitalCourtTest is Test {
    function testPrivateVoting() public {
        // Test that votes are encrypted
        // Test that tallies update correctly
        // Test that individual votes remain private
    }

    function testHomomorphicOperations() public {
        // Verify FHE.add() works correctly
        // Verify vote counting logic
    }

    function testAccessControl() public {
        // Test authorization requirements
        // Test role-based permissions
    }
}
```

### Integration Tests
```javascript
describe('End-to-End Voting Process', () => {
  it('should maintain privacy throughout voting', async () => {
    // Create case
    // Authorize jurors
    // Cast multiple votes
    // Verify individual votes are not visible
    // Reveal results
    // Verify final tallies are correct
  });
});
```

## 🔧 Deployment Considerations

### Network Configuration
```javascript
// hardhat.config.js
networks: {
  sepolia: {
    url: "https://sepolia.infura.io/v3/YOUR_KEY",
    accounts: [PRIVATE_KEY],
    gasPrice: "auto",
    gas: "auto"
  },
  fhevm: {
    url: "https://devnet.zama.ai",
    accounts: [PRIVATE_KEY]
  }
}
```

### Environment Setup
```bash
# Install FHE dependencies
npm install fhevmjs @zama/hardhat-fhevm

# Configure TypeScript for FHE types
npm install @types/fhevm
```

## 🚀 Advanced Extensions

### 1. Weighted Voting
```solidity
struct JurorVote {
    euint8 encryptedVote;
    euint8 encryptedWeight; // Based on reputation
    // ... other fields
}

// Update counting logic
euint32 weightedVote = FHE.mul(vote32, weight32);
legalCase.encryptedGuiltyVotes = FHE.add(legalCase.encryptedGuiltyVotes, weightedVote);
```

### 2. Anonymous Jury Selection
```solidity
// Encrypt jury membership
mapping(address => euint8) encryptedJurorStatus; // 0=not selected, 1=selected
```

### 3. Multi-Option Voting
```solidity
// Support more than binary choices
euint32[] encryptedOptions; // Array of encrypted counters
```

## 📊 Performance Metrics

### Gas Costs (Approximate)
- **Case Creation**: ~200,000 gas
- **Juror Authorization**: ~50,000 gas
- **Private Vote Cast**: ~300,000 gas (FHE operations are expensive)
- **Result Revelation**: ~150,000 gas

### Scalability Considerations
- **Max Jurors**: Limited by gas costs of FHE operations
- **Concurrent Cases**: No limit (each case is independent)
- **Vote Storage**: Encrypted votes are larger than plain votes

## 🎯 Best Practices Summary

1. **Minimize Decryption**: Only decrypt when absolutely necessary
2. **Use Appropriate Types**: Choose smallest suitable encrypted types
3. **Access Control**: Implement comprehensive permission systems
4. **Error Handling**: Provide clear error messages for FHE operations
5. **Gas Management**: Consider FHE operation costs in design
6. **Testing**: Thoroughly test encrypted computation logic

## 🔗 References

- **FHEVM Documentation**: Core FHE concepts and APIs
- **OpenZeppelin Contracts**: Security patterns and utilities
- **Solidity Style Guide**: Code formatting and conventions
- **Gas Optimization Guide**: EVM efficiency techniques

---

This smart contract demonstrates how FHE can enable privacy-preserving applications while maintaining the transparency and verifiability that makes blockchain valuable. The key insight is strategically choosing what to encrypt, when to compute, and when to decrypt.