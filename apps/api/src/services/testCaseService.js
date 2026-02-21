/**
 * TEST CASE MANAGEMENT SERVICE
 * Handles CRUD operations, cloning, templates, import/export for test cases
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import { indexTestCase } from './searchIndexService.js';
import { assertPermissionContext } from '../lib/policy.js';

const prisma = getPrismaClient();

/**
 * Create a new test case with steps
 * @param {Object} data - Test case data
 * @param {number} userId - Creator user ID
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Created test case
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function createTestCase(data, userId, auditContext = {}, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'testCase:create', { projectId: data.projectId });

  const {
    projectId,
    name,
    description,
    preconditions,
    testData,
    environment,
    type = 'FUNCTIONAL',
    priority = 'P2',
    severity = 'MINOR',
    status = 'DRAFT',
    estimatedDurationMinutes,
    moduleArea,
    tags = [],
    steps = [],
    assignedToId,
    ownedById,
  } = data;

  // Validate required fields
  if (!projectId || !name) {
    throw new Error('ProjectId and name are required');
  }

  // Check if test case with same name exists in project
  const existing = await prisma.testCase.findFirst({
    where: {
      projectId: Number(projectId),
      name,
      isDeleted: false,
    },
  });

  if (existing) {
    throw new Error('Test case with this name already exists in project');
  }

  // Create test case with steps
  const testCase = await prisma.testCase.create({
    data: {
      projectId: Number(projectId),
      name,
      description: description || null,
      preconditions: preconditions || null,
      testData: testData || null,
      environment: environment || null,
      type,
      priority,
      severity,
      status,
      estimatedDurationMinutes: estimatedDurationMinutes || null,
      moduleArea: moduleArea || null,
      tags: tags.length > 0 ? tags : [],
      assignedToId: assignedToId ? Number(assignedToId) : null,
      ownedById: ownedById ? Number(ownedById) : null,
      createdBy: userId,
      lastModifiedBy: userId,
      steps: {
        create: steps.map((step, index) => ({
          stepNumber: index + 1,
          action: step.action,
          expectedResult: step.expectedResult,
          notes: step.notes || null,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      creator: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'TESTCASE_CREATED', {
    resourceType: 'TESTCASE',
    resourceId: testCase.id,
    resourceName: testCase.name,
    projectId: testCase.projectId,
    description: `Created test case: ${testCase.name}`,
    newValues: JSON.stringify({
      name: testCase.name,
      type: testCase.type,
      priority: testCase.priority,
      stepCount: testCase.steps.length,
    }),
    ...auditContext,
  });

  // Index for search
  try {
    await indexTestCase(testCase.id, testCase.projectId);
  } catch (error) {
    // Non-critical error, log but don't fail the operation
  }

  return testCase;
}

/**
 * Update test case
 * @param {number} testCaseId - Test case ID
 * @param {Object} updates - Fields to update
 * @param {number} userId - Editor user ID
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Updated test case
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function updateTestCase(testCaseId, updates, userId, auditContext = {}, permissionContext = null) {
  const existing = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: {
      steps: true,
    },
  });

  if (!existing) {
    throw new Error('Test case not found');
  }

  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'testCase:edit', { projectId: existing.projectId });

  if (existing.isDeleted) {
    throw new Error('Cannot update deleted test case');
  }

  const {
    name,
    description,
    preconditions,
    testData,
    environment,
    type,
    priority,
    severity,
    status,
    estimatedDurationMinutes,
    moduleArea,
    tags,
    steps,
    assignedToId,
    ownedById,
    changeNote,
    automationStatus,
  } = updates;

  // Capture current state for version snapshot (before update)
  const versionSnapshot = {
    testCaseId: existing.id,
    caseVersion: existing.version,
    name: existing.name,
    description: existing.description,
    type: existing.type,
    priority: existing.priority,
    severity: existing.severity,
    status: existing.status,
    automationStatus: existing.automationStatus,
    preconditions: existing.preconditions,
    postconditions: null, // Not yet in TestCase schema
    expectedResult: null, // Not on test case level
    tags: existing.tags,
    steps: existing.steps.map(step => ({
      action: step.action,
      expectedResult: step.expectedResult,
      notes: step.notes,
    })),
    changeNote: changeNote || null,
    changedBy: userId,
    changedAt: new Date(),
  };

  // Update test case with version increment and create version snapshot in transaction
  const [updated] = await prisma.$transaction([
    prisma.testCase.update({
      where: { id: testCaseId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(preconditions !== undefined && { preconditions }),
        ...(testData !== undefined && { testData }),
        ...(environment !== undefined && { environment }),
        ...(type && { type }),
        ...(priority && { priority }),
        ...(severity && { severity }),
        ...(status && { status }),
        ...(estimatedDurationMinutes !== undefined && { estimatedDurationMinutes }),
        ...(moduleArea !== undefined && { moduleArea }),
        ...(tags !== undefined && { tags }),
        ...(automationStatus && { automationStatus }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId ? Number(assignedToId) : null }),
        ...(ownedById !== undefined && { ownedById: ownedById ? Number(ownedById) : null }),
        lastModifiedBy: userId,
        version: { increment: 1 },
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        assignedTo: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.testCaseVersion.create({
      data: versionSnapshot,
    }),
  ]);

  // Update steps if provided
  if (steps && Array.isArray(steps)) {
    const existingSteps = await prisma.testStep.findMany({
      where: { testCaseId },
      select: {
        id: true,
        stepNumber: true,
        _count: { select: { executionSteps: true } },
      },
      orderBy: { stepNumber: 'asc' },
    });

    const normalizedSteps = steps.map((step) => ({
      action: step.action,
      expectedResult: step.expectedResult,
      notes: step.notes || null,
    }));

    const operations = [];
    normalizedSteps.forEach((step, index) => {
      const existingStep = existingSteps[index];
      if (existingStep) {
        operations.push(
          prisma.testStep.update({
            where: { id: existingStep.id },
            data: {
              stepNumber: index + 1,
              action: step.action,
              expectedResult: step.expectedResult,
              notes: step.notes,
            },
          })
        );
      } else {
        operations.push(
          prisma.testStep.create({
            data: {
              testCaseId,
              stepNumber: index + 1,
              action: step.action,
              expectedResult: step.expectedResult,
              notes: step.notes,
            },
          })
        );
      }
    });

    const extraSteps = existingSteps.slice(normalizedSteps.length);
    const lockedSteps = extraSteps.filter((step) => step._count.executionSteps > 0);
    if (lockedSteps.length > 0) {
      throw new Error('Cannot remove steps that have execution history.');
    }

    if (extraSteps.length > 0) {
      operations.push(
        prisma.testStep.deleteMany({
          where: { id: { in: extraSteps.map((step) => step.id) } },
        })
      );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    updated = await prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        assignedTo: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });
  }

  // Audit log for test case update
  await logAuditAction(userId, 'TESTCASE_EDITED', {
    resourceType: 'TESTCASE',
    resourceId: testCaseId,
    resourceName: updated.name,
    projectId: updated.projectId,
    description: `Updated test case: ${updated.name}`,
    oldValues: JSON.stringify({
      name: existing.name,
      type: existing.type,
      priority: existing.priority,
      severity: existing.severity,
      status: existing.status,
      automationStatus: existing.automationStatus,
      description: existing.description,
    }),
    newValues: JSON.stringify({
      name: updated.name,
      type: updated.type,
      priority: updated.priority,
      severity: updated.severity,
      status: updated.status,
      automationStatus: updated.automationStatus,
      description: updated.description,
    }),
    ...auditContext,
  });

  // Audit log for version creation
  await logAuditAction(userId, 'TESTCASE_VERSION_CREATED', {
    resourceType: 'TESTCASE_VERSION',
    resourceId: testCaseId,
    resourceName: updated.name,
    projectId: updated.projectId,
    description: `Created version ${existing.version} snapshot${changeNote ? ': ' + changeNote : ''}`,
    metadata: { version: existing.version, changeNote },
    ...auditContext,
  });

  return updated;
}

/**
 * Soft-delete test case
 * @param {number} testCaseId - Test case ID
 * @param {number} userId - User deleting
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Deleted test case
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function deleteTestCase(testCaseId, userId, auditContext = {}, permissionContext = null) {
  const existing = await prisma.testCase.findUnique({
    where: { id: testCaseId },
  });

  if (!existing) {
    throw new Error('Test case not found');
  }

  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'testCase:delete', { projectId: existing.projectId });

  if (existing.isDeleted) {
    throw new Error('Test case already deleted');
  }

  const deleted = await prisma.testCase.update({
    where: { id: testCaseId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    },
    include: {
      creator: { select: { name: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'TESTCASE_DELETED', {
    resourceType: 'TESTCASE',
    resourceId: testCaseId,
    resourceName: existing.name,
    projectId: existing.projectId,
    description: `Deleted test case: ${existing.name}`,
    ...auditContext,
  });

  return deleted;
}

/**
 * Restore soft-deleted test case
 * @param {number} testCaseId - Test case ID
 * @param {number} userId - User restoring
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Restored test case
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function restoreTestCase(testCaseId, userId, auditContext = {}, permissionContext = null) {
  const existing = await prisma.testCase.findUnique({
    where: { id: testCaseId },
  });

  if (!existing) {
    throw new Error('Test case not found');
  }

  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'testCase:create', { projectId: existing.projectId });

  if (!existing.isDeleted) {
    throw new Error('Test case is not deleted');
  }

  const restored = await prisma.testCase.update({
    where: { id: testCaseId },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    },
  });

  // Audit log
  await logAuditAction(userId, 'TESTCASE_RESTORED', {
    resourceType: 'TESTCASE',
    resourceId: testCaseId,
    resourceName: existing.name,
    projectId: existing.projectId,
    description: `Restored test case: ${existing.name}`,
    ...auditContext,
  });

  return restored;
}

/**
 * Clone test case (duplicate with new name)
 * @param {number} testCaseId - Source test case ID
 * @param {string} newName - New name for clone
 * @param {number} userId - User cloning
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Cloned test case
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function cloneTestCase(testCaseId, newName, userId, auditContext = {}, permissionContext = null) {
  const source = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
  });

  if (!source) {
    throw new Error('Source test case not found');
  }

  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'testCase:clone', { projectId: source.projectId });

  if (source.isDeleted) {
    throw new Error('Cannot clone deleted test case');
  }

  // Check if new name already exists
  const existing = await prisma.testCase.findFirst({
    where: {
      projectId: source.projectId,
      name: newName,
      isDeleted: false,
    },
  });

  if (existing) {
    throw new Error('Test case with this name already exists');
  }

  // Create clone
  const cloned = await prisma.testCase.create({
    data: {
      projectId: source.projectId,
      name: newName,
      description: source.description,
      type: source.type,
      priority: source.priority,
      severity: source.severity,
      status: 'DRAFT', // Always start as draft
      estimatedDurationMinutes: source.estimatedDurationMinutes,
      moduleArea: source.moduleArea,
      tags: source.tags,
      createdBy: userId,
      lastModifiedBy: userId,
      steps: {
        create: source.steps.map((step) => ({
          stepNumber: step.stepNumber,
          action: step.action,
          expectedResult: step.expectedResult,
          notes: step.notes,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
  });

  // Audit log
  await logAuditAction(userId, 'TESTCASE_CREATED', {
    resourceType: 'TESTCASE',
    resourceId: cloned.id,
    resourceName: cloned.name,
    projectId: cloned.projectId,
    description: `Cloned test case from: ${source.name}`,
    newValues: JSON.stringify({
      clonedFrom: source.id,
      clonedFromName: source.name,
    }),
    ...auditContext,
  });

  return cloned;
}

/**
 * Get test cases for project with filters
 * @param {number} projectId - Project ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Test cases
 */
export async function getProjectTestCases(projectId, filters = {}) {
  const {
    type,
    priority,
    status,
    includeDeleted = false,
    search,
    skip = 0,
    take = 50,
  } = filters;

  const where = {
    projectId: Number(projectId),
    ...(type && { type }),
    ...(priority && { priority }),
    ...(status && { status }),
    ...(includeDeleted ? {} : { isDeleted: false }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [testCases, total] = await Promise.all([
    prisma.testCase.findMany({
      where,
      include: {
        steps: {
          select: {
            id: true,
            stepNumber: true,
            action: true,
            expectedResult: true,
          },
          orderBy: { stepNumber: 'asc' },
        },
        creator: { select: { id: true, name: true } },
        lastModifier: { select: { id: true, name: true } },
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.testCase.count({ where }),
  ]);

  return { testCases, total, skip, take };
}

/**
 * Export test cases to CSV format
 * @param {number} projectId - Project ID
 * @returns {Promise<string>} CSV string
 */
export async function exportTestCasesToCSV(projectId) {
  const testCases = await prisma.testCase.findMany({
    where: {
      projectId: Number(projectId),
      isDeleted: false,
    },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  });

  // CSV header
  let csv = 'ID,Name,Description,Type,Priority,Severity,Status,Module,Tags,Preconditions,TestData,Environment,Steps\n';

  // CSV rows
  for (const tc of testCases) {
    const stepsText = tc.steps
      .map((s) => `Step ${s.stepNumber}: ${s.action} | Expected: ${s.expectedResult}`)
      .join(' | ');

    csv += `${tc.id},"${tc.name}","${tc.description || ''}",${tc.type},${tc.priority},${tc.severity},${tc.status},"${tc.moduleArea || ''}","${tc.tags.join(',')}","${tc.preconditions || ''}","${tc.testData || ''}","${tc.environment || ''}","${stepsText}"\n`;
  }

  return csv;
}

/**
 * Import test cases from CSV
 * @param {number} projectId - Project ID
 * @param {string} csvContent - CSV file content
 * @param {number} userId - User importing
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Import results
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function importTestCasesFromCSV(projectId, csvContent, userId, auditContext = {}, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'testCase:import', { projectId });

  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain header and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const results = {
    imported: [],
    failed: [],
    total: 0,
  };

  // Process each CSV row
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const values = parseCSVRow(row);
    results.total++;

    try {
      // Parse row data
      const testCaseData = {
        projectId: Number(projectId),
        name: values[1]?.trim() || `Imported Test Case ${i}`,
        description: values[2]?.trim() || null,
        type: values[3]?.trim() || 'FUNCTIONAL',
        priority: values[4]?.trim() || 'P2',
        severity: values[5]?.trim() || 'MINOR',
        status: values[6]?.trim() || 'DRAFT',
        moduleArea: values[7]?.trim() || null,
        tags: values[8]?.trim().split(';').map(t => t.trim()).filter(t => t) || [],
        preconditions: values[9]?.trim() || null,
        testData: values[10]?.trim() || null,
        environment: values[11]?.trim() || null,
      };

      // Check if test case already exists
      const existing = await prisma.testCase.findFirst({
        where: {
          projectId: Number(projectId),
          name: testCaseData.name,
          isDeleted: false,
        },
      });

      if (existing) {
        results.failed.push({
          row: i + 1,
          name: testCaseData.name,
          error: 'Test case with this name already exists',
        });
        continue;
      }

      // Create test case
      const testCase = await prisma.testCase.create({
        data: {
          ...testCaseData,
          createdBy: userId,
          lastModifiedBy: userId,
        },
        include: {
          creator: { select: { id: true, name: true } },
        },
      });

      results.imported.push({
        id: testCase.id,
        name: testCase.name,
      });

      // Audit log
      await logAuditAction(userId, 'TESTCASE_CREATED', {
        resourceType: 'TESTCASE',
        resourceId: testCase.id,
        resourceName: testCase.name,
        projectId: testCase.projectId,
        description: `Imported test case: ${testCase.name}`,
        ...auditContext,
      });
    } catch (error) {
      results.failed.push({
        row: i + 1,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Helper function to parse CSV row accounting for quoted fields
 * @param {string} row - CSV row
 * @returns {Array<string>} Parsed values
 */
function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Assign test case to a user
 * @param {number} testCaseId - Test case ID
 * @param {number} assignedToId - User ID to assign to
 * @param {number} userId - Current user ID
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Updated test case
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function assignTestCase(testCaseId, assignedToId, userId, auditContext = {}, permissionContext = null) {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
  });

  if (!testCase) {
    throw new Error('Test case not found');
  }

  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'testCase:assign', { projectId: testCase.projectId });

  const updated = await prisma.testCase.update({
    where: { id: testCaseId },
    data: {
      assignedToId: Number(assignedToId),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'TESTCASE_EDITED', {
    resourceType: 'TESTCASE',
    resourceId: testCaseId,
    resourceName: testCase.name,
    projectId: testCase.projectId,
    description: `Assigned test case to user: ${updated.assignedTo?.name}`,
    ...auditContext,
  });

  return updated;
}

/**
 * Set test case owner
 * @param {number} testCaseId - Test case ID
 * @param {number} ownedById - User ID to set as owner
 * @param {number} userId - Current user ID
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Updated test case
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function setTestCaseOwner(testCaseId, ownedById, userId, auditContext = {}, permissionContext = null) {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
  });

  if (!testCase) {
    throw new Error('Test case not found');
  }

  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'testCase:assign', { projectId: testCase.projectId });

  const updated = await prisma.testCase.update({
    where: { id: testCaseId },
    data: {
      ownedById: Number(ownedById),
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'TESTCASE_EDITED', {
    resourceType: 'TESTCASE',
    resourceId: testCaseId,
    resourceName: testCase.name,
    projectId: testCase.projectId,
    description: `Set test case owner to: ${updated.owner?.name}`,
    ...auditContext,
  });

  return updated;
}

/**
 * Get test cases assigned to a user
 * @param {number} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Test cases
 */
export async function getUserAssignedTestCases(userId, filters = {}) {
  const { projectId, status, skip = 0, take = 50 } = filters;

  const where = {
    assignedToId: Number(userId),
    isDeleted: false,
    ...(projectId && { projectId: Number(projectId) }),
    ...(status && { status }),
  };

  const [testCases, total] = await Promise.all([
    prisma.testCase.findMany({
      where,
      include: {
        steps: {
          select: {
            id: true,
            stepNumber: true,
            action: true,
            expectedResult: true,
          },
          orderBy: { stepNumber: 'asc' },
        },
        creator: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.testCase.count({ where }),
  ]);

  return { testCases, total, skip, take };
}

/**
 * Get test cases owned by a user
 * @param {number} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Test cases
 */
export async function getUserOwnedTestCases(userId, filters = {}) {
  const { projectId, status, skip = 0, take = 50 } = filters;

  const where = {
    ownedById: Number(userId),
    isDeleted: false,
    ...(projectId && { projectId: Number(projectId) }),
    ...(status && { status }),
  };

  const [testCases, total] = await Promise.all([
    prisma.testCase.findMany({
      where,
      include: {
        steps: {
          select: {
            id: true,
            stepNumber: true,
            action: true,
            expectedResult: true,
          },
          orderBy: { stepNumber: 'asc' },
        },
        creator: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.testCase.count({ where }),
  ]);

  return { testCases, total, skip, take };
}

export default {
  createTestCase,
  updateTestCase,
  deleteTestCase,
  restoreTestCase,
  cloneTestCase,
  getProjectTestCases,
  exportTestCasesToCSV,
  importTestCasesFromCSV,
  assignTestCase,
  setTestCaseOwner,
  getUserAssignedTestCases,
  getUserOwnedTestCases,
};
