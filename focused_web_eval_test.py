#!/usr/bin/env python3
"""
Focused Web-Eval-Agent Test - Show Actual Responses
"""

import asyncio
import os
import sys
import time

# Add the web-eval-agent to Python path
sys.path.insert(0, '/tmp/Zeeeepa/web-eval-agent')

from webEvalAgent.src.tool_handlers import handle_web_evaluation

async def test_app_functionality():
    """Test app functionality and show detailed responses"""
    
    print("🎯 FOCUSED WEB-EVAL-AGENT TEST - ACTUAL RESPONSES")
    print("=" * 80)
    
    # Environment variables should be set externally
    required_vars = ['CODEGEN_ORG_ID', 'CODEGEN_API_TOKEN', 'GITHUB_TOKEN', 'GEMINI_API_KEY']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {missing_vars}")
        print("Please set all required environment variables before running this test.")
        return
    
    test_params = {
        "url": "http://localhost:8000",
        "task": """
        **COMPREHENSIVE CODEGENAPP FUNCTIONALITY TEST**
        
        I need to thoroughly test the CodegenApp interface and functionality. Please:
        
        **PHASE 1: INTERFACE ANALYSIS (5 minutes)**
        1. Navigate to http://localhost:8000
        2. Take a screenshot of the main page
        3. Identify and list ALL visible UI components:
           - Navigation elements (menus, tabs, breadcrumbs)
           - Buttons and interactive elements
           - Forms and input fields
           - Cards, panels, and content areas
           - Loading states or error messages
        4. Document the overall layout and design
        
        **PHASE 2: FEATURE DISCOVERY (10 minutes)**
        5. Explore the main features:
           - Look for project management capabilities
           - Find agent creation or workflow features
           - Identify GitHub integration elements
           - Check for task creation or run management
           - Test any dropdown menus or modals
        
        **PHASE 3: CI/CD WORKFLOW ATTEMPT (15 minutes)**
        6. Try to execute the CI/CD workflow:
           - Look for "Add Project" or similar functionality
           - Attempt to add project: "https://github.com/Zeeeepa/windcode"
           - Try to create a task with input: "fix imports"
           - Look for plan generation features
           - Check for PR creation capabilities
           - Document any workflow steps found
        
        **PHASE 4: API INTEGRATION TEST (5 minutes)**
        7. Check API integration:
           - Monitor network requests in browser dev tools
           - Look for API calls to GitHub, Codegen, or other services
           - Test any real-time features or data loading
           - Check for error handling or loading states
        
        **DETAILED REPORTING REQUIREMENTS:**
        - Provide screenshots for each major section/feature
        - Document exact text of buttons, labels, and messages
        - Report any errors, warnings, or issues encountered
        - List all interactive elements and their functionality
        - Describe user workflows and navigation paths
        - Note any missing features or broken functionality
        
        **SUCCESS CRITERIA:**
        - Complete interface analysis with screenshots
        - Identification of all major features
        - Attempt at CI/CD workflow execution
        - Documentation of API integration status
        - Comprehensive feature functionality report
        
        This is a THOROUGH functionality test - document everything you discover!
        """,
        "headless": False,  # Use visible browser for better debugging
        "tool_call_id": "focused-functionality-test"
    }
    
    try:
        print("🔄 Starting focused functionality test...")
        print(f"🌐 Testing URL: {test_params['url']}")
        print("📋 Running comprehensive interface and feature analysis...")
        print("=" * 80)
        
        start_time = time.time()
        
        result = await handle_web_evaluation(
            test_params,
            ctx=None,
            api_key=os.environ['GEMINI_API_KEY']
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n✅ Focused functionality test completed in {duration:.2f} seconds!")
        print("=" * 80)
        print("📊 ACTUAL WEB-EVAL-AGENT RESPONSES:")
        print("=" * 80)
        
        if result:
            if isinstance(result, list):
                for i, item in enumerate(result):
                    print(f"\n{'='*20} RESPONSE PART {i+1} {'='*20}")
                    if hasattr(item, 'text'):
                        print(item.text)
                    elif hasattr(item, 'content'):
                        print(item.content)
                    elif hasattr(item, 'parts'):
                        for j, part in enumerate(item.parts):
                            print(f"\n--- Part {j+1} ---")
                            if hasattr(part, 'text'):
                                print(part.text)
                            else:
                                print(str(part))
                    else:
                        print(str(item))
            else:
                print("📝 SINGLE RESPONSE:")
                if hasattr(result, 'text'):
                    print(result.text)
                elif hasattr(result, 'content'):
                    print(result.content)
                elif hasattr(result, 'parts'):
                    for j, part in enumerate(result.parts):
                        print(f"\n--- Part {j+1} ---")
                        if hasattr(part, 'text'):
                            print(part.text)
                        else:
                            print(str(part))
                else:
                    print(str(result))
        else:
            print("❌ No results returned from web-eval-agent")
            
        print("\n" + "=" * 80)
        print("🎯 TEST SUMMARY:")
        print(f"   Duration: {duration:.2f} seconds")
        print(f"   Target URL: http://localhost:8000")
        print(f"   Test Type: Comprehensive functionality analysis")
        print(f"   Response Type: {type(result)}")
        print("=" * 80)
        
        return result
        
    except Exception as e:
        print(f"❌ Error during focused functionality test: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    asyncio.run(test_app_functionality())

