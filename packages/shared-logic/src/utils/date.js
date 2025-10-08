import {
  format as formatDateFn,
  addDays,
  addMonths,
  addYears,
  startOfDay,
  isSameDay,
  isBefore,
  isAfter
} from 'date-fns';

// --- START DEFINITIVE FIX ---
// This function is now the single source of truth for creating timezone-proof dates.
// It correctly handles date strings, Firestore Timestamps, and existing Date objects.
export const parseDateString = (dateString) => {
  if (!dateString) return null;
  // If it's a Firestore Timestamp object with a toDate method
  if (dateString && typeof dateString.toDate === 'function') {
      return dateString.toDate();
  }
  // If it's already a JavaScript Date object
  if (dateString instanceof Date) {
    return dateString;
  }
  // For "YYYY-MM-DD" strings or ISO strings, split and construct as UTC.
  // This is the key part that prevents the browser's local timezone from shifting the date.
  const parts = String(dateString).split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
    const day = parseInt(parts[2], 10);
    // Using Date.UTC ensures the date is created in a timezone-neutral way.
    return new Date(Date.UTC(year, month, day));
  }
  // Fallback for any other date string formats, attempting a standard parse.
  return new Date(dateString);
};

// This function now uses the robust parser before formatting.
export const toDateInputString = (date) => {
    if (!date) return '';
    const dateObj = parseDateString(date);
    // Use getUTC methods to ensure the output string matches the UTC date, not the local one.
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export const formatDate = (date, format = 'MM/dd/yyyy') => {
  if (!date) return '';
  const dateObj = parseDateString(date);
  // formatDateFn from date-fns will use the browser's local timezone for formatting,
  // which can be misleading. We force it to format based on UTC values.
  // This is a common workaround when not using a full timezone library.
  const utcDate = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
  return formatDateFn(utcDate, format);
};
// --- END DEFINITIVE FIX ---


export const getNextOccurrence = (startDate, frequency) => {
  const dt = parseDateString(startDate); // Always use the robust parser
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
  return transaction.isRecurring;
};

export const isOneTime = (transaction) => {
  return !transaction.isRecurring;
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