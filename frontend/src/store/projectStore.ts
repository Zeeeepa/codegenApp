import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectCard, GitHubRepository, ProjectSettings, AgentRun, ProjectNotification } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ProjectStore {
  // State
  projects: ProjectCard[];
  selectedProject: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  addProject: (repository: GitHubRepository) => void;
  removeProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<ProjectCard>) => void;
  updateProjectSettings: (projectId: string, settings: Partial<ProjectSettings>) => void;
  addAgentRun: (projectId: string, agentRun: Omit<AgentRun, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAgentRun: (projectId: string, runId: string, updates: Partial<AgentRun>) => void;
  addNotification: (projectId: string, notification: Omit<ProjectNotification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (projectId: string, notificationId: string) => void;
  clearNotifications: (projectId: string) => void;
  setSelectedProject: (projectId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Getters
  getProject: (projectId: string) => ProjectCard | undefined;
  getProjectByRepoName: (repoName: string) => ProjectCard | undefined;
  getUnreadNotifications: (projectId: string) => ProjectNotification[];
  getActiveAgentRuns: (projectId: string) => AgentRun[];
}

const createDefaultSettings = (): ProjectSettings => ({
  repositoryRules: '',
  setupCommands: '',
  selectedBranch: 'main',
  secrets: {},
  planningStatement: 'You are an expert software engineer. Please analyze the requirements and create a comprehensive implementation plan.',
  autoConfirmPlan: false,
  autoMergeValidatedPR: false,
});

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // Initial State
      projects: [],
      selectedProject: null,
      isLoading: false,
      error: null,

      // Actions
      addProject: (repository: GitHubRepository) => {
        const existingProject = get().projects.find(p => p.repository.id === repository.id);
        if (existingProject) {
          get().setError('Project already exists in dashboard');
          return;
        }

        const newProject: ProjectCard = {
          id: uuidv4(),
          repository,
          webhookActive: false,
          settings: createDefaultSettings(),
          agentRuns: [],
          notifications: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set(state => ({
          projects: [...state.projects, newProject],
          error: null
        }));
      },

      removeProject: (projectId: string) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
          selectedProject: state.selectedProject === projectId ? null : state.selectedProject
        }));
      },

      updateProject: (projectId: string, updates: Partial<ProjectCard>) => {
        set(state => ({
          projects: state.projects.map(project =>
            project.id === projectId
              ? { ...project, ...updates, updatedAt: new Date().toISOString() }
              : project
          )
        }));
      },

      updateProjectSettings: (projectId: string, settings: Partial<ProjectSettings>) => {
        set(state => ({
          projects: state.projects.map(project =>
            project.id === projectId
              ? {
                  ...project,
                  settings: { ...project.settings, ...settings },
                  updatedAt: new Date().toISOString()
                }
              : project
          )
        }));
      },

      addAgentRun: (projectId: string, agentRunData: Omit<AgentRun, 'id' | 'createdAt' | 'updatedAt'>) => {
        const runId = uuidv4();
        const agentRun: AgentRun = {
          ...agentRunData,
          id: runId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set(state => ({
          projects: state.projects.map(project =>
            project.id === projectId
              ? {
                  ...project,
                  agentRuns: [...project.agentRuns, agentRun],
                  updatedAt: new Date().toISOString()
                }
              : project
          )
        }));

        return runId;
      },

      updateAgentRun: (projectId: string, runId: string, updates: Partial<AgentRun>) => {
        set(state => ({
          projects: state.projects.map(project =>
            project.id === projectId
              ? {
                  ...project,
                  agentRuns: project.agentRuns.map(run =>
                    run.id === runId
                      ? { ...run, ...updates, updatedAt: new Date().toISOString() }
                      : run
                  ),
                  updatedAt: new Date().toISOString()
                }
              : project
          )
        }));
      },

      addNotification: (projectId: string, notificationData: Omit<ProjectNotification, 'id' | 'createdAt'>) => {
        const notification: ProjectNotification = {
          ...notificationData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };

        set(state => ({
          projects: state.projects.map(project =>
            project.id === projectId
              ? {
                  ...project,
                  notifications: [notification, ...project.notifications],
                  updatedAt: new Date().toISOString()
                }
              : project
          )
        }));
      },

      markNotificationRead: (projectId: string, notificationId: string) => {
        set(state => ({
          projects: state.projects.map(project =>
            project.id === projectId
              ? {
                  ...project,
                  notifications: project.notifications.map(notification =>
                    notification.id === notificationId
                      ? { ...notification, read: true }
                      : notification
                  ),
                  updatedAt: new Date().toISOString()
                }
              : project
          )
        }));
      },

      clearNotifications: (projectId: string) => {
        set(state => ({
          projects: state.projects.map(project =>
            project.id === projectId
              ? {
                  ...project,
                  notifications: [],
                  updatedAt: new Date().toISOString()
                }
              : project
          )
        }));
      },

      setSelectedProject: (projectId: string | null) => {
        set({ selectedProject: projectId });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Getters
      getProject: (projectId: string) => {
        return get().projects.find(p => p.id === projectId);
      },

      getProjectByRepoName: (repoName: string) => {
        return get().projects.find(p => p.repository.name === repoName);
      },

      getUnreadNotifications: (projectId: string) => {
        const project = get().getProject(projectId);
        return project?.notifications.filter(n => !n.read) || [];
      },

      getActiveAgentRuns: (projectId: string) => {
        const project = get().getProject(projectId);
        return project?.agentRuns.filter(run => 
          run.status === 'pending' || run.status === 'running'
        ) || [];
      },
    }),
    {
      name: 'codegen-project-store',
      version: 1,
    }
  )
);

