export const getNextDate = (startDate, frequency) => {
    const date = new Date(startDate);
    if (isNaN(date.getTime())) return new Date();
    
    // Use local date methods consistently
    switch (frequency) {
      case 'weekly': date.setDate(date.getDate() + 7); break;
      case 'bi-weekly': date.setDate(date.getDate() + 14); break;
      case 'monthly': date.setMonth(date.getMonth() + 1); break;
      case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
      default: break;
    }
    return date;
  };
  
  export const toDateInputString = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const d = new Date(date);
    
    // Use local date parts consistently
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  export const parseDateString = (dateString) => {
    if (!dateString) return null;
    
    // THE FIX: Replacing hyphens with slashes is the most robust way
    // to make JavaScript's Date constructor parse the date string as
    // midnight LOCAL time, preventing the timezone shift.
    return new Date(dateString.replace(/-/g, '/'));
  };