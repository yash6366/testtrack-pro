/**
 * CRON SCHEDULER SERVICE
 * Manages background jobs for digest sending, cleanup, and maintenance
 */

import cron from 'node-cron';
import { sendPendingDigests } from './digestService.js';
import { retryFailedDeliveries, cleanupOldDeliveries } from './notificationEmitter.js';
import { retryFailedDeliveries as retryFailedWebhooks } from './webhookService.js';

let scheduledJobs = [];

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  console.log('→ Initializing cron jobs...');

  // Run digest processing every hour at :30
  // This allows digest to be sent according to user's preferred time
  const digestJob = cron.schedule('30 * * * *', async () => {
    console.log('▶ Running pending digests...');
    try {
      const result = await sendPendingDigests();
      console.log(`✓ Digest job completed: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error('✗ Error in digest job:', error);
    }
  });
  scheduledJobs.push(digestJob);

  // Retry failed notifications every 5 minutes
  const retryJob = cron.schedule('*/5 * * * *', async () => {
    console.log('▶ Retrying failed deliveries...');
    try {
      const result = await retryFailedDeliveries();
      if (result.attempted > 0) {
        console.log(`✓ Retry job: ${result.succeeded} succeeded, ${result.failed} failed`);
      }
    } catch (error) {
      console.error('✗ Error in retry job:', error);
    }
  });
  scheduledJobs.push(retryJob);

  // Retry failed webhook deliveries every 5 minutes
  const webhookRetryJob = cron.schedule('*/5 * * * *', async () => {
    console.log('▶ Retrying failed webhook deliveries...');
    try {
      const result = await retryFailedWebhooks();
      if (result.processed > 0) {
        console.log(`✓ Webhook retry job: processed ${result.processed} deliveries`);
      }
    } catch (error) {
      console.error('✗ Error in webhook retry job:', error);
    }
  });
  scheduledJobs.push(webhookRetryJob);

  // Clean up old delivery records every day at 2 AM
  const cleanupJob = cron.schedule('0 2 * * *', async () => {
    console.log('▶ Cleaning up old delivery records...');
    try {
      const result = await cleanupOldDeliveries();
      console.log(`✓ Cleanup job: deleted ${result.count} records`);
    } catch (error) {
      console.error('✗ Error in cleanup job:', error);
    }
  });
  scheduledJobs.push(cleanupJob);

  console.log(`✓ Initialized ${scheduledJobs.length} cron jobs`);
}

/**
 * Stop all cron jobs
 */
export function stopAllCronJobs() {
  console.log('→ Stopping all cron jobs...');
  scheduledJobs.forEach(job => job.stop());
  scheduledJobs = [];
  console.log('✓ All cron jobs stopped');
}

/**
 * Get status of scheduled jobs
 */
export function getCronJobStatus() {
  return {
    totalJobs: scheduledJobs.length,
    jobs: [
      { name: 'Digest Processing', schedule: '30 * * * * (every hour at :30)', active: scheduledJobs.length > 0 },
      { name: 'Failed Delivery Retry', schedule: '*/5 * * * * (every 5 minutes)', active: scheduledJobs.length > 0 },
      { name: 'Webhook Delivery Retry', schedule: '*/5 * * * * (every 5 minutes)', active: scheduledJobs.length > 0 },
      { name: 'Delivery Record Cleanup', schedule: '0 2 * * * (daily at 2 AM)', active: scheduledJobs.length > 0 },
    ],
  };
}

export default {
  initializeCronJobs,
  stopAllCronJobs,
  getCronJobStatus,
};
