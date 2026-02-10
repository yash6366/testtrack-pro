/**
 * TEST SUITE SERVICE
 * Handles CRUD operations, cloning, and management for test suites
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';

const prisma = getPrismaClient();

/**
 * Create a new test suite
 * @param {Object} data - Suite data
 * @param {number} userId - Creator user ID
 * @returns {Promise<Object>} Created test suite
 */
export async function createTestSuite(data, userId) {
  const {
    projectId,
    name,
    description,
    type = 'STATIC',
    status = 'ACTIVE',
    parentSuiteId,
    filterTags = [],
    filterTypes = [],
    filterPriorities = [],
    filterModules = [],
    estimatedDurationMinutes,
    executionOrder = 1,
  } = data;

  // Validate required fields
  if (!projectId || !name) {
    throw new Error('ProjectId and name are required');
  }

  // Check if suite with same name exists in project
  const existing = await prisma.testSuite.findFirst({
    where: {
      projectId: Number(projectId),
      name,
      isArchived: false,
    },
  });

  if (existing) {
    throw new Error('Test suite with this name already exists in project');
  }

  // Validate parent suite exists if provided
  if (parentSuiteId) {
    const parentSuite = await prisma.testSuite.findUnique({
      where: { id: Number(parentSuiteId) },
    });

    if (!parentSuite) {
      throw new Error('Parent suite not found');
    }

    if (parentSuite.projectId !== Number(projectId)) {
      throw new Error('Parent suite must be in the same project');
    }
  }

  // Create suite
  const suite = await prisma.testSuite.create({
    data: {
      projectId: Number(projectId),
      name,
      description,
      type,
      status,
      parentSuiteId: parentSuiteId ? Number(parentSuiteId) : null,
      filterTags,
      filterTypes,
      filterPriorities,
      filterModules,
      estimatedDurationMinutes,
      executionOrder,
      createdBy: userId,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      parentSuite: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true, key: true },
      },
    },
  });

  // Log audit
  await logAuditAction({
    action: 'TESTSUITE_CREATED',
    performedBy: userId,
    resourceType: 'TESTSUITE',
    resourceId: suite.id,
    resourceName: suite.name,
    projectId: suite.projectId,
    description: `Created test suite "${suite.name}"`,
    newValues: JSON.stringify(suite),
  });

  return suite;
}

/**
 * Get test suites for a project with filters
 * @param {number} projectId - Project ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of test suites
 */
export async function getProjectTestSuites(projectId, filters = {}) {
  const {
    type,
    status,
    parentSuiteId,
    includeArchived = false,
    search,
  } = filters;

  const where = {
    projectId: Number(projectId),
    ...(type && { type }),
    ...(status && { status }),
    ...(parentSuiteId !== undefined && {
      parentSuiteId: parentSuiteId ? Number(parentSuiteId) : null,
    }),
    ...(!includeArchived && { isArchived: false }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const suites = await prisma.testSuite.findMany({
    where,
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      parentSuite: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          testCases: true,
          childSuites: true,
          suiteRuns: true,
        },
      },
    },
    orderBy: [
      { executionOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return suites;
}

/**
 * Get suite hierarchy for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>} Hierarchical suite structure
 */
export async function getSuiteHierarchy(projectId) {
  // Get all non-archived suites
  const allSuites = await prisma.testSuite.findMany({
    where: {
      projectId: Number(projectId),
      isArchived: false,
    },
    include: {
      _count: {
        select: {
          testCases: true,
          childSuites: true,
        },
      },
    },
    orderBy: { executionOrder: 'asc' },
  });

  // Build hierarchy
  const suiteMap = new Map();
  const rootSuites = [];

  // First pass: create map
  allSuites.forEach((suite) => {
    suiteMap.set(suite.id, { ...suite, children: [] });
  });

  // Second pass: build tree
  allSuites.forEach((suite) => {
    if (suite.parentSuiteId) {
      const parent = suiteMap.get(suite.parentSuiteId);
      if (parent) {
        parent.children.push(suiteMap.get(suite.id));
      }
    } else {
      rootSuites.push(suiteMap.get(suite.id));
    }
  });

  return rootSuites;
}

/**
 * Get a single test suite by ID
 * @param {number} suiteId - Suite ID
 * @returns {Promise<Object>} Test suite details
 */
export async function getTestSuiteById(suiteId) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      archiver: {
        select: { id: true, name: true, email: true },
      },
      parentSuite: {
        select: { id: true, name: true },
      },
      childSuites: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          _count: {
            select: { testCases: true },
          },
        },
      },
      project: {
        select: { id: true, name: true, key: true },
      },
      _count: {
        select: {
          testCases: true,
          suiteRuns: true,
        },
      },
    },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  return suite;
}

/**
 * Update a test suite
 * @param {number} suiteId - Suite ID
 * @param {Object} data - Update data
 * @param {number} userId - User performing update
 * @returns {Promise<Object>} Updated suite
 */
export async function updateTestSuite(suiteId, data, userId) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  if (suite.isArchived) {
    throw new Error('Cannot update archived suite. Restore it first.');
  }

  const {
    name,
    description,
    type,
    status,
    parentSuiteId,
    filterTags,
    filterTypes,
    filterPriorities,
    filterModules,
    estimatedDurationMinutes,
    executionOrder,
  } = data;

  // If changing parent, validate it
  if (parentSuiteId !== undefined && parentSuiteId !== suite.parentSuiteId) {
    if (parentSuiteId) {
      const parentSuite = await prisma.testSuite.findUnique({
        where: { id: Number(parentSuiteId) },
      });

      if (!parentSuite) {
        throw new Error('Parent suite not found');
      }

      if (parentSuite.projectId !== suite.projectId) {
        throw new Error('Parent suite must be in the same project');
      }

      // Prevent circular references
      if (Number(parentSuiteId) === Number(suiteId)) {
        throw new Error('Suite cannot be its own parent');
      }

      // Check if parent is a descendant (would create circular reference)
      const isDescendant = await checkIfDescendant(
        Number(suiteId),
        Number(parentSuiteId)
      );
      if (isDescendant) {
        throw new Error('Cannot move suite under its own descendant');
      }
    }
  }

  // Check name uniqueness if name is changing
  if (name && name !== suite.name) {
    const existing = await prisma.testSuite.findFirst({
      where: {
        projectId: suite.projectId,
        name,
        isArchived: false,
        id: { not: Number(suiteId) },
      },
    });

    if (existing) {
      throw new Error('Test suite with this name already exists in project');
    }
  }

  const updated = await prisma.testSuite.update({
    where: { id: Number(suiteId) },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      ...(parentSuiteId !== undefined && {
        parentSuiteId: parentSuiteId ? Number(parentSuiteId) : null,
      }),
      ...(filterTags !== undefined && { filterTags }),
      ...(filterTypes !== undefined && { filterTypes }),
      ...(filterPriorities !== undefined && { filterPriorities }),
      ...(filterModules !== undefined && { filterModules }),
      ...(estimatedDurationMinutes !== undefined && { estimatedDurationMinutes }),
      ...(executionOrder !== undefined && { executionOrder }),
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      parentSuite: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true, key: true },
      },
    },
  });

  // Log audit
  await logAuditAction({
    action: 'TESTSUITE_EDITED',
    performedBy: userId,
    resourceType: 'TESTSUITE',
    resourceId: suite.id,
    resourceName: updated.name,
    projectId: suite.projectId,
    description: `Updated test suite "${updated.name}"`,
    oldValues: JSON.stringify(suite),
    newValues: JSON.stringify(updated),
  });

  return updated;
}

/**
 * Delete a test suite
 * @param {number} suiteId - Suite ID
 * @param {number} userId - User performing deletion
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteTestSuite(suiteId, userId) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
    include: {
      childSuites: true,
      testCases: true,
    },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  // Check if suite has children
  if (suite.childSuites.length > 0) {
    throw new Error(
      'Cannot delete suite with child suites. Delete or move child suites first.'
    );
  }

  // Delete suite (this will cascade delete testCases relationships)
  await prisma.testSuite.delete({
    where: { id: Number(suiteId) },
  });

  // Log audit
  await logAuditAction({
    action: 'TESTSUITE_DELETED',
    performedBy: userId,
    resourceType: 'TESTSUITE',
    resourceId: suite.id,
    resourceName: suite.name,
    projectId: suite.projectId,
    description: `Deleted test suite "${suite.name}"`,
    oldValues: JSON.stringify(suite),
  });

  return { message: 'Test suite deleted successfully' };
}

/**
 * Archive a test suite
 * @param {number} suiteId - Suite ID
 * @param {number} userId - User performing archival
 * @returns {Promise<Object>} Archived suite
 */
export async function archiveTestSuite(suiteId, userId) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  if (suite.isArchived) {
    throw new Error('Suite is already archived');
  }

  const archived = await prisma.testSuite.update({
    where: { id: Number(suiteId) },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archivedBy: userId,
      status: 'ARCHIVED',
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      archiver: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log audit
  await logAuditAction({
    action: 'TESTSUITE_ARCHIVED',
    performedBy: userId,
    resourceType: 'TESTSUITE',
    resourceId: suite.id,
    resourceName: suite.name,
    projectId: suite.projectId,
    description: `Archived test suite "${suite.name}"`,
  });

  return archived;
}

/**
 * Restore an archived test suite
 * @param {number} suiteId - Suite ID
 * @param {number} userId - User performing restoration
 * @returns {Promise<Object>} Restored suite
 */
export async function restoreTestSuite(suiteId, userId) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  if (!suite.isArchived) {
    throw new Error('Suite is not archived');
  }

  const restored = await prisma.testSuite.update({
    where: { id: Number(suiteId) },
    data: {
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      status: 'ACTIVE',
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log audit
  await logAuditAction({
    action: 'TESTSUITE_RESTORED',
    performedBy: userId,
    resourceType: 'TESTSUITE',
    resourceId: suite.id,
    resourceName: suite.name,
    projectId: suite.projectId,
    description: `Restored test suite "${suite.name}"`,
  });

  return restored;
}

/**
 * Clone a test suite
 * @param {number} suiteId - Suite ID to clone
 * @param {string} newName - Name for the cloned suite
 * @param {number} userId - User performing cloning
 * @param {Object} options - Clone options
 * @returns {Promise<Object>} Cloned suite
 */
export async function cloneTestSuite(suiteId, newName, userId, options = {}) {
  const { includeTestCases = true, includeChildSuites = false } = options;

  const sourceSuite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
    include: {
      testCases: includeTestCases,
      childSuites: includeChildSuites,
    },
  });

  if (!sourceSuite) {
    throw new Error('Source test suite not found');
  }

  // Check name uniqueness
  const existing = await prisma.testSuite.findFirst({
    where: {
      projectId: sourceSuite.projectId,
      name: newName,
      isArchived: false,
    },
  });

  if (existing) {
    throw new Error('Test suite with this name already exists in project');
  }

  // Clone the suite
  const clonedSuite = await prisma.testSuite.create({
    data: {
      projectId: sourceSuite.projectId,
      name: newName,
      description: sourceSuite.description
        ? `${sourceSuite.description} (Cloned)`
        : 'Cloned suite',
      type: sourceSuite.type,
      status: 'ACTIVE',
      filterTags: sourceSuite.filterTags,
      filterTypes: sourceSuite.filterTypes,
      filterPriorities: sourceSuite.filterPriorities,
      filterModules: sourceSuite.filterModules,
      estimatedDurationMinutes: sourceSuite.estimatedDurationMinutes,
      createdBy: userId,
    },
  });

  // Clone test case associations if requested
  if (includeTestCases && sourceSuite.testCases.length > 0) {
    const testCaseAssociations = sourceSuite.testCases.map((tc) => ({
      suiteId: clonedSuite.id,
      testCaseId: tc.testCaseId,
      executionOrder: tc.executionOrder,
      isMandatory: tc.isMandatory,
      addedBy: userId,
    }));

    await prisma.testSuiteCase.createMany({
      data: testCaseAssociations,
    });
  }

  // Clone child suites recursively if requested
  if (includeChildSuites && sourceSuite.childSuites.length > 0) {
    for (const childSuite of sourceSuite.childSuites) {
      await cloneTestSuite(
        childSuite.id,
        `${childSuite.name} (Cloned)`,
        userId,
        { includeTestCases, includeChildSuites: true }
      );
    }
  }

  // Log audit
  await logAuditAction({
    action: 'TESTSUITE_CREATED',
    performedBy: userId,
    resourceType: 'TESTSUITE',
    resourceId: clonedSuite.id,
    resourceName: clonedSuite.name,
    projectId: clonedSuite.projectId,
    description: `Cloned test suite "${sourceSuite.name}" to "${newName}"`,
  });

  return await getTestSuiteById(clonedSuite.id);
}

/**
 * Add test cases to a suite
 * @param {number} suiteId - Suite ID
 * @param {Array<number>} testCaseIds - Test case IDs to add
 * @param {number} userId - User performing operation
 * @returns {Promise<Array>} Added test case associations
 */
export async function addTestCasesToSuite(suiteId, testCaseIds, userId) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
    include: {
      testCases: true,
    },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  if (suite.isArchived) {
    throw new Error('Cannot modify archived suite');
  }

  // Filter out already added test cases
  const existingTestCaseIds = new Set(suite.testCases.map((tc) => tc.testCaseId));
  const newTestCaseIds = testCaseIds.filter((id) => !existingTestCaseIds.has(Number(id)));

  if (newTestCaseIds.length === 0) {
    return [];
  }

  // Validate test cases exist and belong to same project
  const testCases = await prisma.testCase.findMany({
    where: {
      id: { in: newTestCaseIds.map((id) => Number(id)) },
      projectId: suite.projectId,
      isDeleted: false,
    },
  });

  if (testCases.length !== newTestCaseIds.length) {
    throw new Error('Some test cases not found or belong to different project');
  }

  // Get next execution order
  const maxOrder = suite.testCases.length > 0
    ? Math.max(...suite.testCases.map((tc) => tc.executionOrder))
    : 0;

  // Create associations
  const associations = newTestCaseIds.map((testCaseId, index) => ({
    suiteId: suite.id,
    testCaseId: Number(testCaseId),
    executionOrder: maxOrder + index + 1,
    addedBy: userId,
  }));

  await prisma.testSuiteCase.createMany({
    data: associations,
  });

  // Fetch and return created associations
  const created = await prisma.testSuiteCase.findMany({
    where: {
      suiteId: suite.id,
      testCaseId: { in: newTestCaseIds.map((id) => Number(id)) },
    },
    include: {
      testCase: {
        select: {
          id: true,
          name: true,
          type: true,
          priority: true,
          status: true,
        },
      },
    },
  });

  return created;
}

/**
 * Remove test cases from a suite
 * @param {number} suiteId - Suite ID
 * @param {Array<number>} testCaseIds - Test case IDs to remove
 * @returns {Promise<Object>} Removal result
 */
export async function removeTestCasesFromSuite(suiteId, testCaseIds) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  if (suite.isArchived) {
    throw new Error('Cannot modify archived suite');
  }

  const result = await prisma.testSuiteCase.deleteMany({
    where: {
      suiteId: Number(suiteId),
      testCaseId: { in: testCaseIds.map((id) => Number(id)) },
    },
  });

  return {
    message: `Removed ${result.count} test case(s) from suite`,
    count: result.count,
  };
}

/**
 * Reorder test cases in a suite
 * @param {number} suiteId - Suite ID
 * @param {Array<Object>} orderMap - Array of {testCaseId, executionOrder}
 * @returns {Promise<Object>} Update result
 */
export async function reorderTestCasesInSuite(suiteId, orderMap) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  if (suite.isArchived) {
    throw new Error('Cannot modify archived suite');
  }

  // Update execution order for each test case
  const updates = orderMap.map(({ testCaseId, executionOrder }) =>
    prisma.testSuiteCase.updateMany({
      where: {
        suiteId: Number(suiteId),
        testCaseId: Number(testCaseId),
      },
      data: {
        executionOrder: Number(executionOrder),
      },
    })
  );

  await prisma.$transaction(updates);

  return { message: 'Test cases reordered successfully' };
}

/**
 * Get test cases in a suite
 * @param {number} suiteId - Suite ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Test cases in suite
 */
export async function getTestCasesInSuite(suiteId, filters = {}) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  // For dynamic suites, evaluate criteria
  if (suite.type === 'DYNAMIC') {
    return await evaluateDynamicSuite(suiteId);
  }

  // For static suites, return associated test cases
  const { priority, type, status } = filters;

  const testCases = await prisma.testSuiteCase.findMany({
    where: {
      suiteId: Number(suiteId),
      testCase: {
        isDeleted: false,
        ...(priority && { priority }),
        ...(type && { type }),
        ...(status && { status }),
      },
    },
    include: {
      testCase: {
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { steps: true },
          },
        },
      },
      adder: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      executionOrder: 'asc',
    },
  });

  return testCases;
}

/**
 * Evaluate dynamic suite criteria and return matching test cases
 * @param {number} suiteId - Suite ID
 * @returns {Promise<Array>} Matching test cases
 */
export async function evaluateDynamicSuite(suiteId) {
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  if (suite.type !== 'DYNAMIC') {
    throw new Error('Suite is not a dynamic suite');
  }

  // Build dynamic filter criteria
  const where = {
    projectId: suite.projectId,
    isDeleted: false,
    AND: [
      ...(suite.filterTypes.length > 0
        ? [{ type: { in: suite.filterTypes } }]
        : []),
      ...(suite.filterPriorities.length > 0
        ? [{ priority: { in: suite.filterPriorities } }]
        : []),
      ...(suite.filterModules.length > 0
        ? [{ moduleArea: { in: suite.filterModules } }]
        : []),
      ...(suite.filterTags.length > 0
        ? [{ tags: { hasSome: suite.filterTags } }]
        : []),
    ],
  };

  const testCases = await prisma.testCase.findMany({
    where,
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { steps: true },
      },
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return testCases;
}

/**
 * Move suite to different parent
 * @param {number} suiteId - Suite ID
 * @param {number|null} newParentId - New parent suite ID (null for root)
 * @param {number} userId - User performing operation
 * @returns {Promise<Object>} Updated suite
 */
export async function moveSuiteToParent(suiteId, newParentId, userId) {
  return await updateTestSuite(suiteId, { parentSuiteId: newParentId }, userId);
}

/**
 * Get child suites
 * @param {number} suiteId - Suite ID
 * @param {boolean} recursive - Include all descendants
 * @returns {Promise<Array>} Child suites
 */
export async function getChildSuites(suiteId, recursive = false) {
  if (!recursive) {
    return await prisma.testSuite.findMany({
      where: {
        parentSuiteId: Number(suiteId),
        isArchived: false,
      },
      include: {
        _count: {
          select: {
            testCases: true,
            childSuites: true,
          },
        },
      },
      orderBy: { executionOrder: 'asc' },
    });
  }

  // Recursive: get all descendants
  const allDescendants = [];
  const queue = [Number(suiteId)];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await prisma.testSuite.findMany({
      where: {
        parentSuiteId: currentId,
        isArchived: false,
      },
      include: {
        _count: {
          select: {
            testCases: true,
            childSuites: true,
          },
        },
      },
    });

    allDescendants.push(...children);
    queue.push(...children.map((c) => c.id));
  }

  return allDescendants;
}

/**
 * Helper: Check if a suite is a descendant of another
 * @param {number} ancestorId - Potential ancestor suite ID
 * @param {number} descendantId - Potential descendant suite ID
 * @returns {Promise<boolean>} True if descendant
 */
async function checkIfDescendant(ancestorId, descendantId) {
  let currentId = descendantId;

  while (currentId) {
    const suite = await prisma.testSuite.findUnique({
      where: { id: currentId },
      select: { parentSuiteId: true },
    });

    if (!suite) return false;
    if (suite.parentSuiteId === ancestorId) return true;

    currentId = suite.parentSuiteId;
  }

  return false;
}
