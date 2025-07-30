# Third-Party Integration Upgrade Specifications

## 🔧 **CRITICAL UPGRADES REQUIRED**

Based on the analysis of actual third-party repositories, here are the detailed upgrade specifications for each library integration.

---

## 1. **WEB-EVAL-AGENT - MAJOR UPGRADE REQUIRED** 🔴

### **Current Implementation Issues**
❌ **FUNDAMENTAL ARCHITECTURE MISMATCH:**
- Current: Direct Python subprocess execution
- Actual: MCP (Model Context Protocol) server requiring MCP client integration

### **Actual Library Capabilities**
✅ **WEB-EVAL-AGENT IS AN MCP SERVER:**
- **MCP Tools Available:**
  - `web_eval_agent` - Main evaluation tool
  - `setup_browser_state` - Browser state management
- **Powered by Google Gemini** for autonomous debugging
- **Browser automation** using BrowserUse framework
- **Network traffic capture** with intelligent filtering
- **Console error collection** and analysis
- **Autonomous debugging** capabilities

### **Required Upgrade Implementation**

```python
# NEW: MCP Client Integration
from mcp import Client as MCPClient
import asyncio

class WebEvalMCPAdapter:
    """Correct MCP-based Web-Eval-Agent integration"""
    
    def __init__(self, gemini_api_key: str):
        self.gemini_api_key = gemini_api_key
        self.mcp_client = None
        
    async def initialize_mcp_client(self):
        """Initialize MCP client connection to web-eval-agent server"""
        # Connect to MCP server (web-eval-agent)
        self.mcp_client = MCPClient()
        await self.mcp_client.connect("web-eval-agent-server")
        
    async def evaluate_web_application(
        self, 
        url: str, 
        task: str, 
        headless_browser: bool = False
    ) -> WebEvalResult:
        """Use MCP tool to evaluate web application"""
        
        if not self.mcp_client:
            await self.initialize_mcp_client()
            
        # Call MCP tool
        result = await self.mcp_client.call_tool(
            "web_eval_agent",
            {
                "url": url,
                "task": task,
                "headless_browser": headless_browser
            }
        )
        
        return WebEvalResult(
            success=result.get("success", False),
            findings=result.get("findings", []),
            screenshots=result.get("screenshots", []),
            network_logs=result.get("network_logs", []),
            console_errors=result.get("console_errors", []),
            recommendations=result.get("recommendations", [])
        )
        
    async def setup_browser_state(self, url: Optional[str] = None):
        """Setup browser state using MCP tool"""
        return await self.mcp_client.call_tool(
            "setup_browser_state",
            {"url": url} if url else {}
        )
```

### **Integration Steps**
1. **Install MCP dependencies**: `pip install mcp-client`
2. **Configure MCP server**: Set up web-eval-agent as MCP server
3. **Replace current adapter**: Implement MCP-based integration
4. **Update environment**: Add `GEMINI_API_KEY` configuration
5. **Test integration**: Validate MCP communication

---

## 2. **GRAINCHAIN - VERIFICATION & UPGRADE** 🟡

### **Current Implementation Assessment**
⚠️ **PARTIALLY CORRECT BUT INCOMPLETE:**
- Current: Docker-focused sandbox management
- Actual: **"Langchain for Sandboxes"** - Unified sandbox provider interface

### **Actual Library Capabilities**
✅ **GRAINCHAIN IS A SANDBOX ABSTRACTION LAYER:**
- **Unified API** for multiple sandbox providers (E2B, Daytona, Morph, Local)
- **Provider abstraction** similar to LangChain's LLM abstraction
- **Async context manager** interface
- **File upload/download** capabilities
- **Command execution** with result capture
- **Performance benchmarking** across providers

### **Required Upgrade Implementation**

```python
# NEW: Proper Grainchain Integration
from grainchain import Sandbox, get_available_providers
import asyncio

class GrainchainAdapter:
    """Correct Grainchain sandbox integration"""
    
    def __init__(self, preferred_provider: str = "local"):
        self.preferred_provider = preferred_provider
        self.available_providers = []
        
    async def initialize(self):
        """Initialize and check available providers"""
        self.available_providers = get_available_providers()
        
        if self.preferred_provider not in self.available_providers:
            # Fallback to first available provider
            self.preferred_provider = self.available_providers[0] if self.available_providers else "local"
            
    async def create_sandbox_snapshot(
        self, 
        project_repo: str,
        setup_commands: List[str],
        environment_vars: Dict[str, str]
    ) -> SandboxSnapshot:
        """Create sandbox snapshot for PR validation"""
        
        async with Sandbox(provider=self.preferred_provider) as sandbox:
            # Clone repository
            await sandbox.execute(f"git clone {project_repo} /workspace")
            await sandbox.execute("cd /workspace")
            
            # Set environment variables
            for key, value in environment_vars.items():
                await sandbox.execute(f"export {key}='{value}'")
            
            # Run setup commands
            setup_results = []
            for command in setup_commands:
                result = await sandbox.execute(command)
                setup_results.append({
                    "command": command,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.exit_code
                })
                
                if result.exit_code != 0:
                    raise SandboxSetupError(f"Setup failed: {command}")
            
            # Install graph-sitter and web-eval-agent
            await sandbox.execute("pip install graph-sitter")
            await sandbox.execute("pip install web-eval-agent")
            
            return SandboxSnapshot(
                sandbox_id=sandbox.id,
                provider=self.preferred_provider,
                setup_results=setup_results,
                ready=True
            )
            
    async def validate_deployment(
        self, 
        snapshot: SandboxSnapshot,
        validation_commands: List[str]
    ) -> ValidationResult:
        """Run validation commands in sandbox"""
        
        async with Sandbox.from_snapshot(snapshot.sandbox_id) as sandbox:
            validation_results = []
            
            for command in validation_commands:
                result = await sandbox.execute(command)
                validation_results.append({
                    "command": command,
                    "success": result.exit_code == 0,
                    "output": result.stdout,
                    "errors": result.stderr
                })
            
            return ValidationResult(
                success=all(r["success"] for r in validation_results),
                results=validation_results
            )
```

### **Integration Steps**
1. **Install Grainchain**: `pip install grainchain`
2. **Configure providers**: Set up E2B, Daytona, or other providers as needed
3. **Update adapter**: Replace Docker-based approach with Grainchain API
4. **Test providers**: Use `grainchain providers` to verify setup
5. **Benchmark performance**: Use `grainchain benchmark` for optimization

---

## 3. **GRAPH-SITTER - API VERIFICATION & UPDATE** 🟡

### **Current Implementation Assessment**
⚠️ **IMPORT PATHS AND API STRUCTURE NEED VERIFICATION:**
- Current: Assumes specific import structure
- Actual: **Scriptable multi-language code manipulation library**

### **Actual Library Capabilities**
✅ **GRAPH-SITTER IS A COMPREHENSIVE CODE ANALYSIS LIBRARY:**
- **Multi-language support**: Python, TypeScript, JavaScript, React
- **Complete codebase graph**: Functions, classes, imports, relationships
- **Static analysis**: References, dependencies, usage tracking
- **Code transformation**: Safe code manipulation and refactoring
- **CLI tools**: `gs init`, `gs create`, `gs run`, `gs notebook`
- **Real-time analysis**: WebSocket streaming and diagnostics

### **Required Verification & Update**

```python
# VERIFY: Current import structure
try:
    from graph_sitter import Codebase
    from graph_sitter.core.class_definition import Class
    from graph_sitter.core.file import SourceFile
    from graph_sitter.core.function import Function
    from graph_sitter.core.symbol import Symbol
    GRAPH_SITTER_AVAILABLE = True
except ImportError:
    GRAPH_SITTER_AVAILABLE = False

# UPDATE: Enhanced integration with actual capabilities
class GraphSitterAdapter:
    """Enhanced Graph-Sitter integration with actual API"""
    
    def __init__(self, project_path: str):
        self.project_path = project_path
        self.codebase = None
        
    async def initialize_codebase(self):
        """Initialize codebase analysis"""
        if not GRAPH_SITTER_AVAILABLE:
            raise ImportError("Graph-Sitter not available")
            
        # Use actual API
        self.codebase = Codebase(self.project_path)
        
    async def analyze_codebase_comprehensive(self) -> CodebaseAnalysis:
        """Comprehensive codebase analysis using actual API"""
        
        if not self.codebase:
            await self.initialize_codebase()
            
        # Use actual Graph-Sitter methods
        analysis = CodebaseAnalysis(
            total_files=len(self.codebase.files),
            total_functions=len(self.codebase.functions),
            total_classes=len(self.codebase.classes),
            
            # Function analysis
            functions=[
                FunctionInfo(
                    name=func.name,
                    file_path=func.file.path,
                    line_number=func.line_number,
                    usages=len(func.usages),
                    dependencies=len(func.dependencies)
                )
                for func in self.codebase.functions
            ],
            
            # Class analysis
            classes=[
                ClassInfo(
                    name=cls.name,
                    file_path=cls.file.path,
                    methods=len(cls.methods),
                    attributes=len(cls.attributes)
                )
                for cls in self.codebase.classes
            ],
            
            # Import analysis
            imports=self._analyze_imports(),
            
            # Unused code detection
            unused_functions=[
                func.name for func in self.codebase.functions 
                if not func.usages
            ]
        )
        
        return analysis
        
    async def load_from_github_url(self, github_url: str) -> bool:
        """Load repository from GitHub URL"""
        try:
            # Use actual Graph-Sitter GitHub loading
            self.codebase = Codebase.from_repo(github_url)
            return True
        except Exception as e:
            logger.error(f"Failed to load from GitHub: {e}")
            return False
```

### **Integration Steps**
1. **Verify installation**: `uv pip install graph-sitter`
2. **Test import paths**: Validate actual API structure
3. **Update adapter**: Use correct method names and parameters
4. **Test CLI tools**: Verify `gs` command availability
5. **Validate analysis**: Test with actual codebase

---

## 4. **CLOUDFLARE - NEW IMPLEMENTATION REQUIRED** 🔴

### **Current Implementation Issues**
❌ **MISSING IMPLEMENTATION:**
- No Cloudflare adapter exists
- Critical for webhook gateway functionality

### **Required New Implementation**

```python
# NEW: Cloudflare Workers API Integration
import httpx
from typing import Dict, Any, List

class CloudflareAdapter:
    """Complete Cloudflare API integration"""
    
    def __init__(self, api_key: str, account_id: str):
        self.api_key = api_key
        self.account_id = account_id
        self.base_url = "https://api.cloudflare.com/client/v4"
        
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
    
    async def deploy_webhook_worker(
        self, 
        worker_name: str,
        script_content: str,
        routes: List[str]
    ) -> WorkerDeployment:
        """Deploy webhook gateway worker"""
        
        # Upload worker script
        upload_url = f"{self.base_url}/accounts/{self.account_id}/workers/scripts/{worker_name}"
        
        response = await self.client.put(
            upload_url,
            data=script_content,
            headers={"Content-Type": "application/javascript"}
        )
        response.raise_for_status()
        
        # Configure routes
        for route in routes:
            await self._add_worker_route(worker_name, route)
            
        return WorkerDeployment(
            worker_name=worker_name,
            script_size=len(script_content),
            routes=routes,
            deployed=True
        )
    
    async def create_webhook_gateway_worker(self) -> str:
        """Create webhook gateway worker script"""
        
        worker_script = '''
        addEventListener('fetch', event => {
            event.respondWith(handleRequest(event.request))
        })

        async function handleRequest(request) {
            const url = new URL(request.url)
            
            // Handle GitHub webhooks
            if (url.pathname === '/webhook/github') {
                return handleGitHubWebhook(request)
            }
            
            // Handle other webhooks
            return new Response('Webhook Gateway Active', { status: 200 })
        }

        async function handleGitHubWebhook(request) {
            const payload = await request.json()
            
            // Forward to backend
            const backendUrl = 'YOUR_BACKEND_URL/api/webhooks/github'
            
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-GitHub-Event': request.headers.get('X-GitHub-Event'),
                    'X-GitHub-Delivery': request.headers.get('X-GitHub-Delivery')
                },
                body: JSON.stringify(payload)
            })
            
            return new Response('Webhook processed', { status: 200 })
        }
        '''
        
        return worker_script
    
    async def configure_webhook_routes(
        self, 
        worker_name: str,
        domain: str
    ) -> List[str]:
        """Configure webhook routes"""
        
        routes = [
            f"{domain}/webhook/*",
            f"webhook-gateway.{domain}/*"
        ]
        
        for route in routes:
            await self._add_worker_route(worker_name, route)
            
        return routes
    
    async def _add_worker_route(self, worker_name: str, route: str):
        """Add route to worker"""
        
        route_url = f"{self.base_url}/accounts/{self.account_id}/workers/scripts/{worker_name}/routes"
        
        response = await self.client.post(
            route_url,
            json={"pattern": route}
        )
        response.raise_for_status()
    
    async def get_worker_logs(self, worker_name: str) -> List[Dict[str, Any]]:
        """Get worker execution logs"""
        
        logs_url = f"{self.base_url}/accounts/{self.account_id}/workers/scripts/{worker_name}/logs"
        
        response = await self.client.get(logs_url)
        response.raise_for_status()
        
        return response.json().get("result", [])
```

### **Integration Steps**
1. **Install dependencies**: `pip install httpx`
2. **Configure credentials**: Set `CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID`
3. **Implement adapter**: Create complete Cloudflare integration
4. **Deploy webhook worker**: Set up webhook gateway
5. **Test webhook routing**: Validate GitHub webhook forwarding

---

## 📊 **IMPLEMENTATION PRIORITY**

### **Phase 1: Critical (Immediate)**
1. **Web-Eval-Agent MCP Integration** - Complete rewrite required
2. **Cloudflare Adapter Implementation** - New implementation needed

### **Phase 2: Verification (Next)**
1. **Graph-Sitter API Verification** - Validate and update imports
2. **Grainchain Integration Update** - Replace Docker approach

### **Phase 3: Testing & Optimization**
1. **End-to-end integration testing**
2. **Performance optimization**
3. **Error handling enhancement**

---

## 🚀 **NEXT STEPS**

1. **Start with Web-Eval-Agent**: Implement MCP client integration
2. **Create Cloudflare adapter**: Essential for webhook functionality
3. **Verify Graph-Sitter**: Test actual API structure
4. **Update Grainchain**: Use proper sandbox abstraction
5. **Integration testing**: Validate all adapters work together

This upgrade plan will ensure all third-party integrations work correctly with the actual library capabilities and APIs.

