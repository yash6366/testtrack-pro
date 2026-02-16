/**
 * SEARCH API ROUTES
 * Handles global search and autocomplete endpoints
 */

import { createAuthGuards } from '../lib/rbac.js';
import {
  globalSearch,
  getSearchSuggestions,
  rebuildSearchIndex,
} from '../services/searchService.js';

export async function searchRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  /**
   * Global search across test cases, bugs, and executions
   */
  fastify.get(
    '/api/search',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { projectId, q, types, skip, take } = request.query;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId is required' });
        }

        if (!q || q.trim().length < 2) {
          return reply.code(400).send({ error: 'Search query must be at least 2 characters' });
        }

        // Validate resource types
        const ALLOWED_TYPES = ['TEST_CASE', 'BUG', 'EXECUTION'];
        let resourceTypes = types ? types.split(',').map(t => t.trim().toUpperCase()) : ALLOWED_TYPES;
        resourceTypes = resourceTypes.filter(t => ALLOWED_TYPES.includes(t));
        
        if (resourceTypes.length === 0) {
          return reply.code(400).send({ error: 'Invalid resource types. Allowed: TEST_CASE, BUG, EXECUTION' });
        }
        
        const results = await globalSearch(Number(projectId), q, resourceTypes, {
          skip: skip ? Number(skip) : 0,
          take: take ? Number(take) : 20,
        });

        reply.send(results);
      } catch (error) {
        console.error('Error performing search:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Get search suggestions/autocomplete
   */
  fastify.get(
    '/api/search/suggestions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { projectId, q, types } = request.query;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId is required' });
        }

        const resourceTypes = types ? types.split(',') : ['TEST_CASE', 'BUG'];
        const suggestions = await getSearchSuggestions(
          Number(projectId),
          q || '',
          resourceTypes
        );

        reply.send({ suggestions });
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Rebuild search index (admin only)
   */
  fastify.post(
    '/api/search/rebuild/:projectId',
    { preHandler: [requireAuth, requireRoles(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const result = await rebuildSearchIndex(Number(projectId));
        reply.send({ success: true, ...result });
      } catch (error) {
        console.error('Error rebuilding search index:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}
