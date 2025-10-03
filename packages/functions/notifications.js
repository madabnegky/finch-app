const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { calculateProjections, getAvailableToSpend } = require('./projection');
const { toDateInputString } = require('./dateUtils');

// This function will run every day at 9:00 AM Eastern Time
exports.sendScheduledNotifications = functions.pubsub.schedule('every day 09:00').timeZone('America/New_York').onRun(async (context) => {
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;

        if (!user.fcmTokens || user.fcmTokens.length === 0) {
            continue; // Skip users who haven't enabled notifications
        }

        const accountsSnapshot = await db.collection('users').doc(userId).collection('accounts').get();
        const transactionsSnapshot = await db.collection('users').doc(userId).collection('transactions').get();
        
        const accounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const allProjections = calculateProjections(accounts, transactions);

        // --- Check for Low Available Balance ---
        for (const account of accounts) {
            const userSettings = account.notificationSettings || { lowAvailableBalanceThreshold: 50 };
            const accountProjections = allProjections.find(p => p.accountId === account.id)?.projections;
            const availableToSpend = getAvailableToSpend(accountProjections);

            if (availableToSpend < userSettings.lowAvailableBalanceThreshold) {
                const payload = {
                    notification: {
                        title: 'Low Available Balance Alert',
                        body: `Your ${account.name} account's available balance is getting low ($${availableToSpend.toFixed(2)}). Be mindful of extra spending.`,
                    }
                };
                await admin.messaging().sendToDevice(user.fcmTokens, payload);
            }
        }

        // --- Check for Upcoming Bills ---
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        const twoDaysFromNowStr = toDateInputString(twoDaysFromNow);

        const upcomingBills = transactions.filter(t => 
            t.isRecurring &&
            t.recurringDetails &&
            t.recurringDetails.nextDate === twoDaysFromNowStr &&
            t.amount < 0 // It's a bill (negative amount)
        );

        for (const bill of upcomingBills) {
            const account = accounts.find(a => a.id === bill.accountId);
            const payload = {
                notification: {
                    title: 'Upcoming Bill Reminder',
                    body: `Heads up! Your ${bill.name} payment of $${Math.abs(bill.amount).toFixed(2)} is due on Friday.`,
                }
            };
            await admin.messaging().sendToDevice(user.fcmTokens, payload);
        }
    }
    return null;
});