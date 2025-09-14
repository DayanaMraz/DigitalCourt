// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IFHEVM.sol";

contract MockFHEVM is IFHEVM {
    
    mapping(uint256 => uint256) private encryptedValues;
    uint256 private nextId = 1;
    
    function createEncryptedInput(address contractAddress, address userAddress) external view override returns (bytes32) {
        // 简单的模拟实现，返回基于地址的哈希值
        return keccak256(abi.encodePacked(contractAddress, userAddress, block.timestamp));
    }
    
    function asEuint32(bytes32 encryptedInput, bytes calldata inputProof) external override returns (uint256) {
        // 模拟：根据输入创建加密值ID并存储
        uint256 encryptedId = nextId++;
        // 从inputProof中提取值，如果为空则默认为0
        uint256 value = inputProof.length > 0 ? uint256(bytes32(inputProof)) % (2**32) : 0;
        encryptedValues[encryptedId] = value;
        return encryptedId;
    }
    
    function asEuint32FromString(bytes32 encryptedInput, string calldata inputProof) external override returns (uint256) {
        // 模拟：根据输入创建加密值ID并存储
        uint256 encryptedId = nextId++;
        // 从string中提取值，如果为空则默认为0
        uint256 value = bytes(inputProof).length > 0 ? uint256(keccak256(bytes(inputProof))) % (2**32) : 0;
        encryptedValues[encryptedId] = value;
        return encryptedId;
    }
    
    function add(uint256 lhs, uint256 rhs) external override returns (uint256) {
        // 模拟加法：创建新的加密值ID
        uint256 resultId = nextId++;
        uint256 leftValue = encryptedValues[lhs];
        uint256 rightValue = encryptedValues[rhs];
        encryptedValues[resultId] = leftValue + rightValue;
        return resultId;
    }
    
    function sub(uint256 lhs, uint256 rhs) external override returns (uint256) {
        // 模拟减法：创建新的加密值ID
        uint256 resultId = nextId++;
        uint256 leftValue = encryptedValues[lhs];
        uint256 rightValue = encryptedValues[rhs];
        encryptedValues[resultId] = leftValue >= rightValue ? leftValue - rightValue : 0;
        return resultId;
    }
    
    function decrypt(uint256 encryptedValue) external view override returns (uint256) {
        // 模拟解密：直接返回存储的值
        return encryptedValues[encryptedValue];
    }
    
    function isInitialized(uint256 encryptedValue) external view override returns (bool) {
        // 检查加密值是否已初始化（ID存在且有对应的值）
        return encryptedValue > 0 && encryptedValue < nextId;
    }
    
    // 辅助函数：创建包含特定值的加密数据（用于测试）
    function createEncryptedValue(uint256 value) external returns (uint256) {
        uint256 encryptedId = nextId++;
        encryptedValues[encryptedId] = value;
        return encryptedId;
    }
    
    // 辅助函数：获取下一个ID（用于调试）
    function getNextId() external view returns (uint256) {
        return nextId;
    }
}