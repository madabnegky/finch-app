/**
 * Utility for generating transaction instances from recurring series
 * Mirrors the web app's Cloud Function logic
 */

type Transaction = {
  id: string;
  description?: string;
  name?: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: any;
  isRecurring: boolean;
  accountId?: string;
  recurringDetails?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    nextDate: string;
    endDate?: string;
    excludedDates?: string[];
  };
  frequency?: string; // Legacy field
};

type TransactionInstance = Transaction & {
  isInstance?: boolean;
  instanceId?: string;
};

/**
 * Parse various date formats into a JavaScript Date object
 */
const parseDateString = (dateInput: any): Date | null => {
  if (!dateInput) return null;

  // If it's a Firestore Timestamp with toDate method
  if (dateInput && typeof dateInput.toDate === 'function') {
    return dateInput.toDate();
  }

  // If it's already a Date object
  if (dateInput instanceof Date) {
    return dateInput;
  }

  // For "YYYY-MM-DD" strings or ISO strings
  const parts = String(dateInput).split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Fallback
  return new Date(dateInput);
};

/**
 * Convert Date to YYYY-MM-DD string
 */
const toDateInputString = (date: Date | null): string => {
  if (!date) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get the next occurrence date based on frequency
 * IMPORTANT: Use UTC methods to avoid timezone issues
 */
const getNextOccurrence = (startDate: Date, frequency: string): Date | null => {
  if (!startDate) return null;

  // Use UTC methods throughout to avoid timezone shifts
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const day = startDate.getUTCDate();

  switch (frequency) {
    case 'daily':
      return new Date(Date.UTC(year, month, day + 1));
    case 'weekly':
      return new Date(Date.UTC(year, month, day + 7));
    case 'biweekly':
    case 'bi-weekly':
      return new Date(Date.UTC(year, month, day + 14));
    case 'monthly':
      return new Date(Date.UTC(year, month + 1, day));
    case 'quarterly':
      return new Date(Date.UTC(year, month + 3, day));
    case 'annually':
      return new Date(Date.UTC(year + 1, month, day));
    default:
      return new Date(Date.UTC(year, month, day));
  }
};

/**
 * Generate transaction instances from recurring series
 * This mirrors the web app's Cloud Function logic
 *
 * @param transactions - Raw transactions from Firestore (series + one-time)
 * @param daysToProject - Number of days to project into the future (default: 365 for 12 months)
 * @returns Array of all transactions including generated instances
 */
export const generateTransactionInstances = (
  transactions: Transaction[],
  daysToProject: number = 365
): TransactionInstance[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysToProject);

  const allInstances: TransactionInstance[] = [];

  transactions.forEach((txn) => {
    // Non-recurring transactions: just add them as-is
    if (!txn.isRecurring) {
      const transactionDate = parseDateString(txn.date);
      if (transactionDate) {
        allInstances.push({ ...txn, date: transactionDate });
      }
      return;
    }

    // Recurring transactions: generate instances
    // Support both new format (recurringDetails.nextDate) and old format (nextOccurrence/date)
    const nextDateField = txn.recurringDetails?.nextDate || txn.nextOccurrence || txn.date;
    const frequencyField = txn.recurringDetails?.frequency || txn.frequency;

    if (!nextDateField || !frequencyField) {
      console.warn('Skipping recurring transaction - missing nextDate or frequency:', txn.id);
      return;
    }

    let cursorDate = parseDateString(nextDateField);
    const seriesEndDate = txn.recurringDetails?.endDate
      ? parseDateString(txn.recurringDetails.endDate)
      : null;
    const excludedDates = txn.recurringDetails?.excludedDates?.map(d =>
      toDateInputString(parseDateString(d))
    ) || [];

    let safetyBreak = 0;
    while (cursorDate && cursorDate <= endDate && safetyBreak < 1000) {
      // Stop if we've passed the series end date
      if (seriesEndDate && cursorDate > seriesEndDate) break;

      // Skip excluded dates
      const dateKey = toDateInputString(cursorDate);
      if (!excludedDates.includes(dateKey)) {
        allInstances.push({
          ...txn,
          isInstance: true,
          instanceId: `${txn.id}-${dateKey}`,
          date: new Date(cursorDate),
        });
      }

      // Get next occurrence (support both formats)
      const nextDate = getNextOccurrence(cursorDate, frequencyField);
      if (!nextDate || nextDate <= cursorDate) break;

      cursorDate = nextDate;
      safetyBreak++;
    }
  });

  return allInstances;
};

/**
 * Get instances for a specific date range
 */
export const getInstancesInRange = (
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): TransactionInstance[] => {
  const daysToProject = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const allInstances = generateTransactionInstances(transactions, Math.max(daysToProject, 365));

  return allInstances.filter(inst => {
    const instDate = inst.date instanceof Date ? inst.date : parseDateString(inst.date);
    return instDate && instDate >= startDate && instDate <= endDate;
  });
};

/**
 * Get raw series (non-instances) only
 */
export const getRecurringSeries = (transactions: Transaction[]): Transaction[] => {
  return transactions.filter(txn => txn.isRecurring && !txn.isInstance);
};
