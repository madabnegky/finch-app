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

export const parseDateString = (dateString) => {
  if (!dateString) return null;
  const formattedDateString = dateString.replace(/-/g, '/');
  return startOfDay(new Date(formattedDateString));
};

export const toDateInputString = (date) => {
    if (!date) return '';
    // YYYY-MM-DD
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
        .toISOString()
        .split("T")[0];
}

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