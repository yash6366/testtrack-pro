import { getPrismaClient } from './prisma.js';

const prisma = getPrismaClient();

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

export async function verifyTokenAndLoadUser(fastify, token) {
  if (!token) {
    return null;
  }

  let payload;
  try {
    payload = await fastify.jwt.verify(token);
  } catch (error) {
    return null;
  }

  if (!payload?.id || !payload?.role || typeof payload.tokenVersion !== 'number') {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      tokenVersion: true,
    },
  });

  if (!user || !user.isVerified) {
    return null;
  }

  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole !== normalizeRole(payload.role)) {
    return null;
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: normalizedRole,
  };
}

export function createAuthGuards(fastify) {
  const requireAuth = async (request, reply) => {
    let payload;
    try {
      payload = await request.jwtVerify();
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (!payload?.id || !payload?.role || typeof payload.tokenVersion !== 'number') {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        tokenVersion: true,
      },
    });

    if (!user || !user.isVerified) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole !== normalizeRole(payload.role)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: normalizedRole,
    };
  };

  const requireRoles = (roles = []) => {
    const allowed = roles.map((role) => normalizeRole(role));

    return async (request, reply) => {
      const currentRole = normalizeRole(request.user?.role);

      if (!currentRole) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      if (!allowed.includes(currentRole)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    };
  };

  return { requireAuth, requireRoles };
}
