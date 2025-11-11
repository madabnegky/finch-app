const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getNextOccurrence, startOfDay, toDateInputString, parseDateString } = require("./dateUtils");
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { encrypt, decrypt } = require('./encryption');
const { CloudTasksClient } = require('@google-cloud/tasks');
const { getPlaidClientId, getPlaidSecret } = require('./secretManager');

admin.initializeApp();
const db = admin.firestore();

// Plaid client will be initialized lazily when needed
let plaidClient = null;
let plaidClientPromise = null;

/**
 * Get or initialize Plaid client with credentials from Secret Manager
 * @returns {Promise<PlaidApi>}
 */
async function getPlaidClient() {
  // If client already initialized, return it
  if (plaidClient) {
    return plaidClient;
  }

  // If initialization is in progress, wait for it
  if (plaidClientPromise) {
    return plaidClientPromise;
  }

  // Start initialization
  plaidClientPromise = (async () => {
    try {
      // Try Secret Manager first
      const clientId = await getPlaidClientId();
      const secret = await getPlaidSecret();

      const plaidConfig = new Configuration({
        basePath: PlaidEnvironments[functions.config().plaid?.env || 'production'],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': clientId,
            'PLAID-SECRET': secret,
          },
        },
      });

      plaidClient = new PlaidApi(plaidConfig);
      functions.logger.info('✅ Plaid client initialized with Secret Manager credentials');
      return plaidClient;
    } catch (error) {
      functions.logger.warn('Could not initialize Plaid with Secret Manager, trying fallback:', error.message);

      // Fallback to Firebase config
      const plaidConfig = new Configuration({
        basePath: PlaidEnvironments[functions.config().plaid?.env || 'production'],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': functions.config().plaid?.client_id,
            'PLAID-SECRET': functions.config().plaid?.secret,
          },
        },
      });

      plaidClient = new PlaidApi(plaidConfig);
      functions.logger.warn('⚠️  Plaid client initialized with Firebase config (fallback)');
      return plaidClient;
    }
  })();

  return plaidClientPromise;
}

// Initialize Cloud Tasks client
const tasksClient = new CloudTasksClient();
const project = process.env.GCLOUD_PROJECT || 'finch-app-v2';
const location = 'us-central1';
const queue = 'plaid-sync-queue';

// ============================================================================
// INPUT VALIDATION HELPERS
// ============================================================================

/**
 * Validate and sanitize user input to prevent injection attacks
 */
function validateAndSanitize(input, type = 'string', maxLength = 1000) {
  if (input === null || input === undefined) {
    return null;
  }

  switch (type) {
    case 'string':
      // Convert to string and limit length
      const str = String(input).slice(0, maxLength);
      // Remove potentially dangerous characters for logging
      return str.replace(/[<>]/g, '');

    case 'number':
      const num = Number(input);
      return isNaN(num) ? 0 : num;

    case 'boolean':
      return Boolean(input);

    case 'userId':
      // Firestore user IDs are alphanumeric with length constraints
      const userId = String(input);
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
        throw new Error('Invalid userId format');
      }
      return userId;

    case 'amount':
      // Financial amounts should be reasonable
      const amount = Number(input);
      if (isNaN(amount) || amount < -1000000 || amount > 1000000) {
        throw new Error('Invalid amount');
      }
      return amount;

    default:
      return input;
  }
}

/**
 * Validate required fields are present
 */
function validateRequiredFields(data, fields) {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

// ============================================================================
// NOTIFICATION HELPER FUNCTIONS
// ============================================================================

/**
 * Check if current time is within active notification hours (7:30 AM - 10 PM)
 * @param {string} userTimezone - User's timezone (e.g., 'America/New_York')
 */
function isInActiveHours(userTimezone = 'America/New_York') {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    const minute = parseInt(parts.find(p => p.type === 'minute').value);

    // Active hours: 7:30 AM to 10 PM
    if (hour < 7) return false;
    if (hour === 7 && minute < 30) return false;
    if (hour >= 22) return false;

    return true;
  } catch (error) {
    functions.logger.error('Error checking active hours:', error);
    return true; // Default to sending if error
  }
}

/**
 * Get next 7:30 AM timestamp in user's timezone
 */
function getNext730AM(userTimezone = 'America/New_York') {
  try {
    const now = new Date();

    // Create date in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value);
    const day = parseInt(parts.find(p => p.type === 'day').value);
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    const minute = parseInt(parts.find(p => p.type === 'minute').value);

    // Create 7:30 AM today
    let scheduledDate = new Date(year, month - 1, day, 7, 30, 0);

    // If already past 7:30 AM, schedule for tomorrow
    if (hour > 7 || (hour === 7 && minute >= 30)) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    return admin.firestore.Timestamp.fromDate(scheduledDate);
  } catch (error) {
    functions.logger.error('Error calculating next 7:30 AM:', error);
    // Default to 8 hours from now
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + 8);
    return admin.firestore.Timestamp.fromDate(fallback);
  }
}

/**
 * Format currency for notifications
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Math.abs(amount));
}

// Map Plaid categories to Finch categories
function mapPlaidCategoryToFinch(plaidCategories) {
  if (!plaidCategories) {
    return 'Uncategorized';
  }

  let primaryCategory, detailedCategory;

  // Handle new personal_finance_category object format
  if (plaidCategories.primary) {
    primaryCategory = plaidCategories.primary.toLowerCase();
    detailedCategory = plaidCategories.detailed?.toLowerCase();
  }
  // Handle old category array format (deprecated)
  else if (Array.isArray(plaidCategories) && plaidCategories.length > 0) {
    primaryCategory = plaidCategories[0].toLowerCase();
    detailedCategory = plaidCategories[1]?.toLowerCase();
  }
  else {
    return 'Uncategorized';
  }

  // New personal_finance_category primary mappings
  const pfcMap = {
    'food_and_drink': detailedCategory?.includes('groceries') ? 'Groceries' : 'Food',
    'general_merchandise': 'Shopping',
    'transportation': 'Transportation',
    'travel': 'Travel',
    'home_improvement': 'Housing',
    'medical': 'Health',
    'personal_care': 'Personal Care',
    'general_services': (() => {
      // Handle detailed subcategories for GENERAL_SERVICES
      if (detailedCategory?.includes('subscription')) return 'Subscriptions';
      if (detailedCategory?.includes('automotive')) return 'Transportation';
      if (detailedCategory?.includes('insurance')) return 'Insurance';
      return 'Uncategorized';
    })(),
    'entertainment': 'Entertainment',
    'rent_and_utilities': detailedCategory?.includes('utilities') ? 'Utilities' : 'Housing',
    'loan_payments': 'Uncategorized', // These are typically transfers
    'bank_fees': 'Uncategorized',
    'transfer_in': 'Uncategorized',
    'transfer_out': 'Uncategorized',
    'income': 'Uncategorized', // Income doesn't get categorized
  };

  // Check new format first
  if (pfcMap[primaryCategory]) {
    return pfcMap[primaryCategory];
  }

  // Fallback to old category mappings (for backward compatibility)
  const categoryMap = {
    'food and drink': detailedCategory === 'groceries' ? 'Groceries' : 'Food',
    'restaurants': 'Food',
    'transportation': 'Transportation',
    'travel': detailedCategory?.includes('gas') ? 'Transportation' : 'Travel',
    'shops': 'Shopping',
    'general merchandise': 'Shopping',
    'rent and utilities': detailedCategory?.includes('util') ? 'Utilities' : 'Housing',
    'home improvement': 'Housing',
    'healthcare': 'Health',
    'medical': 'Health',
    'insurance': 'Insurance',
    'recreation': 'Entertainment',
    'entertainment': 'Entertainment',
    'service': detailedCategory?.includes('subscr') || detailedCategory?.includes('streaming')
      ? 'Subscriptions'
      : detailedCategory?.includes('util') ? 'Utilities' : 'Uncategorized',
    'subscription': 'Subscriptions',
    'personal care': 'Personal Care',
    'community': 'Gifts & Donations',
    'transfer': 'Uncategorized',
  };

  // Try exact match on primary category
  for (const [plaidCat, finchCat] of Object.entries(categoryMap)) {
    if (primaryCategory.includes(plaidCat) || plaidCat.includes(primaryCategory)) {
      return finchCat;
    }
  }

  return 'Uncategorized';
}

exports.generateProjections = functions.https.onRequest(async (req, res) => {
  // Whitelist of allowed origins
  const allowedOrigins = [
    'https://finch-app-v2.web.app',
    'https://finch-app-v2.firebaseapp.com',
    'http://localhost:5173', // Local development
    'http://localhost:3000'  // Alternative local dev port
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }

  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    functions.logger.error("No authorization token was found for generateProjections.");
    res.status(403).send('Unauthorized');
    return;
  }

  try {
    const idToken = req.headers.authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    const daysToProject = req.body.data.daysToProject || 60;
    const today = startOfDay(new Date());
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysToProject);

    const accountsSnapshot = await db.collection(`users/${userId}/accounts`).get();
    const accounts = accountsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const transactionsSnapshot = await db.collection(`users/${userId}/transactions`).get();
    const transactions = transactionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const allInstances = [];
    const toJSDate = (timestamp) => {
      if (!timestamp) return null;
      if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
      if (timestamp instanceof Date) return timestamp;
      return parseDateString(timestamp); // Use the robust parser
    };

    transactions.forEach((t) => {
      if (!t.isRecurring) {
        const transactionDate = toJSDate(t.date || t.createdAt);
        if (transactionDate) allInstances.push({ ...t, date: transactionDate });
      } else {
        if (!t.recurringDetails || !t.recurringDetails.nextDate) return;

        let cursorDate = toJSDate(t.recurringDetails.nextDate);
        const seriesEndDate = toJSDate(t.recurringDetails.endDate);
        const excludedDates = t.recurringDetails.excludedDates?.map(d => toDateInputString(toJSDate(d))) || [];
        
        let safetyBreak = 0;
        while (cursorDate && cursorDate <= endDate && safetyBreak < 1000) {
          if (seriesEndDate && cursorDate > seriesEndDate) break;
          if (!excludedDates.includes(toDateInputString(cursorDate))) {
            allInstances.push({ ...t, isInstance: true, instanceId: `${t.id}-${toDateInputString(cursorDate)}`, date: new Date(cursorDate) });
          }
          const nextDate = getNextOccurrence(cursorDate, t.recurringDetails.frequency);
          if (!nextDate || nextDate <= cursorDate) break;
          cursorDate = nextDate;
          safetyBreak++;
        }
      }
    });

    const projectionsByAccount = accounts.map(account => {
      let startingBalance = account.startingBalance;
      const pastInstances = allInstances.filter(inst => inst.accountId === account.id && new Date(inst.date) < today);
      startingBalance += pastInstances.reduce((sum, inst) => sum + inst.amount, 0);

      const futureInstancesByDate = new Map();
      allInstances.forEach((inst) => {
        const instDate = new Date(inst.date);
        if (inst.accountId === account.id && instDate >= today && instDate <= endDate) {
          const dateKey = toDateInputString(instDate);
          if (!futureInstancesByDate.has(dateKey)) futureInstancesByDate.set(dateKey, []);
          futureInstancesByDate.get(dateKey).push(inst);
        }
      });
      
      const accountProjections = [];
      let currentBalance = startingBalance;
      for (let i = 0; i <= daysToProject; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateKey = toDateInputString(date);

        const transactionsToday = futureInstancesByDate.get(dateKey) || [];
        const dailyNet = transactionsToday.reduce((sum, t) => sum + t.amount, 0);
        currentBalance += dailyNet;

        accountProjections.push({
          date: date.toISOString(),
          balance: currentBalance,
          transactions: transactionsToday,
        });
      }
      
      return { accountId: account.id, projections: accountProjections };
    });

    res.status(200).json({ data: { projections: projectionsByAccount } });

  } catch (error) {
    functions.logger.error("Error in generateProjections:", error, { structuredData: true });
    res.status(500).json({
      error: {
        status: "INTERNAL",
        message: "An unexpected error occurred while generating projections.",
      },
    });
  }
});

exports.detectRecurringTransactions = functions.firestore
    .document('users/{userId}/transactions/{transactionId}')
    .onCreate(async (snap, context) => {
        const newTransaction = snap.data();
        const userId = context.params.userId;
        const transactionId = context.params.transactionId;

        if (!newTransaction.description) {
            console.log("New transaction has no description, skipping recurring detection.");
            return null;
        }
        
        const similarTransactions = await db.collection(`users/${userId}/transactions`)
            .where('description', '==', newTransaction.description)
            .get();

        if (similarTransactions.docs.length < 2) {
            return null; 
        }

        let isRecurring = false;
        similarTransactions.forEach(doc => {
            if (doc.id === transactionId) return;
            const oldTransaction = doc.data();
            const amountDifference = Math.abs(oldTransaction.amount - newTransaction.amount);

            if (amountDifference < 1.00) {
                isRecurring = true;
            }
        });

        if (isRecurring) {
            console.log(`Detected potential recurring transaction: ${newTransaction.description} for user ${userId}`);
        }

        return null;
    });

// ============================================================================
// PLAID INTEGRATION CLOUD FUNCTIONS
// ============================================================================

/**
 * Creates a Plaid Link token for initiating the account linking flow
 * @param {string} userId - Firebase user ID
 * @param {string} accountId - (Optional) Existing account ID to link
 */
exports.createLinkToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const accountId = data?.accountId; // Optional: only needed for update mode

  try {
    const plaidClient = await getPlaidClient();
    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Finch',
      products: ['transactions'], // Using transactions (which includes balance data)
      country_codes: ['US'],
      language: 'en',
      webhook: `https://us-central1-finch-app-v2.cloudfunctions.net/plaidWebhook`,
      // No redirect_uri needed - Plaid React Native SDK handles OAuth automatically
    };

    const response = await plaidClient.linkTokenCreate(request);

    functions.logger.info(`Created link token for user ${userId}`, { accountId });

    return {
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    };
  } catch (error) {
    functions.logger.error('Error creating link token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create link token', error.message);
  }
});

/**
 * Exchanges public token for access token and fetches account information
 * @param {string} publicToken - Plaid public token from Link flow
 */
exports.exchangePublicToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { publicToken } = data;

  if (!publicToken) {
    throw new functions.https.HttpsError('invalid-argument', 'publicToken is required');
  }

  try {
    const plaidClient = await getPlaidClient();
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get institution info
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });
    const institutionId = itemResponse.data.item.institution_id;

    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ['US'],
    });
    const institutionName = institutionResponse.data.institution.name;

    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    // Store Plaid item in Firestore with encrypted access token
    const encryptedAccessToken = encrypt(accessToken);

    await db.collection(`users/${userId}/plaidItems`).doc(itemId).set({
      accessToken: encryptedAccessToken, // Encrypted for security
      institutionId,
      institutionName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      webhookUrl: `https://us-central1-finch-app-v2.cloudfunctions.net/plaidWebhook`,
    });

    functions.logger.info(`Exchanged token for user ${userId}, item ${itemId}`, {
      institutionName,
      accountCount: accountsResponse.data.accounts.length,
    });

    // Return available accounts for user to select
    return {
      itemId,
      institutionName,
      plaidAccounts: accountsResponse.data.accounts.map(account => ({
        plaidAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
      })),
    };
  } catch (error) {
    functions.logger.error('Error exchanging public token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to exchange token', error.message);
  }
});

/**
 * Links a Finch account to a Plaid account and updates balance
 * @param {string} accountId - Finch account ID
 * @param {string} itemId - Plaid item ID
 * @param {string} plaidAccountId - Plaid account ID to link
 */
exports.linkAccountToPlaid = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { accountId, itemId, plaidAccountId } = data;

  if (!accountId || !itemId || !plaidAccountId) {
    throw new functions.https.HttpsError('invalid-argument', 'accountId, itemId, and plaidAccountId are required');
  }

  try {
    const plaidClient = await getPlaidClient();
    // Get Plaid item
    const plaidItemDoc = await db.collection(`users/${userId}/plaidItems`).doc(itemId).get();
    if (!plaidItemDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Plaid item not found');
    }

    const encryptedAccessToken = plaidItemDoc.data().accessToken;
    const accessToken = decrypt(encryptedAccessToken);

    // Get current balance from Plaid
    const accountsResponse = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });

    const plaidAccount = accountsResponse.data.accounts.find(acc => acc.account_id === plaidAccountId);
    if (!plaidAccount) {
      throw new functions.https.HttpsError('not-found', 'Plaid account not found');
    }

    const newBalance = plaidAccount.balances.current || plaidAccount.balances.available || 0;

    // Get existing Finch account
    const accountDoc = await db.collection(`users/${userId}/accounts`).doc(accountId).get();
    if (!accountDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Finch account not found');
    }

    const oldBalance = accountDoc.data().currentBalance || 0;

    // Update Finch account with Plaid info
    await db.collection(`users/${userId}/accounts`).doc(accountId).update({
      plaidAccountId,
      plaidItemId: itemId,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      currentBalance: newBalance,
      lastPlaidBalance: newBalance,
      lastBalanceSyncAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create a notification about balance change
    if (Math.abs(newBalance - oldBalance) > 0.01) {
      await db.collection(`users/${userId}/notifications`).add({
        type: 'balance_reconciliation',
        accountId,
        accountName: accountDoc.data().name,
        oldBalance,
        newBalance,
        difference: newBalance - oldBalance,
        message: `Your ${accountDoc.data().name} balance was updated from $${oldBalance.toFixed(2)} to $${newBalance.toFixed(2)} based on your bank.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    }

    functions.logger.info(`Linked account ${accountId} to Plaid account ${plaidAccountId}`, {
      oldBalance,
      newBalance,
      difference: newBalance - oldBalance,
    });

    return {
      success: true,
      oldBalance,
      newBalance,
      difference: newBalance - oldBalance,
    };
  } catch (error) {
    functions.logger.error('Error linking account to Plaid:', error);
    throw new functions.https.HttpsError('internal', 'Failed to link account', error.message);
  }
});

/**
 * Syncs transactions from Plaid with smart deduplication
 * @param {string} itemId - Plaid item ID
 * @param {string} accountId - Finch account ID
 * @param {string} startDate - (Optional) Start date for transaction sync (YYYY-MM-DD)
 * @param {string} endDate - (Optional) End date for transaction sync (YYYY-MM-DD)
 */
exports.syncTransactions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { itemId, accountId, startDate, endDate } = data;

  if (!itemId || !accountId) {
    throw new functions.https.HttpsError('invalid-argument', 'itemId and accountId are required');
  }

  try {
    const plaidClient = await getPlaidClient();
    // Get Plaid item
    const plaidItemDoc = await db.collection(`users/${userId}/plaidItems`).doc(itemId).get();
    if (!plaidItemDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Plaid item not found');
    }

    const encryptedAccessToken = plaidItemDoc.data().accessToken;
    const accessToken = decrypt(encryptedAccessToken);

    // Get account to find linkedAt timestamp
    const accountDoc = await db.collection(`users/${userId}/accounts`).doc(accountId).get();
    const linkedAt = accountDoc.data()?.linkedAt?.toDate();
    const plaidAccountId = accountDoc.data()?.plaidAccountId;

    if (!plaidAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'Account is not linked to Plaid');
    }

    // Default to last 2 years for pattern detection
    const end = endDate || toDateInputString(new Date());
    const start = startDate || (() => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return toDateInputString(twoYearsAgo);
    })();

    // Fetch transactions from Plaid
    let allTransactions = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const response = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: start,
        end_date: end,
        options: {
          account_ids: [plaidAccountId],
          count: 500,
          offset: offset,
          include_personal_finance_category: true,
        },
      });

      allTransactions = allTransactions.concat(response.data.transactions);
      hasMore = allTransactions.length < response.data.total_transactions;
      offset += response.data.transactions.length;
    }

    functions.logger.info(`Fetched ${allTransactions.length} transactions from Plaid`, { itemId, accountId });

    // Get existing transactions for deduplication
    const existingTransactionsSnapshot = await db.collection(`users/${userId}/transactions`)
      .where('accountId', '==', accountId)
      .get();

    const existingTransactions = existingTransactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    let newTransactionCount = 0;
    let deduplicatedCount = 0;
    const newTransactionsForNotification = []; // Collect new transactions for batched notification

    // Process each Plaid transaction
    for (const plaidTxn of allTransactions) {
      const txnDate = parseDateString(plaidTxn.date);
      const amount = -plaidTxn.amount; // Plaid uses negative for debits, we use positive for expenses

      // Check if this transaction already exists
      const existing = existingTransactions.find(t => t.plaidTransactionId === plaidTxn.transaction_id);

      if (existing) {
        // Update if pending status changed
        if (existing.isPending !== plaidTxn.pending) {
          await db.collection(`users/${userId}/transactions`).doc(existing.id).update({
            isPending: plaidTxn.pending,
          });
        }
        continue;
      }

      // Check for potential duplicate (same account, similar date/amount)
      const potentialDuplicate = existingTransactions.find(t => {
        if (t.plaidTransactionId || t.accountId !== accountId) return false;

        const existingDate = t.date?.toDate ? t.date.toDate() : parseDateString(t.date);
        if (!existingDate) return false;

        const daysDiff = Math.abs((txnDate - existingDate) / (1000 * 60 * 60 * 24));
        const amountDiff = Math.abs(t.amount - amount);

        return daysDiff <= 2 && amountDiff <= 1.0;
      });

      if (potentialDuplicate && potentialDuplicate.isRecurring) {
        // Mark recurring transaction as fulfilled
        await db.collection(`users/${userId}/transactions`).doc(potentialDuplicate.id).update({
          fulfilledRecurringId: plaidTxn.transaction_id,
          fulfilledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        deduplicatedCount++;
        functions.logger.info(`Deduplicated transaction ${plaidTxn.transaction_id} with recurring ${potentialDuplicate.id}`);
      }

      // Only store transactions dated after account link (but we fetched historical for pattern detection)
      if (linkedAt && txnDate >= linkedAt) {
        functions.logger.info(`Creating new transaction: ${plaidTxn.name} ($${amount})`);
        const newTransactionRef = await db.collection(`users/${userId}/transactions`).add({
          accountId,
          plaidTransactionId: plaidTxn.transaction_id,
          plaidCategory: plaidTxn.category ? plaidTxn.category.join(' > ') : null,
          plaidPersonalFinanceCategory: plaidTxn.personal_finance_category || null,
          merchantName: plaidTxn.merchant_name || plaidTxn.name,
          description: plaidTxn.name,
          amount,
          type: amount >= 0 ? 'income' : 'expense',
          category: mapPlaidCategoryToFinch(plaidTxn.personal_finance_category || plaidTxn.category),
          date: admin.firestore.Timestamp.fromDate(txnDate),
          isPending: plaidTxn.pending,
          source: 'plaid',
          isRecurring: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        newTransactionCount++;
        functions.logger.info(`✅ Transaction created with ID: ${newTransactionRef.id}, isPending: ${plaidTxn.pending}`);

        // Collect posted transactions for batched notification
        if (!plaidTxn.pending) {
          newTransactionsForNotification.push({
            id: newTransactionRef.id,
            merchantName: plaidTxn.merchant_name || plaidTxn.name,
            amount: amount,
            type: amount >= 0 ? 'income' : 'expense',
          });
        }
      }
    }

    // Send batched notification or queue for morning
    if (newTransactionsForNotification.length > 0) {
      try {
        // Get user's timezone (default to Eastern)
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const userTimezone = userData?.timezone || 'America/New_York';

        if (isInActiveHours(userTimezone)) {
          // SEND IMMEDIATELY (7:30 AM - 10 PM) - Batched
          functions.logger.info(`Sending batched immediate notification for ${newTransactionsForNotification.length} transactions`);
          await sendImmediateTransactionNotification(
            userId,
            accountId,
            newTransactionsForNotification, // Pass array for batching
            null
          );
        } else {
          // QUEUE FOR 7:30 AM - Queue each transaction
          functions.logger.info(`Queuing ${newTransactionsForNotification.length} notifications for 7:30 AM`);
          for (const txn of newTransactionsForNotification) {
            await db.collection(`users/${userId}/pendingNotifications`).add({
              transactionId: txn.id,
              accountId: accountId,
              accountName: accountDoc.data().name,
              merchantName: txn.merchantName,
              amount: txn.amount,
              type: txn.type,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              scheduledFor: getNext730AM(userTimezone),
              userTimezone: userTimezone,
              processed: false,
            });
          }
        }
      } catch (notificationError) {
        functions.logger.error('Error handling batched notification:', notificationError);
        // Don't fail the entire sync if notification fails
      }
    }

    // Update last synced timestamp
    await db.collection(`users/${userId}/plaidItems`).doc(itemId).update({
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update account balance from Plaid
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });
    const plaidAccount = balanceResponse.data.accounts.find(acc => acc.account_id === plaidAccountId);
    if (plaidAccount) {
      const newBalance = plaidAccount.balances.current || plaidAccount.balances.available || 0;
      await db.collection(`users/${userId}/accounts`).doc(accountId).update({
        currentBalance: newBalance,
        lastPlaidBalance: newBalance,
        lastBalanceSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    functions.logger.info(`Sync complete: ${newTransactionCount} new, ${deduplicatedCount} deduplicated`, {
      itemId,
      accountId,
    });

    return {
      success: true,
      transactionCount: newTransactionCount,
      deduplicatedCount,
      totalFetched: allTransactions.length,
    };
  } catch (error) {
    functions.logger.error('Error syncing transactions:', error);
    throw new functions.https.HttpsError('internal', 'Failed to sync transactions', error.message);
  }
});

/**
 * Identifies recurring transactions from Plaid historical data
 * @param {string} itemId - Plaid item ID
 * @param {string} accountId - Finch account ID
 */
exports.identifyRecurringTransactions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { itemId, accountId } = data;

  if (!itemId || !accountId) {
    throw new functions.https.HttpsError('invalid-argument', 'itemId and accountId are required');
  }

  try {
    const plaidClient = await getPlaidClient();
    // Get Plaid item
    const plaidItemDoc = await db.collection(`users/${userId}/plaidItems`).doc(itemId).get();
    if (!plaidItemDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Plaid item not found');
    }

    const encryptedAccessToken = plaidItemDoc.data().accessToken;
    const accessToken = decrypt(encryptedAccessToken);
    const accountDoc = await db.collection(`users/${userId}/accounts`).doc(accountId).get();
    const plaidAccountId = accountDoc.data()?.plaidAccountId;

    // Fetch 2 years of transactions for pattern detection
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const start = toDateInputString(twoYearsAgo);
    const end = toDateInputString(new Date());

    let allTransactions = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const response = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: start,
        end_date: end,
        options: {
          account_ids: [plaidAccountId],
          count: 500,
          offset: offset,
          include_personal_finance_category: true,
        },
      });

      allTransactions = allTransactions.concat(response.data.transactions);
      hasMore = allTransactions.length < response.data.total_transactions;
      offset += response.data.transactions.length;
    }

    // Group transactions by merchant/description
    const groupedByMerchant = {};

    allTransactions.forEach(txn => {
      const key = (txn.merchant_name || txn.name).toLowerCase().trim();
      if (!groupedByMerchant[key]) {
        groupedByMerchant[key] = [];
      }
      groupedByMerchant[key].push(txn);
    });

    const recurringPatterns = [];

    // Analyze each group for recurring patterns
    for (const [merchant, transactions] of Object.entries(groupedByMerchant)) {
      if (transactions.length < 2) continue; // Need at least 2 occurrences

      // Sort by date
      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate average amount (handle variable bills)
      const amounts = transactions.map(t => Math.abs(t.amount));
      const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const amountVariance = amounts.reduce((sum, amt) => sum + Math.abs(amt - avgAmount), 0) / amounts.length;
      const isVariableAmount = (amountVariance / avgAmount) > 0.1; // 10% variance threshold

      // Calculate intervals between transactions
      const intervals = [];
      for (let i = 1; i < transactions.length; i++) {
        const days = (new Date(transactions[i].date) - new Date(transactions[i - 1].date)) / (1000 * 60 * 60 * 24);
        intervals.push(days);
      }

      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

      // Determine frequency
      let frequency = null;
      let confidenceScore = 0;

      if (avgInterval >= 330 && avgInterval <= 395) {
        // Annual (e.g., Prime membership)
        if (transactions.length >= 2) {
          frequency = 'yearly';
          confidenceScore = 0.85;
        }
      } else if (avgInterval >= 28 && avgInterval <= 31) {
        // Monthly
        if (transactions.length >= 3) {
          frequency = 'monthly';
          confidenceScore = transactions.length >= 6 ? 0.95 : 0.80;
        }
      } else if (avgInterval >= 13 && avgInterval <= 15) {
        // Biweekly
        if (transactions.length >= 4) {
          frequency = 'biweekly';
          confidenceScore = 0.90;
        }
      } else if (avgInterval >= 6 && avgInterval <= 8) {
        // Weekly
        if (transactions.length >= 4) {
          frequency = 'weekly';
          confidenceScore = 0.90;
        }
      }

      if (frequency && confidenceScore >= 0.75) {
        // Calculate next occurrence date
        const lastDate = new Date(transactions[transactions.length - 1].date);
        const nextDate = new Date(lastDate);

        switch (frequency) {
          case 'weekly':
            nextDate.setDate(lastDate.getDate() + 7);
            break;
          case 'biweekly':
            nextDate.setDate(lastDate.getDate() + 14);
            break;
          case 'monthly':
            nextDate.setMonth(lastDate.getMonth() + 1);
            break;
          case 'yearly':
            nextDate.setFullYear(lastDate.getFullYear() + 1);
            break;
        }

        recurringPatterns.push({
          merchant: transactions[0].merchant_name || transactions[0].name,
          amount: -avgAmount, // Convert back to our sign convention
          frequency,
          confidenceScore,
          occurrenceCount: transactions.length,
          isVariableAmount,
          nextDate: toDateInputString(nextDate),
          category: mapPlaidCategoryToFinch(transactions[0].personal_finance_category || transactions[0].category),
        });

        functions.logger.info(`Detected recurring pattern: ${merchant} (${frequency})`, {
          occurrences: transactions.length,
          confidence: confidenceScore,
        });
      }
    }

    // Check if recurring transactions already exist in Finch before creating
    const existingRecurringSnapshot = await db.collection(`users/${userId}/transactions`)
      .where('accountId', '==', accountId)
      .where('isRecurring', '==', true)
      .get();

    const existingRecurring = existingRecurringSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    let createdCount = 0;

    for (const pattern of recurringPatterns) {
      // Check if similar recurring transaction already exists
      const alreadyExists = existingRecurring.some(existing => {
        const descMatch = existing.description?.toLowerCase().includes(pattern.merchant.toLowerCase()) ||
                          pattern.merchant.toLowerCase().includes(existing.description?.toLowerCase());
        const amountMatch = Math.abs(existing.amount - pattern.amount) <= 1.0;
        const freqMatch = existing.recurringDetails?.frequency === pattern.frequency;
        return descMatch && amountMatch && freqMatch;
      });

      if (!alreadyExists) {
        await db.collection(`users/${userId}/transactions`).add({
          accountId,
          description: pattern.merchant,
          amount: pattern.amount,
          type: pattern.amount >= 0 ? 'income' : 'expense',
          category: pattern.category,
          isRecurring: true,
          recurringDetails: {
            frequency: pattern.frequency,
            nextDate: admin.firestore.Timestamp.fromDate(parseDateString(pattern.nextDate)),
            isVariableAmount: pattern.isVariableAmount,
            detectedFromPlaid: true,
            confidenceScore: pattern.confidenceScore,
            occurrenceCount: pattern.occurrenceCount,
          },
          source: 'plaid_recurring_detection',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        createdCount++;
      }
    }

    functions.logger.info(`Recurring detection complete: ${recurringPatterns.length} patterns found, ${createdCount} created`, {
      itemId,
      accountId,
    });

    return {
      success: true,
      patternsFound: recurringPatterns.length,
      recurringCreated: createdCount,
      patterns: recurringPatterns,
    };
  } catch (error) {
    functions.logger.error('Error identifying recurring transactions:', error);
    throw new functions.https.HttpsError('internal', 'Failed to identify recurring transactions', error.message);
  }
});

/**
 * Fetches recurring transactions from Plaid's Recurring Transactions API
 * Uses Plaid's built-in detection with confidence scores
 * @param {string} itemId - Plaid item ID
 * @param {string} accountId - Finch account ID
 */
exports.fetchPlaidRecurringTransactions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { itemId, accountId } = data;

  if (!itemId || !accountId) {
    throw new functions.https.HttpsError('invalid-argument', 'itemId and accountId are required');
  }

  try {
    const plaidClient = await getPlaidClient();
    // Get Plaid item
    const plaidItemDoc = await db.collection(`users/${userId}/plaidItems`).doc(itemId).get();
    if (!plaidItemDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Plaid item not found');
    }

    const encryptedAccessToken = plaidItemDoc.data().accessToken;
    const accessToken = decrypt(encryptedAccessToken);
    const accountDoc = await db.collection(`users/${userId}/accounts`).doc(accountId).get();
    const plaidAccountId = accountDoc.data()?.plaidAccountId;

    if (!plaidAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'Account not linked to Plaid');
    }

    // Fetch recurring transactions from Plaid API
    const response = await plaidClient.transactionsRecurringGet({
      access_token: accessToken,
      account_ids: [plaidAccountId],
    });

    functions.logger.info(`Fetched recurring transactions from Plaid API`, {
      inflowCount: response.data.inflow_streams.length,
      outflowCount: response.data.outflow_streams.length,
    });

    // Process both inflow (income) and outflow (expenses) streams
    const allStreams = [
      ...response.data.inflow_streams.map(s => ({ ...s, is_income: true })),
      ...response.data.outflow_streams.map(s => ({ ...s, is_income: false })),
    ];

    // Get existing recurring transactions to avoid duplicates
    const existingRecurringSnapshot = await db.collection(`users/${userId}/transactions`)
      .where('accountId', '==', accountId)
      .where('isRecurring', '==', true)
      .get();

    const existingRecurring = existingRecurringSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    let autoAddedCount = 0;
    let needsConfirmationCount = 0;
    const needsConfirmation = [];

    for (const stream of allStreams) {
      // Skip inactive streams
      if (!stream.is_active) continue;

      // Calculate confidence score
      // Plaid provides is_active, but we'll create our own score based on various factors
      let confidence = 0.5; // Base confidence

      // Higher confidence for active streams
      if (stream.is_active) confidence += 0.3;

      // Higher confidence for more occurrences
      const txnCount = stream.transaction_ids?.length || 0;
      if (txnCount >= 6) confidence += 0.2;
      else if (txnCount >= 3) confidence += 0.1;

      // Adjust based on frequency consistency
      if (stream.frequency === 'MONTHLY' || stream.frequency === 'BIWEEKLY') {
        confidence += 0.1;
      }

      // Cap at 0.95
      confidence = Math.min(confidence, 0.95);

      // Calculate average amount
      const avgAmount = stream.average_amount?.amount || 0;
      const amount = stream.is_income ? Math.abs(avgAmount) : -Math.abs(avgAmount);

      // Map Plaid frequency to our format
      const frequencyMap = {
        'WEEKLY': 'weekly',
        'BIWEEKLY': 'biweekly',
        'SEMI_MONTHLY': 'biweekly', // Approximate
        'MONTHLY': 'monthly',
        'ANNUALLY': 'yearly',
      };
      const frequency = frequencyMap[stream.frequency] || 'monthly';

      // Calculate next occurrence date
      const lastDate = stream.last_date ? new Date(stream.last_date) : new Date();
      const nextDate = new Date(lastDate);

      switch (frequency) {
        case 'weekly':
          nextDate.setDate(lastDate.getDate() + 7);
          break;
        case 'biweekly':
          nextDate.setDate(lastDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate.setMonth(lastDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDate.setFullYear(lastDate.getFullYear() + 1);
          break;
      }

      // Check if similar recurring transaction already exists
      const alreadyExists = existingRecurring.some(existing => {
        const descMatch = existing.description?.toLowerCase().includes(stream.description?.toLowerCase()) ||
                          stream.description?.toLowerCase().includes(existing.description?.toLowerCase());
        const amountMatch = Math.abs(existing.amount - amount) <= 5.0; // $5 tolerance for variable bills
        const freqMatch = existing.recurringDetails?.frequency === frequency;
        return descMatch && amountMatch && freqMatch;
      });

      if (alreadyExists) {
        functions.logger.info(`Skipping duplicate recurring transaction: ${stream.description}`);
        continue;
      }

      // Log raw Plaid category data for debugging
      // Plaid now uses personal_finance_category instead of deprecated category field
      const categoryData = stream.personal_finance_category || stream.category;
      const mappedCategory = mapPlaidCategoryToFinch(categoryData);
      functions.logger.info(`Category mapping for ${stream.description}:`, {
        rawPlaidCategory: stream.category, // Old deprecated field
        personalFinanceCategory: stream.personal_finance_category, // New field
        mappedFinchCategory: mappedCategory,
        merchantName: stream.merchant_name,
      });

      const recurringData = {
        accountId,
        description: stream.description || stream.merchant_name || 'Unknown',
        merchantName: stream.merchant_name,
        amount,
        type: stream.is_income ? 'income' : 'expense',
        category: stream.is_income ? null : mappedCategory, // Don't categorize income transactions
        isRecurring: true,
        recurringDetails: {
          frequency,
          nextDate: admin.firestore.Timestamp.fromDate(nextDate),
          isVariableAmount: stream.average_amount?.iso_currency_code !== stream.last_amount?.iso_currency_code, // Simplified check
          detectedFromPlaid: true,
          plaidStreamId: stream.stream_id,
          confidenceScore: confidence,
          occurrenceCount: txnCount,
          firstDate: stream.first_date ? admin.firestore.Timestamp.fromDate(new Date(stream.first_date)) : null,
          lastDate: stream.last_date ? admin.firestore.Timestamp.fromDate(new Date(stream.last_date)) : null,
        },
        source: 'plaid_recurring_api',
        plaidConfirmed: false, // User hasn't confirmed yet
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Auto-add high confidence (>= 80%), ask user to confirm medium confidence (50-80%)
      if (confidence >= 0.8) {
        // Auto-add with confirmed status
        await db.collection(`users/${userId}/transactions`).add({
          ...recurringData,
          plaidConfirmed: true,
        });
        autoAddedCount++;

        functions.logger.info(`Auto-added high-confidence recurring: ${stream.description}`, {
          confidence,
          frequency,
        });
      } else if (confidence >= 0.5) {
        // Add to pending confirmation list
        needsConfirmation.push({
          ...recurringData,
          confidence, // Include for UI display
        });
        needsConfirmationCount++;

        functions.logger.info(`Needs confirmation: ${stream.description}`, {
          confidence,
          frequency,
        });
      }
    }

    // Store transactions that need confirmation temporarily
    // We'll create them as "unconfirmed" and the UI will let user review
    for (const pending of needsConfirmation) {
      await db.collection(`users/${userId}/pendingRecurringTransactions`).add(pending);
    }

    functions.logger.info(`Plaid recurring API complete`, {
      autoAdded: autoAddedCount,
      needsConfirmation: needsConfirmationCount,
      totalStreams: allStreams.length,
    });

    return {
      success: true,
      autoAddedCount,
      needsConfirmationCount,
      totalStreams: allStreams.length,
      needsConfirmation: needsConfirmation.map(t => ({
        description: t.description,
        amount: t.amount,
        frequency: t.recurringDetails.frequency,
        confidence: t.confidence,
      })),
    };
  } catch (error) {
    functions.logger.error('Error fetching Plaid recurring transactions:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch recurring transactions', error.message);
  }
});

// ============================================================================
// SMART NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send immediate transaction notification (during active hours 7:30 AM - 10 PM)
 * Supports both single transaction and batched multiple transactions
 */
async function sendImmediateTransactionNotification(userId, accountId, transactions, currentBalance) {
  const { calculateProjections, getAvailableToSpend } = require('./projection');

  try {
    // Support both single transaction (legacy) and array of transactions (batched)
    const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
    const isBatched = transactionArray.length > 1;

    // Get user's FCM tokens and preferences
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const fcmTokens = userData?.fcmTokens || [];

    if (fcmTokens.length === 0) {
      functions.logger.info('No FCM tokens found for user, skipping notification');
      return;
    }

    // Check user notification preferences
    const preferencesDoc = await db.collection('users').doc(userId).collection('preferences').doc('settings').get();
    const preferences = preferencesDoc.exists ? preferencesDoc.data() : {};

    // Check master toggle
    if (preferences.notificationsEnabled === false) {
      functions.logger.info('Notifications disabled by user preference');
      return;
    }

    // Check granular preferences
    const hasIncome = transactionArray.some(t => t.type === 'income');
    const hasExpense = transactionArray.some(t => t.type === 'expense');

    if (hasIncome && preferences.paycheckNotifications === false && !hasExpense) {
      functions.logger.info('Paycheck notifications disabled by user preference');
      return;
    }

    if (hasExpense && preferences.transactionNotifications === false && !hasIncome) {
      functions.logger.info('Transaction notifications disabled by user preference');
      return;
    }

    // Calculate available to spend
    const accountDoc = await db.collection(`users/${userId}/accounts`).doc(accountId).get();
    const account = { id: accountId, ...accountDoc.data() };

    const transactionsSnapshot = await db
      .collection(`users/${userId}/transactions`)
      .where('accountId', '==', accountId)
      .get();
    const allTransactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Run 60-day projection
    const projections = calculateProjections([account], allTransactions, 60);
    const accountProjections = projections.find(p => p.accountId === accountId)?.projections;
    const lowestBalance = accountProjections ? getAvailableToSpend(accountProjections) : account.currentBalance;

    // Get goal allocations for this account
    const goalsSnapshot = await db.collection(`users/${userId}/goals`)
      .where('accountId', '==', accountId)
      .get();
    const totalGoalAllocations = goalsSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().allocatedAmount || 0);
    }, 0);

    // Calculate true Available to Spend = Lowest Balance - Cushion - Goal Allocations
    const availableToSpend = lowestBalance - (account.cushion || 0) - totalGoalAllocations;

    // Get upcoming bills (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingBills = allTransactions.filter(t => {
      if (!t.isRecurring || !t.recurringDetails?.nextDate || t.amount >= 0) return false;
      const nextDate = t.recurringDetails.nextDate.toDate
        ? t.recurringDetails.nextDate.toDate()
        : new Date(t.recurringDetails.nextDate);
      return nextDate <= nextWeek;
    });

    // Build notification based on available balance and transaction type
    let title, body, priority;

    // BATCHED TRANSACTIONS (multiple transactions)
    if (isBatched) {
      const count = transactionArray.length;
      const totalAmount = transactionArray.reduce((sum, t) => sum + t.amount, 0);

      // Calculate net impact
      const netImpact = Math.abs(totalAmount);
      const isNetIncome = totalAmount > 0;

      functions.logger.info(`Batching ${count} transactions, net impact: ${formatCurrency(totalAmount)}`);

      if (isNetIncome) {
        // Net positive (more income than expenses)
        priority = 'default';
        title = `💰 ${account.name}`;
        body = `${count} transactions occurred\n` +
               `Net: +${formatCurrency(netImpact)}\n` +
               `Available to spend: ${formatCurrency(availableToSpend)} ✓`;
      } else {
        // Net negative (expenses)
        if (availableToSpend < 100) {
          priority = 'high';
          title = `🔴 LOW BALANCE ALERT`;
          body = `${account.name} • ${count} transactions occurred\n` +
                 `Spent: ${formatCurrency(netImpact)} • Available: ${formatCurrency(availableToSpend)}`;

          if (upcomingBills.length > 0) {
            const nextBill = upcomingBills[0];
            const billDate = nextBill.recurringDetails.nextDate.toDate
              ? nextBill.recurringDetails.nextDate.toDate()
              : new Date(nextBill.recurringDetails.nextDate);
            const dayOfWeek = billDate.toLocaleDateString('en-US', { weekday: 'long' });
            body += `\nUpcoming: ${nextBill.description} (${formatCurrency(Math.abs(nextBill.amount))}) due ${dayOfWeek}`;
          }
        } else if (availableToSpend < 250) {
          priority = 'default';
          title = `⚠️ ${account.name}`;
          body = `${count} transactions occurred • ${formatCurrency(netImpact)} spent\n` +
                 `Available: ${formatCurrency(availableToSpend)} (Getting low)`;
        } else {
          priority = 'default';
          title = `${account.name}`;
          body = `${count} transactions occurred • ${formatCurrency(netImpact)} spent\n` +
                 `Available: ${formatCurrency(availableToSpend)} ✓`;
        }
      }
    }
    // SINGLE TRANSACTION (original behavior)
    else {
      const transaction = transactionArray[0];

      // INCOME (Paycheck detection)
      if (transaction.type === 'income') {
        priority = 'default';
        title = `💰 ${account.name} • ${transaction.merchantName}`;
        body = `${formatCurrency(transaction.amount)} deposited\n` +
               `Available to spend: ${formatCurrency(availableToSpend)} ✓`;
      }
      // EXPENSE - Critical (< $100 available)
      else if (availableToSpend < 100) {
        priority = 'high';
        title = `🔴 LOW BALANCE ALERT`;
        body = `${account.name} • ${transaction.merchantName}\n` +
               `${formatCurrency(Math.abs(transaction.amount))} • Available: ${formatCurrency(availableToSpend)}`;

        if (upcomingBills.length > 0) {
          const nextBill = upcomingBills[0];
          const billDate = nextBill.recurringDetails.nextDate.toDate
            ? nextBill.recurringDetails.nextDate.toDate()
            : new Date(nextBill.recurringDetails.nextDate);
          const dayOfWeek = billDate.toLocaleDateString('en-US', { weekday: 'long' });
          body += `\nUpcoming: ${nextBill.description} (${formatCurrency(Math.abs(nextBill.amount))}) due ${dayOfWeek}`;
        }
      }
      // EXPENSE - Warning ($100-$250 available)
      else if (availableToSpend < 250) {
        priority = 'default';
        title = `⚠️ ${account.name} • ${transaction.merchantName}`;
        body = `${formatCurrency(Math.abs(transaction.amount))} • Available: ${formatCurrency(availableToSpend)} (Getting low)`;
      }
      // EXPENSE - Healthy (> $250 available)
      else {
        priority = 'default';
        title = `${account.name} • ${transaction.merchantName}`;
        body = `${formatCurrency(Math.abs(transaction.amount))} • Available: ${formatCurrency(availableToSpend)} ✓`;
      }
    }

    // Send notification using modern FCM HTTP v1 API
    // Send to each token individually (best practice for error handling)
    const sendPromises = fcmTokens.map(async (token) => {
      const message = {
        token: token,
        notification: {
          title,
          body,
        },
        data: {
          type: isBatched ? 'batched_transactions' : 'new_transaction',
          transactionCount: transactionArray.length.toString(),
          accountId: accountId,
          availableToSpend: availableToSpend.toString(),
        },
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: 'default',
            channelId: priority === 'high' ? 'critical_alerts' : 'transactions',
          },
        },
      };

      try {
        const result = await admin.messaging().send(message);
        functions.logger.info(`✅ Sent ${isBatched ? 'batched' : 'single'} notification`, {
          messageId: result,
          transactionCount: transactionArray.length,
          availableToSpend,
          priority
        });
        return { success: true, messageId: result };
      } catch (error) {
        // If token is invalid, remove it from user's fcmTokens array
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
          functions.logger.warn(`Removing invalid FCM token: ${token.substring(0, 20)}...`);
          await db.collection('users').doc(userId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
          });
        }
        functions.logger.error(`Failed to send to token: ${error.message}`);
        return { success: false, error: error.message };
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    functions.logger.error('Error sending immediate notification:', error);
  }
}

/**
 * Send batched morning notification summarizing overnight transactions
 */
async function sendBatchedMorningNotification(userId, notifications) {
  const { calculateProjections, getAvailableToSpend } = require('./projection');

  try {
    // Get user's FCM tokens and preferences
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const fcmTokens = userData?.fcmTokens || [];

    if (fcmTokens.length === 0) return;

    // Check user notification preferences
    const preferencesDoc = await db.collection('users').doc(userId).collection('preferences').doc('settings').get();
    const preferences = preferencesDoc.exists ? preferencesDoc.data() : {};

    // Check master toggle
    if (preferences.notificationsEnabled === false) {
      functions.logger.info('Morning notifications disabled by user preference');
      return;
    }

    // Check if morning summaries are enabled
    if (preferences.morningSummaries === false) {
      functions.logger.info('Morning summaries disabled by user preference');
      return;
    }

    // Sort by timestamp (oldest first)
    notifications.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

    // Get the account from the LAST transaction (most recent balance)
    const lastNotification = notifications[notifications.length - 1];
    const accountId = lastNotification.accountId;

    // Calculate current available to spend
    const accountDoc = await db.collection(`users/${userId}/accounts`).doc(accountId).get();
    const account = { id: accountId, ...accountDoc.data() };

    const transactionsSnapshot = await db
      .collection(`users/${userId}/transactions`)
      .where('accountId', '==', accountId)
      .get();
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const projections = calculateProjections([account], transactions, 60);
    const accountProjections = projections.find(p => p.accountId === accountId)?.projections;
    const availableToSpend = getAvailableToSpend(accountProjections);

    // Get upcoming bills
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingBills = transactions.filter(t => {
      if (!t.isRecurring || !t.recurringDetails?.nextDate || t.amount >= 0) return false;
      const nextDate = t.recurringDetails.nextDate.toDate
        ? t.recurringDetails.nextDate.toDate()
        : new Date(t.recurringDetails.nextDate);
      return nextDate <= nextWeek;
    });

    // Build batched notification
    let title, body, priority;

    const count = notifications.length;
    const hasIncome = notifications.some(n => n.type === 'income');

    // Single transaction
    if (count === 1) {
      const notif = notifications[0];

      if (notif.type === 'income') {
        title = `🌅 💰 Good morning!`;
        body = `${notif.merchantName} • ${formatCurrency(notif.amount)} deposited\n` +
               `Available to spend: ${formatCurrency(availableToSpend)} ✓`;
      } else {
        title = `🌅 Good morning!`;
        body = `1 transaction while you were away\n\n` +
               `${notif.merchantName} • ${formatCurrency(Math.abs(notif.amount))}\n`;

        if (availableToSpend < 100) {
          priority = 'high';
          body += `🔴 Available: ${formatCurrency(availableToSpend)} (Critical!)`;
        } else if (availableToSpend < 250) {
          body += `⚠️ Available: ${formatCurrency(availableToSpend)} (Getting low)`;
        } else {
          body += `Available: ${formatCurrency(availableToSpend)} ✓`;
        }
      }
    }
    // Multiple transactions
    else {
      title = hasIncome ? `🌅 💰 Good morning!` : `🌅 Good morning!`;
      body = `${count} transactions while you were away\n\n`;

      // List first 3 transactions
      const toShow = notifications.slice(0, 3);
      const transactionList = toShow.map(n => {
        const prefix = n.type === 'income' ? '+' : '';
        return `${n.merchantName} (${prefix}${formatCurrency(n.amount)})`;
      }).join(', ');

      body += transactionList;

      if (count > 3) {
        body += `, +${count - 3} more`;
      }

      body += '\n';

      // Available to spend
      if (availableToSpend < 100) {
        priority = 'high';
        body += `🔴 Available: ${formatCurrency(availableToSpend)} (Critical!)`;
      } else if (availableToSpend < 250) {
        body += `⚠️ Available: ${formatCurrency(availableToSpend)} (Getting low)`;
      } else {
        body += `Available: ${formatCurrency(availableToSpend)} ${hasIncome ? '(Great!)' : '✓'}`;
      }
    }

    // Add upcoming bill if low balance
    if (availableToSpend < 250 && upcomingBills.length > 0) {
      const nextBill = upcomingBills[0];
      const billDate = nextBill.recurringDetails.nextDate.toDate
        ? nextBill.recurringDetails.nextDate.toDate()
        : new Date(nextBill.recurringDetails.nextDate);
      const dayOfWeek = billDate.toLocaleDateString('en-US', { weekday: 'long' });
      body += `\nUpcoming: ${nextBill.description} (${formatCurrency(Math.abs(nextBill.amount))}) due ${dayOfWeek}`;
    }

    // Send notification
    await admin.messaging().sendToDevice(fcmTokens, {
      notification: { title, body },
      data: {
        type: 'batched_morning_summary',
        transactionCount: count.toString(),
        accountId: accountId,
        availableToSpend: availableToSpend.toString(),
      },
      android: {
        priority: priority || 'default',
        channelId: 'morning_summary',
      },
    });

    functions.logger.info(`✅ Sent batched morning notification to user ${userId}`, {
      transactionCount: count,
      availableToSpend,
    });
  } catch (error) {
    functions.logger.error('Error sending batched morning notification:', error);
  }
}

/**
 * Verify Plaid webhook signature using JWT
 */
async function verifyPlaidWebhook(req) {
  const verificationHeader = req.headers['plaid-verification'];

  if (!verificationHeader) {
    functions.logger.error('Plaid webhook: Missing Plaid-Verification header');
    return false;
  }

  try {
    const plaidClient = await getPlaidClient();
    const jwt = require('jsonwebtoken');

    // Get the webhook verification key ID from the JWT header (without verification)
    const decodedHeader = jwt.decode(verificationHeader, { complete: true });

    if (!decodedHeader || !decodedHeader.header.kid) {
      functions.logger.error('Plaid webhook: Invalid JWT or missing key ID');
      return false;
    }

    const keyId = decodedHeader.header.kid;
    functions.logger.info('Plaid webhook: Fetching verification key', { keyId });

    // Fetch the current public key from Plaid
    const keyResponse = await plaidClient.webhookVerificationKeyGet({ key_id: keyId });

    if (!keyResponse || !keyResponse.data || !keyResponse.data.key) {
      functions.logger.error('Plaid webhook: Failed to fetch verification key');
      return false;
    }

    const publicKey = keyResponse.data.key.key;
    functions.logger.info('Plaid webhook: Verifying JWT signature');

    // Verify the JWT signature using Plaid's public key
    const verified = jwt.verify(verificationHeader, publicKey, {
      algorithms: ['ES256'], // Plaid uses ES256 (ECDSA with SHA-256)
    });

    functions.logger.info('Plaid webhook signature verified successfully', {
      keyId,
      webhookType: verified.request_body_sha256 ? 'valid' : 'missing_body_hash',
    });

    // Optionally: Verify the request body hash matches (extra security)
    if (verified.request_body_sha256) {
      const crypto = require('crypto');
      const bodyString = JSON.stringify(req.body);
      const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex');

      if (bodyHash !== verified.request_body_sha256) {
        functions.logger.error('Plaid webhook: Body hash mismatch');
        return false;
      }
    }

    return true;
  } catch (error) {
    functions.logger.error('Plaid webhook verification error:', error);
    return false;
  }
}

/**
 * Webhook endpoint for Plaid real-time notifications
 */
exports.plaidWebhook = functions.https.onRequest(async (req, res) => {
  // SECURITY: Verify webhook signature
  const isValid = await verifyPlaidWebhook(req);
  if (!isValid) {
    functions.logger.error('Plaid webhook: Signature verification failed');
    return res.status(401).send('Unauthorized - Invalid signature');
  }

  const { webhook_type, webhook_code, item_id } = req.body;

  functions.logger.info(`Plaid webhook received: ${webhook_type} - ${webhook_code}`, { item_id });

  try {
    if (webhook_type === 'TRANSACTIONS') {
      if (webhook_code === 'DEFAULT_UPDATE' || webhook_code === 'INITIAL_UPDATE') {
        // Look up user and account from mapping collection
        // This avoids the problematic collection group query
        const mappingDoc = await db.collection('plaidItemsMap').doc(item_id).get();

        if (!mappingDoc.exists) {
          functions.logger.warn(`Plaid item ${item_id} not found in plaidItemsMap`);
          res.status(200).send('OK');
          return;
        }

        const { userId, accountId } = mappingDoc.data();

        if (userId && accountId) {

          functions.logger.info(`Triggering background sync for item ${item_id}, account ${accountId}`);

          // Create a Cloud Task to process the sync asynchronously
          // This prevents webhook timeout and ensures reliable processing
          const queuePath = tasksClient.queuePath(project, location, queue);

          const url = `https://${location}-${project}.cloudfunctions.net/processSyncTask`;
          const payload = JSON.stringify({
            userId,
            itemId: item_id,
            accountId,
          });

          const task = {
            httpRequest: {
              httpMethod: 'POST',
              url,
              headers: {
                'Content-Type': 'application/json',
              },
              body: Buffer.from(payload).toString('base64'),
            },
          };

          try {
            await tasksClient.createTask({ parent: queuePath, task });
            functions.logger.info(`Created sync task for account ${accountId}`);
          } catch (taskError) {
            functions.logger.error('Failed to create sync task:', taskError);
            // Don't fail the webhook - we'll sync next time
          }
        }
      }
    } else if (webhook_type === 'ITEM') {
      if (webhook_code === 'ERROR' || webhook_code === 'PENDING_EXPIRATION') {
        // Update item status using mapping collection
        const mappingDoc = await db.collection('plaidItemsMap').doc(item_id).get();

        if (mappingDoc.exists) {
          const { userId } = mappingDoc.data();
          await db.collection(`users/${userId}/plaidItems`).doc(item_id).update({
            status: 'login_required',
          });
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    functions.logger.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Process sync task triggered by Cloud Tasks from webhook
 * This runs asynchronously to avoid webhook timeouts
 */
exports.processSyncTask = functions.https.onRequest(async (req, res) => {
  try {
    // SECURITY: Verify Firebase Authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      functions.logger.error('Unauthorized request - No authentication token provided');
      res.status(401).json({ error: 'Unauthorized - Authentication required' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    let authenticatedUserId;

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      authenticatedUserId = decodedToken.uid;
    } catch (error) {
      functions.logger.error('Invalid authentication token:', error);
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
      return;
    }

    const { userId, itemId, accountId } = req.body;

    if (!userId || !itemId || !accountId) {
      functions.logger.error('Missing required parameters in sync task');
      res.status(400).send('Bad Request');
      return;
    }

    // SECURITY: Verify the authenticated user matches the requested userId
    if (authenticatedUserId !== userId) {
      functions.logger.error(`Forbidden - User ${authenticatedUserId} attempted to access data for user ${userId}`);
      res.status(403).json({ error: 'Forbidden - Access denied' });
      return;
    }

    functions.logger.info(`Processing sync task for user ${userId}, account ${accountId}`);

    const plaidClient = await getPlaidClient();
    // Get Plaid item
    const plaidItemDoc = await db.collection(`users/${userId}/plaidItems`).doc(itemId).get();
    if (!plaidItemDoc.exists) {
      functions.logger.warn(`Plaid item ${itemId} not found`);
      res.status(404).send('Not Found');
      return;
    }

    const encryptedAccessToken = plaidItemDoc.data().accessToken;
    const accessToken = decrypt(encryptedAccessToken);

    // Get account to find plaidAccountId and linkedAt
    const accountDoc = await db.collection(`users/${userId}/accounts`).doc(accountId).get();
    if (!accountDoc.exists) {
      functions.logger.warn(`Account ${accountId} not found`);
      res.status(404).send('Not Found');
      return;
    }

    const linkedAt = accountDoc.data()?.linkedAt?.toDate();
    const plaidAccountId = accountDoc.data()?.plaidAccountId;

    if (!plaidAccountId) {
      functions.logger.warn(`Account ${accountId} is not linked to Plaid`);
      res.status(400).send('Account not linked');
      return;
    }

    // Sync transactions (last 30 days for real-time updates)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const start = toDateInputString(thirtyDaysAgo);
    const end = toDateInputString(today);

    let allTransactions = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const response = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: start,
        end_date: end,
        options: {
          account_ids: [plaidAccountId],
          count: 500,
          offset: offset,
          include_personal_finance_category: true,
        },
      });

      allTransactions = allTransactions.concat(response.data.transactions);
      hasMore = allTransactions.length < response.data.total_transactions;
      offset += response.data.transactions.length;
    }

    functions.logger.info(`Fetched ${allTransactions.length} transactions from webhook sync`);

    // Get existing transactions for deduplication
    const existingTransactionsSnapshot = await db.collection(`users/${userId}/transactions`)
      .where('accountId', '==', accountId)
      .get();

    const existingTransactions = existingTransactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    let newTransactionCount = 0;
    const newTransactionsForNotification = []; // Collect new transactions for batched notification

    // Process each Plaid transaction
    for (const plaidTxn of allTransactions) {
      const txnDate = parseDateString(plaidTxn.date);
      const amount = -plaidTxn.amount;

      // Check if this transaction already exists
      const existing = existingTransactions.find(t => t.plaidTransactionId === plaidTxn.transaction_id);

      if (existing) {
        // Update if pending status changed
        if (existing.isPending !== plaidTxn.pending) {
          await db.collection(`users/${userId}/transactions`).doc(existing.id).update({
            isPending: plaidTxn.pending,
          });
        }
        continue;
      }

      // Only store transactions dated after account link
      if (linkedAt && txnDate >= linkedAt) {
        const newTransactionRef = await db.collection(`users/${userId}/transactions`).add({
          accountId,
          plaidTransactionId: plaidTxn.transaction_id,
          plaidCategory: plaidTxn.category ? plaidTxn.category.join(' > ') : null,
          plaidPersonalFinanceCategory: plaidTxn.personal_finance_category || null,
          merchantName: plaidTxn.merchant_name || plaidTxn.name,
          description: plaidTxn.name,
          amount,
          type: amount >= 0 ? 'income' : 'expense',
          category: mapPlaidCategoryToFinch(plaidTxn.personal_finance_category || plaidTxn.category),
          date: admin.firestore.Timestamp.fromDate(txnDate),
          isPending: plaidTxn.pending,
          source: 'plaid',
          isRecurring: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        newTransactionCount++;

        // Collect posted transactions for batched notification
        if (!plaidTxn.pending) {
          newTransactionsForNotification.push({
            id: newTransactionRef.id,
            merchantName: plaidTxn.merchant_name || plaidTxn.name,
            amount: amount,
            type: amount >= 0 ? 'income' : 'expense',
          });
        }
      }
    }

    // Send batched notification or queue for morning
    if (newTransactionsForNotification.length > 0) {
      try {
        // Get user's timezone (default to Eastern)
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const userTimezone = userData?.timezone || 'America/New_York';

        if (isInActiveHours(userTimezone)) {
          // SEND IMMEDIATELY (7:30 AM - 10 PM) - Batched
          functions.logger.info(`Sending batched immediate notification for ${newTransactionsForNotification.length} transactions`);
          await sendImmediateTransactionNotification(
            userId,
            accountId,
            newTransactionsForNotification, // Pass array for batching
            null
          );
        } else {
          // QUEUE FOR 7:30 AM - Queue each transaction
          functions.logger.info(`Queuing ${newTransactionsForNotification.length} notifications for 7:30 AM`);
          for (const txn of newTransactionsForNotification) {
            await db.collection(`users/${userId}/pendingNotifications`).add({
              transactionId: txn.id,
              accountId: accountId,
              accountName: accountDoc.data().name,
              merchantName: txn.merchantName,
              amount: txn.amount,
              type: txn.type,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              scheduledFor: getNext730AM(userTimezone),
              userTimezone: userTimezone,
              processed: false,
            });
          }
        }
      } catch (notificationError) {
        functions.logger.error('Error handling batched notification:', notificationError);
        // Don't fail the entire sync if notification fails
      }
    }

    // Update last synced timestamp
    await db.collection(`users/${userId}/plaidItems`).doc(itemId).update({
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update account balance
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });
    const plaidAccount = balanceResponse.data.accounts.find(acc => acc.account_id === plaidAccountId);
    if (plaidAccount) {
      const newBalance = plaidAccount.balances.current || plaidAccount.balances.available || 0;
      await db.collection(`users/${userId}/accounts`).doc(accountId).update({
        currentBalance: newBalance,
        lastPlaidBalance: newBalance,
        lastBalanceSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    functions.logger.info(`Sync task complete: ${newTransactionCount} new transactions`, {
      itemId,
      accountId,
    });

    res.status(200).json({
      success: true,
      transactionCount: newTransactionCount,
    });
  } catch (error) {
    functions.logger.error('Error processing sync task:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ============================================================================
// SCHEDULED NOTIFICATION PROCESSOR
// ============================================================================

/**
 * Process queued notifications every 15 minutes
 * Sends batched morning summaries at 7:30 AM local time
 */
exports.sendQueuedNotifications = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    functions.logger.info('Checking for queued notifications to send...');

    // Find all pending notifications scheduled for now or earlier
    const pendingSnapshot = await db.collectionGroup('pendingNotifications')
      .where('processed', '==', false)
      .where('scheduledFor', '<=', now)
      .get();

    if (pendingSnapshot.empty) {
      functions.logger.info('No queued notifications to send');
      return null;
    }

    functions.logger.info(`Found ${pendingSnapshot.docs.length} queued notifications`);

    // Group by user
    const notificationsByUser = {};

    pendingSnapshot.docs.forEach(doc => {
      const userId = doc.ref.parent.parent.id;
      if (!notificationsByUser[userId]) {
        notificationsByUser[userId] = [];
      }
      notificationsByUser[userId].push({
        id: doc.id,
        ref: doc.ref,
        ...doc.data()
      });
    });

    // Process each user's queued notifications
    for (const [userId, notifications] of Object.entries(notificationsByUser)) {
      try {
        await sendBatchedMorningNotification(userId, notifications);

        // Mark all as processed
        const batch = db.batch();
        notifications.forEach(notif => {
          batch.update(notif.ref, { processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
        });
        await batch.commit();

        functions.logger.info(`✅ Processed ${notifications.length} notifications for user ${userId}`);
      } catch (error) {
        functions.logger.error(`Error processing notifications for user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }

    functions.logger.info(`Processed queued notifications for ${Object.keys(notificationsByUser).length} users`);

    return null;
  });

// ============================================================================
// FINANCIAL HEALTH SCORE CALCULATION
// ============================================================================

/**
 * Calculate Financial Health Score (0-100) for a user
 * Components:
 * - Available Balance Cushion (30 pts)
 * - Days Until Broke (25 pts)
 * - Budget Adherence (20 pts)
 * - Emergency Fund Progress (15 pts)
 * - Recurring Bills Covered (10 pts)
 */
async function calculateFinancialHealthScore(userId) {
  const { calculateProjections, getAvailableToSpend } = require('./projection');

  try {
    functions.logger.info(`Calculating health score for user ${userId}`);

    // Get all accounts
    const accountsSnapshot = await db.collection(`users/${userId}/accounts`).get();
    const accounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (accounts.length === 0) {
      functions.logger.info('No accounts found, skipping health score calculation');
      return null;
    }

    // Get all transactions
    const transactionsSnapshot = await db.collection(`users/${userId}/transactions`).get();
    const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate projections for all accounts
    const allProjections = calculateProjections(accounts, transactions, 60);

    let totalScore = 0;
    const breakdown = {};

    // === 1. AVAILABLE BALANCE CUSHION (30 points) ===
    let totalAvailableToSpend = 0;
    for (const account of accounts) {
      const accountProjections = allProjections.find(p => p.accountId === account.id)?.projections;
      const lowestBalance = accountProjections ? getAvailableToSpend(accountProjections) : account.currentBalance;

      // Get goal allocations
      const goalsSnapshot = await db.collection(`users/${userId}/goals`)
        .where('accountId', '==', account.id)
        .get();
      const goalAllocations = goalsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().allocatedAmount || 0), 0);

      const availableToSpend = lowestBalance - (account.cushion || 0) - goalAllocations;
      totalAvailableToSpend += availableToSpend;
    }

    let cushionScore = 0;
    if (totalAvailableToSpend >= 500) cushionScore = 30;
    else if (totalAvailableToSpend >= 250) cushionScore = 20;
    else if (totalAvailableToSpend >= 100) cushionScore = 10;
    else cushionScore = 0;

    totalScore += cushionScore;
    breakdown.availableCushion = {
      score: cushionScore,
      maxScore: 30,
      amount: totalAvailableToSpend
    };

    // === 2. DAYS UNTIL BROKE (25 points) ===
    let daysUntilBroke = 60; // Default to max if never broke
    for (const projectionData of allProjections) {
      for (let i = 0; i < projectionData.projections.length; i++) {
        const day = projectionData.projections[i];
        const account = accounts.find(a => a.id === projectionData.accountId);

        // Get goal allocations
        const goalsSnapshot = await db.collection(`users/${userId}/goals`)
          .where('accountId', '==', account.id)
          .get();
        const goalAllocations = goalsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().allocatedAmount || 0), 0);

        const availableBalance = day.balance - (account.cushion || 0) - goalAllocations;

        if (availableBalance <= 0) {
          daysUntilBroke = Math.min(daysUntilBroke, i);
          break;
        }
      }
    }

    let daysScore = 0;
    if (daysUntilBroke >= 30) daysScore = 25;
    else if (daysUntilBroke >= 14) daysScore = 18;
    else if (daysUntilBroke >= 7) daysScore = 10;
    else daysScore = 0;

    totalScore += daysScore;
    breakdown.daysUntilBroke = {
      score: daysScore,
      maxScore: 25,
      days: daysUntilBroke
    };

    // === 3. BUDGET ADHERENCE (20 points) ===
    // Check if user has budgets set up
    const budgetsSnapshot = await db.collection(`users/${userId}/budgets`).get();
    const budgets = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let budgetScore = 10; // Default neutral score if no budgets
    let categoriesOver = 0;

    if (budgets.length > 0) {
      // Calculate current month spending by category
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const currentMonthTransactions = transactions.filter(t => {
        const txnDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return txnDate >= firstDayOfMonth && t.amount < 0 && !t.isRecurring;
      });

      const spendingByCategory = {};
      currentMonthTransactions.forEach(t => {
        const category = t.category || 'Uncategorized';
        spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(t.amount);
      });

      // Check each budget
      budgets.forEach(budget => {
        const spent = spendingByCategory[budget.category] || 0;
        if (spent > budget.limit) {
          categoriesOver++;
        }
      });

      if (categoriesOver === 0) budgetScore = 20;
      else if (categoriesOver <= 2) budgetScore = 12;
      else budgetScore = 5;
    }

    totalScore += budgetScore;
    breakdown.budgetAdherence = {
      score: budgetScore,
      maxScore: 20,
      categoriesOver,
      hasBudgets: budgets.length > 0
    };

    // === 4. EMERGENCY FUND PROGRESS (15 points) ===
    // Look for goals marked as emergency fund
    const goalsSnapshot = await db.collection(`users/${userId}/goals`).get();
    const emergencyGoals = goalsSnapshot.docs.filter(doc => {
      const goal = doc.data();
      return goal.name?.toLowerCase().includes('emergency') ||
             goal.category?.toLowerCase().includes('emergency');
    });

    let emergencyScore = 0;
    let monthsCovered = 0;

    if (emergencyGoals.length > 0) {
      // Calculate total emergency fund amount
      const totalEmergencyFund = emergencyGoals.reduce((sum, doc) => {
        return sum + (doc.data().allocatedAmount || 0);
      }, 0);

      // Estimate monthly expenses (recurring bills + average spending)
      const recurringExpenses = transactions.filter(t => t.isRecurring && t.amount < 0);
      const monthlyBills = recurringExpenses.reduce((sum, t) => {
        const amount = Math.abs(t.amount);
        // Convert to monthly equivalent
        if (t.recurringDetails?.frequency === 'weekly') return sum + (amount * 4);
        if (t.recurringDetails?.frequency === 'biweekly') return sum + (amount * 2);
        if (t.recurringDetails?.frequency === 'yearly') return sum + (amount / 12);
        return sum + amount; // monthly
      }, 0);

      // Estimate average monthly spending from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentTransactions = transactions.filter(t => {
        const txnDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return txnDate >= thirtyDaysAgo && t.amount < 0 && !t.isRecurring;
      });
      const monthlySpending = recentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const estimatedMonthlyExpenses = monthlyBills + monthlySpending;
      monthsCovered = estimatedMonthlyExpenses > 0 ? totalEmergencyFund / estimatedMonthlyExpenses : 0;

      if (monthsCovered >= 6) emergencyScore = 15;
      else if (monthsCovered >= 3) emergencyScore = 10;
      else if (monthsCovered >= 1) emergencyScore = 5;
      else emergencyScore = 0;
    }

    totalScore += emergencyScore;
    breakdown.emergencyFund = {
      score: emergencyScore,
      maxScore: 15,
      monthsCovered: Math.round(monthsCovered * 10) / 10
    };

    // === 5. RECURRING BILLS COVERED (10 points) ===
    const upcomingBills = transactions.filter(t => {
      if (!t.isRecurring || !t.recurringDetails?.nextDate || t.amount >= 0) return false;
      const nextDate = t.recurringDetails.nextDate.toDate
        ? t.recurringDetails.nextDate.toDate()
        : new Date(t.recurringDetails.nextDate);
      const next30Days = new Date();
      next30Days.setDate(next30Days.getDate() + 30);
      return nextDate <= next30Days;
    });

    let billsAtRisk = [];
    for (const bill of upcomingBills) {
      const billAmount = Math.abs(bill.amount);
      const billDate = bill.recurringDetails.nextDate.toDate
        ? bill.recurringDetails.nextDate.toDate()
        : new Date(bill.recurringDetails.nextDate);

      // Check if available balance at bill date covers the bill
      const account = accounts.find(a => a.id === bill.accountId);
      const accountProjections = allProjections.find(p => p.accountId === bill.accountId)?.projections;

      if (accountProjections) {
        const daysUntilBill = Math.floor((billDate - new Date()) / (1000 * 60 * 60 * 24));
        const dayIndex = Math.min(daysUntilBill, accountProjections.length - 1);
        const balanceAtBillDate = accountProjections[dayIndex]?.balance || 0;

        // Get goal allocations
        const goalsSnapshot = await db.collection(`users/${userId}/goals`)
          .where('accountId', '==', account.id)
          .get();
        const goalAllocations = goalsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().allocatedAmount || 0), 0);

        const availableAtBillDate = balanceAtBillDate - (account.cushion || 0) - goalAllocations;

        if (availableAtBillDate < billAmount) {
          billsAtRisk.push(bill.description);
        }
      }
    }

    let billsScore = 0;
    if (billsAtRisk.length === 0 && upcomingBills.length > 0) billsScore = 10;
    else if (billsAtRisk.length <= 1) billsScore = 5;
    else billsScore = 0;

    totalScore += billsScore;
    breakdown.billsCovered = {
      score: billsScore,
      maxScore: 10,
      billsAtRisk: billsAtRisk.length,
      totalUpcomingBills: upcomingBills.length
    };

    // === DETERMINE TREND ===
    const previousScoreDoc = await db.collection(`users/${userId}/healthScore`).doc('current').get();
    let trend = 'stable';
    let previousScore = null;

    if (previousScoreDoc.exists) {
      previousScore = previousScoreDoc.data().score;
      if (totalScore > previousScore + 5) trend = 'improving';
      else if (totalScore < previousScore - 5) trend = 'declining';
    }

    // === SAVE TO FIRESTORE ===
    const healthScoreData = {
      score: totalScore,
      lastCalculated: admin.firestore.FieldValue.serverTimestamp(),
      breakdown,
      trend,
      previousScore
    };

    await db.collection(`users/${userId}/healthScore`).doc('current').set(healthScoreData);

    functions.logger.info(`✅ Health score calculated for user ${userId}: ${totalScore}/100`);

    return healthScoreData;

  } catch (error) {
    functions.logger.error(`Error calculating health score for user ${userId}:`, error);
    return null;
  }
}

/**
 * Callable function to manually trigger health score calculation
 */
exports.calculateHealthScore = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const healthScore = await calculateFinancialHealthScore(userId);

  if (!healthScore) {
    throw new functions.https.HttpsError('internal', 'Failed to calculate health score');
  }

  return healthScore;
});

/**
 * Scheduled function to calculate health scores for all users daily at 9 AM
 */
exports.calculateDailyHealthScores = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    functions.logger.info('Starting daily health score calculations');

    try {
      const usersSnapshot = await db.collection('users').get();
      let calculatedCount = 0;
      let errorCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        try {
          await calculateFinancialHealthScore(userDoc.id);
          calculatedCount++;
        } catch (error) {
          functions.logger.error(`Failed to calculate health score for user ${userDoc.id}:`, error);
          errorCount++;
        }
      }

      functions.logger.info(`Daily health score calculation complete: ${calculatedCount} successful, ${errorCount} errors`);
    } catch (error) {
      functions.logger.error('Error in daily health score calculation:', error);
    }

    return null;
  });

// ============================================================================
// DAILY SCHEDULED NOTIFICATIONS (9 AM)
// ============================================================================

// Import and export the 9 AM daily notification function
const { sendScheduledNotifications } = require('./notifications');
exports.sendScheduledNotifications = sendScheduledNotifications;

// ============================================================================
// REVENUECAT WEBHOOK
// ============================================================================

// Import and export the RevenueCat webhook handler
const { revenuecatWebhook } = require('./revenuecatWebhook');
exports.revenuecatWebhook = revenuecatWebhook;

// ============================================================================
// SUBSCRIPTION RENEWAL REMINDERS
// ============================================================================

// Import and export the renewal reminder function
const { checkRenewalReminders } = require('./renewalReminders');
exports.checkRenewalReminders = checkRenewalReminders;

// ============================================================================
// REVENUECAT MANAGEMENT URL
// ============================================================================

// Import and export the management URL function
const { getManagementUrl } = require('./getManagementUrl');
exports.getManagementUrl = getManagementUrl;