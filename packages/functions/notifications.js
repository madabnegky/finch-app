const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { calculateProjections, getAvailableToSpend } = require('./projection');
const { toDateInputString, parseDateString } = require('./dateUtils');
const { format } = require('date-fns'); // Import the format function

// This function will run every day at 9:00 AM Eastern Time
exports.sendScheduledNotifications = functions.pubsub.schedule('every day 09:00').timeZone('America/New_York').onRun(async (context) => {
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users').get();

    // Helper to consistently convert Firestore Timestamps or date strings to a JS Date object.
    const toJSDate = (timestamp) => {
        if (!timestamp) return null;
        if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }
        if (timestamp instanceof Date) {
            return timestamp;
        }
        if (typeof timestamp === 'string') {
            return parseDateString(timestamp);
        }
        try {
            const date = new Date(timestamp);
            if (!isNaN(date)) return date;
        } catch (e) {
            console.error("Could not parse date:", timestamp);
            return null;
        }
        return null;
    };

    for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;

        if (!user.fcmTokens || user.fcmTokens.length === 0) {
            continue; // Skip users who haven't enabled notifications
        }

        // Check user notification preferences
        const preferencesDoc = await db.collection('users').doc(userId).collection('preferences').doc('settings').get();
        const preferences = preferencesDoc.exists ? preferencesDoc.data() : {};

        // Check master toggle
        if (preferences.notificationsEnabled === false) {
            continue; // Skip if notifications are disabled
        }

        // Check if daily alerts are enabled
        if (preferences.dailyAlerts === false) {
            continue; // Skip if daily alerts are disabled
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
                        body: `Your ${account.name} account's available balance is getting low (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(availableToSpend)}). Be mindful of extra spending.`,
                    }
                };
                await admin.messaging().sendToDevice(user.fcmTokens, payload);
            }
        }

        // --- Check for Upcoming Bills ---
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        const twoDaysFromNowStr = toDateInputString(twoDaysFromNow);

        const upcomingBills = transactions.filter(t => {
            if (t.isRecurring && t.recurringDetails && t.recurringDetails.nextDate && t.amount < 0) {
                const nextDateStr = toDateInputString(toJSDate(t.recurringDetails.nextDate));
                return nextDateStr === twoDaysFromNowStr;
            }
            return false;
        });

        for (const bill of upcomingBills) {
            const account = accounts.find(a => a.id === bill.accountId);
            const billDate = toJSDate(bill.recurringDetails.nextDate);
            const dueDateString = format(billDate, 'EEEE'); // e.g., "Friday"

            const payload = {
                notification: {
                    title: 'Upcoming Bill Reminder',
                    body: `Heads up! Your ${bill.description} payment of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(bill.amount))} is due on ${dueDateString}.`,
                }
            };
            await admin.messaging().sendToDevice(user.fcmTokens, payload);
        }
    }
    return null;
});