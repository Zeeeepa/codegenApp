import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Snackbar,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import ProjectSelector from './ProjectSelector';
import ProjectCard from './ProjectCard';
import AgentRunDialog from './AgentRunDialog';
import { useWebSocket } from '../hooks/useWebSocket';
import { projectsApi } from '../services/api';

const Dashboard = () => {
  // State management
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAgentRun, setShowAgentRun] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // WebSocket connection for real-time updates
  const { connected, lastMessage } = useWebSocket('/ws');

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsApi.listProjects(true); // pinned only
      setProjects(response);
      setError(null);
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWebSocketMessage = (message) => {
    const data = JSON.parse(message.data);
    
    switch (data.type) {
      case 'notification':
        addNotification(data);
        showSnackbar(data.message, data.severity || 'info');
        break;
      
      case 'project_update':
        updateProject(data.project);
        break;
      
      case 'agent_run_update':
        updateAgentRun(data);
        break;
      
      case 'pr_notification':
        handlePRNotification(data);
        break;
      
      default:
        console.log('Unknown WebSocket message:', data);
    }
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      ...notification,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
  };

  const updateProject = (updatedProject) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === updatedProject.id ? { ...project, ...updatedProject } : project
      )
    );
  };

  const updateAgentRun = (runData) => {
    // Update project card with agent run status
    setProjects(prev =>
      prev.map(project => {
        if (project.id === runData.project_id) {
          return {
            ...project,
            lastAgentRun: runData,
            lastActivity: new Date().toISOString()
          };
        }
        return project;
      })
    );
  };

  const handlePRNotification = (prData) => {
    // Update project card with PR information
    setProjects(prev =>
      prev.map(project => {
        if (project.id === prData.project_id) {
          return {
            ...project,
            activePRs: [...(project.activePRs || []), prData],
            lastActivity: new Date().toISOString()
          };
        }
        return project;
      })
    );
    
    showSnackbar(`New PR #${prData.pr_number} in ${prData.project_name}`, 'info');
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleProjectAdded = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
    setShowAddProject(false);
    showSnackbar(`Project "${newProject.name}" added successfully`, 'success');
  };

  const handleProjectRemoved = (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    showSnackbar('Project removed successfully', 'success');
  };

  const handleAgentRunStart = (project) => {
    setSelectedProject(project);
    setShowAgentRun(true);
  };

  const handleAgentRunSubmit = async (targetText) => {
    try {
      await projectsApi.createAgentRun(selectedProject.id, { target_text: targetText });
      setShowAgentRun(false);
      showSnackbar('Agent run started successfully', 'success');
    } catch (err) {
      showSnackbar('Failed to start agent run', 'error');
      console.error('Error starting agent run:', err);
    }
  };

  const handleRefresh = () => {
    loadProjects();
    showSnackbar('Projects refreshed', 'info');
  };

  if (loading) {
    return (
      <Box display=\"flex\" justifyContent=\"center\" alignItems=\"center\" minHeight=\"100vh\">
        <Typography variant=\"h6\">Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position=\"static\" elevation={1}>
        <Toolbar>
          <Typography variant=\"h6\" component=\"div\" sx={{ flexGrow: 1 }}>
            🚀 CodegenApp Dashboard
          </Typography>
          
          <IconButton color=\"inherit\" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
          
          <IconButton color=\"inherit\">
            <Badge badgeContent={notifications.length} color=\"error\">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <IconButton color=\"inherit\">
            <SettingsIcon />
          </IconButton>
          
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
            <Typography variant=\"body2\" sx={{ mr: 1 }}>
              {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth=\"xl\" sx={{ mt: 4, mb: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant=\"h4\" component=\"h1\" gutterBottom>
            GitHub Projects Dashboard
          </Typography>
          <Typography variant=\"body1\" color=\"text.secondary\">
            Manage your GitHub projects with AI-powered automation
          </Typography>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity=\"error\" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Box 
            sx={{ 
              textAlign: 'center', 
              py: 8,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant=\"h6\" gutterBottom>
              No projects pinned to dashboard
            </Typography>
            <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mb: 3 }}>
              Add your first GitHub project to get started with AI-powered development
            </Typography>
            <Button
              variant=\"contained\"
              startIcon={<AddIcon />}
              onClick={() => setShowAddProject(true)}
              size=\"large\"
            >
              Add Project
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
                <ProjectCard
                  project={project}
                  onAgentRun={() => handleAgentRunStart(project)}
                  onRemove={() => handleProjectRemoved(project.id)}
                  onUpdate={updateProject}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Statistics Section */}
        {projects.length > 0 && (
          <Box sx={{ mt: 6 }}>
            <Typography variant=\"h6\" gutterBottom>
              Dashboard Statistics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>
                  <Typography variant=\"h4\">{projects.length}</Typography>
                  <Typography variant=\"body2\">Active Projects</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 1 }}>
                  <Typography variant=\"h4\">
                    {projects.reduce((sum, p) => sum + (p.activePRs?.length || 0), 0)}
                  </Typography>
                  <Typography variant=\"body2\">Active PRs</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'warning.contrastText', borderRadius: 1 }}>
                  <Typography variant=\"h4\">
                    {projects.filter(p => p.auto_merge_enabled).length}
                  </Typography>
                  <Typography variant=\"body2\">Auto-merge Enabled</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 1 }}>
                  <Typography variant=\"h4\">{notifications.length}</Typography>
                  <Typography variant=\"body2\">Recent Notifications</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>

      {/* Floating Action Button */}
      <Fab
        color=\"primary\"
        aria-label=\"add project\"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setShowAddProject(true)}
      >
        <AddIcon />
      </Fab>

      {/* Dialogs */}
      <ProjectSelector
        open={showAddProject}
        onClose={() => setShowAddProject(false)}
        onProjectAdded={handleProjectAdded}
      />

      <AgentRunDialog
        open={showAgentRun}
        onClose={() => setShowAgentRun(false)}
        project={selectedProject}
        onSubmit={handleAgentRunSubmit}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;

