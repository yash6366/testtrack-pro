import { signup, login, verifyEmail, logout, logoutAll, requestPasswordReset, resetPassword, changePassword } from '../services/authService.js';
import { createAuthGuards } from '../lib/rbac.js';
import {
  getGoogleAuthorizationUrl,
  getGitHubAuthorizationUrl,
  exchangeGoogleCodeForToken,
  exchangeGitHubCodeForToken,
  findOrCreateOAuthUser,
  getUserOAuthProviders,
  linkOAuthProvider,
  unlinkOAuthProvider,
} from '../services/oauthService.js';
import { logError } from '../lib/logger.js';

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

  // ============ OAuth Routes ============

  /**
   * GET /api/auth/oauth/google
   * Start Google OAuth flow
   */
  fastify.get('/api/auth/oauth/google', async (request, reply) => {
    try {
      const { redirectUrl } = request.query;
      const { url, state } = getGoogleAuthorizationUrl(redirectUrl);
      
      reply.send({
        authUrl: url,
        state,
        provider: 'GOOGLE',
      });
    } catch (error) {
      logError('Error generating Google OAuth URL', error);
      reply.code(400).send({ error: error.message });
    }
  });

  /**
   * GET /api/auth/oauth/google/callback
   * Handle Google OAuth callback
   */
  fastify.get('/api/auth/oauth/google/callback', async (request, reply) => {
    try {
      const { code, redirectUrl } = request.query;

      if (!code) {
        return reply.code(400).send({ error: 'Authorization code is required' });
      }

      // Exchange code for tokens and get user info
      const oauthData = await exchangeGoogleCodeForToken(code, redirectUrl);

      // Find or create user
      const { user, isNewUser } = await findOrCreateOAuthUser(oauthData);

      // Generate JWT token
      const token = fastify.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: '7d' }
      );

      reply.code(200).send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          picture: user.picture,
          isVerified: user.isVerified,
        },
        isNewUser,
        provider: 'GOOGLE',
      });
    } catch (error) {
      logError('Google OAuth callback error', error);
      reply.code(400).send({ error: error.message });
    }
  });

  /**
   * GET /api/auth/oauth/github
   * Start GitHub OAuth flow
   */
  fastify.get('/api/auth/oauth/github', async (request, reply) => {
    try {
      const { redirectUrl } = request.query;
      const { url, state } = getGitHubAuthorizationUrl(redirectUrl);

      reply.send({
        authUrl: url,
        state,
        provider: 'GITHUB',
      });
    } catch (error) {
      logError('Error generating GitHub OAuth URL', error);
      reply.code(400).send({ error: error.message });
    }
  });

  /**
   * GET /api/auth/oauth/github/callback
   * Handle GitHub OAuth callback
   */
  fastify.get('/api/auth/oauth/github/callback', async (request, reply) => {
    try {
      const { code, redirectUrl } = request.query;

      if (!code) {
        return reply.code(400).send({ error: 'Authorization code is required' });
      }

      // Exchange code for tokens and get user info
      const oauthData = await exchangeGitHubCodeForToken(code, redirectUrl);

      // Find or create user
      const { user, isNewUser } = await findOrCreateOAuthUser(oauthData);

      // Generate JWT token
      const token = fastify.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: '7d' }
      );

      reply.code(200).send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          picture: user.picture,
          isVerified: user.isVerified,
        },
        isNewUser,
        provider: 'GITHUB',
      });
    } catch (error) {
      logError('GitHub OAuth callback error', error);
      reply.code(400).send({ error: error.message });
    }
  });

  /**
   * GET /api/auth/oauth/providers
   * Get OAuth providers linked to current user
   */
  fastify.get('/api/auth/oauth/providers', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const providers = await getUserOAuthProviders(request.user.id);
      reply.send(providers);
    } catch (error) {
      logError('Error fetching OAuth providers', error);
      reply.code(400).send({ error: error.message });
    }
  });

  /**
   * POST /api/auth/oauth/link
   * Link OAuth provider to existing authenticated user
   */
  fastify.post('/api/auth/oauth/link', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { provider, code, redirectUrl } = request.body;

      if (!provider || !code) {
        return reply.code(400).send({ error: 'Provider and authorization code are required' });
      }

      let oauthData;

      if (provider.toUpperCase() === 'GOOGLE') {
        oauthData = await exchangeGoogleCodeForToken(code, redirectUrl);
      } else if (provider.toUpperCase() === 'GITHUB') {
        oauthData = await exchangeGitHubCodeForToken(code, redirectUrl);
      } else {
        return reply.code(400).send({ error: 'Invalid OAuth provider' });
      }

      // Link provider to user
      const oauthIntegration = await linkOAuthProvider(request.user.id, oauthData);

      reply.code(200).send({
        message: `${provider} account linked successfully`,
        oauthIntegration,
      });
    } catch (error) {
      logError('Error linking OAuth provider', error);
      reply.code(400).send({ error: error.message });
    }
  });

  /**
   * DELETE /api/auth/oauth/unlink/:provider
   * Unlink OAuth provider from current user
   */
  fastify.delete('/api/auth/oauth/unlink/:provider', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { provider } = request.params;

      if (!provider) {
        return reply.code(400).send({ error: 'Provider is required' });
      }

      await unlinkOAuthProvider(request.user.id, provider.toUpperCase());

      reply.send({
        message: `${provider} account unlinked successfully`,
      });
    } catch (error) {
      logError('Error unlinking OAuth provider', error);
      reply.code(400).send({ error: error.message });
    }
  });
}

export default authRoutes;
