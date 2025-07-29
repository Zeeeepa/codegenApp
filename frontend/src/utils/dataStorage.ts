/**
 * Data Storage Utility - Handles persistent data storage and retrieval
 * Supports localStorage, sessionStorage, and IndexedDB for different data types
 */

import { 
  Project, 
  AgentRun, 
  ValidationRun, 
  Notification, 
  AppSettings, 
  DashboardState 
} from '../types/dataModels';

// Storage keys
const STORAGE_KEYS = {
  PROJECTS: 'codegen_projects',
  AGENT_RUNS: 'codegen_agent_runs',
  VALIDATION_RUNS: 'codegen_validation_runs',
  NOTIFICATIONS: 'codegen_notifications',
  APP_SETTINGS: 'codegen_app_settings',
  DASHBOARD_STATE: 'codegen_dashboard_state',
  USER_PREFERENCES: 'codegen_user_preferences',
} as const;

// Storage types
type StorageType = 'localStorage' | 'sessionStorage' | 'indexedDB';

interface StorageConfig {
  type: StorageType;
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number; // Time to live in milliseconds
}

// Default storage configurations
const STORAGE_CONFIGS: Record<string, StorageConfig> = {
  [STORAGE_KEYS.PROJECTS]: { type: 'localStorage', encrypt: false },
  [STORAGE_KEYS.AGENT_RUNS]: { type: 'indexedDB', compress: true, ttl: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  [STORAGE_KEYS.VALIDATION_RUNS]: { type: 'indexedDB', compress: true, ttl: 30 * 24 * 60 * 60 * 1000 },
  [STORAGE_KEYS.NOTIFICATIONS]: { type: 'localStorage', ttl: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  [STORAGE_KEYS.APP_SETTINGS]: { type: 'localStorage', encrypt: true },
  [STORAGE_KEYS.DASHBOARD_STATE]: { type: 'sessionStorage' },
  [STORAGE_KEYS.USER_PREFERENCES]: { type: 'localStorage' },
};

// Encryption utilities (simple XOR for demo - use proper encryption in production)
class SimpleEncryption {
  private static key = 'codegen_app_key_2024';

  static encrypt(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
      );
    }
    return btoa(result);
  }

  static decrypt(encryptedText: string): string {
    try {
      const text = atob(encryptedText);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
          text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
        );
      }
      return result;
    } catch {
      return '';
    }
  }
}

// Compression utilities
class SimpleCompression {
  static compress(text: string): string {
    // Simple run-length encoding for demo
    return text.replace(/(.)\1+/g, (match, char) => `${char}${match.length}`);
  }

  static decompress(compressedText: string): string {
    return compressedText.replace(/(.)\d+/g, (match, char) => {
      const count = parseInt(match.slice(1));
      return char.repeat(count);
    });
  }
}

// IndexedDB wrapper
class IndexedDBWrapper {
  private dbName = 'CodeGenAppDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('agent_runs')) {
          db.createObjectStore('agent_runs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('validation_runs')) {
          db.createObjectStore('validation_runs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  async get(storeName: string, key: string): Promise<any> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async set(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Main storage class
class DataStorage {
  private indexedDB = new IndexedDBWrapper();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.indexedDB.init();
      this.initialized = true;
      
      // Clean up expired data
      await this.cleanupExpiredData();
    } catch (error) {
      console.warn('IndexedDB initialization failed, falling back to localStorage:', error);
      this.initialized = true;
    }
  }

  // Generic storage methods
  async store<T>(key: string, data: T): Promise<void> {
    await this.init();
    
    const config = STORAGE_CONFIGS[key] || { type: 'localStorage' };
    const storageData = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
    };

    let serializedData = JSON.stringify(storageData);

    // Apply compression if configured
    if (config.compress) {
      serializedData = SimpleCompression.compress(serializedData);
    }

    // Apply encryption if configured
    if (config.encrypt) {
      serializedData = SimpleEncryption.encrypt(serializedData);
    }

    // Store based on configuration
    switch (config.type) {
      case 'localStorage':
        localStorage.setItem(key, serializedData);
        break;
      case 'sessionStorage':
        sessionStorage.setItem(key, serializedData);
        break;
      case 'indexedDB':
        await this.indexedDB.set('cache', { key, value: serializedData });
        break;
    }
  }

  async retrieve<T>(key: string): Promise<T | null> {
    await this.init();
    
    const config = STORAGE_CONFIGS[key] || { type: 'localStorage' };
    let serializedData: string | null = null;

    // Retrieve based on configuration
    switch (config.type) {
      case 'localStorage':
        serializedData = localStorage.getItem(key);
        break;
      case 'sessionStorage':
        serializedData = sessionStorage.getItem(key);
        break;
      case 'indexedDB':
        const result = await this.indexedDB.get('cache', key);
        serializedData = result?.value || null;
        break;
    }

    if (!serializedData) return null;

    try {
      // Apply decryption if configured
      if (config.encrypt) {
        serializedData = SimpleEncryption.decrypt(serializedData);
      }

      // Apply decompression if configured
      if (config.compress) {
        serializedData = SimpleCompression.decompress(serializedData);
      }

      const storageData = JSON.parse(serializedData);

      // Check TTL
      if (storageData.ttl && Date.now() - storageData.timestamp > storageData.ttl) {
        await this.remove(key);
        return null;
      }

      return storageData.data;
    } catch (error) {
      console.error(`Failed to retrieve data for key ${key}:`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await this.init();
    
    const config = STORAGE_CONFIGS[key] || { type: 'localStorage' };

    switch (config.type) {
      case 'localStorage':
        localStorage.removeItem(key);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(key);
        break;
      case 'indexedDB':
        await this.indexedDB.delete('cache', key);
        break;
    }
  }

  async clear(): Promise<void> {
    await this.init();
    
    // Clear all storage types
    localStorage.clear();
    sessionStorage.clear();
    await this.indexedDB.clear('cache');
    await this.indexedDB.clear('agent_runs');
    await this.indexedDB.clear('validation_runs');
  }

  // Specific data type methods
  async storeProjects(projects: Project[]): Promise<void> {
    await this.store(STORAGE_KEYS.PROJECTS, projects);
  }

  async getProjects(): Promise<Project[]> {
    return (await this.retrieve<Project[]>(STORAGE_KEYS.PROJECTS)) || [];
  }

  async storeProject(project: Project): Promise<void> {
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    
    await this.storeProjects(projects);
  }

  async removeProject(projectId: string): Promise<void> {
    const projects = await this.getProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    await this.storeProjects(filtered);
  }

  async storeAgentRuns(agentRuns: AgentRun[]): Promise<void> {
    await this.store(STORAGE_KEYS.AGENT_RUNS, agentRuns);
  }

  async getAgentRuns(): Promise<AgentRun[]> {
    return (await this.retrieve<AgentRun[]>(STORAGE_KEYS.AGENT_RUNS)) || [];
  }

  async storeAgentRun(agentRun: AgentRun): Promise<void> {
    const agentRuns = await this.getAgentRuns();
    const index = agentRuns.findIndex(ar => ar.id === agentRun.id);
    
    if (index >= 0) {
      agentRuns[index] = agentRun;
    } else {
      agentRuns.push(agentRun);
    }
    
    await this.storeAgentRuns(agentRuns);
  }

  async storeValidationRuns(validationRuns: ValidationRun[]): Promise<void> {
    await this.store(STORAGE_KEYS.VALIDATION_RUNS, validationRuns);
  }

  async getValidationRuns(): Promise<ValidationRun[]> {
    return (await this.retrieve<ValidationRun[]>(STORAGE_KEYS.VALIDATION_RUNS)) || [];
  }

  async storeValidationRun(validationRun: ValidationRun): Promise<void> {
    const validationRuns = await this.getValidationRuns();
    const index = validationRuns.findIndex(vr => vr.id === validationRun.id);
    
    if (index >= 0) {
      validationRuns[index] = validationRun;
    } else {
      validationRuns.push(validationRun);
    }
    
    await this.storeValidationRuns(validationRuns);
  }

  async storeNotifications(notifications: Notification[]): Promise<void> {
    await this.store(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }

  async getNotifications(): Promise<Notification[]> {
    return (await this.retrieve<Notification[]>(STORAGE_KEYS.NOTIFICATIONS)) || [];
  }

  async addNotification(notification: Notification): Promise<void> {
    const notifications = await this.getNotifications();
    notifications.unshift(notification);
    
    // Keep only the last 1000 notifications
    const trimmed = notifications.slice(0, 1000);
    await this.storeNotifications(trimmed);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notifications = await this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      await this.storeNotifications(notifications);
    }
  }

  async storeAppSettings(settings: AppSettings): Promise<void> {
    await this.store(STORAGE_KEYS.APP_SETTINGS, settings);
  }

  async getAppSettings(): Promise<AppSettings | null> {
    return await this.retrieve<AppSettings>(STORAGE_KEYS.APP_SETTINGS);
  }

  async storeDashboardState(state: Partial<DashboardState>): Promise<void> {
    const currentState = await this.getDashboardState();
    const mergedState = { ...currentState, ...state };
    await this.store(STORAGE_KEYS.DASHBOARD_STATE, mergedState);
  }

  async getDashboardState(): Promise<Partial<DashboardState>> {
    return (await this.retrieve<Partial<DashboardState>>(STORAGE_KEYS.DASHBOARD_STATE)) || {};
  }

  // Utility methods
  async getStorageInfo(): Promise<{
    localStorage: { used: number; available: number };
    sessionStorage: { used: number; available: number };
    indexedDB: { supported: boolean; used?: number };
  }> {
    const getStorageSize = (storage: Storage): number => {
      let total = 0;
      for (const key in storage) {
        if (storage.hasOwnProperty(key)) {
          total += storage[key].length + key.length;
        }
      }
      return total;
    };

    return {
      localStorage: {
        used: getStorageSize(localStorage),
        available: 5 * 1024 * 1024, // Approximate 5MB limit
      },
      sessionStorage: {
        used: getStorageSize(sessionStorage),
        available: 5 * 1024 * 1024,
      },
      indexedDB: {
        supported: 'indexedDB' in window,
      },
    };
  }

  async exportData(): Promise<string> {
    const data = {
      projects: await this.getProjects(),
      agentRuns: await this.getAgentRuns(),
      validationRuns: await this.getValidationRuns(),
      notifications: await this.getNotifications(),
      appSettings: await this.getAppSettings(),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = JSON.parse(jsonData);

      if (data.projects) await this.storeProjects(data.projects);
      if (data.agentRuns) await this.storeAgentRuns(data.agentRuns);
      if (data.validationRuns) await this.storeValidationRuns(data.validationRuns);
      if (data.notifications) await this.storeNotifications(data.notifications);
      if (data.appSettings) await this.storeAppSettings(data.appSettings);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async cleanupExpiredData(): Promise<void> {
    // Clean up expired notifications
    const notifications = await this.getNotifications();
    const validNotifications = notifications.filter(n => {
      if (!n.expiresAt) return true;
      return new Date(n.expiresAt) > new Date();
    });
    
    if (validNotifications.length !== notifications.length) {
      await this.storeNotifications(validNotifications);
    }

    // Clean up old agent runs (keep last 100)
    const agentRuns = await this.getAgentRuns();
    if (agentRuns.length > 100) {
      const sorted = agentRuns.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      await this.storeAgentRuns(sorted.slice(0, 100));
    }

    // Clean up old validation runs (keep last 50)
    const validationRuns = await this.getValidationRuns();
    if (validationRuns.length > 50) {
      const sorted = validationRuns.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      await this.storeValidationRuns(sorted.slice(0, 50));
    }
  }
}

// Export singleton instance
export const dataStorage = new DataStorage();
export default dataStorage;

