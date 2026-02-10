import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import { setupCors } from './plugins/cors.js';
import { setupJwt } from './plugins/jwt.js';
import { setupHelmet } from './plugins/helmet.js';
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

const fastify = Fastify({ logger: true });

// Initialize Redis for pub/sub
initializeRedis();

// Register plugins
await setupCors(fastify);
await setupJwt(fastify);
await setupHelmet(fastify);

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

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

// Start server
const start = async () => {
  try {
    await ensureAllUsersInUniversalChannel();
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('✓ Server running on http://localhost:3001');

    // Setup Socket.IO after server is listening
    const io = setupSocket(fastify);
    console.log('✓ Socket.IO initialized');
    
    // Initialize notification emitter
    initializeNotificationEmitter(io);
    console.log('✓ Notification emitter initialized');

    // Initialize cron jobs for background processing
    initializeCronJobs();
    console.log('✓ Cron jobs initialized');
    
    // Store io on fastify for access in routes
    fastify.io = io;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
