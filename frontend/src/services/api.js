/**
 * API service for CodegenApp frontend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = { 'Content-Type': 'application/json' };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          data.detail || data.message || `HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.message || 'Network error', 0, null);
    }
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  put(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient();

export const projectsApi = {
  async getRepositories() {
    return apiClient.get('/api/v1/projects/repositories');
  },

  async listProjects(pinnedOnly = false) {
    return apiClient.get('/api/v1/projects/', { pinned_only: pinnedOnly });
  },

  async getProject(projectId) {
    return apiClient.get(`/api/v1/projects/${projectId}`);
  },

  async createProject(projectData) {
    return apiClient.post('/api/v1/projects/', projectData);
  },

  async updateProject(projectId, updateData) {
    return apiClient.put(`/api/v1/projects/${projectId}`, updateData);
  },

  async deleteProject(projectId) {
    return apiClient.delete(`/api/v1/projects/${projectId}`);
  },

  async createAgentRun(projectId, runData) {
    return apiClient.post(`/api/v1/projects/${projectId}/agent-run`, runData);
  },

  async listAgentRuns(projectId, limit = 10) {
    return apiClient.get(`/api/v1/projects/${projectId}/runs`, { limit });
  },
};

export const agentRunsApi = {
  async getAgentRun(runId) {
    return apiClient.get(`/api/v1/runs/${runId}`);
  },

  async continueAgentRun(runId, additionalText) {
    return apiClient.post(`/api/v1/runs/${runId}/continue`, {
      additional_text: additionalText
    });
  },

  async confirmPlan(runId, modifications = null) {
    return apiClient.post(`/api/v1/runs/${runId}/confirm-plan`, {
      modifications: modifications
    });
  },

  async cancelAgentRun(runId) {
    return apiClient.post(`/api/v1/runs/${runId}/cancel`);
  },
};

export const systemApi = {
  async healthCheck() {
    return apiClient.get('/health');
  },

  async getStatus() {
    return apiClient.get('/api/v1/system/status');
  },
};

export { apiClient, ApiError };

export default {
  projects: projectsApi,
  agentRuns: agentRunsApi,
  system: systemApi,
  client: apiClient,
};

