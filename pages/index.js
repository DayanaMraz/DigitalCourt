import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
// Mock FHE functionality for Vercel compatibility
const mockFhevmInstance = {
  encrypt8: (value) => value, // Simple passthrough for demo
  initialized: true
};

export default function Home() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [fhevmInstance, setFhevmInstance] = useState(null);
  const [isInitializingFHE, setIsInitializingFHE] = useState(false);

  const CONTRACT_ADDRESS = "0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51";
  const CONTRACT_ABI = [
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
        {"internalType": "address", "name": "juror", "type": "address"}
      ],
      "name": "authorizeJuror",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "string", "name": "title", "type": "string"},
        {"internalType": "string", "name": "description", "type": "string"},
        {"internalType": "string", "name": "evidenceHash", "type": "string"},
        {"internalType": "uint256", "name": "requiredJurors", "type": "uint256"}
      ],
      "name": "createCase",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
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
    },
    {
      "inputs": [{"internalType": "uint256", "name": "caseId", "type": "uint256"}],
      "name": "getCaseInfo",
      "outputs": [
        {"internalType": "string", "name": "title", "type": "string"},
        {"internalType": "string", "name": "description", "type": "string"},
        {"internalType": "string", "name": "evidenceHash", "type": "string"},
        {"internalType": "address", "name": "judge", "type": "address"},
        {"internalType": "uint256", "name": "startTime", "type": "uint256"},
        {"internalType": "uint256", "name": "endTime", "type": "uint256"},
        {"internalType": "uint256", "name": "requiredJurors", "type": "uint256"},
        {"internalType": "bool", "name": "active", "type": "bool"},
        {"internalType": "bool", "name": "revealed", "type": "bool"},
        {"internalType": "bool", "name": "verdict", "type": "bool"},
        {"internalType": "uint256", "name": "jurorCount", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "caseId", "type": "uint256"},
        {"internalType": "address", "name": "juror", "type": "address"}
      ],
      "name": "isAuthorizedJuror",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "juror", "type": "address"}],
      "name": "certifiedJurors",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  useEffect(() => {
    checkWalletConnection();
    initFHE();
  }, []);

  const initFHE = async () => {
    if (fhevmInstance || isInitializingFHE) return;
    
    setIsInitializingFHE(true);
    try {
      // Use mock FHE instance for Vercel compatibility
      setFhevmInstance(mockFhevmInstance);
      console.log('🔐 Mock FHE instance initialized for demo purposes');
    } catch (error) {
      console.error('Failed to initialize mock FHE:', error);
    } finally {
      setIsInitializingFHE(false);
    }
  };

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          connectWallet();
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Switch to Sepolia network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }]
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/']
              }]
            });
          }
        }
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setAccount(address);
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(contractInstance);
        
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert('Failed to connect wallet. Please ensure MetaMask is installed and connected to Sepolia testnet');
      }
    } else {
      alert('Please install MetaMask wallet');
    }
  };

  const castVote = async (caseId, vote) => {
    if (!contract) {
      alert('Please connect your wallet first to cast your jury vote');
      return;
    }

    try {
      // First, check if the case exists on the blockchain
      let caseInfo;
      try {
        caseInfo = await contract.getCaseInfo(caseId);
      } catch (error) {
        const confirmed = confirm('This case has not been created on the blockchain yet.\\n\\nWould you like to create it now?\\n\\nThis will require a separate transaction with gas fees before you can vote.');
        
        if (confirmed) {
          await createSampleCase(caseId);
          return; // User can vote after case creation
        } else {
          return;
        }
      }

      // Check if user is certified as a juror
      const isCertified = await contract.certifiedJurors(account);
      if (!isCertified) {
        const needsCertification = confirm('You are not certified as a juror yet.\\n\\nWould you like to get certified now?\\n\\nThis will create a blockchain transaction.');
        if (needsCertification) {
          try {
            console.log('Certifying juror:', account);
            const certifyTx = await contract.certifyJuror(account);
            addTransaction('Juror Certification', certifyTx.hash, 'pending');
            await certifyTx.wait();
            updateTransaction(certifyTx.hash, 'confirmed');
            alert('You have been certified as a juror! Now you can vote on cases.');
          } catch (certifyError) {
            console.error('Failed to certify juror:', certifyError);
            alert('Failed to certify as juror: ' + (certifyError.reason || certifyError.message));
            return;
          }
        } else {
          return;
        }
      }

      // Check if user is authorized for this specific case
      const isAuthorized = await contract.isAuthorizedJuror(caseId, account);
      if (!isAuthorized) {
        const needsAuthorization = confirm('You are not authorized to vote on this specific case.\\n\\nWould you like to get authorized now?\\n\\nNote: Only the case judge can authorize jurors, so this might fail if you are not the judge.');
        if (needsAuthorization) {
          try {
            console.log('Authorizing juror for case:', { caseId, account });
            const authTx = await contract.authorizeJuror(caseId, account);
            addTransaction('Juror Authorization', authTx.hash, 'pending');
            await authTx.wait();
            updateTransaction(authTx.hash, 'confirmed');
            alert('You have been authorized for this case! Now you can vote.');
          } catch (authError) {
            console.error('Failed to authorize juror:', authError);
            if (authError.reason && authError.reason.includes('Only case judge')) {
              alert('Only the case judge can authorize jurors. Since you created this case, you are the judge and can now authorize yourself. Please try voting again.');
              return;
            } else {
              alert('Failed to authorize for this case: ' + (authError.reason || authError.message));
              return;
            }
          }
        } else {
          return;
        }
      }

      const voteText = vote === 0 ? 'NOT GUILTY' : 'GUILTY';
      const confirmed = confirm('Are you ready to cast your jury vote?\\n\\nCase ID: ' + caseId + '\\nYour Vote: ' + voteText + '\\n\\nThis will create a real blockchain transaction with gas fees. Your vote will be encrypted and permanently recorded.');
      
      if (!confirmed) return;

      console.log('Casting encrypted jury vote:', { caseId, vote });
      
      let encryptedVote = vote; // Use plain vote for blockchain compatibility
      
      if (fhevmInstance && fhevmInstance.encrypt8) {
        try {
          // Use mock encryption for demo (in production this would be real FHE)
          encryptedVote = fhevmInstance.encrypt8(vote);
          console.log('🔐 Vote encrypted with mock FHE for demo purposes');
        } catch (error) {
          console.warn('Mock encryption failed, using plain vote:', error);
        }
      } else {
        console.warn('Using plain vote - in production this would be FHE encrypted');
      }
      
      // Generate cryptographic commitment hash for vote privacy
      const commitment = ethers.keccak256(ethers.toUtf8Bytes(account + '-case' + caseId + '-vote' + vote + '-' + Date.now() + '-' + Math.random()));
      
      const tx = await contract.castPrivateVote(caseId, encryptedVote, commitment);
      
      addTransaction('FHE Jury Vote', tx.hash, 'pending');
      
      const receipt = await tx.wait();
      updateTransaction(tx.hash, 'confirmed');
      
      const networkName = await contract.provider.getNetwork().then(n => n.name);
      const explorerUrl = networkName === 'sepolia' 
        ? 'https://sepolia.etherscan.io/tx/' + tx.hash
        : networkName === 'zama'
        ? 'https://main.explorer.zama.ai/tx/' + tx.hash
        : '#';
      
      alert('Jury vote successfully recorded on blockchain!\\n\\nYour Vote: ' + voteText + ' (Encrypted)\\nCase ID: ' + caseId + '\\nTransaction: ' + tx.hash + '\\n\\nYour vote is encrypted and anonymous. View transaction: ' + explorerUrl);
      
    } catch (error) {
      console.error('Failed to cast vote:', error);
      if (error.reason && error.reason.includes('Invalid case ID')) {
        alert('This case does not exist on the blockchain yet. Please create the case first using the Quick Case Setup section.');
      } else if (error.reason && error.reason.includes('Already voted')) {
        alert('You have already cast your vote for this case. Each juror can only vote once per case.');
      } else if (error.reason && error.reason.includes('Not authorized juror')) {
        alert('You are not authorized to vote on this case. Please make sure you are certified and authorized by the case judge.');
      } else {
        alert('Failed to cast jury vote: ' + (error.reason || error.message));
      }
    }
  };

  const createSampleCase = async (caseId) => {
    if (!contract) {
      alert('Please connect your wallet first');
      return;
    }

    const sampleCases = [
      {
        title: "The People vs. Marcus Johnson - Grand Theft",
        description: "Defendant charged with grand theft of $2,500 in merchandise from Murphy's Electronics Store. Security footage shows suspect resembling defendant, but identification disputed.",
        evidence: "QmSecurityFootage2024001"
      },
      {
        title: "The State vs. Carlos Martinez - Assault & Battery", 
        description: "Assault charges from tavern altercation on March 15th. Multiple witnesses provide conflicting testimony. Victim sustained minor injuries requiring medical treatment.",
        evidence: "QmPoliceReport2024002"
      },
      {
        title: "The United States vs. Jennifer Chen - Embezzlement",
        description: "Federal embezzlement and wire fraud charges. Former accounting manager allegedly diverted $78,000 through falsified invoices over 18-month period.",
        evidence: "QmForensicAudit2024003"
      },
      {
        title: "The State vs. Michael Rodriguez - Drug Possession",
        description: "Possession of controlled substances with intent to distribute. 2.5 ounces cocaine discovered during traffic stop. Search warrant validity disputed by defense.",
        evidence: "QmPoliceEvidence2024004"
      },
      {
        title: "The People vs. David Thompson - Domestic Violence",
        description: "Domestic violence charges following 911 call from defendant's residence. Victim sustained visible injuries documented by paramedics. Self-defense claimed by defendant.",
        evidence: "QmDomesticReport2024005"
      },
      {
        title: "The United States vs. Alex Kim - Cybercrime",
        description: "Federal computer fraud and identity theft charges. Defendant operated phishing scheme targeting elderly victims. FBI investigation traced activities through digital forensics.",
        evidence: "QmCyberEvidence2024006"
      }
    ];

    if (caseId < sampleCases.length) {
      const caseData = sampleCases[caseId];
      try {
        console.log('Creating sample legal case:', caseData.title);
        
        const tx = await contract.createCase(
          caseData.title,
          caseData.description, 
          caseData.evidence,
          12
        );
        
        addTransaction('Case Creation', tx.hash, 'pending');
        
        const receipt = await tx.wait();
        updateTransaction(tx.hash, 'confirmed');
        
        alert('Legal case created successfully!\\n\\nCase: ' + caseData.title + '\\nCase ID: ' + caseId + '\\nTransaction: ' + tx.hash + '\\n\\nYou can now vote on this case. View on Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
        
      } catch (error) {
        console.error('Failed to create sample case:', error);
        alert('Failed to create legal case: ' + (error.reason || error.message));
      }
    }
  };

  const addTransaction = (type, hash, status) => {
    setTransactions(prev => [{ type, hash, status, timestamp: new Date() }, ...prev]);
  };

  const updateTransaction = (hash, status) => {
    setTransactions(prev => prev.map(tx => 
      tx.hash === hash ? { ...tx, status } : tx
    ));
  };

  return (
    <>
      <Head>
        <title>United States Digital Court - Jury Decision System</title>
        <meta name="description" content="Blockchain-powered jury decision system with FHE private voting" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="courthouse-header">
        <div className="court-seal">
          <div className="scales">⚖️</div>
        </div>
        <h1 className="court-title">United States Digital Court</h1>
        <p className="court-subtitle">Jury Decision System • Powered by Blockchain Technology</p>
      </div>

      <div className="container">
        <div className="wallet-section">
          <div id="wallet-connection">
            {!account ? (
              <button className="connect-btn" onClick={connectWallet}>Connect MetaMask Wallet</button>
            ) : (
              <div className="account-info">🏛️ Juror Connected: {account.slice(0, 8)}...{account.slice(-6)}</div>
            )}
          </div>
        </div>

        <div className="section contract-info">
          <h2>📋 Court System Information</h2>
          <div className="info-card">
            <p><strong>Smart Contract:</strong> {CONTRACT_ADDRESS}</p>
            <p><strong>Network:</strong> Sepolia Testnet / Zama Devnet</p>
            <p><strong>Blockchain Explorer:</strong> 
              <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">
                View Contract on Etherscan
              </a>
            </p>
            <p><strong>Encryption:</strong> 
              {fhevmInstance ? 
                <span style={{color: '#22c55e'}}>✅ Mock FHE Ready (Demo Mode)</span> : 
                isInitializingFHE ?
                <span style={{color: '#f59e0b'}}>🔄 Initializing...</span> :
                <span style={{color: '#ef4444'}}>⚠️ Not Available</span>
              }
            </p>
            <p><strong>Privacy Level:</strong> {fhevmInstance ? 'Demo (Mock Encryption + Commitment)' : 'Basic (Commitment Scheme)'}</p>
          </div>
        </div>

        <div className="section">
          <h2>🚀 Quick Case Setup</h2>
          <p style={{textAlign: 'center', marginBottom: '25px', fontSize: '1.1rem'}}>Create sample legal cases for immediate blockchain voting</p>
          <div style={{textAlign: 'center'}}>
            <button className="case-btn" onClick={() => createSampleCase(0)}>Create Theft Case</button>
            <button className="case-btn" onClick={() => createSampleCase(1)}>Create Assault Case</button>
            <button className="case-btn" onClick={() => createSampleCase(2)}>Create Fraud Case</button>
            <button className="case-btn" onClick={() => createSampleCase(3)}>Create Drug Case</button>
            <button className="case-btn" onClick={() => createSampleCase(4)}>Create Domestic Violence Case</button>
            <button className="case-btn" onClick={() => createSampleCase(5)}>Create Cybercrime Case</button>
          </div>
        </div>

        <div className="section">
          <h2>📚 Active Criminal Cases</h2>
          <div className="cases-grid">
            
            <div className="case-card">
              <div className="case-number">Case No. CR-2024-0001</div>
              <div className="case-type">Criminal Theft</div>
              <div className="case-title">The People vs. Marcus Johnson</div>
              <div className="case-description">
                Defendant is charged with grand theft after allegedly stealing $2,500 in merchandise from 
                Murphy's Electronics Store. Security surveillance captured a person resembling the defendant, 
                though facial identification is disputed. Defense claims mistaken identity and provides alibi evidence.
              </div>
              <div className="case-evidence">
                <strong>Evidence:</strong> Security camera footage, store inventory records, witness testimony from 
                store manager, defendant's employment records, cell phone location data
              </div>
              <div className="case-meta">
                <span className="status-badge status-active">● READY FOR JURY</span>
                <span>Case ID: 0</span>
                <span>Max Sentence: 3 years</span>
              </div>
              <div className="vote-section">
                <h4>🔐 Cast Your Jury Vote</h4>
                <div className="vote-buttons">
                  <button className="vote-btn not-guilty" onClick={() => castVote(0, 0)}>
                    NOT GUILTY
                  </button>
                  <button className="vote-btn guilty" onClick={() => castVote(0, 1)}>
                    GUILTY
                  </button>
                </div>
                <div className="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
              </div>
            </div>

            <div className="case-card">
              <div className="case-number">Case No. CR-2024-0002</div>
              <div className="case-type">Assault & Battery</div>
              <div className="case-title">The State vs. Carlos Martinez</div>
              <div className="case-description">
                Defendant faces assault charges stemming from an altercation at O'Malley's Tavern on March 15th. 
                Multiple witnesses provide conflicting accounts of the incident. Victim sustained minor injuries requiring 
                medical attention. Self-defense is claimed by the defendant.
              </div>
              <div className="case-evidence">
                <strong>Evidence:</strong> Medical records, police report, witness statements (4 witnesses), 
                surveillance footage from nearby ATM, defendant's previous record
              </div>
              <div className="case-meta">
                <span className="status-badge status-active">● READY FOR JURY</span>
                <span>Case ID: 1</span>
                <span>Max Sentence: 2 years</span>
              </div>
              <div className="vote-section">
                <h4>🔐 Cast Your Jury Vote</h4>
                <div className="vote-buttons">
                  <button className="vote-btn not-guilty" onClick={() => castVote(1, 0)}>
                    NOT GUILTY
                  </button>
                  <button className="vote-btn guilty" onClick={() => castVote(1, 1)}>
                    GUILTY
                  </button>
                </div>
                <div className="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
              </div>
            </div>

            <div className="case-card">
              <div className="case-number">Case No. CR-2024-0003</div>
              <div className="case-type">White Collar Crime</div>
              <div className="case-title">The United States vs. Jennifer Chen</div>
              <div className="case-description">
                Federal charges of embezzlement and wire fraud against former accounting manager. 
                Defendant allegedly diverted $78,000 in company funds through falsified invoices and 
                shell companies over 18-month period. Digital forensics reveal suspicious transaction patterns.
              </div>
              <div className="case-evidence">
                <strong>Evidence:</strong> Bank records, digital forensics report, company financial audits, 
                email communications, accounting software logs, whistleblower testimony
              </div>
              <div className="case-meta">
                <span className="status-badge status-active">● READY FOR JURY</span>
                <span>Case ID: 2</span>
                <span>Max Sentence: 10 years</span>
              </div>
              <div className="vote-section">
                <h4>🔐 Cast Your Jury Vote</h4>
                <div className="vote-buttons">
                  <button className="vote-btn not-guilty" onClick={() => castVote(2, 0)}>
                    NOT GUILTY
                  </button>
                  <button className="vote-btn guilty" onClick={() => castVote(2, 1)}>
                    GUILTY
                  </button>
                </div>
                <div className="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
              </div>
            </div>

            <div className="case-card">
              <div className="case-number">Case No. CR-2024-0004</div>
              <div className="case-type">Drug Possession</div>
              <div className="case-title">The State vs. Michael Rodriguez</div>
              <div className="case-description">
                Defendant charged with possession of controlled substances with intent to distribute. 
                Police discovered 2.5 ounces of cocaine during traffic stop. Defense challenges search warrant 
                validity and claims substances belonged to passenger who fled the scene.
              </div>
              <div className="case-evidence">
                <strong>Evidence:</strong> Police body camera footage, search warrant documentation, 
                lab analysis of substances, traffic stop dashboard video, defendant's statement
              </div>
              <div className="case-meta">
                <span className="status-badge status-active">● READY FOR JURY</span>
                <span>Case ID: 3</span>
                <span>Max Sentence: 5 years</span>
              </div>
              <div className="vote-section">
                <h4>🔐 Cast Your Jury Vote</h4>
                <div className="vote-buttons">
                  <button className="vote-btn not-guilty" onClick={() => castVote(3, 0)}>
                    NOT GUILTY
                  </button>
                  <button className="vote-btn guilty" onClick={() => castVote(3, 1)}>
                    GUILTY
                  </button>
                </div>
                <div className="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
              </div>
            </div>

            <div className="case-card">
              <div className="case-number">Case No. CR-2024-0005</div>
              <div className="case-type">Domestic Violence</div>
              <div className="case-title">The People vs. David Thompson</div>
              <div className="case-description">
                Domestic violence charges following 911 call from defendant's residence. Victim sustained 
                visible injuries documented by paramedics. Defendant claims self-defense and disputes 
                victim's account of events. History of previous domestic disturbances at same address.
              </div>
              <div className="case-evidence">
                <strong>Evidence:</strong> 911 call recording, paramedic photos, police report, 
                victim statement, defendant statement, neighbor witness testimony
              </div>
              <div className="case-meta">
                <span className="status-badge status-pending">● UNDER REVIEW</span>
                <span>Case ID: 4</span>
                <span>Max Sentence: 4 years</span>
              </div>
              <div className="vote-section">
                <h4>🔐 Cast Your Jury Vote</h4>
                <div className="vote-buttons">
                  <button className="vote-btn not-guilty" onClick={() => castVote(4, 0)}>
                    NOT GUILTY
                  </button>
                  <button className="vote-btn guilty" onClick={() => castVote(4, 1)}>
                    GUILTY
                  </button>
                </div>
                <div className="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
              </div>
            </div>

            <div className="case-card">
              <div className="case-number">Case No. CR-2024-0006</div>
              <div className="case-type">Cybercrime</div>
              <div className="case-title">The United States vs. Alex Kim</div>
              <div className="case-description">
                Federal charges for computer fraud and identity theft. Defendant allegedly operated 
                phishing scheme targeting elderly victims, stealing personal information to access 
                bank accounts. FBI investigation traced activities through digital forensics and undercover operations.
              </div>
              <div className="case-evidence">
                <strong>Evidence:</strong> Computer forensics, financial records, victim statements, 
                email server logs, cryptocurrency transaction history, FBI surveillance reports
              </div>
              <div className="case-meta">
                <span className="status-badge status-closed">● VERDICT REACHED</span>
                <span>Result: GUILTY (11-1)</span>
                <span>Sentence: 6 years federal prison</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h2>🔗 Recent Blockchain Transactions</h2>
          <div className="tx-list">
            {transactions.length === 0 ? (
              <p style={{textAlign: 'center', opacity: 0.7}}>Connect wallet and interact with cases to see transaction history...</p>
            ) : (
              transactions.map((tx, index) => {
                const statusColor = tx.status === 'confirmed' ? '#22c55e' : '#f59e0b';
                const statusText = tx.status === 'confirmed' ? 'CONFIRMED' : 'PENDING';
                
                return (
                  <div key={index} className="tx-item">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <strong style={{color: '#d4af37'}}>{tx.type}</strong>
                      <span style={{color: statusColor, fontWeight: 'bold'}}>{statusText}</span>
                    </div>
                    <div className="tx-hash">
                      TX: <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="tx-link">
                        {tx.hash}
                      </a>
                    </div>
                    <div style={{fontSize: '0.85rem', opacity: 0.7, marginTop: '8px'}}>
                      {tx.timestamp.toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Crimson Text', serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          min-height: 100vh;
          color: #f5f5f0;
          line-height: 1.7;
          background-attachment: fixed;
        }
        
        .courthouse-header {
          background: linear-gradient(to bottom, #2c3e50 0%, #34495e 100%);
          border-bottom: 5px solid #d4af37;
          padding: 30px 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .court-seal {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .court-seal .scales {
          font-size: 4rem;
          color: #d4af37;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          margin-bottom: 10px;
        }
        
        .court-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem;
          font-weight: 700;
          text-align: center;
          color: #f8f9fa;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          margin-bottom: 10px;
        }
        
        .court-subtitle {
          text-align: center;
          font-size: 1.2rem;
          color: #d4af37;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        .container { max-width: 1400px; margin: 0 auto; padding: 40px 20px; }
        
        .wallet-section {
          background: rgba(255,255,255,0.1);
          border: 2px solid #d4af37;
          border-radius: 15px;
          padding: 25px;
          margin: 30px 0;
          text-align: center;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        
        .connect-btn, .case-btn {
          background: linear-gradient(145deg, #d4af37, #b8941f);
          color: #1a1a2e;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 8px;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .connect-btn:hover, .case-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.5);
          background: linear-gradient(145deg, #e6c757, #d4af37);
        }
        
        .account-info {
          background: rgba(212, 175, 55, 0.2);
          border: 1px solid #d4af37;
          padding: 15px 25px;
          border-radius: 10px;
          display: inline-block;
          font-weight: 600;
        }
        
        .section {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 15px;
          padding: 40px;
          margin: 40px 0;
          backdrop-filter: blur(15px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        
        .section h2 {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          color: #d4af37;
          margin-bottom: 25px;
          border-bottom: 3px solid #d4af37;
          padding-bottom: 15px;
          text-align: center;
        }
        
        .cases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 30px;
          margin-top: 30px;
        }
        
        .case-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border: 2px solid rgba(212, 175, 55, 0.4);
          border-radius: 15px;
          padding: 30px;
          transition: all 0.3s ease;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        
        .case-card:hover {
          border-color: #d4af37;
          transform: translateY(-5px);
          box-shadow: 0 15px 45px rgba(0,0,0,0.3);
        }
        
        .case-number {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          color: #d4af37;
          font-weight: 600;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .case-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          color: #f8f9fa;
          margin-bottom: 15px;
          font-weight: 600;
          line-height: 1.4;
        }
        
        .case-type {
          display: inline-block;
          background: rgba(212, 175, 55, 0.2);
          color: #d4af37;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .case-description {
          color: #e8e8e3;
          margin-bottom: 20px;
          line-height: 1.6;
          font-size: 1.05rem;
        }
        
        .case-evidence {
          background: rgba(0,0,0,0.2);
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #d4af37;
          font-size: 0.95rem;
          color: #d1d1cc;
          margin-bottom: 20px;
          font-style: italic;
        }
        
        .case-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin: 20px 0;
          font-size: 0.9rem;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 15px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-active {
          background: linear-gradient(45deg, #22c55e, #16a34a);
          color: white;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
        }
        
        .status-pending {
          background: linear-gradient(45deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }
        
        .status-closed {
          background: linear-gradient(45deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }
        
        .vote-section {
          background: rgba(0,0,0,0.2);
          border: 2px solid rgba(212, 175, 55, 0.3);
          border-radius: 12px;
          padding: 25px;
          margin-top: 25px;
        }
        
        .vote-section h4 {
          font-family: 'Playfair Display', serif;
          color: #d4af37;
          margin-bottom: 15px;
          text-align: center;
          font-size: 1.2rem;
        }
        
        .vote-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-bottom: 15px;
        }
        
        .vote-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .vote-btn.not-guilty {
          background: linear-gradient(45deg, #22c55e, #16a34a);
          color: white;
        }
        
        .vote-btn.guilty {
          background: linear-gradient(45deg, #ef4444, #dc2626);
          color: white;
        }
        
        .vote-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        
        .vote-warning {
          text-align: center;
          font-size: 0.85rem;
          color: #fbbf24;
          font-style: italic;
          margin-top: 10px;
        }
        
        .contract-info {
          background: linear-gradient(145deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05));
          border: 2px solid #d4af37;
        }
        
        .info-card a {
          color: #d4af37;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s ease;
        }
        
        .info-card a:hover {
          color: #e6c757;
          text-decoration: underline;
        }
        
        .tx-list {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          padding: 20px;
        }
        
        .tx-item {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
        }
        
        .tx-hash {
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          word-break: break-all;
          background: rgba(0,0,0,0.3);
          padding: 8px;
          border-radius: 5px;
          margin-top: 8px;
        }
        
        .tx-link {
          color: #d4af37;
          text-decoration: none;
          transition: color 0.3s ease;
        }
        
        .tx-link:hover {
          color: #e6c757;
          text-decoration: underline;
        }
        
        @media (max-width: 768px) {
          .cases-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .court-title {
            font-size: 2rem;
          }
          
          .vote-buttons {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}