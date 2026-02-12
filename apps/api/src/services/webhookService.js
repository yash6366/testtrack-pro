import crypto from 'crypto';
import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

const MAX_CONSECUTIVE_FAILURES = 10;
const RETRY_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min in milliseconds

/**
 * Register a new webhook for a project
 */
export async function registerWebhook(projectId, data, createdById) {
  const webhook = await prisma.webhook.create({
    data: {
      projectId,
      name: data.name,
      url: data.url,
      secret: data.secret || crypto.randomBytes(32).toString('hex'),
      events: data.events || [],
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdById,
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  return webhook;
}

/**
 * Get all webhooks for a project
 */
export async function getProjectWebhooks(projectId) {
  const webhooks = await prisma.webhook.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return webhooks;
}

/**
 * Get webhook by ID
 */
export async function getWebhookById(webhookId, projectId) {
  const webhook = await prisma.webhook.findFirst({
    where: {
      id: webhookId,
      projectId,
    },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  return webhook;
}

/**
 * Update webhook
 */
export async function updateWebhook(webhookId, projectId, data) {
  const webhook = await prisma.webhook.updateMany({
    where: {
      id: webhookId,
      projectId,
    },
    data: {
      name: data.name,
      url: data.url,
      events: data.events,
      isActive: data.isActive,
      description: data.description,
    },
  });

  return webhook;
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId, projectId) {
  const webhook = await prisma.webhook.deleteMany({
    where: {
      id: webhookId,
      projectId,
    },
  });

  return webhook;
}

/**
 * Trigger webhook for an event
 */
export async function triggerWebhook(event, payload) {
  try {
    const { projectId, ...eventData } = payload;

    if (!projectId) {
      console.error('No projectId provided for webhook trigger');
      return;
    }

    // Find all active webhooks subscribed to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        projectId,
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    // Queue deliveries for each webhook
    const deliveryPromises = webhooks.map((webhook) =>
      queueWebhookDelivery(webhook.id, event, eventData),
    );

    await Promise.all(deliveryPromises);
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

/**
 * Queue a webhook delivery
 */
async function queueWebhookDelivery(webhookId, event, payload) {
  try {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: JSON.stringify(payload),
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

    // Attempt immediate delivery (don't await - fire and forget)
    deliverWebhook(delivery.id).catch((err) => {
      console.error(`Failed to deliver webhook ${delivery.id}:`, err);
    });

    return delivery;
  } catch (error) {
    console.error('Error queuing webhook delivery:', error);
    throw error;
  }
}

/**
 * Deliver a webhook
 */
export async function deliverWebhook(deliveryId) {
  const startTime = Date.now();

  try {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        webhook: true,
      },
    });

    if (!delivery || !delivery.webhook) {
      throw new Error('Delivery or webhook not found');
    }

    const { webhook } = delivery;

    // Check if webhook is still active
    if (!webhook.isActive) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          errorMessage: 'Webhook is inactive',
        },
      });
      return;
    }

    // Update status to retrying
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'RETRYING',
        attemptCount: { increment: 1 },
      },
    });

    // Create signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(delivery.payload)
      .digest('hex');

    // Make HTTP request
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.event,
        'User-Agent': 'TestTrack-Pro-Webhook/1.0',
      },
      body: delivery.payload,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseBody = await response.text().catch(() => '');
    const duration = Date.now() - startTime;

    if (response.ok) {
      // Success
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SUCCESS',
          responseCode: response.status,
          responseBody: responseBody.substring(0, 1000), // Limit to 1000 chars
          durationMs: duration,
          deliveredAt: new Date(),
        },
      });

      // Reset failure count on webhook
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failureCount: 0,
          lastSuccessAt: new Date(),
          lastTriggeredAt: new Date(),
        },
      });
    } else {
      // HTTP error
      throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    // Get current delivery to check attempt count
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    const attemptCount = delivery.attemptCount || 0;
    const shouldRetry = attemptCount < RETRY_DELAYS.length;

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: shouldRetry ? 'PENDING' : 'FAILED',
        errorMessage: error.message.substring(0, 500),
        durationMs: duration,
        nextRetryAt: shouldRetry ? new Date(Date.now() + RETRY_DELAYS[attemptCount]) : null,
      },
    });

    // Update webhook failure count
    const newFailureCount = (delivery.webhook.failureCount || 0) + 1;
    await prisma.webhook.update({
      where: { id: delivery.webhook.id },
      data: {
        failureCount: newFailureCount,
        lastFailureAt: new Date(),
        lastTriggeredAt: new Date(),
        // Auto-disable after max consecutive failures
        ...(newFailureCount >= MAX_CONSECUTIVE_FAILURES
          ? {
              isActive: false,
              autoDisabledAt: new Date(),
            }
          : {}),
      },
    });

    throw error;
  }
}

/**
 * Retry failed webhook deliveries
 */
export async function retryFailedDeliveries() {
  try {
    const pendingDeliveries = await prisma.webhookDelivery.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: {
          lte: new Date(),
        },
      },
      take: 50, // Process max 50 at a time
    });

    for (const delivery of pendingDeliveries) {
      await deliverWebhook(delivery.id).catch((err) => {
        console.error(`Failed to deliver webhook ${delivery.id}:`, err);
      });
    }

    return { processed: pendingDeliveries.length };
  } catch (error) {
    console.error('Error retrying failed deliveries:', error);
    throw error;
  }
}

/**
 * Get webhook deliveries for a webhook
 */
export async function getWebhookDeliveries(webhookId, { skip = 0, take = 50 } = {}) {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const total = await prisma.webhookDelivery.count({
    where: { webhookId },
  });

  return { deliveries, total };
}

/**
 * Send test webhook ping
 */
export async function sendTestWebhook(webhookId, projectId) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, projectId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const testPayload = {
    event: 'TEST_PING',
    timestamp: new Date().toISOString(),
    message: 'This is a test webhook from TestTrack Pro',
    webhookId: webhook.id,
    webhookName: webhook.name,
  };

  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId,
      event: 'TEST_PING',
      payload: JSON.stringify(testPayload),
      status: 'PENDING',
      scheduledAt: new Date(),
    },
  });

  await deliverWebhook(delivery.id);

  return delivery;
}
