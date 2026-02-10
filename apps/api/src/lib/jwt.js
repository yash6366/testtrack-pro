export function signToken(fastify, payload, expiresIn = '7d') {
  return fastify.jwt.sign(payload, { expiresIn });
}

export async function verifyToken(fastify, token) {
  try {
    return await fastify.jwt.verify(token);
  } catch (error) {
    throw new Error('Invalid token');
  }
}
