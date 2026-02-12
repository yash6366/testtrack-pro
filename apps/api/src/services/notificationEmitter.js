/**
 * NOTIFICATION EMITTER SERVICE
 * Handles real-time notification delivery via Socket.IO
 * Tracks delivery status and retries failed notifications
 */

import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

let ioInstance = null;

/**
 * Initialize the notification emitter with Socket.IO instance
 * @param {Server} io - Socket.IO server instance
 */
export function initializeNotificationEmitter(io) {
  ioInstance = io;
}

/**
 * Emit notification to user via WebSocket and track delivery
 * @param {number} userId - Target user ID
 * @param {Object} notification - Notification object from database
 * @param {boolean} sendEmail - Whether to send email
 * @param {boolean} skipInApp - Skip in-app notification delivery
 */
export async function emitNotificationToUser(userId, notification, sendEmail = false, skipInApp = false) {
  if (!ioInstance) {
    return;
  }

  const userRoom = `user:${userId}`;

  // Prepare notification payload
  const payload = {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    sourceType: notification.sourceType,
    sourceId: notification.sourceId,
    actionUrl: notification.actionUrl,
    actionType: notification.actionType,
    relatedUserId: notification.relatedUserId,
    metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
    createdAt: notification.createdAt,
    isRead: notification.isRead,
  };

  // Track in-app delivery
  if (!skipInApp) {
    try {
      await createDeliveryRecord(notification.id, 'IN_APP', 'PENDING');

      // Emit via Socket.IO
      ioInstance.to(userRoom).emit('notification:new', payload);

      // Update delivery as delivered
      await updateDeliveryStatus(notification.id, 'IN_APP', 'DELIVERED', new Date());
    } catch (error) {
      await updateDeliveryStatus(notification.id, 'IN_APP', 'FAILED', null, error.message);
    }
  }

  // Track email delivery (if enabled)
  if (sendEmail) {
    try {
      await createDeliveryRecord(notification.id, 'EMAIL', 'PENDING');
      // Email sending is handled by emailService - just track it here
    } catch (error) {
      // Email tracking failed, but notification was sent
    }
  }
}

/**
 * Broadcast notification to all users in a role
 * @param {string} role - Role (ADMIN, DEVELOPER, TESTER)
 * @param {Object} notification - Notification data
 */
export async function broadcastToRole(role, notification) {
  if (!ioInstance) return;

  const roleRoom = `role:${role.toUpperCase()}`;
  const payload = {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    createdAt: notification.createdAt,
  };

  ioInstance.to(roleRoom).emit('role:announcement', payload);
}

/**
 * Broadcast notification to project members
 * @param {number} projectId - Project ID
 * @param {Object} notification - Notification data
 */
export async function broadcastToProject(projectId, notification) {
  if (!ioInstance) return;

  const projectRoom = `project:${projectId}`;
  const payload = {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    sourceType: notification.sourceType,
    sourceId: notification.sourceId,
    createdAt: notification.createdAt,
  };

  ioInstance.to(projectRoom).emit('project:update', payload);
  console.log(`✓ Broadcast to project:${projectId}`);
}

/**
 * Create delivery record for notification channel
 * @param {number} notificationId - Notification ID
 * @param {string} channel - Delivery channel (EMAIL, IN_APP, PUSH)
 * @param {string} status - Initial status (PENDING)
 */
export async function createDeliveryRecord(notificationId, channel, status = 'PENDING') {
  try {
    return await prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel,
        status,
      },
    });
  } catch (error) {
    console.error(`✗ Failed to create delivery record:`, error);
    throw error;
  }
}

/**
 * Update delivery status
 * @param {number} notificationId - Notification ID
 * @param {string} channel - Channel
 * @param {string} status - New status
 * @param {Date} timestamp - Timestamp field to update (sentAt, deliveredAt, openedAt)
 * @param {string} failureReason - Optional failure reason
 */
export async function updateDeliveryStatus(
  notificationId,
  channel,
  status,
  timestamp = null,
  failureReason = null
) {
  try {
    const data = { status };

    if (status === 'DELIVERED') {
      data.deliveredAt = timestamp || new Date();
    } else if (status === 'OPENED') {
      data.openedAt = timestamp || new Date();
    } else if (status === 'FAILED') {
      data.failureReason = failureReason || 'Unknown error';
      data.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
      data.retryCount = { increment: 1 };
    }

    return await prisma.notificationDelivery.updateMany({
      where: {
        notificationId,
        channel,
      },
      data,
    });
  } catch (error) {
    console.error(`✗ Failed to update delivery status:`, error);
    throw error;
  }
}

/**
 * Mark notification as opened/read
 * @param {number} notificationId - Notification ID
 */
export async function markNotificationOpened(notificationId) {
  try {
    await Promise.all([
      prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      }),
      updateDeliveryStatus(notificationId, 'IN_APP', 'OPENED'),
    ]);
  } catch (error) {
    console.error(`✗ Failed to mark notification as opened:`, error);
  }
}

/**
 * Retry failed deliveries
 * @returns {Promise<Object>} Retry result
 */
export async function retryFailedDeliveries() {
  try {
    const failedDeliveries = await prisma.notificationDelivery.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: 3 },
        nextRetryAt: { lt: new Date() },
      },
      include: {
        notification: true,
      },
      take: 100, // Limit to 100 per batch
    });

    console.log(`→ Retrying ${failedDeliveries.length} failed deliveries`);

    let succeeded = 0;
    let failed = 0;

    for (const delivery of failedDeliveries) {
      try {
        if (delivery.channel === 'IN_APP') {
          // Emit via Socket.IO again
          if (ioInstance) {
            const userRoom = `user:${delivery.notification.userId}`;
            ioInstance.to(userRoom).emit('notification:new', {
              id: delivery.notification.id,
              title: delivery.notification.title,
              message: delivery.notification.message,
              type: delivery.notification.type,
            });

            await updateDeliveryStatus(
              delivery.notificationId,
              delivery.channel,
              'DELIVERED'
            );
            succeeded++;
          }
        }
        // EMAIL retry would be handled by email service
      } catch (error) {
        console.error(`✗ Retry failed for delivery ${delivery.id}:`, error);
        failed++;

        if (delivery.retryCount >= 2) {
          // Mark as bounced after 3 attempts
          await updateDeliveryStatus(
            delivery.notificationId,
            delivery.channel,
            'BOUNCED',
            null,
            'Max retries exceeded'
          );
        }
      }
    }

    return { attempted: failedDeliveries.length, succeeded, failed };
  } catch (error) {
    console.error('✗ Error in retryFailedDeliveries:', error);
    throw error;
  }
}

/**
 * Get notification delivery status
 * @param {number} notificationId - Notification ID
 */
export async function getDeliveryStatus(notificationId) {
  try {
    return await prisma.notificationDelivery.findMany({
      where: { notificationId },
    });
  } catch (error) {
    console.error(`✗ Failed to get delivery status:`, error);
    throw error;
  }
}

/**
 * Clean up old delivery records (older than 30 days)
 * @returns {Promise<Object>} Cleanup result
 */
export async function cleanupOldDeliveries() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.notificationDelivery.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { in: ['DELIVERED', 'BOUNCED'] },
      },
    });

    console.log(`✓ Cleaned up ${result.count} delivery records`);
    return result;
  } catch (error) {
    console.error('✗ Error cleaning up deliveries:', error);
    throw error;
  }
}

export default {
  initializeNotificationEmitter,
  emitNotificationToUser,
  broadcastToRole,
  broadcastToProject,
  createDeliveryRecord,
  updateDeliveryStatus,
  markNotificationOpened,
  retryFailedDeliveries,
  getDeliveryStatus,
  cleanupOldDeliveries,
};
