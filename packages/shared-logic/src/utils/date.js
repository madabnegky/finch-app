import {
  format as formatDateFn,
  parseISO,
  addDays,
  addMonths,
  addYears,
  startOfDay,
  isSameDay,
  isBefore,
  isAfter
} from 'date-fns';

// --- THIS IS THE FIX ---
// The original function could fail in certain time zones due to how JavaScript
// parses date strings. Replacing hyphens with slashes makes the parsing
// more consistent and reliable across different environments.
export const parseDateString = (dateString) => {
  if (!dateString) return null;
  // Replace hyphens with slashes for better cross-browser compatibility
  const formattedDateString = dateString.replace(/-/g, '/');
  return startOfDay(new Date(formattedDateString));
};

export const formatDate = (date, format = 'MM/dd/yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDateFn(dateObj, format);
};

export const getNextOccurrence = (startDate, frequency) => {
  const dt = parseDateString(startDate);
  if (!dt) return null;

  switch (frequency) {
    case 'daily':
      return addDays(dt, 1);
    case 'weekly':
      return addDays(dt, 7);
    case 'bi-weekly':
      return addDays(dt, 14);
    case 'monthly':
      return addMonths(dt, 1);
    case 'quarterly':
      return addMonths(dt, 3);
    case 'annually':
      return addYears(dt, 1);
    default:
      return dt;
  }
};

export const isRecurring = (transaction) => {
  return transaction.recurring && transaction.recurring.frequency !== 'once';
};

export const isOneTime = (transaction) => {
  return !transaction.recurring || transaction.recurring.frequency === 'once';
}

export {
  addDays,
  addMonths,
  addYears,
  startOfDay,
  isSameDay,
  isBefore,
  isAfter
};