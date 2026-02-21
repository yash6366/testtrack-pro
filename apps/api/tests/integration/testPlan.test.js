/**
 * INTEGRATION TESTS - TestPlan CRUD Operations
 * 
 * Tests critical flows after schema update to ensure all new fields work correctly
 * These tests validate:
 * - TestPlan creation with new fields (scope, testCaseIds, plannedDuration, plannerNotes)
 * - TestPlan updates with field modifications
 * - TestPlan execution with testCaseIds array
 * - Field validation and constraints
 * 
 * Run with: node tests/integration/testPlan.test.js
 */

import { getPrismaClient } from '../../lib/prisma.js';
import {
  createTestPlan,
  getTestPlanById,
  updateTestPlan,
  deleteTestPlan,
  executeTestPlan,
  cloneTestPlan,
} from '../../services/testPlanService.js';
import { logInfo, logError } from '../../lib/logger.js';

const prisma = getPrismaClient();

// Test configuration
const TEST_TIMEOUT = 10000;
const PROJECT_ID = 1;
const USER_ID = 1;

// Mock permission context
const createMockPermissionContext = (permission) => ({
  userId: USER_ID,
  action: permission,
  projectId: PROJECT_ID,
  check: () => true,
});

// Test utilities
const testResults = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertExists(value, message) {
  if (value === null || value === undefined) {
    throw new Error(`${message}: value does not exist`);
  }
}

// Test runner
async function runTest(name, testFn) {
  try {
    logInfo(`🧪 Running test: ${name}`);
    await testFn();
    testResults.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    testResults.push({ name, status: 'FAIL', error: error.message });
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

// ============================================
// TEST CASES
// ============================================

async function testCreateTestPlanWithAllFields() {
  const testPlanData = {
    projectId: PROJECT_ID,
    name: `Test Plan - ${Date.now()}`,
    description: 'Test plan with all new fields',
    scope: 'End-to-end API testing',
    testCaseIds: [1, 2, 3],
    plannedDuration: 480, // 8 hours
    plannerNotes: 'Critical path test cases',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
  };

  const testPlan = await createTestPlan(testPlanData, USER_ID, createMockPermissionContext('testPlan:create'));

  assertExists(testPlan.id, 'TestPlan ID');
  assertEqual(testPlan.name, testPlanData.name, 'Plan name');
  assertEqual(testPlan.scope, testPlanData.scope, 'Plan scope');
  assertEqual(testPlan.plannedDuration, testPlanData.plannedDuration, 'Planned duration');
  assertEqual(testPlan.plannerNotes, testPlanData.plannerNotes, 'Planner notes');
  assert(
    Array.isArray(testPlan.testCaseIds) && testPlan.testCaseIds.length === 3,
    'TestCaseIds array'
  );

  return testPlan.id;
}

async function testCreateTestPlanWithoutOptionalFields() {
  const testPlanData = {
    projectId: PROJECT_ID,
    name: `Minimal Test Plan - ${Date.now()}`,
    description: 'Minimal test plan without optional fields',
    // scope, testCaseIds, plannedDuration, plannerNotes are all optional
  };

  const testPlan = await createTestPlan(testPlanData, USER_ID, createMockPermissionContext('testPlan:create'));

  assertExists(testPlan.id, 'TestPlan ID');
  assertEqual(testPlan.scope, null, 'Scope should be null when not provided');
  assertEqual(testPlan.plannerNotes, null, 'Planner notes should be null when not provided');
  assert(
    Array.isArray(testPlan.testCaseIds) && testPlan.testCaseIds.length === 0,
    'TestCaseIds should default to empty array'
  );

  return testPlan.id;
}

async function testUpdateTestPlanFields(testPlanId) {
  const updateData = {
    scope: 'Updated scope - regression testing',
    plannedDuration: 600, // Updated to 10 hours
    plannerNotes: 'Extended duration needed for thorough validation',
    testCaseIds: [4, 5, 6, 7], // Added more test cases
  };

  const updated = await updateTestPlan(
    testPlanId,
    updateData,
    USER_ID,
    PROJECT_ID,
    createMockPermissionContext('testPlan:edit')
  );

  assertEqual(updated.scope, updateData.scope, 'Updated scope');
  assertEqual(updated.plannedDuration, updateData.plannedDuration, 'Updated duration');
  assertEqual(updated.plannerNotes, updateData.plannerNotes, 'Updated notes');
  assert(
    Array.isArray(updated.testCaseIds) && updated.testCaseIds.length === 4,
    'Updated test case IDs'
  );
}

async function testGetTestPlanWithNewFields(testPlanId) {
  const testPlan = await getTestPlanById(testPlanId, PROJECT_ID);

  assertExists(testPlan, 'TestPlan retrieved');
  assert('scope' in testPlan, 'Scope field exists');
  assert('testCaseIds' in testPlan, 'TestCaseIds field exists');
  assert('plannedDuration' in testPlan, 'PlannedDuration field exists');
  assert('plannerNotes' in testPlan, 'PlannerNotes field exists');
  assert(Array.isArray(testPlan.testCaseIds), 'TestCaseIds is an array');
}

async function testExecuteTestPlanWithTestCases(testPlanId) {
  const executionData = {
    name: `Test Run - ${Date.now()}`,
    environment: 'staging',
    buildVersion: '1.0.0',
  };

  const result = await executeTestPlan(
    testPlanId,
    executionData,
    USER_ID,
    PROJECT_ID,
    createMockPermissionContext('testPlan:execute')
  );

  assertExists(result.testRun, 'Test run created');
  assertExists(result.testRun.id, 'Test run ID');
  assert(result.executionCount > 0, 'Executions created for test cases');
}

async function testCloneTestPlanWithFields(testPlanId) {
  const cloned = await cloneTestPlan(
    testPlanId,
    USER_ID,
    PROJECT_ID,
    createMockPermissionContext('testPlan:clone')
  );

  assertExists(cloned.id, 'Cloned TestPlan ID');
  assert(cloned.id !== testPlanId, 'Clone has different ID');
  assert(cloned.name.includes('Copy'), 'Clone name indicates copy');
  assertEqual(cloned.scope, null, 'Scope preserved (or null if not set)');
  assert(Array.isArray(cloned.testCaseIds), 'TestCaseIds preserved as array');
}

async function testTestCaseIdsArrayHandling() {
  const testPlanData = {
    projectId: PROJECT_ID,
    name: `Array Test - ${Date.now()}`,
    testCaseIds: [10, 20, 30, 40, 50], // Large array
  };

  const testPlan = await createTestPlan(testPlanData, USER_ID, createMockPermissionContext('testPlan:create'));

  assert(Array.isArray(testPlan.testCaseIds), 'TestCaseIds is array');
  assertEqual(testPlan.testCaseIds.length, 5, 'Array length preserved');
  assert(testPlan.testCaseIds.includes(10), 'Array contains expected element');
}

async function testDurationValidation() {
  const testPlanData = {
    projectId: PROJECT_ID,
    name: `Duration Test - ${Date.now()}`,
    plannedDuration: 0, // Edge case: 0 minutes
  };

  const testPlan = await createTestPlan(testPlanData, USER_ID, createMockPermissionContext('testPlan:create'));

  assertEqual(testPlan.plannedDuration, 0, 'Zero duration accepted');
}

// ============================================
// TEST SUITE EXECUTION
// ============================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TestPlan Integration Tests');
  console.log('='.repeat(60) + '\n');

  try {
    // Ensure database is available
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified\n');

    // Run tests in sequence
    console.log('📋 Test Group 1: Creation & Field Handling');
    console.log('-'.repeat(60));
    
    let testPlanId1;
    await runTest('Create TestPlan with all new fields', async () => {
      testPlanId1 = await testCreateTestPlanWithAllFields();
    });

    let testPlanId2;
    await runTest('Create TestPlan without optional fields', async () => {
      testPlanId2 = await testCreateTestPlanWithoutOptionalFields();
    });

    await runTest('TestCaseIds array handling (large arrays)', async () => {
      await testTestCaseIdsArrayHandling();
    });

    await runTest('Duration field with edge cases', async () => {
      await testDurationValidation();
    });

    console.log('\n📋 Test Group 2: Update Operations');
    console.log('-'.repeat(60));

    await runTest('Update TestPlan fields', async () => {
      await updateTestPlan(
        testPlanId1,
        {
          scope: 'Updated scope',
          plannedDuration: 600,
          plannerNotes: 'Extended duration',
          testCaseIds: [4, 5, 6, 7],
        },
        USER_ID,
        PROJECT_ID,
        createMockPermissionContext('testPlan:edit')
      );
    });

    console.log('\n📋 Test Group 3: Retrieval & Verification');
    console.log('-'.repeat(60));

    await runTest('Get TestPlan and verify new fields present', async () => {
      await testGetTestPlanWithNewFields(testPlanId1);
    });

    console.log('\n📋 Test Group 4: Execution');
    console.log('-'.repeat(60));

    await runTest('Execute TestPlan with test case IDs', async () => {
      await testExecuteTestPlanWithTestCases(testPlanId1);
    });

    console.log('\n📋 Test Group 5: Advanced Operations');
    console.log('-'.repeat(60));

    await runTest('Clone TestPlan preserves field structure', async () => {
      await cloneTestPlanWithFields(testPlanId1);
    });

    // Cleanup
    console.log('\n🧹 Cleanup');
    console.log('-'.repeat(60));
    await runTest('Delete test plans', async () => {
      await deleteTestPlan(testPlanId1, USER_ID, PROJECT_ID, createMockPermissionContext('testPlan:delete'));
      await deleteTestPlan(testPlanId2, USER_ID, PROJECT_ID, createMockPermissionContext('testPlan:delete'));
    });

  } catch (error) {
    logError('Test suite failed:', error);
    console.error('❌ Test suite error:', error.message);
  } finally {
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const total = testResults.length;

    testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (result.error) {
        console.log(`   └─ ${result.error}`);
      }
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');

    if (failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`⚠️  ${failed} test(s) failed`);
    }

    process.exit(failed === 0 ? 0 : 1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
