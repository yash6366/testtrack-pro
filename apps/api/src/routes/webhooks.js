import { createAuthGuards } from '../lib/rbac.js';
import {
  registerWebhook,
  getProjectWebhooks,
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  sendTestWebhook,
} from '../services/webhookService.js';

export async function webhookRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);
  const adminOrDeveloper = requireRoles(['ADMIN', 'DEVELOPER']);

  // Create webhook
  fastify.post(
    '/api/projects/:projectId/webhooks',
    { preHandler: [requireAuth, adminOrDeveloper] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.id;
        const { name, url, events, secret, description, isActive } = request.body;

        if (!name || !url || !events || events.length === 0) {
          return reply.code(400).send({ error: 'Name, URL, and at least one event are required' });
        }

        // Validate URL
        try {
          new URL(url);
        } catch {
          return reply.code(400).send({ error: 'Invalid URL format' });
        }

        // Validate events
        const validEvents = [
          'TEST_CREATED',
          'TEST_UPDATED',
          'TEST_DELETED',
          'BUG_CREATED',
          'BUG_UPDATED',
          'BUG_STATUS_CHANGED',
          'BUG_ASSIGNED',
          'EXECUTION_COMPLETED',
          'EXECUTION_FAILED',
          'SUITE_COMPLETED',
          'SUITE_FAILED',
        ];

        const invalidEvents = events.filter((e) => !validEvents.includes(e));
        if (invalidEvents.length > 0) {
          return reply.code(400).send({ error: `Invalid events: ${invalidEvents.join(', ')}` });
        }

        const webhook = await registerWebhook(
          Number(projectId),
          { name, url, events, secret, description, isActive },
          userId,
        );

        reply.code(201).send(webhook);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get all webhooks for a project
  fastify.get(
    '/api/projects/:projectId/webhooks',
    { preHandler: [requireAuth, adminOrDeveloper] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const webhooks = await getProjectWebhooks(Number(projectId));
        reply.send({ webhooks });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Get single webhook
  fastify.get(
    '/api/projects/:projectId/webhooks/:webhookId',
    { preHandler: [requireAuth, adminOrDeveloper] },
    async (request, reply) => {
      try {
        const { projectId, webhookId } = request.params;
        const webhook = await getWebhookById(Number(webhookId), Number(projectId));

        if (!webhook) {
          return reply.code(404).send({ error: 'Webhook not found' });
        }

        reply.send(webhook);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Update webhook
  fastify.patch(
    '/api/projects/:projectId/webhooks/:webhookId',
    { preHandler: [requireAuth, adminOrDeveloper] },
    async (request, reply) => {
      try {
        const { projectId, webhookId } = request.params;
        const { name, url, events, isActive, description } = request.body;

        // Validate URL if provided
        if (url) {
          try {
            new URL(url);
          } catch {
            return reply.code(400).send({ error: 'Invalid URL format' });
          }
        }

        await updateWebhook(Number(webhookId), Number(projectId), {
          name,
          url,
          events,
          isActive,
          description,
        });

        const updatedWebhook = await getWebhookById(Number(webhookId), Number(projectId));
        reply.send(updatedWebhook);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Delete webhook
  fastify.delete(
    '/api/projects/:projectId/webhooks/:webhookId',
    { preHandler: [requireAuth, adminOrDeveloper] },
    async (request, reply) => {
      try {
        const { projectId, webhookId } = request.params;
        await deleteWebhook(Number(webhookId), Number(projectId));
        reply.send({ success: true, message: 'Webhook deleted successfully' });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Get webhook deliveries
  fastify.get(
    '/api/projects/:projectId/webhooks/:webhookId/deliveries',
    { preHandler: [requireAuth, adminOrDeveloper] },
    async (request, reply) => {
      try {
        const { webhookId } = request.params;
        const { skip, take } = request.query;

        const result = await getWebhookDeliveries(Number(webhookId), {
          skip: skip ? Number(skip) : 0,
          take: take ? Number(take) : 50,
        });

        reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Test webhook
  fastify.post(
    '/api/projects/:projectId/webhooks/:webhookId/test',
    { preHandler: [requireAuth, adminOrDeveloper] },
    async (request, reply) => {
      try {
        const { projectId, webhookId } = request.params;
        const delivery = await sendTestWebhook(Number(webhookId), Number(projectId));
        reply.send({ success: true, delivery });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    },
  );
}

export default webhookRoutes;
