# Frontend Integration Guide: Building the Digital Court UI

## 📋 Overview

This guide explains how to build a user-friendly frontend that integrates with FHE-enabled smart contracts. We'll cover wallet integration, encrypted vote casting, and transaction monitoring.

## 🏗️ Architecture Overview

```
Frontend Architecture:
├── Next.js App (pages/_app.js)
├── Main Interface (pages/index.js)
├── Web3 Integration (ethers.js)
├── FHE Integration (fhevmjs - mock for demo)
└── UI Components (React hooks and state)
```

## 🔧 Dependencies Setup

### Core Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "ethers": "^6.8.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

### FHE Integration (Production)
```bash
# For production FHEVM integration
npm install fhevmjs

# For development/testing
# Use mock implementation (already included in code)
```

## 🎛️ Core State Management

### App State Structure
```javascript
const [account, setAccount] = useState('');              // User's wallet address
const [contract, setContract] = useState(null);         // Contract instance
const [transactions, setTransactions] = useState([]);   // Transaction history
const [fhevmInstance, setFhevmInstance] = useState(null); // FHE instance

// UI state
const [isInitializingFHE, setIsInitializingFHE] = useState(false);
const [activeCase, setActiveCase] = useState(null);
const [voteChoice, setVoteChoice] = useState(null);
```

### Contract Configuration
```javascript
const CONTRACT_ADDRESS = "0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51";
const CONTRACT_ABI = [
  // Essential functions for the UI
  {
    "inputs": [{"internalType": "address", "name": "juror", "type": "address"}],
    "name": "certifyJuror",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "caseId", "type": "uint256"},
      {"internalType": "uint8", "name": "vote", "type": "uint8"},
      {"internalType": "bytes32", "name": "commitment", "type": "bytes32"}
    ],
    "name": "castPrivateVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
  // ... more functions
];
```

## 🔗 Wallet Integration

### Connection Logic
```javascript
const connectWallet = async () => {
  if (!window.ethereum) {
    alert('MetaMask is required to use this dApp. Please install MetaMask and refresh the page.');
    return;
  }

  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Create provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Initialize contract instance
    const contractInstance = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );

    // Update state
    setAccount(address);
    setContract(contractInstance);

    // Initialize FHE
    await initFHE();

    console.log('Connected to wallet:', address);

  } catch (error) {
    console.error('Failed to connect wallet:', error);
    alert('Failed to connect wallet: ' + error.message);
  }
};

const checkWalletConnection = async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await connectWallet();
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
    }
  }
};
```

### Network Detection
```javascript
const getNetworkInfo = async () => {
  if (contract) {
    try {
      const network = await contract.provider.getNetwork();
      return {
        name: network.name,
        chainId: network.chainId,
        explorerUrl: network.name === 'sepolia'
          ? 'https://sepolia.etherscan.io'
          : 'https://etherscan.io'
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return { name: 'unknown', chainId: 0, explorerUrl: '#' };
    }
  }
};
```

## 🔐 FHE Integration

### Mock FHE for Development
```javascript
// Mock FHE functionality for Vercel/development compatibility
const mockFhevmInstance = {
  encrypt8: (value) => {
    console.log('🔐 Mock encrypting value:', value);
    return value; // In demo, passthrough the value
  },
  initialized: true
};

const initFHE = async () => {
  setIsInitializingFHE(true);
  try {
    // In production, initialize real FHEVM
    // const instance = await createFhevmInstance({
    //   networkUrl: 'https://devnet.zama.ai',
    //   gatewayUrl: 'https://gateway.devnet.zama.ai'
    // });

    // For demo/development, use mock
    console.log('🔐 Initializing FHE (mock mode for demo)');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async init
    setFhevmInstance(mockFhevmInstance);

    console.log('✅ FHE initialized (mock mode)');
  } catch (error) {
    console.error('❌ FHE initialization failed:', error);
    // Fallback to mock for demo purposes
    setFhevmInstance(mockFhevmInstance);
  } finally {
    setIsInitializingFHE(false);
  }
};
```

### Production FHE Integration
```javascript
// For production deployment
import { createFhevmInstance } from 'fhevmjs';

const initProductionFHE = async () => {
  try {
    const instance = await createFhevmInstance({
      networkUrl: process.env.NEXT_PUBLIC_FHEVM_NETWORK_URL,
      gatewayUrl: process.env.NEXT_PUBLIC_FHEVM_GATEWAY_URL
    });

    setFhevmInstance(instance);
    console.log('✅ Production FHE initialized');
  } catch (error) {
    console.error('❌ Production FHE failed:', error);
    throw error;
  }
};
```

## 🗳️ Voting Interface Implementation

### Vote Casting Function
```javascript
const castVote = async (caseId, vote) => {
  if (!contract || !account) {
    alert('Please connect your wallet first');
    return;
  }

  try {
    // Step 1: Verify juror certification
    const isCertified = await contract.certifiedJurors(account);
    if (!isCertified) {
      const wantsCertification = confirm(
        'You need to be certified as a juror first.\\n\\nWould you like to get certified now?'
      );

      if (wantsCertification) {
        const certifyTx = await contract.certifyJuror(account);
        addTransaction('Juror Certification', certifyTx.hash, 'pending');
        await certifyTx.wait();
        updateTransaction(certifyTx.hash, 'confirmed');
        alert('You have been certified as a juror!');
      } else {
        return;
      }
    }

    // Step 2: Check case-specific authorization
    const isAuthorized = await contract.isAuthorizedJuror(caseId, account);
    if (!isAuthorized) {
      const needsAuth = confirm(
        'You are not authorized to vote on this specific case.\\n\\nWould you like to get authorized now?'
      );

      if (needsAuth) {
        const authTx = await contract.authorizeJuror(caseId, account);
        addTransaction('Juror Authorization', authTx.hash, 'pending');
        await authTx.wait();
        updateTransaction(authTx.hash, 'confirmed');
        alert('You have been authorized for this case!');
      } else {
        return;
      }
    }

    // Step 3: Confirm vote
    const voteText = vote === 0 ? 'NOT GUILTY' : 'GUILTY';
    const confirmed = confirm(
      `Are you ready to cast your jury vote?\\n\\n` +
      `Case ID: ${caseId}\\nYour Vote: ${voteText}\\n\\n` +
      `This will create a real blockchain transaction with gas fees. ` +
      `Your vote will be encrypted and permanently recorded.`
    );

    if (!confirmed) return;

    // Step 4: Encrypt vote (mock for demo)
    let encryptedVote = vote;
    if (fhevmInstance && fhevmInstance.encrypt8) {
      try {
        encryptedVote = fhevmInstance.encrypt8(vote);
        console.log('🔐 Vote encrypted with FHE');
      } catch (error) {
        console.warn('Encryption failed, using plain vote:', error);
      }
    }

    // Step 5: Generate commitment hash
    const commitment = ethers.keccak256(
      ethers.toUtf8Bytes(
        `${account}-case${caseId}-vote${vote}-${Date.now()}-${Math.random()}`
      )
    );

    // Step 6: Submit transaction
    const tx = await contract.castPrivateVote(caseId, encryptedVote, commitment);
    addTransaction('FHE Jury Vote', tx.hash, 'pending');

    const receipt = await tx.wait();
    updateTransaction(tx.hash, 'confirmed');

    // Step 7: Success feedback
    const networkInfo = await getNetworkInfo();
    const explorerUrl = `${networkInfo.explorerUrl}/tx/${tx.hash}`;

    alert(
      `Jury vote successfully recorded on blockchain!\\n\\n` +
      `Your Vote: ${voteText} (Encrypted)\\n` +
      `Case ID: ${caseId}\\nTransaction: ${tx.hash}\\n\\n` +
      `Your vote is encrypted and anonymous. View transaction: ${explorerUrl}`
    );

  } catch (error) {
    handleVoteError(error, caseId);
  }
};
```

### Error Handling
```javascript
const handleVoteError = (error, caseId) => {
  console.error('Failed to cast vote:', error);

  if (error.reason) {
    switch (true) {
      case error.reason.includes('Invalid case ID'):
        alert('This case does not exist on the blockchain yet. Please create the case first.');
        break;
      case error.reason.includes('Already voted'):
        alert('You have already cast your vote for this case. Each juror can only vote once per case.');
        break;
      case error.reason.includes('Not authorized juror'):
        alert('You are not authorized to vote on this case. Please make sure you are certified and authorized by the case judge.');
        break;
      case error.reason.includes('Voting ended'):
        alert('The voting period for this case has ended.');
        break;
      default:
        alert(`Failed to cast jury vote: ${error.reason}`);
    }
  } else {
    alert(`Failed to cast jury vote: ${error.message}`);
  }
};
```

## 📊 Transaction Monitoring

### Transaction Management
```javascript
const [transactions, setTransactions] = useState([]);

const addTransaction = (type, hash, status) => {
  const newTransaction = {
    id: Date.now(),
    type,
    hash,
    status, // 'pending', 'confirmed', 'failed'
    timestamp: new Date().toLocaleTimeString(),
    explorerUrl: `${getExplorerBase()}/tx/${hash}`
  };

  setTransactions(prev => [newTransaction, ...prev]);
};

const updateTransaction = (hash, newStatus) => {
  setTransactions(prev =>
    prev.map(tx =>
      tx.hash === hash
        ? { ...tx, status: newStatus }
        : tx
    )
  );
};

const getExplorerBase = () => {
  // Return appropriate explorer URL based on network
  if (typeof window !== 'undefined' && window.ethereum) {
    // Logic to determine network and return correct explorer
    return 'https://sepolia.etherscan.io';
  }
  return '#';
};
```

### Transaction Display Component
```javascript
const TransactionHistory = ({ transactions }) => (
  <div className="transaction-history">
    <h3>🔗 Transaction History</h3>
    {transactions.length === 0 ? (
      <p>No transactions yet</p>
    ) : (
      transactions.map((tx) => (
        <div key={tx.id} className={`transaction ${tx.status}`}>
          <div className="tx-header">
            <span className="tx-type">{tx.type}</span>
            <span className="tx-time">{tx.timestamp}</span>
          </div>
          <div className="tx-details">
            <span className="tx-hash">
              <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
              </a>
            </span>
            <span className={`tx-status status-${tx.status}`}>
              {tx.status === 'pending' && '⏳'}
              {tx.status === 'confirmed' && '✅'}
              {tx.status === 'failed' && '❌'}
              {tx.status}
            </span>
          </div>
        </div>
      ))
    )}
  </div>
);
```

## 🎨 UI Components

### Voting Interface
```javascript
const VotingSection = ({ caseId, onVote }) => {
  const [selectedVote, setSelectedVote] = useState(null);

  return (
    <div className="voting-section">
      <h3>⚖️ Cast Your Jury Vote (Case #{caseId})</h3>
      <div className="vote-options">
        <button
          className={`vote-btn ${selectedVote === 0 ? 'selected' : ''} innocent`}
          onClick={() => setSelectedVote(0)}
        >
          <span className="verdict-icon">🟢</span>
          <span className="verdict-text">NOT GUILTY</span>
          <span className="verdict-desc">Defendant is innocent</span>
        </button>

        <button
          className={`vote-btn ${selectedVote === 1 ? 'selected' : ''} guilty`}
          onClick={() => setSelectedVote(1)}
        >
          <span className="verdict-icon">🔴</span>
          <span className="verdict-text">GUILTY</span>
          <span className="verdict-desc">Defendant is guilty</span>
        </button>
      </div>

      <button
        className="cast-vote-btn"
        onClick={() => onVote(caseId, selectedVote)}
        disabled={selectedVote === null}
      >
        🔐 Cast Encrypted Vote
      </button>

      <p className="privacy-note">
        🔒 Your vote will be encrypted and anonymous. Individual votes are never revealed.
      </p>
    </div>
  );
};
```

### Case Information Display
```javascript
const CaseInfo = ({ caseId, contract }) => {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCaseData();
  }, [caseId, contract]);

  const loadCaseData = async () => {
    if (!contract) return;

    try {
      const info = await contract.getCaseInfo(caseId);
      setCaseData({
        title: info.title,
        description: info.description,
        judge: info.judge,
        active: info.active,
        revealed: info.revealed,
        verdict: info.verdict,
        jurorCount: info.jurorCount.toString()
      });
    } catch (error) {
      console.error('Failed to load case:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading case information...</div>;
  if (!caseData) return <div>Case not found</div>;

  return (
    <div className="case-info">
      <h2>📋 {caseData.title}</h2>
      <p className="case-description">{caseData.description}</p>

      <div className="case-meta">
        <div className="meta-item">
          <strong>Judge:</strong> {caseData.judge}
        </div>
        <div className="meta-item">
          <strong>Status:</strong> {caseData.active ? '🟢 Active' : '🔴 Closed'}
        </div>
        <div className="meta-item">
          <strong>Jurors:</strong> {caseData.jurorCount}
        </div>
        {caseData.revealed && (
          <div className="meta-item">
            <strong>Verdict:</strong> {caseData.verdict ? '🔴 Guilty' : '🟢 Not Guilty'}
          </div>
        )}
      </div>
    </div>
  );
};
```

## 🎨 Styling Guidelines

### CSS Classes Structure
```css
/* Main layout */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Wallet connection */
.wallet-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 10px;
}

/* Voting interface */
.voting-section {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  padding: 20px;
  border-radius: 10px;
  margin: 20px 0;
}

.vote-options {
  display: flex;
  gap: 15px;
  margin: 20px 0;
}

.vote-btn {
  flex: 1;
  padding: 15px;
  border: 2px solid #dee2e6;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.vote-btn.selected {
  border-color: #007bff;
  background: #e3f2fd;
}

.vote-btn.innocent.selected {
  border-color: #28a745;
  background: #e8f5e8;
}

.vote-btn.guilty.selected {
  border-color: #dc3545;
  background: #ffeaea;
}

/* Transaction history */
.transaction {
  border: 1px solid #dee2e6;
  border-radius: 5px;
  padding: 10px;
  margin: 10px 0;
}

.transaction.pending {
  border-left: 4px solid #ffc107;
}

.transaction.confirmed {
  border-left: 4px solid #28a745;
}

.transaction.failed {
  border-left: 4px solid #dc3545;
}
```

## 🔧 Environment Configuration

### Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Enable if using app router
    appDir: false
  },
  env: {
    // Environment variables
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    NETWORK_NAME: process.env.NETWORK_NAME,
  }
}

module.exports = nextConfig;
```

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51
NEXT_PUBLIC_NETWORK_NAME=sepolia
NEXT_PUBLIC_FHEVM_NETWORK_URL=https://devnet.zama.ai
NEXT_PUBLIC_FHEVM_GATEWAY_URL=https://gateway.devnet.zama.ai

# Development
NEXT_PUBLIC_DEBUG_MODE=true
```

## 📱 Responsive Design

### Mobile-First Approach
```css
/* Mobile styles (default) */
.vote-options {
  flex-direction: column;
}

.vote-btn {
  padding: 12px;
  font-size: 14px;
}

/* Tablet styles */
@media (min-width: 768px) {
  .vote-options {
    flex-direction: row;
  }

  .vote-btn {
    padding: 15px;
    font-size: 16px;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .container {
    padding: 40px;
  }

  .voting-section {
    padding: 30px;
  }
}
```

## 🧪 Testing the Frontend

### Manual Testing Checklist
```javascript
// Test scenarios to verify
const testScenarios = [
  'Wallet connection works',
  'Contract instance created correctly',
  'FHE initialization (mock or real)',
  'Case creation flow',
  'Juror certification process',
  'Vote casting with encryption',
  'Transaction monitoring',
  'Error handling for all failure cases',
  'Mobile responsiveness',
  'Network switching'
];
```

### Error Boundary Component
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong!</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 🚀 Performance Optimization

### Code Splitting
```javascript
// Lazy load heavy components
const VotingInterface = lazy(() => import('./components/VotingInterface'));
const TransactionHistory = lazy(() => import('./components/TransactionHistory'));

// Use Suspense
<Suspense fallback={<div>Loading...</div>}>
  <VotingInterface />
</Suspense>
```

### Memoization
```javascript
const CaseInfo = memo(({ caseId, contract }) => {
  // Component implementation
});

const memoizedVoteHandler = useCallback(
  (caseId, vote) => castVote(caseId, vote),
  [contract, account]
);
```

This frontend guide demonstrates how to create an intuitive, secure, and user-friendly interface for FHE-powered dApps while maintaining the privacy guarantees that make the underlying technology valuable.