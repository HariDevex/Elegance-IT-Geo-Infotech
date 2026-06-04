/**
 * Returns the current date or a provided date as a YYYY-MM-DD string
 * in the project's default timezone (Asia/Kolkata).
 * 
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export const getProjectDateStr = (date = new Date()) => {
  // Use en-CA locale as it defaults to YYYY-MM-DD format
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata'
  }).format(date);
};

/**
 * Returns the current time or a provided date as a HH:mm string
 * in the project's default timezone (Asia/Kolkata).
 * 
 * @param {Date} date - The date to format
 * @returns {string} - Formatted time string (HH:mm)
 */
export const getProjectTimeStr = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  }).format(date);
};
