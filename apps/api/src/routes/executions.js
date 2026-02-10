import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';
import { isForbidden } from '../lib/permissions.js';
import { requireNotAdmin, requireTestResultModifier, requireNotAdminForEvidence } from '../lib/adminConstraints.js';

const prisma = getPrismaClient();

export async function executionRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  // CRITICAL: Only TESTER can execute tests - ADMIN is forbidden
  const testerOrDeveloperOnly = requireRoles(['TESTER', 'DEVELOPER']);
  const anyRole = requireRoles(['TESTER', 'DEVELOPER', 'ADMIN']);

  // Get execution with all steps (read-only, all roles)
  fastify.get(
    '/api/test-executions/:executionId',
    { preHandler: [requireAuth, anyRole] },
    async (request, reply) => {
      const { executionId } = request.params;

      try {
        const execution = await prisma.testExecution.findUnique({
          where: { id: Number(executionId) },
          include: {
            testCase: {
              include: {
                steps: {
                  orderBy: { stepNumber: 'asc' },
                },
              },
            },
            steps: {
              include: {
                testStep: true,
                evidence: true,
              },
              orderBy: { id: 'asc' },
            },
            evidence: true,
            testRun: true,
            executor: { select: { id: true, name: true, email: true } },
          },
        });

        if (!execution) {
          return reply.code(404).send({ error: 'Execution not found' });
        }

        reply.send(execution);
      } catch (error) {
        console.error('Error fetching execution:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Re-execute a previously executed test case
  fastify.post(
    '/api/test-executions/:executionId/re-execute',
    { preHandler: [requireAuth, testerOrDeveloperOnly, requireNotAdmin()] },
    async (request, reply) => {
      const { executionId } = request.params;
      const userId = request.user.id;

      if (Number.isNaN(Number(executionId))) {
        return reply.code(400).send({ error: 'Invalid executionId' });
      }

      try {
        const execution = await prisma.testExecution.findUnique({
          where: { id: Number(executionId) },
          include: {
            testRun: true,
            testCase: {
              select: {
                id: true,
                name: true,
                steps: {
                  select: {
                    id: true,
                    stepNumber: true,
                  },
                  orderBy: { stepNumber: 'asc' },
                },
              },
            },
          },
        });

        if (!execution) {
          return reply.code(404).send({ error: 'Execution not found' });
        }

        const testRun = await prisma.testRun.create({
          data: {
            projectId: execution.testRun.projectId,
            name: `Re-execution: ${execution.testCase.name}`,
            description: `Re-execution of "${execution.testCase.name}" from run "${execution.testRun.name}"`,
            status: 'IN_PROGRESS',
            actualStartDate: new Date(),
            totalTestCases: 1,
            executedBy: userId,
            createdBy: userId,
            environment: execution.testRun.environment || null,
            buildVersion: execution.testRun.buildVersion || null,
          },
        });

        const newExecution = await prisma.testExecution.create({
          data: {
            testRunId: testRun.id,
            testCaseId: execution.testCase.id,
            status: 'BLOCKED',
            executedBy: userId,
          },
        });

        if (execution.testCase.steps && execution.testCase.steps.length > 0) {
          await Promise.all(
            execution.testCase.steps.map((step) =>
              prisma.testExecutionStep.create({
                data: {
                  executionId: newExecution.id,
                  stepId: step.id,
                  status: 'SKIPPED',
                },
              })
            )
          );
        }

        reply.code(201).send({
          testRunId: testRun.id,
          executionId: newExecution.id,
        });
      } catch (error) {
        console.error('Error re-executing test case:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get all executions for a test run (read-only, all roles)
  fastify.get(
    '/api/test-runs/:runId/executions',
    { preHandler: [requireAuth, anyRole] },
    async (request, reply) => {
      const { runId } = request.params;

      try {
        const executions = await prisma.testExecution.findMany({
          where: { testRunId: Number(runId) },
          include: {
            testCase: {
              select: {
                id: true,
                name: true,
                type: true,
                priority: true,
              },
            },
            steps: {
              select: {
                id: true,
                status: true,
              },
            },
            executor: { select: { name: true } },
          },
          orderBy: { testCaseId: 'asc' },
        });

        reply.send({ executions });
      } catch (error) {
        console.error('Error fetching executions:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Update step status - CRITICAL: Only TESTER can update (not ADMIN or DEVELOPER)
  fastify.patch(
    '/api/test-executions/:executionId/steps/:stepId',
    { preHandler: [requireAuth, requireRoles(['TESTER']), requireTestResultModifier] },
    async (request, reply) => {
      const { executionId, stepId } = request.params;
      const { status, actualResult, notes } = request.body;

      if (!['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(status)) {
        return reply.code(400).send({ error: 'Invalid status' });
      }

      try {
        // Verify step belongs to execution
        const executionStep = await prisma.testExecutionStep.findUnique({
          where: {
            executionId_stepId: {
              executionId: Number(executionId),
              stepId: Number(stepId),
            },
          },
          include: {
            execution: true,
            testStep: true,
          },
        });

        if (!executionStep) {
          return reply.code(404).send({ error: 'Step not found' });
        }

        // Update step with timing
        const updatedStep = await prisma.testExecutionStep.update({
          where: {
            executionId_stepId: {
              executionId: Number(executionId),
              stepId: Number(stepId),
            },
          },
          data: {
            status,
            actualResult: actualResult || null,
            notes: notes || null,
            completedAt: new Date(),
          },
          include: {
            evidence: true,
          },
        });

        // Get all steps for this execution
        const allSteps = await prisma.testExecutionStep.findMany({
          where: { executionId: Number(executionId) },
        });

        // Check if all steps are completed
        const allCompleted = allSteps.every((s) =>
          ['PASSED', 'FAILED', 'SKIPPED', 'BLOCKED'].includes(s.status)
        );

        // Calculate execution status based on step results
        let executionStatus = 'IN_PROGRESS';
        let passedCount = 0;
        let failedCount = 0;
        let blockedCount = 0;
        let skippedCount = 0;

        allSteps.forEach((s) => {
          if (s.status === 'PASSED') passedCount++;
          else if (s.status === 'FAILED') failedCount++;
          else if (s.status === 'BLOCKED') blockedCount++;
          else if (s.status === 'SKIPPED') skippedCount++;
        });

        if (allCompleted) {
          if (failedCount > 0) executionStatus = 'FAILED';
          else if (blockedCount > 0) executionStatus = 'BLOCKED';
          else executionStatus = 'PASSED';
        }

        // Update execution with status and counts
        const updatedExecution = await prisma.testExecution.update({
          where: { id: Number(executionId) },
          data: {
            status: executionStatus,
            completedAt: allCompleted ? new Date() : null,
          },
          include: {
            testCase: {
              select: { id: true, name: true },
            },
            steps: {
              include: {
                testStep: true,
                evidence: true,
              },
              orderBy: { id: 'asc' },
            },
            testRun: { select: { id: true, name: true } },
            executor: { select: { id: true, name: true, email: true } },
          },
        });

        // Update test run counts
        const testRun = await prisma.testRun.findUnique({
          where: { id: updatedExecution.testRunId },
        });

        if (testRun) {
          const allExecutions = await prisma.testExecution.findMany({
            where: { testRunId: testRun.id },
          });

          const runStats = allExecutions.reduce(
            (acc, exe) => {
              if (exe.status === 'PASSED') acc.passed++;
              else if (exe.status === 'FAILED') acc.failed++;
              else if (exe.status === 'BLOCKED') acc.blocked++;
              else if (exe.status === 'SKIPPED') acc.skipped++;
              return acc;
            },
            { passed: 0, failed: 0, blocked: 0, skipped: 0 }
          );

          await prisma.testRun.update({
            where: { id: testRun.id },
            data: {
              passedCount: runStats.passed,
              failedCount: runStats.failed,
              blockedCount: runStats.blocked,
              skippedCount: runStats.skipped,
            },
          });
        }

        reply.send({
          step: updatedStep,
          execution: updatedExecution,
          allCompleted,
          completionPercentage: Math.round((allSteps.filter(s => 
            ['PASSED', 'FAILED', 'SKIPPED', 'BLOCKED'].includes(s.status)
          ).length / allSteps.length) * 100),
        });
      } catch (error) {
        console.error('Error updating step:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get all steps for an execution
  fastify.get(
    '/api/test-executions/:executionId/steps',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      const { executionId } = request.params;

      try {
        const steps = await prisma.testExecutionStep.findMany({
          where: { executionId: Number(executionId) },
          include: {
            testStep: true,
            evidence: true,
          },
          orderBy: { id: 'asc' },
        });

        reply.send({ steps });
      } catch (error) {
        console.error('Error fetching steps:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Complete execution (final status)
  fastify.patch(
    '/api/test-executions/:executionId/complete',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER']), requireTestResultModifier] },
    async (request, reply) => {
      const { executionId } = request.params;
      const { comments } = request.body;

      try {
        const execution = await prisma.testExecution.findUnique({
          where: { id: Number(executionId) },
        });

        if (!execution) {
          return reply.code(404).send({ error: 'Execution not found' });
        }

        // Get all steps to verify completion
        const allSteps = await prisma.testExecutionStep.findMany({
          where: { executionId: Number(executionId) },
        });

        const allCompleted = allSteps.every((s) =>
          ['PASSED', 'FAILED', 'SKIPPED', 'BLOCKED'].includes(s.status)
        );

        if (!allCompleted) {
          return reply.code(400).send({
            error: 'Cannot complete execution - not all steps are marked',
          });
        }

        // Calculate final status
        let finalStatus = 'PASSED';
        if (allSteps.some((s) => s.status === 'FAILED')) finalStatus = 'FAILED';
        else if (allSteps.some((s) => s.status === 'BLOCKED')) finalStatus = 'BLOCKED';

        // Update execution
        const completedExecution = await prisma.testExecution.update({
          where: { id: Number(executionId) },
          data: {
            status: finalStatus,
            comments: comments || null,
            completedAt: new Date(),
            durationSeconds: Math.floor(
              (new Date() - new Date(execution.startedAt)) / 1000
            ),
          },
          include: {
            testCase: { select: { name: true } },
            testRun: { select: { id: true, name: true } },
          },
        });

        reply.send(completedExecution);
      } catch (error) {
        console.error('Error completing execution:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Auto-save progress (touch timestamp)
  fastify.patch(
    '/api/test-executions/:executionId/progress',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER']), requireNotAdmin()] },
    async (request, reply) => {
      const { executionId } = request.params;

      try {
        const execution = await prisma.testExecution.update({
          where: { id: Number(executionId) },
          data: {
            updatedAt: new Date(),
          },
        });

        reply.send({
          saved: true,
          execution,
          lastSaved: execution.updatedAt,
        });
      } catch (error) {
        console.error('Error auto-saving progress:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Link a defect to an execution
  fastify.patch(
    '/api/test-executions/:executionId/defect',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request, reply) => {
      const { executionId } = request.params;
      const { defectId } = request.body;

      const normalizedDefectId =
        defectId === null || defectId === '' || typeof defectId === 'undefined'
          ? null
          : Number(defectId);

      if (normalizedDefectId !== null && Number.isNaN(normalizedDefectId)) {
        return reply.code(400).send({ error: 'defectId must be a number or null' });
      }

      try {
        const execution = await prisma.testExecution.update({
          where: { id: Number(executionId) },
          data: { defectId: normalizedDefectId },
          include: {
            testCase: { select: { id: true, name: true } },
            testRun: { select: { id: true, name: true } },
          },
        });

        reply.send(execution);
      } catch (error) {
        console.error('Error linking defect:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get execution history for a test case
  fastify.get(
    '/api/test-cases/:caseId/execution-history',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      const { caseId } = request.params;

      try {
        const history = await prisma.testExecution.findMany({
          where: { testCaseId: Number(caseId) },
          include: {
            testRun: { select: { name: true, createdAt: true } },
            executor: { select: { name: true } },
            steps: {
              select: {
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        reply.send({ history });
      } catch (error) {
        console.error('Error fetching execution history:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Compare two executions
  fastify.get(
    '/api/test-executions/:executionId/compare/:otherExecutionId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      const { executionId, otherExecutionId } = request.params;

      try {
        const [execution, otherExecution] = await Promise.all([
          prisma.testExecution.findUnique({
            where: { id: Number(executionId) },
            include: {
              steps: {
                include: { testStep: true },
                orderBy: { id: 'asc' },
              },
              testRun: { select: { name: true, createdAt: true } },
            },
          }),
          prisma.testExecution.findUnique({
            where: { id: Number(otherExecutionId) },
            include: {
              steps: {
                include: { testStep: true },
                orderBy: { id: 'asc' },
              },
              testRun: { select: { name: true, createdAt: true } },
            },
          }),
        ]);

        if (!execution || !otherExecution) {
          return reply.code(404).send({ error: 'One or both executions not found' });
        }

        // Compare step results
        const comparison = {
          current: execution,
          previous: otherExecution,
          differences: [],
        };

        const minSteps = Math.min(execution.steps.length, otherExecution.steps.length);
        for (let i = 0; i < minSteps; i++) {
          const currStep = execution.steps[i];
          const prevStep = otherExecution.steps[i];

          if (currStep.status !== prevStep.status) {
            comparison.differences.push({
              stepNumber: i + 1,
              stepName: currStep.testStep.action,
              previousStatus: prevStep.status,
              currentStatus: currStep.status,
              previousResult: prevStep.actualResult,
              currentResult: currStep.actualResult,
            });
          }
        }

        reply.send(comparison);
      } catch (error) {
        console.error('Error comparing executions:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}

export default executionRoutes;
