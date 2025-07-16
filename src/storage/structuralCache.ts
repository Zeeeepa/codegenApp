/**
 * Structural Cache System
 * 
 * This module enhances the existing cache system with graph-sitter's Symbol and Import analysis
 * for dependency optimization and structural integrity monitoring.
 */

import { Cache, LocalStorage } from "../utils/storage";
import { 
  structuralAnalysisService, 
  SymbolAnalysis, 
  ImportAnalysis,
  DependencyGraphNode,
  ValidationResult 
} from "../utils/structuralAnalysis";
import {
  CacheMetadata,
  CACHE_KEYS,
  CACHE_NAMESPACES,
  SyncStatus,
} from "./cacheTypes";

export interface StructuralCacheEntry {
  filePath: string;
  symbols: SymbolAnalysis[];
  imports: ImportAnalysis[];
  dependencies: DependencyGraphNode[];
  lastAnalysis: string;
  validationResult: ValidationResult;
  structuralHash: string; // Hash of file structure for change detection
}

export interface DependencyOptimization {
  unusedImports: string[];
  circularDependencies: string[][];
  optimizationSuggestions: OptimizationSuggestion[];
  potentialRefactors: RefactorSuggestion[];
}

export interface OptimizationSuggestion {
  type: 'remove_unused_import' | 'merge_similar_functions' | 'extract_common_logic' | 'reduce_complexity';
  filePath: string;
  symbolName: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedSavings: string; // e.g., "15% bundle size reduction"
}

export interface RefactorSuggestion {
  type: 'extract_class' | 'split_function' | 'move_to_utility' | 'create_interface';
  filePath: string;
  symbolName: string;
  targetLocation: string;
  reason: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface StructuralChangeEvent {
  type: 'symbol_added' | 'symbol_removed' | 'symbol_modified' | 'dependency_changed';
  filePath: string;
  symbolName: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  impact: DependencyImpact;
}

export interface DependencyImpact {
  affectedFiles: string[];
  affectedSymbols: string[];
  breakingChanges: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class StructuralCache {
  private cache: Cache;
  private metadata: CacheMetadata;
  private changeListeners: ((event: StructuralChangeEvent) => void)[] = [];
  private optimizationCache: Map<string, DependencyOptimization> = new Map();

  constructor() {
    this.cache = new Cache({
      namespace: CACHE_NAMESPACES.STRUCTURAL_ANALYSIS,
      capacity: 50 * 1024 * 1024, // 50MB for structural data
    });
    this.metadata = {
      lastFullSync: "",
      version: "1.0.0",
      organizationSyncStatus: {},
    };
  }

  /**
   * Cache structural analysis for a file using graph-sitter Symbol analysis
   */
  async cacheFileStructure(filePath: string): Promise<StructuralCacheEntry> {
    console.log(`🔍 Caching structural analysis for: ${filePath}`);

    // Perform graph-sitter analysis
    const symbols = await structuralAnalysisService.analyzeSymbols(filePath);
    const imports = await structuralAnalysisService.analyzeImports(filePath);
    const dependencies = await structuralAnalysisService.getDependencyGraph(filePath);
    const validationResult = await structuralAnalysisService.validateParameterUsage(filePath);

    // Generate structural hash for change detection
    const structuralHash = this.generateStructuralHash(symbols, imports);

    const entry: StructuralCacheEntry = {
      filePath,
      symbols,
      imports,
      dependencies,
      lastAnalysis: new Date().toISOString(),
      validationResult,
      structuralHash,
    };

    // Cache the entry
    const cacheKey = this.getFileCacheKey(filePath);
    this.cache.set(cacheKey, JSON.stringify(entry));

    // Check for structural changes
    await this.detectStructuralChanges(filePath, entry);

    return entry;
  }

  /**
   * Get cached structural analysis for a file
   */
  async getFileStructure(filePath: string): Promise<StructuralCacheEntry | null> {
    const cacheKey = this.getFileCacheKey(filePath);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as StructuralCacheEntry;
    } catch (error) {
      console.error(`Error parsing cached structure for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cache based on structural changes using Symbol.symbol_usages
   */
  async invalidateBySymbolChange(symbolName: string, filePath: string): Promise<void> {
    console.log(`🔄 Invalidating cache for symbol change: ${symbolName} in ${filePath}`);

    // Find all files that depend on this symbol
    const affectedFiles = await this.findSymbolDependents(symbolName, filePath);

    // Invalidate cache for affected files
    for (const affectedFile of affectedFiles) {
      const cacheKey = this.getFileCacheKey(affectedFile);
      this.cache.delete(cacheKey);
      console.log(`🗑️ Invalidated cache for: ${affectedFile}`);
    }

    // Trigger re-analysis for affected files
    for (const affectedFile of affectedFiles) {
      await this.cacheFileStructure(affectedFile);
    }
  }

  /**
   * Get dependency optimization suggestions using Import analysis
   */
  async getDependencyOptimization(filePath?: string): Promise<DependencyOptimization> {
    const cacheKey = filePath || 'global_optimization';
    
    // Check if optimization is cached
    if (this.optimizationCache.has(cacheKey)) {
      return this.optimizationCache.get(cacheKey)!;
    }

    console.log(`🎯 Analyzing dependency optimization for: ${cacheKey}`);

    // Analyze imports for optimization opportunities
    const imports = await structuralAnalysisService.analyzeImports(filePath);
    const symbols = await structuralAnalysisService.analyzeSymbols(filePath);

    const optimization: DependencyOptimization = {
      unusedImports: this.findUnusedImports(imports),
      circularDependencies: await this.findCircularDependencies(filePath),
      optimizationSuggestions: this.generateOptimizationSuggestions(imports, symbols),
      potentialRefactors: this.generateRefactorSuggestions(symbols),
    };

    // Cache the optimization result
    this.optimizationCache.set(cacheKey, optimization);

    return optimization;
  }

  /**
   * Monitor structural changes in real-time
   */
  async startStructuralMonitoring(filePaths: string[]): Promise<void> {
    console.log('👁️ Starting structural monitoring for files:', filePaths);

    // Initial analysis for all files
    for (const filePath of filePaths) {
      await this.cacheFileStructure(filePath);
    }

    // Set up file watching (in a real implementation, this would use fs.watch)
    // For now, we'll simulate periodic checks
    setInterval(async () => {
      for (const filePath of filePaths) {
        await this.checkForStructuralChanges(filePath);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Add listener for structural change events
   */
  addChangeListener(listener: (event: StructuralChangeEvent) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove change listener
   */
  removeChangeListener(listener: (event: StructuralChangeEvent) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Get structural health metrics
   */
  async getStructuralHealth(): Promise<StructuralHealthMetrics> {
    const allEntries = await this.getAllCachedEntries();
    
    let totalIssues = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    let filesWithIssues = 0;

    for (const entry of allEntries) {
      const issues = entry.validationResult.issues.length;
      const errors = entry.validationResult.summary.errors;
      const warnings = entry.validationResult.summary.warnings;

      totalIssues += issues;
      totalErrors += errors;
      totalWarnings += warnings;

      if (issues > 0) {
        filesWithIssues++;
      }
    }

    const healthScore = Math.max(0, 100 - (totalErrors * 10 + totalWarnings * 2));

    return {
      healthScore,
      totalFiles: allEntries.length,
      filesWithIssues,
      totalIssues,
      totalErrors,
      totalWarnings,
      lastUpdate: new Date().toISOString(),
    };
  }

  // Private helper methods

  private generateStructuralHash(symbols: SymbolAnalysis[], imports: ImportAnalysis[]): string {
    const data = {
      symbols: symbols.map(s => ({ name: s.name, type: s.type, usages: s.usages.length })),
      imports: imports.map(i => ({ module: i.moduleName, symbols: i.importedSymbols })),
    };
    
    // Simple hash generation (in production, use a proper hash function)
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  private async detectStructuralChanges(filePath: string, newEntry: StructuralCacheEntry): Promise<void> {
    const previousEntry = await this.getFileStructure(filePath);
    
    if (!previousEntry) {
      // First time analysis
      return;
    }

    // Compare structural hashes
    if (previousEntry.structuralHash !== newEntry.structuralHash) {
      const changes = this.analyzeStructuralDifferences(previousEntry, newEntry);
      
      for (const change of changes) {
        this.notifyChangeListeners(change);
      }
    }
  }

  private analyzeStructuralDifferences(
    oldEntry: StructuralCacheEntry, 
    newEntry: StructuralCacheEntry
  ): StructuralChangeEvent[] {
    const changes: StructuralChangeEvent[] = [];

    // Compare symbols
    const oldSymbols = new Set(oldEntry.symbols.map(s => s.name));
    const newSymbols = new Set(newEntry.symbols.map(s => s.name));

    // Find added symbols
    for (const symbolName of newSymbols) {
      if (!oldSymbols.has(symbolName)) {
        changes.push({
          type: 'symbol_added',
          filePath: newEntry.filePath,
          symbolName,
          newValue: newEntry.symbols.find(s => s.name === symbolName),
          timestamp: new Date().toISOString(),
          impact: this.calculateDependencyImpact(symbolName, newEntry.filePath, 'added'),
        });
      }
    }

    // Find removed symbols
    for (const symbolName of oldSymbols) {
      if (!newSymbols.has(symbolName)) {
        changes.push({
          type: 'symbol_removed',
          filePath: newEntry.filePath,
          symbolName,
          oldValue: oldEntry.symbols.find(s => s.name === symbolName),
          timestamp: new Date().toISOString(),
          impact: this.calculateDependencyImpact(symbolName, newEntry.filePath, 'removed'),
        });
      }
    }

    return changes;
  }

  private calculateDependencyImpact(
    symbolName: string, 
    filePath: string, 
    changeType: 'added' | 'removed' | 'modified'
  ): DependencyImpact {
    // This would use graph-sitter's Symbol.symbol_usages in real implementation
    // For now, simulate impact calculation
    
    const mockImpact: DependencyImpact = {
      affectedFiles: [`${filePath}_dependent1.ts`, `${filePath}_dependent2.ts`],
      affectedSymbols: [`${symbolName}_user1`, `${symbolName}_user2`],
      breakingChanges: changeType === 'removed',
      severity: changeType === 'removed' ? 'high' : 'medium',
    };

    return mockImpact;
  }

  private async findSymbolDependents(symbolName: string, filePath: string): Promise<string[]> {
    // This would use graph-sitter's Symbol.symbol_usages to find all dependents
    // For now, simulate finding dependents
    
    console.log(`🔍 Finding dependents for symbol: ${symbolName} in ${filePath}`);
    
    // Mock implementation
    return [
      'src/components/ProjectCard.tsx',
      'src/components/ProjectDashboard.tsx',
      'src/hooks/useCachedAgentRuns.ts',
    ];
  }

  private findUnusedImports(imports: ImportAnalysis[]): string[] {
    return imports
      .filter(imp => imp.unusedSymbols.length > 0)
      .flatMap(imp => imp.unusedSymbols);
  }

  private async findCircularDependencies(filePath?: string): Promise<string[][]> {
    // This would use graph-sitter's dependency analysis
    // For now, simulate circular dependency detection
    
    return [
      ['src/api/client.ts', 'src/utils/credentials.ts', 'src/api/client.ts'],
    ];
  }

  private generateOptimizationSuggestions(
    imports: ImportAnalysis[], 
    symbols: SymbolAnalysis[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Suggest removing unused imports
    for (const imp of imports) {
      if (imp.unusedSymbols.length > 0) {
        suggestions.push({
          type: 'remove_unused_import',
          filePath: imp.filePath,
          symbolName: imp.unusedSymbols.join(', '),
          description: `Remove unused imports: ${imp.unusedSymbols.join(', ')}`,
          impact: 'low',
          estimatedSavings: '2-5% bundle size reduction',
        });
      }
    }

    // Suggest function optimizations based on usage patterns
    for (const symbol of symbols) {
      if (symbol.type === 'function' && symbol.usages.length === 0) {
        suggestions.push({
          type: 'remove_unused_import',
          filePath: symbol.filePath,
          symbolName: symbol.name,
          description: `Function '${symbol.name}' appears to be unused`,
          impact: 'medium',
          estimatedSavings: '1-3% bundle size reduction',
        });
      }
    }

    return suggestions;
  }

  private generateRefactorSuggestions(symbols: SymbolAnalysis[]): RefactorSuggestion[] {
    const suggestions: RefactorSuggestion[] = [];

    // Suggest extracting utility functions
    for (const symbol of symbols) {
      if (symbol.type === 'function' && symbol.usages.length > 5) {
        suggestions.push({
          type: 'move_to_utility',
          filePath: symbol.filePath,
          symbolName: symbol.name,
          targetLocation: 'src/utils/',
          reason: `Function '${symbol.name}' is used in multiple places and could be extracted to a utility module`,
          complexity: 'simple',
        });
      }
    }

    return suggestions;
  }

  private async checkForStructuralChanges(filePath: string): Promise<void> {
    // In a real implementation, this would check file modification time
    // and re-analyze if the file has changed
    
    const shouldReanalyze = Math.random() < 0.1; // 10% chance for demo
    
    if (shouldReanalyze) {
      console.log(`🔄 Detected changes in: ${filePath}`);
      await this.cacheFileStructure(filePath);
    }
  }

  private notifyChangeListeners(event: StructuralChangeEvent): void {
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in structural change listener:', error);
      }
    }
  }

  private async getAllCachedEntries(): Promise<StructuralCacheEntry[]> {
    const entries: StructuralCacheEntry[] = [];
    
    // In a real implementation, this would iterate through all cache keys
    // For now, return mock data
    
    return entries;
  }

  private getFileCacheKey(filePath: string): string {
    return `structural_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
}

export interface StructuralHealthMetrics {
  healthScore: number; // 0-100
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  totalErrors: number;
  totalWarnings: number;
  lastUpdate: string;
}

// Singleton instance for application-wide use
export const structuralCache = new StructuralCache();

