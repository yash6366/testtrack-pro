/**
 * CSRF PROTECTION PLUGIN FOR FASTIFY
 * Implements CSRF token validation for state-changing requests
 * Uses cryptographically secure token generation
 * Supports both in-memory and Redis storage for distributed systems
 */

import crypto from 'crypto';
import { getRedisClient } from '../lib/socket.js';

/**
 * CSRF token store (in-memory fallback)
 * For production, Redis is recommended for distributed systems
 */
const tokenStore = new Map();
const REDIS_PREFIX = 'csrf:';
const TOKEN_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Generate a CSRF token
 * @returns {string} Secure random token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a CSRF token for a session/user
 * @param {string} sessionId - Session or user identifier
 * @returns {Promise<string>} CSRF token
 */
async function createToken(sessionId) {
  const token = generateToken();
  const redisClient = getRedisClient();

  // Store token with expiration (1 hour)
  const expirationTime = Date.now() + TOKEN_EXPIRY_SECONDS * 1000;
  const tokenData = {
    sessionId,
    createdAt: Date.now(),
    expiresAt: expirationTime,
  };

  if (redisClient) {
    // Use Redis for distributed systems
    try {
      await redisClient.set(
        `${REDIS_PREFIX}${token}`,
        JSON.stringify(tokenData),
        { ex: TOKEN_EXPIRY_SECONDS }
      );
    } catch (error) {
      console.error('Redis CSRF token creation failed, using in-memory fallback:', error);
      // Fall back to in-memory storage
      tokenStore.set(token, tokenData);
    }
  } else {
    // Use in-memory storage
    tokenStore.set(token, tokenData);

    // Clean up expired tokens periodically
    if (tokenStore.size > 10000) {
      cleanupExpiredTokens();
    }
  }

  return token;
}

/**
 * Verify a CSRF token
 * @param {string} token - Token to verify
 * @param {string} sessionId - Expected session/user ID
 * @returns {Promise<boolean>} Token is valid
 */
async function verifyToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }

  const redisClient = getRedisClient();
  let tokenData = null;

  if (redisClient) {
    // Use Redis for distributed systems
    try {
      const data = await redisClient.get(`${REDIS_PREFIX}${token}`);
      if (data) {
        tokenData = JSON.parse(data);
      }
    } catch (error) {
      console.error('Redis CSRF token verification failed, checking in-memory fallback:', error);
      // Fall back to in-memory storage
      tokenData = tokenStore.get(token);
    }
  } else {
    // Use in-memory storage
    tokenData = tokenStore.get(token);
  }

  if (!tokenData) {
    return false;
  }

  // Check expiration
  if (Date.now() > tokenData.expiresAt) {
    // Delete expired token
    if (redisClient) {
      try {
        await redisClient.del(`${REDIS_PREFIX}${token}`);
      } catch (error) {
        console.error('Redis CSRF token deletion failed:', error);
      }
    }
    tokenStore.delete(token);
    return false;
  }

  // Verify session matches
  if (tokenData.sessionId !== sessionId) {
    return false;
  }

  // Token is valid, invalidate it for one-time use
  if (redisClient) {
    try {
      await redisClient.del(`${REDIS_PREFIX}${token}`);
    } catch (error) {
      console.error('Redis CSRF token deletion failed:', error);
    }
  }
  tokenStore.delete(token);

  return true;
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token);
    }
  }
}

/**
 * Get CSRF token for a user/session
 * @param {string} sessionId - Session or user identifier
 * @returns {Promise<string>} CSRF token
 */
async function getToken(sessionId) {
  const redisClient = getRedisClient();

  if (redisClient) {
    // Check Redis for existing valid token
    try {
      const keys = await redisClient.keys(`${REDIS_PREFIX}*`);
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const tokenData = JSON.parse(data);
          if (tokenData.sessionId === sessionId && Date.now() < tokenData.expiresAt) {
            return key.replace(REDIS_PREFIX, '');
          }
        }
      }
    } catch (error) {
      console.error('Redis CSRF token retrieval failed:', error);
      // Fall through to in-memory check or create new token
    }
  }

  // Check in-memory store for existing valid token
  for (const [token, data] of tokenStore.entries()) {
    if (data.sessionId === sessionId && Date.now() < data.expiresAt) {
      return token;
    }
  }

  // Create new token
  return await createToken(sessionId);
}

/**
 * Fastify CSRF protection plugin
 * @param {object} fastify - Fastify instance
 * @param {object} options - Plugin options
 */
export async function csrfProtectionPlugin(fastify, options = {}) {
  const { 
    headerName = 'x-csrf-token',
    excludePaths = ['/health', '/api/auth/login', '/api/auth/signup', '/api/auth/verify-email'],
  } = options;

  // Add CSRF utilities to fastify
  fastify.decorate('csrf', {
    createToken,
    getToken,
    verifyToken,
  });

  // Middleware to add CSRF token to all responses
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip for excluded paths
    if (excludePaths.some((path) => request.url.startsWith(path))) {
      return;
    }

    // For GET requests, generate token and send in response
    if (request.method === 'GET') {
      const sessionId = request.user?.id?.toString() || request.ip;
      const token = await fastify.csrf.getToken(sessionId);

      // Store token in response headers for SPA to use
      reply.header('X-CSRF-Token', token);
    }
  });

  // Middleware to validate CSRF token for state-changing requests
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip for excluded paths and safe methods
    if (excludePaths.some((path) => request.url.startsWith(path)) || request.method === 'GET' || request.method === 'HEAD') {
      return;
    }

    // For POST, PUT, PATCH, DELETE requests, validate CSRF token
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      // Get token from header (preferred) or body
      const token = request.headers[headerName] || request.body?.csrfToken;

      if (!token) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'CSRF token is missing',
        });
      }

      // Get session ID for verification
      const sessionId = request.user?.id?.toString() || request.ip;

      // Verify token (await the async function)
      const isValid = await fastify.csrf.verifyToken(token, sessionId);
      if (!isValid) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Invalid or expired CSRF token',
        });
      }

      // Token is valid, continue
    }
  });

  // Expose endpoint to get CSRF token
  fastify.get('/api/csrf-token', async (request, _reply) => {
    const sessionId = request.user?.id?.toString() || request.ip;
    const token = await fastify.csrf.getToken(sessionId);

    return {
      token,
      headerName,
    };
  });

  fastify.log.info('CSRF protection plugin registered');
}

export { createToken, verifyToken, getToken, generateToken };
