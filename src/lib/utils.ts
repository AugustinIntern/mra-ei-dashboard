import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with clsx and tailwind-merge.
 * Useful for resolving class conflicts in dynamic components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a date string in the format "dd/MM/yyyy, HH:mm:ss" (MRA format).
 * Note: Components are treated as local Mauritius time.
 */
export function parseMauritiusDate(dateStr: string): Date | null {
  try {
    const [datePart, timePart] = dateStr.split(', ');
    if (!datePart || !timePart) return null;
    
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  } catch {
    return null;
  }
}

/**
 * Gets the current time adjusted to Mauritius Time (UTC+4).
 */
export function getMauritiusNow(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 4));
}

/**
 * Checks if a date falls on the same calendar day as 'now'.
 */
export function isToday(d: Date, now: Date): boolean {
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

/**
 * Checks if a date falls within the current ISO week (starting Monday).
 */
export function isThisWeek(d: Date, now: Date): boolean {
  const day = now.getDay() || 7; 
  if (day !== 1) {
    now.setHours(-24 * (day - 1)); 
  }
  return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Checks if a date falls within the current calendar month.
 */
export function isThisMonth(d: Date, now: Date): boolean {
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth();
}

/**
 * Formats a Date object or ISO string into a "dd/MM/yyyy HH:mm:ss" string 
 * specifically in the Indian/Mauritius timezone.
 */
export function formatMauritiusDateTime(date: Date | string | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Indian/Mauritius'
  }).format(d).replace(',', '');
}
