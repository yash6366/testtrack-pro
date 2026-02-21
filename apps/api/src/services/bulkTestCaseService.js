/**
 * BULK TEST CASE OPERATIONS SERVICE
 * Handles bulk update, delete, export operations for test cases
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import { validateBulkPermissions } from '../lib/testCasePermissions.js';
import { assertPermissionContext } from '../lib/policy.js';
import { exportTestCasesToCSV } from './testCaseService.js';

const prisma = getPrismaClient();

/**
 * Bulk update test cases
 * @param {Object} data - Bulk update data
 * @param {number} userId - User performing the operation
 * @param {string} userRole - User's role
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Update results
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function bulkUpdateTestCases(data, userId, userRole, auditContext = {}, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }

  const { testCaseIds = [], updates = {}, projectId = null } = data;

  if (!testCaseIds || testCaseIds.length === 0) {
    throw new Error('No test cases selected for bulk update');
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates specified');
  }

  // Assert permission context for bulk edit
  if (projectId) {
    assertPermissionContext(permissionContext, 'testCase:edit', { projectId: Number(projectId) });
  }

  const results = {
    updated: [],
    failed: [],
    denied: [],
    total: testCaseIds.length,
  };

  // Validate permissions
  const permissions = await validateBulkPermissions(testCaseIds, userId, userRole, 'edit', projectId);
  
  if (permissions.denied.length > 0) {
    results.denied = permissions.denied;
  }

  if (permissions.allowed.length === 0) {
    throw new Error('You do not have permission to update any of the selected test cases');
  }

  // Validate test cases belong to user or user has permission
  const testCases = await prisma.testCase.findMany({
    where: {
      id: { in: permissions.allowed.map(id => Number(id)) },
      isDeleted: false,
    },
    select: { id: true, name: true, projectId: true },
  });

  if (testCases.length === 0) {
    throw new Error('No valid test cases found');
  }

  // Prepare update data
  const updateData = {
    ...(updates.status && { status: updates.status }),
    ...(updates.priority && { priority: updates.priority }),
    ...(updates.severity && { severity: updates.severity }),
    ...(updates.type && { type: updates.type }),
    ...(updates.assignedToId !== undefined && { 
      assignedToId: updates.assignedToId ? Number(updates.assignedToId) : null 
    }),
    ...(updates.ownedById !== undefined && { 
      ownedById: updates.ownedById ? Number(updates.ownedById) : null 
    }),
    ...(updates.moduleArea !== undefined && { moduleArea: updates.moduleArea }),
    ...(updates.tags && { tags: updates.tags }),
    lastModifiedBy: userId,
    version: { increment: 1 },
  };

  // Perform bulk update
  for (const testCase of testCases) {
    try {
      await prisma.testCase.update({
        where: { id: testCase.id },
        data: updateData,
      });

      results.updated.push({
        id: testCase.id,
        name: testCase.name,
      });

      // Audit log for each update
      await logAuditAction(userId, 'TESTCASE_EDITED', {
        resourceType: 'TESTCASE',
        resourceId: testCase.id,
        resourceName: testCase.name,
        projectId: testCase.projectId,
        description: `Bulk updated test case: ${testCase.name}`,
        newValues: JSON.stringify(updates),
        ...auditContext,
      });
    } catch (error) {
      results.failed.push({
        id: testCase.id,
        name: testCase.name,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Bulk delete test cases (soft delete)
 * @param {Array<number>} testCaseIds - Array of test case IDs
 * @param {number} userId - User performing the operation
 * @param {string} userRole - User's role
 * @returns {Promise<Object>} Delete results
 */
export async function bulkDeleteTestCases(testCaseIds, userId, userRole, auditContext = {}, projectId = null, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }

  if (!testCaseIds || testCaseIds.length === 0) {
    throw new Error('No test cases selected for bulk delete');
  }

  // Assert permission context for bulk delete
  if (projectId) {
    assertPermissionContext(permissionContext, 'testCase:delete', { projectId: Number(projectId) });
  }

  const results = {
    deleted: [],
    failed: [],
    denied: [],
    total: testCaseIds.length,
  };

  // Validate permissions
  const permissions = await validateBulkPermissions(testCaseIds, userId, userRole, 'delete', projectId);
  
  if (permissions.denied.length > 0) {
    results.denied = permissions.denied;
  }

  if (permissions.allowed.length === 0) {
    throw new Error('You do not have permission to delete any of the selected test cases');
  }

  // Validate test cases exist and are not already deleted
  const testCases = await prisma.testCase.findMany({
    where: {
      id: { in: permissions.allowed.map(id => Number(id)) },
      isDeleted: false,
    },
    select: { id: true, name: true, projectId: true },
  });

  if (testCases.length === 0) {
    throw new Error('No valid test cases found for deletion');
  }

  // Perform bulk delete
  for (const testCase of testCases) {
    try {
      await prisma.testCase.update({
        where: { id: testCase.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      results.deleted.push({
        id: testCase.id,
        name: testCase.name,
      });

      // Audit log for each deletion
      await logAuditAction(userId, 'TESTCASE_DELETED', {
        resourceType: 'TESTCASE',
        resourceId: testCase.id,
        resourceName: testCase.name,
        projectId: testCase.projectId,
        description: `Bulk deleted test case: ${testCase.name}`,
        ...auditContext,
      });
    } catch (error) {
      results.failed.push({
        id: testCase.id,
        name: testCase.name,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Bulk export test cases to CSV
 * @param {Object} data - Export parameters
 * @returns {Promise<string>} CSV content
 */
export async function bulkExportTestCases(data) {
  const { projectId, testCaseIds, filters = {} } = data;

  let where = {
    isDeleted: false,
  };

  if (projectId) {
    where.projectId = Number(projectId);
  }

  if (testCaseIds && testCaseIds.length > 0) {
    where.id = { in: testCaseIds.map(id => Number(id)) };
  } else {
    // Apply filters if no specific IDs provided
    if (filters.type) where.type = filters.type;
    if (filters.priority) where.priority = filters.priority;
    if (filters.status) where.status = filters.status;
    if (filters.moduleArea) where.moduleArea = filters.moduleArea;
  }

  // Fetch test cases
  const testCases = await prisma.testCase.findMany({
    where,
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      creator: { select: { name: true } },
      assignedTo: { select: { name: true } },
      owner: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
  });

  if (testCases.length === 0) {
    throw new Error('No test cases found for export');
  }

  // Generate CSV
  const headers = [
    'ID',
    'Name',
    'Description',
    'Type',
    'Priority',
    'Severity',
    'Status',
    'Module/Area',
    'Tags',
    'Preconditions',
    'Test Data',
    'Environment',
    'Estimated Duration (min)',
    'Steps',
    'Assigned To',
    'Owner',
    'Created By',
    'Created At',
  ];

  let csvContent = headers.join(',') + '\n';

  for (const tc of testCases) {
    const steps = tc.steps
      .map(
        (s, idx) =>
          `Step ${s.stepNumber}: ${s.action} | Expected: ${s.expectedResult}`
      )
      .join('; ');

    const row = [
      tc.id,
      `"${tc.name.replace(/"/g, '""')}"`,
      `"${(tc.description || '').replace(/"/g, '""')}"`,
      tc.type,
      tc.priority,
      tc.severity,
      tc.status,
      `"${(tc.moduleArea || '').replace(/"/g, '""')}"`,
      `"${(tc.tags || []).join('; ')}"`,
      `"${(tc.preconditions || '').replace(/"/g, '""')}"`,
      `"${(tc.testData || '').replace(/"/g, '""')}"`,
      `"${(tc.environment || '').replace(/"/g, '""')}"`,
      tc.estimatedDurationMinutes || '',
      `"${steps.replace(/"/g, '""')}"`,
      tc.assignedTo?.name || '',
      tc.owner?.name || '',
      tc.creator?.name || '',
      tc.createdAt.toISOString(),
    ];

    csvContent += row.join(',') + '\n';
  }

  return csvContent;
}

/**
 * Bulk restore deleted test cases
 * @param {Array<number>} testCaseIds - Array of test case IDs
 * @param {number} userId - User performing the operation
 * @returns {Promise<Object>} Restore results
 */
export async function bulkRestoreTestCases(testCaseIds, userId, auditContext = {}, projectId = null) {
  if (!testCaseIds || testCaseIds.length === 0) {
    throw new Error('No test cases selected for bulk restore');
  }

  const results = {
    restored: [],
    failed: [],
    total: testCaseIds.length,
  };

  // Validate test cases exist and are deleted
  const testCases = await prisma.testCase.findMany({
    where: {
      id: { in: testCaseIds.map(id => Number(id)) },
      isDeleted: true,
      ...(projectId !== null ? { projectId: Number(projectId) } : {}),
    },
    select: { id: true, name: true, projectId: true },
  });

  if (testCases.length === 0) {
    throw new Error('No deleted test cases found for restoration');
  }

  // Perform bulk restore
  for (const testCase of testCases) {
    try {
      await prisma.testCase.update({
        where: { id: testCase.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
      });

      results.restored.push({
        id: testCase.id,
        name: testCase.name,
      });

      // Audit log for each restoration
      await logAuditAction(userId, 'TESTCASE_RESTORED', {
        resourceType: 'TESTCASE',
        resourceId: testCase.id,
        resourceName: testCase.name,
        projectId: testCase.projectId,
        description: `Bulk restored test case: ${testCase.name}`,
        ...auditContext,
      });
    } catch (error) {
      results.failed.push({
        id: testCase.id,
        name: testCase.name,
        error: error.message,
      });
    }
  }

  return results;
}

export default {
  bulkUpdateTestCases,
  bulkDeleteTestCases,
  bulkExportTestCases,
  bulkRestoreTestCases,
};
