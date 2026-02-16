/**
 * CRON SCHEDULER SERVICE
 * Manages background jobs for digest sending, cleanup, and maintenance
 * Includes failure tracking and alerting
 */

import cron from 'node-cron';
import { sendPendingDigests } from './digestService.js';
import { retryFailedDeliveries, cleanupOldDeliveries } from './notificationEmitter.js';
import { retryFailedDeliveries as retryFailedWebhooks } from './webhookService.js';
import { generateAndSendScheduledReports } from './scheduledReportService.js';
import { logInfo, logError, logWarn } from '../lib/logger.js';

let scheduledJobs = [];

// Failure tracking for alerting
const jobFailureTracker = {
  digest: { consecutiveFailures: 0, lastFailure: null, lastSuccess: null },
  retry: { consecutiveFailures: 0, lastFailure: null, lastSuccess: null },
  webhookRetry: { consecutiveFailures: 0, lastFailure: null, lastSuccess: null },
  cleanup: { consecutiveFailures: 0, lastFailure: null, lastSuccess: null },
  scheduledReports: { consecutiveFailures: 0, lastFailure: null, lastSuccess: null },
};

const FAILURE_ALERT_THRESHOLD = 3; // Alert after N consecutive failures

/**
 * Track job execution result and alert if needed
 * @param {string} jobName - Name of the job
 * @param {boolean} success - Whether the job succeeded
 * @param {Error} error - Error object if failed
 */
function trackJobExecution(jobName, success, error = null) {
  const tracker = jobFailureTracker[jobName];
  
  if (!tracker) {
    logWarn(`Unknown job tracked: ${jobName}`);
    return;
  }

  if (success) {
    tracker.consecutiveFailures = 0;
    tracker.lastSuccess = new Date();
  } else {
    tracker.consecutiveFailures++;
    tracker.lastFailure = new Date();

    // Alert if threshold reached
    if (tracker.consecutiveFailures === FAILURE_ALERT_THRESHOLD) {
      alertJobFailure(jobName, tracker.consecutiveFailures, error);
    } else if (tracker.consecutiveFailures > FAILURE_ALERT_THRESHOLD) {
      // Continue alerting every N failures
      if (tracker.consecutiveFailures % FAILURE_ALERT_THRESHOLD === 0) {
        alertJobFailure(jobName, tracker.consecutiveFailures, error);
      }
    }
  }
}

/**
 * Send alert for job failure
 * @param {string} jobName - Name of the failing job
 * @param {number} failureCount - Number of consecutive failures
 * @param {Error} error - Last error
 */
function alertJobFailure(jobName, failureCount, error) {
  const message = `CRON JOB ALERT: ${jobName} has failed ${failureCount} times consecutively`;
  
  logError(message, {
    jobName,
    consecutiveFailures: failureCount,
    lastError: error?.message,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send alerts via email, Slack, PagerDuty, etc.
  // Example: await sendAdminAlert({ subject: message, details: error });
  
  // For now, ensure it's visible in logs with special marker
  console.error('🚨 CRITICAL:', message);
}

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  logInfo('Initializing cron jobs');

  // Run digest processing every hour at :30
  // This allows digest to be sent according to user's preferred time
  const digestJob = cron.schedule('30 * * * *', async () => {
    logInfo('Running pending digests job');
    try {
      const result = await sendPendingDigests();
      logInfo('Digest job completed', { sent: result.sent, failed: result.failed });
      trackJobExecution('digest', true);
    } catch (error) {
      logError('Error in digest job', { error });
      trackJobExecution('digest', false, error);
    }
  });
  scheduledJobs.push(digestJob);

  // Retry failed notifications every 5 minutes
  const retryJob = cron.schedule('*/5 * * * *', async () => {
    logInfo('Running failed deliveries retry job');
    try {
      const result = await retryFailedDeliveries();
      if (result.attempted > 0) {
        logInfo('Retry job completed', { succeeded: result.succeeded, failed: result.failed });
      }
      trackJobExecution('retry', true);
    } catch (error) {
      logError('Error in retry job', { error });
      trackJobExecution('retry', false, error);
    }
  });
  scheduledJobs.push(retryJob);

  // Retry failed webhook deliveries every 5 minutes
  const webhookRetryJob = cron.schedule('*/5 * * * *', async () => {
    logInfo('Running failed webhook deliveries retry job');
    try {
      const result = await retryFailedWebhooks();
      if (result.processed > 0) {
        logInfo('Webhook retry job completed', { processed: result.processed });
      }
      trackJobExecution('webhookRetry', true);
    } catch (error) {
      logError('Error in webhook retry job', { error });
      trackJobExecution('webhookRetry', false, error);
    }
  });
  scheduledJobs.push(webhookRetryJob);

  // Clean up old delivery records every day at 2 AM
  const cleanupJob = cron.schedule('0 2 * * *', async () => {
    logInfo('Running cleanup job for old delivery records');
    try {
      const result = await cleanupOldDeliveries();
      logInfo('Cleanup job completed', { deletedCount: result.count });
      trackJobExecution('cleanup', true);
    } catch (error) {
      logError('Error in cleanup job', { error });
      trackJobExecution('cleanup', false, error);
    }
  });
  scheduledJobs.push(cleanupJob);

  // Generate and send scheduled reports every minute
  const scheduledReportJob = cron.schedule('* * * * *', async () => {
    try {
      const result = await generateAndSendScheduledReports();
      if (result.processed > 0) {
        logInfo('Scheduled reports job completed', { processed: result.processed, failed: result.failed });
      }
      trackJobExecution('scheduledReports', true);
    } catch (error) {
      logError('Error in scheduled reports job', { error });
      trackJobExecution('scheduledReports', false, error);
    }
  });
  scheduledJobs.push(scheduledReportJob);

  logInfo('Cron jobs initialized', { count: scheduledJobs.length });
}

/**
 * Stop all cron jobs
 */
export function stopAllCronJobs() {
  logInfo('Stopping all cron jobs');
  scheduledJobs.forEach((job) => job.stop());
  scheduledJobs = [];
  logInfo('All cron jobs stopped');
}

/**
 * Get status of scheduled jobs
 */
export function getCronJobStatus() {
  return {
    totalJobs: scheduledJobs.length,
    failureTracking: jobFailureTracker,
    jobs: [
      { 
        name: 'Digest Processing', 
        schedule: '30 * * * * (every hour at :30)', 
        active: scheduledJobs.length > 0,
        consecutiveFailures: jobFailureTracker.digest.consecutiveFailures,
        lastSuccess: jobFailureTracker.digest.lastSuccess,
        lastFailure: jobFailureTracker.digest.lastFailure,
      },
      { 
        name: 'Failed Delivery Retry', 
        schedule: '*/5 * * * * (every 5 minutes)', 
        active: scheduledJobs.length > 0,
        consecutiveFailures: jobFailureTracker.retry.consecutiveFailures,
        lastSuccess: jobFailureTracker.retry.lastSuccess,
        lastFailure: jobFailureTracker.retry.lastFailure,
      },
      { 
        name: 'Webhook Delivery Retry', 
        schedule: '*/5 * * * * (every 5 minutes)', 
        active: scheduledJobs.length > 0,
        consecutiveFailures: jobFailureTracker.webhookRetry.consecutiveFailures,
        lastSuccess: jobFailureTracker.webhookRetry.lastSuccess,
        lastFailure: jobFailureTracker.webhookRetry.lastFailure,
      },
      { 
        name: 'Delivery Record Cleanup', 
        schedule: '0 2 * * * (daily at 2 AM)', 
        active: scheduledJobs.length > 0,
        consecutiveFailures: jobFailureTracker.cleanup.consecutiveFailures,
        lastSuccess: jobFailureTracker.cleanup.lastSuccess,
        lastFailure: jobFailureTracker.cleanup.lastFailure,
      },
      { 
        name: 'Scheduled Reports', 
        schedule: '* * * * * (every minute)', 
        active: scheduledJobs.length > 0,
        consecutiveFailures: jobFailureTracker.scheduledReports.consecutiveFailures,
        lastSuccess: jobFailureTracker.scheduledReports.lastSuccess,
        lastFailure: jobFailureTracker.scheduledReports.lastFailure,
      },
    ],
  };
}

/**
 * Reset failure counter for a specific job (useful for testing or after manual intervention)
 * @param {string} jobName - Name of the job to reset
 */
export function resetJobFailureCounter(jobName) {
  if (jobFailureTracker[jobName]) {
    jobFailureTracker[jobName].consecutiveFailures = 0;
    logInfo(`Failure counter reset for job: ${jobName}`);
  }
}

export default {
  initializeCronJobs,
  stopAllCronJobs,
  getCronJobStatus,
  resetJobFailureCounter,
};
