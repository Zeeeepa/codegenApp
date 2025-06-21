import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, Plus, TestTube, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi, type DatabaseConfig } from '../utils/api';

interface DatabaseSettingsProps {
  apiBaseUrl?: string; // Made optional since we use centralized API client
}

const INITIAL_CONFIG: Omit<DatabaseConfig, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  host: 'localhost',
  port: 5432,
  database_name: '',
  username: 'postgres',
  password: '',
  is_active: false,
};

const DatabaseSettings: React.FC<DatabaseSettingsProps> = () => {
  const [configs, setConfigs] = useState<DatabaseConfig[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [newConfig, setNewConfig] = useState(INITIAL_CONFIG);

  const api = useApi();

  // Memoized validation
  const isConfigValid = useMemo(() => {
    return !!(newConfig.name?.trim() && 
             newConfig.host?.trim() && 
             newConfig.database_name?.trim() && 
             newConfig.username?.trim());
  }, [newConfig]);

  const loadConfigs = useCallback(async () => {
    const response = await api.getDatabaseConfigs();
    if (response.success && response.data) {
      setConfigs(response.data);
    } else {
      console.error('Failed to load database configs:', response.error);
      toast.error('Failed to load database configurations');
    }
  }, [api]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const testConnection = useCallback(async (config: DatabaseConfig, configId?: number) => {
    if (configId !== undefined) {
      setTestingConnection(configId);
    }
    
    try {
      const response = await api.testDatabaseConnection(config);
      
      if (response.success && response.data?.success) {
        toast.success('✅ Database connection successful!');
        return true;
      } else {
        toast.error(`❌ Connection failed: ${response.data?.message || response.error}`);
        return false;
      }
    } catch (error) {
      toast.error(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setTestingConnection(null);
    }
  }, [api]);

  const createDatabase = useCallback(async () => {
    if (!isConfigValid) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // First test the connection
      const connectionOk = await testConnection(newConfig);
      if (!connectionOk) {
        return;
      }

      // Save the configuration
      const response = await api.saveDatabaseConfig({
        ...newConfig,
        password_encrypted: newConfig.password, // TODO: Implement proper encryption
      });

      if (response.success) {
        toast.success('✅ Database configuration saved!');
        setShowCreateDialog(false);
        setNewConfig(INITIAL_CONFIG);
        await loadConfigs();
      } else {
        toast.error(`❌ Failed to save config: ${response.error}`);
      }
    } catch (error) {
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [isConfigValid, newConfig, testConnection, api, loadConfigs]);

  const handleConfigChange = useCallback((field: keyof typeof newConfig, value: string | number | boolean) => {
    setNewConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Database Settings</h2>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Database</span>
        </button>
      </div>

      {/* Database Configurations List */}
      <div className="space-y-4">
        {configs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No database configurations found</p>
            <p className="text-sm">Create your first database configuration to get started</p>
          </div>
        ) : (
          configs.map((config) => (
            <div key={config.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{config.name}</h3>
                <div className="flex items-center space-x-2">
                  {config.is_active && (
                    <span className="flex items-center space-x-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Active</span>
                    </span>
                  )}
                  <button
                    onClick={() => testConnection(config, config.id)}
                    disabled={testingConnection === config.id}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                  >
                    {testingConnection === config.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <TestTube className="w-3 h-3" />
                    )}
                    <span>{testingConnection === config.id ? 'Testing...' : 'Test'}</span>
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Host:</strong> {config.host}:{config.port}</p>
                <p><strong>Database:</strong> {config.database_name}</p>
                <p><strong>Username:</strong> {config.username}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Database Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Database Configuration</h3>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration Name *
                </label>
                <input
                  type="text"
                  value={newConfig.name}
                  onChange={(e) => handleConfigChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Database"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host *
                  </label>
                  <input
                    type="text"
                    value={newConfig.host}
                    onChange={(e) => handleConfigChange('host', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={newConfig.port}
                    onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 5432)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5432"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Name *
                </label>
                <input
                  type="text"
                  value={newConfig.database_name}
                  onChange={(e) => handleConfigChange('database_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="codegenapp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={newConfig.username}
                  onChange={(e) => handleConfigChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="postgres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newConfig.password || ''}
                  onChange={(e) => handleConfigChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newConfig.is_active}
                  onChange={(e) => handleConfigChange('is_active', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Set as active database
                </label>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createDatabase}
                disabled={loading || testingConnection !== null || !isConfigValid}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </span>
                ) : (
                  'Create & Test'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseSettings;
