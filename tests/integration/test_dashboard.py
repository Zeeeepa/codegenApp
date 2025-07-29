#!/usr/bin/env python3
"""
Test script for CodegenApp Dashboard using web-eval-agent with Gemini API
"""

import os
import sys
import asyncio
from pathlib import Path

# Add web-eval-agent to path
sys.path.append(str(Path(__file__).parent / "web-eval-agent"))

from webEvalAgent.src.tool_handlers import handle_web_evaluation

# Set up environment variables
os.environ["GEMINI_API_KEY"] = "AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0"

async def test_dashboard():
    """Test the CodegenApp Dashboard comprehensively"""
    
    # Get API key
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY environment variable not set")
        return
    
    # Test scenarios
    test_scenarios = [
        {
            "name": "Dashboard Load Test",
            "url": "http://localhost:3002",
            "task": """
            Test the CodegenApp Dashboard loading and basic functionality:
            
            1. Verify the page loads successfully
            2. Check that the header contains "CodegenApp Dashboard" 
            3. Verify the "Add Project" dropdown button is present
            4. Check if there's a GitHub icon in the header
            5. Look for any error messages or loading states
            6. Verify the layout is responsive and well-structured
            
            Report on:
            - Page load success/failure
            - All visible UI elements
            - Any JavaScript errors in console
            - Overall user experience assessment
            """
        },
        {
            "name": "Project Selector Test",
            "url": "http://localhost:3002", 
            "task": """
            Test the Project Selector functionality:
            
            1. Click on the "Add Project" button
            2. Verify a dropdown menu opens
            3. Check if there's a search input field
            4. Look for repository listings (may show loading or error if GitHub token invalid)
            5. Test the search functionality if repositories are loaded
            6. Try clicking outside to close the dropdown
            
            Report on:
            - Dropdown opening/closing behavior
            - Search functionality
            - Repository display (or appropriate error messages)
            - User interaction responsiveness
            """
        },
        {
            "name": "Empty State Test",
            "url": "http://localhost:3002",
            "task": """
            Test the empty state when no projects are added:
            
            1. Verify there's a message about "No projects added yet"
            2. Check for a GitHub icon in the empty state
            3. Look for instructional text about adding repositories
            4. Verify there's another "Add Project" button in the empty state
            5. Check the overall visual design and spacing
            
            Report on:
            - Empty state messaging clarity
            - Visual design quality
            - Call-to-action effectiveness
            - User guidance provided
            """
        },
        {
            "name": "Responsive Design Test",
            "url": "http://localhost:3002",
            "task": """
            Test responsive design across different screen sizes:
            
            1. Test desktop view (1920x1080)
            2. Test tablet view (768x1024) 
            3. Test mobile view (375x667)
            4. Check header layout at different sizes
            5. Verify button and text readability
            6. Test dropdown behavior on mobile
            
            Report on:
            - Layout adaptation across screen sizes
            - Text and button readability
            - Touch target sizes on mobile
            - Overall responsive design quality
            """
        },
        {
            "name": "Error Handling Test",
            "url": "http://localhost:3002",
            "task": """
            Test error handling and edge cases:
            
            1. Check browser console for any JavaScript errors
            2. Look for network request failures
            3. Verify error messages are user-friendly
            4. Test behavior with invalid GitHub token (if applicable)
            5. Check loading states and spinners
            
            Report on:
            - JavaScript errors or warnings
            - Network request handling
            - Error message quality
            - Loading state implementations
            - Overall error resilience
            """
        }
    ]
    
    print("🚀 Starting CodegenApp Dashboard Testing with Web-Eval-Agent")
    print("=" * 60)
    
    results = []
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n📋 Test {i}/{len(test_scenarios)}: {scenario['name']}")
        print("-" * 40)
        
        try:
            # Run the test scenario
            test_params = {
                "url": scenario["url"],
                "task": scenario["task"],
                "headless": False,
                "tool_call_id": f"dashboard-test-{i}"
            }
            
            result = await handle_web_evaluation(
                test_params,
                ctx=None,
                api_key=api_key
            )
            
            results.append({
                "scenario": scenario["name"],
                "success": True,
                "result": result
            })
            
            print(f"✅ {scenario['name']} completed successfully")
            print(f"📊 Result: {result[:200]}..." if len(result) > 200 else f"📊 Result: {result}")
            
        except Exception as e:
            results.append({
                "scenario": scenario["name"], 
                "success": False,
                "error": str(e)
            })
            
            print(f"❌ {scenario['name']} failed: {str(e)}")
    
    # Generate comprehensive report
    print("\n" + "=" * 60)
    print("📊 COMPREHENSIVE TEST REPORT")
    print("=" * 60)
    
    successful_tests = sum(1 for r in results if r["success"])
    total_tests = len(results)
    
    print(f"✅ Successful Tests: {successful_tests}/{total_tests}")
    print(f"❌ Failed Tests: {total_tests - successful_tests}/{total_tests}")
    print(f"📈 Success Rate: {(successful_tests/total_tests)*100:.1f}%")
    
    print("\n📋 Detailed Results:")
    print("-" * 40)
    
    for result in results:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        print(f"{status} {result['scenario']}")
        
        if result["success"]:
            # Show first 300 chars of result
            content = result["result"][:300] + "..." if len(result["result"]) > 300 else result["result"]
            print(f"   📝 {content}")
        else:
            print(f"   ❌ Error: {result['error']}")
        print()
    
    # Overall assessment
    if successful_tests == total_tests:
        print("🎉 ALL TESTS PASSED! Dashboard is working excellently.")
    elif successful_tests >= total_tests * 0.8:
        print("✅ Most tests passed. Dashboard is working well with minor issues.")
    elif successful_tests >= total_tests * 0.5:
        print("⚠️  Some tests failed. Dashboard has moderate issues that need attention.")
    else:
        print("❌ Many tests failed. Dashboard needs significant improvements.")
    
    return results

if __name__ == "__main__":
    # Run the comprehensive test
    asyncio.run(test_dashboard())
