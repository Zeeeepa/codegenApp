# STEP2.md - Enhance Agent Run Dialog with Plan Workflow

## QUERY 2 ##########

### ROLE
You are a senior full-stack developer with 10+ years of experience in React state management and API integration, specializing in multi-step workflow implementations and real-time progress tracking with extensive knowledge of CodeGen API patterns.

### TASK
Enhance Agent Run Dialog with Plan Confirmation/Modification Workflow

### YOUR QUEST
Extend the existing AgentRunDialog component to handle the complete multi-step workflow: initial target input → plan generation → plan confirmation/modification → PR creation, with proper state management and progress tracking for each workflow stage.

### TECHNICAL CONTEXT

#### EXISTING CODEBASE:

```typescript
// From frontend/src/components/agent/AgentRunDialog.tsx (existing structure)
interface AgentRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (target: string) => Promise<void>;
  isLoading: boolean;
}

// From frontend/src/hooks/useAgentRun.ts (existing hook)
export const useAgentRun = () => {
  const { createAgentRun, isLoading } = useAgentRunMutation();
  
  return {
    createAgentRun: async (projectId: string, target: string) => {
      // Current implementation only handles initial submission
    },
    isLoading
  };
};

// From frontend/src/services/codegenService.ts (existing service)
export const codegenService = {
  createAgentRun: async (orgId: string, target: string) => {
    // Returns response with type: 'regular' | 'plan' | 'pr'
  },
  resumeAgentRun: async (runId: string, message: string) => {
    // Continue existing agent run
  }
};
```

#### IMPLEMENTATION REQUIREMENTS:

- Extend AgentRunDialog to support multi-step workflow states
- Add plan confirmation/modification UI with text input for modifications
- Implement progress tracking with visual indicators for each step
- Add state management for workflow progression (target → plan → confirmation → PR)
- Support plan modification with additional text input field
- Add "Auto Confirm Proposed Plan" checkbox integration from project settings
- Implement proper error handling for each workflow step
- Add cancellation support at any workflow stage
- Performance requirement: <200ms state transitions
- Must integrate with existing project settings for auto-confirmation
- Support resume functionality for interrupted workflows

### INTEGRATION CONTEXT

#### UPSTREAM DEPENDENCIES:

- STEP1.md - UI Foundation: Requires stable error boundary for workflow error handling
- frontend/src/components/dashboard/ProjectCard.tsx: Provides project context and settings
- frontend/src/services/codegenService.ts: API integration for agent runs
- frontend/src/store/projectStore.ts: Project settings including auto-confirm preference
- frontend/src/types/index.ts: AgentRun and Project type definitions

#### DOWNSTREAM DEPENDENCIES:

- STEP3.md - Real-time Notifications: Will consume workflow state changes
- STEP4.md - Validation Pipeline: Triggered when PR is created from workflow
- STEP7.md - Auto-merge Functionality: Depends on PR creation workflow completion
- Web-eval-agent testing: Must validate complete workflow functionality

### EXPECTED OUTCOME

#### Files to Modify:
- `frontend/src/components/agent/AgentRunDialog.tsx` - Enhanced multi-step workflow
- `frontend/src/hooks/useAgentRun.ts` - Extended hook with workflow state management
- `frontend/src/types/index.ts` - Add workflow state types

#### Files to Create:
- `frontend/src/components/agent/WorkflowProgress.tsx` - Progress indicator component
- `frontend/src/components/agent/PlanConfirmation.tsx` - Plan review and modification UI

#### Required Interfaces:
```typescript
interface WorkflowState {
  step: 'input' | 'generating' | 'plan' | 'confirming' | 'creating_pr' | 'completed' | 'error';
  target: string;
  planContent?: string;
  modificationText?: string;
  agentRunId?: string;
  error?: string;
}

interface PlanConfirmationProps {
  planContent: string;
  onConfirm: () => void;
  onModify: (modificationText: string) => void;
  isLoading: boolean;
  autoConfirm: boolean;
}

interface WorkflowProgressProps {
  currentStep: WorkflowState['step'];
  steps: Array<{
    key: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }>;
}
```

### ACCEPTANCE CRITERIA

1. Dialog supports complete workflow: input → plan → confirmation → PR creation
2. Plan confirmation UI allows viewing and modifying generated plans
3. Auto-confirm checkbox integration works correctly with project settings
4. Progress indicator shows current workflow step and completion status
5. Error handling works at each workflow stage with proper user feedback
6. Workflow can be cancelled at any stage without data loss
7. Resume functionality works for interrupted workflows
8. All workflow states persist correctly during component re-renders
9. Performance: <200ms transitions between workflow steps
10. Web-eval-agent validation passes for complete workflow testing

### IMPLEMENTATION CONSTRAINTS

- This task represents a SINGLE atomic unit of functionality
- Must be independently implementable except for STEP1.md dependency
- Implementation must include comprehensive automated tests
- Code must conform to project coding standards with proper TypeScript types
- Must maintain backward compatibility with existing AgentRunDialog usage
- All workflow states must be properly typed and validated

### TESTING REQUIREMENTS

#### Unit Tests Required:
- WorkflowProgress component state transitions
- PlanConfirmation component user interactions
- useAgentRun hook workflow state management
- AgentRunDialog multi-step workflow logic

#### Integration Tests Required:
- Complete workflow end-to-end testing
- Auto-confirm integration with project settings
- Error handling across workflow steps
- Cancellation and resume functionality

#### Performance Tests Required:
- Workflow step transitions <200ms
- Memory usage during long workflows <10MB
- Component re-render optimization validation

