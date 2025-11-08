const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { calculateProjections, getAvailableToSpend } = require('./projection');
const { toDateInputString, parseDateString } = require('./dateUtils');
const { format } = require('date-fns'); // Import the format function

// Helper function to check if it's 9:00 AM in a given timezone
function is9AMInTimezone(timezone) {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });

        const parts = formatter.formatToParts(now);
        const hour = parseInt(parts.find(p => p.type === 'hour').value);
        const minute = parseInt(parts.find(p => p.type === 'minute').value);

        // Check if it's between 9:00 and 9:59
        return hour === 9 && minute < 60;
    } catch (error) {
        console.error('Error checking time for timezone:', timezone, error);
        return false;
    }
}

// This function runs every hour and sends notifications to users where it's currently 9:00 AM
exports.sendScheduledNotifications = functions.pubsub.schedule('every 1 hours').timeZone('UTC').onRun(async (context) => {
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users').get();

    let notificationsSent = 0;
    let usersChecked = 0;

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
        usersChecked++;

        // Check if it's 9:00 AM in the user's timezone (default to America/New_York)
        const userTimezone = user.timezone || 'America/New_York';
        if (!is9AMInTimezone(userTimezone)) {
            continue; // Skip - not 9 AM in this user's timezone yet
        }

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
                notificationsSent++;
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
            const billDate = toJSDate(bill.recurringDetails.nextDate);
            const dueDateString = format(billDate, 'EEEE'); // e.g., "Friday"

            const payload = {
                notification: {
                    title: 'Upcoming Bill Reminder',
                    body: `Heads up! Your ${bill.description} payment of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(bill.amount))} is due on ${dueDateString}.`,
                }
            };
            await admin.messaging().sendToDevice(user.fcmTokens, payload);
            notificationsSent++;
        }
    }

    console.log(`9 AM notifications: Checked ${usersChecked} users, sent ${notificationsSent} notifications`);
    return null;
});