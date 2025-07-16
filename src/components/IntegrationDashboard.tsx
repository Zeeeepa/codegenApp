import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Activity, 
  Zap, 
  Package, 
  Play, 
  Pause, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Code,
  TestTube,
  Rocket
} from 'lucide-react';
import { getAPIClient } from '../api/client';
import toast from 'react-hot-toast';

interface SystemStatus {
  integration_manager: {
    initialized: boolean;
    started: boolean;
  };
  config_manager: {
    available: boolean;
    config_file: string | null;
  };
  event_bus: {
    available: boolean;
    running: boolean;
    metrics: {
      events_published: number;
      events_processed: number;
      events_failed: number;
      active_subscriptions: number;
      queue_size: number;
    };
  };
  plugin_manager: {
    available: boolean;
    plugins: Record<string, any>;
  };
  service_coordinator: {
    available: boolean;
    services: string[];
  };
}

interface WorkflowTemplate {
  name: string;
  description: string;
  category: string;
  tags: string[];
  parameters: any[];
  estimated_duration: string;
  complexity: string;
  components_used: string[];
  outputs: string[];
}

export function IntegrationDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const apiClient = getAPIClient();

  useEffect(() => {
    loadSystemStatus();
    loadWorkflowTemplates();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/v1/integration/status', {
        headers: {
          'Authorization': `Bearer ${await apiClient.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
      }
    } catch (error) {
      console.error('Failed to load system status:', error);
      toast.error('Failed to load system status');
    }
  };

  const loadWorkflowTemplates = async () => {
    try {
      const response = await fetch('/api/v1/integration/workflow-templates', {
        headers: {
          'Authorization': `Bearer ${await apiClient.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkflowTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load workflow templates:', error);
      toast.error('Failed to load workflow templates');
    } finally {
      setLoading(false);
    }
  };

  const reloadConfiguration = async () => {
    try {
      const response = await fetch('/api/v1/integration/config/reload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await apiClient.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        toast.success('Configuration reloaded successfully');
        loadSystemStatus();
      } else {
        toast.error('Failed to reload configuration');
      }
    } catch (error) {
      console.error('Failed to reload configuration:', error);
      toast.error('Failed to reload configuration');
    }
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-400' : 'text-red-400';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'code_analysis':
        return <Code className="h-5 w-5" />;
      case 'testing':
        return <TestTube className="h-5 w-5" />;
      case 'deployment':
        return <Rocket className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Integration Dashboard</h2>
          <p className="text-gray-400">Monitor and manage the library kit integration framework</p>
        </div>
        <button
          onClick={reloadConfiguration}
          className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload Config
        </button>
      </div>

      {/* System Status Grid */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Integration Manager Status */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Integration Manager</h3>
              <Settings className="h-5 w-5 text-blue-400" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Initialized</span>
                <div className={`flex items-center ${getStatusColor(systemStatus.integration_manager.initialized)}`}>
                  {getStatusIcon(systemStatus.integration_manager.initialized)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Started</span>
                <div className={`flex items-center ${getStatusColor(systemStatus.integration_manager.started)}`}>
                  {getStatusIcon(systemStatus.integration_manager.started)}
                </div>
              </div>
            </div>
          </div>

          {/* Event Bus Status */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Event Bus</h3>
              <Activity className="h-5 w-5 text-green-400" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Running</span>
                <div className={`flex items-center ${getStatusColor(systemStatus.event_bus.running)}`}>
                  {getStatusIcon(systemStatus.event_bus.running)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Events Processed</span>
                <span className="text-white">{systemStatus.event_bus.metrics.events_processed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Queue Size</span>
                <span className="text-white">{systemStatus.event_bus.metrics.queue_size}</span>
              </div>
            </div>
          </div>

          {/* Plugin Manager Status */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Plugin Manager</h3>
              <Package className="h-5 w-5 text-purple-400" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Available</span>
                <div className={`flex items-center ${getStatusColor(systemStatus.plugin_manager.available)}`}>
                  {getStatusIcon(systemStatus.plugin_manager.available)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Plugins</span>
                <span className="text-white">{Object.keys(systemStatus.plugin_manager.plugins).length}</span>
              </div>
            </div>
          </div>

          {/* Service Coordinator Status */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Service Coordinator</h3>
              <Zap className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Available</span>
                <div className={`flex items-center ${getStatusColor(systemStatus.service_coordinator.available)}`}>
                  {getStatusIcon(systemStatus.service_coordinator.available)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Services</span>
                <span className="text-white">{systemStatus.service_coordinator.services.length}</span>
              </div>
            </div>
          </div>

          {/* Configuration Manager Status */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Configuration</h3>
              <Settings className="h-5 w-5 text-blue-400" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Available</span>
                <div className={`flex items-center ${getStatusColor(systemStatus.config_manager.available)}`}>
                  {getStatusIcon(systemStatus.config_manager.available)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Config File</span>
                <span className="text-white text-xs">
                  {systemStatus.config_manager.config_file || 'Default'}
                </span>
              </div>
            </div>
          </div>

          {/* Event Metrics */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Event Metrics</h3>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Published</span>
                <span className="text-white">{systemStatus.event_bus.metrics.events_published}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Failed</span>
                <span className="text-red-400">{systemStatus.event_bus.metrics.events_failed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Subscriptions</span>
                <span className="text-white">{systemStatus.event_bus.metrics.active_subscriptions}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Templates */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Workflow Templates</h3>
          <p className="text-gray-400">Pre-built workflow templates for common automation tasks</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflowTemplates.map((template, index) => (
              <div
                key={index}
                className="bg-gray-700 rounded-lg border border-gray-600 p-4 hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedTemplate(template);
                  setShowTemplateDialog(true);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(template.category)}
                    <h4 className="font-medium text-white">{template.name}</h4>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getComplexityColor(template.complexity)} bg-gray-600`}>
                    {template.complexity}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{template.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{template.estimated_duration}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 2).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 bg-blue-900/20 text-blue-400 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 2 && (
                      <span className="text-gray-500">+{template.tags.length - 2}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Template Details Dialog */}
      {showTemplateDialog && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                {getCategoryIcon(selectedTemplate.category)}
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedTemplate.name}</h2>
                  <p className="text-gray-400">{selectedTemplate.category}</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <AlertCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Description</h3>
                    <p className="text-gray-300">{selectedTemplate.description}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white">{selectedTemplate.estimated_duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Complexity:</span>
                        <span className={getComplexityColor(selectedTemplate.complexity)}>
                          {selectedTemplate.complexity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Components Used</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.components_used.map((component, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-900/20 text-purple-400 rounded-full text-sm"
                        >
                          {component}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-900/20 text-blue-400 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Parameters</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedTemplate.parameters.map((param, index) => (
                        <div key={index} className="bg-gray-800 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">{param.name}</span>
                            <span className="text-xs text-gray-400">{param.type}</span>
                          </div>
                          <p className="text-gray-400 text-sm">{param.description}</p>
                          {param.required && (
                            <span className="text-red-400 text-xs">Required</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Outputs</h3>
                    <div className="space-y-1">
                      {selectedTemplate.outputs.map((output, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-gray-300 text-sm">{output}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // TODO: Implement workflow creation from template
                  toast.info('Workflow creation from templates coming soon!');
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <Play className="h-4 w-4 mr-2 inline" />
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

