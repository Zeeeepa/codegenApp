/**
 * useStructuralValidation Hook
 * 
 * Custom React hook that leverages graph-sitter's predefined analysis methods
 * for real-time component validation and structural integrity monitoring.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  structuralAnalysisService,
  ValidationResult,
  FunctionAnalysis,
  ClassAnalysis,
  SymbolAnalysis,
  DependencyGraphNode
} from '../utils/structuralAnalysis';
import { 
  structuralCache,
  StructuralCacheEntry,
  StructuralChangeEvent,
  DependencyOptimization,
  StructuralHealthMetrics
} from '../storage/structuralCache';
import { useStructuralAnalysis } from '../contexts/StructuralAnalysisContext';

export interface StructuralValidationOptions {
  enableRealTimeValidation?: boolean;
  validationInterval?: number; // milliseconds
  autoFixIssues?: boolean;
  notifyOnIssues?: boolean;
  trackDependencies?: boolean;
  enableOptimization?: boolean;
}

export interface StructuralValidationState {
  isValidating: boolean;
  validationResult: ValidationResult | null;
  functionAnalysis: FunctionAnalysis[];
  classAnalysis: ClassAnalysis[];
  symbolAnalysis: SymbolAnalysis[];
  dependencyGraph: DependencyGraphNode[];
  optimization: DependencyOptimization | null;
  healthMetrics: StructuralHealthMetrics | null;
  lastValidation: string | null;
  error: string | null;
}

export interface StructuralValidationActions {
  validateFile: (filePath: string) => Promise<ValidationResult>;
  validateComponent: (componentPath: string) => Promise<ValidationResult>;
  analyzeFunction: (filePath: string, functionName: string) => Promise<FunctionAnalysis | null>;
  analyzeClass: (filePath: string, className: string) => Promise<ClassAnalysis | null>;
  getDependencies: (filePath: string) => Promise<DependencyGraphNode[]>;
  getOptimizationSuggestions: (filePath?: string) => Promise<DependencyOptimization>;
  refreshValidation: () => Promise<void>;
  enableRealTimeValidation: (enabled: boolean) => void;
  clearValidation: () => void;
}

const defaultOptions: StructuralValidationOptions = {
  enableRealTimeValidation: false,
  validationInterval: 30000, // 30 seconds
  autoFixIssues: false,
  notifyOnIssues: true,
  trackDependencies: true,
  enableOptimization: true,
};

const initialState: StructuralValidationState = {
  isValidating: false,
  validationResult: null,
  functionAnalysis: [],
  classAnalysis: [],
  symbolAnalysis: [],
  dependencyGraph: [],
  optimization: null,
  healthMetrics: null,
  lastValidation: null,
  error: null,
};

export function useStructuralValidation(
  filePath?: string,
  options: StructuralValidationOptions = {}
): StructuralValidationState & StructuralValidationActions {
  const mergedOptions = { ...defaultOptions, ...options };
  const [state, setState] = useState<StructuralValidationState>(initialState);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { notifyStructuralChange } = useStructuralAnalysis();

  // Set up structural change listener
  useEffect(() => {
    const handleStructuralChange = (event: StructuralChangeEvent) => {
      console.log('🔄 Structural change detected in hook:', event);
      
      // If the change affects our monitored file, refresh validation
      if (!filePath || event.filePath === filePath) {
        refreshValidation();
      }
      
      // Notify the context
      notifyStructuralChange({
        type: event.type,
        filePath: event.filePath,
        symbolName: event.symbolName,
        impact: event.impact.severity,
      });
    };

    structuralCache.addChangeListener(handleStructuralChange);

    return () => {
      structuralCache.removeChangeListener(handleStructuralChange);
    };
  }, [filePath]);

  // Set up real-time validation
  useEffect(() => {
    if (mergedOptions.enableRealTimeValidation && filePath) {
      startRealTimeValidation();
    } else {
      stopRealTimeValidation();
    }

    return () => {
      stopRealTimeValidation();
    };
  }, [mergedOptions.enableRealTimeValidation, filePath]);

  const startRealTimeValidation = useCallback(() => {
    if (validationTimerRef.current) {
      clearInterval(validationTimerRef.current);
    }

    validationTimerRef.current = setInterval(() => {
      if (filePath) {
        validateFile(filePath);
      }
    }, mergedOptions.validationInterval);
  }, [filePath, mergedOptions.validationInterval]);

  const stopRealTimeValidation = useCallback(() => {
    if (validationTimerRef.current) {
      clearInterval(validationTimerRef.current);
      validationTimerRef.current = null;
    }
  }, []);

  const validateFile = useCallback(async (targetFilePath: string): Promise<ValidationResult> => {
    setState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      console.log(`🔍 Validating file: ${targetFilePath}`);

      // Check cache first
      let cachedEntry = await structuralCache.getFileStructure(targetFilePath);
      
      if (!cachedEntry) {
        // Perform fresh analysis
        cachedEntry = await structuralCache.cacheFileStructure(targetFilePath);
      }

      // Get comprehensive analysis
      const [functionAnalysis, classAnalysis, symbolAnalysis, dependencyGraph] = await Promise.all([
        structuralAnalysisService.analyzeFunctions(targetFilePath),
        structuralAnalysisService.analyzeClasses(targetFilePath),
        structuralAnalysisService.analyzeSymbols(targetFilePath),
        structuralAnalysisService.getDependencyGraph(targetFilePath),
      ]);

      // Get optimization suggestions if enabled
      let optimization: DependencyOptimization | null = null;
      if (mergedOptions.enableOptimization) {
        optimization = await structuralCache.getDependencyOptimization(targetFilePath);
      }

      // Get health metrics
      const healthMetrics = await structuralCache.getStructuralHealth();

      setState(prev => ({
        ...prev,
        isValidating: false,
        validationResult: cachedEntry!.validationResult,
        functionAnalysis,
        classAnalysis,
        symbolAnalysis,
        dependencyGraph,
        optimization,
        healthMetrics,
        lastValidation: new Date().toISOString(),
        error: null,
      }));

      return cachedEntry.validationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      console.error('❌ Validation failed:', errorMessage);

      setState(prev => ({
        ...prev,
        isValidating: false,
        error: errorMessage,
      }));

      // Return empty validation result on error
      return {
        isValid: false,
        issues: [{
          severity: 'error',
          category: 'validation_error',
          message: errorMessage,
          filePath: targetFilePath,
        }],
        summary: {
          totalIssues: 1,
          errors: 1,
          warnings: 0,
          infos: 0,
          filesAnalyzed: 0,
          functionsAnalyzed: 0,
          classesAnalyzed: 0,
        },
      };
    }
  }, [mergedOptions.enableOptimization]);

  const validateComponent = useCallback(async (componentPath: string): Promise<ValidationResult> => {
    console.log(`🧩 Validating React component: ${componentPath}`);
    
    // For React components, we perform additional checks
    const result = await validateFile(componentPath);
    
    // Add component-specific validation
    const componentIssues = await validateReactComponentSpecifics(componentPath);
    
    return {
      ...result,
      issues: [...result.issues, ...componentIssues],
      summary: {
        ...result.summary,
        totalIssues: result.summary.totalIssues + componentIssues.length,
        warnings: result.summary.warnings + componentIssues.filter(i => i.severity === 'warning').length,
      },
    };
  }, [validateFile]);

  const analyzeFunction = useCallback(async (
    targetFilePath: string, 
    functionName: string
  ): Promise<FunctionAnalysis | null> => {
    console.log(`🔧 Analyzing function: ${functionName} in ${targetFilePath}`);

    const functions = await structuralAnalysisService.analyzeFunctions(targetFilePath);
    return functions.find(f => f.name === functionName) || null;
  }, []);

  const analyzeClass = useCallback(async (
    targetFilePath: string, 
    className: string
  ): Promise<ClassAnalysis | null> => {
    console.log(`🏗️ Analyzing class: ${className} in ${targetFilePath}`);

    const classes = await structuralAnalysisService.analyzeClasses(targetFilePath);
    return classes.find(c => c.name === className) || null;
  }, []);

  const getDependencies = useCallback(async (targetFilePath: string): Promise<DependencyGraphNode[]> => {
    console.log(`🕸️ Getting dependencies for: ${targetFilePath}`);

    return await structuralAnalysisService.getDependencyGraph(targetFilePath);
  }, []);

  const getOptimizationSuggestions = useCallback(async (
    targetFilePath?: string
  ): Promise<DependencyOptimization> => {
    console.log(`🎯 Getting optimization suggestions for: ${targetFilePath || 'global'}`);

    return await structuralCache.getDependencyOptimization(targetFilePath);
  }, []);

  const refreshValidation = useCallback(async (): Promise<void> => {
    if (filePath) {
      await validateFile(filePath);
    }
  }, [filePath, validateFile]);

  const enableRealTimeValidation = useCallback((enabled: boolean): void => {
    if (enabled) {
      startRealTimeValidation();
    } else {
      stopRealTimeValidation();
    }
  }, [startRealTimeValidation, stopRealTimeValidation]);

  const clearValidation = useCallback((): void => {
    setState(initialState);
    stopRealTimeValidation();
  }, [stopRealTimeValidation]);

  // Auto-validate on mount if filePath is provided
  useEffect(() => {
    if (filePath) {
      validateFile(filePath);
    }
  }, [filePath]);

  return {
    ...state,
    validateFile,
    validateComponent,
    analyzeFunction,
    analyzeClass,
    getDependencies,
    getOptimizationSuggestions,
    refreshValidation,
    enableRealTimeValidation,
    clearValidation,
  };
}

// Helper function for React component-specific validation
async function validateReactComponentSpecifics(componentPath: string) {
  const issues = [];

  // Check for common React patterns and issues
  // This would use graph-sitter to analyze React-specific patterns
  
  // Mock React-specific validations
  if (componentPath.includes('.tsx') || componentPath.includes('.jsx')) {
    // Check for missing key props in lists
    const hasListWithoutKeys = Math.random() < 0.3; // Mock check
    if (hasListWithoutKeys) {
      issues.push({
        severity: 'warning' as const,
        category: 'react_best_practices',
        message: 'List items should have unique key props',
        filePath: componentPath,
        suggestion: 'Add unique key prop to list items',
      });
    }

    // Check for unused state variables
    const hasUnusedState = Math.random() < 0.2; // Mock check
    if (hasUnusedState) {
      issues.push({
        severity: 'warning' as const,
        category: 'react_optimization',
        message: 'Unused state variable detected',
        filePath: componentPath,
        suggestion: 'Remove unused state or add usage',
      });
    }

    // Check for missing useCallback/useMemo optimizations
    const needsOptimization = Math.random() < 0.4; // Mock check
    if (needsOptimization) {
      issues.push({
        severity: 'info' as const,
        category: 'react_performance',
        message: 'Consider using useCallback or useMemo for performance optimization',
        filePath: componentPath,
        suggestion: 'Wrap expensive calculations in useMemo or functions in useCallback',
      });
    }
  }

  return issues;
}

// Export types for external use
export type {
  StructuralValidationOptions,
  StructuralValidationState,
  StructuralValidationActions,
};

