/**
 * SEARCH INDEXING SERVICE
 * Maintains SearchIndex for full-text search capabilities
 * Automatically updates when resources change
 */

import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

/**
 * Index a test case
 * @param {number} testCaseId - Test case ID
 * @param {number} projectId - Project ID
 */
export async function indexTestCase(testCaseId, projectId) {
  try {
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId },
      select: {
        id: true,
        name: true,
        description: true,
        tags: true,
        type: true,
        priority: true,
        isDeleted: true,
      },
    });

    if (!testCase || testCase.isDeleted) {
      // Delete from index if deleted
      await prisma.searchIndex.deleteMany({
        where: { resourceId: testCaseId, resourceType: 'TEST_CASE' },
      });
      return;
    }

    const searchableContent = [
      testCase.name,
      testCase.description,
      testCase.type,
      testCase.priority,
      ...(testCase.tags || []),
    ]
      .filter(Boolean)
      .join(' ');

    return await prisma.searchIndex.upsert({
      where: {
        resourceType_resourceId: {
          resourceType: 'TEST_CASE',
          resourceId: testCaseId,
        },
      },
      create: {
        resourceType: 'TEST_CASE',
        resourceId: testCaseId,
        projectId,
        title: testCase.name,
        content: searchableContent,
        tags: testCase.tags || [],
      },
      update: {
        title: testCase.name,
        content: searchableContent,
        tags: testCase.tags || [],
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Index a bug/defect
 * @param {number} bugId - Bug ID
 * @param {number} projectId - Project ID
 */
export async function indexBug(bugId, projectId) {
  try {
    const bug = await prisma.defect.findUnique({
      where: { id: bugId },
      select: {
        id: true,
        bugNumber: true,
        title: true,
        description: true,
        severity: true,
        priority: true,
        status: true,
      },
    });

    if (!bug) {
      // Delete from index if not found
      await prisma.searchIndex.deleteMany({
        where: { resourceId: bugId, resourceType: 'BUG' },
      });
      return;
    }

    const searchableContent = [
      bug.bugNumber,
      bug.title,
      bug.description,
      bug.severity,
      bug.priority,
      bug.status,
    ]
      .filter(Boolean)
      .join(' ');

    return await prisma.searchIndex.upsert({
      where: {
        resourceType_resourceId: {
          resourceType: 'BUG',
          resourceId: bugId,
        },
      },
      create: {
        resourceType: 'BUG',
        resourceId: bugId,
        projectId,
        title: bug.bugNumber + ': ' + bug.title,
        content: searchableContent,
        tags: [bug.severity, bug.priority, bug.status],
      },
      update: {
        title: bug.bugNumber + ': ' + bug.title,
        content: searchableContent,
        tags: [bug.severity, bug.priority, bug.status],
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Index a test execution
 * @param {number} executionId - Execution ID
 * @param {number} projectId - Project ID
 */
export async function indexTestExecution(executionId, projectId) {
  try {
    const execution = await prisma.testExecution.findUnique({
      where: { id: executionId },
      select: {
        id: true,
        testCase: { select: { name: true } },
        status: true,
        executedBy: { select: { name: true } },
      },
    });

    if (!execution) {
      // Delete from index if not found
      await prisma.searchIndex.deleteMany({
        where: { resourceId: executionId, resourceType: 'EXECUTION' },
      });
      return;
    }

    const searchableContent = [
      execution.testCase?.name,
      execution.status,
      execution.executedBy?.name,
    ]
      .filter(Boolean)
      .join(' ');

    return await prisma.searchIndex.upsert({
      where: {
        resourceType_resourceId: {
          resourceType: 'EXECUTION',
          resourceId: executionId,
        },
      },
      create: {
        resourceType: 'EXECUTION',
        resourceId: executionId,
        projectId,
        title: `Execution: ${execution.testCase?.name || 'Unknown'}`,
        content: searchableContent,
        tags: [execution.status],
      },
      update: {
        title: `Execution: ${execution.testCase?.name || 'Unknown'}`,
        content: searchableContent,
        tags: [execution.status],
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Delete index record
 * @param {string} resourceType - Type of resource
 * @param {number} resourceId - Resource ID
 */
export async function deleteIndex(resourceType, resourceId) {
  try {
    return await prisma.searchIndex.deleteMany({
      where: {
        resourceType,
        resourceId,
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Rebuild entire search index for a project
 * @param {number} projectId - Project ID
 */
export async function rebuildProjectIndex(projectId) {
  try {
    // Clear existing index
    await prisma.searchIndex.deleteMany({
      where: { projectId },
    });

    // Index all test cases
    const testCases = await prisma.testCase.findMany({
      where: { projectId, isDeleted: false },
      select: { id: true },
    });

    for (const tc of testCases) {
      await indexTestCase(tc.id, projectId);
    }

    // Index all bugs
    const bugs = await prisma.defect.findMany({
      where: { projectId },
      select: { id: true },
    });

    for (const bug of bugs) {
      await indexBug(bug.id, projectId);
    }

    // Index all executions
    const executions = await prisma.testExecution.findMany({
      where: {
        testRun: { projectId },
      },
      select: { id: true },
    });

    for (const exec of executions) {
      await indexTestExecution(exec.id, projectId);
    }

    return {
      projectId,
      testCasesIndexed: testCases.length,
      bugsIndexed: bugs.length,
      executionsIndexed: executions.length,
      total: totalIndexed,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Search using SearchIndex
 * @param {number} projectId - Project ID
 * @param {string} query - Search query
 * @param {Array} resourceTypes - Types to search
 * @param {Object} filters - Additional filters
 */
export async function searchIndex(projectId, query, resourceTypes = ['TEST_CASE', 'BUG', 'EXECUTION'], filters = {}) {
  try {
    const { skip = 0, take = 20 } = filters;

    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    const searchQuery = query.trim().toLowerCase();

    const results = await prisma.searchIndex.findMany({
      where: {
        projectId: Number(projectId),
        resourceType: { in: resourceTypes },
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { content: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { hasSome: [searchQuery] } },
        ],
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { updatedAt: 'desc' },
    });

    // Fetch full resource details
    const enriched = await Promise.all(
      results.map(async (item) => {
        let resource = null;

        if (item.resourceType === 'TEST_CASE') {
          resource = await prisma.testCase.findUnique({
            where: { id: item.resourceId },
            select: { id: true, name: true, description: true, type: true, priority: true, status: true },
          });
        } else if (item.resourceType === 'BUG') {
          resource = await prisma.defect.findUnique({
            where: { id: item.resourceId },
            select: { id: true, bugNumber: true, title: true, severity: true, priority: true, status: true },
          });
        } else if (item.resourceType === 'EXECUTION') {
          resource = await prisma.testExecution.findUnique({
            where: { id: item.resourceId },
            select: { id: true, status: true, testCase: { select: { name: true } } },
          });
        }

        return {
          ...item,
          resource,
          resourceType: item.resourceType,
          url: getResourceUrl(item.resourceType, item.resourceId),
        };
      })
    );

    return enriched;
  } catch (error) {
    throw error;
  }
}

/**
 * Get resource URL based on type
 */
function getResourceUrl(resourceType, resourceId) {
  const urls = {
    TEST_CASE: `/tests/${resourceId}`,
    BUG: `/bugs/${resourceId}`,
    EXECUTION: `/executions/${resourceId}`,
  };
  return urls[resourceType] || '/';
}

/**
 * Get search suggestions/autocomplete
 * @param {number} projectId - Project ID
 * @param {string} query - Partial query
 * @param {Array} resourceTypes - Types to search
 */
export async function getSearchSuggestions(projectId, query = '', resourceTypes = ['TEST_CASE', 'BUG']) {
  try {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchQuery = query.trim().toLowerCase();

    const suggestions = await prisma.searchIndex.findMany({
      where: {
        projectId: Number(projectId),
        resourceType: { in: resourceTypes },
        title: { contains: searchQuery, mode: 'insensitive' },
      },
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        title: true,
      },
      take: 10,
    });

    return suggestions.map(s => ({
      id: s.id,
      type: s.resourceType,
      resourceId: s.resourceId,
      label: s.title,
      url: getResourceUrl(s.resourceType, s.resourceId),
    }));
  } catch (error) {
    throw error;
  }
}

export default {
  indexTestCase,
  indexBug,
  indexTestExecution,
  deleteIndex,
  rebuildProjectIndex,
  searchIndex,
  getSearchSuggestions,
};
