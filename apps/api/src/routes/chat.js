import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards, verifyTokenAndLoadUser } from '../lib/rbac.js';

const prisma = getPrismaClient();
const channelSockets = new Map();
const socketChannels = new Map();
const MAX_CHANNEL_NAME_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 2000;

function getChannelSockets(channelId) {
  if (!channelSockets.has(channelId)) {
    channelSockets.set(channelId, new Set());
  }
  return channelSockets.get(channelId);
}

function subscribeSocket(socket, channelId) {
  getChannelSockets(channelId).add(socket);
  if (!socketChannels.has(socket)) {
    socketChannels.set(socket, new Set());
  }
  socketChannels.get(socket).add(channelId);
}

function unsubscribeSocket(socket) {
  const channels = socketChannels.get(socket);
  if (!channels) {
    return;
  }
  for (const channelId of channels) {
    const sockets = channelSockets.get(channelId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        channelSockets.delete(channelId);
      }
    }
  }
  socketChannels.delete(socket);
}

function broadcast(channelId, payload) {
  const sockets = channelSockets.get(channelId);
  if (!sockets) {
    return;
  }
  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === 1) {
      socket.send(message);
    }
  }
}

async function ensureMember(userId, channelId) {
  const member = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
  });

  if (!member) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }
}

async function createMessage(channelId, userId, body) {
  await ensureMember(userId, channelId);

  const message = await prisma.message.create({
    data: {
      channelId,
      senderId: userId,
      body,
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return message;
}

export async function chatRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);
  const allowAllRoles = requireRoles(['ADMIN', 'DEVELOPER', 'TESTER']);

  fastify.get('/api/chat/channels', { preHandler: [requireAuth, allowAllRoles] }, async (request) => {
    const userId = request.user.id;

    const channels = await prisma.channel.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        updatedAt: true,
      },
    });

    return { channels };
  });

  fastify.post('/api/chat/channels', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const { name } = request.body || {};

    if (!name || typeof name !== 'string') {
      return reply.code(400).send({ error: 'Channel name is required' });
    }

    if (name.trim().length > MAX_CHANNEL_NAME_LENGTH) {
      return reply.code(400).send({ error: 'Channel name is too long' });
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.trim(),
        type: 'CHANNEL',
        createdById: userId,
        members: {
          create: [{ userId }],
        },
      },
      select: { id: true, name: true, type: true },
    });

    return { channel };
  });

  fastify.post('/api/chat/channels/:id/members', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const channelId = Number(request.params.id);
    const { email, userId: invitedUserId } = request.body || {};

    if (Number.isNaN(channelId)) {
      return reply.code(400).send({ error: 'Invalid channel id' });
    }

    if (!email && !invitedUserId) {
      return reply.code(400).send({ error: 'Email or userId is required' });
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, type: true },
    });

    if (!channel) {
      return reply.code(404).send({ error: 'Channel not found' });
    }

    if (channel.type === 'DIRECT') {
      return reply.code(400).send({ error: 'Cannot add members to direct chats' });
    }

    await ensureMember(userId, channelId);

    let targetUserId = invitedUserId ? Number(invitedUserId) : null;

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      targetUserId = user.id;
    }

    if (!targetUserId || Number.isNaN(targetUserId)) {
      return reply.code(400).send({ error: 'Valid userId or email is required' });
    }

    if (targetUserId === userId) {
      return reply.code(400).send({ error: 'You are already a member' });
    }

    const existing = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: targetUserId,
        },
      },
    });

    if (existing) {
      return { member: existing, message: 'User is already a member' };
    }

    const member = await prisma.channelMember.create({
      data: {
        channelId,
        userId: targetUserId,
      },
    });

    return { member, message: 'Member added. Ask them to refresh channels.' };
  });

  fastify.post('/api/chat/direct', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const { userId: otherUserId } = request.body || {};

    if (!otherUserId || Number.isNaN(Number(otherUserId))) {
      return reply.code(400).send({ error: 'Valid userId is required' });
    }

    if (Number(otherUserId) === userId) {
      return reply.code(400).send({ error: 'Cannot create direct chat with yourself' });
    }

    const existing = await prisma.channel.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: Number(otherUserId) } } },
        ],
      },
      select: { id: true, name: true, type: true },
    });

    if (existing) {
      return { channel: existing };
    }

    const channel = await prisma.channel.create({
      data: {
        type: 'DIRECT',
        createdById: userId,
        members: {
          create: [{ userId }, { userId: Number(otherUserId) }],
        },
      },
      select: { id: true, name: true, type: true },
    });

    return { channel };
  });

  fastify.get('/api/chat/channels/:id/messages', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const channelId = Number(request.params.id);

    if (Number.isNaN(channelId)) {
      return reply.code(400).send({ error: 'Invalid channel id' });
    }

    await ensureMember(userId, channelId);

    const limitValue = Number(request.query.limit || 50);
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 50;

    const messages = await prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return { messages };
  });

  fastify.post('/api/chat/messages', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const { channelId, body } = request.body || {};

    if (!channelId || Number.isNaN(Number(channelId))) {
      return reply.code(400).send({ error: 'Valid channelId is required' });
    }

    if (!body || typeof body !== 'string') {
      return reply.code(400).send({ error: 'Message body is required' });
    }

    if (body.trim().length > MAX_MESSAGE_LENGTH) {
      return reply.code(400).send({ error: 'Message body is too long' });
    }

    const message = await createMessage(Number(channelId), userId, body.trim());

    broadcast(Number(channelId), {
      type: 'message',
      message,
    });

    return { message };
  });

  fastify.get('/api/chat/ws', { websocket: true }, async (connection, request) => {
    const { token } = request.query || {};

    if (!token) {
      connection.socket.close();
      return;
    }

    const user = await verifyTokenAndLoadUser(fastify, token);
    if (!user) {
      connection.socket.close();
      return;
    }

    connection.socket.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        if (payload.type === 'join') {
          const channelId = Number(payload.channelId);
          if (Number.isNaN(channelId)) {
            return;
          }
          await ensureMember(user.id, channelId);
          subscribeSocket(connection.socket, channelId);
          return;
        }

        if (payload.type === 'message') {
          const channelId = Number(payload.channelId);
          if (Number.isNaN(channelId)) {
            return;
          }
          if (!payload.body || typeof payload.body !== 'string') {
            return;
          }
          const trimmed = payload.body.trim();
          if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
            return;
          }
          const message = await createMessage(channelId, user.id, trimmed);
          broadcast(channelId, { type: 'message', message });
        }
      } catch (error) {
        fastify.log.error(error);
      }
    });

    connection.socket.on('close', () => {
      unsubscribeSocket(connection.socket);
    });
  });
}

export default chatRoutes;
