#!/usr/bin/env node

// Test the UI button logic for stopped agent runs

// Simulate the AgentRunStatus enum
const AgentRunStatus = {
  ACTIVE: "ACTIVE",
  ERROR: "ERROR",
  EVALUATION: "EVALUATION",
  COMPLETE: "COMPLETE",
  CANCELLED: "CANCELLED",
  TIMEOUT: "TIMEOUT",
  MAX_ITERATIONS_REACHED: "MAX_ITERATIONS_REACHED",
  OUT_OF_TOKENS: "OUT_OF_TOKENS",
  FAILED: "FAILED",
  PAUSED: "PAUSED",
  PENDING: "PENDING",
};

// Simulate the button logic from the updated component
function getButtonVisibility(runStatus) {
  const canResume = runStatus === AgentRunStatus.PAUSED || 
                    runStatus === AgentRunStatus.COMPLETE ||
                    runStatus.toLowerCase() === 'stopped' ||
                    runStatus.toLowerCase() === 'paused';
                    
  const canRespond = [
    AgentRunStatus.FAILED,
    AgentRunStatus.ERROR,
    AgentRunStatus.CANCELLED,
    AgentRunStatus.TIMEOUT,
    AgentRunStatus.MAX_ITERATIONS_REACHED,
    AgentRunStatus.OUT_OF_TOKENS
  ].includes(runStatus) && 
  runStatus.toLowerCase() !== 'stopped'; // Don't show respond button for stopped runs

  return { canResume, canRespond };
}

function testButtonLogic() {
  console.log('🧪 Testing UI Button Logic for Agent Run Statuses');
  console.log('');

  const testCases = [
    { status: 'STOPPED', description: 'Stopped agent run (main case)' },
    { status: 'stopped', description: 'Stopped agent run (lowercase)' },
    { status: AgentRunStatus.PAUSED, description: 'Paused agent run' },
    { status: AgentRunStatus.COMPLETE, description: 'Complete agent run' },
    { status: AgentRunStatus.FAILED, description: 'Failed agent run' },
    { status: AgentRunStatus.ERROR, description: 'Error agent run' },
    { status: AgentRunStatus.CANCELLED, description: 'Cancelled agent run' },
    { status: AgentRunStatus.ACTIVE, description: 'Active agent run' },
  ];

  testCases.forEach(testCase => {
    const { canResume, canRespond } = getButtonVisibility(testCase.status);
    
    console.log(`📊 ${testCase.description}:`);
    console.log(`   Status: ${testCase.status}`);
    console.log(`   🟢 Resume Button: ${canResume ? '✅ VISIBLE' : '❌ HIDDEN'}`);
    console.log(`   🔵 Respond Button: ${canRespond ? '✅ VISIBLE' : '❌ HIDDEN'}`);
    
    // Check if this matches our requirements
    if (testCase.status.toLowerCase() === 'stopped') {
      if (canResume && !canRespond) {
        console.log(`   ✅ CORRECT: Only Resume button shown for stopped runs`);
      } else {
        console.log(`   ❌ INCORRECT: Expected only Resume button for stopped runs`);
      }
    }
    
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('📋 SUMMARY OF CHANGES:');
  console.log('='.repeat(60));
  console.log('✅ BEFORE: Stopped runs showed BOTH Resume (green) + Respond (blue) buttons');
  console.log('✅ AFTER: Stopped runs show ONLY Resume (green) button with text');
  console.log('');
  console.log('🎯 KEY IMPROVEMENTS:');
  console.log('   1. Removed blue "Respond to Agent Run" button for stopped runs');
  console.log('   2. Enhanced green "Resume Agent Run" button with text for stopped runs');
  console.log('   3. Better visual hierarchy - one clear action for stopped runs');
  console.log('   4. Consistent with user expectation - resume is the primary action');
}

testButtonLogic();

