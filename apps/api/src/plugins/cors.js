import cors from '@fastify/cors';

export async function setupCors(fastify) {
  const allowList = new Set(
    [process.env.FRONTEND_URL, 'http://localhost:5173']
      .filter(Boolean)
      .map((value) => value.trim())
  );

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowList.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });
}
