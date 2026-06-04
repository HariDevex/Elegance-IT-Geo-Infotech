export const LATE_THRESHOLD_HOUR = 9;
export const LATE_THRESHOLD_MINUTE = 15;

export const isLateCheckIn = (checkInTime, timezone = 'Asia/Kolkata') => {
  if (!checkInTime) return false;
  const date = new Date(checkInTime);
  
  // Use Intl.DateTimeFormat to extract hour and minute in the target timezone
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: timezone
  }).formatToParts(date);
  
  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  
  if (hour > LATE_THRESHOLD_HOUR) return true;
  if (hour === LATE_THRESHOLD_HOUR && minute > LATE_THRESHOLD_MINUTE) return true;
  return false;
};

export const canViewAll = (role) => ["root", "admin", "manager", "teamlead", "hr"].includes(role);
export const canWrite = (role) => ["root", "admin", "manager", "teamlead", "hr"].includes(role);
