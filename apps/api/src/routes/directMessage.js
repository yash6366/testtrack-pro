import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';

const prisma = getPrismaClient();
const MAX_MESSAGE_LENGTH = 2000;

export async function directMessageRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);
  const allowAllRoles = requireRoles(['ADMIN', 'DEVELOPER', 'TESTER']);

  // Get DM contacts (all active users except self)
  fastify.get('/api/dm/contacts', { preHandler: [requireAuth, allowAllRoles] }, async (request) => {
    const userId = request.user.id;

    const contacts = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        picture: true,
      },
      orderBy: { name: 'asc' },
    });

    return { contacts };
  });

  // Get DM conversation with a specific user
  fastify.get('/api/dm/:userId/messages', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const currentUserId = request.user.id;
    const otherUserId = Number(request.params.userId);

    if (Number.isNaN(otherUserId)) {
      return reply.code(400).send({ error: 'Invalid user id' });
    }

    if (otherUserId === currentUserId) {
      return reply.code(400).send({ error: 'Cannot DM yourself' });
    }

    const limit = Math.min(Math.max(Number(request.query.limit || 50), 1), 100);

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: {
          select: { id: true, name: true, email: true, picture: true, role: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, picture: true, role: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, picture: true } },
          },
        },
      },
    });

    // Mark messages as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        recipientId: currentUserId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { messages };
  });

  // Get DM conversations list
  fastify.get('/api/dm/conversations', { preHandler: [requireAuth, allowAllRoles] }, async (request) => {
    try {
      const userId = request.user.id;

      // Get all messages where user is involved
      const allMessages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId },
          ],
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true, picture: true, role: true },
          },
          recipient: {
            select: { id: true, name: true, email: true, picture: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group by conversation partner and build summary
      const conversationMap = new Map();
      
      for (const msg of allMessages) {
        const otherUserId = msg.senderId === userId ? msg.recipientId : msg.senderId;
        const otherUser = msg.senderId === userId ? msg.recipient : msg.sender;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            otherUserId,
            name: otherUser.name,
            email: otherUser.email,
            picture: otherUser.picture,
            role: otherUser.role,
            id: otherUser.id,
            lastMessageAt: msg.createdAt,
            lastMessage: msg.message,
            unreadCount: 0,
          });
        }
        
        // Count unread messages from the other user
        if (msg.recipientId === userId && !msg.isRead) {
          const conv = conversationMap.get(otherUserId);
          conv.unreadCount++;
        }
      }

      const conversations = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

      return { conversations };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  });

  // Send a DM
  fastify.post('/api/dm/send', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const senderId = request.user.id;
    const { recipientId, message } = request.body || {};

    if (!recipientId || Number.isNaN(Number(recipientId))) {
      return reply.code(400).send({ error: 'Valid recipientId is required' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return reply.code(400).send({ error: 'Message is required' });
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return reply.code(400).send({ error: 'Message is too long' });
    }

    if (Number(recipientId) === senderId) {
      return reply.code(400).send({ error: 'Cannot DM yourself' });
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { isMuted: true, mutedUntil: true },
    });

    if (!sender) {
      return reply.code(404).send({ error: 'Sender not found' });
    }

    if (sender.isMuted) {
      if (sender.mutedUntil && new Date() > sender.mutedUntil) {
        await prisma.user.update({
          where: { id: senderId },
          data: { isMuted: false, mutedUntil: null, muteReason: null, mutedBy: null },
        });
      } else {
        return reply.code(403).send({ error: 'User is muted' });
      }
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: Number(recipientId) },
      select: { id: true, name: true, picture: true, role: true },
    });

    if (!recipient) {
      return reply.code(404).send({ error: 'Recipient not found' });
    }

    const dm = await prisma.directMessage.create({
      data: {
        senderId,
        recipientId: Number(recipientId),
        message: message.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, picture: true, role: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, picture: true, role: true },
        },
      },
    });

    return { message: dm };
  });

  // Add reaction to DM
  fastify.post('/api/dm/:id/reactions', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const messageId = Number(request.params.id);
    const { emoji, action = 'add' } = request.body || {};

    if (Number.isNaN(messageId)) {
      return reply.code(400).send({ error: 'Invalid message id' });
    }

    if (!emoji || typeof emoji !== 'string' || emoji.trim().length === 0) {
      return reply.code(400).send({ error: 'Valid emoji is required' });
    }

    // Verify user is part of the DM
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, recipientId: true },
    });

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    if (message.senderId !== userId && message.recipientId !== userId) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    if (action === 'add') {
      const reaction = await prisma.directMessageReaction.upsert({
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

      return { reaction };
    } else if (action === 'remove') {
      await prisma.directMessageReaction.deleteMany({
        where: {
          messageId,
          userId,
          emoji: emoji.trim(),
        },
      });

      return { success: true };
    }

    return reply.code(400).send({ error: 'Invalid action' });
  });

  // Send DM reply
  fastify.post('/api/dm/:id/reply', { preHandler: [requireAuth, allowAllRoles] }, async (request, reply) => {
    const userId = request.user.id;
    const replyToId = Number(request.params.id);
    const { message } = request.body || {};

    if (Number.isNaN(replyToId)) {
      return reply.code(400).send({ error: 'Invalid message id' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return reply.code(400).send({ error: 'Message is required' });
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return reply.code(400).send({ error: 'Message is too long' });
    }

    // Verify user is part of the original DM
    const originalMessage = await prisma.directMessage.findUnique({
      where: { id: replyToId },
      select: { senderId: true, recipientId: true },
    });

    if (!originalMessage) {
      return reply.code(404).send({ error: 'Original message not found' });
    }

    if (originalMessage.senderId !== userId && originalMessage.recipientId !== userId) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Determine who to reply to
    const recipientId = originalMessage.senderId === userId ? originalMessage.recipientId : originalMessage.senderId;

    const replyMessage = await prisma.directMessage.create({
      data: {
        senderId: userId,
        recipientId,
        message: message.trim(),
        replyToId,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, picture: true, role: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, picture: true, role: true },
        },
      },
    });

    // Create reply link
    await prisma.directMessageReply.create({
      data: {
        messageId: replyMessage.id,
        replyToId,
      },
    });

    return { message: replyMessage, replyToId };
  });

  // Mark DM as read
  fastify.post('/api/dm/:userId/read', { preHandler: [requireAuth, allowAllRoles] }, async (request) => {
    const currentUserId = request.user.id;
    const otherUserId = Number(request.params.userId);

    if (Number.isNaN(otherUserId)) {
      return { error: 'Invalid user id' };
    }

    await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        recipientId: currentUserId,
      },
      data: { isRead: true },
    });

    return { success: true };
  });
}

export default directMessageRoutes;
