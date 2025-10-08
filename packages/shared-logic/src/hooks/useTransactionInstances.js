import { useMemo } from 'react';
import { getNextOccurrence, parseDateString, toDateInputString } from '../utils/date';

const useTransactionInstances = (transactions, daysToProject = 60) => {
    return useMemo(() => {
        if (!transactions) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setDate(today.getDate() + daysToProject);

        const allInstances = [];

        // --- THIS IS THE FIX ---
        // A robust helper to consistently convert Firestore Timestamps, date strings,
        // or existing Date objects into a clean JavaScript Date object.
        const toJSDate = (timestamp) => {
            if (!timestamp) return null;
            // If it's a Firestore Timestamp object with a toDate method
            if (timestamp && typeof timestamp.toDate === 'function') {
                return timestamp.toDate();
            }
            // If it's already a JavaScript Date object
            if (timestamp instanceof Date) {
                return timestamp;
            }
            // If it's a date string (e.g., "YYYY-MM-DD")
            if (typeof timestamp === 'string') {
                return parseDateString(timestamp);
            }
            // Fallback for other potential numeric/string formats
            try {
                const date = new Date(timestamp);
                if (!isNaN(date)) return date;
            } catch (e) {
                console.error("Could not parse date:", timestamp);
                return null;
            }
            return null;
        };

        transactions.forEach(t => {
            if (!t.isRecurring) {
                // For non-recurring transactions, just ensure the date is a proper JS Date
                const transactionDate = toJSDate(t.date || t.createdAt);
                if (transactionDate) {
                    allInstances.push({ ...t, date: transactionDate });
                }
            } else {
                // For recurring transactions, generate future instances
                if (!t.recurringDetails || !t.recurringDetails.nextDate) return;

                let cursorDate = toJSDate(t.recurringDetails.nextDate);
                const seriesEndDate = toJSDate(t.recurringDetails.endDate);
                const excludedDates = t.recurringDetails.excludedDates?.map(d => toDateInputString(toJSDate(d))) || [];
                
                let safetyBreak = 0; // Prevent potential infinite loops

                while (cursorDate && cursorDate <= endDate && safetyBreak < 1000) {
                    if (seriesEndDate && cursorDate > seriesEndDate) break;

                    if (!excludedDates.includes(toDateInputString(cursorDate))) {
                        allInstances.push({
                            ...t,
                            date: new Date(cursorDate),
                            isInstance: true,
                            instanceId: `${t.id}-${toDateInputString(cursorDate)}`,
                        });
                    }

                    const nextDate = getNextOccurrence(cursorDate, t.recurringDetails.frequency);
                    
                    // Safety check: if the next date is not after the current one, stop.
                    if (!nextDate || nextDate <= cursorDate) break;
                    
                    cursorDate = nextDate;
                    safetyBreak++;
                }
            }
        });

        return allInstances;

    }, [transactions, daysToProject]);
};

export default useTransactionInstances;