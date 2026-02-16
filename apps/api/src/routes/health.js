/**
 * HEALTH & READINESS CHECK ROUTES
 * Provides endpoints for monitoring service health and readiness
 */

import { getPrismaClient } from '../lib/prisma.js';
import { getRedisClient } from '../lib/socket.js';

const prisma = getPrismaClient();

/**
 * Health check routes
 */
export async function healthRoutes(fastify) {
  /**
   * Basic health check - returns OK if service is running
   */
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Basic health check',
      description: 'Returns OK if service is running',
      response: {
        200: {
          description: 'Service is healthy',
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * Readiness check - verifies all dependencies are available
   */
  fastify.get('/api/health/ready', {
    schema: {
      tags: ['health'],
      summary: 'Readiness check',
      description: 'Checks if all dependencies (database, Redis) are available',
      response: {
        200: {
          description: 'Service is ready',
          type: 'object',
        },
        503: {
          description: 'Service is not ready',
          type: 'object',
        },
      },
    },
  }, async (request, reply) => {
    const checks = {
      database: false,
      redis: false,
    };

    let allHealthy = true;

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      fastify.log.error('Database health check failed:', error);
      allHealthy = false;
    }

    // Check Redis connection
    try {
      const redis = getRedisClient();
      if (redis) {
        await redis.ping();
        checks.redis = true;
      } else {
        checks.redis = false;
        allHealthy = false;
      }
    } catch (error) {
      fastify.log.error('Redis health check failed:', error);
      checks.redis = false;
      allHealthy = false;
    }

    const status = allHealthy ? 'ready' : 'not_ready';
    const statusCode = allHealthy ? 200 : 503;

    reply.code(statusCode).send({
      status,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  /**
   * Liveness check - indicates if the application is alive
   */
  fastify.get('/api/health/live', {
    schema: {
      tags: ['health'],
      summary: 'Liveness check',
      description: 'Indicates if the application is alive and can accept requests',
      response: {
        200: {
          description: 'Service is alive',
          type: 'object',
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        rss: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
      },
    };
  });

  /**
   * Detailed status endpoint - provides comprehensive service status
   */
  fastify.get('/api/health/status', {
    schema: {
      tags: ['health'],
      summary: 'Detailed status',
      description: 'Provides comprehensive service status including version and environment',
      response: {
        200: {
          description: 'Service status',
          type: 'object',
        },
      },
    },
  }, async (request, reply) => {
    const checks = {
      database: { healthy: false, latency: 0 },
      redis: { healthy: false, latency: 0 },
    };

    // Database check with latency
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        healthy: true,
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      fastify.log.error('Database status check failed:', error);
    }

    // Redis check with latency
    try {
      const redis = getRedisClient();
      if (redis) {
        const redisStart = Date.now();
        await redis.ping();
        checks.redis = {
          healthy: true,
          latency: Date.now() - redisStart,
        };
      }
    } catch (error) {
      fastify.log.error('Redis status check failed:', error);
    }

    const allHealthy = checks.database.healthy && checks.redis.healthy;

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      memory: {
        heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        rss: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
        external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
      },
      dependencies: checks,
    };
  });

  /**
   * Metrics endpoint - provides basic metrics for monitoring
   */
  fastify.get('/api/health/metrics', {
    schema: {
      tags: ['health'],
      summary: 'Service metrics',
      description: 'Provides basic application metrics',
      response: {
        200: {
          description: 'Service metrics',
          type: 'object',
        },
      },
    },
  }, async (request, reply) => {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      process: {
        uptime: Math.floor(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        arrayBuffers: memUsage.arrayBuffers,
      },
      cpu: process.cpuUsage(),
    };
  });
}

export default healthRoutes;
