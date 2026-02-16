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
    const nextScheduledAt = calculateNextScheduleDate(data.frequency, data.dayOfWeek, data.dayOfMonth, data.time);

    const report = await prisma.scheduledReport.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        type: data.type || 'EXECUTION_SUMMARY',
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time || '09:00',
        timezone: data.timezone || 'UTC',
        recipientEmails: data.recipientEmails || [],
        includeMetrics: data.includeMetrics !== false,
        includeCharts: data.includeCharts !== false,
        includeFailures: data.includeFailures !== false,
        includeTestCases: data.includeTestCases || false,
        filterStatus: data.filterStatus || [],
        filterPriority: data.filterPriority || [],
        filterType: data.filterType || [],
        isActive: data.isActive !== false,
        nextScheduledAt,
        createdBy: userId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
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
        include: {
          creator: { select: { id: true, name: true, email: true } },
          deliveries: {
            take: 5,
            orderBy: { generatedAt: 'desc' },
            select: { status: true, sentAt: true, generatedAt: true },
          },
        },
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
      include: {
        creator: { select: { id: true, name: true, email: true } },
        deliveries: {
          orderBy: { generatedAt: 'desc' },
          take: 50,
          select: {
            id: true,
            status: true,
            generatedAt: true,
            sentAt: true,
            deliveredAt: true,
            recipientEmail: true,
            errorMessage: true,
          },
        },
      },
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
    let nextScheduledAt = undefined;
    if (data.frequency || data.dayOfWeek !== undefined || data.dayOfMonth !== undefined || data.time) {
      const existing = await prisma.scheduledReport.findUnique({ where: { id: reportId } });
      nextScheduledAt = calculateNextScheduleDate(
        data.frequency || existing.frequency,
        data.dayOfWeek ?? existing.dayOfWeek,
        data.dayOfMonth ?? existing.dayOfMonth,
        data.time || existing.time
      );
    }

    const report = await prisma.scheduledReport.updateMany({
      where: { id: reportId, projectId },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time,
        timezone: data.timezone,
        recipientEmails: data.recipientEmails,
        includeMetrics: data.includeMetrics,
        includeCharts: data.includeCharts,
        includeFailures: data.includeFailures,
        includeTestCases: data.includeTestCases,
        filterStatus: data.filterStatus,
        filterPriority: data.filterPriority,
        filterType: data.filterType,
        isActive: data.isActive,
        ...(nextScheduledAt && { nextScheduledAt }),
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
        nextScheduledAt: { lte: now },
      },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
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
    // Generate report data based on type
    let reportData;
    switch (report.type) {
      case 'EXECUTION_SUMMARY':
        reportData = await generateExecutionSummary(report.projectId);
        break;
      case 'DEFECT_ANALYSIS':
        reportData = await generateDefectAnalysis(report.projectId);
        break;
      case 'MILESTONE_PROGRESS':
        reportData = await generateMilestoneProgress(report.projectId);
        break;
      case 'TEAM_PERFORMANCE':
        reportData = await generateTeamPerformance(report.projectId);
        break;
      default:
        reportData = await generateExecutionSummary(report.projectId);
    }

    // Store delivery record
    const delivery = await prisma.scheduledReportDelivery.create({
      data: {
        scheduledReportId: report.id,
        status: 'PENDING',
        recipientEmail: report.recipientEmails[0] || report.creator.email,
      },
    });

    // Send emails to all recipients
    const recipients = report.recipientEmails.length > 0 ? report.recipientEmails : [report.creator.email];
    
    for (const email of recipients) {
      try {
        await sendScheduledReportEmail(email, report, reportData);
        
        await prisma.scheduledReportDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'SUCCESS',
            sentAt: new Date(),
            deliveredAt: new Date(),
          },
        });
      } catch (emailError) {
        logError(`Failed to send report to ${email}:`, emailError);
        
        await prisma.scheduledReportDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED',
            errorMessage: emailError.message,
            nextRetryAt: new Date(Date.now() + 3600000), // Retry in 1 hour
          },
        });
      }
    }

    // Update next scheduled date
    const nextScheduledAt = calculateNextScheduleDate(
      report.frequency,
      report.dayOfWeek,
      report.dayOfMonth,
      report.time
    );

    await prisma.scheduledReport.update({
      where: { id: report.id },
      data: {
        lastGeneratedAt: new Date(),
        nextScheduledAt,
      },
    });

    logInfo(`Report ${report.id} processed and sent successfully`);
  } catch (error) {
    logError('Error processing scheduled report:', error);
    throw error;
  }
}

/**
 * Send scheduled report email
 * @param {string} email - Recipient email
 * @param {Object} report - Report object
 * @param {Object} data - Report data
 */
async function sendScheduledReportEmail(email, report, data) {
  const subject = `Scheduled Report: ${report.name} - ${new Date().toLocaleDateString()}`;
  
  const htmlContent = `
    <h2>${report.name}</h2>
    <p>Project: <strong>${report.project.name}</strong></p>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <h3>Summary</h3>
    <ul>
      ${report.includeMetrics ? `<li>Total Tests: ${data.totalTests}</li>` : ''}
      ${report.includeMetrics ? `<li>Pass Rate: ${data.passRate}%</li>` : ''}
      ${report.includeFailures ? `<li>Failed: ${data.failedCount}</li>` : ''}
      ${report.includeFailures ? `<li>Blocked: ${data.blockedCount}</li>` : ''}
    </ul>
    
    ${report.includeCharts ? '<p><img src="cid:chart" alt="Performance Chart" style="max-width:100%;"></p>' : ''}
    
    <p>For more details, visit: <a href="${process.env.FRONTEND_URL}/reports">Reports Dashboard</a></p>
  `;

  await sendEmail({
    to: email,
    subject,
    html: htmlContent,
    replyTo: report.creator.email,
  });
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
