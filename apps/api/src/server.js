import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import { setupCors } from './plugins/cors.js';
import { setupJwt } from './plugins/jwt.js';
import { setupHelmet } from './plugins/helmet.js';
import { setupSwagger } from './plugins/swagger.js';
import { rateLimitPlugin } from './plugins/rateLimit.js';
import { csrfProtectionPlugin } from './plugins/csrfProtection.js';
import { initializeLogger, createRequestLoggerMiddleware, logInfo, logError } from './lib/logger.js';
import { setupSocket, initializeRedis } from './lib/socket.js';
import { initializeNotificationEmitter } from './services/notificationEmitter.js';
import { initializeCronJobs } from './services/cronService.js';
import { ensureAllUsersInUniversalChannel } from './services/channelService.js';
import authRoutes from './routes/auth.js';
import testRoutes from './routes/tests.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import testerRoutes from './routes/tester.js';
import developerRoutes from './routes/developer.js';
import evidenceRoutes from './routes/evidence.js';
import testRunRoutes from './routes/testRuns.js';
import executionRoutes from './routes/executions.js';
import bugRoutes from './routes/bugs.js';
import { testSuiteRoutes } from './routes/testSuites.js';
import analyticsRoutes from './routes/analytics.js';
import { notificationRoutes } from './routes/notification.js';
import { searchRoutes } from './routes/search.js';
import webhookRoutes from './routes/webhooks.js';
import milestoneRoutes from './routes/milestones.js';
import testPlanRoutes from './routes/testPlans.js';
import apiKeyRoutes from './routes/apiKeys.js';
import githubRoutes from './routes/github.js';
import scheduledReportsRoutes from './routes/scheduledReports.js';
import healthRoutes from './routes/health.js';

const fastify = Fastify({ logger: true });

// Initialize structured logging
initializeLogger(fastify.log);

// Log server startup
logInfo('Starting TestTrack Pro API server');

// Register request logging middleware
await fastify.register(async (fastify) => {
  fastify.addHook('onRequest', await createRequestLoggerMiddleware());
});
await setupCors(fastify);
await setupJwt(fastify);
await setupHelmet(fastify);
await fastify.register(rateLimitPlugin);
await fastify.register(csrfProtectionPlugin);

// Register Swagger (disabled in production)
const isProduction = process.env.NODE_ENV === 'production';
const enableSwagger = process.env.ENABLE_SWAGGER === 'true' || !isProduction;
if (enableSwagger) {
  await setupSwagger(fastify);
}

// Register health check routes
fastify.register(healthRoutes);

// Register routes
fastify.register(authRoutes);
fastify.register(testRoutes);
fastify.register(chatRoutes);
fastify.register(adminRoutes);
fastify.register(testerRoutes);
fastify.register(developerRoutes);
fastify.register(evidenceRoutes);
fastify.register(testRunRoutes);
fastify.register(executionRoutes);
fastify.register(bugRoutes);
fastify.register(testSuiteRoutes);
fastify.register(analyticsRoutes);
fastify.register(notificationRoutes);
fastify.register(searchRoutes);
fastify.register(webhookRoutes);
fastify.register(milestoneRoutes);
fastify.register(testPlanRoutes);
fastify.register(apiKeyRoutes);
fastify.register(githubRoutes);
fastify.register(scheduledReportsRoutes);

// Start server
const start = async () => {
  try {
    await ensureAllUsersInUniversalChannel();
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    fastify.log.info('Server running on http://localhost:3001');

    // Setup Socket.IO after server is listening
    const io = setupSocket(fastify);
    fastify.log.info('Socket.IO initialized');
    
    // Initialize notification emitter
    initializeNotificationEmitter(io);
    fastify.log.info('Notification emitter initialized');

    // Initialize cron jobs for background processing
    initializeCronJobs();
    fastify.log.info('Cron jobs initialized');
    
    // Store io on fastify for access in routes
    fastify.io = io;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
