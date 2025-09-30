import { useMemo } from 'react';
import { getNextDate, toDateInputString } from '../utils/date';

const useTransactionInstances = (transactions) => {
  return useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to the end of today for comparison

    const allTransactions = [];

    transactions.forEach(t => {
      if (!t.isRecurring) {
        allTransactions.push(t);
      } else {
        if (!t.recurringDetails || !t.recurringDetails.nextDate) return;

        const excludedDates = t.recurringDetails.excludedDates?.map(d => toDateInputString(d)) || [];
        let cursorDate = new Date(t.recurringDetails.nextDate);

        // FIX: Track the dates of instances we create to prevent duplicates
        const createdInstanceDates = new Set();

        // Generate past and present instances
        while (cursorDate <= today) {
          const seriesEndDate = t.recurringDetails.endDate ? new Date(t.recurringDetails.endDate) : null;
          if (seriesEndDate && cursorDate > seriesEndDate) {
            break;
          }

          const dateString = toDateInputString(cursorDate);
          if (!excludedDates.includes(dateString)) {
            allTransactions.push({
              ...t,
              id: `${t.id}-${cursorDate.getTime()}`,
              date: new Date(cursorDate),
              isInstance: true,
              parentId: t.id,
            });
            createdInstanceDates.add(dateString);
          }
          cursorDate = getNextDate(cursorDate, t.recurringDetails.frequency);
        }

        // FIX: Only add the main recurring "template" if an instance for its next date hasn't already been created.
        const nextDateString = toDateInputString(t.recurringDetails.nextDate);
        if (!createdInstanceDates.has(nextDateString)) {
            const seriesEndDate = t.recurringDetails.endDate ? new Date(t.recurringDetails.endDate) : null;
            if (!seriesEndDate || new Date(t.recurringDetails.nextDate) <= seriesEndDate) {
                allTransactions.push(t);
            }
        }
      }
    });

    return allTransactions.sort((a, b) => {
      const dateA = a.isRecurring && !a.isInstance ? a.recurringDetails.nextDate : (a.date || a.createdAt);
      const dateB = b.isRecurring && !b.isInstance ? b.recurringDetails.nextDate : (b.date || b.createdAt);
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });

  }, [transactions]);
};

export default useTransactionInstances;