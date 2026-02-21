import { Server } from "socket.io";
import { Redis } from "@upstash/redis";
import { getPrismaClient } from "./prisma.js";
import { verifyTokenAndLoadUser } from "./rbac.js";

let redisClient = null;
let logger = console; // Default logger, will be overridden
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NOTIFICATION_LENGTH = 500;
const ALLOWED_PUBLIC_PREFIXES = ['bug-', 'execution-'];
// Global presence tracking for DM and sidebar indicators.
const onlineUserIds = new Set();

/**
 * Initialize Redis client for caching and pub/sub
 * Note: Upstash REST API does not support Socket.IO Redis adapter (requires Redis protocol for pub/sub)
 * For horizontal scaling, use standard Redis with @socket.io/redis-adapter
 * @returns {boolean} Success status
 */
export function initializeRedis() {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      logger.info('Redis client initialized (Upstash REST)');
      return true;
    } else {
      logger.warn('Redis env vars not found - using in-memory adapter (single instance only)');
      return false;
    }
  } catch (error) {
    logger.warn({ err: error }, 'Redis initialization failed - using in-memory adapter');
    return false;
  }
}

/**
 * Get the Redis client instance
 * @returns {object|null} Redis client or null if not initialized
 */
export function getRedisClient() {
  return redisClient;
}

/**
 * Setup Socket.IO server with role-based rooms
 * Rooms strategy:
 *   - room:<roomId> - for specific test/bug discussions
 *   - project:<projectId> - for project-wide communication
 *   - role:<role> - for role-based broadcasts (DEVELOPER, TESTER, ADMIN)
 *   - user:<userId> - for direct notifications
 * 
 * @param {object} fastifyServer - Fastify server instance
 * @returns {object} Socket.IO server instance
 */
export function setupSocket(fastifyServer) {
  // Use Fastify's logger
  logger = fastifyServer.log;

  const io = new Server(fastifyServer.server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174"
      ].filter(Boolean),
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  /**
   * SCALING NOTE: Socket.IO uses in-memory adapter by default (single instance only)
   * For multi-server deployments:
   * 1. Use standard Redis (not Upstash REST) with @socket.io/redis-adapter
   * 2. Or use Socket.IO sticky sessions with a load balancer
   * See: https://socket.io/docs/v4/using-multiple-nodes/
   */
  if (redisClient) {
    logger.info('Socket.IO using in-memory adapter (Upstash REST does not support pub/sub)');
  }

  // Socket connection handler
  const prisma = getPrismaClient();

  function normalizeRole(role) {
    return typeof role === "string" ? role.trim().toUpperCase() : "";
  }

  function parseRoom(room) {
    if (!room || typeof room !== "string") {
      return { type: "invalid" };
    }

    const channelMatch = /^channel-(\d+)$/.exec(room);
    if (channelMatch) {
      return { type: "channel", channelId: Number(channelMatch[1]), room };
    }

    const roleMatch = /^role:(.+)$/.exec(room);
    if (roleMatch) {
      const role = normalizeRole(roleMatch[1]);
      return { type: "role", role, room: `role:${role}` };
    }

    const userMatch = /^user:(\d+)$/.exec(room);
    if (userMatch) {
      const userId = Number(userMatch[1]);
      return { type: "user", userId, room: `user:${userId}` };
    }

    return { type: "other", room };
  }

  function getOnlineUserIds(room) {
    const roomSockets = io.sockets.adapter.rooms.get(room);
    if (!roomSockets) {
      return [];
    }

    const userIds = new Set();
    for (const socketId of roomSockets) {
      const roomSocket = io.sockets.sockets.get(socketId);
      const roomUserId = roomSocket?.data?.userId;
      if (roomUserId) {
        userIds.add(roomUserId);
      }
    }

    return Array.from(userIds);
  }

  function isAllowedPublicRoom(room) {
    return ALLOWED_PUBLIC_PREFIXES.some((prefix) => room.startsWith(prefix));
  }

  async function authorizeBugOrExecutionRoom(room, userId) {
    // Extract projectId from room name (format: bug-{projectId}-{bugId} or execution-{projectId}-{executionId})
    const bugMatch = /^bug-(\d+)-/.exec(room);
    const executionMatch = /^execution-(\d+)-/.exec(room);
    
    if (bugMatch) {
      const projectId = Number(bugMatch[1]);
      // Verify user is assigned to this project
      const membership = await prisma.projectUserAllocation.findFirst({
        where: {
          projectId,
          userId,
          isActive: true,
        },
      });
      if (!membership) {
        throw new Error('Access denied: Not a member of this project');
      }
      return true;
    }
    
    if (executionMatch) {
      const projectId = Number(executionMatch[1]);
      // Verify user is assigned to this project
      const membership = await prisma.projectUserAllocation.findFirst({
        where: {
          projectId,
          userId,
          isActive: true,
        },
      });
      if (!membership) {
        throw new Error('Access denied: Not a member of this project');
      }
      return true;
    }
    
    return false;
  }

  async function resolveUser(socket) {
    const token = socket.handshake.auth?.token;
    if (!token) {
      throw new Error("Missing auth token");
    }

    const user = await verifyTokenAndLoadUser(fastifyServer, token);
    if (!user) {
      throw new Error("Invalid auth token");
    }

    return { id: user.id, role: user.role };
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
      const error = new Error("Access denied");
      error.statusCode = 403;
      throw error;
    }
  }

  async function ensureUserNotMuted(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isMuted: true, mutedUntil: true },
    });

    if (!user) {
      const error = new Error("User not found");
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
        const error = new Error("User is muted");
        error.statusCode = 403;
        throw error;
      }
    }
  }

  async function ensureChannelWritable(channelId, normalizedRole) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { isLocked: true, isDisabled: true },
    });

    if (!channel) {
      const error = new Error("Channel not found");
      error.statusCode = 404;
      throw error;
    }

    if (channel.isDisabled && normalizedRole !== "ADMIN") {
      const error = new Error("CHAT_DISABLED");
      error.code = 'CHAT_DISABLED';
      error.channelId = channelId;
      error.statusCode = 403;
      throw error;
    }

    if (channel.isLocked && normalizedRole !== "ADMIN") {
      const error = new Error("CHANNEL_LOCKED");
      error.code = 'CHANNEL_LOCKED';
      error.channelId = channelId;
      error.statusCode = 403;
      throw error;
    }
  }

  io.on("connection", async (socket) => {
    let user;
    try {
      user = await resolveUser(socket);
    } catch (error) {
      logger.warn({ err: error }, 'Socket auth failed');
      socket.disconnect(true);
      return;
    }

    const userId = user.id;
    const userRole = user.role;
    const normalizedRole = normalizeRole(userRole);

    socket.data.userId = userId;
    socket.data.userRole = userRole;

    logger.info({ userId, userRole, socketId: socket.id }, 'User connected to Socket.IO');

    // Emit global presence so clients can render online dots.
    onlineUserIds.add(userId);
    io.emit('user_online', {
      userId,
      userRole,
      onlineUsers: Array.from(onlineUserIds),
      timestamp: new Date().toISOString(),
    });

    // Join user-specific room for direct notifications
    socket.join(`user:${userId}`);

    // Join role-based room
    if (normalizedRole) {
      socket.join(`role:${normalizedRole}`);
    }

    // Handle room joins for bug discussion, test execution, etc
    socket.on("joinRoom", async (room) => {
      const parsed = parseRoom(room);
      if (parsed.type === "invalid") {
        return;
      }

      if (parsed.type === "channel") {
        const channelId = parsed.channelId;
        if (Number.isNaN(channelId)) {
          return;
        }
        try {
          await ensureMember(userId, channelId);
        } catch (error) {
          console.warn(`⚠ Join denied for user ${userId} in ${room}`);
          return;
        }
      } else if (parsed.type === "role") {
        if (!parsed.role || parsed.role !== normalizedRole) {
          console.warn(`⚠ Role room join denied for user ${userId} in ${room}`);
          return;
        }
        room = parsed.room;
      } else if (parsed.type === "user") {
        if (parsed.userId !== userId) {
          logger.warn({ userId, room }, 'User room join denied');
          return;
        }
        room = parsed.room;
      } else {
        // Authorize bug and execution rooms by project membership
        try {
          await authorizeBugOrExecutionRoom(parsed.room, userId);
          room = parsed.room;
        } catch (error) {
          logger.warn({ userId, room, err: error }, 'Room authorization failed');
          return;
        }
      }

      socket.join(room);
      io.to(room).emit("userJoined", {
        userId,
        userRole,
        room,
        timestamp: new Date().toISOString(),
      });
      // Emit standardized presence event for UI consumers
      io.to(room).emit("user_online", {
        userId,
        userRole,
        room,
        onlineUsers: getOnlineUserIds(room),
        timestamp: new Date().toISOString(),
      });
      logger.debug({ userId, room }, 'User joined room');
    });

    // Handle room exits
    socket.on("leaveRoom", (room) => {
      if (room && typeof room === "string") {
        socket.leave(room);
        io.to(room).emit("userLeft", {
          userId,
          room,
          timestamp: new Date().toISOString(),
        });
        io.to(room).emit("user_offline", {
          userId,
          room,
          onlineUsers: getOnlineUserIds(room),
          timestamp: new Date().toISOString(),
        });
        logger.debug({ userId, room }, 'User left room');
      }
    });

    // Handle messages with role context
    socket.on("message", async (data) => {
      if (!data?.room || typeof data.room !== "string") {
        logger.warn({ data }, 'Message received without room');
        return;
      }

      const parsed = parseRoom(data.room);
      const body = typeof data.body === "string" ? data.body : data.text;

      if (parsed.type === "channel") {
        if (!body || typeof body !== "string") {
          return;
        }

        const trimmed = body.trim();
        if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
          return;
        }

        const channelId = parsed.channelId;
        if (Number.isNaN(channelId)) {
          return;
        }
        try {
          await ensureMember(userId, channelId);
          await ensureUserNotMuted(userId);
          await ensureChannelWritable(channelId, normalizedRole);
        } catch (error) {
          logger.warn({ userId, room: data.room, err: error }, 'Message denied for user');
          if (error?.code === 'CHAT_DISABLED' || error?.code === 'CHANNEL_LOCKED') {
            socket.emit('chat_error', {
              error: error.code,
              channelId: error.channelId || channelId,
            });
          }
          return;
        }

        const message = await prisma.channelMessage.create({
          data: {
            channelId,
            userId: userId,
            message: trimmed,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // Parse and persist @mentions
        const mentionRegex = /@([\w.-]+)/g;
        const mentionMatches = Array.from(trimmed.matchAll(mentionRegex));
        const mentionedNames = mentionMatches.map((match) => match[1]);
        let mentionedUsers = [];
        if (mentionedNames.length > 0) {
          mentionedUsers = await prisma.user.findMany({
            where: {
              name: { in: mentionedNames },
            },
            select: { id: true, name: true, email: true },
          });

          for (const mentionedUser of mentionedUsers) {
            await prisma.messageMention.create({
              data: {
                messageId: message.id,
                mentionedUserId: mentionedUser.id,
              },
            }).catch(() => null);

            // Store notification for mentioned user
            await prisma.notification.create({
              data: {
                userId: mentionedUser.id,
                type: 'USER_MENTIONED',
                title: 'You were mentioned',
                message: `${message.sender?.name || 'Someone'} mentioned you in #${channelId}`,
                resourceType: 'CHAT_MESSAGE',
                resourceId: message.id,
                relatedUserId: userId,
              },
            }).catch(() => null);

            // Emit live notification for mentioned user
            io.to(`user:${mentionedUser.id}`).emit('notification:new', {
              type: 'USER_MENTIONED',
              title: 'You were mentioned',
              message: `${message.sender?.name || 'Someone'} mentioned you in #${channelId}`,
              resourceType: 'CHAT_MESSAGE',
              resourceId: message.id,
              fromUserId: userId,
              timestamp: new Date().toISOString(),
            });
          }
        }

        const messagePayload = {
          id: message.id,
          channelId,
          senderId: message.userId,
          userId: message.userId,
          body: message.message,
          text: message.message,
          createdAt: message.createdAt,
          timestamp: message.createdAt,
          sender: message.sender,
          mentions: mentionedUsers,
          room: data.room,
        };

        io.to(data.room).emit("message", messagePayload);
        logger.debug({ userId, room: data.room }, 'Message sent to room');
        return;
      }

      if (parsed.type === "role") {
        if (!parsed.role || parsed.role !== normalizedRole) {
          logger.warn({ userId, room: data.room }, 'Role room message denied');
          return;
        }
      }

      if (parsed.type === "user") {
        if (parsed.userId !== userId) {
          logger.warn({ userId, room: data.room }, 'User room message denied');
          return;
        }
      }

      if (!body || typeof body !== "string") {
        return;
      }

      const trimmed = body.trim();
      if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
        return;
      }

      try {
        await ensureUserNotMuted(userId);
      } catch (error) {
        logger.warn({ userId, room: data.room, err: error }, 'Message denied for muted user');
        return;
      }

      const targetRoom = parsed.type === "other" ? parsed.room : parsed.room;

      if (parsed.type === "other") {
        try {
          await authorizeBugOrExecutionRoom(targetRoom, userId);
        } catch (error) {
          logger.warn({ userId, room: data.room, err: error }, 'Room message denied');
          return;
        }
      }

      const messagePayload = {
        id: `${Date.now()}-${Math.random()}`,
        userId,
        userRole,
        room: targetRoom,
        text: trimmed,
        type: data.type || "GENERAL", // GENERAL, BUG_DISCUSSION, TEST_EXECUTION, ANNOUNCEMENT
        timestamp: new Date().toISOString(),
        metadata: data.metadata || {}, // For additional context (bugId, testId, etc)
      };

      io.to(targetRoom).emit("message", messagePayload);

      if (normalizedRole === "ADMIN" && data.type === "ANNOUNCEMENT") {
        io.to("role:ADMIN").emit("announcement", messagePayload);
      }

      logger.debug({ userId, room: targetRoom }, 'Message sent');
    });

    // Handle direct notifications (e.g., re-test requests)
    socket.on("notification", (data) => {
      const targetUserId = Number(data?.targetUserId);
      if (Number.isNaN(targetUserId)) {
        return;
      }

      const message = typeof data?.message === "string" ? data.message.trim() : "";
      if (!message || message.length > MAX_NOTIFICATION_LENGTH) {
        return;
      }

      io.to(`user:${targetUserId}`).emit("notification:new", {
        id: `${Date.now()}-${Math.random()}`,
        fromUserId: userId,
        fromUserRole: userRole,
        type: data.type || "GENERAL", // RE_TEST_REQUEST, BUG_UPDATE, STATUS_CHANGE
        message,
        metadata: data.metadata || {},
        timestamp: new Date().toISOString(),
      });
      logger.debug({ fromUserId: userId, toUserId: targetUserId }, 'Notification sent');
    });

    // Handle typing indicators
    socket.on("typing", async (data) => {
      if (!data?.room || typeof data.room !== "string") {
        return;
      }

      const parsed = parseRoom(data.room);
      if (parsed.type === "channel") {
        if (Number.isNaN(parsed.channelId)) {
          return;
        }
        try {
          await ensureMember(userId, parsed.channelId);
        } catch (error) {
          return;
        }
      } else if (parsed.type === "role") {
        if (!parsed.role || parsed.role !== normalizedRole) {
          return;
        }
      } else if (parsed.type === "user") {
        if (parsed.userId !== userId) {
          return;
        }
      } else if (parsed.type === "other") {
        try {
          await authorizeBugOrExecutionRoom(parsed.room, userId);
        } catch (error) {
          return;
        }
      }

      socket.to(parsed.room).emit("userTyping", {
        userId,
        room: parsed.room,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("stopTyping", async (data) => {
      if (!data?.room || typeof data.room !== "string") {
        return;
      }

      const parsed = parseRoom(data.room);
      if (parsed.type === "channel") {
        if (Number.isNaN(parsed.channelId)) {
          return;
        }
        try {
          await ensureMember(userId, parsed.channelId);
        } catch (error) {
          return;
        }
      } else if (parsed.type === "role") {
        if (!parsed.role || parsed.role !== normalizedRole) {
          return;
        }
      } else if (parsed.type === "user") {
        if (parsed.userId !== userId) {
          return;
        }
      } else if (parsed.type === "other") {
        try {
          await authorizeBugOrExecutionRoom(parsed.room, userId);
        } catch (error) {
          return;
        }
      }

      socket.to(parsed.room).emit("stopTyping", {
        userId,
        room: parsed.room,
      });
    });

    // Handle direct message events
    socket.on("dm_message", async (data) => {
      const recipientId = Number(data?.recipientId);
      const replyToId = data?.replyToId ? Number(data.replyToId) : null;
      if (Number.isNaN(recipientId) || !data?.message || typeof data.message !== 'string') {
        return;
      }

      const message = data.message.trim();
      if (!message || message.length > MAX_MESSAGE_LENGTH) {
        return;
      }

      // Prevent self-messaging
      if (recipientId === userId) {
        logger.warn({ userId }, 'Attempted self DM');
        return;
      }

      try {
        await ensureUserNotMuted(userId);

        // Verify recipient exists
        const recipient = await prisma.user.findUnique({
          where: { id: recipientId },
          select: { id: true, name: true, email: true },
        });

        if (!recipient) {
          logger.warn({ userId, recipientId }, 'DM recipient not found');
          return;
        }

        // Create the DM message
        const dmMessage = await prisma.directMessage.create({
          data: {
            senderId: userId,
            recipientId,
            message,
            replyToId: replyToId && !Number.isNaN(replyToId) ? replyToId : null,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        if (replyToId && !Number.isNaN(replyToId)) {
          await prisma.directMessageReply.create({
            data: {
              messageId: dmMessage.id,
              replyToId,
            },
          }).catch(() => null);
        }

        const messagePayload = {
          id: dmMessage.id,
          senderId: dmMessage.senderId,
          recipientId: dmMessage.recipientId,
          message: dmMessage.message,
          isRead: dmMessage.isRead,
          createdAt: dmMessage.createdAt,
          sender: dmMessage.sender,
          replyToId: dmMessage.replyToId || null,
        };

        // Send to recipient's direct notification room
        io.to(`user:${recipientId}`).emit('dm_message', messagePayload);
        
        // Echo back to sender
        socket.emit('dm_message', messagePayload);

        logger.debug({ userId, recipientId }, 'Direct message sent');
      } catch (error) {
        logger.error({ err: error, userId, recipientId }, 'Error sending direct message');
      }
    });

    // Handle DM read status updates
    socket.on('dm_read', async (data) => {
      const senderId = Number(data?.senderId);
      if (Number.isNaN(senderId)) {
        return;
      }

      try {
        // Mark messages from sender to current user as read
        await prisma.directMessage.updateMany({
          where: {
            senderId,
            recipientId: userId,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });

        const readPayload = {
          userId,
          senderId,
          timestamp: new Date().toISOString(),
        };

        // Notify sender that messages were read
        io.to(`user:${senderId}`).emit('dm_read', readPayload);
        
        logger.debug({ userId, senderId }, 'DM messages marked as read');
      } catch (error) {
        logger.error({ err: error, userId, senderId }, 'Error marking DMs as read');
      }
    });

    // Handle DM typing indicators
    socket.on('dm_typing', (data) => {
      const recipientId = Number(data?.recipientId);
      if (Number.isNaN(recipientId) || recipientId === userId) {
        return;
      }

      io.to(`user:${recipientId}`).emit('dm_typing', {
        userId,
        userName: data?.userName || 'Unknown',
        recipientId,
        timestamp: new Date().toISOString(),
      });

      logger.debug({ userId, recipientId }, 'DM typing indicator sent');
    });

    // Handle DM stop typing
    socket.on('dm_stop_typing', (data) => {
      const recipientId = Number(data?.recipientId);
      if (Number.isNaN(recipientId) || recipientId === userId) {
        return;
      }

      io.to(`user:${recipientId}`).emit('dm_stop_typing', {
        userId,
        recipientId,
        timestamp: new Date().toISOString(),
      });

      logger.debug({ userId, recipientId }, 'DM stop typing indicator sent');
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.info({ userId, socketId: socket.id }, 'User disconnected from Socket.IO');

      onlineUserIds.delete(userId);
      io.emit('user_offline', {
        userId,
        userRole,
        onlineUsers: Array.from(onlineUserIds),
        timestamp: new Date().toISOString(),
      });
      
      // Emit leave event to all joined rooms
      Array.from(socket.rooms).forEach((room) => {
        if (room !== socket.id) {
          io.to(room).emit("userLeft", {
            userId,
            room,
            timestamp: new Date().toISOString(),
          });
          io.to(room).emit("user_offline", {
            userId,
            room,
            onlineUsers: getOnlineUserIds(room),
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    // Error handling
    socket.on("error", (error) => {
      logger.error({ err: error, userId }, 'Socket error');
    });
  });

  return io;
}
