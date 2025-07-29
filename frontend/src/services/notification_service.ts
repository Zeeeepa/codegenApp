/**
 * Frontend notification service for handling real-time updates.
 * Integrates with WebSocket connection and provides notification management.
 */

import { toast } from 'react-hot-toast';

export interface NotificationData {
  id?: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  persistent?: boolean;
  data?: Record<string, any>;
}

export interface WebSocketNotification {
  type: string;
  data: Record<string, any>;
  timestamp: string;
  message_id: string;
}

class NotificationService {
  private notifications: NotificationData[] = [];
  private listeners: ((notification: NotificationData) => void)[] = [];
  private maxNotifications = 100;

  /**
   * Add a new notification
   */
  addNotification(notification: NotificationData): void {
    const notificationWithId = {
      ...notification,
      id: notification.id || this.generateId(),
    };

    this.notifications.unshift(notificationWithId);

    // Limit the number of stored notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Show toast notification
    this.showToast(notificationWithId);

    // Notify listeners
    this.listeners.forEach(listener => listener(notificationWithId));
  }

  /**
   * Process WebSocket notification
   */
  processWebSocketNotification(wsNotification: WebSocketNotification): void {
    const notification = this.mapWebSocketToNotification(wsNotification);
    if (notification) {
      this.addNotification(notification);
    }
  }

  /**
   * Map WebSocket notification to internal notification format
   */
  private mapWebSocketToNotification(wsNotification: WebSocketNotification): NotificationData | null {
    const { type, data } = wsNotification;

    switch (type) {
      case 'agent_run_started':
        return {
          type: 'agent_run',
          title: 'Agent Run Started',
          message: `Started processing: ${data.target_text?.substring(0, 50)}...`,
          severity: 'info',
          data: data,
        };

      case 'agent_run_progress':
        // Don't show toast for progress updates to avoid spam
        return {
          type: 'agent_run_progress',
          title: 'Agent Run Progress',
          message: `Progress: ${Math.round(data.progress)}%${data.current_step ? ` - ${data.current_step}` : ''}`,
          severity: 'info',
          duration: 0, // No toast
          data: data,
        };

      case 'agent_run_completed':
        return {
          type: 'agent_run',
          title: 'Agent Run Completed',
          message: 'Agent run completed successfully',
          severity: 'success',
          data: data,
        };

      case 'agent_run_failed':
        return {
          type: 'agent_run',
          title: 'Agent Run Failed',
          message: data.error || 'Agent run failed',
          severity: 'error',
          persistent: true,
          data: data,
        };

      case 'validation_started':
        return {
          type: 'validation',
          title: 'Validation Started',
          message: `Started validation: ${data.name}`,
          severity: 'info',
          data: data,
        };

      case 'validation_completed':
        return {
          type: 'validation',
          title: 'Validation Completed',
          message: `Validation ${data.success ? 'passed' : 'failed'}: ${data.name || 'Unknown'}`,
          severity: data.success ? 'success' : 'error',
          data: data,
        };

      case 'validation_failed':
        return {
          type: 'validation',
          title: 'Validation Failed',
          message: data.error || 'Validation failed',
          severity: 'error',
          persistent: true,
          data: data,
        };

      case 'project_updated':
        return {
          type: 'project',
          title: 'Project Updated',
          message: 'Project settings have been updated',
          severity: 'info',
          data: data,
        };

      case 'system_alert':
        return {
          type: 'system',
          title: data.alert_type || 'System Alert',
          message: data.message,
          severity: data.severity || 'info',
          persistent: data.severity === 'error',
          data: data,
        };

      case 'user_message':
        return {
          type: 'user_message',
          title: 'Message',
          message: data.message,
          severity: data.message_type || 'info',
          data: data.data,
        };

      case 'connection_established':
        return {
          type: 'connection',
          title: 'Connected',
          message: 'Real-time connection established',
          severity: 'success',
          duration: 2000,
          data: data,
        };

      default:
        console.log('Unhandled WebSocket notification type:', type);
        return null;
    }
  }

  /**
   * Show toast notification
   */
  private showToast(notification: NotificationData): void {
    if (notification.duration === 0) {
      return; // Skip toast
    }

    const options = {
      duration: notification.duration || (notification.persistent ? Infinity : 4000),
      position: 'top-right' as const,
    };

    switch (notification.severity) {
      case 'success':
        toast.success(notification.message, options);
        break;
      case 'error':
        toast.error(notification.message, options);
        break;
      case 'warning':
        toast.error(notification.message, options); // Use error style for warnings
        break;
      case 'info':
      default:
        toast(notification.message, options);
        break;
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: string): NotificationData[] {
    return this.notifications.filter(n => n.type === type);
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications = [];
    this.listeners.forEach(listener => listener({ 
      type: 'clear', 
      title: '', 
      message: '', 
      severity: 'info' 
    }));
  }

  /**
   * Clear notifications by type
   */
  clearNotificationsByType(type: string): void {
    this.notifications = this.notifications.filter(n => n.type !== type);
  }

  /**
   * Remove specific notification
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  /**
   * Add listener for notification updates
   */
  addListener(listener: (notification: NotificationData) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Show success notification
   */
  success(title: string, message: string, data?: Record<string, any>): void {
    this.addNotification({
      type: 'manual',
      title,
      message,
      severity: 'success',
      data,
    });
  }

  /**
   * Show error notification
   */
  error(title: string, message: string, data?: Record<string, any>): void {
    this.addNotification({
      type: 'manual',
      title,
      message,
      severity: 'error',
      persistent: true,
      data,
    });
  }

  /**
   * Show warning notification
   */
  warning(title: string, message: string, data?: Record<string, any>): void {
    this.addNotification({
      type: 'manual',
      title,
      message,
      severity: 'warning',
      data,
    });
  }

  /**
   * Show info notification
   */
  info(title: string, message: string, data?: Record<string, any>): void {
    this.addNotification({
      type: 'manual',
      title,
      message,
      severity: 'info',
      data,
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
