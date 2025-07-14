/**
 * Integration framework types for CodegenApp platform
 */

import { BaseEvent, Status } from './common';

// Integration Manager Types
export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  version: string;
  description?: string;
  configuration: IntegrationConfiguration;
  status: IntegrationStatus;
  capabilities: IntegrationCapability[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastHealthCheck?: string;
}

export type IntegrationType = 
  | 'codegen_api'
  | 'github'
  | 'grainchain'
  | 'graph_sitter'
  | 'web_eval_agent'
  | 'docker'
  | 'kubernetes'
  | 'slack'
  | 'email'
  | 'webhook'
  | 'custom';

export type IntegrationStatus = 
  | 'active'
  | 'inactive'
  | 'error'
  | 'configuring'
  | 'testing';

export interface IntegrationConfiguration {
  endpoint?: string;
  authentication: AuthenticationConfig;
  settings: Record<string, any>;
  timeout: number;
  retryPolicy: RetryPolicy;
  rateLimit?: RateLimitConfig;
}

export interface AuthenticationConfig {
  type: 'none' | 'api_key' | 'bearer_token' | 'oauth2' | 'basic_auth' | 'custom';
  credentials: Record<string, any>;
  refreshable: boolean;
  expiresAt?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
  retryableStatusCodes?: number[];
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
  windowSize: number;
}

export interface IntegrationCapability {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  required: boolean;
}

// Plugin System Types
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author: string;
  license: string;
  entryPoint: string;
  dependencies: PluginDependency[];
  configuration: PluginConfiguration;
  permissions: PluginPermission[];
  status: PluginStatus;
  installPath: string;
  createdAt: string;
  updatedAt: string;
}

export type PluginStatus = 
  | 'installed'
  | 'active'
  | 'inactive'
  | 'error'
  | 'updating';

export interface PluginDependency {
  name: string;
  version: string;
  type: 'required' | 'optional';
}

export interface PluginConfiguration {
  schema: Record<string, any>;
  defaults: Record<string, any>;
  current: Record<string, any>;
}

export interface PluginPermission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  main: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  keywords?: string[];
  repository?: string;
  bugs?: string;
  homepage?: string;
  codegenApp: {
    apiVersion: string;
    permissions: PluginPermission[];
    configuration?: Record<string, any>;
    hooks?: PluginHook[];
  };
}

export interface PluginHook {
  event: string;
  handler: string;
  priority?: number;
  conditions?: Record<string, any>;
}

// Event Bus Types
export interface EventBusMessage extends BaseEvent {
  channel: string;
  priority: EventPriority;
  persistent: boolean;
  ttl?: number;
  correlationId?: string;
  replyTo?: string;
}

export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

export interface EventSubscription {
  id: string;
  subscriberId: string;
  channel: string;
  eventTypes: string[];
  filters?: EventFilter[];
  handler: string;
  options: SubscriptionOptions;
  status: 'active' | 'paused' | 'error';
  createdAt: string;
  lastProcessed?: string;
}

export interface EventFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'regex' | 'exists';
  value: any;
}

export interface SubscriptionOptions {
  maxRetries: number;
  retryDelay: number;
  deadLetterQueue: boolean;
  batchSize?: number;
  batchTimeout?: number;
  acknowledgmentTimeout: number;
}

export interface EventDeliveryResult {
  subscriptionId: string;
  eventId: string;
  status: 'delivered' | 'failed' | 'retrying' | 'dead_letter';
  attempts: number;
  lastAttempt: string;
  error?: string;
  processingTime?: number;
}

// Configuration Manager Types
export interface ConfigurationSchema {
  id: string;
  name: string;
  version: string;
  description?: string;
  properties: ConfigurationProperty[];
  required: string[];
  groups: ConfigurationGroup[];
  validation: ValidationRule[];
}

export interface ConfigurationProperty {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  description: string;
  defaultValue?: any;
  required: boolean;
  sensitive: boolean;
  validation?: PropertyValidation;
  enumValues?: string[];
  dependencies?: PropertyDependency[];
}

export interface PropertyValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  format?: string;
}

export interface PropertyDependency {
  property: string;
  condition: 'equals' | 'not_equals' | 'exists';
  value?: any;
}

export interface ConfigurationGroup {
  name: string;
  title: string;
  description?: string;
  properties: string[];
  collapsible: boolean;
  expanded: boolean;
}

export interface ValidationRule {
  name: string;
  description: string;
  expression: string;
  errorMessage: string;
  severity: 'error' | 'warning';
}

export interface ConfigurationValue {
  key: string;
  value: any;
  source: 'default' | 'environment' | 'file' | 'database' | 'override';
  encrypted: boolean;
  lastModified: string;
  modifiedBy?: string;
}

export interface ConfigurationSnapshot {
  id: string;
  name: string;
  description?: string;
  values: ConfigurationValue[];
  createdAt: string;
  createdBy: string;
}

// Integration Events
export interface IntegrationEvent extends BaseEvent {
  integrationId: string;
  integrationType: IntegrationType;
}

export interface IntegrationConnectedEvent extends IntegrationEvent {
  type: 'integration.connected';
  data: {
    configuration: IntegrationConfiguration;
    capabilities: IntegrationCapability[];
  };
}

export interface IntegrationDisconnectedEvent extends IntegrationEvent {
  type: 'integration.disconnected';
  data: {
    reason: string;
    error?: string;
  };
}

export interface IntegrationErrorEvent extends IntegrationEvent {
  type: 'integration.error';
  data: {
    error: string;
    context?: Record<string, any>;
    recoverable: boolean;
  };
}

export interface PluginEvent extends BaseEvent {
  pluginId: string;
  pluginName: string;
}

export interface PluginInstalledEvent extends PluginEvent {
  type: 'plugin.installed';
  data: {
    version: string;
    configuration: PluginConfiguration;
  };
}

export interface PluginActivatedEvent extends PluginEvent {
  type: 'plugin.activated';
  data: {
    capabilities: string[];
    hooks: PluginHook[];
  };
}

export interface PluginDeactivatedEvent extends PluginEvent {
  type: 'plugin.deactivated';
  data: {
    reason: string;
  };
}

export interface ConfigurationChangedEvent extends BaseEvent {
  type: 'configuration.changed';
  data: {
    changes: ConfigurationChange[];
    snapshot?: string;
  };
}

export interface ConfigurationChange {
  key: string;
  oldValue?: any;
  newValue: any;
  source: string;
  timestamp: string;
}

