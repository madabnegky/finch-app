// FIX: Corrected the import path to 'date-fns'
const { addDays, addMonths, addYears, startOfDay } = require('date-fns');

const parseDateString = (dateString) => {
  if (!dateString) return null;
  return startOfDay(new Date(dateString.replace(/-/g, '/')));
};

const getNextOccurrence = (startDate, frequency) => {
  const dt = startDate instanceof Date ? startDate : parseDateString(startDate);
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
};