import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards, verifyTokenAndLoadUser } from '../lib/rbac.js';

const prisma = getPrismaClient();
const channelSockets = new Map(); // Map<channelId, Set<socket>>
const socketChannels = new Map(); // Map<socket, Set<channelId>>
const socketUsers = new Map(); // Map<socket, userId> - track which user owns each socket
const MAX_CHANNEL_NAME_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 2000;

function getChannelSockets(channelId) {
  if (!channelSockets.has(channelId)) {
    channelSockets.set(channelId, new Set());
  }
  return channelSockets.get(channelId);
}

function subscribeSocket(socket, channelId, userId) {
  getChannelSockets(channelId).add(socket);
  if (!socketChannels.has(socket)) {
    socketChannels.set(socket, new Set());
  }
  socketChannels.get(socket).add(channelId);
  socketUsers.set(socket, userId);
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
  socketUsers.delete(socket);
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

// Get online user IDs for a channel
function getOnlineUsersForChannel(channelId) {
  const sockets = channelSockets.get(channelId);
  const onlineUserIds = new Set();
  if (sockets) {
    for (const socket of sockets) {
      const userId = socketUsers.get(socket);
      if (userId) {
        onlineUserIds.add(userId);
      }
    }
  }
  return onlineUserIds;
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isMuted: true, mutedUntil: true },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.isMuted) {
    if (user.mutedUntil && new Date() > user.mutedUntil) {
      await prisma.user.update({
        where: { id: userId },
        data: { isMuted: false, mutedUntil: null, muteReason: null, mutedBy: null },
      });
    } else {
      const error = new Error('User is muted');
      error.statusCode = 403;
      throw error;
    }
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { isLocked: true, isDisabled: true },
  });

  if (!channel) {
    const error = new Error('Channel not found');
    error.statusCode = 404;
    throw error;
  }

  const isAdmin = String(user.role || '').toUpperCase() === 'ADMIN';
  if (channel.isDisabled && !isAdmin) {
    const error = new Error('CHAT_DISABLED');
    error.code = 'CHAT_DISABLED';
    error.channelId = channelId;
    error.statusCode = 403;
    throw error;
  }

  if (channel.isLocked && !isAdmin) {
    const error = new Error('CHANNEL_LOCKED');
    error.code = 'CHANNEL_LOCKED';
    error.channelId = channelId;
    error.statusCode = 403;
    throw error;
  }

  const message = await prisma.channelMessage.create({
    data: {
      channelId,
      userId,
      message: body,
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return message;
}

// Update the JSON reaction summary for quick lookups.
async function updateMessageReactionsSnapshot(messageId) {
  const reactions = await prisma.messageReaction.findMany({
    where: { messageId },
    select: { emoji: true },
  });

  const summary = reactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  await prisma.channelMessage.update({
    where: { id: messageId },
    data: { reactions: summary },
  });
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
        isLocked: true,
        isDisabled: true,
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
        members: {
          create: [{ userId }],
        },
      },
      select: { id: true, name: true },
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

    // Enforce lock/disable rules for reactions.
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

    const messages = await prisma.channelMessage.findMany({
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
    try {
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
    } catch (error) {
      const status = error.statusCode || 500;
      if (error?.code === 'CHAT_DISABLED') {
        return reply.code(status).send({ error: 'CHAT_DISABLED', channelId: error.channelId });
      }
      if (error?.code === 'CHANNEL_LOCKED') {
        return reply.code(status).send({ error: 'CHANNEL_LOCKED', channelId: error.channelId });
      }
      return reply.code(status).send({ error: error.message || 'Failed to send message' });
    }
  });

  // Get channel members with online status
  fastify.get('/api/chat/channels/:id/members', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const channelId = Number(request.params.id);

    if (Number.isNaN(channelId)) {
      return reply.code(400).send({ error: 'Invalid channel id' });
    }

    await ensureMember(userId, channelId);

    const members = await prisma.channelMember.findMany({
      where: { channelId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, picture: true, isMuted: true, mutedUntil: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Get online users from websocket connections
    const onlineUserIds = new Set();
    const sockets = getChannelSockets(channelId);
    if (sockets) {
      // In a production app, you'd track user IDs with sockets properly
      // For now, we return all members and let the frontend track online status via socket
    }

    return {
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.user.role,
        picture: m.user.picture,
        joinedAt: m.joinedAt,
        isMuted: m.user.isMuted,
        mutedUntil: m.user.mutedUntil,
        isOnline: onlineUserIds.has(m.user.id),
      })),
    };
  });

  // Add/remove reaction to a message
  fastify.post('/api/chat/messages/:id/reactions', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const messageId = Number(request.params.id);
    const { emoji, action = 'add' } = request.body || {};

    if (Number.isNaN(messageId)) {
      return reply.code(400).send({ error: 'Invalid message id' });
    }

    if (!emoji || typeof emoji !== 'string' || emoji.trim().length === 0) {
      return reply.code(400).send({ error: 'Valid emoji is required' });
    }

    // Verify user is member of the channel
    const message = await prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    await ensureMember(userId, message.channelId);

    const channel = await prisma.channel.findUnique({
      where: { id: message.channelId },
      select: { isLocked: true, isDisabled: true },
    });

    if (!channel) {
      return reply.code(404).send({ error: 'Channel not found' });
    }

    const isAdmin = String(request.user.role || '').toUpperCase() === 'ADMIN';
    if (channel.isDisabled && !isAdmin) {
      return reply.code(403).send({ error: 'CHAT_DISABLED', channelId: message.channelId });
    }
    if (channel.isLocked && !isAdmin) {
      return reply.code(403).send({ error: 'CHANNEL_LOCKED', channelId: message.channelId });
    }

    if (action === 'add') {
      const reaction = await prisma.messageReaction.upsert({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji: emoji.trim(),
          },
        },
        update: {},
        create: {
          messageId,
          userId,
          emoji: emoji.trim(),
        },
      });

      broadcast(message.channelId, {
        type: 'reaction_add',
        messageId,
        reaction,
      });

      await updateMessageReactionsSnapshot(messageId);

      if (fastify.io) {
        fastify.io.to(`channel-${message.channelId}`).emit('reaction_added', {
          messageId,
          reaction,
          channelId: message.channelId,
          timestamp: new Date().toISOString(),
        });
      }

      return { reaction };
    } else if (action === 'remove') {
      await prisma.messageReaction.deleteMany({
        where: {
          messageId,
          userId,
          emoji: emoji.trim(),
        },
      });

      broadcast(message.channelId, {
        type: 'reaction_remove',
        messageId,
        userId,
        emoji: emoji.trim(),
      });

      await updateMessageReactionsSnapshot(messageId);

      if (fastify.io) {
        fastify.io.to(`channel-${message.channelId}`).emit('reaction_removed', {
          messageId,
          userId,
          emoji: emoji.trim(),
          channelId: message.channelId,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };
    }

    return reply.code(400).send({ error: 'Invalid action' });
  });

  // Get reactions for a message
  fastify.get('/api/chat/messages/:id/reactions', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const messageId = Number(request.params.id);

    if (Number.isNaN(messageId)) {
      return reply.code(400).send({ error: 'Invalid message id' });
    }

    const message = await prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    await ensureMember(userId, message.channelId);

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: { id: true, name: true, picture: true },
        },
      },
    });

    // Group reactions by emoji
    const grouped = {};
    reactions.forEach((reaction) => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
        };
      }
      grouped[reaction.emoji].count += 1;
      grouped[reaction.emoji].users.push(reaction.user);
    });

    return { reactions: Object.values(grouped) };
  });

  // Add reply to a message
  fastify.post('/api/chat/messages/:id/reply', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const replyToId = Number(request.params.id);
      const { channelId, body } = request.body || {};

      if (Number.isNaN(replyToId)) {
        return reply.code(400).send({ error: 'Invalid message id' });
      }

      if (!channelId || Number.isNaN(Number(channelId))) {
        return reply.code(400).send({ error: 'Valid channelId is required' });
      }

      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        return reply.code(400).send({ error: 'Message body is required' });
      }

      if (body.trim().length > MAX_MESSAGE_LENGTH) {
        return reply.code(400).send({ error: 'Message body is too long' });
      }

      // Ensure reply-to message exists
      const originalMessage = await prisma.channelMessage.findUnique({
        where: { id: replyToId },
        select: { channelId: true },
      });

      if (!originalMessage) {
        return reply.code(404).send({ error: 'Original message not found' });
      }

      if (originalMessage.channelId !== Number(channelId)) {
        return reply.code(400).send({ error: 'Reply message must be in the same channel' });
      }

      // Create the reply message
      const replyMessage = await createMessage(Number(channelId), userId, body.trim());

      // Link the reply
      await prisma.messageReply.create({
        data: {
          messageId: replyMessage.id,
          replyToId,
        },
      });

      // Store reply reference on the message for faster reads
      await prisma.channelMessage.update({
        where: { id: replyMessage.id },
        data: { replyToId },
      });

      broadcast(Number(channelId), {
        type: 'message',
        message: {
          ...replyMessage,
          replyToId,
        },
      });

      if (fastify.io) {
        fastify.io.to(`channel-${channelId}`).emit('message', {
          ...replyMessage,
          replyToId,
          channelId: Number(channelId),
        });
      }

      return { message: replyMessage, replyToId };
    } catch (error) {
      const status = error.statusCode || 500;
      if (error?.code === 'CHAT_DISABLED') {
        return reply.code(status).send({ error: 'CHAT_DISABLED', channelId: error.channelId });
      }
      if (error?.code === 'CHANNEL_LOCKED') {
        return reply.code(status).send({ error: 'CHANNEL_LOCKED', channelId: error.channelId });
      }
      return reply.code(status).send({ error: error.message || 'Failed to send reply' });
    }
  });

  // Get pinned messages for a channel
  fastify.get('/api/chat/channels/:id/pinned', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const channelId = Number(request.params.id);

    if (Number.isNaN(channelId)) {
      return reply.code(400).send({ error: 'Invalid channel id' });
    }

    await ensureMember(userId, channelId);

    const pinnedMessages = await prisma.pinnedMessage.findMany({
      where: { channelId },
      include: {
        message: {
          include: {
            sender: {
              select: { id: true, name: true, email: true, picture: true },
            },
          },
        },
        pinnedByUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { pinnedAt: 'desc' },
    });

    return { pinnedMessages };
  });

  // Pin a message (Admin only)
  fastify.post('/api/chat/messages/:id/pin', { preHandler: [requireAuth, requireRoles(['ADMIN'])] }, async (request, reply) => {
    const userId = request.user.id;
    const messageId = Number(request.params.id);

    if (Number.isNaN(messageId)) {
      return reply.code(400).send({ error: 'Invalid message id' });
    }

    const message = await prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    await ensureMember(userId, message.channelId);

    // Check if already pinned
    const existing = await prisma.pinnedMessage.findUnique({
      where: {
        channelId_messageId: {
          channelId: message.channelId,
          messageId,
        },
      },
    });

    if (existing) {
      return reply.code(400).send({ error: 'Message is already pinned' });
    }

    const pinnedMessage = await prisma.pinnedMessage.create({
      data: {
        channelId: message.channelId,
        messageId,
        pinnedBy: userId,
      },
      include: {
        message: {
          include: {
            sender: {
              select: { id: true, name: true, email: true, picture: true },
            },
          },
        },
      },
    });

    broadcast(message.channelId, {
      type: 'message_pinned',
      pinnedMessage,
    });

    await prisma.channelMessage.update({
      where: { id: messageId },
      data: {
        isPinned: true,
        pinnedById: userId,
        pinnedAt: new Date(),
      },
    });

    if (fastify.io) {
      fastify.io.to(`channel-${message.channelId}`).emit('message_pinned', {
        pinnedMessage,
        channelId: message.channelId,
        timestamp: new Date().toISOString(),
      });
    }

    return { pinnedMessage };
  });

  // Unpin a message (Admin only)
  fastify.delete('/api/chat/messages/:id/pin', { preHandler: [requireAuth, requireRoles(['ADMIN'])] }, async (request, reply) => {
    const userId = request.user.id;
    const messageId = Number(request.params.id);

    if (Number.isNaN(messageId)) {
      return reply.code(400).send({ error: 'Invalid message id' });
    }

    const message = await prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    await ensureMember(userId, message.channelId);

    await prisma.pinnedMessage.deleteMany({
      where: {
        messageId,
      },
    });

    await prisma.channelMessage.update({
      where: { id: messageId },
      data: {
        isPinned: false,
        pinnedById: null,
        pinnedAt: null,
      },
    });

    broadcast(message.channelId, {
      type: 'message_unpinned',
      messageId,
    });

    if (fastify.io) {
      fastify.io.to(`channel-${message.channelId}`).emit('message_unpinned', {
        messageId,
        channelId: message.channelId,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
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
        
        // User joins a channel
        if (payload.type === 'join') {
          const channelId = Number(payload.channelId);
          if (Number.isNaN(channelId)) {
            return;
          }
          await ensureMember(user.id, channelId);
          subscribeSocket(connection.socket, channelId, user.id);
          
          // Broadcast user joined event
          broadcast(channelId, {
            type: 'user_joined',
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            onlineUsers: Array.from(getOnlineUsersForChannel(channelId)),
          });
          return;
        }

        // New message with optional mentions
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
          
          // Parse and handle mentions (@username)
          const mentionRegex = /@(\w+)/g;
          const matches = trimmed.matchAll(mentionRegex);
          const mentionedUsernames = Array.from(matches, m => m[1]);
          
          if (mentionedUsernames.length > 0) {
            // Find users by username
            const mentionedUsers = await prisma.user.findMany({
              where: {
                name: { in: mentionedUsernames },
              },
              select: { id: true, name: true },
            });
            
            // Create mention records
            for (const mentionedUser of mentionedUsers) {
              await prisma.messageMention.create({
                data: {
                  messageId: message.id,
                  mentionedUserId: mentionedUser.id,
                },
              }).catch(() => {
                // Ignore if already mentioned
              });
            }
            
            // Broadcast mentions notification
            broadcast(channelId, {
              type: 'message',
              message: {
                ...message,
                mentions: mentionedUsers,
              },
            });
          } else {
            broadcast(channelId, {
              type: 'message',
              message,
            });
          }
        }
      } catch (error) {
        fastify.log.error(error);
      }
    });

    connection.socket.on('close', () => {
      const userId = socketUsers.get(connection.socket);
      const channels = socketChannels.get(connection.socket);
      
      // Broadcast user left event for each channel
      if (channels && userId) {
        for (const channelId of channels) {
          broadcast(channelId, {
            type: 'user_left',
            userId,
            onlineUsers: Array.from(getOnlineUsersForChannel(channelId)),
          });
        }
      }
      
      unsubscribeSocket(connection.socket);
    });
  });
}

export default chatRoutes;
