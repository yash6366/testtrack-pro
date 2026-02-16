/**
 * Sign JWT token with payload
 * @param {Object} fastify - Fastify instance
 * @param {Object} payload - Token payload data
 * @param {string} [expiresIn='7d'] - Token expiration time
 * @returns {string} Signed JWT token
 */
export function signToken(fastify, payload, expiresIn = '7d') {
  return fastify.jwt.sign(payload, { expiresIn });
}

/**
 * Verify JWT token and return payload
 * @param {Object} fastify - Fastify instance
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export async function verifyToken(fastify, token) {
  try {
    return await fastify.jwt.verify(token);
  } catch (error) {
    throw new Error('Invalid token');
  }
}
