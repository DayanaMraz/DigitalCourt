// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TFHE
 * @notice Compatible TFHE library interface for FHEVM
 * @dev This provides a compatible interface with official FHEVM TFHE library
 *      Replace with actual @fhevm/solidity imports when package structure is resolved
 */

// FHE types - compatible with official FHEVM
type euint8 is uint256;
type euint16 is uint256;
type euint32 is uint256;
type euint64 is uint256;
type ebool is uint256;

library TFHE {
    /**
     * @notice Encrypt a uint8 value
     */
    function asEuint8(uint8 value) internal pure returns (euint8) {
        return euint8.wrap(uint256(value));
    }
    
    /**
     * @notice Encrypt a uint16 value
     */
    function asEuint16(uint16 value) internal pure returns (euint16) {
        return euint16.wrap(uint256(value));
    }
    
    /**
     * @notice Encrypt a uint32 value
     */
    function asEuint32(uint32 value) internal pure returns (euint32) {
        return euint32.wrap(uint256(value));
    }
    
    /**
     * @notice Encrypt a uint64 value
     */
    function asEuint64(uint64 value) internal pure returns (euint64) {
        return euint64.wrap(uint256(value));
    }
    
    /**
     * @notice Convert euint8 to euint16
     */
    function asEuint16(euint8 value) internal pure returns (euint16) {
        return euint16.wrap(euint8.unwrap(value));
    }
    
    /**
     * @notice Convert euint8 to euint32
     */
    function asEuint32(euint8 value) internal pure returns (euint32) {
        return euint32.wrap(euint8.unwrap(value));
    }
    
    /**
     * @notice Convert euint16 to euint32
     */
    function asEuint32(euint16 value) internal pure returns (euint32) {
        return euint32.wrap(euint16.unwrap(value));
    }
    
    /**
     * @notice Convert euint32 to euint64
     */
    function asEuint64(euint32 value) internal pure returns (euint64) {
        return euint64.wrap(euint32.unwrap(value));
    }
    
    // Homomorphic arithmetic operations
    
    /**
     * @notice Homomorphic addition of two encrypted uint8
     */
    function add(euint8 lhs, euint8 rhs) internal pure returns (euint8) {
        return euint8.wrap(euint8.unwrap(lhs) + euint8.unwrap(rhs));
    }
    
    /**
     * @notice Homomorphic addition of two encrypted uint32
     */
    function add(euint32 lhs, euint32 rhs) internal pure returns (euint32) {
        return euint32.wrap(euint32.unwrap(lhs) + euint32.unwrap(rhs));
    }
    
    /**
     * @notice Homomorphic subtraction of two encrypted uint32
     */
    function sub(euint32 lhs, euint32 rhs) internal pure returns (euint32) {
        uint256 left = euint32.unwrap(lhs);
        uint256 right = euint32.unwrap(rhs);
        require(left >= right, "TFHE: subtraction underflow");
        return euint32.wrap(left - right);
    }
    
    /**
     * @notice Homomorphic multiplication
     */
    function mul(euint32 lhs, euint32 rhs) internal pure returns (euint32) {
        return euint32.wrap(euint32.unwrap(lhs) * euint32.unwrap(rhs));
    }
    
    // Comparison operations
    
    /**
     * @notice Homomorphic equality check
     */
    function eq(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return ebool.wrap(euint32.unwrap(lhs) == euint32.unwrap(rhs) ? 1 : 0);
    }
    
    /**
     * @notice Homomorphic inequality check
     */
    function ne(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return ebool.wrap(euint32.unwrap(lhs) != euint32.unwrap(rhs) ? 1 : 0);
    }
    
    /**
     * @notice Homomorphic greater than check
     */
    function gt(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return ebool.wrap(euint32.unwrap(lhs) > euint32.unwrap(rhs) ? 1 : 0);
    }
    
    /**
     * @notice Homomorphic greater than or equal check
     */
    function ge(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return ebool.wrap(euint32.unwrap(lhs) >= euint32.unwrap(rhs) ? 1 : 0);
    }
    
    /**
     * @notice Homomorphic less than check
     */
    function lt(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return ebool.wrap(euint32.unwrap(lhs) < euint32.unwrap(rhs) ? 1 : 0);
    }
    
    /**
     * @notice Homomorphic less than or equal check
     */
    function le(euint32 lhs, euint32 rhs) internal pure returns (ebool) {
        return ebool.wrap(euint32.unwrap(lhs) <= euint32.unwrap(rhs) ? 1 : 0);
    }
    
    // Conditional operations
    
    /**
     * @notice Conditional select (ternary operator for encrypted values)
     */
    function cmux(ebool control, euint32 a, euint32 b) internal pure returns (euint32) {
        return euint32.wrap(ebool.unwrap(control) != 0 ? euint32.unwrap(a) : euint32.unwrap(b));
    }
    
    // Random number generation
    
    /**
     * @notice Generate random encrypted uint8
     */
    function randEuint8() internal view returns (euint8) {
        uint8 randomValue = uint8(uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao, 
            msg.sender,
            gasleft()
        ))) % 256);
        return euint8.wrap(uint256(randomValue));
    }
    
    /**
     * @notice Generate random encrypted uint32
     */
    function randEuint32() internal view returns (euint32) {
        uint32 randomValue = uint32(uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao, 
            msg.sender,
            gasleft(),
            block.number
        ))));
        return euint32.wrap(uint256(randomValue));
    }
    
    // Decryption (requires authorization in real FHEVM)
    
    /**
     * @notice Decrypt euint8 to uint8 (requires proper authorization)
     */
    function decrypt(euint8 value) internal pure returns (uint8) {
        return uint8(euint8.unwrap(value));
    }
    
    /**
     * @notice Decrypt euint32 to uint32 (requires proper authorization)
     */
    function decrypt(euint32 value) internal pure returns (uint32) {
        return uint32(euint32.unwrap(value));
    }
    
    /**
     * @notice Decrypt ebool to bool (requires proper authorization)
     */
    function decrypt(ebool value) internal pure returns (bool) {
        return ebool.unwrap(value) != 0;
    }
    
    // Access control
    
    /**
     * @notice Allow an address to use an encrypted value
     */
    function allow(euint8 value, address account) internal pure {
        // In real FHEVM, this would set up access permissions
        // For compatibility, we accept any valid address
        require(account != address(0), "TFHE: invalid account");
    }
    
    /**
     * @notice Allow an address to use an encrypted value
     */
    function allow(euint32 value, address account) internal pure {
        // In real FHEVM, this would set up access permissions
        // For compatibility, we accept any valid address
        require(account != address(0), "TFHE: invalid account");
    }
    
    /**
     * @notice Allow an address to use an encrypted value
     */
    function allow(ebool value, address account) internal pure {
        // In real FHEVM, this would set up access permissions
        // For compatibility, we accept any valid address
        require(account != address(0), "TFHE: invalid account");
    }
    
    // Utility functions
    
    /**
     * @notice Check if encrypted value is initialized
     */
    function isInitialized(euint8 value) internal pure returns (bool) {
        return true; // In this implementation, all values are considered initialized
    }
    
    /**
     * @notice Check if encrypted value is initialized
     */
    function isInitialized(euint32 value) internal pure returns (bool) {
        return true; // In this implementation, all values are considered initialized
    }
    
    /**
     * @notice Check if encrypted value is initialized
     */
    function isInitialized(ebool value) internal pure returns (bool) {
        return true; // In this implementation, all values are considered initialized
    }
}