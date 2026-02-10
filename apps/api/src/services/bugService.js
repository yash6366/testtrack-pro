/**
 * BUG/DEFECT MANAGEMENT SERVICE
 * Handles bug lifecycle, state transitions, verification, and reporting
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import {
  createNotification,
  createBulkNotifications,
  shouldSendNotification,
  isWithinQuietHours,
} from './notificationService.js';
import {
  sendBugCreatedEmail,
  sendBugAssignedEmail,
  sendBugStatusChangedEmail,
} from './emailService.js';
import {
  broadcastToProject,
} from './notificationEmitter.js';
import {
  indexBug,
} from './searchIndexService.js';

const prisma = getPrismaClient();

/**
 * Generate unique bug number
 * @param {number} projectId - Project ID
 * @returns {Promise<string>} Bug number (e.g., BUG-001)
 */
async function generateBugNumber(projectId) {
  const count = await prisma.defect.count({
    where: { projectId },
  });
  
  const number = (count + 1).toString().padStart(3, '0');
  return `BUG-${number}`;
}

/**
 * Create bug from failed test execution
 * @param {Object} data - Bug data
 * @param {number} userId - Reporter ID
 * @returns {Promise<Object>} Created bug
 */
export async function createBugFromExecution(data, userId) {
  const {
    executionId,
    testCaseId,
    projectId,
    title,
    description,
    severity = 'MINOR',
    priority = 'P3',
    environment,
    affectedVersion,
    reproducibility = 'SOMETIMES',
    stepsToReproduce,
    assigneeId,
  } = data;

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Title is required and must be a non-empty string');
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    throw new Error('Description is required and must be a non-empty string');
  }

  if (!projectId || typeof projectId !== 'number') {
    throw new Error('Project ID is required and must be a number');
  }

  if (!environment || typeof environment !== 'string') {
    throw new Error('Environment is required (DEVELOPMENT, STAGING, UAT, PRODUCTION)');
  }

  // Validate enum values
  const validEnvironments = ['DEVELOPMENT', 'STAGING', 'UAT', 'PRODUCTION'];
  if (!validEnvironments.includes(environment)) {
    throw new Error(`Invalid environment. Must be one of: ${validEnvironments.join(', ')}`);
  }

  const validSeverities = ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'];
  if (severity && !validSeverities.includes(severity)) {
    throw new Error(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
  }

  const validPriorities = ['P0', 'P1', 'P2', 'P3', 'P4'];
  if (priority && !validPriorities.includes(priority)) {
    throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }

  const validReproducibility = ['ALWAYS', 'OFTEN', 'SOMETIMES', 'RARELY', 'CANNOT_REPRODUCE'];
  if (reproducibility && !validReproducibility.includes(reproducibility)) {
    throw new Error(`Invalid reproducibility. Must be one of: ${validReproducibility.join(', ')}`);
  }

  // Validate project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Validate assignee if provided
  if (assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: Number(assigneeId) },
      select: { id: true, role: true, isActive: true },
    });

    if (!assignee || !assignee.isActive) {
      throw new Error('Invalid or inactive assignee');
    }
  }

  const bugNumber = await generateBugNumber(projectId);

  const bug = await prisma.defect.create({
    data: {
      projectId,
      title,
      description: stepsToReproduce || description,
      bugNumber,
      severity,
      priority,
      environment,
      affectedVersion,
      reproducibility,
      reporterId: userId,
      sourceExecutionId: executionId ? Number(executionId) : null,
      sourceTestCaseId: testCaseId,
      assigneeId: assigneeId ? Number(assigneeId) : null,
      status: assigneeId ? 'ASSIGNED' : 'NEW',
      createdBy: userId,
      updatedBy: userId,
    },
    include: {
      project: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      sourceTestCase: { select: { id: true, name: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'BUG_CREATED', {
    resourceType: 'BUG',
    resourceId: bug.id,
    resourceName: bug.bugNumber,
    projectId: bug.projectId,
    description: `Created bug ${bug.bugNumber}: ${bug.title}`,
    newValues: JSON.stringify({
      severity: bug.severity,
      priority: bug.priority,
      assigneeId: bug.assigneeId,
    }),
  });

  // Trigger notifications
  try {
    await triggerBugCreatedNotifications(bug, userId);
  } catch (error) {
    console.error('Error triggering bug created notifications:', error);
    // Don't fail the request if notifications fail
  }

  // Index for search
  try {
    await indexBug(bug.id, bug.projectId);
  } catch (error) {
    console.error('Error indexing bug:', error);
  }

  // Broadcast to project members
  try {
    await broadcastToProject(bug.projectId, {
      id: bug.id,
      title: `New bug: ${bug.bugNumber}`,
      message: bug.title,
      type: 'BUG_CREATED',
      sourceType: 'BUG',
      sourceId: bug.id,
      createdAt: bug.createdAt,
    });
  } catch (error) {
    console.error('Error broadcasting bug creation:', error);
  }

  return bug;
}

/**
 * Update bug details
 * @param {number} bugId - Bug ID
 * @param {Object} updates - Fields to update
 * @param {number} userId - User making update
 * @returns {Promise<Object>} Updated bug
 */
export async function updateBug(bugId, updates, userId) {
  const existing = await prisma.defect.findUnique({
    where: { id: bugId },
  });

  if (!existing) {
    throw new Error('Bug not found');
  }

  const {
    title,
    description,
    severity,
    priority,
    environment,
    affectedVersion,
    reproducibility,
    rootCauseAnalysis,
    rootCauseCategory,
    fixStrategy,
    estimatedFixHours,
    targetFixVersion,
    regressionRiskLevel,
  } = updates;

  const updated = await prisma.defect.update({
    where: { id: bugId },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(severity && { severity }),
      ...(priority && { priority }),
      ...(environment && { environment }),
      ...(affectedVersion && { affectedVersion }),
      ...(reproducibility && { reproducibility }),
      ...(rootCauseAnalysis !== undefined && { rootCauseAnalysis }),
      ...(rootCauseCategory !== undefined && { rootCauseCategory }),
      ...(fixStrategy !== undefined && { fixStrategy }),
      ...(estimatedFixHours !== undefined && { estimatedFixHours }),
      ...(targetFixVersion !== undefined && { targetFixVersion }),
      ...(regressionRiskLevel !== undefined && { regressionRiskLevel }),
      updatedBy: userId,
    },
    include: {
      reporter: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'BUG_STATUS_CHANGED', {
    resourceType: 'BUG',
    resourceId: bugId,
    resourceName: existing.bugNumber,
    projectId: existing.projectId,
    description: `Updated bug ${existing.bugNumber}`,
    oldValues: JSON.stringify({ severity: existing.severity, priority: existing.priority }),
    newValues: JSON.stringify({ severity: updated.severity, priority: updated.priority }),
  });

  return updated;
}

/**
 * Change bug status (with workflow validation)
 * @param {number} bugId - Bug ID
 * @param {string} newStatus - New status
 * @param {number} userId - User changing status
 * @param {string} role - User role
 * @returns {Promise<Object>} Updated bug
 */
export async function changeBugStatus(bugId, newStatus, userId, role, auditContext = {}) {
  const bug = await prisma.defect.findUnique({
    where: { id: bugId },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  // Workflow validation
  const validStatuses = [
    'NEW', 'ASSIGNED', 'IN_PROGRESS', 'FIXED',
    'AWAITING_VERIFICATION', 'VERIFIED_FIXED', 'REOPENED',
    'CANNOT_REPRODUCE', 'DUPLICATE', 'WORKS_AS_DESIGNED',
    'CLOSED', 'DEFERRED', 'WONTFIX'
  ];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  // Role-based restrictions
  if (newStatus === 'FIXED' && role !== 'DEVELOPER') {
    throw new Error('Only developers can mark bugs as FIXED');
  }

  if (newStatus === 'VERIFIED_FIXED' && role !== 'TESTER') {
    throw new Error('Only testers can verify bug fixes');
  }

  if (newStatus === 'REOPENED' && role !== 'TESTER') {
    throw new Error('Only testers can reopen bugs');
  }

  // Developer-specific workflow constraints
  const developerAllowedStatuses = [
    'IN_PROGRESS',
    'FIXED',
    'WONTFIX',
    'DUPLICATE',
    'CANNOT_REPRODUCE',
    'WORKS_AS_DESIGNED',
  ];

  if (
    role === 'DEVELOPER' &&
    !developerAllowedStatuses.includes(newStatus)
  ) {
    throw new Error(
      `Developers can only transition to: ${developerAllowedStatuses.join(', ')}`
    );
  }

  // Update bug
  const updated = await prisma.defect.update({
    where: { id: bugId },
    data: {
      status: newStatus,
      statusChangedAt: new Date(),
      statusChangedBy: userId,
      updatedBy: userId,
      ...(newStatus === 'CLOSED' && {
        closedAt: new Date(),
        closedBy: userId,
      }),
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Create history entry
  await prisma.defectHistory.create({
    data: {
      defectId: bugId,
      fieldName: 'status',
      oldValue: bug.status,
      newValue: newStatus,
      changedBy: userId,
    },
  });

  // Audit log
  await logAuditAction(userId, 'BUG_STATUS_CHANGED', {
    resourceType: 'BUG',
    resourceId: bugId,
    resourceName: bug.bugNumber,
    projectId: bug.projectId,
    description: `Changed bug ${bug.bugNumber} status: ${bug.status} → ${newStatus}`,
    oldValues: JSON.stringify({ status: bug.status }),
    newValues: JSON.stringify({ status: newStatus }),
    ...auditContext,
  });

  // Trigger notifications
  try {
    await triggerBugStatusChangedNotifications(updated, bug.status, newStatus, userId);
  } catch (error) {
    console.error('Error triggering bug status changed notifications:', error);
  }

  // Index for search
  try {
    await indexBug(bugId, updated.projectId);
  } catch (error) {
    console.error('Error indexing bug:', error);
  }

  // Broadcast to project members
  try {
    await broadcastToProject(updated.projectId, {
      id: updated.id,
      title: `Bug status updated: ${updated.bugNumber}`,
      message: `${bug.status} → ${newStatus}`,
      type: 'BUG_STATUS_CHANGED',
      sourceType: 'BUG',
      sourceId: updated.id,
      createdAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error broadcasting bug status change:', error);
  }

  return updated;
}

/**
 * Assign bug to developer
 * @param {number} bugId - Bug ID
 * @param {number} assigneeId - Developer ID
 * @param {number} userId - User assigning
 * @returns {Promise<Object>} Updated bug
 */
export async function assignBug(bugId, assigneeId, userId) {
  const bug = await prisma.defect.findUnique({
    where: { id: bugId },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  const updated = await prisma.defect.update({
    where: { id: bugId },
    data: {
      assigneeId: Number(assigneeId),
      status: 'ASSIGNED',
      statusChangedAt: new Date(),
      statusChangedBy: userId,
      updatedBy: userId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      reporter: { select: { id: true, name: true, email: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'BUG_ASSIGNED', {
    resourceType: 'BUG',
    resourceId: bugId,
    resourceName: bug.bugNumber,
    projectId: bug.projectId,
    description: `Assigned bug ${bug.bugNumber} to ${updated.assignee.name}`,
    newValues: JSON.stringify({ assigneeId }),
  });

  // Trigger notifications
  try {
    await triggerBugAssignedNotifications(updated, userId);
  } catch (error) {
    console.error('Error triggering bug assigned notifications:', error);
  }

  return updated;
}

/**
 * Add comment to bug
 * @param {number} bugId - Bug ID
 * @param {string} body - Comment text
 * @param {number} userId - Commenter ID
 * @param {boolean} isInternal - Internal comment (dev-only)
 * @returns {Promise<Object>} Created comment
 */
export async function addBugComment(bugId, body, userId, isInternal = false) {
  if (!body || body.trim().length === 0) {
    throw new Error('Comment body is required');
  }

  const comment = await prisma.defectComment.create({
    data: {
      defectId: bugId,
      body: body.trim(),
      isInternal,
      commentedBy: userId,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'BUG_COMMENTED', {
    resourceType: 'BUG',
    resourceId: bugId,
    description: `Added comment to bug`,
  });

  return comment;
}

/**
 * Get bug details with all related data
 * @param {number} bugId - Bug ID
 * @returns {Promise<Object>} Bug with relations
 */
export async function getBugDetails(bugId) {
  const bug = await prisma.defect.findUnique({
    where: { id: bugId },
    include: {
      project: { select: { id: true, name: true, key: true } },
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      verifier: { select: { id: true, name: true, email: true } },
      sourceTestCase: { select: { id: true, name: true } },
      sourceExecution: {
        select: {
          id: true,
          status: true,
          testRun: { select: { id: true, name: true } },
        },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { commentedAt: 'desc' },
      },
      history: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { changedAt: 'desc' },
      },
      attachments: {
        where: { isDeleted: false },
        orderBy: { uploadedAt: 'desc' },
      },
      retestRequests: {
        include: {
          requester: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { requestedAt: 'desc' },
      },
    },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  return bug;
}

/**
 * Get bugs for project with filters
 * @param {number} projectId - Project ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Bugs and count
 */
export async function getProjectBugs(projectId, filters = {}) {
  const {
    status,
    priority,
    severity,
    assigneeId,
    reporterId,
    search,
    skip = 0,
    take = 50,
  } = filters;

  // Sanitize search input to prevent injection
  const sanitizedSearch = search ? String(search).trim().slice(0, 100) : null;

  const where = {
    ...(projectId && { projectId: Number(projectId) }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(severity && { severity }),
    ...(assigneeId && { assigneeId: Number(assigneeId) }),
    ...(reporterId && { reporterId: Number(reporterId) }),
    ...(sanitizedSearch && {
      OR: [
        { title: { contains: sanitizedSearch, mode: 'insensitive' } },
        { description: { contains: sanitizedSearch, mode: 'insensitive' } },
        { bugNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
      ],
    }),
  };

  const [bugs, total] = await Promise.all([
    prisma.defect.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        sourceTestCase: { select: { id: true, name: true } },
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.defect.count({ where }),
  ]);

  return { bugs, total, skip, take };
}

/**
 * Request retest for fixed bug
 * @param {number} bugId - Bug ID
 * @param {number} requesterId - Developer requesting retest
 * @param {number} testerId - Tester assigned to retest
 * @returns {Promise<Object>} Retest request
 */
export async function requestBugRetest(bugId, requesterId, testerId) {
  const bug = await prisma.defect.findUnique({
    where: { id: bugId },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  if (bug.status !== 'FIXED') {
    throw new Error('Bug must be in FIXED status to request retest');
  }

  if (!testerId) {
    throw new Error('Tester ID is required for retest assignment');
  }

  // Verify tester exists and has TESTER role
  const tester = await prisma.user.findUnique({
    where: { id: Number(testerId) },
    select: { id: true, role: true, isActive: true },
  });

  if (!tester || !tester.isActive) {
    throw new Error('Invalid or inactive tester');
  }

  if (tester.role !== 'TESTER') {
    throw new Error('Assigned user must have TESTER role');
  }

  const retestRequest = await prisma.defectRetestRequest.create({
    data: {
      defectId: bugId,
      requestedBy: requesterId,
      assignedTo: testerId,
      assignedAt: new Date(),
      status: 'ASSIGNED',
    },
    include: {
      requester: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Update bug status
  await prisma.defect.update({
    where: { id: bugId },
    data: {
      status: 'AWAITING_VERIFICATION',
      verifierId: testerId,
    },
  });

  return retestRequest;
}

// ============================================
// NOTIFICATION TRIGGERS (Internal Events)
// ============================================

/**
 * Trigger notifications when bug is created
 */
async function triggerBugCreatedNotifications(bug, reporterUserId) {
  try {
    // Get project team members to notify
    const team = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'DEVELOPER'] },
        isActive: true,
      },
      select: { id: true, email: true, name: true },
    });

    // Filter team for notifications based on preferences
    for (const member of team) {
      if (member.id === reporterUserId) continue; // Don't notify the reporter

      const shouldEmail = await shouldSendNotification(member.id, 'EMAIL', 'BUG_CREATED');
      const shouldInApp = await shouldSendNotification(member.id, 'IN_APP', 'BUG_CREATED');
      const inQuietHours = await isWithinQuietHours(member.id);

      // In-app notification
      if (shouldInApp && !inQuietHours) {
        await createNotification(member.id, {
          title: `New Bug: ${bug.bugNumber}`,
          message: `${bug.title} (${bug.severity})`,
          type: 'BUG_CREATED',
          sourceType: 'BUG',
          sourceId: bug.id,
          actionUrl: `/bugs/${bug.id}`,
          actionType: 'REVIEW',
          metadata: { bugId: bug.id, severity: bug.severity },
        });
      }

      // Email notification
      if (shouldEmail && !inQuietHours) {
        try {
          await sendBugCreatedEmail(
            member.email,
            { id: bug.id, ...bug },
            bug.reporter.name
          );
        } catch (error) {
          console.error(`Failed to send email to ${member.email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in triggerBugCreatedNotifications:', error);
  }
}

/**
 * Trigger notifications when bug is assigned
 */
async function triggerBugAssignedNotifications(bug, assignerUserId) {
  try {
    if (!bug.assigneeId) return;

    const shouldEmail = await shouldSendNotification(bug.assigneeId, 'EMAIL', 'BUG_ASSIGNED');
    const shouldInApp = await shouldSendNotification(bug.assigneeId, 'IN_APP', 'BUG_ASSIGNED');
    const inQuietHours = await isWithinQuietHours(bug.assigneeId);

    // In-app notification
    if (shouldInApp && !inQuietHours) {
      await createNotification(bug.assigneeId, {
        title: `Bug Assigned: ${bug.bugNumber}`,
        message: `${bug.title} assigned to you`,
        type: 'BUG_ASSIGNED',
        sourceType: 'BUG',
        sourceId: bug.id,
        relatedUserId: assignerUserId,
        actionUrl: `/bugs/${bug.id}`,
        actionType: 'ASSIGN',
        metadata: { bugId: bug.id, priority: bug.priority },
      });
    }

    // Email notification
    if (shouldEmail && !inQuietHours) {
      try {
        const assigner = await prisma.user.findUnique({
          where: { id: assignerUserId },
          select: { name: true },
        });

        await sendBugAssignedEmail(
          bug.assignee.email,
          { id: bug.id, ...bug },
          assigner.name
        );
      } catch (error) {
        console.error(`Failed to send email to ${bug.assignee.email}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in triggerBugAssignedNotifications:', error);
  }
}

/**
 * Trigger notifications when bug status changes
 */
async function triggerBugStatusChangedNotifications(bug, oldStatus, newStatus, changedByUserId) {
  try {
    // Determine who to notify based on status change
    let notifyUserIds = [];

    if (bug.assigneeId) notifyUserIds.push(bug.assigneeId);
    if (bug.reporterId) notifyUserIds.push(bug.reporterId);
    if (bug.verifierId) notifyUserIds.push(bug.verifierId);

    notifyUserIds = [...new Set(notifyUserIds)]; // Remove duplicates

    const changedByUser = await prisma.user.findUnique({
      where: { id: changedByUserId },
      select: { name: true },
    });

    for (const userId of notifyUserIds) {
      if (userId === changedByUserId) continue; // Don't notify the person who made the change

      const shouldEmail = await shouldSendNotification(userId, 'EMAIL', 'BUG_STATUS_CHANGED');
      const shouldInApp = await shouldSendNotification(userId, 'IN_APP', 'BUG_STATUS_CHANGED');
      const inQuietHours = await isWithinQuietHours(userId);

      // In-app notification
      if (shouldInApp && !inQuietHours) {
        await createNotification(userId, {
          title: `Status Update: ${bug.bugNumber}`,
          message: `${oldStatus} → ${newStatus}`,
          type: 'BUG_STATUS_CHANGED',
          sourceType: 'BUG',
          sourceId: bug.id,
          relatedUserId: changedByUserId,
          actionUrl: `/bugs/${bug.id}`,
          actionType: 'REVIEW',
          metadata: { bugId: bug.id, oldStatus, newStatus },
        });
      }

      // Email notification
      if (shouldEmail && !inQuietHours) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
          });

          await sendBugStatusChangedEmail(
            user.email,
            { id: bug.id, ...bug },
            oldStatus,
            newStatus,
            changedByUser.name
          );
        } catch (error) {
          console.error(`Failed to send status email to ${userId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in triggerBugStatusChangedNotifications:', error);
  }
}

export default {
  createBugFromExecution,
  updateBug,
  changeBugStatus,
  assignBug,
  addBugComment,
  getBugDetails,
  getProjectBugs,
  requestBugRetest,
};
