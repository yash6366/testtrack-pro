/**
 * GITHUB INTEGRATION SERVICE
 * Handles OAuth 2.0 flow, webhook management, and GitHub API interactions
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import crypto from 'crypto';

const prisma = getPrismaClient();

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

/**
 * Generate OAuth authorization URL
 * @param {string} clientId - GitHub OAuth app client ID
 * @param {string} redirectUrl - Callback URL
 * @param {string} state - State parameter for CSRF protection
 * @returns {string} Authorization URL
 */
export function generateAuthorizationUrl(clientId, redirectUrl, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUrl,
    scope: 'repo,admin:repo_hook,user:email',
    state,
    allow_signup: true,
  });
  return `${GITHUB_OAUTH_URL}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from GitHub
 * @param {string} clientId - GitHub OAuth app client ID
 * @param {string} clientSecret - GitHub OAuth app client secret
 * @param {string} redirectUrl - Callback URL
 * @returns {Promise<Object>} Token response
 */
export async function exchangeCodeForToken(code, clientId, clientSecret, redirectUrl) {
  const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUrl,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * Refresh GitHub access token
 * @param {string} refreshToken - GitHub refresh token
 * @param {string} clientId - GitHub OAuth app client ID
 * @param {string} clientSecret - GitHub OAuth app client secret
 * @returns {Promise<Object>} New token response
 */
export async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error_description}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
  };
}

/**
 * Get authenticated GitHub user info
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<Object>} User info
 */
export async function getGitHubUser(accessToken) {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user');
  }

  return response.json();
}

/**
 * Create GitHub integration for a project
 * @param {number} projectId - Project ID
 * @param {number} userId - User ID
 * @param {Object} data - Integration data
 * @returns {Promise<Object>} Created integration
 */
export async function createGitHubIntegration(projectId, userId, data) {
  const {
    repoOwner,
    repoName,
    githubUsername,
    accessToken,
    refreshToken,
    tokenExpiresAt,
  } = data;

  // Check if integration already exists for project
  const existing = await prisma.gitHubIntegration.findUnique({
    where: { projectId: Number(projectId) },
  });

  if (existing) {
    throw new Error('GitHub integration already exists for this project');
  }

  // Verify GitHub credentials by fetching repository info
  await verifyGitHubAccess(accessToken, repoOwner, repoName);

  const integration = await prisma.gitHubIntegration.create({
    data: {
      projectId: Number(projectId),
      repoOwner,
      repoName,
      githubUsername,
      accessToken,
      refreshToken: refreshToken || null,
      tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
      isActive: true,
      createdBy: userId,
    },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditAction(userId, 'GITHUB_INTEGRATION_CREATED', {
    resourceType: 'GITHUB_INTEGRATION',
    resourceId: integration.id,
    resourceName: `${repoOwner}/${repoName}`,
    projectId,
  });

  return integration;
}

/**
 * Get GitHub integration for project
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Integration details
 */
export async function getProjectGitHubIntegration(projectId) {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId: Number(projectId) },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  if (!integration) {
    throw new Error('GitHub integration not found for this project');
  }

  return integration;
}

/**
 * Update GitHub integration
 * @param {number} integrationId - Integration ID
 * @param {Object} data - Data to update
 * @param {number} userId - User ID performing update
 * @returns {Promise<Object>} Updated integration
 */
export async function updateGitHubIntegration(integrationId, data, userId) {
  const { accessToken, refreshToken, tokenExpiresAt, isActive } = data;

  const integration = await prisma.gitHubIntegration.update({
    where: { id: Number(integrationId) },
    data: {
      ...(accessToken && { accessToken }),
      ...(refreshToken && { refreshToken }),
      ...(tokenExpiresAt && { tokenExpiresAt: new Date(tokenExpiresAt) }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditAction(userId, 'GITHUB_INTEGRATION_UPDATED', {
    resourceType: 'GITHUB_INTEGRATION',
    resourceId: integration.id,
    projectId: integration.projectId,
  });

  return integration;
}

/**
 * Delete GitHub integration
 * @param {number} projectId - Project ID
 * @param {number} userId - User ID performing deletion
 * @returns {Promise<void>}
 */
export async function deleteGitHubIntegration(projectId, userId) {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId: Number(projectId) },
  });

  if (!integration) {
    throw new Error('GitHub integration not found');
  }

  await prisma.gitHubIntegration.delete({
    where: { id: integration.id },
  });

  await logAuditAction(userId, 'GITHUB_INTEGRATION_DELETED', {
    resourceType: 'GITHUB_INTEGRATION',
    resourceId: integration.id,
    projectId,
  });
}

/**
 * Verify GitHub repository access
 * @param {string} accessToken - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>}
 */
export async function verifyGitHubAccess(accessToken, owner, repo) {
  const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Cannot access GitHub repository. Verify credentials and permissions.');
  }

  const repo_data = await response.json();
  return repo_data;
}

/**
 * Fetch commits from GitHub repository
 * @param {string} accessToken - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} options - Fetch options (page, per_page, since, until)
 * @returns {Promise<Array>} List of commits
 */
export async function fetchGitHubCommits(accessToken, owner, repo, options = {}) {
  const {
    page = 1,
    per_page = 30,
    since = null,
    until = null,
    sha = 'main',
  } = options;

  const params = new URLSearchParams({
    page,
    per_page,
    sha,
  });

  if (since) params.append('since', since);
  if (until) params.append('until', until);

  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/commits?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch commits from GitHub');
  }

  return response.json();
}

/**
 * Fetch pull requests from GitHub
 * @param {string} accessToken - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} options - Fetch options (state, page, per_page)
 * @returns {Promise<Array>} List of pull requests
 */
export async function fetchGitHubPullRequests(accessToken, owner, repo, options = {}) {
  const { state = 'all', page = 1, per_page = 30 } = options;

  const params = new URLSearchParams({
    state,
    page,
    per_page,
    sort: 'updated',
    direction: 'desc',
  });

  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/pulls?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch pull requests from GitHub');
  }

  return response.json();
}

/**
 * Create webhook on GitHub repository
 * @param {string} accessToken - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} webhookUrl - Webhook URL
 * @param {string} webhookSecret - Webhook secret
 * @returns {Promise<Object>} Webhook details
 */
export async function createGitHubWebhook(accessToken, owner, repo, webhookUrl, webhookSecret) {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/hooks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: webhookSecret,
          insecure_ssl: '0',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create GitHub webhook');
  }

  return response.json();
}

/**
 * Verify GitHub webhook signature
 * @param {Buffer} body - Raw request body
 * @param {string} signature - X-Hub-Signature-256 header
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
export function verifyGitHubWebhookSignature(body, signature, secret) {
  if (!signature) {
    throw new Error('Missing webhook signature');
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const digest = 'sha256=' + hmac.digest('hex');
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);

  if (digestBuffer.length !== signatureBuffer.length) {
    throw new Error('Invalid webhook signature');
  }

  if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    throw new Error('Invalid webhook signature');
  }

  return true;
}

/**
 * Store commit in database
 * @param {number} integrationId - Integration ID
 * @param {Object} commitData - Commit data from GitHub
 * @returns {Promise<Object>} Created commit record
 */
export async function storeGitCommit(integrationId, commitData) {
  const {
    sha,
    message,
    author,
    committed_date,
    html_url,
    linkedBugIds = [],
    mentionedTestIds = [],
    autoLinkedDefectId = null,
  } = commitData;

  const gitCommit = await prisma.gitCommit.upsert({
    where: {
      integrationId_commitHash: {
        integrationId: Number(integrationId),
        commitHash: sha,
      },
    },
    update: {
      linkedBugIds,
      mentionedTestIds,
      autoLinkedDefectId,
    },
    create: {
      integrationId: Number(integrationId),
      commitHash: sha,
      message,
      authorName: author.name || 'Unknown',
      authorEmail: author.email || '',
      committedAt: new Date(committed_date),
      url: html_url,
      linkedBugIds,
      mentionedTestIds,
      autoLinkedDefectId,
    },
  });

  return gitCommit;
}

/**
 * Store pull request in database
 * @param {number} integrationId - Integration ID
 * @param {Object} prData - PR data from GitHub
 * @returns {Promise<Object>} Created PR record
 */
export async function storeGitPullRequest(integrationId, prData) {
  const {
    number,
    title,
    body,
    state,
    head,
    base,
    user,
    created_at,
    updated_at,
    merged_at,
    html_url,
    linkedBugIds = [],
    linkedCommitIds = [],
  } = prData;

  const pullRequest = await prisma.pullRequest.upsert({
    where: {
      integrationId_prNumber: {
        integrationId: Number(integrationId),
        prNumber: number,
      },
    },
    update: {
      title,
      description: body,
      status: state === 'closed' ? (merged_at ? 'MERGED' : 'CLOSED') : 'OPEN',
      updatedAt: new Date(updated_at),
      mergedAt: merged_at ? new Date(merged_at) : null,
      linkedBugIds,
      linkedCommitIds,
    },
    create: {
      integrationId: Number(integrationId),
      prNumber: number,
      title,
      description: body,
      status: state === 'closed' ? (merged_at ? 'MERGED' : 'CLOSED') : 'OPEN',
      sourceBranch: head.ref,
      targetBranch: base.ref,
      authorName: user.login,
      url: html_url,
      linkedBugIds,
      linkedCommitIds,
    },
  });

  return pullRequest;
}

/**
 * Update webhook URL in database
 * @param {number} integrationId - Integration ID
 * @param {string} webhookUrl - Webhook URL
 * @param {string} webhookSecret - Webhook secret
 * @returns {Promise<Object>} Updated integration
 */
export async function updateWebhookInfo(integrationId, webhookUrl, webhookSecret) {
  return prisma.gitHubIntegration.update({
    where: { id: Number(integrationId) },
    data: {
      webhookUrl,
      webhookSecret,
      lastSyncAt: new Date(),
    },
  });
}

/**
 * Get recent commits for syncing
 * @param {number} integrationId - Integration ID
 * @param {number} limit - Number of commits to fetch
 * @returns {Promise<Array>} Recent commits
 */
export async function getRecentGitCommits(integrationId, limit = 50) {
  return prisma.gitCommit.findMany({
    where: { integrationId: Number(integrationId) },
    orderBy: { committedAt: 'desc' },
    take: limit,
    include: {
      linkedDefect: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Deactivate GitHub integration
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Deactivated integration
 */
export async function deactivateGitHubIntegration(projectId) {
  return prisma.gitHubIntegration.update({
    where: { projectId: Number(projectId) },
    data: { isActive: false },
  });
}
