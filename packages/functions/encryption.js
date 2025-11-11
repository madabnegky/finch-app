const CryptoJS = require('crypto-js');
const functions = require('firebase-functions');
const { getEncryptionKey: getEncryptionKeyFromSecretManager } = require('./secretManager');

/**
 * Encryption utility for sensitive data like Plaid access tokens
 * Uses AES-256 encryption with a key stored in Google Secret Manager
 */

// Cache for encryption key to avoid repeated Secret Manager calls
let encryptionKeyCache = null;

/**
 * Get encryption key from Google Secret Manager
 * Falls back to Firebase config or environment for local development
 */
async function getEncryptionKey() {
  // Return cached key if available
  if (encryptionKeyCache) {
    return encryptionKeyCache;
  }

  try {
    // Try to get from Secret Manager (production)
    encryptionKeyCache = await getEncryptionKeyFromSecretManager();
    return encryptionKeyCache;
  } catch (error) {
    functions.logger.warn('Could not fetch from Secret Manager, trying fallbacks:', error.message);

    // Try Firebase config as fallback
    const configKey = functions.config().encryption?.key;
    if (configKey) {
      functions.logger.warn('⚠️  Using encryption key from Firebase config (legacy)');
      encryptionKeyCache = configKey;
      return encryptionKeyCache;
    }

    // Fallback to environment variable (for local development only)
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
      functions.logger.warn('⚠️  Using encryption key from environment variable (development only)');
      encryptionKeyCache = envKey;
      return encryptionKeyCache;
    }

    // If no key found anywhere, throw error
    throw new Error(
      'ENCRYPTION_KEY not found. Please set up Google Secret Manager. See documentation for setup instructions.'
    );
  }
}

/**
 * Encrypts a string using AES-256
 * @param {string} plaintext - The text to encrypt
 * @returns {Promise<string>} - The encrypted ciphertext
 */
async function encrypt(plaintext) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }

  const key = await getEncryptionKey();
  const ciphertext = CryptoJS.AES.encrypt(plaintext, key).toString();
  return ciphertext;
}

/**
 * Decrypts an AES-256 encrypted string
 * @param {string} ciphertext - The encrypted text
 * @returns {Promise<string>} - The decrypted plaintext
 */
async function decrypt(ciphertext) {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty value');
  }

  const key = await getEncryptionKey();
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
