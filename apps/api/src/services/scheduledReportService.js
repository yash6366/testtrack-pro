/**
 * SCHEDULED REPORT SERVICE
 * Manages scheduled report creation, generation, and delivery
 */

import { getPrismaClient } from '../lib/prisma.js';
import { sendEmail } from './emailService.js';
import { generateExecutionReport, generateDefectAnalysis } from './reportService.js';
import { logInfo, logError } from '../lib/logger.js';

const prisma = getPrismaClient();

function isMissingTableError(error, tableName) {
  return error?.code === 'P2021' && error?.meta?.table?.includes(tableName);
}

/**
 * Create a new scheduled report
 * @param {number} projectId - Project ID
 * @param {object} data - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createScheduledReport(projectId, data, userId) {
  try {
    // Calculate next scheduled date
    const nextSendAt = calculateNextScheduleDate(data.frequency, data.dayOfWeek, data.dayOfMonth, data.time);

    const report = await prisma.scheduledReport.create({
      data: {
        projectId,
        name: data.name,
        type: data.type || 'EXECUTION_SUMMARY',
        frequency: data.frequency,
        recipients: data.recipients || [],
        isActive: data.isActive !== false,
        nextSendAt,
      },
    });

    logInfo(`Scheduled report created: ${report.id} for project ${projectId}`);
    return report;
  } catch (error) {
    logError('Error creating scheduled report:', error);
    throw error;
  }
}

/**
 * Get all scheduled reports for a project
 * @param {number} projectId - Project ID
 * @param {object} options - Pagination and filter options
 * @returns {Promise<Object>} Reports and total count
 */
export async function getScheduledReports(projectId, options = {}) {
  const { skip = 0, take = 20, isActive } = options;

  try {
    const where = { projectId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [reports, total] = await Promise.all([
      prisma.scheduledReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.scheduledReport.count({ where }),
    ]);

    return { data: reports, total };
  } catch (error) {
    logError('Error fetching scheduled reports:', error);
    throw error;
  }
}

/**
 * Get a specific scheduled report
 * @param {number} reportId - Report ID
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Report details
 */
export async function getScheduledReport(reportId, projectId) {
  try {
    const report = await prisma.scheduledReport.findFirst({
      where: { id: reportId, projectId },
    });

    if (!report) {
      throw new Error('Scheduled report not found');
    }

    return report;
  } catch (error) {
    logError('Error fetching scheduled reports:', error);
    throw error;
  }
}

/**
 * Update a scheduled report
 * @param {number} reportId - Report ID
 * @param {number} projectId - Project ID
 * @param {object} data - Updated data
 * @returns {Promise<Object>} Updated report
 */
export async function updateScheduledReport(reportId, projectId, data) {
  try {
    // Recalculate next scheduled date if frequency changed
    let nextSendAt = undefined;
    if (data.frequency) {
      const existing = await prisma.scheduledReport.findUnique({ where: { id: reportId } });
      nextSendAt = calculateNextScheduleDate(
        data.frequency || existing.frequency,
        0,
        0,
        '09:00'
      );
    }

    const report = await prisma.scheduledReport.update({
      where: { id: reportId },
      data: {
        name: data.name,
        type: data.type,
        frequency: data.frequency,
        recipients: data.recipients,
        isActive: data.isActive,
        ...(nextSendAt && { nextSendAt }),
      },
    });

    logInfo(`Scheduled report updated: ${reportId}`);

    return getScheduledReport(reportId, projectId);
  } catch (error) {
    logError('Error updating scheduled report:', error);
    throw error;
  }
}

/**
 * Delete a scheduled report
 * @param {number} reportId - Report ID
 * @param {number} projectId - Project ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteScheduledReport(reportId, projectId) {
  try {
    await prisma.scheduledReport.deleteMany({
      where: { id: reportId, projectId },
    });

    logInfo(`Scheduled report deleted: ${reportId}`);
    return true;
  } catch (error) {
    logError('Error deleting scheduled report:', error);
    throw error;
  }
}

/**
 * Generate and send scheduled reports
 * Called by cron job
 * @returns {Promise<Object>} Execution result
 */
export async function generateAndSendScheduledReports() {
  try {
    const now = new Date();
    const reports = await prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        nextSendAt: { lte: now },
      },
    });

    let processed = 0;
    let failed = 0;

    for (const report of reports) {
      try {
        await processAndSendReport(report);
        processed++;
      } catch (error) {
        logError(`Failed to process report ${report.id}:`, error);
        failed++;
      }
    }

    return { processed, failed, total: reports.length };
  } catch (error) {
    if (isMissingTableError(error, 'ScheduledReport')) {
      logInfo('Scheduled reports skipped: ScheduledReport table is missing.');
      return { processed: 0, failed: 0, total: 0, skipped: true };
    }
    logError('Error generating scheduled reports:', error);
    throw error;
  }
}

/**
 * Process and send a single scheduled report
 * @param {Object} report - Report object
 */
async function processAndSendReport(report) {
  try {
    logInfo(`Report ${report.id} scheduled for processing`);

    // Update next scheduled date
    const nextSendAt = calculateNextScheduleDate(
      report.frequency,
      0,
      0,
      '09:00'
    );

    await prisma.scheduledReport.update({
      where: { id: report.id },
      data: {
        lastSentAt: new Date(),
        nextSendAt,
      },
    });
  } catch (error) {
    logError('Error processing scheduled report:', error);
    throw error;
  }
}

/**
 * Send scheduled report email
 * @param {string} email - Recipient email
 * @param {Object} report - Report object
 */
async function sendScheduledReportEmail(email, report) {
  const subject = `${report.name} - ${new Date().toLocaleDateString()}`;
  
  const htmlContent = `
    <h2>${report.name}</h2>
    <p>Report Type: <strong>${report.type}</strong></p>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <p>For more details, visit: <a href="${process.env.FRONTEND_URL}/reports">Reports Dashboard</a></p>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error) {
    logError(`Failed to send email to ${email}:`, error);
  }
}

/**
 * Generate execution summary for report period
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Summary data
 */
async function generateExecutionSummary(projectId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const executions = await prisma.testExecution.findMany({
    where: {
      testRun: { projectId },
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const total = executions.length;
  const passed = executions.filter(e => e.status === 'PASSED').length;
  const failed = executions.filter(e => e.status === 'FAILED').length;
  const blocked = executions.filter(e => e.status === 'BLOCKED').length;
  const skipped = executions.filter(e => e.status === 'SKIPPED').length;

  return {
    totalTests: total,
    passedCount: passed,
    failedCount: failed,
    blockedCount: blocked,
    skippedCount: skipped,
    passRate: total > 0 ? ((passed / total) * 100).toFixed(2) : 0,
    periodDays: 30,
  };
}

/**
 * Generate milestone progress data
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Progress data
 */
async function generateMilestoneProgress(projectId) {
  const milestones = await prisma.milestone.findMany({
    where: {
      projectId,
      status: { in: ['PLANNED', 'IN_PROGRESS'] },
    },
    include: {
      testCases: true,
      defects: true,
    },
  });

  return {
    totalMilestones: milestones.length,
    activeMilestones: milestones.filter(m => m.status === 'IN_PROGRESS').length,
    milestones: milestones.map(m => ({
      name: m.name,
      status: m.status,
      completionPercent: m.completionPercent,
      targetEndDate: m.targetEndDate,
    })),
  };
}

/**
 * Generate team performance metrics
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Performance data
 */
async function generateTeamPerformance(projectId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const executions = await prisma.testExecution.findMany({
    where: {
      testRun: { projectId },
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      executor: { select: { id: true, name: true, email: true } },
    },
  });

  const performanceByUser = {};
  for (const execution of executions) {
    const userId = execution.executor.id;
    if (!performanceByUser[userId]) {
      performanceByUser[userId] = {
        name: execution.executor.name,
        email: execution.executor.email,
        total: 0,
        passed: 0,
        failed: 0,
      };
    }
    performanceByUser[userId].total++;
    if (execution.status === 'PASSED') performanceByUser[userId].passed++;
    if (execution.status === 'FAILED') performanceByUser[userId].failed++;
  }

  return {
    totalExecutions: executions.length,
    teamMembers: Object.values(performanceByUser).map(m => ({
      ...m,
      passRate: m.total > 0 ? ((m.passed / m.total) * 100).toFixed(2) : 0,
    })),
  };
}

/**
 * Calculate next schedule date based on frequency
 * @param {string} frequency - Frequency type
 * @param {number} dayOfWeek - Day of week (0-6)
 * @param {number} dayOfMonth - Day of month (1-31)
 * @param {string} time - Time in HH:MM format
 * @returns {Date} Next scheduled date
 */
function calculateNextScheduleDate(frequency, dayOfWeek, dayOfMonth, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      const daysUntilTarget = (dayOfWeek - next.getDay() + 7) % 7 || 7;
      next.setDate(next.getDate() + daysUntilTarget);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      next.setDate(dayOfMonth || 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

export default {
  createScheduledReport,
  getScheduledReports,
  getScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  generateAndSendScheduledReports,
};
