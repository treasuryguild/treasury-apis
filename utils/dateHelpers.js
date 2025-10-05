// utils/dateHelpers.js
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // Trim whitespace
  const trimmed = dateString.trim();
  
  // Try different date formats
  const formats = [
    // DD.MM.YYYY format (4-digit year)
    {
      pattern: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
      parser: (match) => {
        const [, day, month, year] = match;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    },
    // DD.MM.YY format (2-digit year)
    {
      pattern: /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/,
      parser: (match) => {
        const [, day, month, year] = match;
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    },
    // YYYY-MM-DD format
    {
      pattern: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      parser: (match) => {
        const [, year, month, day] = match;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    },
    // DD/MM/YYYY format
    {
      pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      parser: (match) => {
        const [, day, month, year] = match;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    },
    // DD/MM/YY format
    {
      pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
      parser: (match) => {
        const [, day, month, year] = match;
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    }
  ];

  for (const format of formats) {
    const match = trimmed.match(format.pattern);
    if (match) {
      try {
        const date = format.parser(match);
        // Validate the date is actually valid
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        return date;
      } catch (error) {
        // Continue to next format
        continue;
      }
    }
  }

  // If no format matches, throw a descriptive error
  throw new Error(`Invalid date format: "${dateString}". Supported formats: DD.MM.YYYY, DD.MM.YY, YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY`);
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
  
  // Check if dates are valid
  if (isNaN(start.getTime())) {
    throw new Error(`Invalid start date: "${startDate}". Please provide a valid date.`);
  }
  
  if (isNaN(end.getTime())) {
    throw new Error(`Invalid end date: "${endDate}". Please provide a valid date.`);
  }
  
  // Check if end date is before start date
  if (end < start) {
    const startFormatted = start.toLocaleDateString();
    const endFormatted = end.toLocaleDateString();
    throw new Error(`End date (${endFormatted}) cannot be before start date (${startFormatted}). Please ensure the end date is after or equal to the start date.`);
  }

  // Check if dates are too far in the future
  const now = new Date();
  const maxFutureDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  if (start > maxFutureDate) {
    throw new Error(`Start date cannot be more than 1 year in the future. Provided: ${start.toLocaleDateString()}`);
  }
  if (end > maxFutureDate) {
    throw new Error(`End date cannot be more than 1 year in the future. Provided: ${end.toLocaleDateString()}`);
  }

  // Check date range limit
  const monthsDiff = Math.abs(getMonthsDifference(start, end));
  if (monthsDiff > 10) {
    const startFormatted = start.toLocaleDateString();
    const endFormatted = end.toLocaleDateString();
    throw new Error(`Date range exceeds maximum allowed period of 10 months. Range: ${startFormatted} to ${endFormatted} (${monthsDiff} months). Please reduce the date range.`);
  }

  return true;
};