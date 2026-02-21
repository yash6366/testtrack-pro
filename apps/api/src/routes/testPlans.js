/**
 * TEST PLAN ROUTES
 * 7 endpoints: create, list, get, update, delete, execute, clone
 */

import {
  createTestPlan,
  getProjectTestPlans,
  getTestPlanById,
  updateTestPlan,
  deleteTestPlan,
  executeTestPlan,
  cloneTestPlan,
  getTestPlanRuns,
} from '../services/testPlanService.js';
import { createAuthGuards } from '../lib/rbac.js';
import { requirePermission } from '../lib/policy.js';
import { errorResponse, bearerAuth } from '../schemas/common.js';

const { requireAuth, requireProjectRole } = createAuthGuards();

const testPlanSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    projectId: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
    scope: { type: 'string' },
    status: { type: 'string' },
    testCaseIds: { type: 'array', items: { type: 'number' } },
    totalTestCases: { type: 'number' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    plannerNotes: { type: 'string' },
    planner: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

async function testPlanRoutes(fastify) {
  // Create test plan
  fastify.post(
    '/api/projects/:projectId/test-plans',
    { schema: { tags: ['test-plans'], summary: 'Create test plan' }, preHandler: [requirePermission('testPlan:create')] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const testPlan = await createTestPlan({ projectId: Number(projectId), ...request.body }, request.user.id, request.permissionContext);
        reply.code(201).send(testPlan);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get all test plans
  fastify.get(
    '/api/projects/:projectId/test-plans',
    { schema: { tags: ['test-plans'], summary: 'Get test plans' } },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);
        const { projectId } = request.params;
        const { skip = 0, take = 20, status, search } = request.query;
        const result = await getProjectTestPlans(projectId, { status, search }, { skip: Number(skip), take: Number(take) });
        reply.send(result);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get test plan by ID
  fastify.get(
    '/api/projects/:projectId/test-plans/:testPlanId',
    { schema: { tags: ['test-plans'], summary: 'Get test plan' } },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);
        const { testPlanId } = request.params;
        const { projectId } = request.params;
        const testPlan = await getTestPlanById(testPlanId, projectId);
        reply.send(testPlan);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Update test plan
  fastify.patch(
    '/api/projects/:projectId/test-plans/:testPlanId',
    { schema: { tags: ['test-plans'], summary: 'Update test plan' }, preHandler: [requirePermission('testPlan:edit')] },
    async (request, reply) => {
      try {
        const { testPlanId } = request.params;
        const { projectId } = request.params;
        const testPlan = await updateTestPlan(testPlanId, request.body, request.user.id, projectId, request.permissionContext);
        reply.send(testPlan);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Delete test plan
  fastify.delete(
    '/api/projects/:projectId/test-plans/:testPlanId',
    { schema: { tags: ['test-plans'], summary: 'Delete test plan' }, preHandler: [requirePermission('testPlan:delete')] },
    async (request, reply) => {
      try {
        const { testPlanId } = request.params;
        const { projectId } = request.params;
        await deleteTestPlan(testPlanId, request.user.id, projectId, request.permissionContext);
        reply.send({ success: true });
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Execute test plan (create test run)
  fastify.post(
    '/api/projects/:projectId/test-plans/:testPlanId/execute',
    { schema: { tags: ['test-plans'], summary: 'Execute test plan', body: { type: 'object' } }, preHandler: [requirePermission('testPlan:execute')] },
    async (request, reply) => {
      try {
        const { testPlanId } = request.params;
        const { projectId } = request.params;
        const result = await executeTestPlan(testPlanId, request.body, request.user.id, projectId, request.permissionContext);
        reply.code(201).send(result);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Clone test plan
  fastify.post(
    '/api/projects/:projectId/test-plans/:testPlanId/clone',
    { schema: { tags: ['test-plans'], summary: 'Clone test plan' }, preHandler: [requirePermission('testPlan:clone')] },
    async (request, reply) => {
      try {
        const { testPlanId } = request.params;
        const { projectId } = request.params;
        const cloned = await cloneTestPlan(testPlanId, request.user.id, projectId, request.permissionContext);
        reply.code(201).send(cloned);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get test plan runs
  fastify.get(
    '/api/projects/:projectId/test-plans/:testPlanId/runs',
    { schema: { tags: ['test-plans'], summary: 'Get test plan runs' } },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);
        const { testPlanId } = request.params;
        const { projectId } = request.params;
        const runs = await getTestPlanRuns(testPlanId, projectId);
        reply.send(runs);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );
}

export default testPlanRoutes;
