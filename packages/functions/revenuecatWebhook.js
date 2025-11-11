const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { getRevenueCatWebhookSecret } = require('./secretManager');

const db = admin.firestore();

/**
 * Verify RevenueCat webhook authentication
 * Supports both signature-based and authorization header methods
 */
async function verifyRevenueCatWebhook(req) {
  // Method 1: Check for signature-based verification (newer method)
  const signature = req.headers['x-revenuecat-signature'];

  if (signature) {
    functions.logger.info('Using signature-based verification');

    let webhookSecret;
    try {
      // Try Secret Manager first
      webhookSecret = await getRevenueCatWebhookSecret();
    } catch (error) {
      functions.logger.warn('Could not fetch from Secret Manager, trying fallback:', error.message);
      webhookSecret = functions.config().revenuecat?.webhook_secret;
    }

    if (!webhookSecret) {
      functions.logger.error('RevenueCat webhook: Webhook secret not configured');
      return false;
    }

    try {
      // RevenueCat sends the raw body as the payload to sign
      const payload = JSON.stringify(req.body);

      // Create HMAC SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Compare signatures using constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        functions.logger.error('RevenueCat webhook: Invalid signature');
      }

      return isValid;
    } catch (error) {
      functions.logger.error('RevenueCat signature verification error:', error);
      return false;
    }
  }

  // Method 2: Check for authorization header (older method, simpler)
  const authHeader = req.headers['authorization'];

  if (authHeader) {
    functions.logger.info('Using authorization header verification');

    const expectedAuth = functions.config().revenuecat?.webhook_auth;

    if (!expectedAuth) {
      functions.logger.error('RevenueCat webhook: Authorization token not configured');
      return false;
    }

    // RevenueCat sends: Authorization: Bearer <token>
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    const isValid = token === expectedAuth;

    if (!isValid) {
      functions.logger.error('RevenueCat webhook: Invalid authorization token');
    }

    return isValid;
  }

  // No authentication method found
  functions.logger.error('RevenueCat webhook: No authentication method found (no signature or auth header)');
  return false;
}

/**
 * Webhook endpoint for RevenueCat subscription events
 * Handles subscription purchases, renewals, cancellations, and expirations
 */
exports.revenuecatWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // SECURITY: Verify webhook authentication
    if (!(await verifyRevenueCatWebhook(req))) {
      functions.logger.error('RevenueCat webhook: Authentication failed');
      return res.status(401).send('Unauthorized - Invalid authentication');
    }

    const event = req.body.event;

    if (!event) {
      functions.logger.error('RevenueCat webhook: No event in request body');
      return res.status(400).send('No event found');
    }

    functions.logger.info(`RevenueCat webhook received: ${event.type}`, {
      userId: event.app_user_id,
      productId: event.product_id,
    });

    const userId = event.app_user_id;

    if (!userId) {
      functions.logger.error('RevenueCat webhook: No app_user_id in event');
      return res.status(400).send('No app_user_id found');
    }

    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'NON_RENEWING_PURCHASE':
        await handleSubscriptionActive(userId, event);
        break;

      case 'CANCELLATION':
        await handleSubscriptionCancellation(userId, event);
        break;

      case 'EXPIRATION':
        await handleSubscriptionExpiration(userId, event);
        break;

      case 'BILLING_ISSUE':
        await handleBillingIssue(userId, event);
        break;

      default:
        functions.logger.info(`RevenueCat webhook: Unhandled event type ${event.type}`);
    }

    // Always respond with 200 to acknowledge receipt
    return res.status(200).send('OK');
  } catch (error) {
    functions.logger.error('RevenueCat webhook error:', error);
    // Still return 200 to prevent RevenueCat from retrying
    return res.status(200).send('Error logged');
  }
});

/**
 * Handle active subscription events (purchase, renewal)
 */
async function handleSubscriptionActive(userId, event) {
  const subscriptionData = {
    tier: 'premium',
    status: 'active',
    productId: event.product_id,
    platform: 'web',
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    revenuecatCustomerId: event.subscriber_attributes?.['$revenueCatId']?.value || null,
    updatedAt: new Date(),
  };

  const subscriptionRef = db.collection('users').doc(userId).collection('subscription').doc('current');
  await subscriptionRef.set(subscriptionData, { merge: true });

  functions.logger.info(`Subscription activated for user ${userId}`, { productId: event.product_id });
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancellation(userId, event) {
  const subscriptionRef = db.collection('users').doc(userId).collection('subscription').doc('current');

  await subscriptionRef.update({
    status: 'cancelled',
    cancelledAt: new Date(),
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    updatedAt: new Date(),
  });

  functions.logger.info(`Subscription cancelled for user ${userId}`);
}

/**
 * Handle subscription expiration
 */
async function handleSubscriptionExpiration(userId, event) {
  const subscriptionRef = db.collection('users').doc(userId).collection('subscription').doc('current');

  await subscriptionRef.update({
    tier: 'free',
    status: 'expired',
    expiredAt: new Date(),
    updatedAt: new Date(),
  });

  functions.logger.info(`Subscription expired for user ${userId}`);
}

/**
 * Handle billing issues
 */
async function handleBillingIssue(userId, event) {
  const subscriptionRef = db.collection('users').doc(userId).collection('subscription').doc('current');

  await subscriptionRef.update({
    status: 'billing_issue',
    updatedAt: new Date(),
  });

  functions.logger.info(`Billing issue for user ${userId}`);
}
