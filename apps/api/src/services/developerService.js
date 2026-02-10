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
    prisma.defect.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        sourceTestCase: { select: { id: true, name: true } },
        comments: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: Number(skip),
      take: Number(take),
    }),
    prisma.defect.count({ where }),
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

  const bug = await prisma.defect.findUnique({
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

  const updated = await prisma.defect.update({
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
      updatedBy: userId,
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Create history entries for each changed field
  for (const [fieldName, newValue] of Object.entries(changes)) {
    await prisma.defectHistory.create({
      data: {
        defectId: bugId,
        fieldName,
        oldValue: String(bug[fieldName] || ''),
        newValue: String(newValue),
        changedBy: userId,
      },
    });
  }

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
    prisma.defect.count({ where }),

    // Resolved bugs (VERIFIED_FIXED or CLOSED)
    prisma.defect.count({
      where: {
        ...where,
        status: { in: ['VERIFIED_FIXED', 'CLOSED'] },
      },
    }),

    // Waiting for verification (status FIXED, waiting for tester)
    prisma.defect.count({
      where: {
        ...where,
        status: 'AWAITING_VERIFICATION',
      },
    }),

    // Reopened bugs (failed verification)
    prisma.defect.count({
      where: {
        ...where,
        status: 'REOPENED',
      },
    }),

    // Get actual resolution times for resolved bugs
    prisma.defect.findMany({
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
    prisma.defect.findMany({
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
  const statusBreakdown = await prisma.defect.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  });

  const statusMap = {};
  statusBreakdown.forEach((sb) => {
    statusMap[sb.status] = sb._count.id;
  });

  // Get bugs by priority
  const priorityBreakdown = await prisma.defect.groupBy({
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
    recentBugs: await prisma.defect.findMany({
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
  const bug = await prisma.defect.findUnique({
    where: { id: bugId },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      sourceExecution: {
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
      sourceTestCase: {
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
      history: {
        select: {
          id: true,
          fieldName: true,
          oldValue: true,
          newValue: true,
          changedBy: true,
          changedAt: true,
        },
        take: 10,
        orderBy: { changedAt: 'desc' },
      },
      retestRequests: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          requester: { select: { id: true, name: true, email: true } },
        },
      },
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

  const bug = await prisma.defect.findUnique({
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
  const updated = await prisma.defect.update({
    where: { id: bugId },
    data: {
      status: 'AWAITING_VERIFICATION',
      statusChangedAt: new Date(),
      statusChangedBy: userId,
      updatedBy: userId,
    },
  });

  // Create retest request
  const retestRequest = await prisma.defectRetestRequest.create({
    data: {
      defectId: bugId,
      status: 'PENDING',
      requestedBy: userId,
      requestedAt: new Date(),
      notes,
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
    },
  });

  // Create history entry
  await prisma.defectHistory.create({
    data: {
      defectId: bugId,
      fieldName: 'status',
      oldValue: 'FIXED',
      newValue: 'AWAITING_VERIFICATION',
      changedBy: userId,
      changeReason: 'Developer requested retest after fix',
    },
  });

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
    prisma.defect.count({ where }),

    prisma.defect.count({
      where: { ...where, status: 'IN_PROGRESS' },
    }),

    prisma.defect.count({
      where: { ...where, status: 'FIXED' },
    }),

    prisma.defect.count({
      where: { ...where, status: 'AWAITING_VERIFICATION' },
    }),

    prisma.defect.count({
      where: { ...where, status: 'REOPENED' },
    }),

    prisma.defect.findMany({
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

export default {
  getDeveloperAssignedBugs,
  updateFixDocumentation,
  getDeveloperMetrics,
  getBugWithTestDetails,
  getTestCaseDetails,
  requestBugRetest,
  getDeveloperOverview,
};
