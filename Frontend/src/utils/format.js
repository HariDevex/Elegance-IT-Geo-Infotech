import { getProjectDateStr, getProjectTimeStr } from "./dateUtils";

/**
 * Standardized Date formatter for the UI
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  
  const dateStr = getProjectDateStr(d);
  if (!includeTime) return dateStr;
  
  return `${dateStr} ${getProjectTimeStr(d)}`;
};

/**
 * Human-readable relative time (e.g., "Just now", "5m ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return getProjectDateStr(d);
};
