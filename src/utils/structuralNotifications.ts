/**
 * Structural Notifications System
 * 
 * Enhances react-hot-toast with graph-sitter's ValidationIssue and ValidationResult classes
 * to provide intelligent code quality notifications and structural integrity alerts.
 */

import toast from 'react-hot-toast';
import { 
  ValidationResult, 
  ValidationIssue, 
  StructuralChangeEvent,
  DependencyOptimization,
  OptimizationSuggestion 
} from '../utils/structuralAnalysis';
import { StructuralHealthMetrics } from '../storage/structuralCache';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  enableSound?: boolean;
  groupSimilar?: boolean;
  showActions?: boolean;
}

export interface StructuralNotificationConfig {
  enableValidationNotifications: boolean;
  enableOptimizationNotifications: boolean;
  enableHealthNotifications: boolean;
  enableChangeNotifications: boolean;
  minimumSeverity: 'info' | 'warning' | 'error';
  notificationOptions: NotificationOptions;
}

const defaultConfig: StructuralNotificationConfig = {
  enableValidationNotifications: true,
  enableOptimizationNotifications: true,
  enableHealthNotifications: true,
  enableChangeNotifications: false, // Disabled by default to avoid spam
  minimumSeverity: 'warning',
  notificationOptions: {
    duration: 5000,
    position: 'top-right',
    enableSound: false,
    groupSimilar: true,
    showActions: true,
  },
};

class StructuralNotificationService {
  private config: StructuralNotificationConfig = defaultConfig;
  private activeNotifications: Map<string, string> = new Map(); // key -> toastId
  private notificationGroups: Map<string, string[]> = new Map(); // category -> toastIds

  /**
   * Update notification configuration
   */
  updateConfig(newConfig: Partial<StructuralNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Show validation result notifications using graph-sitter ValidationResult
   */
  showValidationResult(result: ValidationResult, filePath?: string): void {
    if (!this.config.enableValidationNotifications) {
      return;
    }

    const { issues, summary } = result;
    
    // Group issues by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    // Show summary notification
    if (result.isValid && summary.totalIssues === 0) {
      this.showSuccessNotification(
        '✅ Validation Passed',
        `${filePath || 'Code'} validation completed successfully`,
        { duration: 3000 }
      );
    } else {
      // Show error summary if there are errors
      if (errors.length > 0) {
        this.showErrorNotification(
          `❌ ${errors.length} Error${errors.length > 1 ? 's' : ''} Found`,
          this.formatValidationSummary(summary),
          {
            duration: 8000,
            actions: [
              {
                label: 'View Details',
                action: () => this.showDetailedIssues(errors),
              },
              {
                label: 'Fix Issues',
                action: () => this.suggestFixes(errors),
              },
            ],
          }
        );
      }

      // Show warning summary if there are warnings and no errors
      if (warnings.length > 0 && errors.length === 0) {
        this.showWarningNotification(
          `⚠️ ${warnings.length} Warning${warnings.length > 1 ? 's' : ''} Found`,
          this.formatValidationSummary(summary),
          {
            duration: 6000,
            actions: [
              {
                label: 'View Details',
                action: () => this.showDetailedIssues(warnings),
              },
            ],
          }
        );
      }
    }

    // Show individual critical issues
    const criticalIssues = issues.filter(i => 
      i.severity === 'error' && 
      (i.category.includes('security') || i.category.includes('breaking'))
    );

    for (const issue of criticalIssues) {
      this.showCriticalIssue(issue);
    }
  }

  /**
   * Show structural change notifications using StructuralChangeEvent
   */
  showStructuralChange(event: StructuralChangeEvent): void {
    if (!this.config.enableChangeNotifications) {
      return;
    }

    const { type, symbolName, filePath, impact } = event;
    
    let message = '';
    let icon = '';
    
    switch (type) {
      case 'symbol_added':
        icon = '➕';
        message = `Added ${symbolName} in ${this.getFileName(filePath)}`;
        break;
      case 'symbol_removed':
        icon = '➖';
        message = `Removed ${symbolName} from ${this.getFileName(filePath)}`;
        break;
      case 'symbol_modified':
        icon = '✏️';
        message = `Modified ${symbolName} in ${this.getFileName(filePath)}`;
        break;
      case 'dependency_changed':
        icon = '🔗';
        message = `Dependency changed for ${symbolName}`;
        break;
    }

    const severity = impact.severity;
    const notificationMethod = severity === 'critical' || severity === 'high' 
      ? this.showWarningNotification.bind(this)
      : this.showInfoNotification.bind(this);

    notificationMethod(
      `${icon} Structural Change`,
      message,
      {
        duration: 4000,
        actions: impact.breakingChanges ? [
          {
            label: 'View Impact',
            action: () => this.showImpactDetails(impact),
          },
        ] : undefined,
      }
    );
  }

  /**
   * Show optimization suggestions using DependencyOptimization
   */
  showOptimizationSuggestions(optimization: DependencyOptimization, filePath?: string): void {
    if (!this.config.enableOptimizationNotifications) {
      return;
    }

    const { optimizationSuggestions, unusedImports, circularDependencies } = optimization;

    // Show unused imports notification
    if (unusedImports.length > 0) {
      this.showInfoNotification(
        '🧹 Cleanup Opportunity',
        `${unusedImports.length} unused import${unusedImports.length > 1 ? 's' : ''} found`,
        {
          duration: 6000,
          actions: [
            {
              label: 'Remove Unused',
              action: () => this.autoRemoveUnusedImports(unusedImports, filePath),
            },
            {
              label: 'View List',
              action: () => this.showUnusedImportsList(unusedImports),
            },
          ],
        }
      );
    }

    // Show circular dependency warning
    if (circularDependencies.length > 0) {
      this.showWarningNotification(
        '🔄 Circular Dependencies',
        `${circularDependencies.length} circular dependenc${circularDependencies.length > 1 ? 'ies' : 'y'} detected`,
        {
          duration: 8000,
          actions: [
            {
              label: 'View Details',
              action: () => this.showCircularDependencies(circularDependencies),
            },
          ],
        }
      );
    }

    // Show high-impact optimization suggestions
    const highImpactSuggestions = optimizationSuggestions.filter(s => s.impact === 'high');
    if (highImpactSuggestions.length > 0) {
      this.showInfoNotification(
        '🚀 Performance Opportunity',
        `${highImpactSuggestions.length} high-impact optimization${highImpactSuggestions.length > 1 ? 's' : ''} available`,
        {
          duration: 7000,
          actions: [
            {
              label: 'View Suggestions',
              action: () => this.showOptimizationDetails(highImpactSuggestions),
            },
          ],
        }
      );
    }
  }

  /**
   * Show health metrics notifications using StructuralHealthMetrics
   */
  showHealthMetrics(metrics: StructuralHealthMetrics): void {
    if (!this.config.enableHealthNotifications) {
      return;
    }

    const { healthScore, totalErrors, totalWarnings } = metrics;

    // Show health score notification based on score
    if (healthScore >= 90) {
      this.showSuccessNotification(
        '💚 Excellent Code Health',
        `Health Score: ${healthScore}/100`,
        { duration: 3000 }
      );
    } else if (healthScore >= 70) {
      this.showInfoNotification(
        '💛 Good Code Health',
        `Health Score: ${healthScore}/100 - ${totalWarnings} warnings`,
        { duration: 4000 }
      );
    } else if (healthScore >= 50) {
      this.showWarningNotification(
        '🧡 Fair Code Health',
        `Health Score: ${healthScore}/100 - ${totalErrors} errors, ${totalWarnings} warnings`,
        {
          duration: 6000,
          actions: [
            {
              label: 'View Issues',
              action: () => this.showHealthDetails(metrics),
            },
          ],
        }
      );
    } else {
      this.showErrorNotification(
        '❤️ Poor Code Health',
        `Health Score: ${healthScore}/100 - Immediate attention needed`,
        {
          duration: 8000,
          actions: [
            {
              label: 'Fix Critical Issues',
              action: () => this.showHealthDetails(metrics),
            },
          ],
        }
      );
    }
  }

  /**
   * Show critical issue notification
   */
  private showCriticalIssue(issue: ValidationIssue): void {
    this.showErrorNotification(
      '🚨 Critical Issue',
      `${issue.message} in ${this.getFileName(issue.filePath)}`,
      {
        duration: 10000,
        actions: [
          {
            label: 'Fix Now',
            action: () => this.openFileAtLine(issue.filePath, issue.lineNumber),
          },
          {
            label: 'Learn More',
            action: () => this.showIssueSuggestion(issue),
          },
        ],
      }
    );
  }

  // Base notification methods with enhanced styling
  private showSuccessNotification(title: string, message: string, options: any = {}): string {
    return toast.success(
      this.createNotificationContent(title, message),
      {
        duration: options.duration || this.config.notificationOptions.duration,
        position: this.config.notificationOptions.position,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: '500',
        },
        iconTheme: {
          primary: '#10b981',
          secondary: '#fff',
        },
        ...options,
      }
    );
  }

  private showErrorNotification(title: string, message: string, options: any = {}): string {
    return toast.error(
      this.createNotificationContent(title, message, options.actions),
      {
        duration: options.duration || this.config.notificationOptions.duration,
        position: this.config.notificationOptions.position,
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: '500',
        },
        iconTheme: {
          primary: '#ef4444',
          secondary: '#fff',
        },
        ...options,
      }
    );
  }

  private showWarningNotification(title: string, message: string, options: any = {}): string {
    return toast(
      this.createNotificationContent(title, message, options.actions),
      {
        duration: options.duration || this.config.notificationOptions.duration,
        position: this.config.notificationOptions.position,
        icon: '⚠️',
        style: {
          background: '#f59e0b',
          color: '#fff',
          fontWeight: '500',
        },
        ...options,
      }
    );
  }

  private showInfoNotification(title: string, message: string, options: any = {}): string {
    return toast(
      this.createNotificationContent(title, message, options.actions),
      {
        duration: options.duration || this.config.notificationOptions.duration,
        position: this.config.notificationOptions.position,
        icon: 'ℹ️',
        style: {
          background: '#3b82f6',
          color: '#fff',
          fontWeight: '500',
        },
        ...options,
      }
    );
  }

  // Helper methods
  private createNotificationContent(title: string, message: string, actions?: any[]): string {
    let content = `<div><strong>${title}</strong><br/><span style="font-size: 0.9em;">${message}</span>`;
    
    if (actions && this.config.notificationOptions.showActions) {
      content += '<div style="margin-top: 8px;">';
      for (const action of actions) {
        content += `<button onclick="${action.action}" style="margin-right: 8px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 0.8em;">${action.label}</button>`;
      }
      content += '</div>';
    }
    
    content += '</div>';
    return content;
  }

  private formatValidationSummary(summary: any): string {
    const parts = [];
    if (summary.errors > 0) parts.push(`${summary.errors} errors`);
    if (summary.warnings > 0) parts.push(`${summary.warnings} warnings`);
    if (summary.infos > 0) parts.push(`${summary.infos} infos`);
    
    return parts.join(', ') + ` in ${summary.filesAnalyzed} files`;
  }

  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  // Action handlers (these would integrate with actual functionality)
  private showDetailedIssues(issues: ValidationIssue[]): void {
    console.log('📋 Showing detailed issues:', issues);
    // This would open a detailed issues panel
  }

  private suggestFixes(issues: ValidationIssue[]): void {
    console.log('🔧 Suggesting fixes for issues:', issues);
    // This would show automated fix suggestions
  }

  private showImpactDetails(impact: any): void {
    console.log('📊 Showing impact details:', impact);
    // This would show dependency impact analysis
  }

  private autoRemoveUnusedImports(unusedImports: string[], filePath?: string): void {
    console.log('🧹 Auto-removing unused imports:', unusedImports, 'from', filePath);
    // This would automatically remove unused imports
  }

  private showUnusedImportsList(unusedImports: string[]): void {
    console.log('📝 Showing unused imports list:', unusedImports);
    // This would show a detailed list of unused imports
  }

  private showCircularDependencies(circularDeps: string[][]): void {
    console.log('🔄 Showing circular dependencies:', circularDeps);
    // This would show circular dependency visualization
  }

  private showOptimizationDetails(suggestions: OptimizationSuggestion[]): void {
    console.log('🚀 Showing optimization details:', suggestions);
    // This would show detailed optimization suggestions
  }

  private showHealthDetails(metrics: StructuralHealthMetrics): void {
    console.log('💊 Showing health details:', metrics);
    // This would show detailed health metrics
  }

  private openFileAtLine(filePath: string, lineNumber?: number): void {
    console.log(`📂 Opening file: ${filePath}:${lineNumber || 1}`);
    // This would open the file in the editor at the specific line
  }

  private showIssueSuggestion(issue: ValidationIssue): void {
    console.log('💡 Showing issue suggestion:', issue);
    // This would show detailed suggestion for fixing the issue
  }
}

// Singleton instance
export const structuralNotifications = new StructuralNotificationService();

// Convenience functions for direct use
export const showValidationResult = (result: ValidationResult, filePath?: string) => 
  structuralNotifications.showValidationResult(result, filePath);

export const showStructuralChange = (event: StructuralChangeEvent) => 
  structuralNotifications.showStructuralChange(event);

export const showOptimizationSuggestions = (optimization: DependencyOptimization, filePath?: string) => 
  structuralNotifications.showOptimizationSuggestions(optimization, filePath);

export const showHealthMetrics = (metrics: StructuralHealthMetrics) => 
  structuralNotifications.showHealthMetrics(metrics);

export const configureNotifications = (config: Partial<StructuralNotificationConfig>) => 
  structuralNotifications.updateConfig(config);

// Export types
export type {
  StructuralNotificationConfig,
  NotificationOptions,
};

