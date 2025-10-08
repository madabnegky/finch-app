const { getNextOccurrence, toDateInputString } = require('./dateUtils'); // We will create this file next

const calculateProjections = (accounts, transactions, daysToProject = 60) => {
  if (!accounts || accounts.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysToProject);

  const allInstances = [];
  transactions.forEach((t) => {
    if (!t.isRecurring) {
      if (t.date || t.createdAt) {
        allInstances.push({ ...t, date: t.date || t.createdAt });
      }
    } else {
      if (!t.recurringDetails || !t.recurringDetails.nextDate) return;

      let cursorDate = new Date(t.recurringDetails.nextDate);
      const seriesEndDate = t.recurringDetails.endDate ? new Date(t.recurringDetails.endDate) : null;
      const excludedDates = t.recurringDetails.excludedDates?.map((d) => toDateInputString(d)) || [];

      while (cursorDate <= endDate) {
        if (seriesEndDate && cursorDate > seriesEndDate) break;
        if (!excludedDates.includes(toDateInputString(cursorDate))) {
          allInstances.push({ ...t, date: new Date(cursorDate) });
        }
        cursorDate = getNextOccurrence(cursorDate, t.recurringDetails.frequency);
      }
    }
  });

  const projections = [];
  for (const account of accounts) {
    let balance = account.startingBalance;
    const pastInstances = allInstances.filter(
      (inst) => inst.accountId === account.id && new Date(inst.date) < today
    );
    balance += pastInstances.reduce((sum, inst) => sum + inst.amount, 0);

    const accountProjections = [];
    let currentBalance = balance;

    for (let i = 0; i <= daysToProject; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = toDateInputString(date);

      const transactionsToday = allInstances.filter(
        (inst) => inst.accountId === account.id && toDateInputString(new Date(inst.date)) === dateKey
      );
      
      transactionsToday.forEach((t) => {
        currentBalance += t.amount;
      });

      accountProjections.push({
        date,
        balance: currentBalance,
      });
    }
    projections.push({ accountId: account.id, projections: accountProjections });
  }

  return projections;
};

const getAvailableToSpend = (accountProjections) => {
    if (!accountProjections || accountProjections.length === 0) {
        return 0;
    }
    const lowestBalance = Math.min(...accountProjections.map(p => p.balance));
    return lowestBalance;
}


module.exports = { calculateProjections, getAvailableToSpend };