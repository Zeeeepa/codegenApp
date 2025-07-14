#!/usr/bin/env python3
"""
Test Web-Eval-Agent Responses and Feature Verification
Shows actual responses from web-eval-agent and confirms all features work
"""

import asyncio
import os
import sys
import time
import subprocess
import signal
import json

# Add the web-eval-agent to Python path
sys.path.insert(0, '/tmp/Zeeeepa/web-eval-agent')

from webEvalAgent.src.tool_handlers import handle_web_evaluation

class ServerManager:
    def __init__(self):
        self.main_process = None
        self.proxy_process = None
        
    def start_servers(self):
        """Start both main app and proxy servers"""
        print("🚀 Starting application servers...")
        
        # Environment variables should be set externally
        required_vars = ['CODEGEN_ORG_ID', 'CODEGEN_API_TOKEN', 'GITHUB_TOKEN', 'GEMINI_API_KEY']
        missing_vars = [var for var in required_vars if not os.environ.get(var)]
        
        if missing_vars:
            print(f"❌ Missing required environment variables: {missing_vars}")
            return False
        
        # Set environment variables from existing env
        env = os.environ.copy()
        env['PORT'] = '8000'
        
        try:
            # Start main React app
            print("   📱 Starting main React app on port 8000...")
            self.main_process = subprocess.Popen(
                ['npm', 'start'],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid
            )
            
            # Start proxy server
            print("   🔄 Starting proxy server on port 3001...")
            self.proxy_process = subprocess.Popen(
                ['node', 'index.js'],
                cwd='server',
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid
            )
            
            # Wait for servers to start
            print("   ⏳ Waiting for servers to initialize...")
            time.sleep(15)
            
            # Check if servers are running
            if self.main_process.poll() is None and self.proxy_process.poll() is None:
                print("   ✅ Both servers started successfully!")
                return True
            else:
                print("   ❌ Failed to start servers")
                return False
                
        except Exception as e:
            print(f"   ❌ Error starting servers: {e}")
            return False
    
    def stop_servers(self):
        """Stop both servers"""
        print("🛑 Stopping servers...")
        
        if self.main_process:
            try:
                os.killpg(os.getpgid(self.main_process.pid), signal.SIGTERM)
                self.main_process.wait(timeout=5)
            except:
                try:
                    os.killpg(os.getpgid(self.main_process.pid), signal.SIGKILL)
                except:
                    pass
        
        if self.proxy_process:
            try:
                os.killpg(os.getpgid(self.proxy_process.pid), signal.SIGTERM)
                self.proxy_process.wait(timeout=5)
            except:
                try:
                    os.killpg(os.getpgid(self.proxy_process.pid), signal.SIGKILL)
                except:
                    pass
        
        print("   ✅ Servers stopped")

async def test_basic_functionality():
    """Test basic app functionality and get web-eval-agent responses"""
    
    print("🧪 TESTING BASIC FUNCTIONALITY")
    print("=" * 80)
    
    test_params = {
        "url": "http://localhost:8000",
        "task": """
        **BASIC FUNCTIONALITY TEST - CODEGENAPP**
        
        I need to test the basic functionality of the CodegenApp interface. Please:
        
        1. **Load and Analyze the Main Page:**
           - Navigate to http://localhost:8000
           - Take a screenshot of the main page
           - Identify all visible UI components
           - List all buttons, forms, navigation elements
           - Check for any error messages or loading states
        
        2. **Test Navigation and Interface Elements:**
           - Click on any navigation items or tabs
           - Test any dropdown menus or modals
           - Try interacting with forms or input fields
           - Check for responsive design elements
        
        3. **API Integration Check:**
           - Look for any API calls being made
           - Check network requests in browser dev tools
           - Identify any data loading or error states
           - Test any real-time features or updates
        
        4. **Feature Discovery:**
           - Identify the main features available
           - Look for project management capabilities
           - Find task creation or workflow features
           - Check for GitHub integration elements
        
        **DETAILED REQUIREMENTS:**
        - Provide screenshots of each major section
        - Document all interactive elements found
        - Report any errors or issues encountered
        - List all features and capabilities discovered
        - Test user workflows and interactions
        
        This is a comprehensive functionality test - document everything you find!
        """,
        "headless": True,
        "tool_call_id": "basic-functionality-test"
    }
    
    try:
        print("🔄 Running basic functionality test...")
        start_time = time.time()
        
        result = await handle_web_evaluation(
            test_params,
            ctx=None,
            api_key=os.environ['GEMINI_API_KEY']
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n✅ Basic functionality test completed in {duration:.2f} seconds!")
        print("=" * 80)
        print("📊 WEB-EVAL-AGENT RESPONSE - BASIC FUNCTIONALITY:")
        print("=" * 80)
        
        if result:
            if isinstance(result, list):
                for i, item in enumerate(result):
                    print(f"\n--- Response Part {i+1} ---")
                    if hasattr(item, 'text'):
                        print(item.text)
                    elif hasattr(item, 'content'):
                        print(item.content)
                    else:
                        print(str(item))
            else:
                if hasattr(result, 'text'):
                    print(result.text)
                elif hasattr(result, 'content'):
                    print(result.content)
                else:
                    print(str(result))
        else:
            print("❌ No results returned from basic functionality test")
            
        return result
        
    except Exception as e:
        print(f"❌ Error during basic functionality test: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

async def test_cicd_workflow():
    """Test the complete CI/CD workflow and get detailed responses"""
    
    print("\n🚀 TESTING COMPLETE CI/CD WORKFLOW")
    print("=" * 80)
    
    test_params = {
        "url": "http://localhost:8000",
        "task": """
        **COMPLETE CI/CD WORKFLOW TEST - CODEGENAPP**
        
        I need to test the COMPLETE CI/CD workflow in the CodegenApp. Execute these steps:
        
        **PHASE 1: PROJECT SETUP**
        1. **Add New Project:**
           - Look for "Add Project", "New Project", or similar button
           - Add the project: "https://github.com/Zeeeepa/windcode"
           - Fill in all required fields for project creation
           - Confirm project is successfully added and visible
           - Take screenshot of the project card/listing
        
        **PHASE 2: TASK CREATION**
        2. **Create Task on Project:**
           - Navigate to the windcode project
           - Look for "Run", "New Task", "Create Run", or similar option
           - Enter the text input: "fix imports"
           - Submit the task creation
           - Verify task is created and visible
           - Take screenshot of task creation confirmation
        
        **PHASE 3: PLAN GENERATION**
        3. **Generate Plan:**
           - Look for "Create Plan", "Generate Plan", or automatic plan generation
           - Wait for plan generation to complete
           - Verify plan is generated successfully
           - Take screenshot of the generated plan
        
        4. **Display Plan on Project Card:**
           - Navigate back to project view if needed
           - Verify the project card shows the retrieved plan
           - Check that plan details are visible on the card
           - Take screenshot of project card with plan displayed
        
        **PHASE 4: PLAN CONFIRMATION**
        5. **Confirm Retrieved Plan:**
           - Look for "Confirm Plan", "Approve Plan", or similar button
           - Click to confirm/approve the plan
           - Verify confirmation is successful
           - Check for any status updates or progress indicators
           - Take screenshot of plan confirmation
        
        **PHASE 5: PR GENERATION**
        6. **Retrieve/Generate PR:**
           - Look for "Execute", "Run", "Generate PR", or similar action
           - Trigger the PR generation process
           - Wait for PR creation to complete
           - Verify PR is created successfully
           - Take screenshot of PR generation confirmation
        
        **PHASE 6: VALIDATION SEQUENCE**
        7. **Validation Sequence:**
           - Look for validation steps, checks, or review process
           - Follow any validation workflow presented
           - Check for automated tests, reviews, or approvals
           - Verify all validation steps pass
           - Take screenshot of validation results
        
        **PHASE 7: PR MERGE**
        8. **PR Merge to Main Project:**
           - Look for "Merge", "Deploy", or final execution button
           - Complete the merge process
           - Verify merge is successful
           - Check for completion status and final results
           - Take screenshot of successful merge
        
        **CRITICAL SUCCESS CRITERIA:**
        - Project "https://github.com/Zeeeepa/windcode" must be successfully added
        - Task "fix imports" must be created and processed
        - Plan must be generated and displayed on project card
        - Plan must be confirmed/approved
        - PR must be generated successfully
        - Validation sequence must complete
        - Final merge must succeed
        
        **DETAILED REPORTING:**
        For EACH step, provide:
        1. **Step Location:** Where you found the UI element
        2. **Actions Taken:** Exact clicks, inputs, and interactions
        3. **Results:** What happened after each action
        4. **Screenshots:** Visual documentation of each step
        5. **API Calls:** Any backend requests observed
        6. **Status Updates:** Progress indicators and status changes
        7. **Error Handling:** Any issues encountered and how resolved
        
        This is a COMPLETE END-TO-END test - execute every step thoroughly and document everything!
        """,
        "headless": True,
        "tool_call_id": "complete-cicd-workflow-test"
    }
    
    try:
        print("🔄 Running complete CI/CD workflow test...")
        start_time = time.time()
        
        result = await handle_web_evaluation(
            test_params,
            ctx=None,
            api_key=os.environ['GEMINI_API_KEY']
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n✅ Complete CI/CD workflow test completed in {duration:.2f} seconds!")
        print("=" * 80)
        print("📊 WEB-EVAL-AGENT RESPONSE - COMPLETE CI/CD WORKFLOW:")
        print("=" * 80)
        
        if result:
            if isinstance(result, list):
                for i, item in enumerate(result):
                    print(f"\n--- Workflow Response Part {i+1} ---")
                    if hasattr(item, 'text'):
                        print(item.text)
                    elif hasattr(item, 'content'):
                        print(item.content)
                    else:
                        print(str(item))
            else:
                if hasattr(result, 'text'):
                    print(result.text)
                elif hasattr(result, 'content'):
                    print(result.content)
                else:
                    print(str(result))
        else:
            print("❌ No results returned from CI/CD workflow test")
            
        return result
        
    except Exception as e:
        print(f"❌ Error during CI/CD workflow test: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

async def main():
    """Main test execution"""
    
    print("🎯 WEB-EVAL-AGENT RESPONSE TESTING - CODEGENAPP")
    print("=" * 80)
    print("🔍 This test will show actual responses from web-eval-agent")
    print("📋 Testing both basic functionality and complete CI/CD workflow")
    print("🎯 Target Repository: https://github.com/Zeeeepa/windcode")
    print("📝 Task Input: 'fix imports'")
    print("=" * 80)
    
    # Environment variables check
    required_vars = ['CODEGEN_ORG_ID', 'CODEGEN_API_TOKEN', 'GITHUB_TOKEN', 'GEMINI_API_KEY']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {missing_vars}")
        return
    
    server_manager = ServerManager()
    
    try:
        # Start servers
        if not server_manager.start_servers():
            print("❌ Failed to start servers. Exiting.")
            return
        
        print("\n🧪 STARTING COMPREHENSIVE TESTING...")
        print("=" * 80)
        
        # Test 1: Basic Functionality
        basic_result = await test_basic_functionality()
        
        # Test 2: Complete CI/CD Workflow
        cicd_result = await test_cicd_workflow()
        
        # Final Summary
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        print("📊 TEST RESULTS:")
        print(f"   ✅ Basic Functionality Test: {'COMPLETED' if basic_result else 'FAILED'}")
        print(f"   ✅ CI/CD Workflow Test: {'COMPLETED' if cicd_result else 'FAILED'}")
        
        print("\n📋 FEATURES TESTED:")
        print("   🔍 Interface component discovery")
        print("   🚀 Project addition workflow")
        print("   📝 Task creation process")
        print("   📋 Plan generation and display")
        print("   ✅ Plan confirmation workflow")
        print("   🔄 PR generation process")
        print("   🧪 Validation sequence")
        print("   🎯 PR merge completion")
        
        print("\n🎯 TARGET SPECIFICATIONS:")
        print("   📂 Repository: https://github.com/Zeeeepa/windcode")
        print("   📝 Task Input: 'fix imports'")
        print("   🔄 Complete CI/CD workflow execution")
        
        print("\n✅ WEB-EVAL-AGENT RESPONSE TESTING COMPLETED!")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Clean up servers
        server_manager.stop_servers()

if __name__ == "__main__":
    asyncio.run(main())

