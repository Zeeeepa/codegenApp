/**
 * Formatting utilities for display and data transformation
 */

import { TIME, SIZE } from './constants';

// Date and time formatting
export const formatDate = (date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (!d || isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString();
    case 'long':
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'iso':
      return d.toISOString();
    default:
      return d.toLocaleDateString();
  }
};

export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  if (diff < TIME.MINUTE) {
    return 'just now';
  } else if (diff < TIME.HOUR) {
    const minutes = Math.floor(diff / TIME.MINUTE);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diff < TIME.DAY) {
    const hours = Math.floor(diff / TIME.HOUR);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diff < TIME.WEEK) {
    const days = Math.floor(diff / TIME.DAY);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diff < TIME.MONTH) {
    const weeks = Math.floor(diff / TIME.WEEK);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diff < TIME.YEAR) {
    const months = Math.floor(diff / TIME.MONTH);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diff / TIME.YEAR);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < TIME.SECOND) {
    return `${milliseconds}ms`;
  } else if (milliseconds < TIME.MINUTE) {
    const seconds = Math.floor(milliseconds / TIME.SECOND);
    return `${seconds}s`;
  } else if (milliseconds < TIME.HOUR) {
    const minutes = Math.floor(milliseconds / TIME.MINUTE);
    const seconds = Math.floor((milliseconds % TIME.MINUTE) / TIME.SECOND);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(milliseconds / TIME.HOUR);
    const minutes = Math.floor((milliseconds % TIME.HOUR) / TIME.MINUTE);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  const index = Math.floor(Math.log(bytes) / Math.log(base));
  const size = bytes / Math.pow(base, index);
  
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

// Number formatting
export const formatNumber = (num: number, options: Intl.NumberFormatOptions = {}): string => {
  return new Intl.NumberFormat(undefined, options).format(num);
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount);
};

// String formatting
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const titleCase = (str: string): string => {
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

export const camelCase = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

export const kebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

export const snakeCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();
};

export const truncate = (str: string, maxLength: number, suffix = '...'): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

export const pluralize = (word: string, count: number): string => {
  if (count === 1) return word;
  
  // Simple pluralization rules
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  } else if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
    return word + 'es';
  } else {
    return word + 's';
  }
};

// Code formatting
export const formatJson = (obj: any, indent = 2): string => {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return String(obj);
  }
};

export const formatCode = (code: string, language?: string): string => {
  // Basic code formatting - would integrate with a proper formatter
  return code
    .split('\n')
    .map(line => line.trim())
    .join('\n');
};

// Status formatting
export const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
};

export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    running: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
    cancelled: '#6b7280',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  
  return statusColors[status.toLowerCase()] || '#6b7280';
};

// URL formatting
export const formatUrl = (url: string, maxLength = 50): string => {
  try {
    const urlObj = new URL(url);
    const formatted = `${urlObj.hostname}${urlObj.pathname}`;
    return truncate(formatted, maxLength);
  } catch {
    return truncate(url, maxLength);
  }
};

export const addQueryParams = (url: string, params: Record<string, any>): string => {
  const urlObj = new URL(url);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      urlObj.searchParams.set(key, String(value));
    }
  });
  
  return urlObj.toString();
};

// Array formatting
export const formatList = (items: string[], conjunction = 'and'): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  
  return `${otherItems.join(', ')}, ${conjunction} ${lastItem}`;
};

// Template formatting
export const template = (str: string, variables: Record<string, any>): string => {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
};

// Validation message formatting
export const formatValidationError = (field: string, rule: string, value?: any): string => {
  const messages: Record<string, string> = {
    required: `${titleCase(field)} is required`,
    email: `${titleCase(field)} must be a valid email address`,
    url: `${titleCase(field)} must be a valid URL`,
    minLength: `${titleCase(field)} must be at least {{min}} characters long`,
    maxLength: `${titleCase(field)} must be no more than {{max}} characters long`,
    pattern: `${titleCase(field)} format is invalid`,
    range: `${titleCase(field)} must be between {{min}} and {{max}}`,
    positive: `${titleCase(field)} must be a positive number`,
    integer: `${titleCase(field)} must be an integer`,
  };
  
  return messages[rule] || `${titleCase(field)} is invalid`;
};

// HTML/Text formatting
export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const unescapeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

