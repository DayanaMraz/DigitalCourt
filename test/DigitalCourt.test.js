const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DigitalCourt", function () {
  let digitalCourt;
  let owner, judge, juror1, juror2, juror3;

  beforeEach(async function () {
    [owner, judge, juror1, juror2, juror3] = await ethers.getSigners();

    const DigitalCourt = await ethers.getContractFactory("DigitalCourt");
    digitalCourt = await DigitalCourt.deploy();
    await digitalCourt.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await digitalCourt.owner()).to.equal(owner.address);
    });

    it("Should have zero cases initially", async function () {
      expect(await digitalCourt.caseCount()).to.equal(0);
    });
  });

  describe("Juror Certification", function () {
    it("Should allow owner to certify jurors", async function () {
      await digitalCourt.certifyJuror(juror1.address);
      expect(await digitalCourt.certifiedJurors(juror1.address)).to.be.true;
      expect(await digitalCourt.getJurorReputation(juror1.address)).to.equal(100);
    });

    it("Should allow batch certification of jurors", async function () {
      await digitalCourt.certifyJurors([juror1.address, juror2.address, juror3.address]);
      
      expect(await digitalCourt.certifiedJurors(juror1.address)).to.be.true;
      expect(await digitalCourt.certifiedJurors(juror2.address)).to.be.true;
      expect(await digitalCourt.certifiedJurors(juror3.address)).to.be.true;
    });

    it("Should not allow non-owner to certify jurors", async function () {
      await expect(
        digitalCourt.connect(judge).certifyJuror(juror1.address)
      ).to.be.revertedWithCustomError(digitalCourt, "OwnableUnauthorizedAccount");
    });
  });

  describe("Case Creation", function () {
    beforeEach(async function () {
      // Certify some jurors first
      await digitalCourt.certifyJurors([juror1.address, juror2.address, juror3.address]);
    });

    it("Should create a new case successfully", async function () {
      const title = "The People vs. John Doe";
      const description = "Test case for theft";
      const evidenceHash = "QmTestEvidence123";
      const requiredJurors = 3;

      await expect(digitalCourt.connect(judge).createCase(title, description, evidenceHash, requiredJurors))
        .to.emit(digitalCourt, "CaseCreated")
        .withArgs(0, title, judge.address, anyValue, anyValue, requiredJurors);

      const caseInfo = await digitalCourt.getCaseInfo(0);
      expect(caseInfo.title).to.equal(title);
      expect(caseInfo.description).to.equal(description);
      expect(caseInfo.evidenceHash).to.equal(evidenceHash);
      expect(caseInfo.judge).to.equal(judge.address);
      expect(caseInfo.requiredJurors).to.equal(requiredJurors);
      expect(caseInfo.active).to.be.true;
      expect(caseInfo.revealed).to.be.false;
    });

    it("Should not allow empty title or description", async function () {
      await expect(
        digitalCourt.connect(judge).createCase("", "description", "evidence", 3)
      ).to.be.revertedWith("Title cannot be empty");

      await expect(
        digitalCourt.connect(judge).createCase("title", "", "evidence", 3)
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("Should not allow invalid juror count", async function () {
      await expect(
        digitalCourt.connect(judge).createCase("title", "description", "evidence", 2)
      ).to.be.revertedWith("Invalid juror count");

      await expect(
        digitalCourt.connect(judge).createCase("title", "description", "evidence", 15)
      ).to.be.revertedWith("Invalid juror count");
    });
  });

  describe("Juror Authorization", function () {
    let caseId;

    beforeEach(async function () {
      // Certify jurors and create a case
      await digitalCourt.certifyJurors([juror1.address, juror2.address, juror3.address]);
      
      await digitalCourt.connect(judge).createCase(
        "Test Case", 
        "Test Description", 
        "QmTestEvidence", 
        3
      );
      caseId = 0;
    });

    it("Should allow judge to authorize certified jurors", async function () {
      await expect(digitalCourt.connect(judge).authorizeJuror(caseId, juror1.address))
        .to.emit(digitalCourt, "JurorAuthorized")
        .withArgs(caseId, juror1.address);

      expect(await digitalCourt.isAuthorizedJuror(caseId, juror1.address)).to.be.true;
    });

    it("Should allow batch authorization of jurors", async function () {
      await digitalCourt.connect(judge).authorizeJurors(caseId, [juror1.address, juror2.address, juror3.address]);
      
      expect(await digitalCourt.isAuthorizedJuror(caseId, juror1.address)).to.be.true;
      expect(await digitalCourt.isAuthorizedJuror(caseId, juror2.address)).to.be.true;
      expect(await digitalCourt.isAuthorizedJuror(caseId, juror3.address)).to.be.true;
    });

    it("Should not allow non-judge to authorize jurors", async function () {
      await expect(
        digitalCourt.connect(juror1).authorizeJuror(caseId, juror2.address)
      ).to.be.revertedWith("Only case judge can perform this action");
    });

    it("Should not allow authorization of uncertified jurors", async function () {
      const [, , , , uncertifiedJuror] = await ethers.getSigners();
      
      await expect(
        digitalCourt.connect(judge).authorizeJuror(caseId, uncertifiedJuror.address)
      ).to.be.revertedWith("Juror not certified");
    });
  });

  // Note: Voting tests would require FHEVM test environment
  // These are basic structure tests for non-FHE functionality
  
  const anyValue = expect.anything();
});