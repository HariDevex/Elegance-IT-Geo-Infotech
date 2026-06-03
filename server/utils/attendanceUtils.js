export const LATE_THRESHOLD_HOUR = 9;
export const LATE_THRESHOLD_MINUTE = 15;

export const isLateCheckIn = (checkInTime) => {
  if (!checkInTime) return false;
  const checkIn = new Date(checkInTime);
  const hour = checkIn.getHours();
  const minute = checkIn.getMinutes();
  if (hour > LATE_THRESHOLD_HOUR) return true;
  if (hour === LATE_THRESHOLD_HOUR && minute > LATE_THRESHOLD_MINUTE) return true;
  return false;
};

export const canViewAll = (role) => ["root", "admin", "manager"].includes(role);
export const canWrite = (role) => ["root", "admin", "manager"].includes(role);
