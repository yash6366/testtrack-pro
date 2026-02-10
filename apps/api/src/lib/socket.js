import { Server } from "socket.io";
import { Redis } from "@upstash/redis";
import { getPrismaClient } from "./prisma.js";
import { verifyTokenAndLoadUser } from "./rbac.js";

let redisClient = null;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NOTIFICATION_LENGTH = 500;
const ALLOWED_PUBLIC_PREFIXES = ['bug-', 'execution-'];

// Initialize Redis client for pub/sub
export function initializeRedis() {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log("✓ Redis client initialized");
      return true;
    } else {
      console.log("⚠ Redis env vars not found - using in-memory adapter");
      return false;
    }
  } catch (error) {
    console.log("⚠ Redis initialization failed - using in-memory adapter:", error.message);
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
 */
export function setupSocket(fastifyServer) {
  const io = new Server(fastifyServer.server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Upstash REST client does not support Socket.IO Redis adapter (pub/sub).
  if (redisClient) {
    console.log("⚠ Redis adapter disabled for Upstash REST client; using in-memory adapter");
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
      console.error("✗ Socket auth failed:", error.message);
      socket.disconnect(true);
      return;
    }

    const userId = user.id;
    const userRole = user.role;
    const normalizedRole = normalizeRole(userRole);

    console.log(`✓ User connected: ${userId} (${userRole}) - Socket: ${socket.id}`);

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
          console.warn(`⚠ User room join denied for user ${userId} in ${room}`);
          return;
        }
        room = parsed.room;
      } else {
        if (!isAllowedPublicRoom(parsed.room)) {
          console.warn(`⚠ Unrecognized room denied for user ${userId} in ${room}`);
          return;
        }
        room = parsed.room;
      }

      socket.join(room);
      io.to(room).emit("userJoined", {
        userId,
        userRole,
        room,
        timestamp: new Date().toISOString(),
      });
      console.log(`  ↳ ${userId} joined room: ${room}`);
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
        console.log(`  ↳ ${userId} left room: ${room}`);
      }
    });

    // Handle messages with role context
    socket.on("message", async (data) => {
      if (!data?.room || typeof data.room !== "string") {
        console.warn("⚠ Message received without room:", data);
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
          console.warn(`⚠ Message denied for user ${userId} in ${data.room}`);
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
        console.log(`  ↳ ${userId} message in ${data.room}: ${trimmed.substring(0, 30)}...`);
        return;
      }

      if (parsed.type === "role") {
        if (!parsed.role || parsed.role !== normalizedRole) {
          console.warn(`⚠ Role room message denied for user ${userId} in ${data.room}`);
          return;
        }
      }

      if (parsed.type === "user") {
        if (parsed.userId !== userId) {
          console.warn(`⚠ User room message denied for user ${userId} in ${data.room}`);
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

      if (parsed.type === "other" && !isAllowedPublicRoom(targetRoom)) {
        console.warn(`⚠ Unrecognized room message denied for user ${userId} in ${data.room}`);
        return;
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

      console.log(`  ↳ ${userId} message in ${targetRoom}: ${trimmed.substring(0, 30)}...`);
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

      io.to(`user:${targetUserId}`).emit("notification", {
        id: `${Date.now()}-${Math.random()}`,
        fromUserId: userId,
        fromUserRole: userRole,
        type: data.type || "GENERAL", // RE_TEST_REQUEST, BUG_UPDATE, STATUS_CHANGE
        message,
        metadata: data.metadata || {},
        timestamp: new Date().toISOString(),
      });
      console.log(`  ↳ Notification sent to user:${targetUserId}`);
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
        if (!isAllowedPublicRoom(parsed.room)) {
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
        if (!isAllowedPublicRoom(parsed.room)) {
          return;
        }
      }

      socket.to(parsed.room).emit("userStoppedTyping", {
        userId,
        room: parsed.room,
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`✗ User disconnected: ${userId} - Socket: ${socket.id}`);
      
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
      console.error(`✗ Socket error for ${userId}:`, error);
    });
  });

  return io;
}
