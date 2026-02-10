import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';
import { requireNotAdmin } from '../lib/adminConstraints.js';

const prisma = getPrismaClient();

export async function testRunRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  // Create test run
  fastify.post(
    '/api/projects/:projectId/test-runs',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER']), requireNotAdmin()] },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = request.user.id;
      const { name, description, environment, buildVersion, testCaseIds } = request.body;

      if (!name || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
        return reply.code(400).send({ 
          error: 'Test run name and test case IDs are required' 
        });
      }

      try {
        // Verify project exists and user has access
        const project = await prisma.project.findUnique({
          where: { id: Number(projectId) },
        });

        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        // Create test run
        const testRun = await prisma.testRun.create({
          data: {
            projectId: Number(projectId),
            name,
            description: description || null,
            environment: environment || null,
            buildVersion: buildVersion || null,
            status: 'PLANNED',
            totalTestCases: testCaseIds.length,
            executedBy: userId,
            createdBy: userId,
          },
          include: {
            project: { select: { name: true } },
            executor: { select: { name: true, email: true } },
          },
        });

        // Create executions for each test case
        const executions = await Promise.all(
          testCaseIds.map((caseId) =>
            prisma.testExecution.create({
              data: {
                testRunId: testRun.id,
                testCaseId: Number(caseId),
                status: 'BLOCKED', // Initial status
                executedBy: userId,
              },
              include: {
                testCase: { 
                  select: { 
                    id: true,
                    name: true, 
                    steps: {
                      select: {
                        id: true,
                        stepNumber: true,
                        action: true,
                        expectedResult: true,
                        notes: true,
                      },
                      orderBy: { stepNumber: 'asc' },
                    }
                  } 
                },
              },
            })
          )
        );

        // For each execution, create execution steps
        for (const execution of executions) {
          if (execution.testCase.steps && execution.testCase.steps.length > 0) {
            await Promise.all(
              execution.testCase.steps.map((step) =>
                prisma.testExecutionStep.create({
                  data: {
                    executionId: execution.id,
                    stepId: step.id,
                    status: 'SKIPPED', // Initial status before execution
                  },
                })
              )
            );
          }
        }

        // Update test run status
        const updatedTestRun = await prisma.testRun.update({
          where: { id: testRun.id },
          data: {
            status: 'IN_PROGRESS',
            actualStartDate: new Date(),
          },
          include: {
            executions: {
              select: {
                id: true,
                testCaseId: true,
                status: true,
              },
            },
          },
        });

        reply.code(201).send({
          testRun: updatedTestRun,
          executionCount: testCaseIds.length,
        });
      } catch (error) {
        console.error('Error creating test run:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get test runs for project
  fastify.get(
    '/api/projects/:projectId/test-runs',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        const testRuns = await prisma.testRun.findMany({
          where: { projectId: Number(projectId) },
          include: {
            executor: { select: { name: true, email: true } },
            creator: { select: { name: true } },
            executions: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        reply.send({ testRuns });
      } catch (error) {
        console.error('Error fetching test runs:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get single test run
  fastify.get(
    '/api/projects/:projectId/test-runs/:runId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      const { projectId, runId } = request.params;

      try {
        const testRun = await prisma.testRun.findFirst({
          where: {
            id: Number(runId),
            projectId: Number(projectId),
          },
          include: {
            executor: { select: { name: true, email: true } },
            creator: { select: { name: true } },
            executions: {
              include: {
                testCase: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    priority: true,
                  },
                },
                executor: { select: { name: true } },
              },
              orderBy: { testCaseId: 'asc' },
            },
          },
        });

        if (!testRun) {
          return reply.code(404).send({ error: 'Test run not found' });
        }

        reply.send(testRun);
      } catch (error) {
        console.error('Error fetching test run:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Update test run
  fastify.patch(
    '/api/projects/:projectId/test-runs/:runId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'ADMIN'])] },
    async (request, reply) => {
      const { projectId, runId } = request.params;
      const { status, environment, buildVersion } = request.body;

      try {
        const testRun = await prisma.testRun.findFirst({
          where: {
            id: Number(runId),
            projectId: Number(projectId),
          },
        });

        if (!testRun) {
          return reply.code(404).send({ error: 'Test run not found' });
        }

        const updatedTestRun = await prisma.testRun.update({
          where: { id: Number(runId) },
          data: {
            status: status || undefined,
            environment: environment !== undefined ? environment : undefined,
            buildVersion: buildVersion !== undefined ? buildVersion : undefined,
            actualEndDate: status === 'COMPLETED' ? new Date() : undefined,
          },
          include: {
            executor: { select: { name: true, email: true } },
          },
        });

        reply.send(updatedTestRun);
      } catch (error) {
        console.error('Error updating test run:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Delete test run
  fastify.delete(
    '/api/projects/:projectId/test-runs/:runId',
    { preHandler: [requireAuth, requireRoles(['ADMIN'])] },
    async (request, reply) => {
      const { projectId, runId } = request.params;

      try {
        const testRun = await prisma.testRun.findFirst({
          where: {
            id: Number(runId),
            projectId: Number(projectId),
          },
        });

        if (!testRun) {
          return reply.code(404).send({ error: 'Test run not found' });
        }

        await prisma.testRun.delete({
          where: { id: Number(runId) },
        });

        reply.code(204).send();
      } catch (error) {
        console.error('Error deleting test run:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}

export default testRunRoutes;
