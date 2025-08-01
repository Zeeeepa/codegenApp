import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Lock as PrivateIcon,
  Public as PublicIcon
} from '@mui/icons-material';

import { projectsApi } from '../services/api';

const ProjectSelector = ({ open, onClose, onProjectAdded }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectSettings, setProjectSettings] = useState({
    repository_rules: '',
    planning_statement: '',
    auto_merge_enabled: false,
    auto_confirm_plans: false
  });

  const steps = ['Select Repository', 'Configure Project', 'Review & Create'];

  useEffect(() => {
    if (open) {
      loadRepositories();
      resetForm();
    }
  }, [open]);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsApi.getRepositories();
      setRepositories(response.repositories || []);
    } catch (err) {
      setError('Failed to load repositories. Please check your GitHub token.');
      console.error('Error loading repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActiveStep(0);
    setSelectedRepo(null);
    setProjectName('');
    setProjectSettings({
      repository_rules: '',
      planning_statement: '',
      auto_merge_enabled: false,
      auto_confirm_plans: false
    });
    setError(null);
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
    setProjectName(repo.name);
  };

  const handleCreateProject = async () => {
    try {
      setLoading(true);
      const projectData = {
        name: projectName,
        github_url: selectedRepo.html_url,
        ...projectSettings
      };

      const newProject = await projectsApi.createProject(projectData);
      onProjectAdded(newProject);
      onClose();
    } catch (err) {
      setError('Failed to create project. Please try again.');
      console.error('Error creating project:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ pt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Autocomplete
                  options={repositories}
                  getOptionLabel={(option) => `${option.full_name} - ${option.description || 'No description'}`}
                  value={selectedRepo}
                  onChange={(event, newValue) => handleRepoSelect(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Search repositories" fullWidth />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Box sx={{ mr: 2 }}>
                          {option.private ? <PrivateIcon color="warning" /> : <PublicIcon color="success" />}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight="medium">{option.full_name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.description || 'No description'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  sx={{ mb: 3 }}
                />
                {selectedRepo && (
                  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom>Selected Repository</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <GitHubIcon sx={{ mr: 1 }} />
                      <Typography variant="body1" fontWeight="medium">{selectedRepo.full_name}</Typography>
                      {selectedRepo.private && <Chip label="Private" size="small" color="warning" sx={{ ml: 1 }} />}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedRepo.description || 'No description available'}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        );
      case 1:
        return (
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Planning Statement"
              multiline
              rows={3}
              value={projectSettings.planning_statement}
              onChange={(e) => setProjectSettings(prev => ({ ...prev, planning_statement: e.target.value }))}
              sx={{ mb: 3 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={projectSettings.auto_confirm_plans}
                  onChange={(e) => setProjectSettings(prev => ({ ...prev, auto_confirm_plans: e.target.checked }))}
                />
              }
              label="Auto-confirm proposed plans"
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={projectSettings.auto_merge_enabled}
                  onChange={(e) => setProjectSettings(prev => ({ ...prev, auto_merge_enabled: e.target.checked }))}
                />
              }
              label="Auto-merge validated PRs"
            />
          </Box>
        );
      case 2:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review your project configuration before creating
            </Typography>
            <Typography variant="body1"><strong>Repository:</strong> {selectedRepo?.full_name}</Typography>
            <Typography variant="body1"><strong>Project Name:</strong> {projectName}</Typography>
            {projectSettings.planning_statement && (
              <Typography variant="body1"><strong>Planning Statement:</strong> {projectSettings.planning_statement}</Typography>
            )}
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  const isStepValid = (step) => {
    switch (step) {
      case 0: return selectedRepo !== null;
      case 1: return projectName.trim().length > 0;
      case 2: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add GitHub Project to Dashboard</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {getStepContent(index)}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleCreateProject : handleNext}
                    disabled={!isStepValid(index) || loading}
                    sx={{ mr: 1 }}
                  >
                    {loading ? <CircularProgress size={20} /> : (index === steps.length - 1 ? 'Create Project' : 'Continue')}
                  </Button>
                  <Button disabled={index === 0 || loading} onClick={handleBack}>Back</Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectSelector;

