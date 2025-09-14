// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IFHEVM {
    function createEncryptedInput(address contractAddress, address userAddress) external view returns (bytes32);
    
    function asEuint32(bytes32 encryptedInput, bytes calldata inputProof) external returns (uint256);
    
    function asEuint32FromString(bytes32 encryptedInput, string calldata inputProof) external returns (uint256);
    
    function add(uint256 lhs, uint256 rhs) external returns (uint256);
    
    function sub(uint256 lhs, uint256 rhs) external returns (uint256);
    
    function decrypt(uint256 encryptedValue) external view returns (uint256);
    
    function isInitialized(uint256 encryptedValue) external view returns (bool);
}