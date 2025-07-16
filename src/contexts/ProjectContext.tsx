/**
 * Project context for managing project state across the application.
 * 
 * Provides centralized project management with real-time updates
 * and WebSocket integration for the CI/CD dashboard.
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

// Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  webhook_url: string;
  github_repo: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  last_run?: string;
  deployment_settings: {
    build_command: string;
    deploy_command: string;
    health_check_url: string;
    environment_variables: Record<string, string>;
  };
  validation_settings: {
    auto_merge: boolean;
    required_checks: string[];
    timeout_minutes: number;
    max_retries: number;
  };
}

export interface AgentRun {
  id: string;
  project_id: string;
  target_text: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_input';
  progress_percentage: number;
  current_step?: string;
  response_type?: 'regular' | 'plan' | 'pr';
  response_data?: any;
  error_message?: string;
  retry_count: number;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationPipeline {
  id: string;
  project_id: string;
  pull_request_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_step?: string;
  deployment_url?: string;
  created_at: string;
}

interface ProjectState {
  projects: Project[];
  selectedProject?: Project;
  activeRuns: AgentRun[];
  activeValidations: ValidationPipeline[];
  loading: boolean;
  error?: string;
}

type ProjectAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SELECT_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'ADD_AGENT_RUN'; payload: AgentRun }
  | { type: 'UPDATE_AGENT_RUN'; payload: AgentRun }
  | { type: 'REMOVE_AGENT_RUN'; payload: string }
  | { type: 'ADD_VALIDATION'; payload: ValidationPipeline }
  | { type: 'UPDATE_VALIDATION'; payload: ValidationPipeline }
  | { type: 'REMOVE_VALIDATION'; payload: string };

const initialState: ProjectState = {
  projects: [],
  activeRuns: [],
  activeValidations: [],
  loading: false,
};

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload, loading: false };
    
    case 'SELECT_PROJECT':
      return { ...state, selectedProject: action.payload };
    
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p => 
          p.id === action.payload.id ? action.payload : p
        ),
        selectedProject: state.selectedProject?.id === action.payload.id 
          ? action.payload 
          : state.selectedProject
      };
    
    case 'ADD_AGENT_RUN':
      return {
        ...state,
        activeRuns: [...state.activeRuns, action.payload]
      };
    
    case 'UPDATE_AGENT_RUN':
      return {
        ...state,
        activeRuns: state.activeRuns.map(run =>
          run.id === action.payload.id ? action.payload : run
        )
      };
    
    case 'REMOVE_AGENT_RUN':
      return {
        ...state,
        activeRuns: state.activeRuns.filter(run => run.id !== action.payload)
      };
    
    case 'ADD_VALIDATION':
      return {
        ...state,
        activeValidations: [...state.activeValidations, action.payload]
      };
    
    case 'UPDATE_VALIDATION':
      return {
        ...state,
        activeValidations: state.activeValidations.map(validation =>
          validation.id === action.payload.id ? action.payload : validation
        )
      };
    
    case 'REMOVE_VALIDATION':
      return {
        ...state,
        activeValidations: state.activeValidations.filter(
          validation => validation.id !== action.payload
        )
      };
    
    default:
      return state;
  }
}

interface ProjectContextType {
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
  loadProjects: () => Promise<void>;
  selectProject: (project: Project) => void;
  startAgentRun: (projectId: string, targetText: string) => Promise<AgentRun>;
  continueAgentRun: (runId: string, continuationText: string) => Promise<void>;
  handlePlanResponse: (runId: string, action: 'confirm' | 'modify', modificationText?: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  const { sendMessage, lastMessage } = useWebSocket();

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const message = JSON.parse(lastMessage.data);
    
    switch (message.type) {
      case 'agent_run_started':
        // Agent run will be added when we get the full data
        break;
      
      case 'agent_run_progress':
        dispatch({
          type: 'UPDATE_AGENT_RUN',
          payload: {
            id: message.run_id,
            status: message.status,
            progress_percentage: message.progress,
            current_step: message.current_step
          } as AgentRun
        });
        break;
      
      case 'agent_run_completed':
        dispatch({
          type: 'UPDATE_AGENT_RUN',
          payload: {
            id: message.run_id,
            status: message.status,
            response_type: message.response_type,
            response_data: message.response_data,
            progress_percentage: 100
          } as AgentRun
        });
        break;
      
      case 'agent_run_failed':
        dispatch({
          type: 'UPDATE_AGENT_RUN',
          payload: {
            id: message.run_id,
            status: 'failed',
            error_message: message.error_message,
            progress_percentage: 0
          } as AgentRun
        });
        break;
      
      case 'validation_started':
        dispatch({
          type: 'ADD_VALIDATION',
          payload: {
            id: message.pipeline_id,
            project_id: state.selectedProject?.id || '',
            pull_request_id: message.pull_request_id,
            status: 'running',
            progress_percentage: 0,
            created_at: new Date().toISOString()
          }
        });
        break;
      
      case 'validation_progress':
        dispatch({
          type: 'UPDATE_VALIDATION',
          payload: {
            id: message.pipeline_id,
            progress_percentage: message.progress,
            current_step: message.current_step,
            status: 'running'
          } as ValidationPipeline
        });
        break;
      
      case 'validation_completed':
        dispatch({
          type: 'UPDATE_VALIDATION',
          payload: {
            id: message.pipeline_id,
            status: 'completed',
            progress_percentage: 100,
            deployment_url: message.deployment_url
          } as ValidationPipeline
        });
        break;
    }
  }, [lastMessage, state.selectedProject?.id]);

  // Subscribe to project updates when project is selected
  useEffect(() => {
    if (state.selectedProject && sendMessage) {
      sendMessage(JSON.stringify({
        type: 'subscribe_project',
        project_id: state.selectedProject.id
      }));
    }
  }, [state.selectedProject, sendMessage]);

  const loadProjects = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await fetch('/api/v1/projects');
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      
      const projects = await response.json();
      dispatch({ type: 'SET_PROJECTS', payload: projects });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const selectProject = (project: Project) => {
    dispatch({ type: 'SELECT_PROJECT', payload: project });
  };

  const startAgentRun = async (projectId: string, targetText: string): Promise<AgentRun> => {
    const response = await fetch('/api/v1/agent-runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        target_text: targetText,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start agent run');
    }

    const result = await response.json();
    const agentRun: AgentRun = {
      id: result.data.run_id,
      project_id: projectId,
      target_text: targetText,
      status: 'pending',
      progress_percentage: 0,
      retry_count: 0,
      session_id: result.data.session_id || '',
      created_at: result.data.created_at,
      updated_at: result.data.created_at,
    };

    dispatch({ type: 'ADD_AGENT_RUN', payload: agentRun });
    return agentRun;
  };

  const continueAgentRun = async (runId: string, continuationText: string) => {
    const response = await fetch(`/api/v1/agent-runs/${runId}/continue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        continuation_text: continuationText,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to continue agent run');
    }

    // Update will come via WebSocket
  };

  const handlePlanResponse = async (
    runId: string, 
    action: 'confirm' | 'modify', 
    modificationText?: string
  ) => {
    const response = await fetch(`/api/v1/agent-runs/${runId}/plan-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        modification_text: modificationText,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to handle plan response');
    }

    // Update will come via WebSocket
  };

  const contextValue: ProjectContextType = {
    state,
    dispatch,
    loadProjects,
    selectProject,
    startAgentRun,
    continueAgentRun,
    handlePlanResponse,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

