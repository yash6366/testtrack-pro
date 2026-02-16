/**
 * TESTER ROLE ROUTES
 * Tester-specific dashboard, metrics, and workflows
 */

import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';
import {
  generateExecutionReport,
  generateTesterPerformanceReport,
  exportTestRunToCSV,
  getProjectTestMetrics,
} from '../services/reportService.js';
import {
  generateExecutionPDF,
  generateExecutionExcel,
  generateTesterPerformancePDF,
} from '../services/exportService.js';
import {
  createTestCase,
  updateTestCase,
  assignTestCase,
  setTestCaseOwner,
  getUserAssignedTestCases,
  getUserOwnedTestCases,
  importTestCasesFromCSV,
} from '../services/testCaseService.js';
import {
  createTestCaseTemplate,
  updateTestCaseTemplate,
  deleteTestCaseTemplate,
  getProjectTemplates,
  getTemplateById,
  createTestCaseFromTemplate,
} from '../services/testCaseTemplateService.js';
import {
  getProjectBugs,
} from '../services/bugService.js';

const prisma = getPrismaClient();

export async function testerRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  function getClientContext(request) {
    return {
      ipAddress: request.ip || request.socket?.remoteAddress || null,
      userAgent: request.headers['user-agent'] || null,
    };
  }

  // ============================================
  // PROJECT ACCESS
  // ============================================

  /**
   * Get projects allocated to the tester
   */
  fastify.get(
    '/api/tester/projects',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { skip = 0, take = 50, search } = request.query;

        // Build where clause
        const where = {
          status: 'ACTIVE',
          userAllocations: {
            some: {
              userId,
              isActive: true,
            },
          },
        };

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { key: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [projects, total] = await Promise.all([
          prisma.project.findMany({
            where,
            select: {
              id: true,
              name: true,
              key: true,
              description: true,
              createdAt: true,
              userAllocations: {
                where: {
                  userId,
                  isActive: true,
                },
                select: {
                  projectRole: true,
                  allocatedAt: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: Math.max(0, Number(skip)),
            take: Math.min(100, Math.max(1, Number(take))),
          }),
          prisma.project.count({ where }),
        ]);

        // Format the response
        const formattedProjects = projects.map((project) => ({
          id: project.id,
          name: project.name,
          key: project.key,
          description: project.description,
          modules: [],
          createdAt: project.createdAt,
          myRole: project.userAllocations[0]?.projectRole || null,
          joinedAt: project.userAllocations[0]?.allocatedAt || null,
        }));

        reply.send({
          projects: formattedProjects,
          pagination: {
            skip: Number(skip),
            take: Number(take),
            total,
          },
        });
      } catch (error) {
        console.error('Error fetching tester projects:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TEST CASE MANAGEMENT (TESTER DASHBOARD)
  // ============================================

  /**
   * Get test cases assigned to user
   */
  fastify.get(
    '/api/tester/test-cases/assigned',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const filters = {
          projectId: request.query.projectId ? Number(request.query.projectId) : null,
          status: request.query.status,
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 50,
        };

        const result = await getUserAssignedTestCases(userId, filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching assigned test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get test cases owned by user
   */
  fastify.get(
    '/api/tester/test-cases/owned',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const filters = {
          projectId: request.query.projectId ? Number(request.query.projectId) : null,
          status: request.query.status,
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 50,
        };

        const result = await getUserOwnedTestCases(userId, filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching owned test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Create test case with all fields
   */
  fastify.post(
    '/api/tester/projects/:projectId/test-cases',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.id;

        const testCase = await createTestCase(
          {
            ...request.body,
            projectId: Number(projectId),
            ownedById: userId, // Owner is the creator
          },
          userId,
          getClientContext(request)
        );

        reply.code(201).send(testCase);
      } catch (error) {
        console.error('Error creating test case:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Update test case (can update if owner or assigned)
   */
  fastify.patch(
    '/api/tester/test-cases/:testCaseId',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const userId = request.user.id;

        // Check authorization
        const testCase = await prisma.testCase.findUnique({
          where: { id: Number(testCaseId) },
        });

        if (!testCase) {
          return reply.code(404).send({ error: 'Test case not found' });
        }

        // Check if user is owner or assigned to test case
        if (testCase.ownedById !== userId && testCase.assignedToId !== userId) {
          return reply.code(403).send({ error: 'Not authorized to update this test case' });
        }

        const updated = await updateTestCase(
          Number(testCaseId),
          request.body,
          userId,
          getClientContext(request)
        );

        reply.send(updated);
      } catch (error) {
        console.error('Error updating test case:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Assign test case to user
   */
  fastify.patch(
    '/api/tester/test-cases/:testCaseId/assign',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const { assignedToId } = request.body;
        const userId = request.user.id;

        if (!assignedToId) {
          return reply.code(400).send({ error: 'assignedToId is required' });
        }

        const updated = await assignTestCase(
          Number(testCaseId),
          assignedToId,
          userId,
          getClientContext(request)
        );

        reply.send(updated);
      } catch (error) {
        console.error('Error assigning test case:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Set test case owner
   */
  fastify.patch(
    '/api/tester/test-cases/:testCaseId/owner',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const { ownedById } = request.body;
        const userId = request.user.id;

        if (!ownedById) {
          return reply.code(400).send({ error: 'ownedById is required' });
        }

        const testCase = await prisma.testCase.findUnique({
          where: { id: Number(testCaseId) },
        });

        if (!testCase) {
          return reply.code(404).send({ error: 'Test case not found' });
        }

        // Only owner can change ownership
        if (testCase.ownedById !== userId) {
          return reply.code(403).send({ error: 'Only test case owner can change ownership' });
        }

        const updated = await setTestCaseOwner(
          Number(testCaseId),
          ownedById,
          userId,
          getClientContext(request)
        );

        reply.send(updated);
      } catch (error) {
        console.error('Error setting test case owner:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Import test cases from CSV
   */
  fastify.post(
    '/api/tester/projects/:projectId/test-cases/import',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { csvContent } = request.body;
        const userId = request.user.id;

        if (!csvContent) {
          return reply.code(400).send({ error: 'csvContent is required' });
        }

        const results = await importTestCasesFromCSV(
          Number(projectId),
          csvContent,
          userId,
          getClientContext(request)
        );

        reply.code(201).send(results);
      } catch (error) {
        console.error('Error importing test cases:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TEST CASE TEMPLATES (TESTER DASHBOARD)
  // ============================================

  /**
   * Get project templates
   */
  fastify.get(
    '/api/tester/projects/:projectId/templates',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const filters = {
          category: request.query.category,
          isActive: request.query.isActive !== 'false',
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 50,
        };

        const result = await getProjectTemplates(Number(projectId), filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching templates:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get single template
   */
  fastify.get(
    '/api/tester/templates/:templateId',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const template = await getTemplateById(Number(templateId));
        reply.send(template);
      } catch (error) {
        console.error('Error fetching template:', error);
        reply.code(404).send({ error: error.message });
      }
    }
  );

  /**
   * Create test case from template
   */
  fastify.post(
    '/api/tester/templates/:templateId/create-test-case',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const { projectId, testCaseName } = request.body;
        const userId = request.user.id;

        if (!projectId || !testCaseName) {
          return reply.code(400).send({
            error: 'projectId and testCaseName are required',
          });
        }

        const testCase = await createTestCaseFromTemplate(
          Number(templateId),
          Number(projectId),
          testCaseName,
          userId,
          getClientContext(request)
        );

        reply.code(201).send(testCase);
      } catch (error) {
        console.error('Error creating test case from template:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Create template
   */
  fastify.post(
    '/api/tester/projects/:projectId/templates',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.id;

        const template = await createTestCaseTemplate(
          {
            ...request.body,
            projectId: Number(projectId),
          },
          userId,
          getClientContext(request)
        );

        reply.code(201).send(template);
      } catch (error) {
        console.error('Error creating template:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Update template
   */
  fastify.patch(
    '/api/tester/templates/:templateId',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const userId = request.user.id;

        const updated = await updateTestCaseTemplate(
          Number(templateId),
          request.body,
          userId,
          getClientContext(request)
        );

        reply.send(updated);
      } catch (error) {
        console.error('Error updating template:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Delete template
   */
  fastify.delete(
    '/api/tester/templates/:templateId',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const userId = request.user.id;

        await deleteTestCaseTemplate(
          Number(templateId),
          userId,
          getClientContext(request)
        );

        reply.code(204).send();
      } catch (error) {
        console.error('Error deleting template:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TESTER DASHBOARD & METRICS
  // ============================================

  /**
   * Get tester overview (dashboard metrics)
   */
  fastify.get(
    '/api/tester/overview',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request) => {
      const userId = request.user.id;

      // Get test execution statistics
      const [
        totalExecutions,
        passedExecutions,
        failedExecutions,
        blockedExecutions,
        testCasesCreated,
        activeBugs,
        recentExecutions,
      ] = await Promise.all([
        // Total executions by this tester
        prisma.testExecution.count({
          where: { userId },
        }),

        // Passed executions
        prisma.testExecution.count({
          where: {
            userId,
            status: 'PASSED',
          },
        }),

        // Failed executions
        prisma.testExecution.count({
          where: {
            userId,
            status: 'FAILED',
          },
        }),

        // Blocked executions
        prisma.testExecution.count({
          where: {
            userId,
            status: 'BLOCKED',
          },
        }),

        // Test cases created by tester
        prisma.testCase.count({
          where: {
            createdBy: userId,
            isDeleted: false,
          },
        }),

        // Active bugs reported (using defectId as reference)
        prisma.bug.count({
          where: {
            reportedBy: userId,
            status: { in: ['OPEN', 'IN_PROGRESS', 'REOPEN'] },
          },
        }),

        // Recent 10 executions
        prisma.testExecution.findMany({
          where: { userId },
          include: {
            testCase: {
              select: {
                id: true,
                name: true,
                type: true,
                priority: true,
              },
            },
            testRun: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
          take: 10,
        }),
      ]);

      const passRate = totalExecutions > 0 
        ? ((passedExecutions / totalExecutions) * 100).toFixed(2) 
        : 0;

      return {
        userId,
        metrics: {
          totalExecutions,
          passedExecutions,
          failedExecutions,
          blockedExecutions,
          testCasesCreated,
          activeBugs,
          passRate: Number(passRate),
        },
        recentExecutions,
      };
    }
  );

  /**
   * Get tester performance metrics (detailed)
   */
  fastify.get(
    '/api/tester/performance',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'ADMIN'])] },
    async (request) => {
      const userId = request.query.userId 
        ? Number(request.query.userId) 
        : request.user.id;

      // Only admins can view other testers' performance
      if (userId !== request.user.id && request.user.role !== 'ADMIN') {
        return { error: 'Unauthorized to view other tester metrics' };
      }

      // Get execution stats by status
      const executionsByStatus = await prisma.testExecution.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      });

      // Get test cases created by type
      const testCasesByType = await prisma.testCase.groupBy({
        by: ['type'],
        where: {
          createdBy: userId,
          isDeleted: false,
        },
        _count: { type: true },
      });

      // Get test cases by priority
      const testCasesByPriority = await prisma.testCase.groupBy({
        by: ['priority'],
        where: {
          createdBy: userId,
          isDeleted: false,
        },
        _count: { priority: true },
      });

      // Get average execution time (executions completed this month)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const recentCompletedExecutions = await prisma.testExecution.findMany({
        where: {
          userId,
          completedAt: { not: null },
          startedAt: { gte: oneMonthAgo },
        },
        select: {
          actualDurationSeconds: true,
        },
      });

      const avgExecutionTime = recentCompletedExecutions.length > 0
        ? recentCompletedExecutions.reduce((sum, e) => sum + (e.actualDurationSeconds || 0), 0) / recentCompletedExecutions.length
        : 0;

      // Get test runs participated in
      const testRuns = await prisma.testRun.findMany({
        where: {
          executions: {
            some: { userId },
          },
        },
        include: {
          executions: {
            where: { userId },
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        userId,
        executionsByStatus,
        testCasesByType,
        testCasesByPriority,
        avgExecutionTimeSeconds: Math.round(avgExecutionTime),
        testRunsParticipated: testRuns.length,
        recentTestRuns: testRuns,
      };
    }
  );

  /**
   * Get assigned test runs (for current tester)
   */
  fastify.get(
    '/api/tester/test-runs/assigned',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request) => {
      const userId = request.user.id;

      const testRuns = await prisma.testRun.findMany({
        where: {
          executedBy: userId,
          status: { in: ['PLANNED', 'IN_PROGRESS'] },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              key: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          executions: {
            select: {
              id: true,
              status: true,
              testCaseId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { testRuns };
    }
  );

  /**
   * Get pending test executions (incomplete)
   */
  fastify.get(
    '/api/tester/executions/pending',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request) => {
      const userId = request.user.id;

      const pendingExecutions = await prisma.testExecution.findMany({
        where: {
          userId,
          status: { in: ['BLOCKED', 'INCONCLUSIVE'] }, // Not completed
        },
        include: {
          testCase: {
            select: {
              id: true,
              name: true,
              type: true,
              priority: true,
            },
          },
          testRun: {
            select: {
              id: true,
              name: true,
              environment: true,
            },
          },
          steps: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      return { pendingExecutions };
    }
  );

  /**
   * Get test execution history for tester
   */
  fastify.get(
    '/api/tester/executions/history',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request) => {
      const userId = request.user.id;
      const { skip = 0, take = 20, status, projectId } = request.query;

      const where = {
        userId,
        ...(status && { status }),
        ...(projectId && {
          testRun: {
            projectId: Number(projectId),
          },
        }),
      };

      const [executions, total] = await Promise.all([
        prisma.testExecution.findMany({
          where,
          include: {
            testCase: {
              select: {
                id: true,
                name: true,
                type: true,
                priority: true,
              },
            },
            testRun: {
              select: {
                id: true,
                name: true,
                environment: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          skip: Number(skip),
          take: Number(take),
          orderBy: { startedAt: 'desc' },
        }),
        prisma.testExecution.count({ where }),
      ]);

      return {
        executions,
        total,
        skip: Number(skip),
        take: Number(take),
      };
    }
  );

  /**
   * Get bugs reported by tester
   */
  fastify.get(
    '/api/tester/bugs/reported',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const { projectId, status, priority, skip, take } = request.query;

        const result = await getProjectBugs(projectId ? Number(projectId) : null, {
          reporterId: userId,
          status,
          priority,
          skip: skip ? Number(skip) : 0,
          take: take ? Number(take) : 50,
        });

        reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get productivity summary (this week vs last week)
   */
  fastify.get(
    '/api/tester/productivity',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'ADMIN'])] },
    async (request) => {
      const userId = request.query.userId 
        ? Number(request.query.userId) 
        : request.user.id;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const [thisWeek, lastWeek] = await Promise.all([
        prisma.testExecution.count({
          where: {
            userId,
            startedAt: { gte: weekAgo },
          },
        }),
        prisma.testExecution.count({
          where: {
            userId,
            startedAt: { gte: twoWeeksAgo, lt: weekAgo },
          },
        }),
      ]);

      const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

      return {
        thisWeek,
        lastWeek,
        changePercent: change.toFixed(2),
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      };
    }
  );

  // ============================================
  // REPORTING & EXPORT
  // ============================================

  /**
   * Generate test execution report for a test run
   */
  fastify.get(
    '/api/test-runs/:runId/report',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { runId } = request.params;
        const report = await generateExecutionReport(Number(runId));
        reply.send(report);
      } catch (error) {
        console.error('Error generating report:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Export test run to CSV
   */
  fastify.get(
    '/api/test-runs/:runId/export/csv',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { runId } = request.params;
        const csv = await exportTestRunToCSV(Number(runId));

        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="test-run-${runId}.csv"`)
          .send(csv);
      } catch (error) {
        console.error('Error exporting test run:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Export test run to PDF
   */
  fastify.get(
    '/api/test-runs/:runId/export/pdf',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { runId } = request.params;
        const pdf = await generateExecutionPDF(Number(runId));

        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="test-run-${runId}.pdf"`)
          .send(Buffer.from(pdf));
      } catch (error) {
        console.error('Error exporting test run to PDF:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Export test run to Excel
   */
  fastify.get(
    '/api/test-runs/:runId/export/excel',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { runId } = request.params;
        const excel = await generateExecutionExcel(Number(runId));

        reply
          .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          .header('Content-Disposition', `attachment; filename="test-run-${runId}.xlsx"`)
          .send(Buffer.from(excel));
      } catch (error) {
        console.error('Error exporting test run to Excel:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get tester performance report
   */
  fastify.get(
    '/api/tester/reports/performance',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const userId = request.query.userId 
          ? Number(request.query.userId) 
          : request.user.id;

        // Only admins can view other tester reports
        if (userId !== request.user.id && request.user.role !== 'ADMIN') {
          return reply.code(403).send({ error: 'Unauthorized' });
        }

        const options = {
          startDate: request.query.startDate,
          endDate: request.query.endDate,
        };

        const report = await generateTesterPerformanceReport(userId, options);
        reply.send(report);
      } catch (error) {
        console.error('Error generating performance report:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Export tester performance report to PDF
   */
  fastify.get(
    '/api/tester/reports/performance/pdf',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const userId = request.query.userId 
          ? Number(request.query.userId) 
          : request.user.id;

        // Only admins can view other tester reports
        if (userId !== request.user.id && request.user.role !== 'ADMIN') {
          return reply.code(403).send({ error: 'Unauthorized' });
        }

        const weeks = request.query.weeks ? Number(request.query.weeks) : 4;
        const pdf = await generateTesterPerformancePDF(userId, weeks);

        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="tester-performance-${userId}.pdf"`)
          .send(Buffer.from(pdf));
      } catch (error) {
        console.error('Error exporting performance report to PDF:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get project test metrics
   */
  fastify.get(
    '/api/projects/:projectId/metrics',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const metrics = await getProjectTestMetrics(Number(projectId));
        reply.send(metrics);
      } catch (error) {
        console.error('Error fetching project metrics:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}

export default testerRoutes;
