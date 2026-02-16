/**
 * API KEY AUTHENTICATION PLUGIN
 * Middleware for validating API keys in CI/CD integrations
 */

import { validateApiKey } from '../services/apiKeyService.js';

export async function apiKeyAuthPlugin(fastify, options) {
  /**
   * API Key Authentication Decorator
   * Use with @fastify.authenticate
   */
  fastify.decorate('authenticateApiKey', async function (request, reply) {
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      reply.code(401).send({ error: 'Missing X-API-Key header' });
      return;
    }

    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      reply.code(401).send({ error: validation.reason });
      return;
    }

    // Attach validated project info to request
    request.apiKey = {
      projectId: validation.projectId,
      name: validation.name,
      rateLimit: validation.rateLimit,
    };
  });

  /**
   * Pre-handler for routes requiring API key auth
   */
  fastify.decorate('authenticate APIKey', async function (request, reply) {
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      reply.code(401).send({ error: 'Missing X-API-Key header' });
      return;
    }

    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      reply.code(401).send({ error: validation.reason });
      return;
    }

    request.apiKey = {
      projectId: validation.projectId,
      name: validation.name,
      rateLimit: validation.rateLimit,
    };
  });
}

/**
 * Require API Key middleware
 */
export function requireApiKey(fastify) {
  return async (request, reply) => {
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      reply.code(401).send({ error: 'Missing X-API-Key header' });
      return;
    }

    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      reply.code(401).send({ error: validation.reason });
      return;
    }

    request.apiKey = {
      projectId: validation.projectId,
      name: validation.name,
      rateLimit: validation.rateLimit,
    };
  };
}
