/**
 * Webhook Service - Handles webhook management and processing
 * Manages Cloudflare Worker integration and webhook notifications
 */

export interface WebhookPayload {
  action: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
  pull_request?: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    html_url: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    user: {
      login: string;
      avatar_url: string;
    };
    created_at: string;
    updated_at: string;
  };
  issue?: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    html_url: string;
    user: {
      login: string;
      avatar_url: string;
    };
  };
  sender: {
    login: string;
    avatar_url: string;
  };
}

export interface WebhookNotification {
  id: string;
  type: 'pull_request' | 'push' | 'issue';
  action: string;
  repository: string;
  title: string;
  description: string;
  url: string;
  timestamp: string;
  read: boolean;
  metadata: Record<string, any>;
}

export interface CloudflareWorkerConfig {
  apiKey: string;
  accountId: string;
  workerName: string;
  workerUrl: string;
}

class WebhookService {
  private config: CloudflareWorkerConfig;
  private notifications: WebhookNotification[] = [];
  private listeners: Array<(notification: WebhookNotification) => void> = [];

  constructor(config?: Partial<CloudflareWorkerConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.CLOUDFLARE_API_KEY || '',
      accountId: config?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || '',
      workerName: config?.workerName || process.env.CLOUDFLARE_WORKER_NAME || 'webhook-gateway',
      workerUrl: config?.workerUrl || process.env.CLOUDFLARE_WORKER_URL || '',
    };

    if (!this.config.apiKey || !this.config.accountId) {
      console.warn('Cloudflare credentials not provided. Webhook operations may fail.');
    }

    // Initialize webhook listener
    this.initializeWebhookListener();
  }

  /**
   * Deploy or update Cloudflare Worker for webhook handling
   */
  async deployWebhookWorker(): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const workerScript = this.generateWorkerScript();
      
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/workers/scripts/${this.config.workerName}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/javascript',
          },
          body: workerScript,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to deploy worker: ${errorData.errors?.[0]?.message || response.statusText}`);
      }

      // Enable the worker on a route
      await this.enableWorkerRoute();

      return {
        success: true,
        url: this.config.workerUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate Cloudflare Worker script for webhook handling
   */
  private generateWorkerScript(): string {
    return `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-GitHub-Event, X-GitHub-Delivery',
      },
    })
  }

  // Only handle POST requests for webhooks
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = await request.json()
    const githubEvent = request.headers.get('X-GitHub-Event')
    const delivery = request.headers.get('X-GitHub-Delivery')

    // Process webhook payload
    const notification = {
      id: delivery || Date.now().toString(),
      event: githubEvent,
      payload: payload,
      timestamp: new Date().toISOString(),
      repository: payload.repository?.full_name,
    }

    // Forward to client application via Server-Sent Events or WebSocket
    // For now, we'll store in KV storage for polling
    await WEBHOOK_NOTIFICATIONS.put(
      \`notification_\${notification.id}\`,
      JSON.stringify(notification),
      { expirationTtl: 86400 } // 24 hours
    )

    // Also maintain a list of recent notifications
    const recentKey = \`recent_\${payload.repository?.full_name || 'global'}\`
    let recent = []
    try {
      const existing = await WEBHOOK_NOTIFICATIONS.get(recentKey)
      if (existing) {
        recent = JSON.parse(existing)
      }
    } catch (e) {
      // Ignore parsing errors
    }

    recent.unshift(notification.id)
    recent = recent.slice(0, 50) // Keep last 50 notifications

    await WEBHOOK_NOTIFICATIONS.put(
      recentKey,
      JSON.stringify(recent),
      { expirationTtl: 86400 }
    )

    return new Response(JSON.stringify({ success: true, id: notification.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
`;
  }

  /**
   * Enable worker on a route
   */
  private async enableWorkerRoute(): Promise<void> {
    // This would typically involve setting up a custom domain or route
    // For now, we'll assume the worker URL is already configured
    console.log(`Worker deployed at: ${this.config.workerUrl}`);
  }

  /**
   * Process incoming webhook payload
   */
  processWebhookPayload(payload: WebhookPayload): WebhookNotification {
    const notification: WebhookNotification = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.determineNotificationType(payload),
      action: payload.action,
      repository: payload.repository.full_name,
      title: this.generateNotificationTitle(payload),
      description: this.generateNotificationDescription(payload),
      url: this.generateNotificationUrl(payload),
      timestamp: new Date().toISOString(),
      read: false,
      metadata: {
        repository_id: payload.repository.id,
        sender: payload.sender.login,
        ...(payload.pull_request && {
          pr_number: payload.pull_request.number,
          pr_state: payload.pull_request.state,
          pr_branch: payload.pull_request.head.ref,
        }),
        ...(payload.issue && {
          issue_number: payload.issue.number,
          issue_state: payload.issue.state,
        }),
      },
    };

    // Add to notifications list
    this.notifications.unshift(notification);
    this.notifications = this.notifications.slice(0, 100); // Keep last 100

    // Notify listeners
    this.listeners.forEach(listener => listener(notification));

    return notification;
  }

  /**
   * Determine notification type from payload
   */
  private determineNotificationType(payload: WebhookPayload): WebhookNotification['type'] {
    if (payload.pull_request) return 'pull_request';
    if (payload.issue) return 'issue';
    return 'push';
  }

  /**
   * Generate notification title
   */
  private generateNotificationTitle(payload: WebhookPayload): string {
    if (payload.pull_request) {
      return `PR #${payload.pull_request.number}: ${payload.pull_request.title}`;
    }
    if (payload.issue) {
      return `Issue #${payload.issue.number}: ${payload.issue.title}`;
    }
    return `${payload.action} in ${payload.repository.name}`;
  }

  /**
   * Generate notification description
   */
  private generateNotificationDescription(payload: WebhookPayload): string {
    const action = payload.action;
    const repo = payload.repository.name;
    const sender = payload.sender.login;

    if (payload.pull_request) {
      return `${sender} ${action} pull request in ${repo}`;
    }
    if (payload.issue) {
      return `${sender} ${action} issue in ${repo}`;
    }
    return `${sender} ${action} in ${repo}`;
  }

  /**
   * Generate notification URL
   */
  private generateNotificationUrl(payload: WebhookPayload): string {
    if (payload.pull_request) {
      return payload.pull_request.html_url;
    }
    if (payload.issue) {
      return payload.issue.html_url;
    }
    return payload.repository.html_url;
  }

  /**
   * Initialize webhook listener (polling for now, could be WebSocket/SSE)
   */
  private initializeWebhookListener(): void {
    // In a real implementation, this would set up WebSocket or SSE connection
    // For now, we'll use polling when getNotifications is called
    console.log('Webhook listener initialized');
  }

  /**
   * Get recent notifications
   */
  getNotifications(repository?: string): WebhookNotification[] {
    if (repository) {
      return this.notifications.filter(n => n.repository === repository);
    }
    return [...this.notifications];
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Clear all notifications
   */
  clearNotifications(repository?: string): void {
    if (repository) {
      this.notifications = this.notifications.filter(n => n.repository !== repository);
    } else {
      this.notifications = [];
    }
  }

  /**
   * Subscribe to webhook notifications
   */
  subscribe(listener: (notification: WebhookNotification) => void): () => void {
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
   * Test webhook endpoint
   */
  async testWebhook(): Promise<{ success: boolean; error?: string }> {
    try {
      const testPayload = {
        action: 'test',
        repository: {
          id: 12345,
          name: 'test-repo',
          full_name: 'user/test-repo',
          html_url: 'https://github.com/user/test-repo',
        },
        sender: {
          login: 'test-user',
          avatar_url: 'https://github.com/test-user.png',
        },
      };

      const response = await fetch(this.config.workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'ping',
          'X-GitHub-Delivery': 'test-delivery',
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook test failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default WebhookService;

