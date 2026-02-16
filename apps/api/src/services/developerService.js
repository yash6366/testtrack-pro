/**
 * DEVELOPER SERVICE
 * Handles developer-specific bug management, fix documentation, and metrics
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';

const prisma = getPrismaClient();

/**
 * Get bugs assigned to developer (with filters)
 * @param {number} userId - Developer ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Bugs assigned to developer
 */
export async function getDeveloperAssignedBugs(userId, filters = {}) {
  const {
    status,
    priority,
    severity,
    search,
    skip = 0,
    take = 20,
  } = filters;

  const where = {
    assigneeId: userId,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(severity && { severity }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { bugNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [bugs, total] = await Promise.all([
    prisma.bug.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        testCase: { select: { id: true, name: true } },
        comments: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: Number(skip),
      take: Number(take),
    }),
    prisma.bug.count({ where }),
  ]);

  return {
    bugs,
    total,
    page: Math.floor(Number(skip) / Number(take)) + 1,
    pageSize: Number(take),
  };
}

/**
 * Update bug fix documentation
 * @param {number} bugId - Bug ID
 * @param {Object} fixData - Fix details
 * @param {number} userId - Developer ID
 * @returns {Promise<Object>} Updated bug
 */
export async function updateFixDocumentation(bugId, fixData, userId) {
  const {
    fixStrategy,
    rootCauseAnalysis,
    rootCauseCategory,
    fixedInCommitHash,
    fixBranchName,
    codeReviewUrl,
    actualFixHours,
    targetFixVersion,
    fixedInVersion,
  } = fixData;

  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  if (bug.assigneeId !== userId) {
    throw new Error('Only assigned developer can update fix documentation');
  }

  // Track which fields changed for audit
  const changes = {};
  if (fixStrategy && fixStrategy !== bug.fixStrategy) {
    changes.fixStrategy = fixStrategy;
  }
  if (rootCauseAnalysis && rootCauseAnalysis !== bug.rootCauseAnalysis) {
    changes.rootCauseAnalysis = rootCauseAnalysis;
  }
  if (rootCauseCategory && rootCauseCategory !== bug.rootCauseCategory) {
    changes.rootCauseCategory = rootCauseCategory;
  }
  if (fixedInCommitHash && fixedInCommitHash !== bug.fixedInCommitHash) {
    changes.fixedInCommitHash = fixedInCommitHash;
  }
  if (fixBranchName && fixBranchName !== bug.fixBranchName) {
    changes.fixBranchName = fixBranchName;
  }
  if (codeReviewUrl && codeReviewUrl !== bug.codeReviewUrl) {
    changes.codeReviewUrl = codeReviewUrl;
  }
  if (actualFixHours !== undefined && actualFixHours !== bug.actualFixHours) {
    changes.actualFixHours = actualFixHours;
  }
  if (targetFixVersion && targetFixVersion !== bug.targetFixVersion) {
    changes.targetFixVersion = targetFixVersion;
  }
  if (fixedInVersion && fixedInVersion !== bug.fixedInVersion) {
    changes.fixedInVersion = fixedInVersion;
  }

  const updated = await prisma.bug.update({
    where: { id: bugId },
    data: {
      ...(fixStrategy && { fixStrategy }),
      ...(rootCauseAnalysis && { rootCauseAnalysis }),
      ...(rootCauseCategory && { rootCauseCategory }),
      ...(fixedInCommitHash && { fixedInCommitHash }),
      ...(fixBranchName && { fixBranchName }),
      ...(codeReviewUrl && { codeReviewUrl }),
      ...(actualFixHours !== undefined && { actualFixHours }),
      ...(targetFixVersion && { targetFixVersion }),
      ...(fixedInVersion && { fixedInVersion }),
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Create history entries for each changed field
  // Note: BugHistory model not implemented yet - skipping history tracking
  // for (const [fieldName, newValue] of Object.entries(changes)) {
  //   await prisma.bugHistory.create({
  //     data: {
  //       bugId: bugId,
  //       fieldName,
  //       oldValue: String(bug[fieldName] || ''),
  //       newValue: String(newValue),
  //       changedBy: userId,
  //     },
  //   });
  // }

  // Audit log
  await logAuditAction(userId, 'BUG_FIX_DOCUMENTED', {
    resourceType: 'BUG',
    resourceId: bugId,
    resourceName: bug.bugNumber,
    projectId: bug.projectId,
    description: `Developer documented fix for bug ${bug.bugNumber}`,
    newValues: JSON.stringify(changes),
  });

  return updated;
}

/**
 * Get developer performance metrics
 * @param {number} userId - Developer ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Developer metrics
 */
export async function getDeveloperMetrics(userId, options = {}) {
  const { startDate, endDate } = options;

  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const where = {
    assigneeId: userId,
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
  };

  const [
    totalAssigned,
    resolved,
    verificationPending,
    reopened,
    resolutionTimes,
    fixQuality,
  ] = await Promise.all([
    // Total assigned bugs
    prisma.bug.count({ where }),

    // Resolved bugs (VERIFIED_FIXED or CLOSED)
    prisma.bug.count({
      where: {
        ...where,
        status: { in: ['VERIFIED_FIXED', 'CLOSED'] },
      },
    }),

    // Waiting for verification (status FIXED, waiting for tester)
    prisma.bug.count({
      where: {
        ...where,
        status: 'AWAITING_VERIFICATION',
      },
    }),

    // Reopened bugs (failed verification)
    prisma.bug.count({
      where: {
        ...where,
        status: 'REOPENED',
      },
    }),

    // Get actual resolution times for resolved bugs
    prisma.bug.findMany({
      where: {
        ...where,
        status: { in: ['VERIFIED_FIXED', 'CLOSED'] },
        closedAt: { not: null },
      },
      select: {
        createdAt: true,
        closedAt: true,
      },
    }),

    // Get info about bugs with fix documentation
    prisma.bug.findMany({
      where: {
        ...where,
        fixedInCommitHash: { not: null },
      },
      select: {
        id: true,
        status: true,
        actualFixHours: true,
      },
    }),
  ]);

  // Calculate resolution time statistics
  const resolutionTimesInHours = resolutionTimes.map(
    (r) => (r.closedAt - r.createdAt) / (1000 * 60 * 60)
  );
  const avgResolutionTime =
    resolutionTimesInHours.length > 0
      ? (resolutionTimesInHours.reduce((a, b) => a + b, 0) / resolutionTimesInHours.length).toFixed(2)
      : 0;

  const reopenRate =
    totalAssigned > 0 ? ((reopened / totalAssigned) * 100).toFixed(2) : 0;

  const resolutionRate =
    totalAssigned > 0 ? ((resolved / totalAssigned) * 100).toFixed(2) : 0;

  // Get bugs by status breakdown
  const statusBreakdown = await prisma.bug.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  });

  const statusMap = {};
  statusBreakdown.forEach((sb) => {
    statusMap[sb.status] = sb._count.id;
  });

  // Get bugs by priority
  const priorityBreakdown = await prisma.bug.groupBy({
    by: ['priority'],
    where,
    _count: { id: true },
  });

  const priorityMap = {};
  priorityBreakdown.forEach((pb) => {
    priorityMap[pb.priority] = pb._count.id;
  });

  return {
    summary: {
      totalAssigned,
      resolved,
      verificationPending,
      reopened,
      avgResolutionTimeHours: Number(avgResolutionTime),
      reopenRate: Number(reopenRate),
      resolutionRate: Number(resolutionRate),
      bugsWithFixDocumentation: fixQuality.length,
    },
    breakdown: {
      byStatus: statusMap,
      byPriority: priorityMap,
    },
    recentBugs: await prisma.bug.findMany({
      where,
      select: {
        id: true,
        bugNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  };
}

/**
 * Get bug details with related test execution
 * @param {number} bugId - Bug ID
 * @returns {Promise<Object>} Bug with test execution details
 */
export async function getBugWithTestDetails(bugId) {
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      execution: {
        include: {
          testCase: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              steps: true,
            },
          },
          steps: true,
          evidence: { where: { isDeleted: false } },
        },
      },
      testCase: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          priority: true,
          severity: true,
          steps: true,
        },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { commentedAt: 'desc' },
      },
      // history: BugHistory model not implemented
      retestRequests: true,
    },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  return bug;
}

/**
 * Get test case details (developer read-only view)
 * @param {number} testCaseId - Test case ID
 * @returns {Promise<Object>} Test case details
 */
export async function getTestCaseDetails(testCaseId) {
  return prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: {
      steps: { orderBy: { stepNumber: 'asc' } },
      creator: { select: { id: true, name: true, email: true } },
      lastModifiedByUser: { select: { id: true, name: true } },
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
}

/**
 * Request bug retest after fix (notification to tester)
 * @param {number} bugId - Bug ID
 * @param {Object} data - Request data
 * @param {number} userId - Developer ID
 * @returns {Promise<Object>} Retest request
 */
export async function requestBugRetest(bugId, data, userId) {
  const { notes } = data;

  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  if (bug.assigneeId !== userId) {
    throw new Error('Only assigned developer can request retest');
  }

  if (bug.status !== 'FIXED') {
    throw new Error('Can only request retest for FIXED bugs');
  }

  // Update bug status to AWAITING_VERIFICATION
  const updated = await prisma.bug.update({
    where: { id: bugId },
    data: {
      status: 'AWAITING_VERIFICATION',
    },
  });

  // Create retest request
  const retestRequest = await prisma.bugRetestRequest.create({
    data: {
      bugId: bugId,
      status: 'PENDING',
      reason: notes || 'Developer requested retest after fix',
    },
  });

  // Create history entry
  // Note: BugHistory model not implemented yet - skipping history tracking
  // await prisma.bugHistory.create({
  //   data: {
  //     bugId: bugId,
  //     fieldName: 'status',
  //     oldValue: 'FIXED',
  //     newValue: 'AWAITING_VERIFICATION',
  //     changedBy: userId,
  //     changeReason: 'Developer requested retest after fix',
  //   },
  // });

  // Audit log
  await logAuditAction(userId, 'BUG_RETEST_REQUESTED', {
    resourceType: 'BUG',
    resourceId: bugId,
    resourceName: bug.bugNumber,
    projectId: bug.projectId,
    description: `Developer requested retest for bug ${bug.bugNumber}`,
    newValues: JSON.stringify({ status: 'AWAITING_VERIFICATION' }),
  });

  return {
    bug: updated,
    retestRequest,
  };
}

/**
 * Get developer dashboard overview
 * @param {number} userId - Developer ID
 * @returns {Promise<Object>} Dashboard data
 */
export async function getDeveloperOverview(userId) {
  const where = { assigneeId: userId };

  const [
    totalAssigned,
    inProgress,
    fixed,
    awaitingVerification,
    reopened,
    recent,
  ] = await Promise.all([
    prisma.bug.count({ where }),

    prisma.bug.count({
      where: { ...where, status: 'IN_PROGRESS' },
    }),

    prisma.bug.count({
      where: { ...where, status: 'FIXED' },
    }),

    prisma.bug.count({
      where: { ...where, status: 'AWAITING_VERIFICATION' },
    }),

    prisma.bug.count({
      where: { ...where, status: 'REOPENED' },
    }),

    prisma.bug.findMany({
      where,
      select: {
        id: true,
        bugNumber: true,
        title: true,
        status: true,
        priority: true,
        severity: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    totalAssigned,
    summary: {
      inProgress,
      fixed,
      awaitingVerification,
      reopened,
    },
    recentBugs: recent,
  };
}

/**
 * Generate developer detailed report
 * @param {number} userId - Developer ID
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Detailed report data
 */
export async function generateDeveloperReport(userId, options = {}) {
  const { startDate, endDate, includeHistory = false } = options;

  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const where = {
    assigneeId: userId,
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
  };

  // Get developer info
  const developer = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  // Get comprehensive metrics
  const metrics = await getDeveloperMetrics(userId, { startDate, endDate });

  // Get bugs grouped by status
  const bugsByStatus = await prisma.bug.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  });

  // Get bugs grouped by priority
  const bugsByPriority = await prisma.bug.groupBy({
    by: ['priority'],
    where,
    _count: { id: true },
  });

  // Get bugs grouped by severity
  const bugsBySeverity = await prisma.bug.groupBy({
    by: ['severity'],
    where,
    _count: { id: true },
  });

  // Get top bugs (high priority/severity)
  const criticalBugs = await prisma.bug.findMany({
    where: {
      ...where,
      OR: [
        { priority: { in: ['P0', 'P1'] } },
        { severity: 'CRITICAL' },
      ],
    },
    select: {
      id: true,
      bugNumber: true,
      title: true,
      status: true,
      priority: true,
      severity: true,
      createdAt: true,
      closedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get recently closed bugs
  const recentlyResolved = await prisma.bug.findMany({
    where: {
      ...where,
      status: { in: ['VERIFIED_FIXED', 'CLOSED'] },
      closedAt: { not: null },
    },
    select: {
      id: true,
      bugNumber: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      closedAt: true,
      actualFixHours: true,
    },
    orderBy: { closedAt: 'desc' },
    take: 10,
  });

  // Get fix documentation stats
  const docsStats = await prisma.bug.findMany({
    where,
    select: {
      id: true,
      fixStrategy: true,
      rootCauseAnalysis: true,
      rootCauseCategory: true,
      fixedInCommitHash: true,
      actualFixHours: true,
    },
  });

  const documentationRate = docsStats.length > 0
    ? ((docsStats.filter((b) => b.fixStrategy || b.rootCauseAnalysis).length / docsStats.length) * 100).toFixed(2)
    : 0;

  const avgFixHours = docsStats
    .filter((b) => b.actualFixHours)
    .reduce((sum, b) => sum + b.actualFixHours, 0) / docsStats.filter((b) => b.actualFixHours).length || 0;

  // Root cause categories breakdown
  const rootCauseBreakdown = docsStats.reduce((acc, bug) => {
    if (bug.rootCauseCategory) {
      acc[bug.rootCauseCategory] = (acc[bug.rootCauseCategory] || 0) + 1;
    }
    return acc;
  }, {});

  const report = {
    developer,
    period: {
      startDate: startDate || 'All time',
      endDate: endDate || new Date().toISOString(),
    },
    metrics,
    distribution: {
      byStatus: bugsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {}),
      byPriority: bugsByPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.id;
        return acc;
      }, {}),
      bySeverity: bugsBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.id;
        return acc;
      }, {}),
    },
    fixQuality: {
      documentationRate: Number(documentationRate),
      avgFixHours: Number(avgFixHours.toFixed(2)),
      rootCauseBreakdown,
    },
    highlights: {
      criticalBugs,
      recentlyResolved,
    },
    generatedAt: new Date().toISOString(),
  };

  return report;
}

/**
 * Generate bug analytics for developer
 * @param {number} userId - Developer ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Bug analytics
 */
export async function getDeveloperBugAnalytics(userId, filters = {}) {
  const { startDate, endDate } = filters;

  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const where = {
    assigneeId: userId,
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
  };

  // Get all bugs for analysis
  const bugs = await prisma.bug.findMany({
    where,
    select: {
      id: true,
      bugNumber: true,
      title: true,
      status: true,
      priority: true,
      severity: true,
      createdAt: true,
      closedAt: true,
      actualFixHours: true,
      rootCauseCategory: true,
      environment: true,
    },
  });

  // Time-based analysis (weekly trends)
  const weeklyTrends = [];
  const weeks = 8;
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekBugs = bugs.filter(
      (b) => b.createdAt >= weekStart && b.createdAt < weekEnd
    );
    const weekResolved = bugs.filter(
      (b) => b.closedAt && b.closedAt >= weekStart && b.closedAt < weekEnd
    );

    weeklyTrends.push({
      week: weekStart.toISOString().split('T')[0],
      assigned: weekBugs.length,
      resolved: weekResolved.length,
    });
  }

  // Resolution time distribution
  const resolutionTimes = bugs
    .filter((b) => b.closedAt)
    .map((b) => ({
      bugNumber: b.bugNumber,
      hours: (b.closedAt - b.createdAt) / (1000 * 60 * 60),
    }))
    .sort((a, b) => b.hours - a.hours);

  const resolutionBuckets = {
    '<24h': 0,
    '24-48h': 0,
    '2-7d': 0,
    '1-2w': 0,
    '>2w': 0,
  };

  resolutionTimes.forEach(({ hours }) => {
    if (hours < 24) resolutionBuckets['<24h']++;
    else if (hours < 48) resolutionBuckets['24-48h']++;
    else if (hours < 168) resolutionBuckets['2-7d']++;
    else if (hours < 336) resolutionBuckets['1-2w']++;
    else resolutionBuckets['>2w']++;
  });

  // Environment analysis
  const environmentBreakdown = bugs.reduce((acc, bug) => {
    const env = bug.environment || 'Not specified';
    acc[env] = (acc[env] || 0) + 1;
    return acc;
  }, {});

  return {
    totalBugs: bugs.length,
    weeklyTrends,
    resolutionTimeAnalysis: {
      buckets: resolutionBuckets,
      slowest: resolutionTimes.slice(0, 5),
      fastest: resolutionTimes.slice(-5).reverse(),
    },
    environmentBreakdown,
  };
}

export default {
  getDeveloperAssignedBugs,
  updateFixDocumentation,
  getDeveloperMetrics,
  getBugWithTestDetails,
  getTestCaseDetails,
  requestBugRetest,
  getDeveloperOverview,
  generateDeveloperReport,
  getDeveloperBugAnalytics,
};
