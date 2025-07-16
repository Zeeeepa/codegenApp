/**
 * Cryptographic utilities
 */

// Generate random string
export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate UUID v4
export const generateUuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Simple hash function (not cryptographically secure)
export const simpleHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

// Base64 encoding/decoding
export const base64Encode = (str: string): string => {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // Node.js fallback
  return Buffer.from(str, 'utf8').toString('base64');
};

export const base64Decode = (str: string): string => {
  if (typeof atob !== 'undefined') {
    return atob(str);
  }
  // Node.js fallback
  return Buffer.from(str, 'base64').toString('utf8');
};

// URL-safe base64
export const base64UrlEncode = (str: string): string => {
  return base64Encode(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const base64UrlDecode = (str: string): string => {
  // Add padding if needed
  const padded = str + '==='.slice((str.length + 3) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return base64Decode(base64);
};

// JWT utilities (basic, not for production use)
export interface JwtHeader {
  alg: string;
  typ: string;
}

export interface JwtPayload {
  [key: string]: any;
  iss?: string; // issuer
  sub?: string; // subject
  aud?: string; // audience
  exp?: number; // expiration time
  nbf?: number; // not before
  iat?: number; // issued at
  jti?: string; // JWT ID
}

export const parseJwt = (token: string): { header: JwtHeader; payload: JwtPayload } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    return { header, payload };
  } catch {
    return null;
  }
};

export const isJwtExpired = (token: string): boolean => {
  const parsed = parseJwt(token);
  if (!parsed || !parsed.payload.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return parsed.payload.exp < now;
};

export const getJwtExpirationTime = (token: string): Date | null => {
  const parsed = parseJwt(token);
  if (!parsed || !parsed.payload.exp) {
    return null;
  }

  return new Date(parsed.payload.exp * 1000);
};

// Checksum utilities
export const calculateChecksum = (data: string): string => {
  return simpleHash(data);
};

export const verifyChecksum = (data: string, expectedChecksum: string): boolean => {
  return calculateChecksum(data) === expectedChecksum;
};

// Password utilities (basic)
export const generatePassword = (length = 12): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters long');
  }
  
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain lowercase letters');
  }
  
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain uppercase letters');
  }
  
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain numbers');
  }
  
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain special characters');
  }
  
  return { score, feedback };
};

// Encryption utilities (basic XOR, not secure)
export const xorEncrypt = (text: string, key: string): string => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result += String.fromCharCode(textChar ^ keyChar);
  }
  return base64Encode(result);
};

export const xorDecrypt = (encryptedText: string, key: string): string => {
  const decoded = base64Decode(encryptedText);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    const encryptedChar = decoded.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result += String.fromCharCode(encryptedChar ^ keyChar);
  }
  return result;
};

// Secure random utilities
export const generateSecureToken = (length = 32): string => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto.getRandomValues
  return generateRandomString(length);
};

export const generateNonce = (): string => {
  return generateSecureToken(16);
};

// Constant-time string comparison (basic)
export const constantTimeEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

