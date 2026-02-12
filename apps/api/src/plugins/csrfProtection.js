/**
 * CSRF PROTECTION PLUGIN FOR FASTIFY
 * Implements CSRF token validation for state-changing requests
 * Uses cryptographically secure token generation
 */

import crypto from 'crypto';

/**
 * CSRF token store (in-memory)
 * In production, use Redis or database for distributed systems
 */
const tokenStore = new Map();

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
 * @returns {string} CSRF token
 */
function createToken(sessionId) {
  const token = generateToken();

  // Store token with expiration (1 hour)
  const expirationTime = Date.now() + 60 * 60 * 1000;
  tokenStore.set(token, {
    sessionId,
    createdAt: Date.now(),
    expiresAt: expirationTime,
  });

  // Clean up expired tokens periodically
  if (tokenStore.size > 10000) {
    cleanupExpiredTokens();
  }

  return token;
}

/**
 * Verify a CSRF token
 * @param {string} token - Token to verify
 * @param {string} sessionId - Expected session/user ID
 * @returns {boolean} Token is valid
 */
function verifyToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }

  const tokenData = tokenStore.get(token);

  if (!tokenData) {
    return false;
  }

  // Check expiration
  if (Date.now() > tokenData.expiresAt) {
    tokenStore.delete(token);
    return false;
  }

  // Verify session matches
  if (tokenData.sessionId !== sessionId) {
    return false;
  }

  // Token is valid, invalidate it for one-time use
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
 * @returns {string} CSRF token
 */
function getToken(sessionId) {
  // Check if user already has a valid token
  for (const [token, data] of tokenStore.entries()) {
    if (data.sessionId === sessionId && Date.now() < data.expiresAt) {
      return token;
    }
  }

  // Create new token
  return createToken(sessionId);
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
      const token = fastify.csrf.getToken(sessionId);

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

      // Verify token
      if (!fastify.csrf.verifyToken(token, sessionId)) {
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
    const token = fastify.csrf.getToken(sessionId);

    return {
      token,
      headerName,
    };
  });

  fastify.log.info('CSRF protection plugin registered');
}

export { createToken, verifyToken, getToken, generateToken };
