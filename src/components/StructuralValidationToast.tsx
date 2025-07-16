/**
 * StructuralValidationToast Component
 * 
 * Enhanced toast component that displays structural validation results
 * with interactive actions and detailed information.
 */

import React from 'react';
import { ValidationIssue, ValidationResult } from '../utils/structuralAnalysis';
import { AlertTriangle, CheckCircle, Info, XCircle, ExternalLink, Wrench } from 'lucide-react';

interface StructuralValidationToastProps {
  validationResult: ValidationResult;
  filePath?: string;
  onViewDetails?: (issues: ValidationIssue[]) => void;
  onFixIssues?: (issues: ValidationIssue[]) => void;
  onDismiss?: () => void;
}

export function StructuralValidationToast({
  validationResult,
  filePath,
  onViewDetails,
  onFixIssues,
  onDismiss,
}: StructuralValidationToastProps) {
  const { isValid, issues, summary } = validationResult;
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  const getIcon = () => {
    if (errors.length > 0) return <XCircle className="w-5 h-5 text-red-500" />;
    if (warnings.length > 0) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    if (infos.length > 0) return <Info className="w-5 h-5 text-blue-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getTitle = () => {
    if (errors.length > 0) return `${errors.length} Error${errors.length > 1 ? 's' : ''} Found`;
    if (warnings.length > 0) return `${warnings.length} Warning${warnings.length > 1 ? 's' : ''} Found`;
    if (infos.length > 0) return `${infos.length} Info${infos.length > 1 ? 's' : ''} Found`;
    return 'Validation Passed';
  };

  const getBackgroundColor = () => {
    if (errors.length > 0) return 'bg-red-50 border-red-200';
    if (warnings.length > 0) return 'bg-yellow-50 border-yellow-200';
    if (infos.length > 0) return 'bg-blue-50 border-blue-200';
    return 'bg-green-50 border-green-200';
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <div className={`max-w-md w-full ${getBackgroundColor()} border rounded-lg shadow-lg p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {getTitle()}
            </h3>
            {filePath && (
              <p className="text-xs text-gray-600 mt-1">
                in {getFileName(filePath)}
              </p>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary */}
      {summary.totalIssues > 0 && (
        <div className="mt-3 text-xs text-gray-600">
          {summary.filesAnalyzed} file{summary.filesAnalyzed > 1 ? 's' : ''} analyzed • {' '}
          {summary.functionsAnalyzed} function{summary.functionsAnalyzed > 1 ? 's' : ''} • {' '}
          {summary.classesAnalyzed} class{summary.classesAnalyzed > 1 ? 'es' : ''}
        </div>
      )}

      {/* Issue Preview */}
      {issues.length > 0 && (
        <div className="mt-3 space-y-2">
          {issues.slice(0, 2).map((issue, index) => (
            <div key={index} className="text-xs">
              <div className="flex items-start space-x-2">
                <span className={`inline-block w-2 h-2 rounded-full mt-1 ${
                  issue.severity === 'error' ? 'bg-red-500' :
                  issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{issue.message}</p>
                  {issue.symbolName && (
                    <p className="text-gray-600 mt-1">
                      Symbol: <code className="bg-gray-100 px-1 rounded">{issue.symbolName}</code>
                    </p>
                  )}
                  {issue.suggestion && (
                    <p className="text-gray-600 mt-1 italic">
                      💡 {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {issues.length > 2 && (
            <div className="text-xs text-gray-500 italic">
              ... and {issues.length - 2} more issue{issues.length - 2 > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {(onViewDetails || onFixIssues) && issues.length > 0 && (
        <div className="mt-4 flex space-x-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(issues)}
              className="flex items-center space-x-1 px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>View Details</span>
            </button>
          )}
          
          {onFixIssues && errors.length > 0 && (
            <button
              onClick={() => onFixIssues(errors)}
              className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Wrench className="w-3 h-3" />
              <span>Fix Issues</span>
            </button>
          )}
        </div>
      )}

      {/* Success message */}
      {isValid && summary.totalIssues === 0 && (
        <div className="mt-3 text-xs text-green-700">
          ✨ All structural validations passed successfully!
        </div>
      )}
    </div>
  );
}

// Specialized toast components for different types of notifications

interface OptimizationToastProps {
  unusedImports: string[];
  optimizationCount: number;
  onRemoveUnused?: () => void;
  onViewOptimizations?: () => void;
  onDismiss?: () => void;
}

export function OptimizationToast({
  unusedImports,
  optimizationCount,
  onRemoveUnused,
  onViewOptimizations,
  onDismiss,
}: OptimizationToastProps) {
  return (
    <div className="max-w-md w-full bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            🚀
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Optimization Opportunities
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {optimizationCount} suggestion{optimizationCount > 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {unusedImports.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-700 font-medium">
            🧹 {unusedImports.length} unused import{unusedImports.length > 1 ? 's' : ''}:
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {unusedImports.slice(0, 3).map((imp, index) => (
              <code key={index} className="text-xs bg-gray-100 px-1 rounded">
                {imp}
              </code>
            ))}
            {unusedImports.length > 3 && (
              <span className="text-xs text-gray-500">
                +{unusedImports.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex space-x-2">
        {onRemoveUnused && unusedImports.length > 0 && (
          <button
            onClick={onRemoveUnused}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <span>🧹</span>
            <span>Remove Unused</span>
          </button>
        )}
        
        {onViewOptimizations && (
          <button
            onClick={onViewOptimizations}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View All</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface HealthToastProps {
  healthScore: number;
  totalErrors: number;
  totalWarnings: number;
  onViewDetails?: () => void;
  onDismiss?: () => void;
}

export function HealthToast({
  healthScore,
  totalErrors,
  totalWarnings,
  onViewDetails,
  onDismiss,
}: HealthToastProps) {
  const getHealthColor = () => {
    if (healthScore >= 90) return 'text-green-600';
    if (healthScore >= 70) return 'text-yellow-600';
    if (healthScore >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthEmoji = () => {
    if (healthScore >= 90) return '💚';
    if (healthScore >= 70) return '💛';
    if (healthScore >= 50) return '🧡';
    return '❤️';
  };

  const getBackgroundColor = () => {
    if (healthScore >= 90) return 'bg-green-50 border-green-200';
    if (healthScore >= 70) return 'bg-yellow-50 border-yellow-200';
    if (healthScore >= 50) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`max-w-md w-full ${getBackgroundColor()} border rounded-lg shadow-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {getHealthEmoji()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Code Health Score
            </h3>
            <p className={`text-lg font-bold ${getHealthColor()}`}>
              {healthScore}/100
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {(totalErrors > 0 || totalWarnings > 0) && (
        <div className="mt-3 text-xs text-gray-600">
          {totalErrors > 0 && (
            <span className="text-red-600 font-medium">
              {totalErrors} error{totalErrors > 1 ? 's' : ''}
            </span>
          )}
          {totalErrors > 0 && totalWarnings > 0 && <span> • </span>}
          {totalWarnings > 0 && (
            <span className="text-yellow-600 font-medium">
              {totalWarnings} warning{totalWarnings > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {onViewDetails && (totalErrors > 0 || totalWarnings > 0) && (
        <div className="mt-4">
          <button
            onClick={onViewDetails}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View Details</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default StructuralValidationToast;

