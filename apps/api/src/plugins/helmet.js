import helmet from '@fastify/helmet';

export async function setupHelmet(fastify) {
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });
}
