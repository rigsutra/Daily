/**
 * Test script to verify task CRUD operations and dashboard updates
 * This simulates the user flow: create tasks, complete them, check dashboard
 */

import axios from 'axios';

// Configuration
const API_BASE = 'http://localhost:3001/api';
let authToken = null;

// Test user credentials (adjust as needed)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    authToken = response.data.token;
    console.log('✓ Login successful');
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data?.error || error.message);
    return false;
  }
}

function getAuthHeader() {
  return { Authorization: `Bearer ${authToken}` };
}

async function testTaskCRUD() {
  console.log('\n=== Testing Task CRUD Operations ===');
  
  // 1. Get existing tasks
  try {
    const response = await axios.get(`${API_BASE}/tasks`, { headers: getAuthHeader() });
    console.log(`✓ Retrieved ${response.data.length} existing tasks`);
  } catch (error) {
    console.error('✗ Failed to get tasks:', error.response?.data?.error || error.message);
    return false;
  }
  
  // 2. Create a new task with hours unit
  const newTask = {
    title: 'Test Study Task',
    target: 2,
    unit: 'hours',
    mandatory: false
  };
  
  let taskId;
  try {
    const response = await axios.post(`${API_BASE}/tasks`, newTask, { headers: getAuthHeader() });
    taskId = response.data.id;
    console.log(`✓ Created task: "${response.data.title}" (ID: ${taskId})`);
  } catch (error) {
    console.error('✗ Failed to create task:', error.response?.data?.error || error.message);
    return false;
  }
  
  // 3. Complete the task
  try {
    const response = await axios.post(`${API_BASE}/tasks/${taskId}/complete`, { achieved: 2 }, { headers: getAuthHeader() });
    console.log(`✓ Completed task: ${response.data.achieved} hours achieved`);
  } catch (error) {
    console.error('✗ Failed to complete task:', error.response?.data?.error || error.message);
    return false;
  }
  
  // 4. Get today's completions
  try {
    const response = await axios.get(`${API_BASE}/tasks/completions/today`, { headers: getAuthHeader() });
    console.log(`✓ Retrieved ${response.data.length} today's completions`);
    const studyCompletion = response.data.find(c => c.task.title === 'Test Study Task');
    if (studyCompletion) {
      console.log(`  - Study task completion: ${studyCompletion.achieved} hours, completed: ${studyCompletion.completed}`);
    }
  } catch (error) {
    console.error('✗ Failed to get today\'s completions:', error.response?.data?.error || error.message);
    return false;
  }
  
  // 5. Delete the task (non-mandatory should work with minimal reason)
  try {
    const response = await axios.delete(`${API_BASE}/tasks/${taskId}`, {
      headers: getAuthHeader(),
      data: { reason: 'Test cleanup - task completed successfully' }
    });
    console.log(`✓ Deleted task: ${response.data.message}`);
  } catch (error) {
    console.error('✗ Failed to delete task:', error.response?.data?.error || error.message);
    return false;
  }
  
  return true;
}

async function testDashboardUpdate() {
  console.log('\n=== Testing Dashboard Updates ===');
  
  try {
    const response = await axios.get(`${API_BASE}/dashboard/daily`, { headers: getAuthHeader() });
    const dashboard = response.data;
    
    console.log('✓ Dashboard data retrieved:');
    console.log(`  - Hours used: ${dashboard.hoursUsed}h`);
    console.log(`  - Hours remaining: ${dashboard.hoursRemaining}h`);
    console.log(`  - Productivity score: ${dashboard.productivityScore}%`);
    console.log(`  - Completed tasks: ${dashboard.completedTasks}/${dashboard.totalTasks}`);
    console.log(`  - Work hours: ${dashboard.workHours}h`);
    console.log(`  - Study hours: ${dashboard.studyHours}h`);
    
    // Verify that hours used is not 24 (which would indicate no task hours counted)
    if (dashboard.hoursUsed < 24) {
      console.log('✓ Hours used is less than 24h - task hours are being counted!');
      return true;
    } else {
      console.log('✗ Hours used is 24h - task hours may not be counted properly');
      return false;
    }
  } catch (error) {
    console.error('✗ Failed to get dashboard data:', error.response?.data?.error || error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting task and dashboard integration tests...\n');
  
  // Login first
  if (!await login()) {
    console.log('\nCannot proceed without authentication. Please check test credentials.');
    return;
  }
  
  // Test task CRUD
  const crudSuccess = await testTaskCRUD();
  
  // Test dashboard updates
  const dashboardSuccess = await testDashboardUpdate();
  
  console.log('\n=== Test Summary ===');
  console.log(`Task CRUD Operations: ${crudSuccess ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Dashboard Updates: ${dashboardSuccess ? '✓ PASS' : '✗ FAIL'}`);
  
  if (crudSuccess && dashboardSuccess) {
    console.log('\n🎉 All tests passed! Task completion hours are correctly reflected in the dashboard.');
  } else {
    console.log('\n❌ Some tests failed. Please check the output above for details.');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testTaskCRUD, testDashboardUpdate };