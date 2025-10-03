import { useMemo } from 'react';
import { getNextOccurrence, toDateInputString } from '../utils/date';

const useProjectedBalances = (accounts, transactions, selectedAccountId = 'all') => {
  return useMemo(() => {
    const accountsToProject =
      selectedAccountId === 'all'
        ? accounts
        : accounts.filter((acc) => acc.id === selectedAccountId);

    if (!accountsToProject || accountsToProject.length === 0) return [];

    // FIX: Use local time consistently. No more UTC!
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
      if (!t.isRecurring) {
        if (t.date || t.createdAt) {
          allInstances.push({ ...t, date: t.date || t.createdAt });
        }
      } else {
        if (!t.recurringDetails || !t.recurringDetails.nextDate) return;

        let cursorDate = new Date(t.recurringDetails.nextDate);
        const seriesEndDate = t.recurringDetails.endDate
          ? new Date(t.recurringDetails.endDate)
          : null;
        const excludedDates =
          t.recurringDetails.excludedDates?.map((d) => toDateInputString(d)) || [];

        while (cursorDate <= endDate) {
          if (seriesEndDate && cursorDate > seriesEndDate) break;

          if (!excludedDates.includes(toDateInputString(cursorDate))) {
            allInstances.push({ ...t, date: new Date(cursorDate) });
          }
          cursorDate = getNextOccurrence(cursorDate, t.recurringDetails.frequency);
        }
      }
    });

    const startOfTodayBalances = accountsToProject.reduce((acc, account) => {
      let balance = account.startingBalance;
      const pastInstances = allInstances.filter(
        (inst) => inst.accountId === account.id && new Date(inst.date) < today
      );
      balance += pastInstances.reduce((sum, inst) => sum + inst.amount, 0);
      acc[account.id] = balance;
      return acc;
    }, {});

    const dailyMap = new Map();
    allInstances.forEach((t) => {
      const txDate = new Date(t.date);
      if (txDate >= today && txDate <= endDate) {
        const dateKey = toDateInputString(txDate);
        if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, []);
        dailyMap.get(dateKey).push(t);
      }
    });

    const projections = [];
    let dayBalances = { ...startOfTodayBalances };

    for (let i = 0; i < 61; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = toDateInputString(date);

      const transactionsToday = dailyMap.get(dateKey) || [];

      transactionsToday.forEach((t) => {
        if (dayBalances[t.accountId] !== undefined) {
          dayBalances[t.accountId] += t.amount;
        }
      });

      projections.push({
        date,
        balances: { ...dayBalances },
        totalBalance: Object.values(dayBalances).reduce((sum, b) => sum + b, 0),
        transactionsToday: transactionsToday,
      });
    }

    return projections;
  }, [accounts, transactions, selectedAccountId]);
};

export default useProjectedBalances;