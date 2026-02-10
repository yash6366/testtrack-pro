/**
 * DIGEST SERVICE
 * Handles compilation and sending of notification digests
 * Manages daily/weekly digest scheduling
 */

import { getPrismaClient } from '../lib/prisma.js';
import { Resend } from 'resend';
import { convertTz } from '../lib/timezone.js';

const prisma = getPrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Create or get digest schedule for user
 * @param {number} userId - User ID
 * @param {string} frequency - DAILY or WEEKLY
 * @param {string} preferredTime - "HH:MM" format
 * @param {string} timezone - User's timezone
 */
export async function createDigestSchedule(userId, frequency = 'DAILY', preferredTime = '09:00', timezone = 'UTC') {
  try {
    let schedule = await prisma.digestSchedule.findUnique({
      where: { userId },
    });

    if (!schedule) {
      const nextDigestAt = calculateNextDigestTime(frequency, preferredTime, timezone);

      schedule = await prisma.digestSchedule.create({
        data: {
          userId,
          frequency,
          preferredTime,
          timezone,
          nextDigestAt,
        },
      });
    }

    return schedule;
  } catch (error) {
    console.error('✗ Failed to create digest schedule:', error);
    throw error;
  }
}

/**
 * Update digest schedule
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update
 */
export async function updateDigestSchedule(userId, updates) {
  try {
    if (updates.frequency || updates.preferredTime) {
      const schedule = await prisma.digestSchedule.findUnique({
        where: { userId },
      });

      const frequency = updates.frequency || schedule.frequency;
      const preferredTime = updates.preferredTime || schedule.preferredTime;
      const timezone = updates.timezone || schedule.timezone;

      updates.nextDigestAt = calculateNextDigestTime(frequency, preferredTime, timezone);
    }

    return await prisma.digestSchedule.update({
      where: { userId },
      data: updates,
    });
  } catch (error) {
    console.error('✗ Failed to update digest schedule:', error);
    throw error;
  }
}

/**
 * Calculate next digest time based on schedule
 * @param {string} frequency - DAILY or WEEKLY
 * @param {string} preferredTime - "HH:MM" format
 * @param {string} timezone - User's timezone
 */
function calculateNextDigestTime(frequency, preferredTime, timezone) {
  const [hours, minutes] = preferredTime.split(':').map(Number);
  const now = new Date();

  let nextTime = new Date();
  nextTime.setHours(hours, minutes, 0, 0);

  if (frequency === 'DAILY') {
    // If time has already passed today, schedule for tomorrow
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
  } else if (frequency === 'WEEKLY') {
    // Schedule for next occurrence of same day/time
    nextTime.setDate(nextTime.getDate() + 7);
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 7);
    }
  }

  return nextTime;
}

/**
 * Get pending digests to send
 * @returns {Promise<Array>} Users whose digests are due
 */
export async function getPendingDigests() {
  try {
    return await prisma.digestSchedule.findMany({
      where: {
        enabled: true,
        nextDigestAt: { lte: new Date() },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  } catch (error) {
    console.error('✗ Failed to get pending digests:', error);
    throw error;
  }
}

/**
 * Compile digest for user
 * @param {number} userId - User ID
 * @param {string} frequency - DAILY or WEEKLY
 * @returns {Promise<Object>} Compiled digest data
 */
export async function compileDigest(userId, frequency = 'DAILY') {
  try {
    // Get time window
    const { startTime, endTime } = getDigestTimeWindow(frequency);

    // Get notifications from this period
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: { gte: startTime, lte: endTime },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by type
    const grouped = groupNotificationsByType(notifications);

    // Get user preferences
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    return {
      user,
      frequency,
      startTime,
      endTime,
      notifications,
      grouped,
      preferences: prefs,
      totalCount: notifications.length,
      unreadCount: notifications.filter(n => !n.isRead).length,
    };
  } catch (error) {
    console.error('✗ Failed to compile digest:', error);
    throw error;
  }
}

/**
 * Get time window for digest
 * @param {string} frequency - DAILY or WEEKLY
 */
function getDigestTimeWindow(frequency) {
  const endTime = new Date();
  const startTime = new Date();

  if (frequency === 'DAILY') {
    startTime.setDate(startTime.getDate() - 1);
  } else if (frequency === 'WEEKLY') {
    startTime.setDate(startTime.getDate() - 7);
  }

  return { startTime, endTime };
}

/**
 * Group notifications by type
 * @param {Array} notifications - Notifications array
 */
function groupNotificationsByType(notifications) {
  const grouped = {
    BUG_CREATED: [],
    BUG_ASSIGNED: [],
    BUG_STATUS_CHANGED: [],
    BUG_COMMENTED: [],
    TEST_EXECUTION_FAILED: [],
    TEST_SUITE_COMPLETED: [],
    USER_MENTIONED: [],
    ANNOUNCEMENT: [],
    OTHER: [],
  };

  notifications.forEach(notif => {
    const type = notif.type || 'OTHER';
    if (grouped[type]) {
      grouped[type].push(notif);
    } else {
      grouped[type].push(notif);
    }
  });

  return Object.filter((type, items) => items.length > 0, grouped);
}

/**
 * Send digest email
 * @param {Object} digestData - Compiled digest data
 */
export async function sendDigestEmail(digestData) {
  const { user, frequency, notifications, grouped, totalCount, unreadCount } = digestData;

  if (!user.email || notifications.length === 0) {
    return; // Skip if no email or no notifications
  }

  const frequencyLabel = frequency === 'DAILY' ? 'Daily' : 'Weekly';
  const frequencyText = frequency === 'DAILY' ? 'last 24 hours' : 'last 7 days';

  try {
    const html = generateDigestHtml(user, frequencyLabel, frequencyText, grouped, totalCount, unreadCount);

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: user.email,
      subject: `📬 Your ${frequencyLabel} TestTrack Pro Digest - ${totalCount} notification${totalCount !== 1 ? 's' : ''}`,
      html,
    });

    console.log(`✓ Digest email sent to ${user.email}`);
    return response;
  } catch (error) {
    console.error(`✗ Failed to send digest email to ${user.email}:`, error);
    throw error;
  }
}

/**
 * Generate digest HTML
 */
function generateDigestHtml(user, frequencyLabel, frequencyText, grouped, totalCount, unreadCount) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  let notificationsHtml = Object.entries(grouped)
    .map(([type, items]) => {
      const typeLabel = formatType(type);
      const itemsHtml = items.slice(0, 5).map(item => `
        <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
          <a href="${baseUrl}${item.actionUrl || '/'}" style="color: #667eea; text-decoration: none; font-weight: 500;">
            ${item.title}
          </a>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">${item.message.substring(0, 100)}${item.message.length > 100 ? '...' : ''}</p>
        </li>
      `).join('');

      return `
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
          <h4 style="margin: 0 0 10px 0; color: #333; font-size: 15px;">
            ${getTypeEmoji(type)} ${typeLabel} (${items.length})
          </h4>
          <ul style="margin: 0; padding: 0; list-style: none;">
            ${itemsHtml}
          </ul>
          ${items.length > 5 ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">+${items.length - 5} more</p>` : ''}
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">📬 Your ${frequencyLabel} Digest</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">
          ${totalCount} notification${totalCount !== 1 ? 's' : ''} from the ${frequencyText}
        </p>
      </div>

      <div style="padding: 30px; background: white;">
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
          Hi ${user.name},
        </p>

        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
          Here's a summary of your activity from the ${frequencyText}. You have <strong>${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}</strong>.
        </p>

        ${notificationsHtml}

        <div style="margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 8px; text-align: center;">
          <a href="${baseUrl}/notifications" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View All Notifications
          </a>
        </div>
      </div>

      <div style="padding: 15px; background: #f8f9fa; border-radius: 0 0 8px 8px; font-size: 12px; color: #999; text-align: center;">
        <p style="margin: 0 0 5px 0;">
          <a href="${baseUrl}/notifications/preferences" style="color: #667eea; text-decoration: none;">Manage digest preferences</a>
        </p>
        <p style="margin: 0;">
          You're receiving this because you have digest notifications enabled.
        </p>
      </div>
    </div>
  `;
}

/**
 * Format notification type for display
 */
function formatType(type) {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get emoji for notification type
 */
function getTypeEmoji(type) {
  const emojis = {
    BUG_CREATED: '🐛',
    BUG_ASSIGNED: '👤',
    BUG_STATUS_CHANGED: '📊',
    BUG_COMMENTED: '💬',
    TEST_EXECUTION_FAILED: '❌',
    TEST_SUITE_COMPLETED: '✅',
    USER_MENTIONED: '👉',
    ANNOUNCEMENT: '📢',
  };
  return emojis[type] || '📝';
}

/**
 * Send pending digests (call from cron job)
 * @returns {Promise<Object>} Summary of sent digests
 */
export async function sendPendingDigests() {
  try {
    const pendingDigests = await getPendingDigests();
    console.log(`→ Processing ${pendingDigests.length} pending digests`);

    let sent = 0;
    let failed = 0;

    for (const schedule of pendingDigests) {
      try {
        const digest = await compileDigest(schedule.userId, schedule.frequency);

        if (digest.notifications.length > 0) {
          await sendDigestEmail(digest);
          sent++;
        }

        // Update next digest time
        const nextDigestAt = calculateNextDigestTime(
          schedule.frequency,
          schedule.preferredTime,
          schedule.timezone
        );

        await prisma.digestSchedule.update({
          where: { userId: schedule.userId },
          data: {
            lastDigestSentAt: new Date(),
            nextDigestAt,
          },
        });
      } catch (error) {
        console.error(`✗ Failed to send digest for user ${schedule.userId}:`, error);
        failed++;
      }
    }

    console.log(`✓ Sent ${sent} digests, ${failed} failed`);
    return { attempted: pendingDigests.length, sent, failed };
  } catch (error) {
    console.error('✗ Error in sendPendingDigests:', error);
    throw error;
  }
}

export default {
  createDigestSchedule,
  updateDigestSchedule,
  getPendingDigests,
  compileDigest,
  sendDigestEmail,
  sendPendingDigests,
};
