/**
 * TEST SUITE EXECUTION SERVICE
 * Handles execution of test suites, including nested suites and metrics
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import { createNotification } from './notificationService.js';
import { indexTestExecution } from './searchIndexService.js';
import { getTestCasesInSuite, getChildSuites } from './testSuiteService.js';

const prisma = getPrismaClient();

/**
 * Execute a test suite
 * @param {number} suiteId - Suite ID to execute
 * @param {Object} options - Execution options
 * @param {number} userId - User executing the suite
 * @returns {Promise<Object>} Suite run details
 */
export async function executeSuite(suiteId, options, userId) {
  const {
    name,
    description,
    environment,
    buildVersion,
    stopOnFailure = false,
    executeChildSuites = true,
  } = options;

  // Validate suite exists
  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
    include: {
      project: true,
    },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  if (suite.isArchived) {
    throw new Error('Cannot execute archived suite');
  }

  // Get test cases for the suite
  const testCases = await getTestCasesInSuite(suiteId);

  if (testCases.length === 0) {
    throw new Error('Suite has no test cases to execute');
  }

  // Create a TestRun for this suite execution
  const testRun = await prisma.testRun.create({
    data: {
      projectId: suite.projectId,
      name: name || `Suite Run: ${suite.name}`,
      description:
        description || `Execution of suite "${suite.name}" at ${new Date().toISOString()}`,
      status: 'IN_PROGRESS',
      actualStartDate: new Date(),
      totalTestCases: testCases.length,
      executedBy: userId,
      createdBy: userId,
      environment,
      buildVersion,
    },
  });

  // Create TestSuiteRun record
  const suiteRun = await prisma.testSuiteRun.create({
    data: {
      suiteId: suite.id,
      testRunId: testRun.id,
      name: name || `Execution of ${suite.name}`,
      description,
      status: 'IN_PROGRESS',
      actualStartDate: new Date(),
      totalTestCases: testCases.length,
      environment,
      buildVersion,
      stopOnFailure,
      executeChildSuites,
      executedBy: userId,
    },
  });

  const testCaseIds = [...new Set(testCases.map((tc) => tc.testCase?.id || tc.id))];

  // Create TestExecution records for each test case
  const executions = await Promise.all(
    testCases.map((tc) =>
      prisma.testExecution.create({
        data: {
          testRunId: testRun.id,
          testCaseId: tc.testCase?.id || tc.id,
          suiteRunId: suiteRun.id,
          status: 'BLOCKED',
          executedBy: userId,
        },
        select: {
          id: true,
          testCaseId: true,
        },
      })
    )
  );

  // Seed execution steps from test case steps
  const testSteps = await prisma.testStep.findMany({
    where: {
      testCaseId: { in: testCaseIds },
    },
    select: {
      id: true,
      testCaseId: true,
    },
    orderBy: {
      stepNumber: 'asc',
    },
  });

  const stepsByCaseId = new Map();
  for (const step of testSteps) {
    if (!stepsByCaseId.has(step.testCaseId)) {
      stepsByCaseId.set(step.testCaseId, []);
    }
    stepsByCaseId.get(step.testCaseId).push(step);
  }

  const executionSteps = [];
  for (const execution of executions) {
    const steps = stepsByCaseId.get(execution.testCaseId) || [];
    for (const step of steps) {
      executionSteps.push({
        executionId: execution.id,
        stepId: step.id,
        status: 'SKIPPED',
      });
    }
  }

  if (executionSteps.length > 0) {
    await prisma.testExecutionStep.createMany({
      data: executionSteps,
    });
  }

  // If executeChildSuites, recursively execute child suites
  if (executeChildSuites) {
    const childSuites = await getChildSuites(suiteId, false);

    for (const childSuite of childSuites) {
      await executeSuite(
        childSuite.id,
        {
          ...options,
          name: `${name || suite.name} > ${childSuite.name}`,
        },
        userId
      );
    }
  }

  // Log audit
  await logAuditAction({
    action: 'TESTSUITE_EXECUTED',
    performedBy: userId,
    resourceType: 'TESTSUITE',
    resourceId: suite.id,
    resourceName: suite.name,
    projectId: suite.projectId,
    description: `Executed test suite "${suite.name}" (${testCases.length} test cases)`,
  });

  return await getSuiteRunById(suiteRun.id);
}

/**
 * Get suite run by ID
 * @param {number} suiteRunId - Suite run ID
 * @returns {Promise<Object>} Suite run details
 */
export async function getSuiteRunById(suiteRunId) {
  const suiteRun = await prisma.testSuiteRun.findUnique({
    where: { id: Number(suiteRunId) },
    include: {
      suite: {
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
        },
      },
      executor: {
        select: { id: true, name: true, email: true },
      },
      testRun: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
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
        },
        orderBy: {
          startedAt: 'asc',
        },
      },
    },
  });

  if (!suiteRun) {
    throw new Error('Suite run not found');
  }

  return suiteRun;
}

/**
 * Get suite execution history
 * @param {number} suiteId - Suite ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Suite execution history
 */
export async function getSuiteExecutionHistory(suiteId, options = {}) {
  const { limit = 10, offset = 0, status } = options;

  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  const suiteRuns = await prisma.testSuiteRun.findMany({
    where: {
      suiteId: Number(suiteId),
      ...(status && { status }),
    },
    include: {
      executor: {
        select: { id: true, name: true, email: true },
      },
      testRun: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      _count: {
        select: {
          executions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return suiteRuns;
}

/**
 * Update suite run metrics after test execution
 * @param {number} suiteRunId - Suite run ID
 * @returns {Promise<Object>} Updated suite run
 */
export async function updateSuiteRunMetrics(suiteRunId) {
  const suiteRun = await prisma.testSuiteRun.findUnique({
    where: { id: Number(suiteRunId) },
    include: {
      executions: {
        select: { status: true },
      },
    },
  });

  if (!suiteRun) {
    throw new Error('Suite run not found');
  }

  // Calculate metrics
  const executedCount = suiteRun.executions.length;
  const passedCount = suiteRun.executions.filter((e) => e.status === 'PASSED').length;
  const failedCount = suiteRun.executions.filter((e) => e.status === 'FAILED').length;
  const blockedCount = suiteRun.executions.filter((e) => e.status === 'BLOCKED').length;
  const skippedCount = suiteRun.executions.filter((e) => e.status === 'SKIPPED').length;

  // Determine overall status
  let status = 'IN_PROGRESS';
  if (executedCount === suiteRun.totalTestCases) {
    if (failedCount > 0 || blockedCount > 0) {
      status = 'FAILED';
    } else if (passedCount === suiteRun.totalTestCases) {
      status = 'PASSED';
    } else {
      status = 'COMPLETED';
    }
  }

  // Update suite run
  const updated = await prisma.testSuiteRun.update({
    where: { id: Number(suiteRunId) },
    data: {
      executedCount,
      passedCount,
      failedCount,
      blockedCount,
      skippedCount,
      status,
      ...(status !== 'IN_PROGRESS' && { actualEndDate: new Date() }),
    },
  });

  // Also update the associated TestRun
  if (suiteRun.testRunId) {
    await prisma.testRun.update({
      where: { id: suiteRun.testRunId },
      data: {
        passedCount,
        failedCount,
        blockedCount,
        skippedCount,
        status,
        ...(status !== 'IN_PROGRESS' && { actualEndDate: new Date() }),
      },
    });
  }

  // Trigger notification if tests failed or were blocked
  if (failedCount > 0 || blockedCount > 0) {
    try {
      const suite = await prisma.testSuite.findUnique({
        where: { id: suiteRun.suiteId },
        include: {
          project: { select: { id: true, name: true } },
        },
      });

      // Get project members to notify
      const projectMembers = await prisma.user.findMany({
        where: {
          projectMemberships: {
            some: { projectId: suite.projectId },
          },
        },
        select: { id: true },
      });

      for (const member of projectMembers) {
        await createNotification(member.id, {
          title: `Test Execution Failed: ${suite.name}`,
          message: `${failedCount} failed, ${blockedCount} blocked out of ${executedCount} tests`,
          type: failedCount > 0 ? 'TEST_EXECUTION_FAILED' : 'TEST_EXECUTION_BLOCKED',
          sourceType: 'EXECUTION',
          sourceId: suiteRun.id,
          actionUrl: `/suite-runs/${suiteRun.id}`,
          actionType: 'REVIEW',
          metadata: { suiteRunId: suiteRun.id, failedCount, blockedCount },
        });
      }
    } catch (error) {
      console.error('Error triggering test failure notification:', error);
    }
  }

  // Index executions for search
  try {
    for (const execution of suiteRun.executions) {
      await indexTestExecution(execution.id, suite.projectId);
    }
  } catch (error) {
    console.error('Error indexing test executions:', error);
  }

  return updated;
}

/**
 * Get suite execution report
 * @param {number} suiteRunId - Suite run ID
 * @returns {Promise<Object>} Execution report
 */
export async function getSuiteExecutionReport(suiteRunId) {
  const suiteRun = await prisma.testSuiteRun.findUnique({
    where: { id: Number(suiteRunId) },
    include: {
      suite: {
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
        },
      },
      executor: {
        select: { id: true, name: true, email: true },
      },
      executions: {
        include: {
          testCase: {
            select: {
              id: true,
              name: true,
              type: true,
              priority: true,
              severity: true,
            },
          },
          defects: {
            select: {
              id: true,
              bugNumber: true,
              title: true,
              severity: true,
              status: true,
            },
          },
        },
        orderBy: {
          startedAt: 'asc',
        },
      },
    },
  });

  if (!suiteRun) {
    throw new Error('Suite run not found');
  }

  // Calculate duration
  const duration = suiteRun.actualEndDate && suiteRun.actualStartDate
    ? Math.floor(
        (suiteRun.actualEndDate.getTime() - suiteRun.actualStartDate.getTime()) / 1000
      )
    : null;

  // Calculate pass rate
  const passRate =
    suiteRun.totalTestCases > 0
      ? ((suiteRun.passedCount / suiteRun.totalTestCases) * 100).toFixed(2)
      : 0;

  // Group executions by status
  const executionsByStatus = {
    PASSED: suiteRun.executions.filter((e) => e.status === 'PASSED'),
    FAILED: suiteRun.executions.filter((e) => e.status === 'FAILED'),
    BLOCKED: suiteRun.executions.filter((e) => e.status === 'BLOCKED'),
    SKIPPED: suiteRun.executions.filter((e) => e.status === 'SKIPPED'),
    INCONCLUSIVE: suiteRun.executions.filter((e) => e.status === 'INCONCLUSIVE'),
  };

  // Get defects found during this suite run
  const defects = suiteRun.executions
    .flatMap((e) => e.defects)
    .filter((d, index, self) => self.findIndex((x) => x.id === d.id) === index);

  return {
    ...suiteRun,
    duration,
    passRate,
    executionsByStatus,
    defects,
    summary: {
      total: suiteRun.totalTestCases,
      executed: suiteRun.executedCount,
      passed: suiteRun.passedCount,
      failed: suiteRun.failedCount,
      blocked: suiteRun.blockedCount,
      skipped: suiteRun.skippedCount,
      passRate,
      defectCount: defects.length,
    },
  };
}

/**
 * Get suite execution trends (historical analysis)
 * @param {number} suiteId - Suite ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Trend analysis data
 */
export async function getSuiteExecutionTrends(suiteId, options = {}) {
  const { limit = 10 } = options;

  const suite = await prisma.testSuite.findUnique({
    where: { id: Number(suiteId) },
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  // Get recent suite runs
  const suiteRuns = await prisma.testSuiteRun.findMany({
    where: {
      suiteId: Number(suiteId),
      status: { in: ['PASSED', 'FAILED', 'COMPLETED'] },
    },
    select: {
      id: true,
      createdAt: true,
      totalTestCases: true,
      passedCount: true,
      failedCount: true,
      blockedCount: true,
      skippedCount: true,
      actualStartDate: true,
      actualEndDate: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  // Calculate trends
  const trends = suiteRuns.map((run) => {
    const passRate =
      run.totalTestCases > 0
        ? ((run.passedCount / run.totalTestCases) * 100).toFixed(2)
        : 0;

    const duration =
      run.actualEndDate && run.actualStartDate
        ? Math.floor(
            (run.actualEndDate.getTime() - run.actualStartDate.getTime()) / 1000
          )
        : null;

    return {
      runId: run.id,
      date: run.createdAt,
      total: run.totalTestCases,
      passed: run.passedCount,
      failed: run.failedCount,
      blocked: run.blockedCount,
      skipped: run.skippedCount,
      passRate: parseFloat(passRate),
      duration,
    };
  });

  // Calculate averages
  const avgPassRate =
    trends.length > 0
      ? (trends.reduce((sum, t) => sum + t.passRate, 0) / trends.length).toFixed(2)
      : 0;

  const avgDuration =
    trends.filter((t) => t.duration).length > 0
      ? Math.floor(
          trends
            .filter((t) => t.duration)
            .reduce((sum, t) => sum + t.duration, 0) /
            trends.filter((t) => t.duration).length
        )
      : null;

  return {
    suiteId,
    suiteName: suite.name,
    trends: trends.reverse(), // Chronological order
    averages: {
      passRate: parseFloat(avgPassRate),
      duration: avgDuration,
    },
    totalRuns: trends.length,
  };
}

/**
 * Compare two suite executions
 * @param {number} suiteRunId1 - First suite run ID
 * @param {number} suiteRunId2 - Second suite run ID
 * @returns {Promise<Object>} Comparison data
 */
export async function compareSuiteExecutions(suiteRunId1, suiteRunId2) {
  const [run1, run2] = await Promise.all([
    getSuiteExecutionReport(suiteRunId1),
    getSuiteExecutionReport(suiteRunId2),
  ]);

  if (run1.suiteId !== run2.suiteId) {
    throw new Error('Cannot compare executions from different suites');
  }

  // Calculate differences
  const passRateDiff = run2.summary.passRate - run1.summary.passRate;
  const durationDiff = run2.duration && run1.duration ? run2.duration - run1.duration : null;

  // Find new failures
  const run1FailedIds = new Set(
    run1.executionsByStatus.FAILED.map((e) => e.testCaseId)
  );
  const run2FailedIds = new Set(
    run2.executionsByStatus.FAILED.map((e) => e.testCaseId)
  );

  const newFailures = run2.executionsByStatus.FAILED.filter(
    (e) => !run1FailedIds.has(e.testCaseId)
  );

  const fixedTests = run1.executionsByStatus.FAILED.filter(
    (e) => !run2FailedIds.has(e.testCaseId)
  );

  return {
    suite: run1.suite,
    run1: {
      id: run1.id,
      date: run1.createdAt,
      summary: run1.summary,
    },
    run2: {
      id: run2.id,
      date: run2.createdAt,
      summary: run2.summary,
    },
    comparison: {
      passRateDiff: parseFloat(passRateDiff.toFixed(2)),
      durationDiff,
      newFailures: newFailures.map((e) => ({
        testCaseId: e.testCaseId,
        testCaseName: e.testCase.name,
      })),
      fixedTests: fixedTests.map((e) => ({
        testCaseId: e.testCaseId,
        testCaseName: e.testCase.name,
      })),
    },
  };
}

/**
 * Get suite runs for a project
 * @param {number} projectId - Project ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Suite runs
 */
export async function getProjectSuiteRuns(projectId, options = {}) {
  const { limit = 20, offset = 0, status, suiteId } = options;

  const suiteRuns = await prisma.testSuiteRun.findMany({
    where: {
      suite: {
        projectId: Number(projectId),
      },
      ...(status && { status }),
      ...(suiteId && { suiteId: Number(suiteId) }),
    },
    include: {
      suite: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      executor: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          executions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return suiteRuns;
}

/**
 * Cancel suite run
 * @param {number} suiteRunId - Suite run ID
 * @param {number} userId - User cancelling the run
 * @returns {Promise<Object>} Cancelled suite run
 */
export async function cancelSuiteRun(suiteRunId, userId) {
  const suiteRun = await prisma.testSuiteRun.findUnique({
    where: { id: Number(suiteRunId) },
  });

  if (!suiteRun) {
    throw new Error('Suite run not found');
  }

  if (suiteRun.status !== 'IN_PROGRESS' && suiteRun.status !== 'PLANNED') {
    throw new Error('Can only cancel in-progress or planned suite runs');
  }

  const cancelled = await prisma.testSuiteRun.update({
    where: { id: Number(suiteRunId) },
    data: {
      status: 'CANCELLED',
      actualEndDate: new Date(),
    },
  });

  // Update associated test run
  if (suiteRun.testRunId) {
    await prisma.testRun.update({
      where: { id: suiteRun.testRunId },
      data: {
        status: 'CANCELLED',
        actualEndDate: new Date(),
      },
    });
  }

  return cancelled;
}
