const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { PlaidApi, PlaidEnvironments } = require('plaid');
const { getNextDate, toDateInputString } = require('../shared-logic/src/utils/date'); // CORRECTED PATH

admin.initializeApp();

const db = admin.firestore();

const plaidClient = new PlaidApi({
  clientID: functions.config().plaid.client_id,
  secret: functions.config().plaid.secret,
  env: PlaidEnvironments.sandbox,
});

// ... (rest of the file is unchanged) ...
// (The full content of your original file follows)
exports.createLinkToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const userId = context.auth.uid;
  const configs = {
    user: { client_user_id: userId },
    client_name: 'Finch',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
    webhook: functions.config().plaid.webhook_url,
    transactions: {
      days_requested: 730,
    },
  };

  try {
    const createTokenResponse = await plaidClient.createLinkToken(configs);
    return createTokenResponse.data;
  } catch (error) {
    console.error("Plaid createLinkToken error:", error.response ? error.response.data : error);
    throw new functions.https.HttpsError('internal', 'Could not create Plaid link token.', error.message);
  }
});

exports.exchangePublicToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { publicToken, institution } = data;
    const userId = context.auth.uid;

    try {
        const response = await plaidClient.exchangePublicToken({ public_token: publicToken });
        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        const itemRef = db.collection('users').doc(userId).collection('items').doc(itemId);
        await itemRef.set({
            accessToken,
            institutionId: institution.institution_id,
            institutionName: institution.name,
            lastSync: null,
            cursor: null, 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
        const accounts = accountsResponse.data.accounts;

        const batch = db.batch();
        accounts.forEach(account => {
            const accountRef = db.collection('users').doc(userId).collection('accounts').doc(account.account_id);
            batch.set(accountRef, {
                itemId,
                name: account.name,
                mask: account.mask,
                type: account.type,
                subtype: account.subtype,
                startingBalance: account.balances.current,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();

        await syncTransactions({ userId, itemId, accessToken });
        await identifyRecurringTransactions({ userId, accessToken });

        return { success: true };
    } catch (error) {
        console.error("Plaid exchangePublicToken error:", error.response ? error.response.data : error);
        throw new functions.https.HttpsError('internal', 'Could not exchange public token.', error.message);
    }
});


const syncTransactions = async ({ userId, itemId, accessToken, cursor = null }) => {
    let added = [];
    let modified = [];
    let removed = [];
    let hasMore = true;
    let nextCursor = cursor;

    while (hasMore) {
        const request = {
            access_token: accessToken,
            cursor: nextCursor,
            count: 500,
        };
        const response = await plaidClient.transactionsSync(request);
        const data = response.data;

        added = added.concat(data.added);
        modified = modified.concat(data.modified);
        removed = removed.concat(data.removed.map(t => t.transaction_id));
        hasMore = data.has_more;
        nextCursor = data.next_cursor;
    }
    
    const batch = db.batch();

    added.forEach(txn => {
        const ref = db.collection('users').doc(userId).collection('transactions').doc(txn.transaction_id);
        batch.set(ref, { 
            ...txn,
            isRecurring: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    modified.forEach(txn => {
        const ref = db.collection('users').doc(userId).collection('transactions').doc(txn.transaction_id);
        batch.update(ref, txn);
    });

    removed.forEach(txnId => {
        const ref = db.collection('users').doc(userId).collection('transactions').doc(txnId);
        batch.delete(ref);
    });

    if (batch._ops.length > 0) {
        await batch.commit();
    }
    
    const itemRef = db.collection('users').doc(userId).collection('items').doc(itemId);
    await itemRef.update({ cursor: nextCursor, lastSync: admin.firestore.FieldValue.serverTimestamp() });

    return { added: added.length, modified: modified.length, removed: removed.length };
};


exports.handlePlaidWebhook = functions.https.onRequest(async (req, res) => {
    const { webhook_type, webhook_code, item_id, new_transactions } = req.body;

    if (webhook_type === 'TRANSACTIONS') {
        if (webhook_code === 'SYNC_UPDATES_AVAILABLE') {
            const itemDocQuery = await db.collectionGroup('items').where('itemId', '==', item_id).limit(1).get();
            if (itemDocQuery.empty) {
                console.error(`Could not find item with ID: ${item_id}`);
                res.status(404).send('Item not found.');
                return;
            }
            const item = itemDocQuery.docs[0];
            const userId = item.ref.parent.parent.id;
            const { accessToken, cursor } = item.data();

            try {
                const results = await syncTransactions({ userId, itemId: item_id, accessToken, cursor });
                console.log(`Synced ${results.added} new transactions for item ${item_id}`);
                await identifyRecurringTransactions({ userId, accessToken });

                res.status(200).send('Sync complete.');
            } catch (error) {
                console.error(`Error syncing transactions for item ${item_id}:`, error);
                res.status(500).send('Error syncing transactions.');
            }
        }
    } else {
        res.status(200).send('Webhook received.');
    }
});


const identifyRecurringTransactions = async ({ userId, accessToken }) => {
    try {
        const transactionsResponse = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: '2000-01-01',
            end_date: toDateInputString(new Date()),
        });
        
        let allTransactions = transactionsResponse.data.transactions;
        while (allTransactions.length < transactionsResponse.data.total_transactions) {
            const paginatedResponse = await plaidClient.transactionsGet({
                access_token: accessToken,
                start_date: '2000-01-01',
                end_date: toDateInputString(new Date()),
                options: {
                    offset: allTransactions.length,
                },
            });
            allTransactions = allTransactions.concat(paginatedResponse.data.transactions);
        }

        const recurringResponse = await plaidClient.transactionsRecurringGet({
            access_token: accessToken,
            account_ids: transactionsResponse.data.accounts.map(a => a.account_id),
        });

        const { inflow_streams, outflow_streams } = recurringResponse.data;
        const allStreams = [...inflow_streams, ...outflow_streams];

        const batch = db.batch();

        for (const stream of allStreams) {
            const transactionsInStream = allTransactions.filter(t => stream.transaction_ids.includes(t.transaction_id));
            if (transactionsInStream.length === 0) continue;

            const mostRecentTxn = transactionsInStream.reduce((latest, current) => {
                return new Date(latest.date) > new Date(current.date) ? latest : current;
            });

            const nextDueDate = getNextDate(new Date(mostRecentTxn.date), stream.frequency.interval_unit);
            
            const recurringDetails = {
                streamId: stream.stream_id,
                frequency: stream.frequency.interval_unit,
                nextDate: toDateInputString(nextDueDate),
                isIncome: stream.flow === 'INFLOW',
            };

            for (const txnId of stream.transaction_ids) {
                const txnRef = db.collection('users').doc(userId).collection('transactions').doc(txnId);
                batch.update(txnRef, { 
                    isRecurring: true,
                    recurringDetails: recurringDetails
                });
            }
        }

        if (batch._ops.length > 0) {
            await batch.commit();
        }

        return { identifiedStreams: allStreams.length };
    } catch (error) {
        console.error("Error identifying recurring transactions:", error.response ? error.response.data : error);
        throw new functions.https.HttpsError('internal', 'Could not identify recurring transactions.', error.message);
    }
};

exports.syncAllItems = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const userId = context.auth.uid;
    const itemsRef = db.collection('users').doc(userId).collection('items');
    const itemsSnapshot = await itemsRef.get();

    if (itemsSnapshot.empty) {
        return { success: true, message: 'No items to sync.' };
    }

    const syncPromises = itemsSnapshot.docs.map(async (doc) => {
        const item = doc.data();
        const itemId = doc.id;
        try {
            await syncTransactions({ userId, itemId, accessToken: item.accessToken, cursor: item.cursor });
            await identifyRecurringTransactions({ userId, accessToken: item.accessToken });
            return { itemId, status: 'success' };
        } catch (error) {
            console.error(`Failed to sync item ${itemId}:`, error);
            return { itemId, status: 'error', error: error.message };
        }
    });

    const results = await Promise.all(syncPromises);
    return { success: true, results };
});

const notifications = require('./notifications');
exports.sendScheduledNotifications = notifications.sendScheduledNotifications;