import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Box,
  Chip,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Settings as SettingsIcon,
  GitHub as GitHubIcon,
  PullRequest as PRIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Build as BuildIcon
} from '@mui/icons-material';

const ProjectCard = ({ project, onAgentRun, onRemove, onUpdate }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [settingsTab, setSettingsTab] = useState(0);
  const [settings, setSettings] = useState({
    repository_rules: project.repository_rules || '',
    setup_commands: project.setup_commands || [],
    secrets: project.secrets || {},
    auto_merge_enabled: project.auto_merge_enabled || false,
    auto_confirm_plans: project.auto_confirm_plans || false,
    planning_statement: project.planning_statement || ''
  });
  const [newCommand, setNewCommand] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');

  // Get project status based on various indicators
  const getProjectStatus = () => {
    if (project.lastAgentRun?.status === 'running') return 'running';
    if (project.activePRs?.some(pr => pr.validation_status === 'running')) return 'validating';
    if (project.webhook_id) return 'active';
    return 'inactive';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'primary';
      case 'validating': return 'warning';
      case 'active': return 'success';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <RunIcon />;
      case 'validating': return <WarningIcon />;
      case 'active': return <CheckIcon />;
      case 'inactive': return <ErrorIcon />;
      default: return <ErrorIcon />;
    }
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
    handleMenuClose();
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
    setSettingsTab(0);
  };

  const handleSettingsSave = async () => {
    try {
      // Update project settings via API
      const updatedProject = await updateProjectSettings(project.id, settings);
      onUpdate(updatedProject);
      handleSettingsClose();
    } catch (error) {
      console.error('Failed to update project settings:', error);
    }
  };

  const handleAddCommand = () => {
    if (newCommand.trim()) {
      setSettings(prev => ({
        ...prev,
        setup_commands: [...prev.setup_commands, newCommand.trim()]
      }));
      setNewCommand('');
    }
  };

  const handleRemoveCommand = (index) => {
    setSettings(prev => ({
      ...prev,
      setup_commands: prev.setup_commands.filter((_, i) => i !== index)
    }));
  };

  const handleAddSecret = () => {
    if (newSecretKey.trim() && newSecretValue.trim()) {
      setSettings(prev => ({
        ...prev,
        secrets: {
          ...prev.secrets,
          [newSecretKey.trim()]: newSecretValue.trim()
        }
      }));
      setNewSecretKey('');
      setNewSecretValue('');
    }
  };

  const handleRemoveSecret = (key) => {
    setSettings(prev => {
      const newSecrets = { ...prev.secrets };
      delete newSecrets[key];
      return { ...prev, secrets: newSecrets };
    });
  };

  const formatLastActivity = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const status = getProjectStatus();
  const hasRulesConfigured = settings.repository_rules.trim().length > 0;

  return (
    <>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          border: hasRulesConfigured ? '2px solid' : '1px solid',
          borderColor: hasRulesConfigured ? 'primary.main' : 'divider',
          position: 'relative',
          '&:hover': {
            boxShadow: 4
          }
        }}
      >
        {/* Progress bar for running operations */}
        {status === 'running' && (
          <LinearProgress 
            sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} 
          />
        )}

        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant=\"h6\" component=\"h2\" noWrap>
                {project.name}
              </Typography>
              <Typography variant=\"body2\" color=\"text.secondary\" noWrap>
                {project.github_owner}/{project.github_repo}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={getStatusIcon(status)}
                label={status}
                color={getStatusColor(status)}
                size=\"small\"
              />
              <IconButton size=\"small\" onClick={handleMenuOpen}>
                <MoreIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Project Info */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GitHubIcon fontSize=\"small\" />
              <Typography variant=\"body2\" color=\"text.secondary\">
                Last activity: {formatLastActivity(project.updated_at)}
              </Typography>
            </Box>
            
            {project.webhook_id && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckIcon fontSize=\"small\" color=\"success\" />
                <Typography variant=\"body2\" color=\"success.main\">
                  Webhook configured
                </Typography>
              </Box>
            )}
          </Box>

          {/* Active PRs */}
          {project.activePRs && project.activePRs.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant=\"body2\" fontWeight=\"medium\" gutterBottom>
                Active PRs
              </Typography>
              {project.activePRs.slice(0, 3).map((pr) => (
                <Box key={pr.number} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Badge badgeContent={pr.number} color=\"primary\">
                    <PRIcon fontSize=\"small\" />
                  </Badge>
                  <Typography variant=\"body2\" noWrap sx={{ flexGrow: 1 }}>
                    {pr.title}
                  </Typography>
                  {pr.validation_status && (
                    <Chip 
                      label={pr.validation_status} 
                      size=\"small\" 
                      color={pr.validation_status === 'passed' ? 'success' : 'warning'}
                    />
                  )}
                </Box>
              ))}
              {project.activePRs.length > 3 && (
                <Typography variant=\"body2\" color=\"text.secondary\">
                  +{project.activePRs.length - 3} more
                </Typography>
              )}
            </Box>
          )}

          {/* Configuration Indicators */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {hasRulesConfigured && (
              <Tooltip title=\"Repository rules configured\">
                <Chip icon={<CodeIcon />} label=\"Rules\" size=\"small\" variant=\"outlined\" />
              </Tooltip>
            )}
            {settings.setup_commands.length > 0 && (
              <Tooltip title={`${settings.setup_commands.length} setup commands`}>
                <Chip icon={<BuildIcon />} label=\"Setup\" size=\"small\" variant=\"outlined\" />
              </Tooltip>
            )}
            {Object.keys(settings.secrets).length > 0 && (
              <Tooltip title={`${Object.keys(settings.secrets).length} secrets configured`}>
                <Chip icon={<SecurityIcon />} label=\"Secrets\" size=\"small\" variant=\"outlined\" />
              </Tooltip>
            )}
            {project.auto_merge_enabled && (
              <Tooltip title=\"Auto-merge enabled\">
                <Chip label=\"Auto-merge\" size=\"small\" color=\"success\" variant=\"outlined\" />
              </Tooltip>
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ pt: 0 }}>
          <Button
            variant=\"contained\"
            startIcon={<RunIcon />}
            onClick={onAgentRun}
            disabled={status === 'running'}
            fullWidth
          >
            {status === 'running' ? 'Running...' : 'Agent Run'}
          </Button>
        </CardActions>

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleSettingsOpen}>
            <SettingsIcon sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <MenuItem onClick={() => window.open(project.github_url, '_blank')}>
            <GitHubIcon sx={{ mr: 1 }} />
            Open in GitHub
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { onRemove(); handleMenuClose(); }} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Remove from Dashboard
          </MenuItem>
        </Menu>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={handleSettingsClose} maxWidth=\"md\" fullWidth>
        <DialogTitle>
          Project Settings - {project.name}
        </DialogTitle>
        <DialogContent>
          <Tabs value={settingsTab} onChange={(e, v) => setSettingsTab(v)} sx={{ mb: 3 }}>
            <Tab label=\"General\" />
            <Tab label=\"Repository Rules\" />
            <Tab label=\"Setup Commands\" />
            <Tab label=\"Secrets\" />
          </Tabs>

          {/* General Tab */}
          {settingsTab === 0 && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label=\"Planning Statement\"
                multiline
                rows={4}
                value={settings.planning_statement}
                onChange={(e) => setSettings(prev => ({ ...prev, planning_statement: e.target.value }))}
                helperText=\"Custom instructions sent to the agent with every run\"
                sx={{ mb: 3 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auto_confirm_plans}
                    onChange={(e) => setSettings(prev => ({ ...prev, auto_confirm_plans: e.target.checked }))}
                  />
                }
                label=\"Auto-confirm proposed plans\"
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auto_merge_enabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, auto_merge_enabled: e.target.checked }))}
                  />
                }
                label=\"Auto-merge validated PRs\"
              />
            </Box>
          )}

          {/* Repository Rules Tab */}
          {settingsTab === 1 && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label=\"Repository Rules\"
                multiline
                rows={8}
                value={settings.repository_rules}
                onChange={(e) => setSettings(prev => ({ ...prev, repository_rules: e.target.value }))}
                helperText=\"Specify any additional rules you want the agent to follow for this repository\"
                placeholder=\"Example:
- Always use TypeScript for new files
- Follow the existing code style
- Add comprehensive tests for new features
- Update documentation when adding new APIs\"
              />
            </Box>
          )}

          {/* Setup Commands Tab */}
          {settingsTab === 2 && (
            <Box sx={{ pt: 2 }}>
              <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mb: 2 }}>
                Specify the commands to run when setting up the sandbox environment
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  label=\"Add setup command\"
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCommand()}
                  placeholder=\"npm install\"
                />
                <Button variant=\"outlined\" onClick={handleAddCommand}>
                  Add
                </Button>
              </Box>
              
              <List>
                {settings.setup_commands.map((command, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={command}
                      secondary={`Step ${index + 1}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleRemoveCommand(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              {settings.setup_commands.length === 0 && (
                <Typography variant=\"body2\" color=\"text.secondary\" sx={{ textAlign: 'center', py: 4 }}>
                  No setup commands configured
                </Typography>
              )}
            </Box>
          )}

          {/* Secrets Tab */}
          {settingsTab === 3 && (
            <Box sx={{ pt: 2 }}>
              <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mb: 2 }}>
                Environment variables and secrets for the project
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label=\"Variable Name\"
                  value={newSecretKey}
                  onChange={(e) => setNewSecretKey(e.target.value)}
                  placeholder=\"API_KEY\"
                />
                <TextField
                  label=\"Value\"
                  type=\"password\"
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                  placeholder=\"secret-value\"
                />
                <Button variant=\"outlined\" onClick={handleAddSecret}>
                  Add
                </Button>
              </Box>
              
              <List>
                {Object.entries(settings.secrets).map(([key, value]) => (
                  <ListItem key={key} divider>
                    <ListItemText
                      primary={key}
                      secondary={`${'*'.repeat(Math.min(value.length, 20))}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleRemoveSecret(key)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              {Object.keys(settings.secrets).length === 0 && (
                <Typography variant=\"body2\" color=\"text.secondary\" sx={{ textAlign: 'center', py: 4 }}>
                  No secrets configured
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose}>Cancel</Button>
          <Button onClick={handleSettingsSave} variant=\"contained\">
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Helper function to update project settings (would be moved to API service)
const updateProjectSettings = async (projectId, settings) => {
  // This would call the actual API
  console.log('Updating project settings:', projectId, settings);
  return { id: projectId, ...settings };
};

export default ProjectCard;

