const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getNextOccurrence, startOfDay, toDateInputString, parseDateString } = require("./dateUtils");

admin.initializeApp();
const db = admin.firestore();

exports.generateProjections = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
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