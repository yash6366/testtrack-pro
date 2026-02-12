import jwt from '@fastify/jwt';

export async function setupJwt(fastify) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required to start the API server');
  }

  // Validate JWT_SECRET length (minimum 32 bytes for HS256)
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for HS256 security');
  }

  await fastify.register(jwt, {
    secret: jwtSecret,
    sign: {
      algorithm: 'HS256', // Explicitly specify HMAC SHA-256
      expiresIn: '7d',
    },
    verify: {
      algorithms: ['HS256'], // Only accept HS256 tokens
    },
  });

  fastify.log.info('JWT plugin registered with HS256 algorithm');
}
