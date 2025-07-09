#!/usr/bin/env python3

import os
from codegen import Agent

# Set up credentials
ORG_ID = "323"
API_TOKEN = "sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99"

print("🧪 Testing Codegen SDK with REAL credentials...")
print(f"🏢 Organization ID: {ORG_ID}")
print(f"🔑 API Token: {API_TOKEN[:15]}...")
print()

try:
    # Initialize the Agent
    print("🔄 Initializing Codegen Agent...")
    agent = Agent(org_id=ORG_ID, token=API_TOKEN)
    print("✅ Agent initialized successfully!")
    
    # Test a simple task
    print("\n🔄 Running a test task...")
    task = agent.run(prompt="Hello! Can you tell me about this organization?")
    
    print(f"📊 Task created with ID: {task.id}")
    print(f"📊 Initial status: {task.status}")
    
    # Check status a few times
    import time
    for i in range(5):
        print(f"🔄 Checking status (attempt {i+1}/5)...")
        task.refresh()
        print(f"📊 Status: {task.status}")
        
        if task.status == "completed":
            print("🎉 Task completed!")
            print(f"📄 Result: {task.result}")
            break
        elif task.status == "failed":
            print("❌ Task failed!")
            print(f"📄 Error: {task.error if hasattr(task, 'error') else 'Unknown error'}")
            break
        else:
            print(f"⏳ Task still running... waiting 5 seconds")
            time.sleep(5)
    
    print("\n✅ SDK test completed successfully!")
    
except Exception as e:
    print(f"❌ SDK test failed: {e}")
    import traceback
    traceback.print_exc()

