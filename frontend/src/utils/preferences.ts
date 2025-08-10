// Web-compatible preferences utility that reads from .env file

export interface Preferences {
  apiToken: string;
  defaultOrganization?: string;
  userId?: string;
  apiBaseUrl?: string;
  githubToken?: string;
  planningStatement?: string;
  geminiApiKey?: string;
  cloudflareApiKey?: string;
  cloudflareAccountId?: string;
  cloudflareWorkerName?: string;
  cloudflareWorkerUrl?: string;
  enableAutoPR?: boolean;
  enableAutoTest?: boolean;
  enableAutoDeploy?: boolean;
}

/**
 * Get preference values directly from environment variables.
 * This is the single source of truth for credentials.
 */
export function getPreferenceValues(): Preferences {
  console.log('🔍 Loading preferences from .env...');

  const preferences: Preferences = {
    apiToken: process.env.REACT_APP_CODEGEN_API_TOKEN || '',
    defaultOrganization: process.env.REACT_APP_CODEGEN_ORG_ID || '',
    githubToken: process.env.REACT_APP_GITHUB_TOKEN || '',
    geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY || '',
    cloudflareApiKey: process.env.REACT_APP_CLOUDFLARE_API_KEY || '',
    cloudflareAccountId: process.env.REACT_APP_CLOUDFLARE_ACCOUNT_ID || '',
    cloudflareWorkerName: process.env.REACT_APP_CLOUDFLARE_WORKER_NAME || '',
    cloudflareWorkerUrl: process.env.REACT_APP_CLOUDFLARE_WORKER_URL || '',
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || '',
    userId: process.env.REACT_APP_USER_ID || '',
    planningStatement: '', // This can be loaded from another source if needed
  };

  console.log('✅ Loaded preferences from .env:', {
    hasToken: !!preferences.apiToken,
    hasOrgId: !!preferences.defaultOrganization,
    hasGithubToken: !!preferences.githubToken,
  });

  return preferences;
}

// The following functions are no longer needed for credential management,
// but are kept for compatibility in case other parts of the app use them.
// They should be reviewed and removed if they are no longer necessary.

export async function setPreferenceValues(preferences: Partial<Preferences>): Promise<void> {
  console.warn('setPreferenceValues is deprecated for credentials. Please use .env file.');
}

export async function getEnvFileContent(): Promise<string> {
  return "Credential management is now handled via the .env file.";
}

export async function clearPreferences(): Promise<void> {
  console.warn('clearPreferences is deprecated.');
}

export function validateEnvironmentConfiguration(): { isValid: boolean; missingVars: string[]; warnings: string[] } {
  const missingVars: string[] = [];
  if (!process.env.REACT_APP_CODEGEN_API_TOKEN) {
    missingVars.push('REACT_APP_CODEGEN_API_TOKEN');
  }
  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings: []
  };
}