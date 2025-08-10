import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { getPreferenceValues, setPreferenceValues } from '../../utils/preferences';
import { getGitHubClient } from '../../api/github';
import toast from 'react-hot-toast';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'settings' | 'github' | 'planning' | 'ai' | 'cloudflare' | 'automation' | 'env';

const TABS: { id: Tab; label: string }[] = [
  { id: 'settings', label: 'API Settings' },
  { id: 'github', label: 'GitHub' },
  { id: 'planning', label: 'Planning Statement' },
  { id: 'ai', label: 'AI Services' },
  { id: 'cloudflare', label: 'Cloudflare' },
  { id: 'automation', label: 'Automation' },
  { id: 'env', label: 'Environment' },
];

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [orgId, setOrgId] = useState('');
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  
  const [githubToken, setGithubToken] = useState('');
  
  const [planningStatement, setPlanningStatement] = useState('');
  
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [cloudflareApiKey, setCloudflareApiKey] = useState('');
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
  const [cloudflareWorkerName, setCloudflareWorkerName] = useState('');
  const [cloudflareWorkerUrl, setCloudflareWorkerUrl] = useState('');
  
  const [enableAutoPR, setEnableAutoPR] = useState(false);
  const [enableAutoTest, setEnableAutoTest] = useState(false);
  const [enableAutoDeploy, setEnableAutoDeploy] = useState(false);

  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'pending'>>({});

  const handleSave = async () => {
    try {
      await setPreferenceValues({ 
        planningStatement,
        enableAutoPR,
        enableAutoTest,
        enableAutoDeploy,
      });
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const runValidations = async (prefs: any) => {
    if (prefs.githubToken) {
      setValidationStatus(s => ({ ...s, github: 'pending' }));
      try {
        const client = getGitHubClient(prefs.githubToken);
        const validation = await client.validateToken();
        setValidationStatus(s => ({ ...s, github: validation.valid ? 'valid' : 'invalid' }));
      } catch {
        setValidationStatus(s => ({ ...s, github: 'invalid' }));
      }
    }
    if (prefs.geminiApiKey) {
      setValidationStatus(s => ({ ...s, gemini: 'pending' }));
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${prefs.geminiApiKey}`);
        setValidationStatus(s => ({ ...s, gemini: res.ok ? 'valid' : 'invalid' }));
      } catch {
        setValidationStatus(s => ({ ...s, gemini: 'invalid' }));
      }
    }
    if (prefs.cloudflareApiKey && prefs.cloudflareAccountId) {
      setValidationStatus(s => ({ ...s, cloudflare: 'pending' }));
      try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${prefs.cloudflareAccountId}`, {
          headers: { 'Authorization': `Bearer ${prefs.cloudflareApiKey}` }
        });
        setValidationStatus(s => ({ ...s, cloudflare: res.ok ? 'valid' : 'invalid' }));
      } catch {
        setValidationStatus(s => ({ ...s, cloudflare: 'invalid' }));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Directly set from environment variables, removing fallbacks for core credentials
      setOrgId(process.env.REACT_APP_CODEGEN_ORG_ID || '');
      setToken(process.env.REACT_APP_CODEGEN_API_TOKEN || '');
      setGithubToken(process.env.REACT_APP_GITHUB_TOKEN || '');
      setGeminiApiKey(process.env.REACT_APP_GEMINI_API_KEY || '');
      setCloudflareApiKey(process.env.REACT_APP_CLOUDFLARE_API_KEY || '');
      setCloudflareAccountId(process.env.REACT_APP_CLOUDFLARE_ACCOUNT_ID || '');
      setCloudflareWorkerName(process.env.REACT_APP_CLOUDFLARE_WORKER_NAME || '');
      setCloudflareWorkerUrl(process.env.REACT_APP_CLOUDFLARE_WORKER_URL || '');

      // Preferences for non-credential values can still use the preferences utility
      const preferences = getPreferenceValues();
      setPlanningStatement(preferences.planningStatement || '');
      setEnableAutoPR(preferences.enableAutoPR || false);
      setEnableAutoTest(preferences.enableAutoTest || false);
      setEnableAutoDeploy(preferences.enableAutoDeploy || false);

      runValidations({
        githubToken: process.env.REACT_APP_GITHUB_TOKEN,
        geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY,
        cloudflareApiKey: process.env.REACT_APP_CLOUDFLARE_API_KEY,
        cloudflareAccountId: process.env.REACT_APP_CLOUDFLARE_ACCOUNT_ID,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ValidationIndicator = ({ status }: { status: 'valid' | 'invalid' | 'pending' | undefined }) => {
    if (status === 'valid') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'invalid') return <XCircle className="w-5 h-5 text-red-500" />;
    if (status === 'pending') return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    return null;
  };

  const EnvVarDisplay = ({ name, value }: { name: string, value: string | undefined }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{name}</label>
      <div className="flex items-center space-x-2">
        <input type="text" value={value || ''} readOnly className="flex-grow px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
        {value ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>

        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="org_id" className="block text-sm font-medium text-gray-300 mb-1">Organization ID</label>
                <input type="text" id="org_id" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
              </div>
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-1">API Token</label>
                <input type="text" id="token" value={token} onChange={(e) => setToken(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="github_token" className="block text-sm font-medium text-gray-300 mb-1">GitHub Personal Access Token</label>
                <div className="flex items-center space-x-2">
                  <input type="text" id="github_token" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className="flex-grow px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
                  <ValidationIndicator status={validationStatus.github} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="planning_statement" className="block text-sm font-medium text-gray-300 mb-1">Global Planning Statement</label>
                <textarea id="planning_statement" value={planningStatement} onChange={(e) => setPlanningStatement(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" rows={10}></textarea>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="gemini_api_key" className="block text-sm font-medium text-gray-300 mb-1">Gemini API Key</label>
                <div className="flex items-center space-x-2">
                  <input id="gemini_api_key" type="text" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} className="flex-grow px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
                  <ValidationIndicator status={validationStatus.gemini} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloudflare' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="cloudflare_api_key" className="block text-sm font-medium text-gray-300 mb-1">Cloudflare API Key</label>
                <div className="flex items-center space-x-2">
                  <input id="cloudflare_api_key" type="text" value={cloudflareApiKey} onChange={(e) => setCloudflareApiKey(e.target.value)} className="flex-grow px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
                  <ValidationIndicator status={validationStatus.cloudflare} />
                </div>
              </div>
              <div>
                <label htmlFor="cloudflare_account_id" className="block text-sm font-medium text-gray-300 mb-1">Account ID</label>
                <input id="cloudflare_account_id" type="text" value={cloudflareAccountId} onChange={(e) => setCloudflareAccountId(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
              </div>
              <div>
                <label htmlFor="cloudflare_worker_name" className="block text-sm font-medium text-gray-300 mb-1">Worker Name</label>
                <input id="cloudflare_worker_name" type="text" value={cloudflareWorkerName} onChange={(e) => setCloudflareWorkerName(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
              </div>
              <div>
                <label htmlFor="cloudflare_worker_url" className="block text-sm font-medium text-gray-300 mb-1">Worker URL</label>
                <input id="cloudflare_worker_url" type="url" value={cloudflareWorkerUrl} onChange={(e) => setCloudflareWorkerUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white" />
              </div>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Automation Settings</h3>
              <div className="flex items-center">
                <input type="checkbox" id="auto-pr" checked={enableAutoPR} onChange={(e) => setEnableAutoPR(e.target.checked)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded" />
                <label htmlFor="auto-pr" className="ml-2 block text-sm text-gray-300">Enable Auto PR Creation</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="auto-test" checked={enableAutoTest} onChange={(e) => setEnableAutoTest(e.target.checked)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded" />
                <label htmlFor="auto-test" className="ml-2 block text-sm text-gray-300">Enable Auto Testing</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="auto-deploy" checked={enableAutoDeploy} onChange={(e) => setEnableAutoDeploy(e.target.checked)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded" />
                <label htmlFor="auto-deploy" className="ml-2 block text-sm text-gray-300">Enable Auto Deployment</label>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Environment Variables</h3>
              <EnvVarDisplay name="CODEGEN_ORG_ID" value={process.env.REACT_APP_CODEGEN_ORG_ID} />
              <EnvVarDisplay name="CODEGEN_API_TOKEN" value={process.env.REACT_APP_CODEGEN_API_TOKEN} />
              <EnvVarDisplay name="GITHUB_TOKEN" value={process.env.REACT_APP_GITHUB_TOKEN} />
              <EnvVarDisplay name="GEMINI_API_KEY" value={process.env.REACT_APP_GEMINI_API_KEY} />
              <EnvVarDisplay name="CLOUDFLARE_API_KEY" value={process.env.REACT_APP_CLOUDFLARE_API_KEY} />
              <EnvVarDisplay name="CLOUDFLARE_ACCOUNT_ID" value={process.env.REACT_APP_CLOUDFLARE_ACCOUNT_ID} />
              <EnvVarDisplay name="CLOUDFLARE_WORKER_NAME" value={process.env.REACT_APP_CLOUDFLARE_WORKER_NAME} />
              <EnvVarDisplay name="CLOUDFLARE_WORKER_URL" value={process.env.REACT_APP_CLOUDFLARE_WORKER_URL} />
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Save Settings
            </button>
        </div>
      </div>
    </div>
  );
}
