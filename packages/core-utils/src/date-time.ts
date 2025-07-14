/**
 * Date and time utilities
 */

import { TIME } from './constants';

// Date creation utilities
export const createDate = (input?: string | number | Date): Date => {
  if (!input) return new Date();
  return new Date(input);
};

export const createUtcDate = (input?: string | number | Date): Date => {
  const date = createDate(input);
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};

export const createDateFromParts = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date => {
  return new Date(year, month - 1, day, hour, minute, second, millisecond);
};

// Date validation
export const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const isSameMonth = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
};

export const isSameYear = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear();
};

// Date arithmetic
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  return addDays(date, weeks * 7);
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

export const addSeconds = (date: Date, seconds: number): Date => {
  const result = new Date(date);
  result.setSeconds(result.getSeconds() + seconds);
  return result;
};

export const addMilliseconds = (date: Date, milliseconds: number): Date => {
  return new Date(date.getTime() + milliseconds);
};

// Date difference calculations
export const diffInMilliseconds = (date1: Date, date2: Date): number => {
  return Math.abs(date1.getTime() - date2.getTime());
};

export const diffInSeconds = (date1: Date, date2: Date): number => {
  return Math.floor(diffInMilliseconds(date1, date2) / TIME.SECOND);
};

export const diffInMinutes = (date1: Date, date2: Date): number => {
  return Math.floor(diffInMilliseconds(date1, date2) / TIME.MINUTE);
};

export const diffInHours = (date1: Date, date2: Date): number => {
  return Math.floor(diffInMilliseconds(date1, date2) / TIME.HOUR);
};

export const diffInDays = (date1: Date, date2: Date): number => {
  return Math.floor(diffInMilliseconds(date1, date2) / TIME.DAY);
};

export const diffInWeeks = (date1: Date, date2: Date): number => {
  return Math.floor(diffInDays(date1, date2) / 7);
};

export const diffInMonths = (date1: Date, date2: Date): number => {
  const yearDiff = date1.getFullYear() - date2.getFullYear();
  const monthDiff = date1.getMonth() - date2.getMonth();
  return yearDiff * 12 + monthDiff;
};

export const diffInYears = (date1: Date, date2: Date): number => {
  return date1.getFullYear() - date2.getFullYear();
};

// Date range utilities
export const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const getMonthRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return { start, end };
};

export const getYearRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  
  return { start, end };
};

// Date formatting utilities
export const formatIsoDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatIsoDateTime = (date: Date): string => {
  return date.toISOString();
};

export const formatTime = (date: Date, use24Hour = true): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  };
  return date.toLocaleTimeString(undefined, options);
};

export const formatDateTime = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleString(undefined, { ...defaultOptions, ...options });
};

// Timezone utilities
export const getTimezoneOffset = (date: Date = new Date()): number => {
  return date.getTimezoneOffset();
};

export const getTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const convertToTimezone = (date: Date, timezone: string): Date => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const targetTime = new Date(utc);
  
  // This is a simplified conversion - in production, use a proper timezone library
  return targetTime;
};

// Business day utilities
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const isWeekday = (date: Date): boolean => {
  return !isWeekend(date);
};

export const getNextWeekday = (date: Date): Date => {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (isWeekend(next));
  return next;
};

export const getPreviousWeekday = (date: Date): Date => {
  const prev = new Date(date);
  do {
    prev.setDate(prev.getDate() - 1);
  } while (isWeekend(prev));
  return prev;
};

export const countWeekdays = (start: Date, end: Date): number => {
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (isWeekday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// Age calculation
export const calculateAge = (birthDate: Date, referenceDate: Date = new Date()): number => {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Relative time utilities
export const getRelativeTime = (date: Date, referenceDate: Date = new Date()): string => {
  const diff = referenceDate.getTime() - date.getTime();
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;
  
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  
  if (absDiff < TIME.MINUTE) {
    return rtf.format(isFuture ? 1 : -1, 'minute');
  } else if (absDiff < TIME.HOUR) {
    const minutes = Math.floor(absDiff / TIME.MINUTE);
    return rtf.format(isFuture ? minutes : -minutes, 'minute');
  } else if (absDiff < TIME.DAY) {
    const hours = Math.floor(absDiff / TIME.HOUR);
    return rtf.format(isFuture ? hours : -hours, 'hour');
  } else if (absDiff < TIME.WEEK) {
    const days = Math.floor(absDiff / TIME.DAY);
    return rtf.format(isFuture ? days : -days, 'day');
  } else if (absDiff < TIME.MONTH) {
    const weeks = Math.floor(absDiff / TIME.WEEK);
    return rtf.format(isFuture ? weeks : -weeks, 'week');
  } else if (absDiff < TIME.YEAR) {
    const months = Math.floor(absDiff / TIME.MONTH);
    return rtf.format(isFuture ? months : -months, 'month');
  } else {
    const years = Math.floor(absDiff / TIME.YEAR);
    return rtf.format(isFuture ? years : -years, 'year');
  }
};

// Date parsing utilities
export const parseIsoDate = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    return isValidDate(date) ? date : null;
  } catch {
    return null;
  }
};

export const parseDateString = (dateString: string, format?: string): Date | null => {
  // Basic implementation - in production, use a proper date parsing library
  try {
    const date = new Date(dateString);
    return isValidDate(date) ? date : null;
  } catch {
    return null;
  }
};

// Date constants
export const EPOCH = new Date(1970, 0, 1);
export const MIN_DATE = new Date(-8640000000000000);
export const MAX_DATE = new Date(8640000000000000);

// Common date presets
export const today = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const tomorrow = (): Date => {
  return addDays(today(), 1);
};

export const yesterday = (): Date => {
  return addDays(today(), -1);
};

export const startOfWeek = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
};

export const endOfWeek = (date: Date = new Date()): Date => {
  const end = new Date(date);
  end.setDate(date.getDate() + (6 - date.getDay()));
  end.setHours(23, 59, 59, 999);
  return end;
};

export const startOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const startOfYear = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), 0, 1);
};

export const endOfYear = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
};

