import { useMemo } from 'react';
import {
  addDays,
  isBefore,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { getNextOccurrence } from '../utils/date';

const useTransactionInstances = (transactions) => {
  return useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const instances = [];
    const today = startOfDay(new Date());
    const endDate = addDays(today, 30); // Look ahead 30 days for recurring instances

    transactions.forEach((t) => {
      if (t.recurring && t.recurring.frequency !== 'once') {
        let nextDate = t.date.toDate(); // Assuming t.date is a Firebase Timestamp
        
        // --- THIS IS THE FIX ---
        // The previous logic would create duplicate entries for recurring transactions.
        // By tracking the dates of created instances, we prevent this from happening.
        const createdInstanceDates = new Set();

        while (isBefore(nextDate, endDate) || isSameDay(nextDate, endDate)) {
          const dateStr = nextDate.toISOString().split('T')[0];
          if (!createdInstanceDates.has(dateStr)) {
            instances.push({
              ...t,
              id: `${t.id}-${dateStr}`,
              date: nextDate,
              isRecurringInstance: true,
            });
            createdInstanceDates.add(dateStr);
          }
          nextDate = getNextOccurrence(nextDate, t.recurring.frequency);
        }
      } else {
        instances.push({
            ...t,
            date: t.date.toDate(),
        });
      }
    });

    return instances.sort((a, b) => a.date - b.date);
  }, [transactions]);
};

export default useTransactionInstances;