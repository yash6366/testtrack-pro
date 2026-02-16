/**
 * API KEY ROUTES
 * Manage API keys for CI/CD integrations
 */

import {
  createApiKey,
  getProjectApiKeys,
  getApiKeyById,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
  regenerateApiKey,
  getApiKeyStats,
} from '../services/apiKeyService.js';
import { createAuthGuards } from '../lib/rbac.js';

const { requireAuth, requireProjectRole } = createAuthGuards();

async function apiKeyRoutes(fastify) {
  // Create API key
  fastify.post(
    '/api/projects/:projectId/api-keys',
    { schema: { tags: ['api-keys'], summary: 'Create API key' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        await requireProjectRole(request, 'PROJECT_MANAGER');
        const { projectId } = request.params;
        const apiKey = await createApiKey(Number(projectId), request.body, request.user.id);
        reply.code(201).send(apiKey);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Get all API keys for project
  fastify.get(
    '/api/projects/:projectId/api-keys',
    { schema: { tags: ['api-keys'], summary: 'List API keys' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { projectId } = request.params;
        const { skip = 0, take = 20, isActive, search } = request.query;
        const result = await getProjectApiKeys(
          projectId,
          { isActive: isActive !== undefined ? isActive === 'true' : true, search },
          { skip: Number(skip), take: Number(take) }
        );
        reply.send(result);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Get single API key
  fastify.get(
    '/api/projects/:projectId/api-keys/:keyId',
    { schema: { tags: ['api-keys'], summary: 'Get API key' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { keyId } = request.params;
        const apiKey = await getApiKeyById(keyId);
        // Don't return the hash, just the safe metadata
        const { keyHash, ...safe } = apiKey;
        reply.send(safe);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Update API key
  fastify.patch(
    '/api/projects/:projectId/api-keys/:keyId',
    { schema: { tags: ['api-keys'], summary: 'Update API key' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        await requireProjectRole(request, 'PROJECT_MANAGER');
        const { keyId } = request.params;
        const updated = await updateApiKey(keyId, request.body, request.user.id);
        const { keyHash, ...safe } = updated;
        reply.send(safe);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Revoke API key
  fastify.post(
    '/api/projects/:projectId/api-keys/:keyId/revoke',
    { schema: { tags: ['api-keys'], summary: 'Revoke API key' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        await requireProjectRole(request, 'PROJECT_MANAGER');
        const { keyId } = request.params;
        const revoked = await revokeApiKey(keyId, request.user.id);
        const { keyHash, ...safe } = revoked;
        reply.send(safe);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Delete API key
  fastify.delete(
    '/api/projects/:projectId/api-keys/:keyId',
    { schema: { tags: ['api-keys'], summary: 'Delete API key' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        await requireProjectRole(request, 'PROJECT_MANAGER');
        const { keyId } = request.params;
        await deleteApiKey(keyId, request.user.id);
        reply.send({ success: true });
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Regenerate API key
  fastify.post(
    '/api/projects/:projectId/api-keys/:keyId/regenerate',
    { schema: { tags: ['api-keys'], summary: 'Regenerate API key' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        await requireProjectRole(request, 'PROJECT_MANAGER');
        const { keyId } = request.params;
        const regenerated = await regenerateApiKey(keyId, request.user.id);
        reply.send(regenerated);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Get API key stats
  fastify.get(
    '/api/projects/:projectId/api-keys/:keyId/stats',
    { schema: { tags: ['api-keys'], summary: 'Get API key stats' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { keyId } = request.params;
        const stats = await getApiKeyStats(keyId);
        reply.send(stats);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );
}

export default apiKeyRoutes;
