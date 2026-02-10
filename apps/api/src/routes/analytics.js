/**
 * ANALYTICS ROUTES
 * Comprehensive analytics and reporting endpoints
 */

import { createAuthGuards } from '../lib/rbac.js';
import {
  getExecutionTrendReport,
  getFlakyTests,
  getExecutionSpeedAnalysis,
  getBugTrendAnalysis,
  getReopenedBugsAnalysis,
  getBugAgeReport,
  getDefectDensity,
  getTesterEfficiency,
  getTesterTeamComparison,
  getDeveloperFixQuality,
  getDeveloperResolutionTime,
} from '../services/analyticsService.js';

export async function analyticsRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  // ============================================
  // EXECUTION ANALYTICS
  // ============================================

  /**
   * Get execution trend over time
   */
  fastify.get(
    '/api/projects/:projectId/analytics/execution-trend',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER', 'TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { weeks = 8 } = request.query;

        const trend = await getExecutionTrendReport(
          Number(projectId),
          Number(weeks)
        );
        reply.send(trend);
      } catch (error) {
        console.error('Error fetching execution trend:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get flaky tests
   */
  fastify.get(
    '/api/projects/:projectId/analytics/flaky-tests',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER', 'TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { runsThreshold = 5 } = request.query;

        const flaky = await getFlakyTests(
          Number(projectId),
          Number(runsThreshold)
        );
        reply.send({ count: flaky.length, tests: flaky });
      } catch (error) {
        console.error('Error fetching flaky tests:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get execution speed analysis
   */
  fastify.get(
    '/api/projects/:projectId/analytics/execution-speed',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER', 'TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { days = 30 } = request.query;

        const speed = await getExecutionSpeedAnalysis(
          Number(projectId),
          Number(days)
        );
        reply.send(speed);
      } catch (error) {
        console.error('Error fetching execution speed:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // BUG ANALYTICS
  // ============================================

  /**
   * Get bug trend analysis
   */
  fastify.get(
    '/api/projects/:projectId/analytics/bug-trend',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER', 'TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { weeks = 8 } = request.query;

        const trend = await getBugTrendAnalysis(
          Number(projectId),
          Number(weeks)
        );
        reply.send(trend);
      } catch (error) {
        console.error('Error fetching bug trend:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get reopened bugs analysis
   */
  fastify.get(
    '/api/projects/:projectId/analytics/reopened-bugs',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { weeks = 4 } = request.query;

        const reopens = await getReopenedBugsAnalysis(
          Number(projectId),
          Number(weeks)
        );
        reply.send(reopens);
      } catch (error) {
        console.error('Error fetching reopen analysis:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get bug age and SLA report
   */
  fastify.get(
    '/api/projects/:projectId/analytics/bug-age',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;

        const age = await getBugAgeReport(Number(projectId));
        reply.send(age);
      } catch (error) {
        console.error('Error fetching bug age:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get defect density
   */
  fastify.get(
    '/api/projects/:projectId/analytics/defect-density',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER', 'TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;

        const density = await getDefectDensity(Number(projectId));
        reply.send(density);
      } catch (error) {
        console.error('Error fetching defect density:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TESTER ANALYTICS
  // ============================================

  /**
   * Get tester efficiency metrics
   */
  fastify.get(
    '/api/analytics/tester/efficiency',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'TESTER'])] },
    async (request, reply) => {
      try {
        const userId = request.query.userId ? Number(request.query.userId) : request.user.id;
        const weeks = Number(request.query.weeks || 4);

        if (userId !== request.user.id && request.user.role !== 'ADMIN') {
          return reply.code(403).send({ error: 'Unauthorized' });
        }

        const efficiency = await getTesterEfficiency(userId, weeks);
        reply.send(efficiency);
      } catch (error) {
        console.error('Error fetching tester efficiency:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get team tester comparison
   */
  fastify.get(
    '/api/projects/:projectId/analytics/tester-comparison',
    { preHandler: [requireAuth, requireRoles(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { weeks = 4 } = request.query;

        const comparison = await getTesterTeamComparison(
          Number(projectId),
          Number(weeks)
        );
        reply.send(comparison);
      } catch (error) {
        console.error('Error fetching tester comparison:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // DEVELOPER ANALYTICS
  // ============================================

  /**
   * Get developer fix quality metrics
   */
  fastify.get(
    '/api/analytics/developer/quality',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.query.userId ? Number(request.query.userId) : request.user.id;
        const weeks = Number(request.query.weeks || 8);

        if (userId !== request.user.id && request.user.role !== 'ADMIN') {
          return reply.code(403).send({ error: 'Unauthorized' });
        }

        const quality = await getDeveloperFixQuality(userId, weeks);
        reply.send(quality);
      } catch (error) {
        console.error('Error fetching developer quality:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get developer resolution time metrics
   */
  fastify.get(
    '/api/analytics/developer/resolution-time',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.query.userId ? Number(request.query.userId) : request.user.id;
        const weeks = Number(request.query.weeks || 8);

        if (userId !== request.user.id && request.user.role !== 'ADMIN') {
          return reply.code(403).send({ error: 'Unauthorized' });
        }

        const time = await getDeveloperResolutionTime(userId, weeks);
        reply.send(time);
      } catch (error) {
        console.error('Error fetching developer resolution time:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}

export default analyticsRoutes;
