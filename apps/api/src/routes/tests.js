import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';
import { requireEditPermission, requireDeletePermission, validateBulkPermissions } from '../lib/testCasePermissions.js';
import {
  createTestCase,
  updateTestCase,
  deleteTestCase,
  restoreTestCase,
  cloneTestCase,
  getProjectTestCases,
  exportTestCasesToCSV,
  importTestCasesFromCSV,
} from '../services/testCaseService.js';
import {
  bulkUpdateTestCases,
  bulkDeleteTestCases,
  bulkExportTestCases,
  bulkRestoreTestCases,
} from '../services/bulkTestCaseService.js';
import {
  getProjectTemplates,
  getTemplateById,
  createTestCaseTemplate,
  updateTestCaseTemplate,
  deleteTestCaseTemplate,
  createTestCaseFromTemplate,
} from '../services/testCaseTemplateService.js';

const prisma = getPrismaClient();

export async function testRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  function getClientContext(request) {
    return {
      ipAddress: request.ip || request.socket?.remoteAddress || null,
      userAgent: request.headers['user-agent'] || null,
    };
  }

  // ============================================
  // TEST CASE MANAGEMENT APIs
  // ============================================

  // Create test case
  fastify.post(
    '/api/projects/:projectId/test-cases',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.id;

        const testCase = await createTestCase(
          {
            ...request.body,
            projectId: Number(projectId),
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

  // Get test cases for project with filters
  fastify.get(
    '/api/projects/:projectId/test-cases',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const filters = {
          type: request.query.type,
          priority: request.query.priority,
          status: request.query.status,
          search: request.query.search,
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 50,
          includeDeleted: request.query.includeDeleted === 'true',
        };

        const result = await getProjectTestCases(Number(projectId), filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get single test case
  fastify.get(
    '/api/projects/:projectId/test-cases/:testCaseId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;

        const testCase = await prisma.testCase.findUnique({
          where: { id: Number(testCaseId) },
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
            creator: { select: { id: true, name: true, email: true } },
            lastModifier: { select: { id: true, name: true, email: true } },
            deleter: { select: { id: true, name: true } },
            executions: {
              select: {
                id: true,
                status: true,
                startedAt: true,
                completedAt: true,
              },
              orderBy: { startedAt: 'desc' },
              take: 5,
            },
          },
        });

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

  // Update test case
  fastify.patch(
    '/api/projects/:projectId/test-cases/:testCaseId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN']), requireEditPermission] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const userId = request.user.id;

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

  // Soft-delete test case
  fastify.delete(
    '/api/projects/:projectId/test-cases/:testCaseId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN']), requireDeletePermission] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const userId = request.user.id;

        const deleted = await deleteTestCase(
          Number(testCaseId),
          userId,
          getClientContext(request)
        );
        reply.send({ success: true, testCase: deleted });
      } catch (error) {
        console.error('Error deleting test case:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Restore deleted test case
  fastify.post(
    '/api/projects/:projectId/test-cases/:testCaseId/restore',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const userId = request.user.id;

        const restored = await restoreTestCase(
          Number(testCaseId),
          userId,
          getClientContext(request)
        );
        reply.send({ success: true, testCase: restored });
      } catch (error) {
        console.error('Error restoring test case:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Clone test case
  fastify.post(
    '/api/projects/:projectId/test-cases/:testCaseId/clone',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const { newName } = request.body;
        const userId = request.user.id;

        if (!newName) {
          return reply.code(400).send({ error: 'newName is required for cloning' });
        }

        const cloned = await cloneTestCase(
          Number(testCaseId),
          newName,
          userId,
          getClientContext(request)
        );
        reply.code(201).send(cloned);
      } catch (error) {
        console.error('Error cloning test case:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Export test cases to CSV
  fastify.get(
    '/api/projects/:projectId/test-cases/export/csv',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;

        const csv = await exportTestCasesToCSV(Number(projectId));

        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="testcases-project-${projectId}.csv"`)
          .send(csv);
      } catch (error) {
        console.error('Error exporting test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Import test cases from CSV
  fastify.post(
    '/api/projects/:projectId/test-cases/import/csv',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { csvContent } = request.body;
        const userId = request.user.id;

        if (!csvContent) {
          return reply.code(400).send({ error: 'CSV content is required' });
        }

        const results = await importTestCasesFromCSV(
          Number(projectId),
          csvContent,
          userId,
          getClientContext(request)
        );

        reply.send(results);
      } catch (error) {
        console.error('Error importing test cases:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // ============================================
  // BULK OPERATIONS
  // ============================================

  // Bulk update test cases
  fastify.post(
    '/api/projects/:projectId/test-cases/bulk/update',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const userRole = request.user.role;
        const results = await bulkUpdateTestCases(
          request.body,
          userId,
          userRole,
          getClientContext(request)
        );
        reply.send(results);
      } catch (error) {
        console.error('Error bulk updating test cases:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Bulk delete test cases
  fastify.post(
    '/api/projects/:projectId/test-cases/bulk/delete',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseIds } = request.body;
        const userId = request.user.id;
        const userRole = request.user.role;

        if (!testCaseIds || testCaseIds.length === 0) {
          return reply.code(400).send({ error: 'No test cases selected' });
        }

        const results = await bulkDeleteTestCases(
          testCaseIds,
          userId,
          userRole,
          getClientContext(request)
        );
        reply.send(results);
      } catch (error) {
        console.error('Error bulk deleting test cases:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Bulk restore test cases
  fastify.post(
    '/api/projects/:projectId/test-cases/bulk/restore',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseIds } = request.body;
        const userId = request.user.id;

        if (!testCaseIds || testCaseIds.length === 0) {
          return reply.code(400).send({ error: 'No test cases selected' });
        }

        const results = await bulkRestoreTestCases(
          testCaseIds,
          userId,
          getClientContext(request)
        );
        reply.send(results);
      } catch (error) {
        console.error('Error bulk restoring test cases:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Bulk export test cases (custom selection)
  fastify.post(
    '/api/projects/:projectId/test-cases/bulk/export',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const exportData = {
          projectId: Number(projectId),
          ...request.body,
        };

        const csv = await bulkExportTestCases(exportData);

        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="testcases-bulk-export-${Date.now()}.csv"`)
          .send(csv);
      } catch (error) {
        console.error('Error bulk exporting test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TEST CASE TEMPLATES
  // ============================================

  // Get project templates
  fastify.get(
    '/api/projects/:projectId/templates',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const filters = {
          category: request.query.category,
          isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : true,
        };

        const result = await getProjectTemplates(Number(projectId), filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching templates:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get single template
  fastify.get(
    '/api/templates/:templateId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
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

  // Create template
  fastify.post(
    '/api/projects/:projectId/templates',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
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

  // Update template
  fastify.patch(
    '/api/templates/:templateId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
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

  // Delete template
  fastify.delete(
    '/api/templates/:templateId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const userId = request.user.id;

        await deleteTestCaseTemplate(
          Number(templateId),
          userId,
          getClientContext(request)
        );
        reply.send({ success: true, message: 'Template deleted successfully' });
      } catch (error) {
        console.error('Error deleting template:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Create test case from template
  fastify.post(
    '/api/templates/:templateId/create-test-case',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const { projectId, testCaseName } = request.body;
        const userId = request.user.id;

        if (!projectId || !testCaseName) {
          return reply.code(400).send({ error: 'projectId and testCaseName are required' });
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

  // ============================================
  // LEGACY ENDPOINTS (for backward compatibility)
  // ============================================

  fastify.get(
    '/api/tests/summary',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request) => {
      const userId = request.user.id;

      const [total, passed, failed] = await Promise.all([
        prisma.legacyTestRun.count({ where: { userId } }),
        prisma.legacyTestRun.count({
          where: {
            userId,
            status: { equals: 'Passed', mode: 'insensitive' },
          },
        }),
        prisma.legacyTestRun.count({
          where: {
            userId,
            status: { equals: 'Failed', mode: 'insensitive' },
          },
        }),
      ]);

      const passRate = total > 0 ? (passed / total) * 100 : 0;

      return {
        total,
        passed,
        failed,
        passRate,
      };
    }
  );

  fastify.get(
    '/api/tests/recent',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request) => {
      const userId = request.user.id;

      const tests = await prisma.legacyTestRun.findMany({
        where: { userId },
        orderBy: { executedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          passRate: true,
          executedAt: true,
        },
      });

      return { tests };
    }
  );
}

export default testRoutes;
