/**
 * TEST CASE PERMISSION VALIDATION
 * Handles permission checks for test case operations
 */

import { getPrismaClient } from './prisma.js';

const prisma = getPrismaClient();

/**
 * Check if user can edit a test case
 * Testers can edit test cases they created or are assigned to
 * Admins can edit any test case
 * @param {number} testCaseId - Test case ID
 * @param {number} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<boolean>} True if user can edit
 */
export async function canEditTestCase(testCaseId, userId, userRole) {
  // Admins can edit anything
  if (userRole === 'ADMIN') {
    return true;
  }

  const testCase = await prisma.testCase.findUnique({
    where: { id: Number(testCaseId) },
    select: {
      createdBy: true,
      assignedToId: true,
      ownedById: true,
      isDeleted: true,
    },
  });

  if (!testCase) {
    throw new Error('Test case not found');
  }

  if (testCase.isDeleted) {
    throw new Error('Cannot edit deleted test case');
  }

  // Testers can edit if they created it, are assigned to it, or own it
  return (
    testCase.createdBy === userId ||
    testCase.assignedToId === userId ||
    testCase.ownedById === userId
  );
}

/**
 * Check if user can delete a test case
 * Testers can delete test cases they created
 * Admins can delete any test case
 * @param {number} testCaseId - Test case ID
 * @param {number} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<boolean>} True if user can delete
 */
export async function canDeleteTestCase(testCaseId, userId, userRole) {
  // Admins can delete anything
  if (userRole === 'ADMIN') {
    return true;
  }

  const testCase = await prisma.testCase.findUnique({
    where: { id: Number(testCaseId) },
    select: {
      createdBy: true,
      isDeleted: true,
    },
  });

  if (!testCase) {
    throw new Error('Test case not found');
  }

  if (testCase.isDeleted) {
    throw new Error('Test case already deleted');
  }

  // Testers can delete only if they created it
  return testCase.createdBy === userId;
}

/**
 * Check if user can view a test case
 * All authenticated users can view test cases in their projects
 * @param {number} testCaseId - Test case ID
 * @param {number} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<boolean>} True if user can view
 */
export async function canViewTestCase(testCaseId, userId, userRole) {
  const testCase = await prisma.testCase.findUnique({
    where: { id: Number(testCaseId) },
    select: {
      projectId: true,
      isDeleted: true,
    },
  });

  if (!testCase) {
    throw new Error('Test case not found');
  }

  // Check if user has access to the project
  // For now, we'll allow all authenticated users to view
  // You can add project-specific permission checks here
  return true;
}

/**
 * Validate bulk operation permissions
 * @param {Array<number>} testCaseIds - Test case IDs
 * @param {number} userId - User ID
 * @param {string} userRole - User role
 * @param {string} operation - Operation type ('edit' or 'delete')
 * @returns {Promise<Object>} Validation results
 */
export async function validateBulkPermissions(testCaseIds, userId, userRole, operation = 'edit') {
  // Admins can do anything
  if (userRole === 'ADMIN') {
    return {
      allowed: testCaseIds,
      denied: [],
    };
  }

  const testCases = await prisma.testCase.findMany({
    where: {
      id: { in: testCaseIds.map(id => Number(id)) },
    },
    select: {
      id: true,
      createdBy: true,
      assignedToId: true,
      ownedById: true,
      isDeleted: true,
    },
  });

  const allowed = [];
  const denied = [];

  for (const tc of testCases) {
    if (tc.isDeleted) {
      denied.push({ id: tc.id, reason: 'Test case is deleted' });
      continue;
    }

    let hasPermission = false;

    if (operation === 'delete') {
      // For delete, must be creator
      hasPermission = tc.createdBy === userId;
    } else {
      // For edit, can be creator, assignee, or owner
      hasPermission =
        tc.createdBy === userId ||
        tc.assignedToId === userId ||
        tc.ownedById === userId;
    }

    if (hasPermission) {
      allowed.push(tc.id);
    } else {
      denied.push({ 
        id: tc.id, 
        reason: `User does not have permission to ${operation} this test case` 
      });
    }
  }

  return { allowed, denied };
}

/**
 * Middleware to check edit permission
 * @param {Object} request - Fastify request
 * @param {Object} reply - Fastify reply
 */
export async function requireEditPermission(request, reply) {
  const { testCaseId } = request.params;
  const userId = request.user.id;
  const userRole = request.user.role;

  try {
    const canEdit = await canEditTestCase(Number(testCaseId), userId, userRole);
    
    if (!canEdit) {
      return reply.code(403).send({ 
        error: 'You do not have permission to edit this test case',
        message: 'Only the creator, assignee, or owner can edit this test case'
      });
    }
  } catch (error) {
    return reply.code(403).send({ error: error.message });
  }
}

/**
 * Middleware to check delete permission
 * @param {Object} request - Fastify request
 * @param {Object} reply - Fastify reply
 */
export async function requireDeletePermission(request, reply) {
  const { testCaseId } = request.params;
  const userId = request.user.id;
  const userRole = request.user.role;

  try {
    const canDelete = await canDeleteTestCase(Number(testCaseId), userId, userRole);
    
    if (!canDelete) {
      return reply.code(403).send({ 
        error: 'You do not have permission to delete this test case',
        message: 'Only the creator can delete this test case'
      });
    }
  } catch (error) {
    return reply.code(403).send({ error: error.message });
  }
}

export default {
  canEditTestCase,
  canDeleteTestCase,
  canViewTestCase,
  validateBulkPermissions,
  requireEditPermission,
  requireDeletePermission,
};
