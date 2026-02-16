/**
 * TEST PLAN SERVICE
 * CRUD operations for test plans and execution management
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';

const prisma = getPrismaClient();

// Create test plan
export async function createTestPlan(data, userId) {
  const { projectId, name, description, scope, startDate, endDate, plannedDuration, plannerNotes, testCaseIds = [] } = data;

  if (!projectId || !name) throw new Error('ProjectId and name are required');

  const existing = await prisma.testPlan.findFirst({
    where: { projectId: Number(projectId), name },
  });
  if (existing) throw new Error('Test plan with this name already exists');

  const testPlan = await prisma.testPlan.create({
    data: {
      projectId: Number(projectId),
      name,
      description: description || null,
      scope: scope || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      plannedDuration: plannedDuration || null,
      plannerNotes: plannerNotes || null,
      testCaseIds: testCaseIds.map(id => Number(id)),
      createdBy: userId,
    },
    include: { planner: { select: { id: true, name: true, email: true } } },
  });

  await logAuditAction(userId, 'TESTPLAN_CREATED', {
    resourceType: 'TESTPLAN',
    resourceId: testPlan.id,
    resourceName: testPlan.name,
    projectId: testPlan.projectId,
  });

  return testPlan;
}

// Get all test plans for project
export async function getProjectTestPlans(projectId, filters = {}, pagination = {}) {
  const { status, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  const { skip = 0, take = 20 } = pagination;

  const whereClause = { projectId: Number(projectId) };
  if (status) whereClause.status = status;
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [testPlans, total] = await Promise.all([
    prisma.testPlan.findMany({
      where: whereClause,
      include: { planner: { select: { id: true, name: true, email: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: Number(skip),
      take: Number(take),
    }),
    prisma.testPlan.count({ where: whereClause }),
  ]);

  return {
    data: testPlans.map(tp => ({
      ...tp,
      totalTestCases: tp.testCaseIds?.length || 0,
    })),
    total,
    skip: Number(skip),
    take: Number(take),
  };
}

// Get test plan by ID
export async function getTestPlanById(testPlanId) {
  const testPlan = await prisma.testPlan.findUnique({
    where: { id: Number(testPlanId) },
    include: {
      planner: { select: { id: true, name: true, email: true } },
      createdRuns: {
        select: { id: true, name: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!testPlan) throw new Error('Test plan not found');

  // Fetch test case details
  const testCases = testPlan.testCaseIds?.length > 0
    ? await prisma.testCase.findMany({
        where: { id: { in: testPlan.testCaseIds.map(id => Number(id)) } },
        select: { id: true, name: true, status: true, priority: true },
      })
    : [];

  return {
    ...testPlan,
    totalTestCases: testPlan.testCaseIds?.length || 0,
    testCases,
  };
}

// Update test plan
export async function updateTestPlan(testPlanId, data, userId) {
  const testPlan = await prisma.testPlan.findUnique({ where: { id: Number(testPlanId) } });
  if (!testPlan) throw new Error('Test plan not found');

  const { name, description, scope, status, startDate, endDate, plannedDuration, plannerNotes, testCaseIds } = data;

  if (name && name !== testPlan.name) {
    const existing = await prisma.testPlan.findFirst({
      where: { projectId: testPlan.projectId, name },
    });
    if (existing) throw new Error('Test plan with this name already exists');
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (scope !== undefined) updateData.scope = scope;
  if (status) updateData.status = status;
  if (startDate) updateData.startDate = new Date(startDate);
  if (endDate) updateData.endDate = new Date(endDate);
  if (plannedDuration) updateData.plannedDuration = plannedDuration;
  if (plannerNotes !== undefined) updateData.plannerNotes = plannerNotes;
  if (testCaseIds) updateData.testCaseIds = testCaseIds.map(id => Number(id));

  const updated = await prisma.testPlan.update({
    where: { id: Number(testPlanId) },
    data: updateData,
    include: { planner: { select: { id: true, name: true, email: true } } },
  });

  await logAuditAction(userId, 'TESTPLAN_UPDATED', {
    resourceType: 'TESTPLAN',
    resourceId: testPlanId,
    resourceName: updated.name,
    projectId: updated.projectId,
  });

  return updated;
}

// Delete test plan
export async function deleteTestPlan(testPlanId, userId) {
  const testPlan = await prisma.testPlan.findUnique({ where: { id: Number(testPlanId) } });
  if (!testPlan) throw new Error('Test plan not found');

  await prisma.testPlan.delete({ where: { id: Number(testPlanId) } });

  await logAuditAction(userId, 'TESTPLAN_DELETED', {
    resourceType: 'TESTPLAN',
    resourceId: testPlanId,
    resourceName: testPlan.name,
    projectId: testPlan.projectId,
  });

  return testPlan;
}

// Execute test plan (create test run)
export async function executeTestPlan(testPlanId, executionData, userId) {
  const testPlan = await prisma.testPlan.findUnique({ where: { id: Number(testPlanId) } });
  if (!testPlan) throw new Error('Test plan not found');

  const { name, environment, buildVersion } = executionData;

  if (!testPlan.testCaseIds || testPlan.testCaseIds.length === 0) {
    throw new Error('Test plan has no test cases');
  }

  // Create test run
  const testRun = await prisma.testRun.create({
    data: {
      projectId: testPlan.projectId,
      testPlanId: testPlan.id,
      name: name || `${testPlan.name} - Run ${new Date().toISOString().split('T')[0]}`,
      description: testPlan.description,
      environment: environment || null,
      buildVersion: buildVersion || null,
      totalTestCases: testPlan.testCaseIds.length,
      status: 'PLANNED',
      createdBy: userId,
      executedBy: userId,
      actualStartDate: new Date(),
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      executor: { select: { id: true, name: true, email: true } },
    },
  });

  // Create test executions for each test case
  const executions = await Promise.all(
    testPlan.testCaseIds.map(tcId =>
      prisma.testExecution.create({
        data: {
          testRunId: testRun.id,
          testCaseId: Number(tcId),
          status: 'BLOCKED',
          executedBy: userId,
        },
      })
    )
  );

  // Update test plan status
  await prisma.testPlan.update({
    where: { id: testPlan.id },
    data: { status: 'IN_PROGRESS' },
  });

  await logAuditAction(userId, 'TESTPLAN_EXECUTED', {
    resourceType: 'TESTPLAN',
    resourceId: testPlanId,
    resourceName: testPlan.name,
    projectId: testPlan.projectId,
    description: `Test run created: ${testRun.name}`,
  });

  return { testRun, executionCount: executions.length };
}

// Clone test plan
export async function cloneTestPlan(testPlanId, userId) {
  const testPlan = await prisma.testPlan.findUnique({ where: { id: Number(testPlanId) } });
  if (!testPlan) throw new Error('Test plan not found');

  const clonedPlan = await prisma.testPlan.create({
    data: {
      ...testPlan,
      id: undefined,
      createdBy: userId,
      name: `${testPlan.name} (Copy)`,
      createdAt: undefined,
      updatedAt: undefined,
      status: 'DRAFT',
    },
    include: { planner: { select: { id: true, name: true, email: true } } },
  });

  await logAuditAction(userId, 'TESTPLAN_CLONED', {
    resourceType: 'TESTPLAN',
    resourceId: clonedPlan.id,
    resourceName: clonedPlan.name,
    projectId: clonedPlan.projectId,
    description: `Cloned from test plan ${testPlan.name}`,
  });

  return clonedPlan;
}

// Get test plan runs
export async function getTestPlanRuns(testPlanId) {
  const runs = await prisma.testRun.findMany({
    where: { testPlanId: Number(testPlanId) },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      executor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return runs;
}
