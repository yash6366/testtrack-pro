/**
 * GITHUB INTEGRATION ROUTES
 * OAuth 2.0 flow, integration management, and webhook handling
 */

import crypto from 'crypto';
import { createAuthGuards } from '../lib/rbac.js';
import { logInfo, logError } from '../lib/logger.js';
import {
  generateAuthorizationUrl,
  exchangeCodeForToken,
  getGitHubUser,
  createGitHubIntegration,
  getProjectGitHubIntegration,
  updateGitHubIntegration,
  deleteGitHubIntegration,
  verifyGitHubWebhookSignature,
  fetchGitHubCommits,
  createGitHubWebhook,
  getRecentGitCommits,
  deactivateGitHubIntegration,
} from '../services/githubService.js';
import { handlePushEvent, handlePullRequestEvent, handleWebhookTest, syncGitHubData } from '../services/webhookHandlerService.js';
import { getPrismaClient } from '../lib/prisma.js';

const { requireAuth, requireProjectRole } = createAuthGuards();
const prisma = getPrismaClient();

// GitHub OAuth configuration (these should come from env)
const GITHUB_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'https://api.testtrack.pro';

async function githubRoutes(fastify) {
  /**
   * GET /api/github/oauth/authorize
   * Start GitHub OAuth flow
   */
  fastify.get(
    '/api/github/oauth/authorize',
    { schema: { tags: ['github'], summary: 'Start GitHub OAuth flow' } },
    async (request, reply) => {
      try {
        const { projectId, redirectUrl } = request.query;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId is required' });
        }

        // Generate state token for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Store state in session temporarily (you might want to use Redis)
        // For now, we'll include it in the redirect URL
        const authUrl = generateAuthorizationUrl(
          GITHUB_CLIENT_ID,
          redirectUrl || `${WEBHOOK_BASE_URL}/api/github/oauth/callback`,
          state
        );

        reply.send({
          authUrl,
          state, // Store this client-side
        });
      } catch (error) {
        logError('Error generating OAuth URL', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/github/oauth/callback
   * Handle GitHub OAuth callback
   */
  fastify.post(
    '/api/github/oauth/callback',
    { schema: { tags: ['github'], summary: 'Handle GitHub OAuth callback' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        
        const {
          code,
          state,
          projectId,
          redirectUrl,
        } = request.body;

        if (!code || !projectId) {
          return reply.code(400).send({ error: 'code and projectId are required' });
        }

        // Exchange code for token
        const tokenResponse = await exchangeCodeForToken(
          code,
          GITHUB_CLIENT_ID,
          GITHUB_CLIENT_SECRET,
          redirectUrl || `${WEBHOOK_BASE_URL}/api/github/oauth/callback`
        );

        // Get GitHub user info
        const githubUser = await getGitHubUser(tokenResponse.accessToken);

        // Verify user has admin access to project
        await requireProjectRole(request, 'PROJECT_MANAGER', Number(projectId));

        // Create integration
        const integration = await createGitHubIntegration(
          Number(projectId),
          request.user.id,
          {
            repoOwner: githubUser.login,
            repoName: '', // User will specify this in the next step
            githubUsername: githubUser.login,
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            tokenExpiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000),
          }
        );

        reply.code(201).send({
          integration,
          message: 'GitHub authentication successful. Please configure repository details.',
        });
      } catch (error) {
        logError('Error in OAuth callback', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/projects/:projectId/github-integration
   * Create/update GitHub integration with repository
   */
  fastify.post(
    '/api/projects/:projectId/github-integration',
    { schema: { tags: ['github'], summary: 'Create GitHub integration' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { projectId } = request.params;
        await requireProjectRole(request, 'PROJECT_MANAGER', Number(projectId));

        const {
          repoOwner,
          repoName,
          accessToken,
          refreshToken,
          tokenExpiresAt,
        } = request.body;

        const integration = await createGitHubIntegration(
          Number(projectId),
          request.user.id,
          {
            repoOwner,
            repoName,
            githubUsername: repoOwner,
            accessToken,
            refreshToken,
            tokenExpiresAt,
          }
        );

        // Create webhook in GitHub
        try {
          const webhookUrl = `${WEBHOOK_BASE_URL}/api/github/webhooks/${integration.id}`;
          const webhookSecret = crypto.randomBytes(32).toString('hex');

          await createGitHubWebhook(
            accessToken,
            repoOwner,
            repoName,
            webhookUrl,
            webhookSecret
          );

          // Store webhook info
          await updateGitHubIntegration(
            integration.id,
            { webhookSecret, webhookUrl },
            request.user.id
          );
        } catch (webhookError) {
          logError('Warning: Could not create webhook automatically', webhookError);
          // Don't fail the integration creation if webhook fails
        }

        // Sync initial data from GitHub
        try {
          await syncGitHubData(integration.id, { fetchGitHubCommits });
        } catch (syncError) {
          logError('Warning: Initial sync failed', syncError);
        }

        reply.code(201).send(integration);
      } catch (error) {
        logError('Error creating GitHub integration', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/projects/:projectId/github-integration
   * Get GitHub integration for project
   */
  fastify.get(
    '/api/projects/:projectId/github-integration',
    { schema: { tags: ['github'], summary: 'Get GitHub integration' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { projectId } = request.params;

        const integration = await getProjectGitHubIntegration(Number(projectId));

        // Don't return sensitive tokens
        const { accessToken, refreshToken, webhookSecret, ...safe } = integration;
        reply.send(safe);
      } catch (error) {
        if (error.message.includes('not found')) {
          return reply.code(404).send({ error: 'GitHub integration not found' });
        }
        logError('Error getting GitHub integration', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * PATCH /api/projects/:projectId/github-integration
   * Update GitHub integration
   */
  fastify.patch(
    '/api/projects/:projectId/github-integration',
    { schema: { tags: ['github'], summary: 'Update GitHub integration' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { projectId } = request.params;
        await requireProjectRole(request, 'PROJECT_MANAGER', Number(projectId));

        const integration = await getProjectGitHubIntegration(Number(projectId));
        const updated = await updateGitHubIntegration(
          integration.id,
          request.body,
          request.user.id
        );

        const { accessToken, refreshToken, webhookSecret, ...safe } = updated;
        reply.send(safe);
      } catch (error) {
        logError('Error updating GitHub integration', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * DELETE /api/projects/:projectId/github-integration
   * Delete GitHub integration
   */
  fastify.delete(
    '/api/projects/:projectId/github-integration',
    { schema: { tags: ['github'], summary: 'Delete GitHub integration' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { projectId } = request.params;
        await requireProjectRole(request, 'PROJECT_MANAGER', Number(projectId));

        await deleteGitHubIntegration(Number(projectId), request.user.id);
        reply.code(204).send();
      } catch (error) {
        logError('Error deleting GitHub integration', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/projects/:projectId/github-integration/commits
   * Get commits linked to bugs
   */
  fastify.get(
    '/api/projects/:projectId/github-integration/commits',
    { schema: { tags: ['github'], summary: 'Get linked commits' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { projectId } = request.params;
        const { limit = 50 } = request.query;

        const integration = await getProjectGitHubIntegration(Number(projectId));
        const commits = await getRecentGitCommits(integration.id, Number(limit));

        reply.send(commits);
      } catch (error) {
        logError('Error fetching commits', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/github/webhooks/:integrationId
   * Handle GitHub webhook
   */
  fastify.post(
    '/api/github/webhooks/:integrationId',
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const signature = request.headers['x-hub-signature-256'];
        const eventType = request.headers['x-github-event'];

        // Get integration to verify webhook secret
        const integration = await prisma.gitHubIntegration.findUnique({
          where: { id: Number(integrationId) },
        });

        if (!integration || !integration.webhookSecret) {
          return reply.code(401).send({ error: 'Invalid webhook' });
        }

        // Verify webhook signature
        try {
          const body = request.rawBody || JSON.stringify(request.body);
          verifyGitHubWebhookSignature(
            body,
            signature,
            integration.webhookSecret
          );
        } catch (error) {
          logError('Invalid webhook signature', error);
          return reply.code(401).send({ error: 'Invalid signature' });
        }

        // Handle different event types
        let result;
        switch (eventType) {
          case 'ping':
            result = await handleWebhookTest(request.body, Number(integrationId));
            break;
          case 'push':
            result = await handlePushEvent(request.body, Number(integrationId));
            break;
          case 'pull_request':
            result = await handlePullRequestEvent(request.body, Number(integrationId));
            break;
          default:
            logInfo(`Ignored webhook event: ${eventType}`);
            result = { success: true, ignored: true };
        }

        reply.code(200).send(result);
      } catch (error) {
        logError('Error handling webhook', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/projects/:projectId/github-integration/sync
   * Manually sync data from GitHub
   */
  fastify.post(
    '/api/projects/:projectId/github-integration/sync',
    { schema: { tags: ['github'], summary: 'Sync GitHub data' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { projectId } = request.params;
        await requireProjectRole(request, 'PROJECT_MANAGER', Number(projectId));

        const integration = await getProjectGitHubIntegration(Number(projectId));

        // Perform sync
        const result = await syncGitHubData(integration.id, { fetchGitHubCommits });

        reply.send({
          success: true,
          message: 'GitHub data synced successfully',
          ...result,
        });
      } catch (error) {
        logError('Error syncing GitHub data', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/projects/:projectId/github-integration/deactivate
   * Deactivate GitHub integration
   */
  fastify.post(
    '/api/projects/:projectId/github-integration/deactivate',
    { schema: { tags: ['github'], summary: 'Deactivate integration' } },
    async (request, reply) => {
      try {
        await requireAuth(request);
        const { projectId } = request.params;
        await requireProjectRole(request, 'PROJECT_MANAGER', Number(projectId));

        const deactivated = await deactivateGitHubIntegration(Number(projectId));
        const { accessToken, refreshToken, webhookSecret, ...safe } = deactivated;
        reply.send(safe);
      } catch (error) {
        logError('Error deactivating integration', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );
}

export default githubRoutes;
