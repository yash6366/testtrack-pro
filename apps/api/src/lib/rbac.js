import { getPrismaClient } from './prisma.js';

const prisma = getPrismaClient();

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

/**
 * Verify JWT token and load user from database
 * @param {Object} fastify - Fastify instance
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object|null>} User object with id, email, role or null if invalid
 */
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

/**
 * Create authentication guard middleware
 * @param {Object} fastify - Fastify instance
 * @returns {Object} Object containing requireAuth and requireRoles middleware
 */
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

    const projectCheck = await requireProjectAccess(request, reply, { allowMissingProject: true });
    if (projectCheck && projectCheck.blocked) {
      return;
    }
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

  const requireProjectRole = async (request, reply, requiredRole) => {
    const projectAccess = await requireProjectAccess(request, reply);
    if (projectAccess && projectAccess.blocked) {
      return;
    }

    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const allowed = required.map((role) => normalizeRole(role));
    const projectRole = normalizeRole(request.projectRole);

    if (!projectRole) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if (!allowed.includes(projectRole)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };

  return { requireAuth, requireRoles, requireProjectRole };
}

function resolveProjectIdFromRequest(request) {
  const candidates = [
    request?.params?.projectId,
    request?.query?.projectId,
    request?.body?.projectId,
    request?.apiKey?.projectId,
  ].filter((value) => value !== undefined && value !== null && value !== '');

  if (candidates.length === 0) {
    return null;
  }

  const normalized = candidates.map((value) => Number(value));
  if (normalized.some((value) => Number.isNaN(value))) {
    return NaN;
  }

  const unique = [...new Set(normalized)];
  if (unique.length > 1) {
    return NaN;
  }

  return unique[0];
}

async function loadProjectAccess(userId, projectId) {
  const [project, allocation] = await Promise.all([
    prisma.project.findUnique({
      where: { id: Number(projectId) },
      select: { id: true, ownerId: true, status: true },
    }),
    prisma.projectUserAllocation.findFirst({
      where: {
        projectId: Number(projectId),
        userId: Number(userId),
        isActive: true,
      },
      select: { projectRole: true, isActive: true },
    }),
  ]);

  return { project, allocation };
}

export async function requireProjectAccess(request, reply, options = {}) {
  const projectId = resolveProjectIdFromRequest(request);
  if (projectId === null) {
    if (options.allowMissingProject) {
      return { skipped: true };
    }
    reply.code(400).send({ error: 'projectId is required' });
    return { blocked: true };
  }

  if (Number.isNaN(projectId)) {
    reply.code(400).send({ error: 'Invalid projectId' });
    return { blocked: true };
  }

  request.projectId = Number(projectId);

  if (request.apiKey?.projectId) {
    if (Number(request.apiKey.projectId) !== Number(projectId)) {
      reply.code(403).send({ error: 'Forbidden' });
      return { blocked: true };
    }
    return { allowed: true, projectId: Number(projectId), projectRole: 'API_KEY' };
  }

  if (!request.user?.id) {
    reply.code(401).send({ error: 'Unauthorized' });
    return { blocked: true };
  }

  const { project, allocation } = await loadProjectAccess(request.user.id, projectId);

  if (!project) {
    reply.code(404).send({ error: 'Project not found' });
    return { blocked: true };
  }

  request.project = project;

  const normalizedRole = normalizeRole(request.user.role);
  if (normalizedRole === 'ADMIN') {
    request.projectRole = 'ADMIN';
    return { allowed: true, projectId: project.id, projectRole: 'ADMIN' };
  }

  if (project.ownerId === request.user.id) {
    request.projectRole = 'OWNER';
    return { allowed: true, projectId: project.id, projectRole: 'OWNER' };
  }

  if (!allocation) {
    reply.code(403).send({ error: 'Forbidden' });
    return { blocked: true };
  }

  request.projectRole = allocation.projectRole;
  return { allowed: true, projectId: project.id, projectRole: allocation.projectRole };
}
