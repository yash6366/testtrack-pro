/**
 * REPORTING SERVICE
 * Generate test execution reports, performance metrics, and exports
 */

import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

/**
 * Generate test execution summary report for a test run
 * @param {number} testRunId - Test run ID
 * @returns {Promise<Object>} Report data
 */
export async function generateExecutionReport(testRunId) {
  const testRun = await prisma.testRun.findUnique({
    where: { id: testRunId },
    include: {
      project: { select: { id: true, name: true, key: true } },
      executor: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
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
          steps: {
            select: {
              id: true,
              status: true,
              actualResult: true,
            },
          },
          evidence: {
            where: { isDeleted: false },
            select: {
              id: true,
              type: true,
              secureUrl: true,
            },
          },
        },
      },
    },
  });

  if (!testRun) {
    throw new Error('Test run not found');
  }

  // Calculate statistics
  const totalTestCases = testRun.executions.length;
  const passed = testRun.executions.filter((e) => e.status === 'PASSED').length;
  const failed = testRun.executions.filter((e) => e.status === 'FAILED').length;
  const blocked = testRun.executions.filter((e) => e.status === 'BLOCKED').length;
  const skipped = testRun.executions.filter((e) => e.status === 'SKIPPED').length;

  const passRate = totalTestCases > 0 ? ((passed / totalTestCases) * 100).toFixed(2) : 0;

  // Execution duration
  const duration = testRun.actualEndDate && testRun.actualStartDate
    ? Math.floor((testRun.actualEndDate - testRun.actualStartDate) / 1000)
    : null;

  // Group by test case type
  const byType = testRun.executions.reduce((acc, exec) => {
    const type = exec.testCase.type;
    if (!acc[type]) {
      acc[type] = { total: 0, passed: 0, failed: 0 };
    }
    acc[type].total++;
    if (exec.status === 'PASSED') acc[type].passed++;
    if (exec.status === 'FAILED') acc[type].failed++;
    return acc;
  }, {});

  // Group by priority
  const byPriority = testRun.executions.reduce((acc, exec) => {
    const priority = exec.testCase.priority;
    if (!acc[priority]) {
      acc[priority] = { total: 0, passed: 0, failed: 0 };
    }
    acc[priority].total++;
    if (exec.status === 'PASSED') acc[priority].passed++;
    if (exec.status === 'FAILED') acc[priority].failed++;
    return acc;
  }, {});

  // Failed test cases for attention
  const failedTests = testRun.executions
    .filter((e) => e.status === 'FAILED')
    .map((e) => ({
      id: e.id,
      testCaseId: e.testCase.id,
      testCaseName: e.testCase.name,
      priority: e.testCase.priority,
      severity: e.testCase.severity,
      failedSteps: e.steps.filter((s) => s.status === 'FAILED').length,
      evidenceCount: e.evidence.length,
    }));

  return {
    testRun: {
      id: testRun.id,
      name: testRun.name,
      description: testRun.description,
      environment: testRun.environment,
      buildVersion: testRun.buildVersion,
      status: testRun.status,
      startedAt: testRun.actualStartDate,
      completedAt: testRun.actualEndDate,
      durationSeconds: duration,
      executions: testRun.executions,
    },
    project: testRun.project,
    executor: testRun.executor,
    summary: {
      totalTestCases,
      passed,
      failed,
      blocked,
      skipped,
      passRate: Number(passRate),
    },
    breakdown: {
      byType,
      byPriority,
    },
    failedTests,
    generatedAt: new Date(),
  };
}

/**
 * Generate tester performance report
 * @param {number} userId - Tester ID
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Performance metrics
 */
export async function generateTesterPerformanceReport(userId, options = {}) {
  const { startDate, endDate } = options;

  const dateFilter = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  const where = {
    executedBy: userId,
    ...(Object.keys(dateFilter).length > 0 && {
      startedAt: dateFilter,
    }),
  };

  const [
    totalExecutions,
    executionsByStatus,
    avgDuration,
    testCasesCreated,
    bugsReported,
  ] = await Promise.all([
    // Total executions
    prisma.testExecution.count({ where }),

    // Executions by status
    prisma.testExecution.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),

    // Average execution duration
    prisma.testExecution.aggregate({
      where: {
        ...where,
        durationSeconds: { not: null },
      },
      _avg: { durationSeconds: true },
    }),

    // Test cases created
    prisma.testCase.count({
      where: {
        createdBy: userId,
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
    }),

    // Bugs reported
    prisma.defect.count({
      where: {
        reporterId: userId,
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
    }),
  ]);

  const statusBreakdown = executionsByStatus.reduce((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {});

  return {
    userId,
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    metrics: {
      totalExecutions,
      testCasesCreated,
      bugsReported,
      avgExecutionTimeSeconds: avgDuration._avg.durationSeconds || 0,
    },
    executionBreakdown: statusBreakdown,
    generatedAt: new Date(),
  };
}

/**
 * Export test run to CSV
 * @param {number} testRunId - Test run ID
 * @returns {Promise<string>} CSV data
 */
export async function exportTestRunToCSV(testRunId) {
  const report = await generateExecutionReport(testRunId);

  let csv = 'Test Case ID,Test Case Name,Type,Priority,Severity,Status,Passed Steps,Failed Steps,Total Steps,Evidence Count\n';

  for (const exec of report.testRun.executions || []) {
    const passedSteps = exec.steps.filter((s) => s.status === 'PASSED').length;
    const failedSteps = exec.steps.filter((s) => s.status === 'FAILED').length;
    const totalSteps = exec.steps.length;
    const evidenceCount = exec.evidence.length;

    csv += `${exec.testCase.id},"${exec.testCase.name}",${exec.testCase.type},${exec.testCase.priority},${exec.testCase.severity},${exec.status},${passedSteps},${failedSteps},${totalSteps},${evidenceCount}\n`;
  }

  return csv;
}

/**
 * Get project-wide test metrics
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Project metrics
 */
export async function getProjectTestMetrics(projectId) {
  const [
    totalTestCases,
    totalTestRuns,
    totalExecutions,
    recentTestRuns,
    testCasesByType,
    testCasesByPriority,
  ] = await Promise.all([
    prisma.testCase.count({
      where: {
        projectId,
        isDeleted: false,
      },
    }),

    prisma.testRun.count({
      where: { projectId },
    }),

    prisma.testExecution.count({
      where: {
        testRun: { projectId },
      },
    }),

    prisma.testRun.findMany({
      where: { projectId },
      include: {
        executions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    prisma.testCase.groupBy({
      by: ['type'],
      where: {
        projectId,
        isDeleted: false,
      },
      _count: { type: true },
    }),

    prisma.testCase.groupBy({
      by: ['priority'],
      where: {
        projectId,
        isDeleted: false,
      },
      _count: { priority: true },
    }),
  ]);

  return {
    projectId,
    summary: {
      totalTestCases,
      totalTestRuns,
      totalExecutions,
    },
    testCaseDistribution: {
      byType: testCasesByType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {}),
      byPriority: testCasesByPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.priority;
        return acc;
      }, {}),
    },
    recentTestRuns: recentTestRuns.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      totalExecutions: run.executions.length,
      passed: run.executions.filter((e) => e.status === 'PASSED').length,
      failed: run.executions.filter((e) => e.status === 'FAILED').length,
    })),
    generatedAt: new Date(),
  };
}

export default {
  generateExecutionReport,
  generateTesterPerformanceReport,
  exportTestRunToCSV,
  getProjectTestMetrics,
};
