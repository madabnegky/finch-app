/**
 * Google Secret Manager Helper
 *
 * This module provides secure access to secrets stored in Google Secret Manager.
 * Secrets are cached in memory for performance.
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const functions = require('firebase-functions');

const client = new SecretManagerServiceClient();

// In-memory cache to avoid repeated API calls
const secretCache = new Map();

/**
 * Get a secret from Google Secret Manager
 *
 * @param {string} secretName - The name of the secret (e.g., 'ENCRYPTION_KEY')
 * @param {string} version - The version to retrieve (default: 'latest')
 * @returns {Promise<string>} The secret value
 */
async function getSecret(secretName, version = 'latest') {
  const cacheKey = `${secretName}:${version}`;

  // Return from cache if available
  if (secretCache.has(cacheKey)) {
    return secretCache.get(cacheKey);
  }

  try {
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

    if (!projectId) {
      throw new Error('Project ID not found. Ensure function is deployed or GCLOUD_PROJECT is set.');
    }

    const name = `projects/${projectId}/secrets/${secretName}/versions/${version}`;

    functions.logger.info(`Fetching secret: ${secretName} (version: ${version})`);

    const [response] = await client.accessSecretVersion({ name });
    const secretValue = response.payload.data.toString('utf8');

    // Cache the secret
    secretCache.set(cacheKey, secretValue);

    functions.logger.info(`✅ Secret fetched successfully: ${secretName}`);

    return secretValue;
  } catch (error) {
    functions.logger.error(`❌ Error fetching secret ${secretName}:`, error.message);
    throw new Error(`Failed to fetch secret ${secretName}: ${error.message}`);
  }
}

/**
 * Get encryption key from Secret Manager
 * Falls back to environment variable in development
 */
async function getEncryptionKey() {
  // In development/emulator, allow fallback to env var
  if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.ENCRYPTION_KEY) {
    functions.logger.warn('⚠️  Using ENCRYPTION_KEY from environment (emulator mode)');
    return process.env.ENCRYPTION_KEY;
  }

  return getSecret('ENCRYPTION_KEY');
}

/**
 * Get Plaid secret from Secret Manager
 * Falls back to environment variable in development
 */
async function getPlaidSecret() {
  if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.PLAID_SECRET) {
    functions.logger.warn('⚠️  Using PLAID_SECRET from environment (emulator mode)');
    return process.env.PLAID_SECRET;
  }

  return getSecret('PLAID_SECRET');
}

/**
 * Get Plaid Client ID from Secret Manager
 * Falls back to environment variable in development
 */
async function getPlaidClientId() {
  if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.PLAID_CLIENT_ID) {
    functions.logger.warn('⚠️  Using PLAID_CLIENT_ID from environment (emulator mode)');
    return process.env.PLAID_CLIENT_ID;
  }

  return getSecret('PLAID_CLIENT_ID');
}

/**
 * Get RevenueCat webhook secret from Secret Manager
 * Falls back to environment variable in development
 */
async function getRevenueCatWebhookSecret() {
  if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.REVENUECAT_WEBHOOK_SECRET) {
    functions.logger.warn('⚠️  Using REVENUECAT_WEBHOOK_SECRET from environment (emulator mode)');
    return process.env.REVENUECAT_WEBHOOK_SECRET;
  }

  return getSecret('REVENUECAT_WEBHOOK_SECRET');
}

/**
 * Clear the secret cache (useful for testing or forcing refresh)
 */
function clearCache() {
  secretCache.clear();
  functions.logger.info('Secret cache cleared');
}

module.exports = {
  getSecret,
  getEncryptionKey,
  getPlaidSecret,
  getPlaidClientId,
  getRevenueCatWebhookSecret,
  clearCache,
};
