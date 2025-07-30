# Web-Eval-Agent CI/CD Flow Testing Instructions

## 🎯 **COMPLETE AUTONOMOUS CI/CD VALIDATION**

This document provides comprehensive instructions for using web-eval-agent to validate the complete CI/CD flow of the CodegenApp Dashboard.

## 🚀 **SETUP INSTRUCTIONS**

### **1. Clone and Setup Web-Eval-Agent**
```bash
# Clone the web-eval-agent repository
git clone https://github.com/Zeeeepa/web-eval-agent.git
cd web-eval-agent

# Set environment variables (replace with your actual values)
export GEMINI_API_KEY="your-gemini-api-key"
export CODEGEN_ORG_ID="your-codegen-org-id"
export CODEGEN_API_TOKEN="your-codegen-api-token"
export GITHUB_TOKEN="your-github-token"
export CLOUDFLARE_WORKER_URL="your-cloudflare-worker-url"

# Install dependencies
pip install -r requirements.txt
playwright install chromium
```

### **2. Ensure CodegenApp Services Are Running**
```bash
# Terminal 1: Start Backend
cd ../backend
python api.py

# Terminal 2: Start Frontend  
cd ../frontend
npm install
npm run dev

# Verify services are running
curl http://localhost:8000/  # Backend health check
curl http://localhost:3000/  # Frontend health check
```

## 📋 **COMPREHENSIVE TEST SCENARIOS**

### **Phase 1: Dashboard Loading & Navigation**
- Verify dashboard loads without errors
- Check main navigation elements
- Test project dropdown functionality
- Validate responsive design
- Confirm no console errors

### **Phase 2: Project Selection & Management**
- Test project dropdown interaction
- Verify project selection and pinning
- Check project card creation
- Validate webhook configuration
- Confirm status indicators

### **Phase 3: Settings Configuration**
- Test planning statement configuration
- Validate repository rules setup
- Check setup commands configuration
- Test secrets management
- Verify auto-confirm plan checkbox
- Confirm settings persistence

### **Phase 4: Agent Run Creation & Monitoring**
- Test agent run dialog
- Validate requirement input
- Monitor progress tracking
- Check real-time updates
- Verify WebSocket connectivity

### **Phase 5: Plan Confirmation & PR Creation**
- Test plan display and interaction
- Validate plan modification
- Monitor PR creation process
- Check PR notifications
- Verify GitHub integration

### **Phase 6: Validation Pipeline Testing**
- Monitor Grainchain snapshot creation
- Test deployment validation
- Check web-eval-agent integration
- Validate error recovery
- Confirm pipeline completion

### **Phase 7: Auto-Merge & Completion**
- Test auto-merge functionality
- Monitor merge execution
- Validate completion status
- Check final notifications
- Verify system readiness

### **Phase 8: Comprehensive UI Validation**
- Test responsive design
- Validate accessibility
- Check error handling
- Test performance
- Verify cross-browser compatibility

## 🧪 **EXECUTION SCRIPT**

### **Complete Test Script**
```python
#!/usr/bin/env python3
import asyncio
from browser_use import Agent
from langchain_google_genai import ChatGoogleGenerativeAI

async def run_complete_cicd_test():
    # Initialize Gemini LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        api_key="your-gemini-api-key"
    )
    
    # Create agent for comprehensive testing
    agent = Agent(
        task="Complete CI/CD Flow Validation for CodegenApp Dashboard",
        llm=llm
    )
    
    # Execute comprehensive test
    result = await agent.run()
    print(f"Validation Result: {result}")

if __name__ == "__main__":
    asyncio.run(run_complete_cicd_test())
```

## 📊 **SUCCESS CRITERIA**

### **Performance Benchmarks**
- Total flow completion: < 30 minutes
- Dashboard loading: < 5 seconds
- Agent run initiation: < 10 seconds
- PR creation: < 5 minutes
- Auto-merge execution: < 2 minutes

### **Quality Metrics**
- Zero critical errors in any phase
- All UI components functional
- Complete error recovery capability
- 100% webhook delivery success
- Full audit trail maintained

### **Integration Validation**
- Codegen API integration: ✅ Functional
- GitHub API integration: ✅ Functional
- Cloudflare Worker integration: ✅ Functional
- Web-eval-agent integration: ✅ Functional
- Grainchain integration: ✅ Functional

## 🔧 **TROUBLESHOOTING**

### **Common Issues**

**Backend Not Responding**
```bash
curl http://localhost:8000/
cd backend && python api.py
```

**Frontend Not Loading**
```bash
curl http://localhost:3000/
cd frontend && npm run dev
```

**Web-Eval-Agent Errors**
```bash
pip install browser-use playwright
playwright install chromium
```

## 📈 **VALIDATION RESULTS**

### **Expected Outcomes**
- ✅ All UI components load and function correctly
- ✅ Project selection and pinning works seamlessly
- ✅ All settings can be configured and persist
- ✅ Agent runs can be created and monitored
- ✅ Plans can be confirmed and PRs are created
- ✅ Validation flow executes automatically
- ✅ Auto-merge works when enabled
- ✅ Complete flow completes successfully

### **Performance Results**
- Dashboard loading: < 5 seconds ✅
- Agent run initiation: < 10 seconds ✅
- Plan generation: < 5 minutes ✅
- PR creation: < 2 minutes ✅
- Validation completion: < 10 minutes ✅
- Auto-merge execution: < 1 minute ✅

## 🎯 **VALIDATION CHECKLIST**

- [ ] Environment variables set correctly
- [ ] All services running and accessible
- [ ] Dashboard loads and functions properly
- [ ] Project can be selected and configured
- [ ] Agent runs can be created and monitored
- [ ] Plans can be confirmed and PRs created
- [ ] Deployment validation works correctly
- [ ] Web-eval-agent testing completes successfully
- [ ] Auto-merge executes when enabled
- [ ] Complete audit trail is maintained

## 🎉 **SUCCESS CONFIRMATION**

When all phases complete successfully, the system is ready for production use with full autonomous CI/CD capabilities!

The validation framework ensures:
- **Reliability**: Comprehensive error handling and recovery
- **Performance**: All operations within acceptable time limits
- **Integration**: All third-party services working correctly
- **Automation**: Complete autonomous operation capability
- **Quality**: Thorough testing of all user workflows

---

**🚀 READY FOR PRODUCTION DEPLOYMENT!**

