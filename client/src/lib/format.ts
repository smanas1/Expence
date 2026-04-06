import { format, formatDistanceToNow, formatRelative } from "date-fns";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRecentDate(value: string) {
  const date = new Date(value);
  const distance = formatDistanceToNow(date, { addSuffix: true });
  return distance.includes("day") ? formatRelative(date, new Date()) : distance;
}

export function formatCalendarDate(value: string) {
  return format(new Date(value), "dd MMM yyyy");
}
