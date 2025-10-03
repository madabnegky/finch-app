import { useMemo } from 'react';
import { getNextOccurrence, toDateInputString } from '../utils/date';

const useProjectedBalances = (accounts, transactions, selectedAccountId = 'all') => {
  return useMemo(() => {
    const accountsToProject =
      selectedAccountId === 'all'
        ? accounts
        : accounts.filter((acc) => acc.id === selectedAccountId);

    if (!accountsToProject || accountsToProject.length === 0) return [];

    // --- THIS IS THE FIX ---
    // The entire hook has been rewritten to be robust against Firestore Timestamps.
    // 1. All transaction dates are consistently converted to JS Dates upfront.
    // 2. The logic for calculating past vs. future transactions is now reliable.
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 60);

    const allInstances = [];
    const relevantTransactions =
      selectedAccountId === 'all'
        ? transactions
        : transactions.filter((t) => t.accountId === selectedAccountId);

    relevantTransactions.forEach((t) => {
      // Helper to consistently convert Firestore Timestamps to JS Dates
      const toJSDate = (timestamp) => {
        if (!timestamp) return null;
        // Check if it's a Firestore Timestamp object with a toDate method
        return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      };

      if (!t.isRecurring) {
        const transactionDate = toJSDate(t.date || t.createdAt);
        if (transactionDate) {
          allInstances.push({ ...t, date: transactionDate });
        }
      } else {
        if (!t.recurringDetails || !t.recurringDetails.nextDate) return;

        let cursorDate = toJSDate(t.recurringDetails.nextDate);
        const seriesEndDate = toJSDate(t.recurringDetails.endDate);
        const excludedDates =
          t.recurringDetails.excludedDates?.map((d) => toDateInputString(toJSDate(d))) || [];

        while (cursorDate <= endDate) {
          if (seriesEndDate && cursorDate > seriesEndDate) break;

          if (!excludedDates.includes(toDateInputString(cursorDate))) {
            allInstances.push({ ...t, date: new Date(cursorDate) });
          }
          // Ensure getNextOccurrence returns a JS Date
          const nextDate = getNextOccurrence(cursorDate, t.recurringDetails.frequency);
          if (nextDate <= cursorDate) break; // prevent infinite loops
          cursorDate = nextDate;
        }
      }
    });

    const projectionsByAccount = accountsToProject.map(account => {
      // Calculate the starting balance for today
      let startingBalance = account.startingBalance;
      const pastInstances = allInstances.filter(
        (inst) => inst.accountId === account.id && inst.date < today
      );
      startingBalance += pastInstances.reduce((sum, inst) => sum + inst.amount, 0);

      // Map future transactions for this account
      const futureInstancesByDate = new Map();
      allInstances.forEach((inst) => {
        if (inst.accountId === account.id && inst.date >= today && inst.date <= endDate) {
          const dateKey = toDateInputString(inst.date);
          if (!futureInstancesByDate.has(dateKey)) {
            futureInstancesByDate.set(dateKey, []);
          }
          futureInstancesByDate.get(dateKey).push(inst);
        }
      });
      
      // Generate daily projections for this account
      const accountProjections = [];
      let currentBalance = startingBalance;
      for (let i = 0; i < 61; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateKey = toDateInputString(date);

        const transactionsToday = futureInstancesByDate.get(dateKey) || [];
        const dailyNet = transactionsToday.reduce((sum, t) => sum + t.amount, 0);
        currentBalance += dailyNet;

        accountProjections.push({
          date,
          balance: currentBalance,
          transactions: transactionsToday,
        });
      }
      
      return { accountId: account.id, projections: accountProjections };
    });

    return projectionsByAccount;

  }, [accounts, transactions, selectedAccountId]);
};

export default useProjectedBalances;
