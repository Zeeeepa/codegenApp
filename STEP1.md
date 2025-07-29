# STEP1.md - Fix Critical UI Foundation Issues

## QUERY 1 ##########

### ROLE
You are a senior frontend architect with 12+ years of experience in React/TypeScript applications, specializing in semantic HTML structure, accessibility compliance, and error boundary implementation with extensive knowledge of modern React patterns.

### TASK
Fix Critical UI Foundation Issues in App.tsx

### YOUR QUEST
Repair the missing main element structure in App.tsx and implement proper semantic HTML hierarchy with error boundaries to establish a solid foundation for all subsequent UI components and ensure proper accessibility compliance.

### TECHNICAL CONTEXT

#### EXISTING CODEBASE:

```typescript
// From frontend/src/App.tsx (lines 82-206)
return (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Github className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                CodegenApp Dashboard
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ProjectSelector
              onProjectSelect={handleProjectSelect}
              selectedProjects={selectedProjectNames}
            />
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="settings-button"
              aria-label="Open settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Main Content - MISSING PROPER MAIN ELEMENT */}
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Content continues... */}
    </main>
  </div>
);
```

#### IMPLEMENTATION REQUIREMENTS:

- Add proper semantic HTML structure with main element
- Implement React Error Boundary component for robust error handling
- Ensure WCAG 2.1 AA accessibility compliance
- Add proper ARIA labels and roles where missing
- Implement skip navigation links for keyboard users
- Add proper focus management and keyboard navigation
- Ensure all interactive elements have proper focus indicators
- Performance requirement: <100ms initial render time
- Must maintain existing functionality while fixing structure
- Error boundary must catch and display user-friendly error messages

### INTEGRATION CONTEXT

#### UPSTREAM DEPENDENCIES:

- React 18+ (package.json): Core React functionality for error boundaries
- TypeScript 4.9+ (tsconfig.json): Type safety for error boundary props
- Tailwind CSS 3+ (tailwind.config.js): Styling framework for error UI
- Lucide React (package.json): Icon components for error states

#### DOWNSTREAM DEPENDENCIES:

- All existing components (ProjectSelector, ProjectCard, SettingsDialog): Must render within error boundary
- Web-eval-agent testing: Must validate proper semantic structure
- STEP2.md - Agent Run Dialog Enhancement: Depends on stable UI foundation
- STEP3.md - Real-time Notifications: Requires error boundary for WebSocket errors

### EXPECTED OUTCOME

#### Files to Create:
- `frontend/src/components/ErrorBoundary.tsx` - React error boundary component
- `frontend/src/components/SkipNavigation.tsx` - Accessibility skip links

#### Files to Modify:
- `frontend/src/App.tsx` - Fix main element structure and add error boundary
- `frontend/src/index.tsx` - Add error boundary at root level

#### Required Interfaces:
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}
```

### ACCEPTANCE CRITERIA

1. App.tsx contains proper semantic HTML structure with main element
2. Error boundary catches and displays user-friendly error messages
3. All accessibility requirements met (WCAG 2.1 AA compliance)
4. Skip navigation links work correctly for keyboard users
5. All existing functionality preserved without regression
6. Web-eval-agent validation passes for UI structure
7. Error boundary unit tests achieve >95% code coverage
8. Performance metrics: <100ms initial render time maintained

### IMPLEMENTATION CONSTRAINTS

- This task represents a SINGLE atomic unit of functionality
- Must be independently implementable with no dependencies on other STEP files
- Implementation must include comprehensive automated tests
- Code must conform to project coding standards with proper TypeScript types
- Must not break any existing component functionality
- All changes must be backward compatible

### TESTING REQUIREMENTS

#### Unit Tests Required:
- ErrorBoundary component error catching and display
- SkipNavigation component keyboard navigation
- App.tsx semantic structure validation
- Accessibility compliance testing

#### Integration Tests Required:
- Error boundary integration with existing components
- Skip navigation integration with main content areas
- Focus management across component boundaries

#### Performance Tests Required:
- Initial render time <100ms
- Error boundary overhead <10ms
- Memory usage impact <5MB additional

