// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./TFHE.sol";

library FHE {
    // Create encrypted uint8 from plaintext
    function asEuint8(uint8 value) internal pure returns (euint8) {
        return TFHE.asEuint8(value);
    }
    
    // Create encrypted uint32 from plaintext
    function asEuint32(uint32 value) internal pure returns (euint32) {
        return TFHE.asEuint32(value);
    }
    
    // Convert euint8 to euint32
    function asEuint32(euint8 value) internal pure returns (euint32) {
        return TFHE.asEuint32(value);
    }
    
    // Add two encrypted uint32 values
    function add(euint32 lhs, euint32 rhs) internal pure returns (euint32) {
        return TFHE.add(lhs, rhs);
    }
    
    // Subtract two encrypted uint32 values
    function sub(euint32 lhs, euint32 rhs) internal pure returns (euint32) {
        return TFHE.sub(lhs, rhs);
    }
    
    // Decrypt euint32 to plaintext (requires proper authorization)
    function decrypt(euint32 value) internal view returns (uint32) {
        return TFHE.decrypt(value);
    }
    
    // Allow encrypted value to be used in computations
    function allow(euint8 value, address account) internal {
        TFHE.allow(value, account);
    }
    
    function allow(euint32 value, address account) internal {
        TFHE.allow(value, account);
    }
    
    // Check if encrypted value is initialized
    function isInitialized(euint32 value) internal pure returns (bool) {
        return TFHE.isInitialized(value);
    }
    
    // Generate random encrypted values
    function randEuint8() internal view returns (euint8) {
        return TFHE.randEuint8();
    }
    
    function randEuint32() internal view returns (euint32) {
        return TFHE.randEuint32();
    }
    
    // Conditional select (ternary operator for encrypted values)
    function cmux(ebool control, euint32 a, euint32 b) internal pure returns (euint32) {
        return TFHE.cmux(control, a, b);
    }
    
    // Comparison operations
    function eq(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return TFHE.eq(lhs, rhs);
    }
    
    function ne(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return TFHE.ne(lhs, rhs);
    }
    
    function ge(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return TFHE.ge(lhs, rhs);
    }
    
    function gt(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return TFHE.gt(lhs, rhs);
    }
    
    function le(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return TFHE.le(lhs, rhs);
    }
    
    function lt(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return TFHE.lt(lhs, rhs);
    }
}