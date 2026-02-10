/**
 * SEARCH SERVICE
 * Handles global search across test cases, bugs, and executions
 */

import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

/**
 * Global search across all resources
 * @param {number} projectId - Project ID
 * @param {string} query - Search query
 * @param {Array} resourceTypes - Types to search (TEST_CASE, BUG, EXECUTION)
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Search results grouped by type
 */
export async function globalSearch(projectId, query, resourceTypes = ['TEST_CASE', 'BUG', 'EXECUTION'], filters = {}) {
  const { skip = 0, take = 20 } = filters;

  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  const searchQuery = query.trim().toLowerCase();
  const results = {};

  // Search test cases
  if (resourceTypes.includes('TEST_CASE')) {
    const testCases = await prisma.testCase.findMany({
      where: {
        projectId: Number(projectId),
        isDeleted: false,
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { hasSome: [searchQuery] } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        priority: true,
        status: true,
        createdAt: true,
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    });

    results.testCases = testCases.map(tc => ({
      ...tc,
      resourceType: 'TEST_CASE',
      url: `/tests/${tc.id}`,
    }));
  }

  // Search bugs
  if (resourceTypes.includes('BUG')) {
    const bugs = await prisma.defect.findMany({
      where: {
        projectId: Number(projectId),
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { bugNumber: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        bugNumber: true,
        title: true,
        description: true,
        severity: true,
        priority: true,
        status: true,
        createdAt: true,
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    });

    results.bugs = bugs.map(bug => ({
      ...bug,
      resourceType: 'BUG',
      url: `/bugs/${bug.id}`,
    }));
  }

  // Search test executions
  if (resourceTypes.includes('EXECUTION')) {
    const executions = await prisma.testExecution.findMany({
      where: {
        testRun: {
          projectId: Number(projectId),
        },
        OR: [
          { comments: { contains: searchQuery, mode: 'insensitive' } },
          { actualResult: { contains: searchQuery, mode: 'insensitive' } },
          { testCase: { name: { contains: searchQuery, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        status: true,
        actualResult: true,
        testCase: { select: { id: true, name: true } },
        testRun: { select: { id: true, name: true } },
        createdAt: true,
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    });

    results.executions = executions.map(exe => ({
      ...exe,
      resourceType: 'EXECUTION',
      url: `/testRuns/${exe.testRun.id}/executions/${exe.id}`,
    }));
  }

  return results;
}

/**
 * Search suggestions/autocomplete
 * @param {number} projectId - Project ID
 * @param {string} query - Partial search query
 * @param {Array} resourceTypes - Types to search
 * @returns {Promise<Array>} Suggestions
 */
export async function getSearchSuggestions(projectId, query, resourceTypes = ['TEST_CASE', 'BUG']) {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const searchQuery = query.trim().toLowerCase();
  const suggestions = [];

  // Test case suggestions
  if (resourceTypes.includes('TEST_CASE')) {
    const testCases = await prisma.testCase.findMany({
      where: {
        projectId: Number(projectId),
        isDeleted: false,
        name: { contains: searchQuery, mode: 'insensitive' },
      },
      select: { id: true, name: true },
      take: 5,
    });

    suggestions.push(
      ...testCases.map(tc => ({
        type: 'TEST_CASE',
        id: tc.id,
        text: tc.name,
        url: `/tests/${tc.id}`,
      }))
    );
  }

  // Bug suggestions
  if (resourceTypes.includes('BUG')) {
    const bugs = await prisma.defect.findMany({
      where: {
        projectId: Number(projectId),
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { bugNumber: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: { id: true, bugNumber: true, title: true },
      take: 5,
    });

    suggestions.push(
      ...bugs.map(bug => ({
        type: 'BUG',
        id: bug.id,
        text: `${bug.bugNumber} - ${bug.title}`,
        url: `/bugs/${bug.id}`,
      }))
    );
  }

  return suggestions;
}

/**
 * Update search index for a resource
 * @param {string} resourceType - Type of resource
 * @param {number} resourceId - Resource ID
 * @param {Object} data - Index data
 */
export async function updateSearchIndex(resourceType, resourceId, data) {
  const { projectId, title, content, tags = [] } = data;

  if (!projectId || !title) {
    throw new Error('projectId and title are required');
  }

  const index = await prisma.searchIndex.upsert({
    where: {
      resourceType_resourceId: {
        resourceType,
        resourceId: Number(resourceId),
      },
    },
    create: {
      resourceType,
      resourceId: Number(resourceId),
      projectId: Number(projectId),
      title,
      content: content || '',
      tags,
    },
    update: {
      title,
      content: content || '',
      tags,
      updatedAt: new Date(),
    },
  });

  return index;
}

/**
 * Delete search index for a resource
 * @param {string} resourceType - Type of resource
 * @param {number} resourceId - Resource ID
 */
export async function deleteSearchIndex(resourceType, resourceId) {
  await prisma.searchIndex.deleteMany({
    where: {
      resourceType,
      resourceId: Number(resourceId),
    },
  });
}

/**
 * Rebuild search index for a project
 * @param {number} projectId - Project ID
 */
export async function rebuildSearchIndex(projectId) {
  // Delete all old indexes for project
  await prisma.searchIndex.deleteMany({
    where: { projectId: Number(projectId) },
  });

  // Rebuild test case index
  const testCases = await prisma.testCase.findMany({
    where: {
      projectId: Number(projectId),
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      tags: true,
    },
  });

  for (const tc of testCases) {
    await updateSearchIndex('TEST_CASE', tc.id, {
      projectId,
      title: tc.name,
      content: tc.description || '',
      tags: tc.tags,
    });
  }

  // Rebuild bug index
  const bugs = await prisma.defect.findMany({
    where: { projectId: Number(projectId) },
    select: {
      id: true,
      bugNumber: true,
      title: true,
      description: true,
    },
  });

  for (const bug of bugs) {
    await updateSearchIndex('BUG', bug.id, {
      projectId,
      title: `${bug.bugNumber} - ${bug.title}`,
      content: bug.description,
      tags: [bug.bugNumber],
    });
  }

  return { rebuilt: testCases.length + bugs.length };
}

/**
 * Get recently searched items for user (stored in Redis or DB)
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Recent searches
 */
export async function getRecentSearches(userId) {
  // This would ideally be cached in Redis
  // For now, return empty array - implement with caching later
  return [];
}

/**
 * Get popular search terms for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>} Popular terms
 */
export async function getPopularSearchTerms(projectId) {
  // This would be tracked by logging search queries
  // For now, return trending test case names
  const popular = await prisma.testCase.findMany({
    where: {
      projectId: Number(projectId),
      isDeleted: false,
    },
    select: { name: true },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  return popular.map(t => t.name);
}

export default {
  globalSearch,
  getSearchSuggestions,
  updateSearchIndex,
  deleteSearchIndex,
  rebuildSearchIndex,
  getRecentSearches,
  getPopularSearchTerms,
};
