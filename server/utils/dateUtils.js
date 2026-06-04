/**
 * Returns the current date as a YYYY-MM-DD string
 * in the project's default timezone (Asia/Kolkata).
 * 
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export const getProjectDateStr = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata'
  }).format(date);
};

/**
 * Returns the current date as a Date object normalized to the start of the day
 * in the project's default timezone (Asia/Kolkata).
 */
export const getProjectToday = () => {
  const dateStr = getProjectDateStr();
  return new Date(`${dateStr}T00:00:00.000Z`);
};
