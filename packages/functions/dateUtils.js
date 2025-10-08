const { addDays, addMonths, addYears, startOfDay } = require('date-fns');

// --- START DEFINITIVE FIX ---
// This function mirrors the client-side logic exactly, ensuring consistent date handling.
const parseDateString = (dateString) => {
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
  const parts = String(dateString).split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
    const day = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day));
  }
  // Fallback for any other date string formats
  return new Date(dateString);
};

// This function now ensures the output string is based on UTC values.
const toDateInputString = (date) => {
    if (!date) return '';
    const dateObj = parseDateString(date);
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// --- END DEFINITIVE FIX ---


const getNextOccurrence = (startDate, frequency) => {
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

module.exports = {
  parseDateString,
  getNextOccurrence,
  startOfDay,
  toDateInputString,
};