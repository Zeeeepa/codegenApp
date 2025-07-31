import React, { useState, useEffect } from 'react';
import { X, Play, CheckCircle, XCircle, Clock, GitPullRequest, Terminal, Eye, Merge } from 'lucide-react';
import { ProjectCard } from '../../types';

interface ValidationFlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectCard;
  prNumber: number | null;
  onComplete: (success: boolean) => void;
}

interface ValidationStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  logs?: string;
  duration?: number;
}

export const ValidationFlowDialog: React.FC<ValidationFlowDialogProps> = ({
  isOpen,
  onClose,
  project,
  prNumber,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<ValidationStep[]>([
    { id: 'snapshot', name: 'Create Grainchain Snapshot', status: 'pending' },
    { id: 'clone', name: 'Clone PR Codebase', status: 'pending' },
    { id: 'deploy', name: 'Run Deployment Commands', status: 'pending' },
    { id: 'validate', name: 'Validate Deployment', status: 'pending' },
    { id: 'test', name: 'Run Web-Eval-Agent Tests', status: 'pending' }
  ]);
  const [showMergeOptions, setShowMergeOptions] = useState(false);

  useEffect(() => {
    if (isOpen && prNumber) {
      // Reset state when dialog opens
      setCurrentStep(0);
      setIsRunning(false);
      setShowMergeOptions(false);
      setSteps(prev => prev.map(step => ({ ...step, status: 'pending', logs: '', duration: 0 })));
    }
  }, [isOpen, prNumber]);

  const runValidationFlow = async () => {
    setIsRunning(true);
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      
      // Update step to running
      setSteps(prev => prev.map((step, index) => 
        index === i ? { ...step, status: 'running' } : step
      ));

      try {
        await simulateStep(steps[i].id, i);
        
        // Update step to completed
        setSteps(prev => prev.map((step, index) => 
          index === i ? { ...step, status: 'completed' } : step
        ));
      } catch (error) {
        // Update step to failed
        setSteps(prev => prev.map((step, index) => 
          index === i ? { 
            ...step, 
            status: 'failed',
            logs: `Error: ${error}`
          } : step
        ));
        
        // Send error context to agent for resolution
        await sendErrorToAgent(error as string, i);
        setIsRunning(false);
        return;
      }
    }
    
    setIsRunning(false);
    setShowMergeOptions(true);
  };

  const simulateStep = async (stepId: string, stepIndex: number): Promise<void> => {
    const stepDuration = 2000 + Math.random() * 3000; // 2-5 seconds
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / stepDuration, 1);
        
        // Update logs with progress
        setSteps(prev => prev.map((step, index) => 
          index === stepIndex ? {
            ...step,
            logs: generateStepLogs(stepId, progress),
            duration: elapsed
          } : step
        ));
        
        if (progress >= 1) {
          clearInterval(interval);
          
          // Simulate occasional failures for demonstration
          if (Math.random() < 0.1) { // 10% chance of failure
            reject(`Step ${stepId} failed due to simulated error`);
          } else {
            resolve();
          }
        }
      }, 100);
    });
  };

  const generateStepLogs = (stepId: string, progress: number): string => {
    const progressPercent = Math.round(progress * 100);
    
    switch (stepId) {
      case 'snapshot':
        return `Creating Grainchain snapshot...\nInstalling graph-sitter and web-eval-agent...\nSetting up environment variables...\nProgress: ${progressPercent}%`;
      case 'clone':
        return `Cloning PR #${prNumber} from ${project.repository.name}...\nFetching latest changes...\nProgress: ${progressPercent}%`;
      case 'deploy':
        return `Running deployment commands...\n${project.settings?.setupCommands || 'npm install && npm run build'}\nProgress: ${progressPercent}%`;
      case 'validate':
        return `Validating deployment with Gemini AI...\nChecking service health...\nProgress: ${progressPercent}%`;
      case 'test':
        return `Running web-eval-agent tests...\nTesting UI components and flows...\nProgress: ${progressPercent}%`;
      default:
        return `Processing... ${progressPercent}%`;
    }
  };

  const sendErrorToAgent = async (error: string, stepIndex: number) => {
    // In real implementation, this would send error context to Codegen API
    console.log(`Sending error to agent: ${error} at step ${stepIndex}`);
    
    // Mock agent response with fix
    setTimeout(() => {
      setSteps(prev => prev.map((step, index) => 
        index === stepIndex ? {
          ...step,
          status: 'completed',
          logs: step.logs + '\n\n✅ Agent provided fix and updated PR'
        } : step
      ));
    }, 3000);
  };

  const handleMergeToMain = async () => {
    try {
      // In real implementation, this would call GitHub API to merge PR
      console.log(`Merging PR #${prNumber} to main branch`);
      onComplete(true);
      onClose();
    } catch (error) {
      console.error('Failed to merge PR:', error);
    }
  };

  const handleOpenGitHub = () => {
    const url = `https://github.com/${project.repository.full_name}/pull/${prNumber}`;
    window.open(url, '_blank');
  };

  if (!isOpen || !prNumber) return null;

  const getStepIcon = (status: ValidationStep['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const allStepsCompleted = steps.every(step => step.status === 'completed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <GitPullRequest className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Validation Flow - PR #{prNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="space-y-4 mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${
                      step.status === 'completed' ? 'text-green-700' :
                      step.status === 'failed' ? 'text-red-700' :
                      step.status === 'running' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {step.name}
                    </h3>
                    {step.duration && (
                      <span className="text-sm text-gray-500">
                        {Math.round(step.duration / 1000)}s
                      </span>
                    )}
                  </div>
                  {step.logs && (
                    <div className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {step.logs}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isRunning && !allStepsCompleted && (
                <button
                  onClick={runValidationFlow}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Play className="w-4 h-4" />
                  Start Validation
                </button>
              )}
              
              {showMergeOptions && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMergeToMain}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Merge className="w-4 h-4" />
                    Merge to Main
                  </button>
                  <button
                    onClick={handleOpenGitHub}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <Eye className="w-4 h-4" />
                    Open GitHub
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          {/* Auto-merge Notice */}
          {project.settings?.autoMergeValidatedPR && allStepsCompleted && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Auto-merge is enabled. PR will be automatically merged to main branch.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
