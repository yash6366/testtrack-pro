import { Server } from "socket.io";
import { Redis } from "@upstash/redis";
import { getPrismaClient } from "./prisma.js";
import { verifyTokenAndLoadUser } from "./rbac.js";

let redisClient = null;
let logger = console; // Default logger, will be overridden
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NOTIFICATION_LENGTH = 500;
const ALLOWED_PUBLIC_PREFIXES = ['bug-', 'execution-'];

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

    logger.info({ userId, userRole, socketId: socket.id }, 'User connected to Socket.IO');

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
        } catch (error) {
          logger.warn({ userId, room: data.room }, 'Message denied for user');
          return;
        }

        const message = await prisma.message.create({
          data: {
            channelId,
            senderId: userId,
            body: trimmed,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        const messagePayload = {
          id: message.id,
          channelId,
          senderId: message.senderId,
          userId: message.senderId,
          body: message.body,
          text: message.body,
          createdAt: message.createdAt,
          timestamp: message.createdAt,
          sender: message.sender,
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

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.info({ userId, socketId: socket.id }, 'User disconnected from Socket.IO');
      
      // Emit leave event to all joined rooms
      Array.from(socket.rooms).forEach((room) => {
        if (room !== socket.id) {
          io.to(room).emit("userLeft", {
            userId,
            room,
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
