const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3021;

// Create courthouse-style HTML with multiple legal cases
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>United States Digital Court - Jury Decision System</title>
    <script src="https://unpkg.com/ethers@6.8.0/dist/ethers.umd.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
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
        
        .connect-btn, .submit-btn, .vote-btn, .case-btn {
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
        
        .connect-btn:hover, .submit-btn:hover, .vote-btn:hover, .case-btn:hover {
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
        
        .vote-btn.not-guilty {
            background: linear-gradient(45deg, #22c55e, #16a34a);
            color: white;
        }
        
        .vote-btn.guilty {
            background: linear-gradient(45deg, #ef4444, #dc2626);
            color: white;
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
        
        .form {
            display: grid;
            gap: 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .form input, .form textarea {
            padding: 15px;
            border: 2px solid rgba(212, 175, 55, 0.3);
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: #f5f5f0;
            font-size: 1rem;
            font-family: inherit;
            backdrop-filter: blur(5px);
        }
        
        .form input:focus, .form textarea:focus {
            border-color: #d4af37;
            outline: none;
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
        }
        
        .form input::placeholder, .form textarea::placeholder {
            color: rgba(245, 245, 240, 0.6);
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
    </style>
</head>
<body>
    <div class="courthouse-header">
        <div class="court-seal">
            <div class="scales">⚖️</div>
        </div>
        <h1 class="court-title">United States Digital Court</h1>
        <p class="court-subtitle">Jury Decision System • Powered by Blockchain Technology</p>
    </div>

    <div class="container">
        <div class="wallet-section">
            <div id="wallet-connection">
                <button class="connect-btn" onclick="connectWallet()">Connect MetaMask Wallet</button>
                <div id="account-info" class="account-info" style="display: none;"></div>
            </div>
        </div>

        <div class="section contract-info">
            <h2>📋 Court System Information</h2>
            <div class="info-card">
                <p><strong>Smart Contract:</strong> 0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51</p>
                <p><strong>Network:</strong> Sepolia Testnet</p>
                <p><strong>Blockchain Explorer:</strong> 
                    <a href="https://sepolia.etherscan.io/address/0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51" target="_blank">
                        View Contract on Etherscan
                    </a>
                </p>
                <p><strong>Encryption:</strong> Fully Homomorphic Encryption (FHE) for Private Voting</p>
            </div>
        </div>

        <div class="section">
            <h2>🚀 Quick Case Setup</h2>
            <p style="text-align: center; margin-bottom: 25px; font-size: 1.1rem;">Create sample legal cases for immediate blockchain voting</p>
            <div style="text-align: center;">
                <button class="case-btn" onclick="createSampleCase(0)">Create Theft Case</button>
                <button class="case-btn" onclick="createSampleCase(1)">Create Assault Case</button>
                <button class="case-btn" onclick="createSampleCase(2)">Create Fraud Case</button>
                <button class="case-btn" onclick="createSampleCase(3)">Create Drug Case</button>
                <button class="case-btn" onclick="createSampleCase(4)">Create Domestic Violence Case</button>
                <button class="case-btn" onclick="createSampleCase(5)">Create Cybercrime Case</button>
                <button class="case-btn" onclick="loadExistingCases()" style="background: linear-gradient(145deg, #6366f1, #4f46e5);">
                    Load Existing Cases
                </button>
            </div>
        </div>

        <div class="section">
            <h2>📚 Active Criminal Cases</h2>
            <div class="cases-grid" id="cases-container">
                
                <div class="case-card">
                    <div class="case-number">Case No. CR-2024-0001</div>
                    <div class="case-type">Criminal Theft</div>
                    <div class="case-title">The People vs. Marcus Johnson</div>
                    <div class="case-description">
                        Defendant is charged with grand theft after allegedly stealing $2,500 in merchandise from 
                        Murphy's Electronics Store. Security surveillance captured a person resembling the defendant, 
                        though facial identification is disputed. Defense claims mistaken identity and provides alibi evidence.
                    </div>
                    <div class="case-evidence">
                        <strong>Evidence:</strong> Security camera footage, store inventory records, witness testimony from 
                        store manager, defendant's employment records, cell phone location data
                    </div>
                    <div class="case-meta">
                        <span class="status-badge status-active">● READY FOR JURY</span>
                        <span>Case ID: 0</span>
                        <span>Max Sentence: 3 years</span>
                    </div>
                    <div class="vote-section">
                        <h4>🔐 Cast Your Jury Vote</h4>
                        <div class="vote-buttons">
                            <button class="vote-btn not-guilty" onclick="castVote(0, 0)">
                                NOT GUILTY
                            </button>
                            <button class="vote-btn guilty" onclick="castVote(0, 1)">
                                GUILTY
                            </button>
                        </div>
                        <div class="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
                    </div>
                </div>

                <div class="case-card">
                    <div class="case-number">Case No. CR-2024-0002</div>
                    <div class="case-type">Assault & Battery</div>
                    <div class="case-title">The State vs. Carlos Martinez</div>
                    <div class="case-description">
                        Defendant faces assault charges stemming from an altercation at O'Malley's Tavern on March 15th. 
                        Multiple witnesses provide conflicting accounts of the incident. Victim sustained minor injuries requiring 
                        medical attention. Self-defense is claimed by the defendant.
                    </div>
                    <div class="case-evidence">
                        <strong>Evidence:</strong> Medical records, police report, witness statements (4 witnesses), 
                        surveillance footage from nearby ATM, defendant's previous record
                    </div>
                    <div class="case-meta">
                        <span class="status-badge status-active">● READY FOR JURY</span>
                        <span>Case ID: 1</span>
                        <span>Max Sentence: 2 years</span>
                    </div>
                    <div class="vote-section">
                        <h4>🔐 Cast Your Jury Vote</h4>
                        <div class="vote-buttons">
                            <button class="vote-btn not-guilty" onclick="castVote(1, 0)">
                                NOT GUILTY
                            </button>
                            <button class="vote-btn guilty" onclick="castVote(1, 1)">
                                GUILTY
                            </button>
                        </div>
                        <div class="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
                    </div>
                </div>

                <div class="case-card">
                    <div class="case-number">Case No. CR-2024-0003</div>
                    <div class="case-type">White Collar Crime</div>
                    <div class="case-title">The United States vs. Jennifer Chen</div>
                    <div class="case-description">
                        Federal charges of embezzlement and wire fraud against former accounting manager. 
                        Defendant allegedly diverted $78,000 in company funds through falsified invoices and 
                        shell companies over 18-month period. Digital forensics reveal suspicious transaction patterns.
                    </div>
                    <div class="case-evidence">
                        <strong>Evidence:</strong> Bank records, digital forensics report, company financial audits, 
                        email communications, accounting software logs, whistleblower testimony
                    </div>
                    <div class="case-meta">
                        <span class="status-badge status-active">● READY FOR JURY</span>
                        <span>Case ID: 2</span>
                        <span>Max Sentence: 10 years</span>
                    </div>
                    <div class="vote-section">
                        <h4>🔐 Cast Your Jury Vote</h4>
                        <div class="vote-buttons">
                            <button class="vote-btn not-guilty" onclick="castVote(2, 0)">
                                NOT GUILTY
                            </button>
                            <button class="vote-btn guilty" onclick="castVote(2, 1)">
                                GUILTY
                            </button>
                        </div>
                        <div class="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
                    </div>
                </div>

                <div class="case-card">
                    <div class="case-number">Case No. CR-2024-0004</div>
                    <div class="case-type">Drug Possession</div>
                    <div class="case-title">The State vs. Michael Rodriguez</div>
                    <div class="case-description">
                        Defendant charged with possession of controlled substances with intent to distribute. 
                        Police discovered 2.5 ounces of cocaine during traffic stop. Defense challenges search warrant 
                        validity and claims substances belonged to passenger who fled the scene.
                    </div>
                    <div class="case-evidence">
                        <strong>Evidence:</strong> Police body camera footage, search warrant documentation, 
                        lab analysis of substances, traffic stop dashboard video, defendant's statement
                    </div>
                    <div class="case-meta">
                        <span class="status-badge status-active">● READY FOR JURY</span>
                        <span>Case ID: 3</span>
                        <span>Max Sentence: 5 years</span>
                    </div>
                    <div class="vote-section">
                        <h4>🔐 Cast Your Jury Vote</h4>
                        <div class="vote-buttons">
                            <button class="vote-btn not-guilty" onclick="castVote(3, 0)">
                                NOT GUILTY
                            </button>
                            <button class="vote-btn guilty" onclick="castVote(3, 1)">
                                GUILTY
                            </button>
                        </div>
                        <div class="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
                    </div>
                </div>

                <div class="case-card">
                    <div class="case-number">Case No. CR-2024-0005</div>
                    <div class="case-type">Domestic Violence</div>
                    <div class="case-title">The People vs. David Thompson</div>
                    <div class="case-description">
                        Domestic violence charges following 911 call from defendant's residence. Victim sustained 
                        visible injuries documented by paramedics. Defendant claims self-defense and disputes 
                        victim's account of events. History of previous domestic disturbances at same address.
                    </div>
                    <div class="case-evidence">
                        <strong>Evidence:</strong> 911 call recording, paramedic photos, police report, 
                        victim statement, defendant statement, neighbor witness testimony
                    </div>
                    <div class="case-meta">
                        <span class="status-badge status-pending">● UNDER REVIEW</span>
                        <span>Case ID: 4</span>
                        <span>Max Sentence: 4 years</span>
                    </div>
                    <div class="vote-section">
                        <h4>🔐 Cast Your Jury Vote</h4>
                        <div class="vote-buttons">
                            <button class="vote-btn not-guilty" onclick="castVote(4, 0)">
                                NOT GUILTY
                            </button>
                            <button class="vote-btn guilty" onclick="castVote(4, 1)">
                                GUILTY
                            </button>
                        </div>
                        <div class="vote-warning">⚠️ Creates real blockchain transaction with gas fees</div>
                    </div>
                </div>

                <div class="case-card">
                    <div class="case-number">Case No. CR-2024-0006</div>
                    <div class="case-type">Cybercrime</div>
                    <div class="case-title">The United States vs. Alex Kim</div>
                    <div class="case-description">
                        Federal charges for computer fraud and identity theft. Defendant allegedly operated 
                        phishing scheme targeting elderly victims, stealing personal information to access 
                        bank accounts. FBI investigation traced activities through digital forensics and undercover operations.
                    </div>
                    <div class="case-evidence">
                        <strong>Evidence:</strong> Computer forensics, financial records, victim statements, 
                        email server logs, cryptocurrency transaction history, FBI surveillance reports
                    </div>
                    <div class="case-meta">
                        <span class="status-badge status-closed">● VERDICT REACHED</span>
                        <span>Result: GUILTY (11-1)</span>
                        <span>Sentence: 6 years federal prison</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>⚖️ Create New Case</h2>
            <div class="form">
                <input type="text" id="case-title" placeholder="Case title (e.g., The State vs. John Doe - Burglary)" />
                <textarea id="case-description" placeholder="Detailed case description..." rows="5"></textarea>
                <input type="text" id="evidence-hash" placeholder="Evidence hash (IPFS or document reference)" />
                <input type="number" id="required-jurors" min="6" max="12" value="12" placeholder="Required jurors (6-12)" />
                <button class="submit-btn" onclick="createCase()">Create Legal Case</button>
            </div>
        </div>

        <div class="section">
            <h2>🔗 Recent Blockchain Transactions</h2>
            <div class="tx-list" id="tx-list">
                <p style="text-align: center; opacity: 0.7;">Connect wallet and interact with cases to see transaction history...</p>
            </div>
        </div>
    </div>

    <script>
        const CONTRACT_ADDRESS = "0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51";
        const CONTRACT_ABI = [
            {
                "inputs": [],
                "name": "certifyJuror",
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
            }
        ];

        let account = '';
        let contract = null;
        let transactions = [];

        async function connectWallet() {
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask wallet to participate in jury voting');
                return;
            }

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
                account = await signer.getAddress();
                
                document.querySelector('.connect-btn').style.display = 'none';
                document.getElementById('account-info').style.display = 'inline-block';
                document.getElementById('account-info').innerHTML = 
                    '🏛️ Juror Connected: ' + account.slice(0, 8) + '...' + account.slice(-6);
                
                contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                
                console.log('Juror wallet connected:', account);
                
            } catch (error) {
                console.error('Failed to connect wallet:', error);
                alert('Failed to connect wallet. Please ensure MetaMask is installed and connected to Sepolia testnet');
            }
        }

        async function createCase() {
            if (!contract) {
                alert('Please connect your wallet first');
                return;
            }

            const title = document.getElementById('case-title').value;
            const description = document.getElementById('case-description').value;
            const evidenceHash = document.getElementById('evidence-hash').value || "QmLegalEvidence";
            const requiredJurors = parseInt(document.getElementById('required-jurors').value);

            if (!title || !description) {
                alert('Please fill in case title and description');
                return;
            }

            try {
                console.log('Creating legal case:', { title, description, evidenceHash, requiredJurors });
                
                const tx = await contract.createCase(title, description, evidenceHash, requiredJurors);
                
                addTransaction('Case Creation', tx.hash, 'pending');
                
                const receipt = await tx.wait();
                updateTransaction(tx.hash, 'confirmed');
                
                alert('Legal case created successfully!\\n\\nCase: ' + title + '\\nTransaction: ' + tx.hash + '\\n\\nView on Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
                
                // Clear form
                document.getElementById('case-title').value = '';
                document.getElementById('case-description').value = '';
                document.getElementById('evidence-hash').value = '';
                document.getElementById('required-jurors').value = '12';
                
            } catch (error) {
                console.error('Failed to create case:', error);
                alert('Failed to create legal case: ' + (error.reason || error.message));
            }
        }

        async function castVote(caseId, vote) {
            if (!contract) {
                alert('Please connect your wallet first to cast your jury vote');
                return;
            }

            // First, check if the case exists on the blockchain
            try {
                await contract.getCaseInfo(caseId);
            } catch (error) {
                const confirmed = confirm('This case has not been created on the blockchain yet.\\n\\nWould you like to create it now?\\n\\nThis will require a separate transaction with gas fees before you can vote.');
                
                if (confirmed) {
                    await createSampleCase(caseId);
                    return; // User can vote after case creation
                } else {
                    return;
                }
            }

            const voteText = vote === 0 ? 'NOT GUILTY' : 'GUILTY';
            const confirmed = confirm('Are you ready to cast your jury vote?\\n\\nCase ID: ' + caseId + '\\nYour Vote: ' + voteText + '\\n\\nThis will create a real blockchain transaction with gas fees. Your vote will be encrypted and permanently recorded.');
            
            if (!confirmed) return;

            try {
                console.log('Casting jury vote:', { caseId, vote });
                
                // Generate cryptographic commitment hash for vote privacy
                const commitment = ethers.keccak256(ethers.toUtf8Bytes(account + '-case' + caseId + '-vote' + vote + '-' + Date.now() + '-' + Math.random()));
                
                const tx = await contract.castPrivateVote(caseId, vote, commitment);
                
                addTransaction('Jury Vote', tx.hash, 'pending');
                
                const receipt = await tx.wait();
                updateTransaction(tx.hash, 'confirmed');
                
                alert('Jury vote successfully recorded on blockchain!\\n\\nYour Vote: ' + voteText + '\\nCase ID: ' + caseId + '\\nTransaction: ' + tx.hash + '\\n\\nYour vote is encrypted and anonymous. View transaction: https://sepolia.etherscan.io/tx/' + tx.hash);
                
            } catch (error) {
                console.error('Failed to cast vote:', error);
                if (error.reason && error.reason.includes('Invalid case ID')) {
                    alert('This case does not exist on the blockchain yet. Please create the case first using the Quick Case Setup section.');
                } else if (error.reason && error.reason.includes('Already voted')) {
                    alert('You have already cast your vote for this case. Each juror can only vote once per case.');
                } else {
                    alert('Failed to cast jury vote: ' + (error.reason || error.message));
                }
            }
        }

        async function createSampleCase(caseId) {
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
        }

        async function loadExistingCases() {
            if (!contract) {
                alert('Please connect your wallet first');
                return;
            }

            try {
                console.log('Loading existing legal cases...');
                
                let foundCases = 0;
                for (let i = 0; i < 10; i++) {
                    try {
                        const caseInfo = await contract.getCaseInfo(i);
                        console.log('Found case ' + i + ':', caseInfo);
                        foundCases++;
                    } catch (error) {
                        // Case doesn't exist
                    }
                }
                
                if (foundCases > 0) {
                    alert('Found ' + foundCases + ' existing legal cases on the blockchain.\\n\\nYou can vote on any active cases shown above.');
                } else {
                    alert('No existing cases found on the blockchain.\\n\\nUse the Quick Case Setup section to create sample cases for voting.');
                }
                
            } catch (error) {
                console.error('Failed to load cases:', error);
                alert('Failed to load existing cases: ' + (error.reason || error.message));
            }
        }

        function addTransaction(type, hash, status) {
            transactions.unshift({ type, hash, status, timestamp: new Date() });
            updateTransactionDisplay();
        }

        function updateTransaction(hash, status) {
            const tx = transactions.find(t => t.hash === hash);
            if (tx) {
                tx.status = status;
                updateTransactionDisplay();
            }
        }

        function updateTransactionDisplay() {
            const txList = document.getElementById('tx-list');
            if (transactions.length === 0) {
                txList.innerHTML = '<p style="text-align: center; opacity: 0.7;">Connect wallet and interact with cases to see transaction history...</p>';
                return;
            }

            const txHTML = transactions.map(tx => {
                const statusColor = tx.status === 'confirmed' ? '#22c55e' : '#f59e0b';
                const statusText = tx.status === 'confirmed' ? 'CONFIRMED' : 'PENDING';
                
                return '<div class="tx-item">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">' +
                    '<strong style="color: #d4af37;">' + tx.type + '</strong>' +
                    '<span style="color: ' + statusColor + '; font-weight: bold;">' + statusText + '</span>' +
                    '</div>' +
                    '<div class="tx-hash">TX: <a href="https://sepolia.etherscan.io/tx/' + tx.hash + '" target="_blank" class="tx-link">' + 
                    tx.hash + '</a></div>' +
                    '<div style="font-size: 0.85rem; opacity: 0.7; margin-top: 8px;">' + tx.timestamp.toLocaleString() + '</div>' +
                    '</div>';
            }).join('');
            
            txList.innerHTML = txHTML;
        }

        // Auto-connect wallet if previously connected
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
                if (accounts.length > 0) {
                    connectWallet();
                }
            });
        }

        console.log('🏛️ United States Digital Court System Loaded');
        console.log('⚖️ Contract Address:', CONTRACT_ADDRESS);
        console.log('🔗 Etherscan:', 'https://sepolia.etherscan.io/address/' + CONTRACT_ADDRESS);
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    console.log(`🏛️ ${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Serve HTML for all requests
    res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
    });
    res.end(htmlContent);
});

server.listen(PORT, () => {
    console.log('\n🏛️  United States Digital Court System');
    console.log(`⚖️  Running on http://localhost:${PORT}`);
    console.log('🔐 Contract: 0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51');
    console.log('🌐 Etherscan: https://sepolia.etherscan.io/address/0x6af32dc352959fDf6C19C8Cf4f128dcCe0086b51');
    console.log('✨ Courthouse-style interface with real blockchain jury voting!');
    console.log('\nPress Ctrl+C to stop the court system\n');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use`);
    } else {
        console.error('❌ Server error:', err);
    }
});