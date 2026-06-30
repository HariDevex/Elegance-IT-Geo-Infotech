export const LATE_THRESHOLD_HOUR = 9;
export const LATE_THRESHOLD_MINUTE = 30;
export const EARLY_LEAVE_HOUR = 18;
export const EARLY_LEAVE_MINUTE = 30;

export const parseDbDate = (dbTime) => {
  if (!dbTime) return null;
  if (dbTime instanceof Date) return dbTime;
  if (typeof dbTime === "string") {
    if (!dbTime.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(dbTime)) {
      const formatted = dbTime.includes("T") ? dbTime : dbTime.replace(" ", "T");
      return new Date(formatted + "Z");
    }
  }
  return new Date(dbTime);
};

export const isLateCheckIn = (checkInTime, timezone = 'Asia/Kolkata') => {
  if (!checkInTime) return false;
  const date = parseDbDate(checkInTime);
  if (!date || isNaN(date.getTime())) return false;
  
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

export const isEarlyCheckout = (checkOutTime, timezone = 'Asia/Kolkata') => {
  if (!checkOutTime) return false;
  const date = parseDbDate(checkOutTime);
  if (!date || isNaN(date.getTime())) return false;

  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: timezone
  }).formatToParts(date);

  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);

  if (hour < EARLY_LEAVE_HOUR) return true;
  if (hour === EARLY_LEAVE_HOUR && minute < EARLY_LEAVE_MINUTE) return true;
  return false;
};

export const canViewAll = (role) => ["root", "admin", "manager", "teamlead", "hr"].includes(role);
export const canWrite = (role) => ["root", "admin", "manager", "teamlead", "hr"].includes(role);
