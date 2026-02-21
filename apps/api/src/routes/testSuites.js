/**
 * TEST SUITE API ROUTES
 * RESTful endpoints for test suite management and execution
 */

import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';
import { requireNotAdmin } from '../lib/adminConstraints.js';
import {
  createTestSuite,
  updateTestSuite,
  deleteTestSuite,
  archiveTestSuite,
  restoreTestSuite,
  cloneTestSuite,
  getProjectTestSuites,
  getTestSuiteById,
  getSuiteHierarchy,
  addTestCasesToSuite,
  removeTestCasesFromSuite,
  reorderTestCasesInSuite,
  getTestCasesInSuite,
  moveSuiteToParent,
  getChildSuites,
} from '../services/testSuiteService.js';
import {
  executeSuite,
  getSuiteRunById,
  getSuiteExecutionHistory,
  getSuiteExecutionReport,
  getSuiteExecutionTrends,
  compareSuiteExecutions,
  getProjectSuiteRuns,
  updateSuiteRunMetrics,
  cancelSuiteRun,
} from '../services/testSuiteExecutionService.js';

const prisma = getPrismaClient();

export async function testSuiteRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  // ============================================
  // TEST SUITE CRUD APIs
  // ============================================

  // Create test suite
  fastify.post(
    '/api/projects/:projectId/test-suites',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.id;

        const suite = await createTestSuite(
          {
            ...request.body,
            projectId: Number(projectId),
          },
          userId
        );

        reply.code(201).send(suite);
      } catch (error) {
        console.error('Error creating test suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get test suites for project
  fastify.get(
    '/api/projects/:projectId/test-suites',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { type, status, parentSuiteId, includeArchived, search } = request.query;

        const suites = await getProjectTestSuites(Number(projectId), {
          type,
          status,
          parentSuiteId: parentSuiteId ? Number(parentSuiteId) : undefined,
          includeArchived: includeArchived === 'true',
          search,
        });

        reply.send(suites);
      } catch (error) {
        console.error('Error fetching test suites:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get suite hierarchy
  fastify.get(
    '/api/projects/:projectId/suite-hierarchy',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const hierarchy = await getSuiteHierarchy(Number(projectId));
        reply.send(hierarchy);
      } catch (error) {
        console.error('Error fetching suite hierarchy:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get single test suite
  fastify.get(
    '/api/test-suites/:suiteId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const suite = await getTestSuiteById(Number(suiteId));
        reply.send(suite);
      } catch (error) {
        console.error('Error fetching test suite:', error);
        reply.code(404).send({ error: error.message });
      }
    }
  );

  // Update test suite
  fastify.patch(
    '/api/test-suites/:suiteId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const userId = request.user.id;

        const updated = await updateTestSuite(Number(suiteId), request.body, userId);
        reply.send(updated);
      } catch (error) {
        console.error('Error updating test suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Delete test suite
  fastify.delete(
    '/api/test-suites/:suiteId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const userId = request.user.id;

        const result = await deleteTestSuite(Number(suiteId), userId);
        reply.send(result);
      } catch (error) {
        console.error('Error deleting test suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TEST SUITE OPERATIONS
  // ============================================

  // Clone test suite
  fastify.post(
    '/api/test-suites/:suiteId/clone',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { newName, includeTestCases = true, includeChildSuites = false } = request.body;
        const userId = request.user.id;

        if (!newName) {
          return reply.code(400).send({ error: 'newName is required' });
        }

        const cloned = await cloneTestSuite(
          Number(suiteId),
          newName,
          userId,
          { includeTestCases, includeChildSuites }
        );

        reply.code(201).send(cloned);
      } catch (error) {
        console.error('Error cloning test suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Archive test suite
  fastify.post(
    '/api/test-suites/:suiteId/archive',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const userId = request.user.id;

        const archived = await archiveTestSuite(Number(suiteId), userId);
        reply.send(archived);
      } catch (error) {
        console.error('Error archiving test suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Restore test suite
  fastify.post(
    '/api/test-suites/:suiteId/restore',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const userId = request.user.id;

        const restored = await restoreTestSuite(Number(suiteId), userId);
        reply.send(restored);
      } catch (error) {
        console.error('Error restoring test suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Move suite to different parent
  fastify.patch(
    '/api/test-suites/:suiteId/move',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { newParentId } = request.body;
        const userId = request.user.id;

        const moved = await moveSuiteToParent(
          Number(suiteId),
          newParentId ? Number(newParentId) : null,
          userId
        );

        reply.send(moved);
      } catch (error) {
        console.error('Error moving test suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get child suites
  fastify.get(
    '/api/test-suites/:suiteId/children',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { recursive = 'false' } = request.query;

        const children = await getChildSuites(Number(suiteId), recursive === 'true');
        reply.send(children);
      } catch (error) {
        console.error('Error fetching child suites:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TEST CASE MANAGEMENT IN SUITE
  // ============================================

  // Get test cases in suite
  fastify.get(
    '/api/test-suites/:suiteId/test-cases',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { priority, type, status } = request.query;

        const testCases = await getTestCasesInSuite(Number(suiteId), {
          priority,
          type,
          status,
        });

        reply.send(testCases);
      } catch (error) {
        console.error('Error fetching suite test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Add test cases to suite
  fastify.post(
    '/api/test-suites/:suiteId/test-cases',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { testCaseIds } = request.body;
        const userId = request.user.id;

        if (!Array.isArray(testCaseIds) || testCaseIds.length === 0) {
          return reply.code(400).send({ error: 'testCaseIds array is required' });
        }

        const added = await addTestCasesToSuite(Number(suiteId), testCaseIds, userId);
        reply.code(201).send(added);
      } catch (error) {
        console.error('Error adding test cases to suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Remove test case from suite
  fastify.delete(
    '/api/test-suites/:suiteId/test-cases/:testCaseId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId, testCaseId } = request.params;

        const result = await removeTestCasesFromSuite(Number(suiteId), [Number(testCaseId)]);
        reply.send(result);
      } catch (error) {
        console.error('Error removing test case from suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Bulk remove test cases from suite
  fastify.post(
    '/api/test-suites/:suiteId/test-cases/bulk-remove',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { testCaseIds } = request.body;

        if (!Array.isArray(testCaseIds) || testCaseIds.length === 0) {
          return reply.code(400).send({ error: 'testCaseIds array is required' });
        }

        const result = await removeTestCasesFromSuite(Number(suiteId), testCaseIds);
        reply.send(result);
      } catch (error) {
        console.error('Error removing test cases from suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Reorder test cases in suite
  fastify.patch(
    '/api/test-suites/:suiteId/test-cases/reorder',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { orderMap } = request.body;

        if (!Array.isArray(orderMap)) {
          return reply.code(400).send({ error: 'orderMap array is required' });
        }

        const result = await reorderTestCasesInSuite(Number(suiteId), orderMap);
        reply.send(result);
      } catch (error) {
        console.error('Error reordering test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // TEST SUITE EXECUTION APIs
  // ============================================

  // Execute test suite
  fastify.post(
    '/api/test-suites/:suiteId/execute',
    { preHandler: [requireAuth, requireRoles(['TESTER']), requireNotAdmin()] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const userId = request.user.id;

        const {
          name,
          description,
          environment,
          buildVersion,
          stopOnFailure = false,
          executeChildSuites = true,
        } = request.body;

        const suiteRun = await executeSuite(
          Number(suiteId),
          {
            name,
            description,
            environment,
            buildVersion,
            stopOnFailure,
            executeChildSuites,
          },
          userId
        );

        reply.code(201).send(suiteRun);
      } catch (error) {
        console.error('Error executing test suite:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get suite runs for project
  fastify.get(
    '/api/projects/:projectId/suite-runs',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { limit = 20, offset = 0, status, suiteId } = request.query;

        const suiteRuns = await getProjectSuiteRuns(Number(projectId), {
          limit: Number(limit),
          offset: Number(offset),
          status,
          suiteId: suiteId ? Number(suiteId) : undefined,
        });

        reply.send(suiteRuns);
      } catch (error) {
        console.error('Error fetching suite runs:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get suite execution history
  fastify.get(
    '/api/test-suites/:suiteId/runs',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { limit = 10, offset = 0, status } = request.query;

        const history = await getSuiteExecutionHistory(Number(suiteId), {
          limit: Number(limit),
          offset: Number(offset),
          status,
        });

        reply.send(history);
      } catch (error) {
        console.error('Error fetching suite execution history:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get single suite run
  fastify.get(
    '/api/suite-runs/:suiteRunId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteRunId } = request.params;
        const suiteRun = await getSuiteRunById(Number(suiteRunId));
        reply.send(suiteRun);
      } catch (error) {
        console.error('Error fetching suite run:', error);
        reply.code(404).send({ error: error.message });
      }
    }
  );

  // Get suite execution report
  fastify.get(
    '/api/suite-runs/:suiteRunId/report',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteRunId } = request.params;
        const report = await getSuiteExecutionReport(Number(suiteRunId));
        reply.send(report);
      } catch (error) {
        console.error('Error fetching suite execution report:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Update suite run metrics
  fastify.post(
    '/api/suite-runs/:suiteRunId/update-metrics',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteRunId } = request.params;
        const updated = await updateSuiteRunMetrics(Number(suiteRunId));
        reply.send(updated);
      } catch (error) {
        console.error('Error updating suite run metrics:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Cancel suite run
  fastify.post(
    '/api/suite-runs/:suiteRunId/cancel',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteRunId } = request.params;
        const userId = request.user.id;

        const cancelled = await cancelSuiteRun(Number(suiteRunId), userId);
        reply.send(cancelled);
      } catch (error) {
        console.error('Error cancelling suite run:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get suite execution trends
  fastify.get(
    '/api/test-suites/:suiteId/trends',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { suiteId } = request.params;
        const { limit = 10 } = request.query;

        const trends = await getSuiteExecutionTrends(Number(suiteId), {
          limit: Number(limit),
        });

        reply.send(trends);
      } catch (error) {
        console.error('Error fetching suite execution trends:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Compare two suite executions
  fastify.get(
    '/api/suite-runs/compare',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { run1Id, run2Id } = request.query;

        if (!run1Id || !run2Id) {
          return reply.code(400).send({ error: 'run1Id and run2Id are required' });
        }

        const comparison = await compareSuiteExecutions(Number(run1Id), Number(run2Id));
        reply.send(comparison);
      } catch (error) {
        console.error('Error comparing suite executions:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}
