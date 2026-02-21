import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

/**
 * Write to chat audit log before executing admin actions
 * @param {number} adminId - Admin user ID
 * @param {string} adminName - Admin user name
 * @param {string} actionType - Action type (MESSAGE_DELETED, USER_MUTED, etc)
 * @param {number} targetId - ID of target (message_id, user_id, channel_id)
 * @param {string} targetName - Name of target for readability
 * @param {string} targetType - Type of target (MESSAGE, USER, CHANNEL)
 * @param {string} reason - Optional reason
 * @returns {Promise<Object>} Created audit log entry
 */
export async function createAuditLog(
  adminId,
  adminName,
  actionType,
  targetId,
  targetName,
  targetType,
  reason = null
) {
  return await prisma.chatAuditLog.create({
    data: {
      adminId,
      adminName,
      actionType,
      targetId,
      targetName,
      targetType,
      reason,
    },
  });
}

/**
 * Delete a message (soft delete)
 * Write audit log FIRST, then execute
 * @param {number} messageId - Message ID to delete
 * @param {number} adminId - Admin user ID
 * @param {string} adminName - Admin user name
 * @param {string} reason - Optional deletion reason
 * @returns {Promise<Object>} Deleted message
 */
export async function deleteMessage(messageId, adminId, adminName, reason = null) {
  // Verify message exists
  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    include: { channel: true, sender: true },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // Write audit log BEFORE delete
  await createAuditLog(
    adminId,
    adminName,
    'MESSAGE_DELETED',
    messageId,
    `Message from ${message.sender.name}: "${message.message.substring(0, 50)}"`,
    'MESSAGE',
    reason
  );

  // Soft delete: mark as deleted
  const deletedMessage = await prisma.channelMessage.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedById: adminId,
      deletedAt: new Date(),
    },
    include: { channel: true, sender: true },
  });

  // Clear reactions and replies for this message
  await prisma.messageReaction.deleteMany({
    where: { messageId },
  });

  await prisma.messageReply.deleteMany({
    where: { messageId },
  });

  // Clear pin metadata if this message was pinned
  await prisma.pinnedMessage.deleteMany({
    where: { messageId },
  });

  await prisma.channelMessage.update({
    where: { id: messageId },
    data: {
      isPinned: false,
      pinnedById: null,
      pinnedAt: null,
    },
  });

  return deletedMessage;
}

/**
 * Mute a user temporarily
 * Write audit log FIRST, then execute
 * @param {number} userId - User ID to mute
 * @param {number} adminId - Admin user ID
 * @param {string} adminName - Admin user name
 * @param {Date} mutedUntil - When mute expires
 * @param {string} reason - Optional mute reason
 * @returns {Promise<Object>} Muted user
 */
export async function muteUser(userId, adminId, adminName, mutedUntil, reason = null) {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Cannot mute other admins
  if (user.role?.toUpperCase() === 'ADMIN' && user.id !== adminId) {
    throw new Error('Cannot mute other admins');
  }

  // Write audit log BEFORE mute
  const until = new Date(mutedUntil);
  await createAuditLog(
    adminId,
    adminName,
    'USER_MUTED',
    userId,
    user.name,
    'USER',
    reason || `Muted until ${until.toLocaleString()}`
  );

  // Apply mute
  return await prisma.user.update({
    where: { id: userId },
    data: {
      isMuted: true,
      mutedUntil,
      muteReason: reason,
      mutedBy: adminId,
    },
  });
}

/**
 * Unmute a user
 * Write audit log FIRST, then execute
 * @param {number} userId - User ID to unmute
 * @param {number} adminId - Admin user ID
 * @param {string} adminName - Admin user name
 * @returns {Promise<Object>} Unmuted user
 */
export async function unmuteUser(userId, adminId, adminName) {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Write audit log BEFORE unmute
  await createAuditLog(
    adminId,
    adminName,
    'USER_UNMUTED',
    userId,
    user.name,
    'USER',
    null
  );

  // Remove mute
  return await prisma.user.update({
    where: { id: userId },
    data: {
      isMuted: false,
      mutedUntil: null,
      muteReason: null,
      mutedBy: null,
    },
  });
}

/**
 * Lock a channel (read-only for non-admins)
 * Write audit log FIRST, then execute
 * @param {number} channelId - Channel ID to lock
 * @param {number} adminId - Admin user ID
 * @param {string} adminName - Admin user name
 * @param {string} reason - Optional reason
 * @returns {Promise<Object>} Locked channel
 */
export async function lockChannel(channelId, adminId, adminName, reason = null) {
  // Verify channel exists
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  // Write audit log BEFORE lock
  await createAuditLog(
    adminId,
    adminName,
    'CHANNEL_LOCKED',
    channelId,
    channel.name,
    'CHANNEL',
    reason
  );

  // Lock channel
  return await prisma.channel.update({
    where: { id: channelId },
    data: {
      isLocked: true,
      lockedById: adminId,
      lockedAt: new Date(),
    },
  });
}

/**
 * Unlock a channel
 * Write audit log FIRST, then execute
 * @param {number} channelId - Channel ID to unlock
 * @param {number} adminId - Admin user ID
 * @param {string} adminName - Admin user name
 * @returns {Promise<Object>} Unlocked channel
 */
export async function unlockChannel(channelId, adminId, adminName) {
  // Verify channel exists
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  // Write audit log BEFORE unlock
  await createAuditLog(
    adminId,
    adminName,
    'CHANNEL_UNLOCKED',
    channelId,
    channel.name,
    'CHANNEL',
    null
  );

  // Unlock channel
  return await prisma.channel.update({
    where: { id: channelId },
    data: {
      isLocked: false,
      lockedById: null,
      lockedAt: null,
    },
  });
}

/**
 * Disable chat for a project channel (or any channel)
 * Write audit log FIRST, then execute
 * @param {number} channelId - Channel ID to disable
 * @param {number} adminId - Admin user ID
 * @param {string} adminName - Admin user name
 * @param {string} reason - Optional reason
 * @returns {Promise<Object>} Disabled channel
 */
export async function disableChat(channelId, adminId, adminName, reason = null) {
  // Verify channel exists
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  // Write audit log BEFORE disable
  await createAuditLog(
    adminId,
    adminName,
    'CHAT_DISABLED',
    channelId,
    channel.name,
    'CHANNEL',
    reason
  );

  // Disable chat
  return await prisma.channel.update({
    where: { id: channelId },
    data: {
      isDisabled: true,
      disabledById: adminId,
      disabledAt: new Date(),
    },
  });
}

/**
 * Enable chat for a channel
 * Write audit log FIRST, then execute
 * @param {number} channelId - Channel ID to enable
 * @param {number} adminId - Admin user ID
 * @param {string} adminName - Admin user name
 * @returns {Promise<Object>} Enabled channel
 */
export async function enableChat(channelId, adminId, adminName) {
  // Verify channel exists
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  // Write audit log BEFORE enable
  await createAuditLog(
    adminId,
    adminName,
    'CHAT_ENABLED',
    channelId,
    channel.name,
    'CHANNEL',
    null
  );

  // Enable chat
  return await prisma.channel.update({
    where: { id: channelId },
    data: {
      isDisabled: false,
      disabledById: null,
      disabledAt: null,
    },
  });
}

/**
 * Get recent messages for admin message management dashboard
 * @param {number} limit - Number of messages to fetch
 * @param {number} offset - Pagination offset
 * @param {number} channelId - Optional filter by channel
 * @returns {Promise<{messages: Array, total: number}>}
 */
export async function getRecentMessages(limit = 50, offset = 0, channelId = null) {
  const where = channelId ? { channelId, isDeleted: false } : { isDeleted: false };

  const [messages, total] = await Promise.all([
    prisma.channelMessage.findMany({
      where,
      include: {
        channel: true,
        sender: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.channelMessage.count({ where }),
  ]);

  return { messages, total };
}

/**
 * Get all users with mute status for admin user controls dashboard
 * @param {number} limit - Number of users to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise<{users: Array, total: number}>}
 */
export async function getAllUsers(limit = 50, offset = 0) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isMuted: true,
        mutedUntil: true,
        muteReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count(),
  ]);

  return { users, total };
}

/**
 * Get all channels with lock/disable status for admin channel controls dashboard
 * @param {number} limit - Number of channels to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise<{channels: Array, total: number}>}
 */
export async function getAllChannels(limit = 50, offset = 0) {
  const [channels, total] = await Promise.all([
    prisma.channel.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        lockedBy: {
          select: { id: true, name: true },
        },
        disabledBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { messages: true, members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.channel.count(),
  ]);

  return { channels, total };
}

/**
 * Get audit logs with filters
 * @param {Object} filters - Filter object {actionType, dateFrom, dateTo, targetType}
 * @param {number} limit - Number to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise<{logs: Array, total: number}>}
 */
export async function getAuditLogs(filters = {}, limit = 50, offset = 0) {
  const where = {};

  if (filters.actionType) {
    where.actionType = filters.actionType;
  }

  if (filters.targetType) {
    where.targetType = filters.targetType;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.timestamp = {};
    if (filters.dateFrom) {
      where.timestamp.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.timestamp.lte = new Date(filters.dateTo);
    }
  }

  if (filters.targetQuery) {
    const query = String(filters.targetQuery).trim();
    const numericId = Number(query);
    if (!Number.isNaN(numericId)) {
      where.targetId = numericId;
    } else {
      where.targetName = {
        contains: query,
        mode: 'insensitive',
      };
    }
  }

  const [logs, total] = await Promise.all([
    prisma.chatAuditLog.findMany({
      where,
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.chatAuditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Check if user is currently muted
 * @param {number} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function isUserMuted(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isMuted: true, mutedUntil: true },
  });

  if (!user) return false;

  if (!user.isMuted) return false;

  // Check if mute has expired
  if (user.mutedUntil && new Date() > user.mutedUntil) {
    // Auto-unmute if expired
    await unmuteUser(userId, null, 'System');
    return false;
  }

  return true;
}

/**
 * Check if channel is locked
 * @param {number} channelId - Channel ID
 * @returns {Promise<boolean>}
 */
export async function isChannelLocked(channelId) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { isLocked: true },
  });

  return channel?.isLocked || false;
}

/**
 * Check if channel chat is disabled
 * @param {number} channelId - Channel ID
 * @returns {Promise<boolean>}
 */
export async function isChatDisabled(channelId) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { isDisabled: true },
  });

  return channel?.isDisabled || false;
}

/**
 * Auto-unmute expired mutes (scheduled job)
 * @returns {Promise<number>} Number of users unmuted
 */
export async function autoUnmuteExpiredMutes() {
  const now = new Date();
  const expiredMutes = await prisma.user.findMany({
    where: {
      isMuted: true,
      mutedUntil: {
        lte: now,
      },
    },
    select: { id: true, name: true },
  });

  let count = 0;
  for (const user of expiredMutes) {
    try {
      await unmuteUser(user.id, null, 'System');
      count++;
    } catch (error) {
      console.error(`Failed to auto-unmute user ${user.id}:`, error);
    }
  }

  return count;
}
