import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';

const prisma = getPrismaClient();
const MAX_CHANNEL_NAME_LENGTH = 60;

/**
 * Initialize role-based channels on server startup
 * Creates #testers, #developers, #admins if they don't exist
 */
export async function initializeRoleChannels() {
  const roleChannels = [
    {
      name: 'testers',
      description: 'Channel for Testers and Admins',
      allowedRoles: ['ADMIN', 'TESTER'],
      channelType: 'role_based',
    },
    {
      name: 'developers',
      description: 'Channel for Developers and Admins',
      allowedRoles: ['ADMIN', 'DEVELOPER'],
      channelType: 'role_based',
    },
    {
      name: 'admins',
      description: 'Channel for Admins only',
      allowedRoles: ['ADMIN'],
      channelType: 'role_based',
    },
  ];

  for (const channelConfig of roleChannels) {
    const existing = await prisma.channel.findUnique({
      where: { name: channelConfig.name },
    });

    if (!existing) {
      await prisma.channel.create({
        data: {
          name: channelConfig.name,
          description: channelConfig.description,
          allowedRoles: channelConfig.allowedRoles,
          channelType: channelConfig.channelType,
          isSystemChannel: true,
          type: 'GROUP',
        },
      });
    }
  }
}

/**
 * Auto-join user to their role-based channels
 */
export async function autoJoinRoleChannels(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return;

  // Find role-based channels this user should join
  const roleChannels = await prisma.channel.findMany({
    where: {
      channelType: 'role_based',
      allowedRoles: {
        hasSome: [user.role],
      },
    },
  });

  // Add user to each channel
  for (const channel of roleChannels) {
    const existing = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId,
        },
      },
    });

    if (!existing) {
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId,
        },
      });
    }
  }
}

/**
 * Update user's role channels when role changes
 */
export async function updateUserRoleChannels(userId, oldRole, newRole) {
  // Get all role-based channels
  const allRoleChannels = await prisma.channel.findMany({
    where: { channelType: 'role_based' },
    select: { id: true, allowedRoles: true },
  });

  for (const channel of allRoleChannels) {
    const canAccessWithNewRole = channel.allowedRoles.includes(newRole);
    const hadAccessWithOldRole = channel.allowedRoles.includes(oldRole);
    const hasAccess = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId,
        },
      },
    });

    if (canAccessWithNewRole && !hasAccess) {
      // Add user to channel
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId,
        },
      });
    } else if (!canAccessWithNewRole && hasAccess) {
      // Remove user from channel
      await prisma.channelMember.deleteMany({
        where: {
          channelId: channel.id,
          userId,
        },
      });
    }
  }
}

export async function channelRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);
  const allowAllRoles = requireRoles(['ADMIN', 'DEVELOPER', 'TESTER']);
  const requireAdmin = requireRoles(['ADMIN']);

  // Get all accessible channels
  fastify.get('/api/channels', { preHandler: [requireAuth, allowAllRoles] }, async (request) => {
    const userId = request.user.id;
    const userRole = request.user.role;

    const channels = await prisma.channel.findMany({
      where: {
        archived: false,
        members: {
          some: { userId },
        },
        OR: [
          // User is a member
          { members: { some: { userId } } },
          // It's a role-based channel and user has the role
          {
            channelType: 'role_based',
            allowedRoles: { hasSome: [userRole] },
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        channelType: true,
        allowedRoles: true,
        projectName: true,
        type: true,
        isLocked: true,
        isDisabled: true,
        updatedAt: true,
        _count: {
          select: { members: true },
        },
      },
    });

    // Group channels by type
    return {
      channels: {
        general: channels.filter((c) => c.channelType === 'general'),
        roleChannels: channels.filter((c) => c.channelType === 'role_based'),
        projects: channels.filter((c) => c.channelType === 'project'),
      },
    };
  });

  // Get channel lock/disable status
  fastify.get('/api/channels/:id/status', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const userRole = request.user.role;
    const channelId = Number(request.params.id);

    if (Number.isNaN(channelId)) {
      return reply.code(400).send({ error: 'Invalid channel id' });
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        channelType: true,
        allowedRoles: true,
        isLocked: true,
        isDisabled: true,
        members: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });

    if (!channel) {
      return reply.code(404).send({ error: 'Channel not found' });
    }

    const isMember = channel.members.length > 0;
    const hasRoleAccess = channel.channelType === 'role_based' && channel.allowedRoles?.includes(userRole);
    if (!isMember && !hasRoleAccess) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    return {
      channelId: channel.id,
      isLocked: channel.isLocked,
      isDisabled: channel.isDisabled,
    };
  });

  // Get archived channels (Admin only)
  fastify.get('/api/channels/archived', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const channels = await prisma.channel.findMany({
      where: { archived: true },
      select: {
        id: true,
        name: true,
        description: true,
        projectName: true,
        updatedAt: true,
      },
    });

    return { channels };
  });

  // Create a new project channel (Admin only)
  fastify.post('/api/channels/create', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const { name, description, projectName, allowedRoles, allowedUserIds } = request.body || {};

    if (!name || typeof name !== 'string') {
      return reply.code(400).send({ error: 'Channel name is required' });
    }

    if (name.trim().length > MAX_CHANNEL_NAME_LENGTH) {
      return reply.code(400).send({ error: 'Channel name is too long' });
    }

    // Auto-prefix with # if not present
    const finalName = name.startsWith('#') ? name : `#${name}`;

    const channel = await prisma.channel.create({
      data: {
        name: finalName.trim(),
        description,
        projectName,
        channelType: 'project',
        allowedRoles: allowedRoles || ['ADMIN', 'DEVELOPER', 'TESTER'],
        createdById: request.user.id,
        type: 'GROUP',
        members: {
          create: [{ userId: request.user.id }],
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        projectName: true,
        channelType: true,
        allowedRoles: true,
      },
    });

    // Auto-join users with allowed roles to ensure access.
    const rolesToJoin = Array.isArray(allowedRoles) && allowedRoles.length > 0
      ? allowedRoles
      : ['ADMIN', 'DEVELOPER', 'TESTER'];

    const roleUsers = await prisma.user.findMany({
      where: {
        role: { in: rolesToJoin },
        isActive: true,
      },
      select: { id: true },
    });

    if (roleUsers.length > 0) {
      await prisma.channelMember.createMany({
        data: roleUsers.map((user) => ({
          channelId: channel.id,
          userId: user.id,
        })),
        skipDuplicates: true,
      });
    }

    const explicitUserIds = Array.isArray(allowedUserIds)
      ? allowedUserIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [];

    if (explicitUserIds.length > 0) {
      await prisma.channelMember.createMany({
        data: explicitUserIds.map((userId) => ({
          channelId: channel.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    if (fastify.io) {
      const targetRoles = new Set([...(rolesToJoin || []), 'ADMIN']);
      targetRoles.forEach((role) => {
        fastify.io.to(`role:${String(role).toUpperCase()}`).emit('channel_created', {
          channel,
          timestamp: new Date().toISOString(),
        });
      });
    }

    return { channel };
  });

  // Archive/restore a channel (Admin only)
  fastify.post('/api/channels/:id/archive', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const channelId = Number(request.params.id);
    const { archived } = request.body || { archived: true };

    if (Number.isNaN(channelId)) {
      return reply.code(400).send({ error: 'Invalid channel id' });
    }

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: { archived },
      select: { id: true, name: true, archived: true },
    });

    if (fastify.io) {
      fastify.io.emit('channel_archived', {
        channelId: channel.id,
        archived: channel.archived,
        timestamp: new Date().toISOString(),
      });
    }

    return { channel };
  });

  // Check channel access
  fastify.get('/api/channels/:id/access', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const userRole = request.user.role;
    const channelId = Number(request.params.id);

    if (Number.isNaN(channelId)) {
      return reply.code(400).send({ error: 'Invalid channel id' });
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        channelType: true,
        allowedRoles: true,
        archived: true,
        members: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!channel) {
      return reply.code(404).send({ error: 'Channel not found' });
    }

    if (channel.archived) {
      return reply.code(410).send({ error: 'Channel is archived' });
    }

    const isMember = channel.members.length > 0;
    const canAccess =
      isMember ||
      (channel.channelType === 'role_based' && channel.allowedRoles.includes(userRole)) ||
      userRole === 'ADMIN';

    return { hasAccess: canAccess, channel };
  });
}

export default channelRoutes;
