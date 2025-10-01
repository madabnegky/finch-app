const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

admin.initializeApp();
const db = admin.firestore();

// Initialize the Plaid client
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[functions.config().plaid.env],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": functions.config().plaid.client_id,
      "PLAID-SECRET": functions.config().plaid.secret,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);
const appId = "default-finch-app";

const mapPlaidCategoryToFinancierCategory = (plaidCategories) => {
    if (!plaidCategories || plaidCategories.length === 0) return "Uncategorized";
    const primaryCategory = plaidCategories[0];
    if (primaryCategory.includes("Food and Drink")) return "Food";
    if (primaryCategory.includes("Travel")) return "Travel";
    if (primaryCategory.includes("Transfer")) return "Transfers";
    if (primaryCategory.includes("Recreation")) return "Entertainment";
    if (primaryCategory.includes("Shops")) return "Shopping";
    if (primaryCategory.includes("Rent")) return "Housing";
    if (primaryCategory.includes("Service")) {
        if (plaidCategories.includes("Subscription")) return "Subscriptions";
        return "Utilities";
    }
    return "Uncategorized";
};

// Helper to convert Plaid's frequency to ours (e.g., "MONTHLY" -> "monthly")
const mapPlaidFrequency = (frequency) => {
    if (!frequency) return 'monthly'; // Default
    return frequency.toLowerCase().replace('_', '-');
}

exports.createLinkToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  const userId = context.auth.uid;
  const request = {
    user: { client_user_id: userId }, client_name: "Finch",
    products: ["transactions"], country_codes: ["US"], language: "en",
  };
  try {
    const response = await plaidClient.linkTokenCreate(request);
    return { link_token: response.data.link_token };
  } catch (error) {
    console.error("Error creating link token:", error.response ? error.response.data : {});
    throw new functions.https.HttpsError("internal", "Could not create link token.");
  }
});

exports.exchangePublicToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  const { public_token } = data;
  const userId = context.auth.uid;
  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = response.data;
    await db.collection("plaid_items").doc(item_id).set({
      userId, accessToken: access_token, cursor: null, createdAt: FieldValue.serverTimestamp(),
    });
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;
    const batch = db.batch();
    accounts.forEach((account) => {
      const accountRef = db.collection(`artifacts/${appId}/users/${userId}/accounts`).doc(account.account_id);
      batch.set(accountRef, {
        plaidAccountId: account.account_id, plaidItemId: item_id, name: account.name,
        type: account.subtype, startingBalance: account.balances.current, cushion: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    return { item_id: item_id };
  } catch (error) {
    console.error("Error exchanging public token:", error.response ? error.response.data : {});
    throw new functions.https.HttpsError("internal", "Could not exchange public token.");
  }
});

exports.syncTransactions = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    const { item_id } = data;
    const userId = context.auth.uid;
    try {
        const itemDoc = await db.collection("plaid_items").doc(item_id).get();
        if (!itemDoc.exists || itemDoc.data().userId !== userId) throw new functions.https.HttpsError("permission-denied", "You do not have access to this item.");
        const { accessToken, cursor } = itemDoc.data();
        let added = [];
        let hasMore = true;
        let currentCursor = cursor;
        while (hasMore) {
            const request = { access_token: accessToken, cursor: currentCursor, };
            const response = await plaidClient.transactionsSync(request);
            const responseData = response.data;
            added = added.concat(responseData.added);
            hasMore = responseData.has_more;
            currentCursor = responseData.next_cursor;
        }
        await db.collection("plaid_items").doc(item_id).update({ cursor: currentCursor });
        const batch = db.batch();
        added.forEach((transaction) => {
            const transRef = db.collection(`artifacts/${appId}/users/${userId}/transactions`).doc(transaction.transaction_id);
            const isExpense = transaction.amount > 0;
            batch.set(transRef, {
                accountId: transaction.account_id, description: transaction.name,
                amount: isExpense ? -transaction.amount : transaction.amount,
                date: Timestamp.fromDate(new Date(transaction.date)),
                category: mapPlaidCategoryToFinancierCategory(transaction.category),
                type: isExpense ? 'expense' : 'income', isRecurring: false,
                createdAt: FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
        return { success: true, count: added.length };
    } catch (error) {
        console.error("Error syncing transactions:", error.response ? error.response.data : error);
        throw new functions.https.HttpsError("internal", "Could not sync transactions.");
    }
});

// Using Plaid's native recurring transactions feature
exports.identifyRecurringTransactions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { item_id } = data;
    const userId = context.auth.uid;

    try {
        const itemDoc = await db.collection("plaid_items").doc(item_id).get();
        if (!itemDoc.exists || itemDoc.data().userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You do not have access to this item.");
        }

        const { accessToken } = itemDoc.data();
        const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
        const accountIds = accountsResponse.data.accounts.map(a => a.account_id);

        const recurringResponse = await plaidClient.transactionsRecurringGet({
            access_token: accessToken,
            account_ids: accountIds,
        });

        const batch = db.batch();
        const transactionsRef = db.collection(`artifacts/${appId}/users/${userId}/transactions`);

        // Process recurring expenses
        recurringResponse.data.outflow_streams.forEach(stream => {
            const newTransRef = transactionsRef.doc(`plaid_${stream.stream_id}`);
            batch.set(newTransRef, {
                accountId: stream.account_id,
                description: stream.merchant_name,
                amount: -Math.abs(stream.average_amount.amount),
                type: 'expense',
                isRecurring: true,
                recurringDetails: {
                    frequency: mapPlaidFrequency(stream.frequency),
                    nextDate: Timestamp.fromDate(new Date(stream.next_date)),
                },
                category: mapPlaidCategoryToFinancierCategory(stream.category),
                createdAt: FieldValue.serverTimestamp(),
            });
        });

        // Process recurring income
        recurringResponse.data.inflow_streams.forEach(stream => {
            const newTransRef = transactionsRef.doc(`plaid_${stream.stream_id}`);
            batch.set(newTransRef, {
                accountId: stream.account_id,
                description: stream.description,
                amount: Math.abs(stream.average_amount.amount),
                type: 'income',
                isRecurring: true,
                recurringDetails: {
                    frequency: mapPlaidFrequency(stream.frequency),
                    nextDate: Timestamp.fromDate(new Date(stream.next_date)),
                },
                category: 'Income',
                createdAt: FieldValue.serverTimestamp(),
            });
        });

        await batch.commit();
        return { success: true };

    } catch (error) {
        console.error("Error identifying recurring transactions:", error.response ? error.response.data : error);
        throw new functions.https.HttpsError("internal", "Could not identify recurring transactions.");
    }
});

/**
 * Exchanges a public token for an access token and fetches the associated accounts
 * without saving anything to the database. This is used for the account matching UI.
 */
exports.getAccountsFromPublicToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { public_token } = data;

    try {
        const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token });
        const { access_token } = tokenResponse.data;

        const accountsResponse = await plaidClient.accountsGet({ access_token });
        return { accounts: accountsResponse.data.accounts };

    } catch (error) {
        console.error("Error fetching accounts from public token:", error.response ? error.response.data : error);
        throw new functions.https.HttpsError("internal", "Could not fetch accounts.");
    }
});


/**
 * Links a Plaid item to an existing manual account in Firestore.
 */
exports.linkManualAccountToPlaid = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { public_token, manualAccountId, selectedPlaidAccountId } = data;
    const userId = context.auth.uid;

    try {
        // 1. Exchange public token for access token and item ID
        const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token });
        const { access_token, item_id } = tokenResponse.data;

        // 2. Save the new Plaid item
        await db.collection("plaid_items").doc(item_id).set({
            userId,
            accessToken: access_token,
            cursor: null,
            createdAt: FieldValue.serverTimestamp(),
        });

        // 3. Get all accounts for the item to find the selected one's details
        const accountsResponse = await plaidClient.accountsGet({ access_token });
        const accountToLink = accountsResponse.data.accounts.find(a => a.account_id === selectedPlaidAccountId);
        
        if (!accountToLink) {
            throw new functions.https.HttpsError("not-found", "The selected account was not found.");
        }

        // 4. Update the existing manual account document
        const manualAccountRef = db.doc(`artifacts/${appId}/users/${userId}/accounts/${manualAccountId}`);
        await manualAccountRef.update({
            plaidItemId: item_id,
            plaidAccountId: selectedPlaidAccountId,
            name: accountToLink.name, // Update to the official name
            startingBalance: accountToLink.balances.current, // Update to the current balance
            type: accountToLink.subtype, // Update to the correct subtype
        });

        // 5. Trigger an initial transaction sync for the new item
        // Note: You might want to abstract this logic if you reuse it elsewhere.
        let added = [];
        let hasMore = true;
        let cursor = null;
        while (hasMore) {
            const request = { access_token, cursor };
            const response = await plaidClient.transactionsSync(request);
            const responseData = response.data;
            added = added.concat(responseData.added);
            hasMore = responseData.has_more;
            cursor = responseData.next_cursor;
        }
        await db.collection("plaid_items").doc(item_id).update({ cursor: cursor });
        const batch = db.batch();
        added.forEach((transaction) => {
            const transRef = db.collection(`artifacts/${appId}/users/${userId}/transactions`).doc(transaction.transaction_id);
            const isExpense = transaction.amount > 0;
            batch.set(transRef, {
                accountId: transaction.account_id,
                description: transaction.name,
                amount: isExpense ? -transaction.amount : transaction.amount,
                date: Timestamp.fromDate(new Date(transaction.date)),
                category: mapPlaidCategoryToFinancierCategory(transaction.category),
                type: isExpense ? 'expense' : 'income', isRecurring: false,
                createdAt: FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();

        return { success: true, accountId: manualAccountId };

    } catch (error) {
        console.error("Error linking manual account:", error.response ? error.response.data : error);
        throw new functions.https.HttpsError("internal", "Could not link account.");
    }
});