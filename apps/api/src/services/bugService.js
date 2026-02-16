/**
 * BUG/DEFECT MANAGEMENT SERVICE
 * Handles bug lifecycle, state transitions, verification, and reporting
 */

import { getPrismaClient } from '../lib/prisma.js';
import { parseId, validateEnum } from '../lib/validation.js';
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
 * Generate unique bug number with atomic increment to prevent collisions
 * Uses database transaction with serializable isolation to prevent race conditions
 * @param {number} projectId - Project ID
 * @returns {Promise<string>} Bug number (e.g., PROJ-001)
 */
async function generateBugNumber(projectId) {
  // Use transaction with serializable isolation level to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // Get project key for the prefix
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { key: true },
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Use atomic counter with row-level locking to ensure uniqueness under concurrent access
    const counter = await tx.bugCounter.upsert({
      where: { projectId },
      create: { projectId, nextNumber: 1 },
      update: { nextNumber: { increment: 1 } },
    });
    
    const number = counter.nextNumber.toString().padStart(3, '0');
    return `${project.key}-${number}`;
  }, {
    isolationLevel: 'Serializable',
    maxWait: 5000, // Maximum time to wait for a transaction slot (ms)
    timeout: 10000, // Maximum time the transaction can run (ms)
  });
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

  const normalizedAffectedVersion =
    typeof affectedVersion === 'string' && affectedVersion.trim().length > 0
      ? affectedVersion.trim()
      : 'Unknown';

  // Safe parsing with validation
  const resolvedTestCaseId = parseId(testCaseId, 'testCaseId', true);
  const validatedProjectId = parseId(projectId, 'projectId', false);
  const validatedExecutionId = parseId(executionId, 'executionId', true);
  const validatedAssigneeId = parseId(assigneeId, 'assigneeId', true);

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Title is required and must be a non-empty string');
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    throw new Error('Description is required and must be a non-empty string');
  }

  // Validate enum values using safe validation
  const validatedEnvironment = validateEnum(
    environment,
    ['DEVELOPMENT', 'STAGING', 'UAT', 'PRODUCTION'],
    'environment',
    false
  );

  const validatedSeverity = validateEnum(
    severity,
    ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'],
    'severity',
    false
  );

  const validatedPriority = validateEnum(
    priority,
    ['P0', 'P1', 'P2', 'P3', 'P4'],
    'priority',
    false
  );

  const validatedReproducibility = validateEnum(
    reproducibility,
    ['ALWAYS', 'OFTEN', 'SOMETIMES', 'RARELY', 'CANNOT_REPRODUCE'],
    'reproducibility',
    false
  );

  // Validate project exists
  const project = await prisma.project.findUnique({
    where: { id: validatedProjectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Determine final test case ID
  let finalTestCaseId = resolvedTestCaseId;
  
  if (!finalTestCaseId && validatedExecutionId) {
    const execution = await prisma.testExecution.findUnique({
      where: { id: validatedExecutionId },
      select: { testCaseId: true, projectId: true },
    });

    if (!execution) {
      throw new Error('Test execution not found');
    }

    if (execution.projectId !== validatedProjectId) {
      throw new Error('Execution does not belong to this project');
    }

    finalTestCaseId = execution.testCaseId;
  }

  if (!finalTestCaseId) {
    throw new Error('Test case is required');
  }

  // Validate assignee if provided
  if (validatedAssigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: validatedAssigneeId },
      select: { id: true, role: true, isActive: true },
    });

    if (!assignee || !assignee.isActive) {
      throw new Error('Invalid or inactive assignee');
    }
  }

  const bugNumber = await generateBugNumber(validatedProjectId);

  const bug = await prisma.bug.create({
    data: {
      projectId: validatedProjectId,
      title,
      description: stepsToReproduce || description,
      bugNumber,
      severity: validatedSeverity,
      priority: validatedPriority,
      environment: validatedEnvironment,
      affectedVersion: normalizedAffectedVersion,
      reproducibility: validatedReproducibility,
      reportedBy: userId,
      executionId: validatedExecutionId,
      testCaseId: finalTestCaseId,
      assigneeId: validatedAssigneeId,
      status: validatedAssigneeId ? 'ASSIGNED' : 'NEW',
    },
    include: {
      project: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      testCase: { select: { id: true, name: true } },
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
  const existing = await prisma.bug.findUnique({
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

  const updated = await prisma.bug.update({
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
  const bug = await prisma.bug.findUnique({
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
  const updated = await prisma.bug.update({
    where: { id: bugId },
    data: {
      status: newStatus,
      ...(newStatus === 'CLOSED' && {
        closedAt: new Date(),
      }),
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Create history entry
  // Note: BugHistory model not implemented - skipping
  // await prisma.bugHistory.create({
  //   data: {
  //     bugId: bugId,
  //     fieldName: 'status',
  //     oldValue: bug.status,
  //     newValue: newStatus,
  //     changedBy: userId,
  //   },
  // });

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
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  const updated = await prisma.bug.update({
    where: { id: bugId },
    data: {
      assigneeId: Number(assigneeId),
      status: 'ASSIGNED',
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

  const comment = await prisma.bugComment.create({
    data: {
      bugId: bugId,
      comment: body.trim(),
      userId: userId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
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
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    include: {
      project: { select: { id: true, name: true, key: true } },
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      verifier: { select: { id: true, name: true, email: true } },
      testCase: { select: { id: true, name: true } },
      execution: {
        select: {
          id: true,
          status: true,
          testRun: { select: { id: true, name: true } },
        },
      },
      comments: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      // history: BugHistory model not implemented
      retestRequests: true,
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
    prisma.bug.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        testCase: { select: { id: true, name: true } },
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bug.count({ where }),
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
export async function requestBugRetest(bugId, requesterId, testerId, notes = null) {
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
  });

  if (!bug) {
    throw new Error('Bug not found');
  }

  if (bug.status !== 'FIXED') {
    throw new Error('Bug must be in FIXED status to request retest');
  }

  let assignedTesterId = testerId ? Number(testerId) : null;
  if (Number.isNaN(assignedTesterId)) {
    assignedTesterId = null;
  }

  if (assignedTesterId) {
    const tester = await prisma.user.findUnique({
      where: { id: assignedTesterId },
      select: { id: true, role: true, isActive: true },
    });

    if (!tester || !tester.isActive) {
      throw new Error('Invalid or inactive tester');
    }

    if (tester.role !== 'TESTER') {
      throw new Error('Assigned user must have TESTER role');
    }
  } else {
    const reporter = await prisma.user.findUnique({
      where: { id: bug.reporterId },
      select: { id: true, role: true, isActive: true },
    });

    if (reporter && reporter.isActive && reporter.role === 'TESTER') {
      assignedTesterId = reporter.id;
    }
  }

  const trimmedNotes = typeof notes === 'string' && notes.trim().length > 0
    ? notes.trim()
    : null;

  const retestRequest = await prisma.bugRetestRequest.create({
    data: {
      bugId: bugId,
      reason: trimmedNotes || 'Retest requested',
      status: assignedTesterId ? 'ASSIGNED' : 'PENDING',
    },
  });

  if (assignedTesterId) {
    await prisma.bug.update({
      where: { id: bugId },
      data: {
        status: 'AWAITING_VERIFICATION',
        verifiedBy: assignedTesterId,
      },
    });
  }

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
