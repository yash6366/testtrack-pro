import { signup, login, verifyEmail, logout, logoutAll, requestPasswordReset, resetPassword, changePassword } from '../services/authService.js';
import { createAuthGuards } from '../lib/rbac.js';

// Swagger schemas
const signupSchema = {
  tags: ['auth'],
  summary: 'User registration',
  description: 'Create a new user account',
  body: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', minLength: 2 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      role: { type: 'string', enum: ['DEVELOPER', 'TESTER'] },
    },
  },
  response: {
    201: {
      description: 'User created successfully',
      type: 'object',
      properties: {
        message: { type: 'string' },
        userId: { type: 'number' },
      },
    },
    400: {
      description: 'Validation error',
      type: 'object',
      properties: { error: { type: 'string' } },
    },
  },
};

const loginSchema = {
  tags: ['auth'],
  summary: 'User login',
  description: 'Authenticate and receive JWT token',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Login successful',
      type: 'object',
      properties: {
        token: { type: 'string', description: 'JWT authentication token' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'DEVELOPER', 'TESTER'] },
          },
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      type: 'object',
      properties: { error: { type: 'string' } },
    },
  },
};

const logoutSchema = {
  tags: ['auth'],
  summary: 'Logout current session',
  description: 'Invalidate current JWT token',
  response: {
    200: {
      description: 'Logged out successfully',
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  },
  security: [{ bearerAuth: [] }],
};

export async function authRoutes(fastify) {
  const { requireAuth } = createAuthGuards(fastify);
  
  fastify.post('/api/auth/signup', { schema: signupSchema }, async (request, reply) => {
    try {
      const result = await signup(fastify, request.body);
      reply.code(201).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.post('/api/auth/login', { schema: loginSchema }, async (request, reply) => {
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

  // Password Reset Routes
  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    try {
      const { email } = request.body;
      if (!email) {
        return reply.code(400).send({ error: 'Email is required' });
      }
      const result = await requestPasswordReset(email);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      // Always return 200 to prevent email enumeration
      reply.code(200).send({ 
        message: 'If an account exists with that email, a password reset link has been sent.' 
      });
    }
  });

  fastify.post('/api/auth/reset-password', async (request, reply) => {
    try {
      const { token, newPassword } = request.body;
      if (!token || !newPassword) {
        return reply.code(400).send({ error: 'Token and new password are required' });
      }
      const result = await resetPassword(token, newPassword);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.post('/api/auth/change-password', { 
    preHandler: requireAuth 
  }, async (request, reply) => {
    try {
      const { currentPassword, newPassword } = request.body;
      if (!currentPassword || !newPassword) {
        return reply.code(400).send({ error: 'Current password and new password are required' });
      }
      const result = await changePassword(request.user.id, currentPassword, newPassword);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.post('/api/auth/logout', { 
    schema: logoutSchema, 
    preHandler: requireAuth 
  }, async (request, reply) => {
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
