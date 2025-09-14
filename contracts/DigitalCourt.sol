// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TFHE.sol";
import "./FHELib.sol";

contract DigitalCourt is Ownable, ReentrancyGuard {
    
    struct JurorVote {
        euint8 encryptedVote; // 0 = 无罪, 1 = 有罪 (FHE encrypted)
        bool hasVoted;
        uint256 timestamp;
        bytes32 commitment; // 承诺哈希用于防止重复投票
    }
    
    struct LegalCase {
        string title;
        string description;
        string evidenceHash; // IPFS哈希或其他证据存储
        address judge; // 法官地址
        uint256 startTime;
        uint256 endTime;
        uint256 requiredJurors; // 需要的陪审员数量
        euint32 encryptedGuiltyVotes; // FHE加密的有罪票数
        euint32 encryptedInnocentVotes; // FHE加密的无罪票数
        bool active;
        bool revealed;
        bool verdict; // 最终判决结果 (true=有罪, false=无罪)
        mapping(address => JurorVote) jurorVotes;
        address[] jurors; // 参与投票的陪审员列表
        mapping(address => bool) authorizedJurors; // 被授权的陪审员
    }
    
    mapping(uint256 => LegalCase) public cases;
    uint256 public caseCount;
    uint256 public constant VOTING_DURATION = 3 days;
    uint256 public constant MIN_JURORS = 3;
    uint256 public constant MAX_JURORS = 12;
    
    // 陪审员资格管理
    mapping(address => bool) public certifiedJurors;
    mapping(address => uint256) public jurorReputation; // 陪审员声誉分数
    
    event CaseCreated(
        uint256 indexed caseId,
        string title,
        address indexed judge,
        uint256 startTime,
        uint256 endTime,
        uint256 requiredJurors
    );
    
    event JurorAuthorized(
        uint256 indexed caseId,
        address indexed juror
    );
    
    event VoteCast(
        uint256 indexed caseId,
        address indexed juror,
        uint256 timestamp
    );
    
    event CaseRevealed(
        uint256 indexed caseId,
        bool verdict,
        uint256 guiltyVotes,
        uint256 innocentVotes,
        uint256 totalJurors
    );
    
    event JurorCertified(address indexed juror, address indexed certifier);
    
    modifier validCase(uint256 caseId) {
        require(caseId < caseCount, "Invalid case ID");
        _;
    }
    
    modifier votingActive(uint256 caseId) {
        require(cases[caseId].active, "Case not active");
        require(block.timestamp >= cases[caseId].startTime, "Voting not started");
        require(block.timestamp <= cases[caseId].endTime, "Voting ended");
        _;
    }
    
    modifier onlyAuthorizedJuror(uint256 caseId) {
        require(cases[caseId].authorizedJurors[msg.sender], "Not authorized juror for this case");
        require(certifiedJurors[msg.sender], "Not certified juror");
        _;
    }
    
    modifier onlyJudge(uint256 caseId) {
        require(msg.sender == cases[caseId].judge, "Only case judge can perform this action");
        _;
    }
    
    constructor() Ownable(msg.sender) {
    }
    
    // 认证陪审员
    function certifyJuror(address juror) external onlyOwner {
        certifiedJurors[juror] = true;
        jurorReputation[juror] = 100; // 初始声誉分数
        emit JurorCertified(juror, msg.sender);
    }
    
    // 批量认证陪审员
    function certifyJurors(address[] calldata jurors) external onlyOwner {
        for (uint256 i = 0; i < jurors.length; i++) {
            certifiedJurors[jurors[i]] = true;
            jurorReputation[jurors[i]] = 100;
            emit JurorCertified(jurors[i], msg.sender);
        }
    }
    
    // 创建法律案件
    function createCase(
        string calldata title,
        string calldata description,
        string calldata evidenceHash,
        uint256 requiredJurors
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(requiredJurors >= MIN_JURORS && requiredJurors <= MAX_JURORS, "Invalid juror count");
        
        uint256 caseId = caseCount++;
        LegalCase storage newCase = cases[caseId];
        
        newCase.title = title;
        newCase.description = description;
        newCase.evidenceHash = evidenceHash;
        newCase.judge = msg.sender;
        newCase.startTime = block.timestamp;
        newCase.endTime = block.timestamp + VOTING_DURATION;
        newCase.requiredJurors = requiredJurors;
        newCase.active = true;
        newCase.revealed = false;
        
        // 初始化FHE加密的投票计数器为0
        newCase.encryptedGuiltyVotes = FHE.asEuint32(0);
        newCase.encryptedInnocentVotes = FHE.asEuint32(0);
        
        // 允许合约访问加密的投票计数器
        FHE.allow(newCase.encryptedGuiltyVotes, address(this));
        FHE.allow(newCase.encryptedInnocentVotes, address(this));
        
        emit CaseCreated(
            caseId,
            title,
            msg.sender,
            newCase.startTime,
            newCase.endTime,
            requiredJurors
        );
        
        return caseId;
    }
    
    // 授权陪审员参与特定案件
    function authorizeJuror(
        uint256 caseId,
        address juror
    ) external validCase(caseId) onlyJudge(caseId) {
        require(certifiedJurors[juror], "Juror not certified");
        require(!cases[caseId].authorizedJurors[juror], "Juror already authorized");
        require(cases[caseId].jurors.length < cases[caseId].requiredJurors, "Max jurors reached");
        
        cases[caseId].authorizedJurors[juror] = true;
        emit JurorAuthorized(caseId, juror);
    }
    
    // 批量授权陪审员
    function authorizeJurors(
        uint256 caseId,
        address[] calldata jurors
    ) external validCase(caseId) onlyJudge(caseId) {
        LegalCase storage legalCase = cases[caseId];
        require(legalCase.jurors.length + jurors.length <= legalCase.requiredJurors, "Exceeds max jurors");
        
        for (uint256 i = 0; i < jurors.length; i++) {
            require(certifiedJurors[jurors[i]], "Juror not certified");
            require(!legalCase.authorizedJurors[jurors[i]], "Juror already authorized");
            
            legalCase.authorizedJurors[jurors[i]] = true;
            emit JurorAuthorized(caseId, jurors[i]);
        }
    }
    
    // 陪审员投票 (使用FHE加密)
    function castPrivateVote(
        uint256 caseId,
        uint8 vote, // 0=无罪, 1=有罪
        bytes32 commitment
    ) external validCase(caseId) votingActive(caseId) onlyAuthorizedJuror(caseId) nonReentrant {
        LegalCase storage legalCase = cases[caseId];
        require(!legalCase.jurorVotes[msg.sender].hasVoted, "Already voted");
        require(vote <= 1, "Invalid vote value");
        
        // 验证承诺哈希
        require(commitment != bytes32(0), "Invalid commitment");
        
        // 加密投票
        euint8 encryptedVote = FHE.asEuint8(vote);
        
        // 允许合约访问加密的投票
        FHE.allow(encryptedVote, address(this));
        
        // 存储投票
        legalCase.jurorVotes[msg.sender] = JurorVote({
            encryptedVote: encryptedVote,
            hasVoted: true,
            timestamp: block.timestamp,
            commitment: commitment
        });
        
        // 添加到陪审员列表
        legalCase.jurors.push(msg.sender);
        
        // 更新加密投票计数
        // 转换为32位加密整数并累加
        euint32 vote32 = FHE.asEuint32(encryptedVote);
        legalCase.encryptedGuiltyVotes = FHE.add(legalCase.encryptedGuiltyVotes, vote32);
        
        // 计算无罪票数 (1 - vote)
        euint32 one = FHE.asEuint32(1);
        euint32 innocentVote = FHE.sub(one, vote32);
        legalCase.encryptedInnocentVotes = FHE.add(legalCase.encryptedInnocentVotes, innocentVote);
        
        emit VoteCast(caseId, msg.sender, block.timestamp);
    }
    
    // 结束投票
    function endVoting(uint256 caseId) external validCase(caseId) {
        LegalCase storage legalCase = cases[caseId];
        require(legalCase.active, "Case not active");
        require(
            block.timestamp > legalCase.endTime || 
            msg.sender == legalCase.judge ||
            legalCase.jurors.length >= legalCase.requiredJurors,
            "Cannot end voting yet"
        );
        
        legalCase.active = false;
    }
    
    // 揭示投票结果
    function revealResults(uint256 caseId) external validCase(caseId) onlyJudge(caseId) {
        LegalCase storage legalCase = cases[caseId];
        require(!legalCase.active, "Voting still active");
        require(!legalCase.revealed, "Results already revealed");
        require(legalCase.jurors.length >= MIN_JURORS, "Insufficient jurors");
        
        // 解密投票结果
        uint32 guiltyVotes = FHE.decrypt(legalCase.encryptedGuiltyVotes);
        uint32 innocentVotes = FHE.decrypt(legalCase.encryptedInnocentVotes);
        
        // 确定判决结果
        legalCase.verdict = guiltyVotes > innocentVotes;
        legalCase.revealed = true;
        
        // 更新陪审员声誉 (参与投票的陪审员获得声誉奖励)
        for (uint256 i = 0; i < legalCase.jurors.length; i++) {
            jurorReputation[legalCase.jurors[i]] += 5;
        }
        
        emit CaseRevealed(caseId, legalCase.verdict, guiltyVotes, innocentVotes, legalCase.jurors.length);
    }
    
    // 获取案件信息
    function getCaseInfo(uint256 caseId) external view validCase(caseId) 
        returns (
            string memory title,
            string memory description,
            string memory evidenceHash,
            address judge,
            uint256 startTime,
            uint256 endTime,
            uint256 requiredJurors,
            bool active,
            bool revealed,
            bool verdict,
            uint256 jurorCount
        ) {
        LegalCase storage legalCase = cases[caseId];
        return (
            legalCase.title,
            legalCase.description,
            legalCase.evidenceHash,
            legalCase.judge,
            legalCase.startTime,
            legalCase.endTime,
            legalCase.requiredJurors,
            legalCase.active,
            legalCase.revealed,
            legalCase.verdict,
            legalCase.jurors.length
        );
    }
    
    // 检查是否已投票
    function hasVoted(uint256 caseId, address juror) external view validCase(caseId) returns (bool) {
        return cases[caseId].jurorVotes[juror].hasVoted;
    }
    
    // 检查是否是授权陪审员
    function isAuthorizedJuror(uint256 caseId, address juror) external view validCase(caseId) returns (bool) {
        return cases[caseId].authorizedJurors[juror];
    }
    
    // 获取陪审员声誉
    function getJurorReputation(address juror) external view returns (uint256) {
        return jurorReputation[juror];
    }
    
    // 获取揭示的结果
    function getRevealedResults(uint256 caseId) external view validCase(caseId) returns (
        bool verdict,
        uint256 guiltyVotes,
        uint256 innocentVotes,
        uint256 totalJurors
    ) {
        require(cases[caseId].revealed, "Results not revealed yet");
        
        LegalCase storage legalCase = cases[caseId];
        return (
            legalCase.verdict,
            FHE.decrypt(legalCase.encryptedGuiltyVotes),
            FHE.decrypt(legalCase.encryptedInnocentVotes),
            legalCase.jurors.length
        );
    }
    
    // 获取案件列表 (分页)
    function getCases(uint256 offset, uint256 limit) external view returns (
        uint256[] memory caseIds,
        string[] memory titles,
        bool[] memory activeStates,
        bool[] memory revealedStates
    ) {
        uint256 end = offset + limit;
        if (end > caseCount) {
            end = caseCount;
        }
        
        uint256 length = end - offset;
        caseIds = new uint256[](length);
        titles = new string[](length);
        activeStates = new bool[](length);
        revealedStates = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 caseId = offset + i;
            caseIds[i] = caseId;
            titles[i] = cases[caseId].title;
            activeStates[i] = cases[caseId].active;
            revealedStates[i] = cases[caseId].revealed;
        }
    }
}