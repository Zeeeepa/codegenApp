import React, { useState, useCallback } from 'react';
import { Play, Square, RefreshCw, AlertCircle, CheckCircle, Clock, Github } from 'lucide-react';
import { useWebEval } from '../hooks/useWebEval';

interface WebEvalPanelProps {
  className?: string;
}

export const WebEvalPanel: React.FC<WebEvalPanelProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'github-pr' | 'github-branch'>('url');
  const [formData, setFormData] = useState({
    url: 'http://localhost:3000',
    task: 'Test the main navigation and verify the page loads correctly',
    headless: true,
    gitRepo: 'Zeeeepa/codegenApp',
    pullRequest: '',
    branch: 'main'
  });

  const {
    evaluateUrl,
    testGitHubPR,
    testGitHubBranch,
    setupBrowser,
    cancelEvaluation,
    activeEvaluations,
    isLoading,
    error,
    lastResult
  } = useWebEval();

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleEvaluateUrl = useCallback(async () => {
    if (!formData.url || !formData.task) return;
    
    await evaluateUrl({
      url: formData.url,
      task: formData.task,
      headless: formData.headless
    });
  }, [formData, evaluateUrl]);

  const handleTestGitHubPR = useCallback(async () => {
    if (!formData.gitRepo || !formData.pullRequest || !formData.task) return;
    
    await testGitHubPR({
      git_repo: formData.gitRepo,
      pull_request: parseInt(formData.pullRequest),
      task: formData.task,
      headless: formData.headless
    });
  }, [formData, testGitHubPR]);

  const handleTestGitHubBranch = useCallback(async () => {
    if (!formData.gitRepo || !formData.branch || !formData.task) return;
    
    await testGitHubBranch({
      git_repo: formData.gitRepo,
      branch: formData.branch,
      task: formData.task,
      headless: formData.headless
    });
  }, [formData, testGitHubBranch]);

  const handleSetupBrowser = useCallback(async () => {
    await setupBrowser({ url: formData.url });
  }, [formData.url, setupBrowser]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <Square className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <RefreshCw className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Web Evaluation Agent</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'url'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          URL Testing
        </button>
        <button
          onClick={() => setActiveTab('github-pr')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'github-pr'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          GitHub PR
        </button>
        <button
          onClick={() => setActiveTab('github-branch')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'github-branch'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          GitHub Branch
        </button>
      </div>

      {/* URL Testing Tab */}
      {activeTab === 'url' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evaluation Task
            </label>
            <textarea
              value={formData.task}
              onChange={(e) => handleInputChange('task', e.target.value)}
              placeholder="Describe what you want to test (e.g., 'Test the checkout flow and verify form validation')"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="headless"
              checked={formData.headless}
              onChange={(e) => handleInputChange('headless', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="headless" className="text-sm text-gray-700">
              Run in headless mode (no browser window)
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleEvaluateUrl}
              disabled={isLoading || !formData.url || !formData.task}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {isLoading ? 'Evaluating...' : 'Start Evaluation'}
            </button>

            <button
              onClick={handleSetupBrowser}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              Setup Browser
            </button>
          </div>
        </div>
      )}

      {/* GitHub PR Tab */}
      {activeTab === 'github-pr' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repository (owner/repo)
              </label>
              <input
                type="text"
                value={formData.gitRepo}
                onChange={(e) => handleInputChange('gitRepo', e.target.value)}
                placeholder="Zeeeepa/codegenApp"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pull Request Number
              </label>
              <input
                type="number"
                value={formData.pullRequest}
                onChange={(e) => handleInputChange('pullRequest', e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Testing Task
            </label>
            <textarea
              value={formData.task}
              onChange={(e) => handleInputChange('task', e.target.value)}
              placeholder="Describe what to test in this PR (e.g., 'Test the new feature and verify it works correctly')"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="headless-pr"
              checked={formData.headless}
              onChange={(e) => handleInputChange('headless', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="headless-pr" className="text-sm text-gray-700">
              Run in headless mode
            </label>
          </div>

          <button
            onClick={handleTestGitHubPR}
            disabled={isLoading || !formData.gitRepo || !formData.pullRequest || !formData.task}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Github className="w-4 h-4" />
            {isLoading ? 'Testing PR...' : 'Test GitHub PR'}
          </button>
        </div>
      )}

      {/* GitHub Branch Tab */}
      {activeTab === 'github-branch' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repository (owner/repo)
              </label>
              <input
                type="text"
                value={formData.gitRepo}
                onChange={(e) => handleInputChange('gitRepo', e.target.value)}
                placeholder="Zeeeepa/codegenApp"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name
              </label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => handleInputChange('branch', e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Testing Task
            </label>
            <textarea
              value={formData.task}
              onChange={(e) => handleInputChange('task', e.target.value)}
              placeholder="Describe what to test on this branch (e.g., 'Test the overall application functionality')"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="headless-branch"
              checked={formData.headless}
              onChange={(e) => handleInputChange('headless', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="headless-branch" className="text-sm text-gray-700">
              Run in headless mode
            </label>
          </div>

          <button
            onClick={handleTestGitHubBranch}
            disabled={isLoading || !formData.gitRepo || !formData.branch || !formData.task}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Github className="w-4 h-4" />
            {isLoading ? 'Testing Branch...' : 'Test GitHub Branch'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-medium text-red-800">Evaluation Error</h3>
          </div>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Active Evaluations */}
      {activeEvaluations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Active Evaluations</h3>
          <div className="space-y-2">
            {activeEvaluations.map((evaluation) => (
              <div
                key={evaluation.sessionId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(evaluation.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {evaluation.url || `${evaluation.git_repo}${evaluation.pull_request ? `#${evaluation.pull_request}` : `@${evaluation.branch}`}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {evaluation.task.length > 50 
                        ? `${evaluation.task.substring(0, 50)}...` 
                        : evaluation.task}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatDuration(evaluation.duration)}
                  </span>
                  {evaluation.status === 'running' && (
                    <button
                      onClick={() => cancelEvaluation(evaluation.sessionId)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Cancel evaluation"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Result */}
      {lastResult && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Latest Result</h3>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-900">
                Evaluation completed in {formatDuration(lastResult.metadata?.duration || 0)}
              </span>
            </div>
            {lastResult.result && Array.isArray(lastResult.result) && (
              <div className="space-y-2">
                {lastResult.result.map((item, index) => (
                  <div key={index}>
                    {item.type === 'text' && (
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
                        {item.text}
                      </pre>
                    )}
                    {item.type === 'image' && (
                      <img
                        src={`data:${item.mimeType};base64,${item.data}`}
                        alt="Evaluation screenshot"
                        className="max-w-full h-auto rounded border"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

