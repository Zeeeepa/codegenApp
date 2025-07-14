/**
 * Storage utilities for local and session storage
 */

import { STORAGE_KEYS } from './constants';

// Storage interface
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  length: number;
  key(index: number): string | null;
}

// Storage implementations
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail if storage is not available
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail if storage is not available
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Silently fail if storage is not available
    }
  }

  get length(): number {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  }

  key(index: number): string | null {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  }
}

export class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Silently fail if storage is not available
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Silently fail if storage is not available
    }
  }

  clear(): void {
    try {
      sessionStorage.clear();
    } catch {
      // Silently fail if storage is not available
    }
  }

  get length(): number {
    try {
      return sessionStorage.length;
    } catch {
      return 0;
    }
  }

  key(index: number): string | null {
    try {
      return sessionStorage.key(index);
    } catch {
      return null;
    }
  }
}

export class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  get length(): number {
    return this.storage.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }
}

// Storage manager
export class StorageManager {
  private adapter: StorageAdapter;

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter || this.getDefaultAdapter();
  }

  private getDefaultAdapter(): StorageAdapter {
    if (typeof window !== 'undefined' && window.localStorage) {
      return new LocalStorageAdapter();
    }
    return new MemoryStorageAdapter();
  }

  // Generic methods
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = this.adapter.getItem(key);
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item);
    } catch {
      return defaultValue || null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      this.adapter.setItem(key, JSON.stringify(value));
    } catch {
      // Silently fail
    }
  }

  remove(key: string): void {
    this.adapter.removeItem(key);
  }

  clear(): void {
    this.adapter.clear();
  }

  has(key: string): boolean {
    return this.adapter.getItem(key) !== null;
  }

  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.adapter.length; i++) {
      const key = this.adapter.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  // Typed methods for common data types
  getString(key: string, defaultValue = ''): string {
    const value = this.get<string>(key);
    return value !== null ? value : defaultValue;
  }

  setString(key: string, value: string): void {
    this.set(key, value);
  }

  getNumber(key: string, defaultValue = 0): number {
    const value = this.get<number>(key);
    return value !== null ? value : defaultValue;
  }

  setNumber(key: string, value: number): void {
    this.set(key, value);
  }

  getBoolean(key: string, defaultValue = false): boolean {
    const value = this.get<boolean>(key);
    return value !== null ? value : defaultValue;
  }

  setBoolean(key: string, value: boolean): void {
    this.set(key, value);
  }

  getArray<T>(key: string, defaultValue: T[] = []): T[] {
    const value = this.get<T[]>(key);
    return value !== null ? value : defaultValue;
  }

  setArray<T>(key: string, value: T[]): void {
    this.set(key, value);
  }

  getObject<T extends object>(key: string, defaultValue?: T): T | null {
    const value = this.get<T>(key);
    return value !== null ? value : (defaultValue || null);
  }

  setObject<T extends object>(key: string, value: T): void {
    this.set(key, value);
  }

  // Expiring storage
  setWithExpiry<T>(key: string, value: T, expiryMs: number): void {
    const item = {
      value,
      expiry: Date.now() + expiryMs,
    };
    this.set(key, item);
  }

  getWithExpiry<T>(key: string): T | null {
    const item = this.get<{ value: T; expiry: number }>(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.remove(key);
      return null;
    }

    return item.value;
  }

  // Namespace support
  namespace(prefix: string): NamespacedStorage {
    return new NamespacedStorage(this, prefix);
  }
}

// Namespaced storage
export class NamespacedStorage {
  constructor(
    private storage: StorageManager,
    private prefix: string
  ) {}

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  get<T>(key: string, defaultValue?: T): T | null {
    return this.storage.get(this.getKey(key), defaultValue);
  }

  set<T>(key: string, value: T): void {
    this.storage.set(this.getKey(key), value);
  }

  remove(key: string): void {
    this.storage.remove(this.getKey(key));
  }

  has(key: string): boolean {
    return this.storage.has(this.getKey(key));
  }

  clear(): void {
    const keys = this.storage.keys();
    const prefixedKeys = keys.filter(key => key.startsWith(`${this.prefix}:`));
    prefixedKeys.forEach(key => this.storage.remove(key));
  }

  keys(): string[] {
    const allKeys = this.storage.keys();
    return allKeys
      .filter(key => key.startsWith(`${this.prefix}:`))
      .map(key => key.substring(this.prefix.length + 1));
  }
}

// Cache implementation
export class Cache<T> {
  private storage: StorageManager;
  private namespace: string;
  private defaultTtl: number;

  constructor(namespace: string, defaultTtl = 5 * 60 * 1000) { // 5 minutes default
    this.storage = new StorageManager();
    this.namespace = namespace;
    this.defaultTtl = defaultTtl;
  }

  private getKey(key: string): string {
    return `cache:${this.namespace}:${key}`;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiryMs = ttl || this.defaultTtl;
    this.storage.setWithExpiry(this.getKey(key), value, expiryMs);
  }

  get(key: string): T | null {
    return this.storage.getWithExpiry<T>(this.getKey(key));
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  remove(key: string): void {
    this.storage.remove(this.getKey(key));
  }

  clear(): void {
    const keys = this.storage.keys();
    const cacheKeys = keys.filter(key => key.startsWith(`cache:${this.namespace}:`));
    cacheKeys.forEach(key => this.storage.remove(key));
  }

  // Memoization helper
  memoize<Args extends any[], Return>(
    fn: (...args: Args) => Return | Promise<Return>,
    keyFn?: (...args: Args) => string,
    ttl?: number
  ): (...args: Args) => Return | Promise<Return> {
    return (...args: Args) => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);
      const cached = this.get(key);
      
      if (cached !== null) {
        return cached;
      }

      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.then(value => {
          this.set(key, value, ttl);
          return value;
        });
      } else {
        this.set(key, result, ttl);
        return result;
      }
    };
  }
}

// Default storage instances
export const localStorage = new StorageManager(new LocalStorageAdapter());
export const sessionStorage = new StorageManager(new SessionStorageAdapter());
export const memoryStorage = new StorageManager(new MemoryStorageAdapter());

// Application-specific storage helpers
export const appStorage = {
  // Auth
  getAuthToken: (): string | null => localStorage.getString(STORAGE_KEYS.AUTH_TOKEN) || null,
  setAuthToken: (token: string): void => localStorage.setString(STORAGE_KEYS.AUTH_TOKEN, token),
  removeAuthToken: (): void => localStorage.remove(STORAGE_KEYS.AUTH_TOKEN),

  getRefreshToken: (): string | null => localStorage.getString(STORAGE_KEYS.REFRESH_TOKEN) || null,
  setRefreshToken: (token: string): void => localStorage.setString(STORAGE_KEYS.REFRESH_TOKEN, token),
  removeRefreshToken: (): void => localStorage.remove(STORAGE_KEYS.REFRESH_TOKEN),

  // User
  getUserInfo: (): any => localStorage.getObject(STORAGE_KEYS.USER_INFO),
  setUserInfo: (user: any): void => localStorage.setObject(STORAGE_KEYS.USER_INFO, user),
  removeUserInfo: (): void => localStorage.remove(STORAGE_KEYS.USER_INFO),

  // Projects
  getSelectedProject: (): any => localStorage.getObject(STORAGE_KEYS.SELECTED_PROJECT),
  setSelectedProject: (project: any): void => localStorage.setObject(STORAGE_KEYS.SELECTED_PROJECT, project),
  removeSelectedProject: (): void => localStorage.remove(STORAGE_KEYS.SELECTED_PROJECT),

  getProjectCache: (): any[] => localStorage.getArray(STORAGE_KEYS.PROJECT_CACHE),
  setProjectCache: (projects: any[]): void => localStorage.setArray(STORAGE_KEYS.PROJECT_CACHE, projects),
  removeProjectCache: (): void => localStorage.remove(STORAGE_KEYS.PROJECT_CACHE),

  // Agent Runs
  getAgentRunCache: (): any[] => localStorage.getArray(STORAGE_KEYS.AGENT_RUN_CACHE),
  setAgentRunCache: (runs: any[]): void => localStorage.setArray(STORAGE_KEYS.AGENT_RUN_CACHE, runs),
  removeAgentRunCache: (): void => localStorage.remove(STORAGE_KEYS.AGENT_RUN_CACHE),

  // Preferences
  getPreferences: (): any => localStorage.getObject(STORAGE_KEYS.PREFERENCES, {}),
  setPreferences: (preferences: any): void => localStorage.setObject(STORAGE_KEYS.PREFERENCES, preferences),
  removePreferences: (): void => localStorage.remove(STORAGE_KEYS.PREFERENCES),

  // Theme
  getTheme: (): string => localStorage.getString(STORAGE_KEYS.THEME, 'light'),
  setTheme: (theme: string): void => localStorage.setString(STORAGE_KEYS.THEME, theme),

  // Clear all app data
  clearAll: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.remove(key));
  },
};

