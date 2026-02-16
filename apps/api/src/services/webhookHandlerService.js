/**
 * GITHUB WEBHOOK HANDLER SERVICE
 * Processes webhook events from GitHub (push, pull_request)
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logInfo, logError } from '../lib/logger.js';
import {
  storeGitCommit,
  storeGitPullRequest,
  updateWebhookInfo,
} from './githubService.js';
import {
  formatCommitData,
} from './commitParserService.js';

const prisma = getPrismaClient();

/**
 * Handle push webhook event from GitHub
 * Stores commits and creates auto-links to bugs/tests
 * @param {Object} payload - GitHub webhook payload
 * @param {number} integrationId - Integration ID
 * @returns {Promise<Object>} Processing result
 */
export async function handlePushEvent(payload, integrationId) {
  const { commits, repository, pusher } = payload;

  try {
    const integration = await prisma.gitHubIntegration.findUnique({
      where: { id: integrationId },
      select: { projectId: true, isActive: true },
    });

    if (!integration || !integration.isActive) {
      throw new Error('Integration not found or inactive');
    }

    const projectId = integration.projectId;
    const processedCommits = [];

    // Process each commit in the push
    for (const commit of commits) {
      // Skip merge commits
      if (commit.message.toLowerCase().startsWith('merge')) {
        continue;
      }

      // Parse and format commit data
      const commitData = await formatCommitData(commit.message, projectId);

      // Store commit in database
      const storedCommit = await storeGitCommit(integrationId, {
        sha: commit.id,
        message: commit.message,
        author: {
          name: commit.author.name,
          email: commit.author.email,
        },
        committed_date: commit.timestamp,
        html_url: commit.url,
        ...commitData,
      });

      // Create links to bugs
      if (commitData.linkedBugIds.length > 0) {
        await linkCommitToBugs(storedCommit.id, commitData.linkedBugIds);
      }

      // Create notifications for linked bugs
      if (commitData.bugs.length > 0) {
        await notifyBugOwners(storedCommit, commitData.bugs, projectId);
      }

      processedCommits.push({
        id: storedCommit.id,
        hash: commit.id,
        message: commit.message,
        linkedBugs: commitData.linkedBugIds,
        linkedTests: commitData.mentionedTestIds,
      });
    }

    logInfo(`Processed ${processedCommits.length} commits from push event`, {
      integrationId,
      projectId,
    });

    return {
      success: true,
      processedCommits,
      message: `Successfully processed ${processedCommits.length} commits`,
    };
  } catch (error) {
    logError('Error handling push event', error, { integrationId });
    throw error;
  }
}

/**
 * Handle pull_request webhook event from GitHub
 * @param {Object} payload - GitHub webhook payload
 * @param {number} integrationId - Integration ID
 * @returns {Promise<Object>} Processing result
 */
export async function handlePullRequestEvent(payload, integrationId) {
  const { action, pull_request } = payload;

  try {
    const integration = await prisma.gitHubIntegration.findUnique({
      where: { id: integrationId },
      select: { projectId: true, isActive: true },
    });

    if (!integration || !integration.isActive) {
      throw new Error('Integration not found or inactive');
    }

    const projectId = integration.projectId;

    // Parse PR title and description for linked bugs
    const commitData = await formatCommitData(
      `${pull_request.title}\n${pull_request.body || ''}`,
      projectId
    );

    // Store PR in database
    const storedPR = await storeGitPullRequest(integrationId, {
      number: pull_request.number,
      title: pull_request.title,
      body: pull_request.body,
      state: pull_request.state,
      head: pull_request.head,
      base: pull_request.base,
      user: pull_request.user,
      created_at: pull_request.created_at,
      updated_at: pull_request.updated_at,
      merged_at: pull_request.merged_at,
      html_url: pull_request.html_url,
      ...commitData,
    });

    // Create links to bugs
    if (commitData.linkedBugIds.length > 0) {
      await linkPRToBugs(storedPR.id, commitData.linkedBugIds);

      // Notify bug owners
      await notifyBugOwners(storedPR, commitData.bugs, projectId, 'PR');
    }

    logInfo(`Processed pull request #${pull_request.number}`, {
      integrationId,
      projectId,
      action,
    });

    return {
      success: true,
      pullRequest: {
        number: storedPR.prNumber,
        title: storedPR.title,
        linkedBugs: commitData.linkedBugIds,
      },
    };
  } catch (error) {
    logError('Error handling pull request event', error, { integrationId });
    throw error;
  }
}

/**
 * Link commit to bugs via GitCommit.linkedBugIds
 * @param {number} commitId - Commit ID
 * @param {Array<number>} bugIds - Bug SEs
 * @returns {Promise<void>}
 */
async function linkCommitToBugs(commitId, bugIds) {
  if (!bugIds || bugIds.length === 0) return;

  // The linkedBugIds are already stored in the commit record
  // This function can be extended for additional linking logic
  // such as adding statuses or timeline entries
}

/**
 * Link PR to bugs
 * @param {number} prId - PR ID
 * @param {Array<number>} bugIds - Bug IDs
 * @returns {Promise<void>}
 */
async function linkPRToBugs(prId, bugIds) {
  if (!bugIds || bugIds.length === 0) return;

  // This function can be extended for additional PR-specific linking
}

/**
 * Notify bug owners about linked commits/PRs
 * @param {Object} sourceItem - Commit or PR object
 * @param {Array<Object>} bugs - Array of bug objects
 * @param {number} projectId - Project ID
 * @param {string} type - 'COMMIT' or 'PR' (default: 'COMMIT')
 * @returns {Promise<void>}
 */
async function notifyBugOwners(sourceItem, bugs, projectId, type = 'COMMIT') {
  if (!bugs || bugs.length === 0) return;

  try {
    for (const bug of bugs) {
      // Create notification entry for bug assignee
      if (bug.assigneeId) {
        await prisma.notification.create({
          data: {
            userId: bug.assigneeId,
            type: type === 'PR' ? 'PR_LINKED' : 'COMMIT_LINKED',
            title: `${type} linked to "${bug.title}"`,
            description:
              type === 'PR'
                ? `PR #${sourceItem.prNumber}: ${sourceItem.title}`
                : `Commit: ${sourceItem.commitHash.substring(0, 7)} - ${sourceItem.message.split('\n')[0]}`,
            resourceType: 'DEFECT',
            resourceId: bug.id,
            projectId,
            isRead: false,
          },
        });
      }
    }

    logInfo(`Notified owners for ${bugs.length} bugs`, {
      projectId,
      type,
    });
  } catch (error) {
    logError('Error notifying bug owners', error, { projectId, type });
  }
}

/**
 * Sync historical data from GitHub
 * Fetches recent commits and PRs to populate database
 * @param {number} integrationId - Integration ID
 * @param {Object} githubService - GitHub service instance
 * @returns {Promise<Object>} Sync result
 */
export async function syncGitHubData(integrationId, githubService) {
  try {
    const integration = await prisma.gitHubIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const { accessToken, repoOwner, repoName, projectId } = integration;

    // Fetch recent commits
    const commits = await githubService.fetchGitHubCommits(
      accessToken,
      repoOwner,
      repoName,
      { per_page: 50 }
    );

    // Process commits
    let processedCount = 0;
    for (const commit of commits) {
      try {
        const commitData = await formatCommitData(commit.commit.message, projectId);

        await storeGitCommit(integrationId, {
          sha: commit.sha,
          message: commit.commit.message,
          author: {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
          },
          committed_date: commit.commit.author.date,
          html_url: commit.html_url,
          ...commitData,
        });

        processedCount++;
      } catch (error) {
        logError('Error processing commit during sync', error, {
          integrationId,
          commitSha: commit.sha,
        });
      }
    }

    // Fetch recent PRs
    const pullRequests = await githubService.fetchGitHubPullRequests(
      accessToken,
      repoOwner,
      repoName,
      { per_page: 30 }
    );

    let prCount = 0;
    for (const pr of pullRequests) {
      try {
        const commitData = await formatCommitData(
          `${pr.title}\n${pr.body || ''}`,
          projectId
        );

        await storeGitPullRequest(integrationId, {
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          head: pr.head,
          base: pr.base,
          user: pr.user,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          merged_at: pr.merged_at,
          html_url: pr.html_url,
          ...commitData,
        });

        prCount++;
      } catch (error) {
        logError('Error processing PR during sync', error, {
          integrationId,
          prNumber: pr.number,
        });
      }
    }

    // Update last sync time
    await prisma.gitHubIntegration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    logInfo('GitHub data sync completed', {
      integrationId,
      projectId,
      commitsProcessed: processedCount,
      prsProcessed: prCount,
    });

    return {
      success: true,
      commitsProcessed: processedCount,
      prsProcessed: prCount,
    };
  } catch (error) {
    logError('Error syncing GitHub data', error, { integrationId });
    throw error;
  }
}

/**
 * Handle webhook test event from GitHub
 * @param {Object} payload - GitHub webhook test payload
 * @param {number} integrationId - Integration ID
 * @returns {Promise<Object>} Test result
 */
export async function handleWebhookTest(payload, integrationId) {
  logInfo('Received webhook test event', {
    integrationId,
    zen: payload.zen,
  });

  return {
    success: true,
    message: 'Webhook connection successful',
  };
}
