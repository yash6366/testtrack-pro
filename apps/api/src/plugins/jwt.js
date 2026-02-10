import jwt from '@fastify/jwt';

export async function setupJwt(fastify) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required to start the API server');
  }

  await fastify.register(jwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: '7d',
    },
  });
}
