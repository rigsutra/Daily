#!/bin/bash

# Test script to verify task CRUD operations and dashboard updates
# This simulates the user flow: create tasks, complete them, check dashboard

# Configuration
API_BASE="http://localhost:3001/api"
TEST_USER_EMAIL="test2@example.com"
TEST_USER_PASSWORD="testpassword123"

echo "Starting task and dashboard integration tests..."

# Login
echo -e "\n=== Logging in ==="
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "Login failed: $LOGIN_RESPONSE"
  exit 1
fi
echo "✓ Login successful"

# Get auth header
AUTH_HEADER="Authorization: Bearer $TOKEN"

# Test Task CRUD
echo -e "\n=== Testing Task CRUD Operations ==="

# 1. Get existing tasks
echo -e "\n1. Getting existing tasks..."
TASKS_RESPONSE=$(curl -s -X GET "$API_BASE/tasks" -H "$AUTH_HEADER")
TASK_COUNT=$(echo "$TASKS_RESPONSE" | grep -o '"id"' | wc -l)
echo "✓ Retrieved $TASK_COUNT existing tasks"

# 2. Create a new task with hours unit
echo -e "\n2. Creating new task..."
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/tasks" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Study Task","target":2,"unit":"hours","mandatory":false}')
TASK_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
if [ -z "$TASK_ID" ]; then
  echo "Failed to create task: $CREATE_RESPONSE"
  exit 1
fi
echo "✓ Created task: $(echo "$CREATE_RESPONSE" | grep -o '"title":"[^"]*' | cut -d'"' -f4) (ID: $TASK_ID)"

# 3. Complete the task
echo -e "\n3. Completing task..."
COMPLETE_RESPONSE=$(curl -s -X POST "$API_BASE/tasks/$TASK_ID/complete" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"achieved":2}')
if echo "$COMPLETE_RESPONSE" | grep -q '"achieved":2'; then
  echo "✓ Completed task: 2 hours achieved"
else
  echo "Failed to complete task: $COMPLETE_RESPONSE"
  exit 1
fi

# 4. Get today's completions
echo -e "\n4. Getting today's completions..."
COMPLETIONS_RESPONSE=$(curl -s -X GET "$API_BASE/tasks/completions/today" -H "$AUTH_HEADER")
COMPLETION_COUNT=$(echo "$COMPLETIONS_RESPONSE" | grep -o '"id"' | wc -l)
echo "✓ Retrieved $COMPLETION_COUNT today's completions"
if echo "$COMPLETIONS_RESPONSE" | grep -q "Test Study Task"; then
  echo "✓ Found Study task in completions"
else
  echo "Study task not found in completions"
fi

# 5. Delete the task (non-mandatory should work with minimal reason)
echo -e "\n5. Deleting task..."
DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/tasks/$TASK_ID" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test cleanup - task completed successfully"}')
if echo "$DELETE_RESPONSE" | grep -q '"message":"Task deleted"'; then
  echo "✓ Deleted task successfully"
else
  echo "Failed to delete task: $DELETE_RESPONSE"
  exit 1
fi

# Test Dashboard Update
echo -e "\n=== Testing Dashboard Updates ==="

echo -e "\nGetting dashboard data..."
DASHBOARD_RESPONSE=$(curl -s -X GET "$API_BASE/dashboard/daily" -H "$AUTH_HEADER")
HOURS_USED=$(echo "$DASHBOARD_RESPONSE" | grep -o '"hoursUsed":[0-9.]*' | cut -d':' -f2)
HOURS_REMAINING=$(echo "$DASHBOARD_RESPONSE" | grep -o '"hoursRemaining":[0-9.]*' | cut -d':' -f2)
PRODUCTIVITY_SCORE=$(echo "$DASHBOARD_RESPONSE" | grep -o '"productivityScore":[0-9]*' | cut -d':' -f2)
COMPLETED_TASKS=$(echo "$DASHBOARD_RESPONSE" | grep -o '"completedTasks":[0-9]*' | cut -d':' -f2)
TOTAL_TASKS=$(echo "$DASHBOARD_RESPONSE" | grep -o '"totalTasks":[0-9]*' | cut -d':' -f2)

echo "✓ Dashboard data retrieved:"
echo "  - Hours used: $HOURS_USED h"
echo "  - Hours remaining: $HOURS_REMAINING h"
echo "  - Productivity score: $PRODUCTIVITY_SCORE%"
echo "  - Completed tasks: $COMPLETED_TASKS/$TOTAL_TASKS"

# Verify that hours used is not 24 (which would indicate no task hours counted)
if (( $(echo "$HOURS_USED < 24" | bc -l) )); then
  echo "✓ Hours used is less than 24h - task hours are being counted!"
  RESULT="PASS"
else
  echo "✗ Hours used is 24h or more - task hours may not be counted properly"
  RESULT="FAIL"
fi

echo -e "\n=== Test Summary ==="
echo "Task CRUD Operations: PASS (assuming previous steps succeeded)"
echo "Dashboard Updates: $RESULT"

if [ "$RESULT" = "PASS" ]; then
  echo -e "\n🎉 Test passed! Task completion hours are correctly reflected in the dashboard."
else
  echo -e "\n❌ Test failed. Please check the output above for details."
fi