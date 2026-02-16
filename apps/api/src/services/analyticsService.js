/**
 * ANALYTICS SERVICE
 * Comprehensive analytics, trend analysis, and metrics aggregation
 */

import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

// ============================================
// EXECUTION ANALYTICS
// ============================================

/**
 * Get execution trend report showing pass/fail trends over time
 * @param {number} projectId - Project ID to analyze
 * @param {number} [weeks=8] - Number of weeks to include in report
 * @returns {Promise<Object>} Weekly execution trends with pass rates and summary
 */
export async function getExecutionTrendReport(projectId, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const weekData = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [totalExec, passedExec, failedExec, blockedExec] = await Promise.all([
      prisma.testExecution.count({
        where: {
          testRun: { projectId },
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.testExecution.count({
        where: {
          testRun: { projectId },
          status: 'PASSED',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.testExecution.count({
        where: {
          testRun: { projectId },
          status: 'FAILED',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.testExecution.count({
        where: {
          testRun: { projectId },
          status: 'BLOCKED',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
    ]);

    const passRate = totalExec > 0 ? ((passedExec / totalExec) * 100).toFixed(1) : 0;

    weekData.push({
      week: weekStart.toISOString().split('T')[0],
      total: totalExec,
      passed: passedExec,
      failed: failedExec,
      blocked: blockedExec,
      passRate: Number(passRate),
    });
  }

  return {
    projectId,
    timeframe: `${weeks} weeks`,
    data: weekData,
    summary: {
      avgPassRate: (weekData.reduce((sum, w) => sum + w.passRate, 0) / weekData.length).toFixed(1),
      trend: weekData[weekData.length - 1].passRate > weekData[0].passRate ? 'improving' : 'declining',
    },
  };
}

/**
 * Get flaky tests with inconsistent pass/fail results
 * @param {number} projectId - Project ID to analyze
 * @param {number} [runsThreshold=5] - Minimum number of runs to consider
 * @returns {Promise<Array>} List of flaky tests sorted by flake rate
 */
export async function getFlakyTests(projectId, runsThreshold = 5) {
  const testCases = await prisma.testCase.findMany({
    where: { projectId, isDeleted: false },
    select: { id: true, name: true },
  });

  const flakyTests = [];

  for (const testCase of testCases) {
    const executions = await prisma.testExecution.findMany({
      where: { testCaseId: testCase.id },
      select: { status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: runsThreshold,
    });

    if (executions.length < runsThreshold) continue;

    const statuses = executions.map((e) => e.status);
    const passed = statuses.filter((s) => s === 'PASSED').length;
    const failed = statuses.filter((s) => s === 'FAILED').length;

    if (passed > 0 && failed > 0) {
      const flakeRate = ((failed / runsThreshold) * 100).toFixed(1);
      flakyTests.push({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        flakeRate: Number(flakeRate),
        recentRuns: runsThreshold,
        passedRuns: passed,
        failedRuns: failed,
      });
    }
  }

  return flakyTests.sort((a, b) => b.flakeRate - a.flakeRate);
}

/**
 * Get execution speed analysis with statistics
 * @param {number} projectId - Project ID to analyze
 * @param {number} [days=30] - Number of days to include in analysis
 * @returns {Promise<Object>} Execution duration statistics by type and percentiles
 */
export async function getExecutionSpeedAnalysis(projectId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const executions = await prisma.testExecution.findMany({
    where: {
      testRun: { projectId },
      createdAt: { gte: startDate },
      durationSeconds: { not: null },
    },
    select: {
      durationSeconds: true,
      status: true,
      testCase: { select: { type: true } },
    },
    orderBy: { durationSeconds: 'asc' },
  });

  if (executions.length === 0) {
    return { projectId, noData: true };
  }

  const durations = executions.map((e) => e.durationSeconds).sort((a, b) => a - b);
  const passed = executions.filter((e) => e.status === 'PASSED').map((e) => e.durationSeconds);
  const failed = executions.filter((e) => e.status === 'FAILED').map((e) => e.durationSeconds);

  const percentile = (arr, p) => {
    if (!arr || arr.length === 0) return 0;
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  };

  return {
    projectId,
    days,
    total: {
      count: executions.length,
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: durations[0],
      max: durations[durations.length - 1],
    },
    byStatus: {
      passed: {
        count: passed.length,
        avg: passed.length > 0 ? Math.round(passed.reduce((a, b) => a + b, 0) / passed.length) : 0,
        p95: percentile(passed, 95),
      },
      failed: {
        count: failed.length,
        avg: failed.length > 0 ? Math.round(failed.reduce((a, b) => a + b, 0) / failed.length) : 0,
        p95: percentile(failed, 95),
      },
    },
  };
}

// ============================================
// BUG ANALYTICS
// ============================================

/**
 * Get bug trend analysis
 */
export async function getBugTrendAnalysis(projectId, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const weekData = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [created, resolved, reopened, closed] = await Promise.all([
      prisma.bug.count({
        where: {
          projectId,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.bug.count({
        where: {
          projectId,
          status: 'VERIFIED_FIXED',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.bug.count({
        where: {
          projectId,
          status: 'REOPENED',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.bug.count({
        where: {
          projectId,
          status: 'CLOSED',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
    ]);

    weekData.push({
      week: weekStart.toISOString().split('T')[0],
      created,
      resolved: resolved + closed,
      reopened,
      velocity: created - (resolved + closed),
    });
  }

  return {
    projectId,
    weeks,
    data: weekData,
    currentVelocity: weekData[weekData.length - 1]?.velocity || 0,
  };
}

/**
 * Get reopened bugs analysis
 */
export async function getReopenedBugsAnalysis(projectId, weeks = 4) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const [totalBugs, reopenedBugs, assignments] = await Promise.all([
    prisma.bug.count({
      where: {
        projectId,
        createdAt: { gte: startDate },
        status: { in: ['VERIFIED_FIXED', 'REOPENED'] },
      },
    }),

    prisma.bug.count({
      where: {
        projectId,
        status: 'REOPENED',
        createdAt: { gte: startDate },
      },
    }),

    prisma.bug.groupBy({
      by: ['assigneeId'],
      where: {
        projectId,
        createdAt: { gte: startDate },
        status: 'REOPENED',
      },
      _count: { id: true },
    }),
  ]);

  const reopenRate = totalBugs > 0 ? ((reopenedBugs / totalBugs) * 100).toFixed(2) : 0;

  const assignmentDetails = [];
  for (const assignment of assignments) {
    if (assignment.assigneeId) {
      const user = await prisma.user.findUnique({
        where: { id: assignment.assigneeId },
        select: { name: true },
      });
      assignmentDetails.push({
        assigneeId: assignment.assigneeId,
        assigneeName: user?.name,
        reopenedCount: assignment._count.id,
      });
    }
  }

  return {
    projectId,
    weeks,
    totalBugs,
    reopenedCount: reopenedBugs,
    reopenRate: Number(reopenRate),
    byAssignee: assignmentDetails.sort((a, b) => b.reopenedCount - a.reopenedCount),
  };
}

/**
 * Get bug age report (SLA tracking)
 */
export async function getBugAgeReport(projectId) {
  const openBugs = await prisma.bug.findMany({
    where: {
      projectId,
      status: { notIn: ['CLOSED', 'VERIFIED_FIXED'] },
    },
    select: {
      id: true,
      title: true,
      priority: true,
      severity: true,
      createdAt: true,
      assigneeId: true,
    },
  });

  if (openBugs.length === 0) {
    return { projectId, openBugs: 0 };
  }

  const now = new Date();
  const bugsWithAge = openBugs.map((bug) => ({
    ...bug,
    ageDays: Math.floor((now - bug.createdAt) / (1000 * 60 * 60 * 24)),
  }));

  const ages = bugsWithAge.map((b) => b.ageDays).sort((a, b) => a - b);
  const percentile = (arr, p) => {
    if (!arr || arr.length === 0) return 0;
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  };

  const slaBreaches = bugsWithAge.filter(
    (b) => b.priority === 'P0' && b.ageDays > 5
  ).length;

  return {
    projectId,
    totalOpen: bugsWithAge.length,
    ageDays: {
      p50: percentile(ages, 50),
      p95: percentile(ages, 95),
      avg: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
      max: ages.length > 0 ? ages[ages.length - 1] : 0,
    },
    slaBreaches,
    oldestBug: bugsWithAge[bugsWithAge.length - 1],
    byPriority: {
      p0: bugsWithAge.filter((b) => b.priority === 'P0').length,
      p1: bugsWithAge.filter((b) => b.priority === 'P1').length,
      p2: bugsWithAge.filter((b) => b.priority === 'P2').length,
      p3: bugsWithAge.filter((b) => b.priority === 'P3').length,
    },
  };
}

/**
 * Get defect density
 */
export async function getDefectDensity(projectId) {
  const [totalTestCases, totalBugs, bugsByModule] = await Promise.all([
    prisma.testCase.count({ where: { projectId, isDeleted: false } }),
    prisma.bug.count({ where: { projectId } }),
    prisma.bug.groupBy({
      by: ['sourceTestCaseId'],
      where: { projectId },
      _count: { id: true },
    }),
  ]);

  const defectDensity = totalTestCases > 0 ? (totalBugs / totalTestCases).toFixed(2) : 0;

  const moduleMetrics = {};
  for (const bugGroup of bugsByModule) {
    if (bugGroup.sourceTestCaseId) {
      const testCase = await prisma.testCase.findUnique({
        where: { id: bugGroup.sourceTestCaseId },
        select: { moduleArea: true },
      });
      const module = testCase?.moduleArea || 'Unknown';
      moduleMetrics[module] = (moduleMetrics[module] || 0) + bugGroup._count.id;
    }
  }

  return {
    projectId,
    totalTestCases,
    totalBugs,
    overallDensity: Number(defectDensity),
    byModule: Object.entries(moduleMetrics)
      .map(([module, count]) => ({
        module,
        bugCount: count,
        density: (count / totalTestCases).toFixed(3),
      }))
      .sort((a, b) => b.bugCount - a.bugCount),
  };
}

// ============================================
// TESTER PERFORMANCE ANALYTICS
// ============================================

/**
 * Get tester efficiency metrics
 */
export async function getTesterEfficiency(userId, weeks = 4) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const [executions, totalDuration, bugsReported] = await Promise.all([
    prisma.testExecution.count({
      where: {
        executedBy: userId,
        createdAt: { gte: startDate },
      },
    }),
    prisma.testExecution.aggregate({
      where: {
        executedBy: userId,
        createdAt: { gte: startDate },
        durationSeconds: { not: null },
      },
      _sum: { durationSeconds: true },
    }),
    prisma.bug.count({
      where: {
        reporterId: userId,
        createdAt: { gte: startDate },
      },
    }),
  ]);

  const totalMinutes = (totalDuration._sum.durationSeconds || 0) / 60;
  const avgMinutesPerTest = executions > 0 ? (totalMinutes / executions).toFixed(2) : 0;

  return {
    userId,
    weeks,
    totalExecutions: executions,
    totalMinutes: Math.round(totalMinutes),
    avgMinutesPerTest: Number(avgMinutesPerTest),
    testsPerDay: (executions / (weeks * 7)).toFixed(1),
    bugsReported,
    bugDetectionRate: executions > 0 ? ((bugsReported / executions) * 100).toFixed(2) : 0,
  };
}

/**
 * Get tester team comparison
 */
export async function getTesterTeamComparison(projectId, weeks = 4) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const testers = await prisma.testExecution.groupBy({
    by: ['executedBy'],
    where: {
      testRun: { projectId },
      createdAt: { gte: startDate },
    },
    _count: { id: true },
  });

  const metrics = [];

  for (const tester of testers) {
    const [user, totalExec, avgDuration, bugsReported, passed] = await Promise.all([
      prisma.user.findUnique({ where: { id: tester.executedBy }, select: { name: true } }),
      prisma.testExecution.count({
        where: { executedBy: tester.executedBy, createdAt: { gte: startDate } },
      }),
      prisma.testExecution.aggregate({
        where: {
          executedBy: tester.executedBy,
          createdAt: { gte: startDate },
          durationSeconds: { not: null },
        },
        _avg: { durationSeconds: true },
      }),
      prisma.bug.count({
        where: { reporterId: tester.executedBy, createdAt: { gte: startDate } },
      }),
      prisma.testExecution.count({
        where: {
          executedBy: tester.executedBy,
          status: 'PASSED',
          createdAt: { gte: startDate },
        },
      }),
    ]);

    const passRate = totalExec > 0 ? ((passed / totalExec) * 100).toFixed(1) : 0;
    const avgMinutes = (avgDuration._avg.durationSeconds || 0) / 60;

    metrics.push({
      userId: tester.executedBy,
      testerName: user?.name || 'Unknown',
      totalExecutions: totalExec,
      avgDurationMinutes: Number(avgMinutes.toFixed(2)),
      passRate: Number(passRate),
      bugsReported,
      bugDetectionRate: totalExec > 0 ? ((bugsReported / totalExec) * 100).toFixed(2) : 0,
    });
  }

  return metrics.sort((a, b) => b.totalExecutions - a.totalExecutions);
}

// ============================================
// DEVELOPER PERFORMANCE ANALYTICS
// ============================================

/**
 * Get developer fix quality metrics
 */
export async function getDeveloperFixQuality(userId, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const [assigned, resolved, reopened] = await Promise.all([
    prisma.bug.count({
      where: {
        assigneeId: userId,
        createdAt: { gte: startDate },
      },
    }),
    prisma.bug.count({
      where: {
        assigneeId: userId,
        status: { in: ['VERIFIED_FIXED', 'CLOSED'] },
        createdAt: { gte: startDate },
      },
    }),
    prisma.bug.count({
      where: {
        assigneeId: userId,
        status: 'REOPENED',
        createdAt: { gte: startDate },
      },
    }),
  ]);

  const resolutionRate = assigned > 0 ? ((resolved / assigned) * 100).toFixed(1) : 0;
  const reopenRate = resolved > 0 ? ((reopened / resolved) * 100).toFixed(1) : 0;
  const firstTimeFixRate = resolved > 0 ? (((resolved - reopened) / resolved) * 100).toFixed(1) : 0;
  const qualityScore = Math.max(0, 100 - (Number(reopenRate) * 2));

  return {
    userId,
    weeks,
    bugsAssigned: assigned,
    bugsResolved: resolved,
    bugsReopened: reopened,
    resolutionRate: Number(resolutionRate),
    reopenRate: Number(reopenRate),
    firstTimeFixRate: Number(firstTimeFixRate),
    qualityScore: qualityScore.toFixed(1),
  };
}

/**
 * Get developer resolution time analysis
 */
export async function getDeveloperResolutionTime(userId, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const resolvedBugs = await prisma.bug.findMany({
    where: {
      assigneeId: userId,
      createdAt: { gte: startDate },
      status: { in: ['VERIFIED_FIXED', 'CLOSED'] },
    },
    select: {
      createdAt: true,
      closedAt: true,
      priority: true,
    },
  });

  if (resolvedBugs.length === 0) {
    return { userId, noData: true };
  }

  const resolutionTimes = resolvedBugs.map((bug) => ({
    minutes: Math.floor((bug.closedAt - bug.createdAt) / (1000 * 60)),
    priority: bug.priority,
  }));

  const timesInMinutes = resolutionTimes.map((r) => r.minutes).sort((a, b) => a - b);
  const percentile = (arr, p) => {
    if (!arr || arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)] ?? 0;
  };

  const getHours = (minutes) => minutes > 0 ? (minutes / 60).toFixed(1) : 0;

  return {
    userId,
    weeks,
    totalResolved: resolutionTimes.length,
    resolution: {
      avgHours: getHours(timesInMinutes.reduce((a, b) => a + b, 0) / timesInMinutes.length),
      p50Hours: getHours(percentile(timesInMinutes, 50)),
      p95Hours: getHours(percentile(timesInMinutes, 95)),
      minHours: getHours(timesInMinutes[0]),
      maxHours: getHours(timesInMinutes[timesInMinutes.length - 1]),
    },
  };
}

export default {
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
};
