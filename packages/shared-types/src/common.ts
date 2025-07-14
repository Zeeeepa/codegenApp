/**
 * Common utility types used across the CodegenApp platform
 */

// Base response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Status types
export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StatusUpdate {
  status: Status;
  message?: string;
  progress?: number;
  timestamp: string;
}

// Error types
export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

// Configuration types
export interface ConfigValue {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}

// Event types
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  data: Record<string, any>;
}

// Resource types
export interface Resource {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  createdAt: string;
  lastLoginAt?: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  repositoryUrl?: string;
  branch?: string;
  settings: Record<string, any>;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

