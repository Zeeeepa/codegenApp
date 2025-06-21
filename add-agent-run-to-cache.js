// Simple script to add the existing agent run to the cache
// This will make it show up in the UI

const agentRun = {
  id: 41893,
  organization_id: 323,
  status: "COMPLETE",
  created_at: "2025-06-21 11:13:47.625380",
  web_url: "https://codegen.sh/agent/trace/41893",
  result: "The answer to 2+2 is **4**.\n\nThis is a simple arithmetic calculation! 🧮",
  source_type: "API",
  github_pull_requests: []
};

// Store in localStorage (this is what the cache uses)
const cacheKey = `agent-runs-cache-org-323`;
const now = new Date();
const entry = {
  data: agentRun,
  timestamp: now.toISOString(),
  expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  version: "1.0.0",
  organizationId: 323,
  isPolling: false
};

// This would be executed in the browser console
console.log("To add the agent run to cache, run this in the browser console:");
console.log(`localStorage.setItem('${cacheKey}', JSON.stringify([${JSON.stringify(entry)}]));`);
console.log("Then refresh the page.");
