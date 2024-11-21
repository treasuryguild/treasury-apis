// utils/dateHelpers.js
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  const [day, month, year] = dateString.split('.');
  const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
  return new Date(`${fullYear}-${month}-${day}`);
};

export const getMonthsDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const yearDiff = d2.getFullYear() - d1.getFullYear();
  const monthDiff = d2.getMonth() - d1.getMonth();
  return yearDiff * 12 + monthDiff;
};

export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return true;

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end < start) {
    throw new Error('End date cannot be before start date');
  }

  const monthsDiff = Math.abs(getMonthsDifference(start, end));
  if (monthsDiff > 10) {
    throw new Error('Date range exceeds maximum allowed period of 10 months');
  }

  return true;
};