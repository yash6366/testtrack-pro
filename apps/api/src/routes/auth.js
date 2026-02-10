import { signup, login, verifyEmail, logout, logoutAll } from '../services/authService.js';
import { createAuthGuards } from '../lib/rbac.js';

export async function authRoutes(fastify) {
  const { requireAuth } = createAuthGuards(fastify);
  fastify.post('/api/auth/signup', async (request, reply) => {
    try {
      const result = await signup(fastify, request.body);
      reply.code(201).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const result = await login(fastify, request.body);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(401).send({ error: error.message });
    }
  });

  fastify.post('/api/auth/verify-email', async (request, reply) => {
    try {
      const { token } = request.body;
      if (!token) {
        return reply.code(400).send({ error: 'Verification token is required' });
      }
      const result = await verifyEmail(token);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.get('/api/auth/verify-email', async (request, reply) => {
    try {
      const { token } = request.query;
      if (!token) {
        return reply.code(400).send({ error: 'Verification token is required' });
      }
      const result = await verifyEmail(token);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.post('/api/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const result = await logout(request.user.id);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post('/api/auth/logout-all', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const result = await logoutAll(request.user.id);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: error.message });
    }
  });
}

export default authRoutes;
