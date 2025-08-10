import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { PlayArrow as RunIcon } from '@mui/icons-material';

const AgentRunDialog = ({ open, onClose, project, onSubmit }) => {
  const [targetText, setTargetText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setTargetText('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!targetText.trim()) {
      setError('Please enter a target or goal for the agent run');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(targetText.trim());
    } catch (err) {
      setError('Failed to start agent run. Please try again.');
      console.error('Error starting agent run:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RunIcon color="primary" />
          <Box>
            <Typography variant="h6">Start Agent Run</Typography>
            <Typography variant="body2" color="text.secondary">
              {project.name} • {project.github_owner}/{project.github_repo}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <TextField
          fullWidth
          label="Target / Goal"
          multiline
          rows={4}
          value={targetText}
          onChange={(e) => setTargetText(e.target.value)}
          placeholder="Describe what you want the AI agent to accomplish..."
          disabled={loading}
          sx={{ mb: 3 }}
        />

        {loading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Starting agent run...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!targetText.trim() || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <RunIcon />}
        >
          {loading ? 'Starting...' : 'Start Agent Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgentRunDialog;

