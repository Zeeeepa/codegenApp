#!/usr/bin/env python3
"""
Full CI/CD Workflow Test for CodegenApp
Tests the complete flow: Add Project -> Create Task -> Generate Plan -> Execute -> PR -> Merge
"""

import asyncio
import os
import sys
import time

# Add the web-eval-agent to Python path
sys.path.insert(0, '/tmp/Zeeeepa/web-eval-agent')

from webEvalAgent.src.tool_handlers import handle_web_evaluation

async def test_full_cicd_workflow():
    """
    Test the complete CI/CD workflow as specified:
    1. Add project "https://github.com/Zeeeepa/windcode"
    2. Run task with text input: "fix imports"
    3. Create plan
    4. Show retrieved plan on project card
    5. Confirm the retrieved plan
    6. Retrieve PR
    7. Validation sequence
    8. PR merge to main project
    """
    
    # Environment variables should be set externally
    required_vars = ['CODEGEN_ORG_ID', 'CODEGEN_API_TOKEN', 'GITHUB_TOKEN', 'GEMINI_API_KEY']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {missing_vars}")
        print("Please set all required environment variables before running this test.")
        return
    
    print("🚀 FULL CI/CD WORKFLOW TEST - CODEGENAPP")
    print("=" * 80)
    print("🎯 Testing Complete Workflow:")
    print("   1. Add Project: https://github.com/Zeeeepa/windcode")
    print("   2. Create Task: 'fix imports'")
    print("   3. Generate Plan")
    print("   4. Display Plan on Project Card")
    print("   5. Confirm Plan")
    print("   6. Execute and Generate PR")
    print("   7. Validation Sequence")
    print("   8. PR Merge to Main")
    print("=" * 80)
    
    # Test parameters for full CI/CD workflow
    test_params = {
        "url": "http://localhost:8000",
        "task": """
        **COMPLETE CI/CD WORKFLOW TEST - CODEGENAPP**
        
        I need to test the COMPLETE CI/CD workflow in the CodegenApp with these exact steps:
        
        **PHASE 1: PROJECT SETUP (10 minutes)**
        1. **Add New Project:**
           - Look for "Add Project", "New Project", or similar button
           - Add the project: "https://github.com/Zeeeepa/windcode"
           - Fill in all required fields for project creation
           - Confirm project is successfully added and visible
           - Take screenshot of the project card/listing
        
        **PHASE 2: TASK CREATION (10 minutes)**
        2. **Create Task on Project:**
           - Navigate to the windcode project
           - Look for "Run", "New Task", "Create Run", or similar option
           - Enter the text input: "fix imports"
           - Submit the task creation
           - Verify task is created and visible
           - Take screenshot of task creation confirmation
        
        **PHASE 3: PLAN GENERATION (15 minutes)**
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
        
        **PHASE 4: PLAN CONFIRMATION (10 minutes)**
        5. **Confirm Retrieved Plan:**
           - Look for "Confirm Plan", "Approve Plan", or similar button
           - Click to confirm/approve the plan
           - Verify confirmation is successful
           - Check for any status updates or progress indicators
           - Take screenshot of plan confirmation
        
        **PHASE 5: PR GENERATION (15 minutes)**
        6. **Retrieve/Generate PR:**
           - Look for "Execute", "Run", "Generate PR", or similar action
           - Trigger the PR generation process
           - Wait for PR creation to complete
           - Verify PR is created successfully
           - Take screenshot of PR generation confirmation
        
        **PHASE 6: VALIDATION SEQUENCE (15 minutes)**
        7. **Validation Sequence:**
           - Look for validation steps, checks, or review process
           - Follow any validation workflow presented
           - Check for automated tests, reviews, or approvals
           - Verify all validation steps pass
           - Take screenshot of validation results
        
        **PHASE 7: PR MERGE (10 minutes)**
        8. **PR Merge to Main Project:**
           - Look for "Merge", "Deploy", or final execution button
           - Complete the merge process
           - Verify merge is successful
           - Check for completion status and final results
           - Take screenshot of successful merge
        
        **DETAILED REQUIREMENTS:**
        
        For EACH step, provide:
        1. **Step Location:** Where you found the UI element
        2. **Actions Taken:** Exact clicks, inputs, and interactions
        3. **Results:** What happened after each action
        4. **Screenshots:** Visual documentation of each step
        5. **API Calls:** Any backend requests observed
        6. **Status Updates:** Progress indicators and status changes
        7. **Error Handling:** Any issues encountered and how resolved
        
        **CRITICAL SUCCESS CRITERIA:**
        - Project "https://github.com/Zeeeepa/windcode" must be successfully added
        - Task "fix imports" must be created and processed
        - Plan must be generated and displayed on project card
        - Plan must be confirmed/approved
        - PR must be generated successfully
        - Validation sequence must complete
        - Final merge must succeed
        
        **IMPORTANT TESTING NOTES:**
        - Use REAL GitHub repository: https://github.com/Zeeeepa/windcode
        - Actually execute each step - don't just describe
        - Wait for processes to complete before moving to next step
        - Document any loading times or delays
        - Test with real API integrations
        - Capture screenshots at every major step
        - If any step fails, document the failure and attempt recovery
        
        **FINAL REPORT REQUIREMENTS:**
        1. **Workflow Success Rate:** Which steps completed successfully
        2. **Performance Metrics:** Time taken for each phase
        3. **API Integration Quality:** How well APIs worked
        4. **User Experience Assessment:** Ease of workflow completion
        5. **Issues and Blockers:** Any problems encountered
        6. **Recommendations:** Improvements for the workflow
        
        This is a COMPLETE END-TO-END test - execute every step thoroughly!
        """,
        "headless": True,
        "tool_call_id": "full-cicd-workflow-test"
    }
    
    print(f"🌐 Testing URL: {test_params['url']}")
    print("📋 Executing COMPLETE CI/CD workflow test...")
    print("🔍 Target Repository: https://github.com/Zeeeepa/windcode")
    print("📝 Task Input: 'fix imports'")
    print("=" * 80)
    
    try:
        print("🔄 Starting full CI/CD workflow test...")
        start_time = time.time()
        
        # Run the comprehensive workflow test
        result = await handle_web_evaluation(
            test_params,
            ctx=None,
            api_key=os.environ['GEMINI_API_KEY']
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n✅ Full CI/CD workflow test completed in {duration:.2f} seconds!")
        print("=" * 80)
        print("📊 FULL CI/CD WORKFLOW TEST RESULTS:")
        print("=" * 80)
        
        if result:
            if isinstance(result, list):
                for i, item in enumerate(result):
                    print(f"\n--- Workflow Step Result {i+1} ---")
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
            print("❌ No results returned from workflow test")
            
        print("\n" + "=" * 80)
        print("🎯 CI/CD WORKFLOW TEST SUMMARY:")
        print(f"   Total Duration: {duration:.2f} seconds")
        print(f"   Target Repository: https://github.com/Zeeeepa/windcode")
        print(f"   Task Input: 'fix imports'")
        print(f"   Workflow Phases: 7 (Project Add → Task Create → Plan → Confirm → PR → Validate → Merge)")
        print("=" * 80)
        print("✅ FULL CI/CD WORKFLOW TEST COMPLETED!")
            
    except Exception as e:
        print(f"❌ Error during CI/CD workflow test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_full_cicd_workflow())

