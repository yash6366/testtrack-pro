/**
 * NOTIFICATION API ROUTES
 * Handles notification retrieval, preferences, and saved filters
 */

import { createAuthGuards } from '../lib/rbac.js';
import { getPrismaClient } from '../lib/prisma.js';
import {
  getUserNotifications,
  getNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getSavedFilters,
  getSavedFilter,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
  incrementFilterUsage,
} from '../services/notificationService.js';
import {
  createDigestSchedule,
  updateDigestSchedule,
  compileDigest,
  sendDigestEmail,
  getPendingDigests,
} from '../services/digestService.js';

const prisma = getPrismaClient();

export async function notificationRoutes(fastify) {
  const { requireAuth } = createAuthGuards(fastify);

  // ============================================
  // NOTIFICATION ENDPOINTS
  // ============================================

  /**
   * Get user notifications with filters
   */
  fastify.get(
    '/api/notifications',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const filters = {
          isRead: request.query.isRead === 'true' ? true : request.query.isRead === 'false' ? false : undefined,
          type: request.query.type,
          sourceType: request.query.sourceType,
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 20,
        };

        const result = await getUserNotifications(userId, filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get single notification
   */
  fastify.get(
    '/api/notifications/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const notification = await getNotification(request.params.id);
        
        // Verify user owns this notification
        if (notification.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized to view this notification' });
        }

        reply.send(notification);
      } catch (error) {
        console.error('Error fetching notification:', error);
        reply.code(404).send({ error: error.message });
      }
    }
  );

  /**
   * Mark notification as read
   */
  fastify.patch(
    '/api/notifications/:id/read',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const notification = await getNotification(request.params.id);
        
        // Verify user owns this notification
        if (notification.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        const updated = await markNotificationAsRead(request.params.id);
        reply.send(updated);
      } catch (error) {
        console.error('Error marking notification as read:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Mark all notifications as read
   */
  fastify.patch(
    '/api/notifications/mark-all-read',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const result = await markAllNotificationsAsRead(request.user.id);
        reply.send({ success: true, updated: result.count });
      } catch (error) {
        console.error('Error marking all as read:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Delete notification
   */
  fastify.delete(
    '/api/notifications/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const notification = await getNotification(request.params.id);
        
        // Verify user owns this notification
        if (notification.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        await deleteNotification(request.params.id);
        reply.code(204).send();
      } catch (error) {
        console.error('Error deleting notification:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // NOTIFICATION PREFERENCES ENDPOINTS
  // ============================================

  /**
   * Get user notification preferences
   */
  fastify.get(
    '/api/notifications/preferences',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const prefs = await getNotificationPreferences(request.user.id);
        reply.send(prefs);
      } catch (error) {
        console.error('Error fetching preferences:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Update notification preferences
   */
  fastify.patch(
    '/api/notifications/preferences',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const updates = request.body;

        // Validate preference fields
        const validFields = [
          'emailEnabled',
          'emailBugCreated',
          'emailBugAssigned',
          'emailBugCommented',
          'emailBugStatusChanged',
          'emailTestFailed',
          'emailMentioned',
          'emailAnnouncements',
          'inAppEnabled',
          'inAppBugCreated',
          'inAppBugAssigned',
          'inAppBugCommented',
          'inAppBugStatusChanged',
          'inAppTestFailed',
          'inAppMentioned',
          'inAppAnnouncements',
          'digestEnabled',
          'digestFrequency',
          'digestTime',
          'quietHoursEnabled',
          'quietHourStart',
          'quietHourEnd',
        ];

        const sanitized = Object.keys(updates)
          .filter(key => validFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updates[key];
            return obj;
          }, {});

        const updated = await updateNotificationPreferences(request.user.id, sanitized);
        reply.send(updated);
      } catch (error) {
        console.error('Error updating preferences:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // SAVED FILTERS ENDPOINTS
  // ============================================

  /**
   * Get user saved filters
   */
  fastify.get(
    '/api/filters',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const resourceType = request.query.resourceType;
        const filters = await getSavedFilters(request.user.id, resourceType);
        reply.send(filters);
      } catch (error) {
        console.error('Error fetching filters:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get single saved filter
   */
  fastify.get(
    '/api/filters/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const filter = await getSavedFilter(request.params.id);

        // Verify user owns this filter
        if (filter.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        reply.send(filter);
      } catch (error) {
        console.error('Error fetching filter:', error);
        reply.code(404).send({ error: error.message });
      }
    }
  );

  /**
   * Create saved filter
   */
  fastify.post(
    '/api/filters',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { name, resourceType, filterConfig } = request.body;

        if (!name || !resourceType || !filterConfig) {
          return reply.code(400).send({ 
            error: 'name, resourceType, and filterConfig are required' 
          });
        }

        const filter = await createSavedFilter(request.user.id, {
          name,
          resourceType,
          filterConfig,
          displayColumns: request.body.displayColumns,
          sortBy: request.body.sortBy,
          sortOrder: request.body.sortOrder,
          isFavorite: request.body.isFavorite || false,
        });

        reply.code(201).send(filter);
      } catch (error) {
        console.error('Error creating filter:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Update saved filter
   */
  fastify.patch(
    '/api/filters/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const filter = await getSavedFilter(request.params.id);

        // Verify user owns this filter
        if (filter.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        const updated = await updateSavedFilter(request.params.id, request.body);
        reply.send(updated);
      } catch (error) {
        console.error('Error updating filter:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Delete saved filter
   */
  fastify.delete(
    '/api/filters/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const filter = await getSavedFilter(request.params.id);

        // Verify user owns this filter
        if (filter.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        await deleteSavedFilter(request.params.id);
        reply.code(204).send();
      } catch (error) {
        console.error('Error deleting filter:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Apply saved filter (increment usage and return config)
   */
  fastify.get(
    '/api/filters/:id/apply',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const filter = await getSavedFilter(request.params.id);

        // Verify user owns this filter
        if (filter.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        // Increment usage count
        await incrementFilterUsage(request.params.id);

        reply.send({
          ...filter,
          appliedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error applying filter:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // DIGEST ENDPOINTS
  // ============================================

  /**
   * Get user's digest schedule
   */
  fastify.get(
    '/api/notifications/digest/schedule',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        let schedule = await prisma.digestSchedule.findUnique({
          where: { userId: request.user.id },
        });

        if (!schedule) {
          schedule = await createDigestSchedule(request.user.id);
        }

        reply.send(schedule);
      } catch (error) {
        console.error('Error fetching digest schedule:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Update digest schedule
   */
  fastify.patch(
    '/api/notifications/digest/schedule',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const schedule = await updateDigestSchedule(request.user.id, request.body);
        reply.send(schedule);
      } catch (error) {
        console.error('Error updating digest schedule:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Compile and preview digest
   */
  fastify.get(
    '/api/notifications/digest/preview/:frequency',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const frequency = request.params.frequency; // DAILY or WEEKLY
        const digest = await compileDigest(request.user.id, frequency);
        reply.send(digest);
      } catch (error) {
        console.error('Error compiling digest:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Send digest immediately (for testing)
   */
  fastify.post(
    '/api/notifications/digest/send-now',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const schedule = await prisma.digestSchedule.findUnique({
          where: { userId: request.user.id },
        });

        if (!schedule) {
          return reply.code(404).send({ error: 'Digest schedule not found' });
        }

        const digest = await compileDigest(request.user.id, schedule.frequency);

        if (digest.notifications.length === 0) {
          return reply.send({
            success: false,
            message: 'No notifications to digest',
          });
        }

        await sendDigestEmail(digest);

        reply.send({
          success: true,
          message: 'Digest sent successfully',
          notificationCount: digest.notifications.length,
        });
      } catch (error) {
        console.error('Error sending digest:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}
