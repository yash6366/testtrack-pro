/**
 * NOTIFICATION SERVICE
 * Handles notification creation, retrieval, preferences, and management
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import { emitNotificationToUser } from './notificationEmitter.js';

const prisma = getPrismaClient();

/**
 * Create a notification for a user
 * @param {number} userId - User ID (recipient)
 * @param {Object} data - Notification data
 * @param {boolean} sendRealtime - Whether to emit via WebSocket
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification(userId, data, sendRealtime = true) {
  const {
    title,
    message,
    type,
    sourceType,
    sourceId,
    relatedUserId,
    actionUrl,
    actionType,
    metadata,
  } = data;

  if (!title || !message || !type) {
    throw new Error('Title, message, and type are required');
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      sourceType: sourceType || null,
      sourceId: sourceId ? Number(sourceId) : null,
      relatedUserId: relatedUserId ? Number(relatedUserId) : null,
      actionUrl: actionUrl || null,
      actionType: actionType || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Emit real-time notification
  if (sendRealtime) {
    try {
      await emitNotificationToUser(userId, notification, false, false);
    } catch (error) {
      // Don't fail the request if emission fails - non-critical error
    }
  }

  return notification;
}

/**
 * Create notifications for multiple users
 * @param {number[]} userIds - Array of user IDs
 * @param {Object} data - Notification data
 * @returns {Promise<Array>} Created notifications
 */
export async function createBulkNotifications(userIds, data) {
  const notifications = await Promise.all(
    userIds.map(userId => createNotification(userId, data))
  );
  return notifications;
}

/**
 * Get user notifications with pagination
 * @param {number} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Notifications and metadata
 */
export async function getUserNotifications(userId, filters = {}) {
  const {
    isRead,
    type,
    sourceType,
    skip = 0,
    take = 20,
  } = filters;

  const where = {
    userId: Number(userId),
    expiresAt: { gt: new Date() }, // Only non-expired notifications
    ...(isRead !== undefined && { isRead }),
    ...(type && { type }),
    ...(sourceType && { sourceType }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId: Number(userId),
        isRead: false,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  return { notifications, total, unreadCount, skip, take };
}

/**
 * Get single notification
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Notification
 */
export async function getNotification(notificationId) {
  const notification = await prisma.notification.findUnique({
    where: { id: Number(notificationId) },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  return notification;
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationAsRead(notificationId) {
  const notification = await prisma.notification.update({
    where: { id: Number(notificationId) },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return notification;
}

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export async function markAllNotificationsAsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: {
      userId: Number(userId),
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result;
}

/**
 * Delete notification
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Deleted notification
 */
export async function deleteNotification(notificationId) {
  const notification = await prisma.notification.delete({
    where: { id: Number(notificationId) },
  });

  return notification;
}

/**
 * Delete all expired notifications
 * @returns {Promise<Object>} Delete result
 */
export async function deleteExpiredNotifications() {
  const result = await prisma.notification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result;
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * Get notification preferences for user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Notification preferences
 */
export async function getNotificationPreferences(userId) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId: Number(userId) },
  });

  // Create default preferences if not exists
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: {
        userId: Number(userId),
      },
    });
  }

  return prefs;
}

/**
 * Update notification preferences
 * @param {number} userId - User ID
 * @param {Object} updates - Preference updates
 * @returns {Promise<Object>} Updated preferences
 */
export async function updateNotificationPreferences(userId, updates) {
  const prefs = await getNotificationPreferences(userId);

  const updated = await prisma.notificationPreference.update({
    where: { id: prefs.id },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Check if user should receive notification (based on preferences)
 * @param {number} userId - User ID
 * @param {string} type - Notification type (EMAIL, IN_APP)
 * @param {string} notificationType - Notification type (BUG_CREATED, etc)
 * @returns {Promise<boolean>} Should send notification
 */
export async function shouldSendNotification(userId, type, notificationType) {
  const prefs = await getNotificationPreferences(userId);

  // Determine field name based on type and notificationType
  const fieldMap = {
    EMAIL: {
      BUG_CREATED: 'emailBugCreated',
      BUG_ASSIGNED: 'emailBugAssigned',
      BUG_UPDATED: 'emailBugStatusChanged',
      BUG_STATUS_CHANGED: 'emailBugStatusChanged',
      BUG_COMMENTED: 'emailBugCommented',
      BUG_VERIFIED: 'emailBugStatusChanged',
      BUG_REOPENED: 'emailBugStatusChanged',
      BUG_RETEST_REQUESTED: 'emailBugAssigned',
      TESTCASE_EXECUTED: 'emailTestFailed',
      TEST_EXECUTION_FAILED: 'emailTestFailed',
      TEST_EXECUTION_BLOCKED: 'emailTestFailed',
      USER_MENTIONED: 'emailMentioned',
      COMMENT_REPLIED: 'emailMentioned',
      ANNOUNCEMENT: 'emailAnnouncements',
      SYSTEM_ALERT: 'emailAnnouncements',
    },
    IN_APP: {
      BUG_CREATED: 'inAppBugCreated',
      BUG_ASSIGNED: 'inAppBugAssigned',
      BUG_UPDATED: 'inAppBugStatusChanged',
      BUG_STATUS_CHANGED: 'inAppBugStatusChanged',
      BUG_COMMENTED: 'inAppBugCommented',
      BUG_VERIFIED: 'inAppBugStatusChanged',
      BUG_REOPENED: 'inAppBugStatusChanged',
      BUG_RETEST_REQUESTED: 'inAppBugAssigned',
      TESTCASE_EXECUTED: 'inAppTestFailed',
      TEST_EXECUTION_FAILED: 'inAppTestFailed',
      TEST_EXECUTION_BLOCKED: 'inAppTestFailed',
      USER_MENTIONED: 'inAppMentioned',
      COMMENT_REPLIED: 'inAppMentioned',
      ANNOUNCEMENT: 'inAppAnnouncements',
      SYSTEM_ALERT: 'inAppAnnouncements',
    },
  };

  // Check if notification type is enabled
  const fieldName = fieldMap[type]?.[notificationType];
  if (!fieldName) {
    return false;
  }

  const isTypeEnabled = prefs[fieldName];
  const isMainEnabled = type === 'EMAIL' ? prefs.emailEnabled : prefs.inAppEnabled;

  return isMainEnabled && isTypeEnabled;
}

/**
 * Check if within quiet hours
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} Is within quiet hours
 */
export async function isWithinQuietHours(userId) {
  const prefs = await getNotificationPreferences(userId);

  if (!prefs.quietHoursEnabled) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHour * 100 + currentMinutes; // e.g., 2130 for 9:30 PM

  const [startHour, startMin] = (prefs.quietHourStart || '22:00').split(':').map(Number);
  const [endHour, endMin] = (prefs.quietHourEnd || '08:00').split(':').map(Number);

  const startTime = startHour * 100 + startMin;
  const endTime = endHour * 100 + endMin;

  // Handle case where quiet hours span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

// ============================================
// SAVED FILTERS
// ============================================

/**
 * Create saved filter
 * @param {number} userId - User ID
 * @param {Object} data - Filter data
 * @returns {Promise<Object>} Created filter
 */
export async function createSavedFilter(userId, data) {
  const {
    name,
    resourceType,
    filterConfig,
    displayColumns,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isDefault = false,
    isFavorite = false,
  } = data;

  if (!name || !resourceType || !filterConfig) {
    throw new Error('Name, resourceType, and filterConfig are required');
  }

  // Check if filter with same name exists for user
  const existing = await prisma.savedFilter.findFirst({
    where: {
      userId: Number(userId),
      name,
    },
  });

  if (existing) {
    throw new Error('Filter with this name already exists');
  }

  const filter = await prisma.savedFilter.create({
    data: {
      userId: Number(userId),
      name,
      resourceType,
      filterConfig: JSON.stringify(filterConfig),
      displayColumns: displayColumns ? JSON.stringify(displayColumns) : null,
      sortBy,
      sortOrder,
      isDefault,
      isFavorite,
    },
  });

  return filter;
}

/**
 * Get saved filters for user
 * @param {number} userId - User ID
 * @param {string} resourceType - Filter by resource type (optional)
 * @returns {Promise<Array>} Saved filters
 */
export async function getSavedFilters(userId, resourceType = null) {
  const filters = await prisma.savedFilter.findMany({
    where: {
      userId: Number(userId),
      ...(resourceType && { resourceType }),
    },
    orderBy: [
      { isFavorite: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  // Parse JSON fields
  return filters.map(f => ({
    ...f,
    filterConfig: JSON.parse(f.filterConfig || '{}'),
    displayColumns: f.displayColumns ? JSON.parse(f.displayColumns) : [],
  }));
}

/**
 * Get single saved filter
 * @param {number} filterId - Filter ID
 * @returns {Promise<Object>} Saved filter
 */
export async function getSavedFilter(filterId) {
  const filter = await prisma.savedFilter.findUnique({
    where: { id: Number(filterId) },
  });

  if (!filter) {
    throw new Error('Filter not found');
  }

  return {
    ...filter,
    filterConfig: JSON.parse(filter.filterConfig || '{}'),
    displayColumns: filter.displayColumns ? JSON.parse(filter.displayColumns) : [],
  };
}

/**
 * Update saved filter
 * @param {number} filterId - Filter ID
 * @param {Object} updates - Filter updates
 * @returns {Promise<Object>} Updated filter
 */
export async function updateSavedFilter(filterId, updates) {
  const filter = await prisma.savedFilter.findUnique({
    where: { id: Number(filterId) },
  });

  if (!filter) {
    throw new Error('Filter not found');
  }

  const updated = await prisma.savedFilter.update({
    where: { id: Number(filterId) },
    data: {
      ...(updates.name && { name: updates.name }),
      ...(updates.filterConfig && { filterConfig: JSON.stringify(updates.filterConfig) }),
      ...(updates.displayColumns && { displayColumns: JSON.stringify(updates.displayColumns) }),
      ...(updates.sortBy && { sortBy: updates.sortBy }),
      ...(updates.sortOrder && { sortOrder: updates.sortOrder }),
      ...(updates.isFavorite !== undefined && { isFavorite: updates.isFavorite }),
      ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
      updatedAt: new Date(),
    },
  });

  return {
    ...updated,
    filterConfig: JSON.parse(updated.filterConfig),
    displayColumns: updated.displayColumns ? JSON.parse(updated.displayColumns) : [],
  };
}

/**
 * Delete saved filter
 * @param {number} filterId - Filter ID
 * @returns {Promise<Object>} Deleted filter
 */
export async function deleteSavedFilter(filterId) {
  const filter = await prisma.savedFilter.delete({
    where: { id: Number(filterId) },
  });

  return filter;
}

/**
 * Increment filter usage count
 * @param {number} filterId - Filter ID
 * @returns {Promise<Object>} Updated filter
 */
export async function incrementFilterUsage(filterId) {
  const updated = await prisma.savedFilter.update({
    where: { id: Number(filterId) },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  return updated;
}

export default {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteExpiredNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  shouldSendNotification,
  isWithinQuietHours,
  createSavedFilter,
  getSavedFilters,
  getSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
  incrementFilterUsage,
};
