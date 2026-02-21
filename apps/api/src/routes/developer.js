/**
 * DEVELOPER ROUTES
 * Bug management, fix documentation, collaboration, and metrics
 */

import { createAuthGuards } from '../lib/rbac.js';
import { requirePermission } from '../lib/policy.js';
import {
  getDeveloperAssignedBugs,
  updateFixDocumentation,
  getDeveloperMetrics,
  getBugWithTestDetails,
  getTestCaseDetails,
  requestBugRetest,
  getDeveloperOverview,
  generateDeveloperReport,
  getDeveloperBugAnalytics,
} from '../services/developerService.js';
import {
  changeBugStatus,
  addBugComment,
} from '../services/bugService.js';
import { generateDeveloperPerformanceCSV } from '../services/exportService.js';

export async function developerRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  function getClientContext(request) {
    return {
      ipAddress: request.ip || request.socket?.remoteAddress || null,
      userAgent: request.headers['user-agent'] || null,
    };
  }

  // ============================================
  // DEVELOPER DASHBOARD
  // ============================================

  /**
   * Get developer dashboard overview
   */
  fastify.get(
    '/api/developer/overview',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const overview = await getDeveloperOverview(userId);
        reply.send(overview);
      } catch (error) {
        console.error('Error fetching developer overview:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get developer performance metrics
   */
  fastify.get(
    '/api/developer/metrics',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { startDate, endDate } = request.query;

        const metrics = await getDeveloperMetrics(userId, {
          startDate,
          endDate,
        });

        reply.send(metrics);
      } catch (error) {
        console.error('Error fetching developer metrics:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // BUG MANAGEMENT
  // ============================================

  /**
   * Get assigned bugs with filters
   */
  fastify.get(
    '/api/developer/bugs/assigned',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { status, priority, severity, search, skip = 0, take = 20 } = request.query;

        const result = await getDeveloperAssignedBugs(userId, {
          status,
          priority,
          severity,
          search,
          skip: Number(skip),
          take: Number(take),
        });

        reply.send(result);
      } catch (error) {
        console.error('Error fetching assigned bugs:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get single bug with test details
   */
  fastify.get(
    '/api/developer/bugs/:bugId',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const bug = await getBugWithTestDetails(Number(bugId));

        reply.send(bug);
      } catch (error) {
        console.error('Error fetching bug:', error);
        reply.code(404).send({ error: error.message });
      }
    }
  );

  /**
   * Update fix documentation (commit, branch, fix notes, etc.)
   */
  fastify.patch(
    '/api/developer/bugs/:bugId/fix-documentation',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { projectId } = request.query;
        const userId = request.user.id;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId query parameter is required' });
        }

        const bug = await updateFixDocumentation(Number(bugId), request.body, userId);

        reply.send(bug);
      } catch (error) {
        console.error('Error updating fix documentation:', error);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        reply.code(statusCode).send({ error: error.message });
      }
    }
  );

  /**
   * Mark bug as FIXED (only DEVELOPER can do this)
   */
  fastify.patch(
    '/api/developer/bugs/:bugId/mark-fixed',
    { preHandler: [requirePermission('bug:status:change')] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { projectId } = request.query;
        const userId = request.user.id;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId query parameter is required' });
        }

        const bug = await changeBugStatus(
          Number(bugId),
          'FIXED',
          userId,
          'DEVELOPER',
          getClientContext(request),
          projectId,
          request.permissionContext,
        );

        reply.send(bug);
      } catch (error) {
        console.error('Error marking bug as fixed:', error);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        reply.code(statusCode).send({ error: error.message });
      }
    }
  );

  /**
   * Request bug retest after fix
   */
  fastify.post(
    '/api/developer/bugs/:bugId/request-retest',
    { preHandler: [requirePermission('bug:verify')] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { projectId } = request.query;
        const userId = request.user.id;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId query parameter is required' });
        }

        const {
          testerId,
          assignToTesterId,
          note,
          notes,
          expectedOutcome,
          testEnvironment,
        } = request.body || {};

        const combinedNotes = [
          note && `Fix summary: ${note}`,
          notes && `Notes: ${notes}`,
          expectedOutcome && `Expected outcome: ${expectedOutcome}`,
          testEnvironment && `Test environment: ${testEnvironment}`,
        ]
          .filter(Boolean)
          .join('\n');

        const resolvedTesterId = testerId ?? assignToTesterId ?? null;

        const result = await requestBugRetest(
          Number(bugId),
          userId,
          resolvedTesterId,
          combinedNotes || null,
          projectId,
          request.permissionContext,
        );

        reply.code(201).send(result);
      } catch (error) {
        console.error('Error requesting retest:', error);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        reply.code(statusCode).send({ error: error.message });
      }
    }
  );

  /**
   * Add comment on bug (collaboration)
   */
  fastify.post(
    '/api/developer/bugs/:bugId/comments',
    { preHandler: [requirePermission('bug:comment')] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { projectId } = request.query;
        const { body, isInternal = false } = request.body;
        const userId = request.user.id;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId query parameter is required' });
        }

        if (!body) {
          return reply.code(400).send({ error: 'Comment body is required' });
        }

        const comment = await addBugComment(
          Number(bugId),
          body,
          userId,
          isInternal,
          projectId,
          request.permissionContext,
        );

        reply.code(201).send(comment);
      } catch (error) {
        console.error('Error adding comment:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Start working on bug (change status to IN_PROGRESS)
   */
  fastify.patch(
    '/api/developer/bugs/:bugId/start-work',
    { preHandler: [requirePermission('bug:status:change')] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { projectId } = request.query;
        const userId = request.user.id;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId query parameter is required' });
        }

        const bug = await changeBugStatus(
          Number(bugId),
          'IN_PROGRESS',
          userId,
          'DEVELOPER',
          getClientContext(request),
          projectId,
          request.permissionContext,
        );

        reply.send(bug);
      } catch (error) {
        console.error('Error starting work on bug:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Reject bug (Won't Fix / Duplicate / Cannot Reproduce)
   */
  fastify.patch(
    '/api/developer/bugs/:bugId/reject',
    { preHandler: [requirePermission('bug:status:change')] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { projectId } = request.query;
        const { reason, rejectionReason } = request.body;
        const userId = request.user.id;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId query parameter is required' });
        }

        if (!rejectionReason) {
          return reply.code(400).send({
            error: 'rejectionReason is required (WONTFIX, DUPLICATE, CANNOT_REPRODUCE, WORKS_AS_DESIGNED)',
          });
        }

        const validReasons = [
          'WONTFIX',
          'DUPLICATE',
          'CANNOT_REPRODUCE',
          'WORKS_AS_DESIGNED',
        ];

        if (!validReasons.includes(rejectionReason)) {
          return reply.code(400).send({ error: 'Invalid rejection reason' });
        }

        const bug = await changeBugStatus(
          Number(bugId),
          rejectionReason,
          userId,
          'DEVELOPER',
          getClientContext(request),
          projectId,
          request.permissionContext,
        );

        // Add rejection comment
        if (reason) {
          await addBugComment(
            Number(bugId),
            `Rejected as ${rejectionReason}: ${reason}`,
            userId,
            false,
            projectId,
            request.permissionContext,
          );
        }

        reply.send(bug);
      } catch (error) {
        console.error('Error rejecting bug:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TEST CASE DETAILS (READ-ONLY FOR DEVELOPERS)
  // ============================================

  /**
   * Get test case details (read-only for developer context)
   */
  fastify.get(
    '/api/developer/test-cases/:testCaseId',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;

        const testCase = await getTestCaseDetails(Number(testCaseId));

        if (!testCase) {
          return reply.code(404).send({ error: 'Test case not found' });
        }

        reply.send(testCase);
      } catch (error) {
        console.error('Error fetching test case:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // REPORTING & EXPORT
  // ============================================

  /**
   * Get detailed developer report (analytics and metrics)
   */
  fastify.get(
    '/api/developer/reports/performance',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { startDate, endDate } = request.query;

        const report = await generateDeveloperReport(userId, {
          startDate,
          endDate,
        });

        reply.send(report);
      } catch (error) {
        console.error('Error generating developer report:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get bug analytics for developer
   */
  fastify.get(
    '/api/developer/reports/bug-analytics',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { startDate, endDate } = request.query;

        const analytics = await getDeveloperBugAnalytics(userId, {
          startDate,
          endDate,
        });

        reply.send(analytics);
      } catch (error) {
        console.error('Error generating bug analytics:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Export assigned bugs report
   */
  fastify.get(
    '/api/developer/reports/bugs/export',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { status, priority, severity } = request.query;

        const result = await getDeveloperAssignedBugs(userId, {
          status,
          priority,
          severity,
          skip: 0,
          take: 1000, // All bugs for export
        });

        // Generate CSV
        const csvContent = generateBugReportCSV(result.bugs);

        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', 'attachment; filename="developer-bugs.csv"')
          .send(csvContent);
      } catch (error) {
        console.error('Error exporting bug report:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Export developer performance report to CSV
   */
  fastify.get(
    '/api/developer/reports/performance/export',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { weeks = 8 } = request.query;

        const csvContent = await generateDeveloperPerformanceCSV(
          userId,
          Number(weeks)
        );

        reply
          .header('Content-Type', 'text/csv')
          .header(
            'Content-Disposition',
            `attachment; filename="developer-performance-${weeks}w.csv"`
          )
          .send(csvContent);
      } catch (error) {
        console.error('Error exporting performance report:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Export bug analytics report to CSV
   */
  fastify.get(
    '/api/developer/reports/bug-analytics/export',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { startDate, endDate } = request.query;

        const analytics = await getDeveloperBugAnalytics(userId, {
          startDate,
          endDate,
        });

        // Generate CSV from analytics
        const csvContent = generateBugAnalyticsCSV(analytics);

        const filename = `bug-analytics-${new Date().toISOString().split('T')[0]}.csv`;

        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(csvContent);
      } catch (error) {
        console.error('Error exporting bug analytics:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}

/**
 * Generate CSV for bug analytics
 */
function generateBugAnalyticsCSV(analytics) {
  const lines = [
    'DEVELOPER BUG ANALYTICS REPORT',
    `Generated,${new Date().toISOString()}`,
    '',
    'SUMMARY',
    `Total Bugs,${analytics.totalBugs}`,
    '',
    'WEEKLY TRENDS',
    'Week,Assigned,Resolved',
    ...analytics.weeklyTrends.map((w) => `${w.week},${w.assigned},${w.resolved}`),
    '',
    'RESOLUTION TIME DISTRIBUTION',
    'Timeframe,Count',
    ...Object.entries(analytics.resolutionTimeAnalysis.buckets).map(
      ([bucket, count]) => `${bucket},${count}`
    ),
    '',
    'SLOWEST RESOLUTIONS',
    'Bug Number,Hours',
    ...analytics.resolutionTimeAnalysis.slowest.map(
      (r) => `${r.bugNumber},${r.hours.toFixed(2)}`
    ),
    '',
    'FASTEST RESOLUTIONS',
    'Bug Number,Hours',
    ...analytics.resolutionTimeAnalysis.fastest.map(
      (r) => `${r.bugNumber},${r.hours.toFixed(2)}`
    ),
    '',
    'ENVIRONMENT BREAKDOWN',
    'Environment,Count',
    ...Object.entries(analytics.environmentBreakdown).map(
      ([env, count]) => `${env},${count}`
    ),
  ];

  return lines.join('\n');
}

/**
 * Generate CSV for bug report
 */
function generateBugReportCSV(bugs) {
  const headers = [
    'Bug Number',
    'Title',
    'Status',
    'Priority',
    'Severity',
    'Reporter',
    'Created',
    'Fix Strategy',
    'Commit Hash',
    'Code Review URL',
  ];

  const rows = bugs.map((bug) => [
    bug?.bugNumber || 'N/A',
    escapeCSV(bug?.title || ''),
    bug?.status || 'Unknown',
    bug?.priority || 'Unknown',
    bug?.severity || 'Unknown',
    bug?.reporter?.name || 'Unknown',
    bug?.createdAt ? new Date(bug.createdAt).toISOString().split('T')[0] : 'Unknown',
    escapeCSV(bug?.fixStrategy || ''),
    bug?.fixedInCommitHash || '',
    bug?.codeReviewUrl || '',
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Escape CSV field values
 */
function escapeCSV(field) {
  if (!field) return '';
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export default developerRoutes;
