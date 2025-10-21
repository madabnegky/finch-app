const CryptoJS = require('crypto-js');
const functions = require('firebase-functions');

/**
 * Encryption utility for sensitive data like Plaid access tokens
 * Uses AES-256 encryption with a key stored in Firebase Secret Manager
 */

/**
 * Get encryption key from Firebase config or environment
 * In production, this should be stored in Firebase Secret Manager
 */
function getEncryptionKey() {
  // Try to get from Firebase config first
  const configKey = functions.config().encryption?.key;
  if (configKey) {
    return configKey;
  }

  // Fallback to environment variable (for local development)
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    return envKey;
  }

  // If neither exists, throw error - encryption is required
  throw new Error(
    'ENCRYPTION_KEY not found. Set it using: firebase functions:config:set encryption.key="YOUR_RANDOM_32_CHAR_KEY"'
  );
}

/**
 * Encrypts a string using AES-256
 * @param {string} plaintext - The text to encrypt
 * @returns {string} - The encrypted ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }

  const key = getEncryptionKey();
  const ciphertext = CryptoJS.AES.encrypt(plaintext, key).toString();
  return ciphertext;
}

/**
 * Decrypts an AES-256 encrypted string
 * @param {string} ciphertext - The encrypted text
 * @returns {string} - The decrypted plaintext
 */
function decrypt(ciphertext) {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty value');
  }

  const key = getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);

  if (!plaintext) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }

  return plaintext;
}

module.exports = {
  encrypt,
  decrypt,
};
