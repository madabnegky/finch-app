const functions = require("firebase-functions");
const admin = require("firebase-admin");
// FIX: The import path for the date utility file was incorrect.
const { getNextOccurrence, startOfDay } = require("./dateUtils");

admin.initializeApp();
const db = admin.firestore();

exports.generateProjections = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const userId = context.auth.uid;
  const today = startOfDay(new Date());

  try {
    const accountsSnapshot = await db
      .collection(`users/${userId}/accounts`)
      .get();
    let currentBalance = accountsSnapshot.docs.reduce(
      (sum, doc) => sum + doc.data().balance,
      0
    );

    const transactionsSnapshot = await db
      .collection(`users/${userId}/transactions`)
      .get();
    const transactions = transactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const projections = [{ date: today, balance: currentBalance }];
    let runningBalance = currentBalance;

    for (let i = 1; i <= 14; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      let dailyNet = 0;

      transactions.forEach((t) => {
        // Handle one-time transactions
        if (!t.recurring || t.recurring.frequency === "once") {
          const transactionDate = t.date.toDate();
          if (
            transactionDate.getDate() === currentDate.getDate() &&
            transactionDate.getMonth() === currentDate.getMonth() &&
            transactionDate.getFullYear() === currentDate.getFullYear()
          ) {
            dailyNet += t.amount;
          }
        }
        // Handle recurring transactions
        else {
          let nextDate = t.date.toDate();
          while (nextDate <= currentDate) {
            if (
              nextDate.getDate() === currentDate.getDate() &&
              nextDate.getMonth() === currentDate.getMonth() &&
              nextDate.getFullYear() === currentDate.getFullYear()
            ) {
              dailyNet += t.amount;
            }
            // Important: get the *next* occurrence to check in the next loop
            const next = getNextOccurrence(nextDate, t.recurring.frequency);
            if (!next || next <= nextDate) break; // Break if no next date or logic error
            nextDate = next;
          }
        }
      });
      runningBalance += dailyNet;
      projections.push({ date: currentDate, balance: runningBalance });
    }

    return { projections };
  } catch (error) {
    console.error("Error generating projections:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Error generating projections."
    );
  }
});

exports.detectRecurringTransactions = functions.firestore
    .document('users/{userId}/transactions/{transactionId}')
    .onCreate(async (snap, context) => {
        const newTransaction = snap.data();
        const userId = context.params.userId;
        const transactionId = context.params.transactionId;

        // Simple detection logic: check for transactions with the same name and similar amount
        const similarTransactions = await db.collection(`users/${userId}/transactions`)
            .where('name', '==', newTransaction.name)
            .get();

        if (similarTransactions.docs.length < 2) {
            return null; // Not enough transactions with the same name to be recurring
        }

        let isRecurring = false;
        similarTransactions.forEach(doc => {
            if (doc.id === transactionId) return; // Don't compare with itself
            const oldTransaction = doc.data();
            const amountDifference = Math.abs(oldTransaction.amount - newTransaction.amount);

            // Consider it a match if the amount is very close (e.g., within $1)
            if (amountDifference < 1.00) {
                isRecurring = true;
            }
        });

        if (isRecurring) {
            console.log(`Detected potential recurring transaction: ${newTransaction.name} for user ${userId}`);
            // In a real application, you might update the transaction document,
            // create a "recurring pattern" document, or notify the user.
        }

        return null;
    });