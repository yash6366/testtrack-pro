/**
 * MILESTONE MANAGEMENT SERVICE
 * Handles CRUD operations, progress tracking, and milestone assignments for test cases and bugs
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import { indexTestCase } from './searchIndexService.js';

const prisma = getPrismaClient();

/**
 * Create a new milestone
 * @param {Object} data - Milestone data
 * @param {number} userId - Creator user ID
 * @returns {Promise<Object>} Created milestone with calculated progress
 */
export async function createMilestone(data, userId) {
  const {
    projectId,
    name,
    description,
    targetStartDate,
    targetEndDate,
    priority = 'MEDIUM',
    notes,
  } = data;

  // Validate required fields
  if (!projectId || !name) {
    throw new Error('ProjectId and name are required');
  }

  // Check if milestone with same name exists in project
  const existing = await prisma.milestone.findFirst({
    where: {
      projectId: Number(projectId),
      name,
    },
  });

  if (existing) {
    throw new Error('Milestone with this name already exists in project');
  }

  // Validate dates
  if (targetStartDate && targetEndDate && new Date(targetStartDate) > new Date(targetEndDate)) {
    throw new Error('Start date must be before end date');
  }

  const milestone = await prisma.milestone.create({
    data: {
      projectId: Number(projectId),
      name,
      description: description || null,
      targetStartDate: targetStartDate ? new Date(targetStartDate) : null,
      targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
      priority,
      notes: notes || null,
      createdBy: userId,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      testCases: {
        select: { id: true, name: true, status: true },
      },
      defects: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  // Audit log
  await logAuditAction(userId, 'MILESTONE_CREATED', {
    resourceType: 'MILESTONE',
    resourceId: milestone.id,
    resourceName: milestone.name,
    projectId: milestone.projectId,
    description: `Milestone "${name}" created`,
  });

  // Calculate and add progress
  const milestoneWithProgress = await calculateMilestoneProgress(milestone.id);
  return milestoneWithProgress;
}

/**
 * Get all milestones for a project with filters
 * @param {number} projectId - Project ID
 * @param {Object} filters - Filter options (status, priority, search, etc.)
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Array>} List of milestones with progress and counts
 */
export async function getProjectMilestones(projectId, filters = {}, pagination = {}) {
  const {
    status,
    priority,
    search,
    sortBy = 'targetEndDate',
    sortOrder = 'asc',
  } = filters;

  const {
    skip = 0,
    take = 20,
  } = pagination;

  const whereClause = {
    projectId: Number(projectId),
  };

  if (status) {
    whereClause.status = status;
  }

  if (priority) {
    whereClause.priority = priority;
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [milestones, total] = await Promise.all([
    prisma.milestone.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        testCases: {
          select: { id: true, status: true },
        },
        defects: {
          select: { id: true, status: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: Number(skip),
      take: Number(take),
    }),
    prisma.milestone.count({ where: whereClause }),
  ]);

  // Calculate progress for each milestone
  const milestonesWithProgress = await Promise.all(
    milestones.map(m => calculateMilestoneProgress(m.id))
  );

  return {
    data: milestonesWithProgress,
    total,
    skip: Number(skip),
    take: Number(take),
  };
}

/**
 * Get a single milestone by ID with full details
 * @param {number} milestoneId - Milestone ID
 * @returns {Promise<Object>} Milestone with progress and related items
 */
export async function getMilestoneById(milestoneId) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: Number(milestoneId) },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      testCases: {
        include: {
          creator: { select: { id: true, name: true, email: true } },
          executions: {
            select: { status: true },
          },
        },
      },
      defects: {
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  return await calculateMilestoneProgress(milestoneId, milestone);
}

/**
 * Update a milestone
 * @param {number} milestoneId - Milestone ID
 * @param {Object} data - Fields to update
 * @param {number} userId - User ID performing the update
 * @returns {Promise<Object>} Updated milestone with progress
 */
export async function updateMilestone(milestoneId, data, userId) {
  const {
    name,
    description,
    status,
    targetStartDate,
    targetEndDate,
    priority,
    notes,
  } = data;

  const milestone = await prisma.milestone.findUnique({
    where: { id: Number(milestoneId) },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Check name uniqueness if changing name
  if (name && name !== milestone.name) {
    const existing = await prisma.milestone.findFirst({
      where: {
        projectId: milestone.projectId,
        name,
      },
    });
    if (existing) {
      throw new Error('Milestone with this name already exists in project');
    }
  }

  // Validate dates
  const startDate = targetStartDate ? new Date(targetStartDate) : milestone.targetStartDate;
  const endDate = targetEndDate ? new Date(targetEndDate) : milestone.targetEndDate;
  if (startDate && endDate && startDate > endDate) {
    throw new Error('Start date must be before end date');
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (status) updateData.status = status;
  if (targetStartDate) updateData.targetStartDate = startDate;
  if (targetEndDate) updateData.targetEndDate = endDate;
  if (priority) updateData.priority = priority;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.milestone.update({
    where: { id: Number(milestoneId) },
    data: updateData,
    include: {
      creator: { select: { id: true, name: true, email: true } },
      testCases: { select: { id: true, status: true } },
      defects: { select: { id: true, status: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'MILESTONE_UPDATED', {
    resourceType: 'MILESTONE',
    resourceId: milestoneId,
    resourceName: updated.name,
    projectId: updated.projectId,
    description: `Milestone "${updated.name}" updated`,
    oldValues: JSON.stringify(milestone),
    newValues: JSON.stringify(updated),
  });

  return await calculateMilestoneProgress(milestoneId, updated);
}

/**
 * Delete a milestone
 * @param {number} milestoneId - Milestone ID
 * @param {number} userId - User ID performing the deletion
 * @returns {Promise<Object>} Deleted milestone
 */
export async function deleteMilestone(milestoneId, userId) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: Number(milestoneId) },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Unassign all test cases and defects from this milestone
  await Promise.all([
    prisma.testCase.updateMany({
      where: { milestoneId: Number(milestoneId) },
      data: { milestoneId: null },
    }),
    prisma.bug.updateMany({
      where: { milestoneId: Number(milestoneId) },
      data: { milestoneId: null },
    }),
  ]);

  const deleted = await prisma.milestone.delete({
    where: { id: Number(milestoneId) },
  });

  // Audit log
  await logAuditAction(userId, 'MILESTONE_DELETED', {
    resourceType: 'MILESTONE',
    resourceId: milestoneId,
    resourceName: deleted.name,
    projectId: deleted.projectId,
    description: `Milestone "${deleted.name}" deleted`,
  });

  return deleted;
}

/**
 * Assign test case(s) to a milestone
 * @param {number} milestoneId - Milestone ID
 * @param {Array<number>} testCaseIds - Test case IDs to assign
 * @param {number} userId - User ID performing the assignment
 * @returns {Promise<Object>} Updated milestone with progress
 */
export async function assignTestCasesToMilestone(milestoneId, testCaseIds, userId) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: Number(milestoneId) },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Update test cases
  const updated = await prisma.testCase.updateMany({
    where: {
      id: { in: testCaseIds.map(id => Number(id)) },
      projectId: milestone.projectId,
    },
    data: { milestoneId: Number(milestoneId) },
  });

  // Audit log
  await logAuditAction(userId, 'MILESTONE_TESTCASES_ASSIGNED', {
    resourceType: 'MILESTONE',
    resourceId: milestoneId,
    resourceName: milestone.name,
    projectId: milestone.projectId,
    description: `${updated.count} test case(s) assigned to milestone "${milestone.name}"`,
  });

  // Index each updated test case
  for (const tcId of testCaseIds) {
    try {
      await indexTestCase(tcId);
    } catch (e) {
      // Non-critical error, continue processing
    }
  }

  return await calculateMilestoneProgress(milestoneId);
}

/**
 * Assign defect(s) to a milestone
 * @param {number} milestoneId - Milestone ID
 * @param {Array<number>} defectIds - Defect IDs to assign
 * @param {number} userId - User ID performing the assignment
 * @returns {Promise<Object>} Updated milestone with progress
 */
export async function assignDefectsToMilestone(milestoneId, defectIds, userId) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: Number(milestoneId) },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Update defects
  const updated = await prisma.bug.updateMany({
    where: {
      id: { in: defectIds.map(id => Number(id)) },
      projectId: milestone.projectId,
    },
    data: { milestoneId: Number(milestoneId) },
  });

  // Audit log
  await logAuditAction(userId, 'MILESTONE_DEFECTS_ASSIGNED', {
    resourceType: 'MILESTONE',
    resourceId: milestoneId,
    resourceName: milestone.name,
    projectId: milestone.projectId,
    description: `${updated.count} defect(s) assigned to milestone "${milestone.name}"`,
  });

  return await calculateMilestoneProgress(milestoneId);
}

/**
 * Remove test case(s) from a milestone
 * @param {number} milestoneId - Milestone ID
 * @param {Array<number>} testCaseIds - Test case IDs to remove
 * @param {number} userId - User ID performing the removal
 * @returns {Promise<Object>} Updated milestone with progress
 */
export async function removeTestCasesFromMilestone(milestoneId, testCaseIds, userId) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: Number(milestoneId) },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Update test cases
  const updated = await prisma.testCase.updateMany({
    where: {
      id: { in: testCaseIds.map(id => Number(id)) },
      milestoneId: Number(milestoneId),
    },
    data: { milestoneId: null },
  });

  // Audit log
  await logAuditAction(userId, 'MILESTONE_TESTCASES_REMOVED', {
    resourceType: 'MILESTONE',
    resourceId: milestoneId,
    resourceName: milestone.name,
    projectId: milestone.projectId,
    description: `${updated.count} test case(s) removed from milestone "${milestone.name}"`,
  });

  return await calculateMilestoneProgress(milestoneId);
}

/**
 * Calculate milestone completion progress
 * @param {number} milestoneId - Milestone ID
 * @param {Object} milestoneData - Optional pre-fetched milestone data
 * @returns {Promise<Object>} Milestone with progress metrics
 */
export async function calculateMilestoneProgress(milestoneId, milestoneData = null) {
  const milestone = milestoneData || await prisma.milestone.findUnique({
    where: { id: Number(milestoneId) },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      testCases: {
        include: {
          executions: {
            select: { status: true },
          },
        },
      },
      defects: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  let testCaseProgress = 0;
  let defectProgress = 0;
  let overallProgress = 0;

  // Calculate test case completion percentage
  if (milestone.testCases.length > 0) {
    const completedTestCases = milestone.testCases.filter(tc => {
      const executions = tc.executions;
      return executions.length > 0 && executions.some(e => e.status === 'PASSED');
    }).length;
    testCaseProgress = (completedTestCases / milestone.testCases.length) * 100;
  }

  // Calculate defect resolution percentage
  if (milestone.defects.length > 0) {
    const resolvedDefects = milestone.defects.filter(d =>
      ['VERIFIED_FIXED', 'CLOSED', 'WORKS_AS_DESIGNED'].includes(d.status)
    ).length;
    defectProgress = (resolvedDefects / milestone.defects.length) * 100;
  }

  // Calculate overall progress (equal weight)
  if (milestone.testCases.length > 0 && milestone.defects.length > 0) {
    overallProgress = (testCaseProgress + defectProgress) / 2;
  } else if (milestone.testCases.length > 0) {
    overallProgress = testCaseProgress;
  } else if (milestone.defects.length > 0) {
    overallProgress = defectProgress;
  }

  // Update milestone completion percentage
  await prisma.milestone.update({
    where: { id: Number(milestoneId) },
    data: { completionPercent: parseFloat(overallProgress.toFixed(2)) },
  });

  return {
    ...milestone,
    progress: {
      overall: parseFloat(overallProgress.toFixed(2)),
      testCases: parseFloat(testCaseProgress.toFixed(2)),
      defects: parseFloat(defectProgress.toFixed(2)),
      totalTestCases: milestone.testCases.length,
      completedTestCases: milestone.testCases.filter(tc =>
        tc.executions.length > 0 && tc.executions.some(e => e.status === 'PASSED')
      ).length,
      totalDefects: milestone.defects.length,
      resolvedDefects: milestone.defects.filter(d =>
        ['VERIFIED_FIXED', 'CLOSED', 'WORKS_AS_DESIGNED'].includes(d.status)
      ).length,
    },
  };
}

/**
 * Get milestone progress summary
 * @param {number} milestoneId - Milestone ID
 * @returns {Promise<Object>} Progress summary
 */
export async function getMilestoneProgress(milestoneId) {
  const milestone = await calculateMilestoneProgress(milestoneId);
  return milestone.progress;
}

/**
 * Get milestones summary for a project dashboard
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Project milestone summary
 */
export async function getProjectMilestonesSummary(projectId) {
  const milestones = await prisma.milestone.findMany({
    where: { projectId: Number(projectId) },
    include: {
      testCases: {
        select: { id: true, status: true },
      },
      defects: {
        select: { id: true, status: true },
      },
    },
  });

  const statusCounts = {
    PLANNED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    ON_HOLD: 0,
    CANCELLED: 0,
  };

  const priorityCounts = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  let totalTestCases = 0;
  let totalDefects = 0;
  let completedMilestones = 0;

  for (const m of milestones) {
    statusCounts[m.status]++;
    priorityCounts[m.priority]++;
    totalTestCases += m.testCases.length;
    totalDefects += m.defects.length;
    if (m.status === 'COMPLETED') completedMilestones++;
  }

  return {
    totalMilestones: milestones.length,
    completedMilestones,
    activeMilestones: milestones.filter(m => m.status === 'IN_PROGRESS').length,
    statusBreakdown: statusCounts,
    priorityDistribution: priorityCounts,
    totalTestCases,
    totalDefects,
    milestonesWithDueDate: milestones.filter(m => m.targetEndDate).length,
    overdueCount: milestones.filter(m =>
      m.targetEndDate && new Date(m.targetEndDate) < new Date() && m.status !== 'COMPLETED'
    ).length,
  };
}
