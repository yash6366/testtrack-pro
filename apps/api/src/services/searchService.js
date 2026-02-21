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

  const rawQuery = query.trim();
  // Sanitize search input to prevent special character issues
  const sanitizeSearch = (input) => {
    return input.replace(/[%_\\]/g, '\\$&');
  };
  const searchQuery = sanitizeSearch(rawQuery).toLowerCase();
  const results = {};
  const projectIdNum = Number(projectId);

  const getIndexMatches = async (resourceType) =>
    prisma.searchIndex.findMany({
      where: {
        projectId: projectIdNum,
        resourceType,
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { searchText: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: { resourceId: true },
      orderBy: { updatedAt: 'desc' },
      skip: Number(skip),
      take: Number(take),
    });

  const sortByIndex = (items, indexMap) =>
    items.sort((a, b) => (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0));

  // Search test cases
  if (resourceTypes.includes('TEST_CASE')) {
    const matches = await getIndexMatches('TEST_CASE');
    const ids = matches.map((match) => match.resourceId);

    if (ids.length === 0) {
      results.testCases = [];
    } else {
      const indexMap = new Map(ids.map((id, index) => [id, index]));
      const testCases = await prisma.testCase.findMany({
        where: {
          id: { in: ids },
          projectId: projectIdNum,
          isDeleted: false,
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
      });

      results.testCases = sortByIndex(testCases, indexMap).map((tc) => ({
        ...tc,
        resourceType: 'TEST_CASE',
        url: `/tests/${tc.id}`,
      }));
    }
  }

  // Search bugs
  if (resourceTypes.includes('BUG')) {
    const matches = await getIndexMatches('BUG');
    const ids = matches.map((match) => match.resourceId);

    if (ids.length === 0) {
      results.bugs = [];
    } else {
      const indexMap = new Map(ids.map((id, index) => [id, index]));
      const bugs = await prisma.bug.findMany({
        where: {
          id: { in: ids },
          projectId: projectIdNum,
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
      });

      results.bugs = sortByIndex(bugs, indexMap).map((bug) => ({
        ...bug,
        resourceType: 'BUG',
        url: `/bugs/${bug.id}`,
      }));
    }
  }

  // Search test executions
  if (resourceTypes.includes('EXECUTION')) {
    const matches = await getIndexMatches('EXECUTION');
    const ids = matches.map((match) => match.resourceId);

    if (ids.length === 0) {
      results.executions = [];
    } else {
      const indexMap = new Map(ids.map((id, index) => [id, index]));
      const executions = await prisma.testExecution.findMany({
        where: {
          id: { in: ids },
          testRun: {
            projectId: projectIdNum,
          },
        },
        select: {
          id: true,
          status: true,
          actualResult: true,
          testCase: { select: { id: true, name: true } },
          testRun: { select: { id: true, name: true } },
          createdAt: true,
        },
      });

      results.executions = sortByIndex(executions, indexMap).map((exe) => ({
        ...exe,
        resourceType: 'EXECUTION',
        url: `/testRuns/${exe.testRun.id}/executions/${exe.id}`,
      }));
    }
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
    const bugs = await prisma.bug.findMany({
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
  const { projectId, title, description, searchText } = data;

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
      description: description || '',
      searchText: searchText || description || title,
    },
    update: {
      title,
      description: description || '',
      searchText: searchText || description || title,
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
      description: tc.description || '',
      searchText: [tc.name, tc.description, ...(tc.tags || [])].filter(Boolean).join(' '),
    });
  }

  // Rebuild bug index
  const bugs = await prisma.bug.findMany({
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
      description: bug.description,
      searchText: [bug.bugNumber, bug.title, bug.description].filter(Boolean).join(' '),
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
