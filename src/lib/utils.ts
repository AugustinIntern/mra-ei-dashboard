/** File: UI/application module for the dashboard project. */
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
    if (!dateStr) return null;

    if (dateStr.includes('/')) {
      const [datePart, timePart = '00:00:00'] = dateStr.split(', ');
      const [day, month, year] = datePart.split('/').map((v) => parseInt(v, 10));
      const [hours, minutes, seconds] = timePart.split(':').map((v) => parseInt(v, 10));

      if ([day, month, year, hours, minutes, seconds].some((v) => Number.isNaN(v))) {
        return null;
      }

      return new Date(year, month - 1, day, hours, minutes, seconds);
    }

    // Fallback for ISO/RFC timestamps returned by some API responses.
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Gets the current time adjusted to Mauritius Time (UTC+4).
 */
export function getMauritiusNow(): Date {
  return new Date();
}

function getMauritiusDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Indian/Mauritius',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return { year, month, day };
}

function getMauritiusDayNumber(date: Date): number {
  const { year, month, day } = getMauritiusDateParts(date);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function getMauritiusWeekday(date: Date): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Indian/Mauritius',
    weekday: 'short'
  }).format(date);

  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7
  };

  return map[weekday] ?? 1;
}

/**
 * Checks if a date falls on the same calendar day as 'now'.
 */
export function isToday(d: Date, now: Date): boolean {
  const a = getMauritiusDateParts(d);
  const b = getMauritiusDateParts(now);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Checks if a date falls within the current ISO week (starting Monday).
 */
export function isThisWeek(d: Date, now: Date): boolean {
  const nowDay = getMauritiusDayNumber(now);
  const dDay = getMauritiusDayNumber(d);
  const startOfWeek = nowDay - (getMauritiusWeekday(now) - 1);
  return dDay >= startOfWeek && dDay <= nowDay;
}

/**
 * Checks if a date falls within the current calendar month.
 */
export function isThisMonth(d: Date, now: Date): boolean {
  const a = getMauritiusDateParts(d);
  const b = getMauritiusDateParts(now);
  return a.year === b.year && a.month === b.month;
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
