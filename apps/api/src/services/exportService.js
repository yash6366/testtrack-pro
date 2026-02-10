/**
 * EXPORT SERVICE
 * Generate PDF and Excel reports
 */

import { getPrismaClient } from '../lib/prisma.js';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';

const prisma = getPrismaClient();

/**
 * Generate test execution report to CSV (enhanced)
 */
export async function generateEnhancedExecutionCSV(testRunId) {
  const report = await prisma.testRun.findUnique({
    where: { id: testRunId },
    include: {
      project: true,
      executor: true,
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
            },
          },
        },
      },
    },
  });

  if (!report) {
    throw new Error('Test run not found');
  }

  const headers = [
    'Test Case ID',
    'Test Case Name',
    'Type',
    'Priority',
    'Severity',
    'Status',
    'Passed Steps',
    'Failed Steps',
    'Total Steps',
    'Duration (sec)',
  ];

  const rows = report.executions.map((exec) => {
    const passedSteps = exec.steps.filter((s) => s.status === 'PASSED').length;
    const failedSteps = exec.steps.filter((s) => s.status === 'FAILED').length;
    const totalSteps = exec.steps.length;

    return [
      exec.testCase.id,
      `"${exec.testCase.name}"`,
      exec.testCase.type,
      exec.testCase.priority,
      exec.testCase.severity,
      exec.status,
      passedSteps,
      failedSteps,
      totalSteps,
      exec.durationSeconds || 0,
    ];
  });

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Generate bug report to CSV (enhanced)
 */
export async function generateEnhancedBugReportCSV(projectId, filters = {}) {
  const where = {
    projectId,
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.severity && { severity: filters.severity }),
  };

  const bugs = await prisma.defect.findMany({
    where,
    include: {
      reporter: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'Bug Number',
    'Title',
    'Status',
    'Priority',
    'Severity',
    'Reporter',
    'Assignee',
    'Environment',
    'Created Date',
    'Days Open',
  ];

  const now = new Date();
  const rows = bugs.map((bug) => {
    const daysOpen = Math.floor((now - bug.createdAt) / (1000 * 60 * 60 * 24));
    return [
      bug.bugNumber,
      `"${bug.title}"`,
      bug.status,
      bug.priority,
      bug.severity,
      bug.reporter?.name || 'Unknown',
      bug.assignee?.name || 'Unassigned',
      bug.environment || 'N/A',
      bug.createdAt.toISOString().split('T')[0],
      daysOpen,
    ];
  });

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Generate tester performance report to CSV
 */
export async function generateTesterPerformanceCSV(userId, weeks = 4) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const [user, executions, bugs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.testExecution.findMany({
      where: { executedBy: userId, createdAt: { gte: startDate } },
      include: {
        testCase: { select: { type: true } },
      },
    }),
    prisma.defect.findMany({
      where: { reporterId: userId, createdAt: { gte: startDate } },
      select: { bugNumber: true, priority: true, severity: true },
    }),
  ]);

  const passed = executions.filter((e) => e.status === 'PASSED').length;
  const failed = executions.filter((e) => e.status === 'FAILED').length;
  const passRate = executions.length > 0 ? ((passed / executions.length) * 100).toFixed(2) : 0;

  const typeBreakdown = {};
  executions.forEach((e) => {
    if (!typeBreakdown[e.testCase.type]) {
      typeBreakdown[e.testCase.type] = 0;
    }
    typeBreakdown[e.testCase.type]++;
  });

  const csv = [
    'TESTER PERFORMANCE REPORT',
    `Name,${user?.name || 'Unknown'}`,
    `Email,${user?.email || 'N/A'}`,
    `Period,Last ${weeks} weeks`,
    `Report Generated,${new Date().toISOString().split('T')[0]}`,
    '',
    'EXECUTION METRICS',
    'Total Executions,' + executions.length,
    'Passed,' + passed,
    'Failed,' + failed,
    'Pass Rate,' + passRate + '%',
    'Bugs Reported,' + bugs.length,
    'Bug Detection Rate,' + (executions.length > 0 ? ((bugs.length / executions.length) * 100).toFixed(2) : 0) + '%',
    '',
    'TEST TYPE BREAKDOWN',
    'Test Type,Count',
    ...Object.entries(typeBreakdown).map(([type, count]) => `${type},${count}`),
    '',
    'BUGS REPORTED',
    'Bug Number,Priority,Severity',
    ...bugs.map((b) => `${b.bugNumber},${b.priority},${b.severity}`),
  ];

  return csv.join('\n');
}

/**
 * Generate developer performance report to CSV
 */
export async function generateDeveloperPerformanceCSV(userId, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const [user, bugsAssigned, bugsResolved, bugsReopened] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.defect.findMany({
      where: { assigneeId: userId, createdAt: { gte: startDate } },
      select: { bugNumber: true, priority: true, severity: true, status: true, createdAt: true, closedAt: true },
    }),
    prisma.defect.count({
      where: {
        assigneeId: userId,
        createdAt: { gte: startDate },
        status: { in: ['VERIFIED_FIXED', 'CLOSED'] },
      },
    }),
    prisma.defect.count({
      where: {
        assigneeId: userId,
        createdAt: { gte: startDate },
        status: 'REOPENED',
      },
    }),
  ]);

  const totalAssigned = bugsAssigned.length;
  const resolutionRate = totalAssigned > 0 ? ((bugsResolved / totalAssigned) * 100).toFixed(2) : 0;
  const reopenRate = bugsResolved > 0 ? ((bugsReopened / bugsResolved) * 100).toFixed(2) : 0;

  const avgResolutionHours = bugsAssigned.length > 0
    ? (
        bugsAssigned
          .filter((b) => b.closedAt)
          .reduce((sum, b) => sum + (b.closedAt - b.createdAt), 0) /
        (1000 * 60 * 60) /
        bugsAssigned.filter((b) => b.closedAt).length
      ).toFixed(1)
    : 0;

  const csv = [
    'DEVELOPER PERFORMANCE REPORT',
    `Name,${user?.name || 'Unknown'}`,
    `Email,${user?.email || 'N/A'}`,
    `Period,Last ${weeks} weeks`,
    `Report Generated,${new Date().toISOString().split('T')[0]}`,
    '',
    'BUG METRICS',
    'Total Bugs Assigned,' + totalAssigned,
    'Bugs Resolved,' + bugsResolved,
    'Bugs Reopened,' + bugsReopened,
    'Resolution Rate,' + resolutionRate + '%',
    'Reopen Rate,' + reopenRate + '%',
    'Avg Resolution Time (hours),' + avgResolutionHours,
    '',
    'BUG DETAILS',
    'Bug Number,Priority,Severity,Status,Days to Resolution',
    ...bugsAssigned.map((b) => {
      const daysToRes = b.closedAt ? Math.floor((b.closedAt - b.createdAt) / (1000 * 60 * 60 * 24)) : 'N/A';
      return `${b.bugNumber},${b.priority},${b.severity},${b.status},${daysToRes}`;
    }),
  ];

  return csv.join('\n');
}

/**
 * Export comprehensive analytics dashboard to CSV
 */
export async function generateAnalyticsDashboardCSV(projectId) {
  const [testCases, testRuns, bugs, executions] = await Promise.all([
    prisma.testCase.count({ where: { projectId, isDeleted: false } }),
    prisma.testRun.count({ where: { projectId } }),
    prisma.defect.count({ where: { projectId } }),
    prisma.testExecution.findMany({ where: { testRun: { projectId } }, select: { status: true } }),
  ]);

  const passed = executions.filter((e) => e.status === 'PASSED').length;
  const failed = executions.filter((e) => e.status === 'FAILED').length;
  const passRate = executions.length > 0 ? ((passed / executions.length) * 100).toFixed(2) : 0;
  const defectDensity = testCases > 0 ? (bugs / testCases).toFixed(2) : 0;

  const csv = [
    'PROJECT ANALYTICS DASHBOARD',
    `Generated,${new Date().toISOString()}`,
    '',
    'PROJECT METRICS',
    'Total Test Cases,' + testCases,
    'Total Test Runs,' + testRuns,
    'Total Executions,' + executions.length,
    'Total Bugs,' + bugs,
    '',
    'EXECUTION METRICS',
    'Passed,' + passed,
    'Failed,' + failed,
    'Pass Rate,' + passRate + '%',
    'Defect Density (bugs/test case),' + defectDensity,
  ];

  return csv.join('\n');
}

/**
 * Generate test execution report as PDF
 */
export async function generateExecutionPDF(testRunId) {
  const report = await prisma.testRun.findUnique({
    where: { id: testRunId },
    include: {
      project: { select: { name: true } },
      executor: { select: { name: true } },
      executions: {
        include: {
          testCase: {
            select: { id: true, name: true, type: true, priority: true, severity: true },
          },
        },
      },
    },
  });

  if (!report) {
    throw new Error('Test run not found');
  }

  const passed = report.executions.filter((e) => e.status === 'PASSED').length;
  const failed = report.executions.filter((e) => e.status === 'FAILED').length;
  const blocked = report.executions.filter((e) => e.status === 'BLOCKED').length;
  const skipped = report.executions.filter((e) => e.status === 'SKIPPED').length;
  const total = report.executions.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Test Execution Report', 20, yPos);
  yPos += 15;

  // Test Run Info
  doc.setFontSize(12);
  doc.text(`Test Run: ${report.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Project: ${report.project.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Executor: ${report.executor.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Environment: ${report.environment || 'N/A'}`, 20, yPos);
  yPos += 7;
  doc.text(`Build Version: ${report.buildVersion || 'N/A'}`, 20, yPos);
  yPos += 10;

  // Summary Box
  doc.setFontSize(14);
  doc.text('Execution Summary', 20, yPos);
  yPos += 8;
  doc.setFontSize(11);
  doc.text(`Total Test Cases: ${total}`, 25, yPos);
  yPos += 6;
  doc.setTextColor(40, 167, 69);
  doc.text(`Passed: ${passed}`, 25, yPos);
  yPos += 6;
  doc.setTextColor(220, 53, 69);
  doc.text(`Failed: ${failed}`, 25, yPos);
  yPos += 6;
  doc.setTextColor(255, 193, 7);
  doc.text(`Blocked: ${blocked}`, 25, yPos);
  yPos += 6;
  doc.setTextColor(108, 117, 125);
  doc.text(`Skipped: ${skipped}`, 25, yPos);
  yPos += 6;
  doc.setTextColor(0, 123, 255);
  doc.text(`Pass Rate: ${passRate}%`, 25, yPos);
  yPos += 12;

  // Failed Tests
  if (failed > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Failed Test Cases', 20, yPos);
    yPos += 8;
    doc.setFontSize(9);

    report.executions
      .filter((e) => e.status === 'FAILED')
      .forEach((exec, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. ${exec.testCase.name} (${exec.testCase.priority})`, 25, yPos);
        yPos += 5;
      });
  }

  return doc.output('arraybuffer');
}

/**
 * Generate test execution report as Excel
 */
export async function generateExecutionExcel(testRunId) {
  const report = await prisma.testRun.findUnique({
    where: { id: testRunId },
    include: {
      project: { select: { name: true } },
      executor: { select: { name: true } },
      executions: {
        include: {
          testCase: {
            select: { id: true, name: true, type: true, priority: true, severity: true },
          },
          steps: { select: { status: true } },
        },
      },
    },
  });

  if (!report) {
    throw new Error('Test run not found');
  }

  const workbook = new ExcelJS.Workbook();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  const total = report.executions.length;
  const passed = report.executions.filter((e) => e.status === 'PASSED').length;
  const failed = report.executions.filter((e) => e.status === 'FAILED').length;
  const blocked = report.executions.filter((e) => e.status === 'BLOCKED').length;
  const skipped = report.executions.filter((e) => e.status === 'SKIPPED').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

  summarySheet.addRows([
    { metric: 'Test Run Name', value: report.name },
    { metric: 'Project', value: report.project.name },
    { metric: 'Executor', value: report.executor.name },
    { metric: 'Environment', value: report.environment || 'N/A' },
    { metric: 'Build Version', value: report.buildVersion || 'N/A' },
    { metric: '', value: '' },
    { metric: 'Total Test Cases', value: total },
    { metric: 'Passed', value: passed },
    { metric: 'Failed', value: failed },
    { metric: 'Blocked', value: blocked },
    { metric: 'Skipped', value: skipped },
    { metric: 'Pass Rate', value: `${passRate}%` },
  ]);

  // Style header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  summarySheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Executions Sheet
  const execSheet = workbook.addWorksheet('Test Executions');
  execSheet.columns = [
    { header: 'Test Case ID', key: 'id', width: 12 },
    { header: 'Test Case Name', key: 'name', width: 40 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Passed Steps', key: 'passedSteps', width: 12 },
    { header: 'Failed Steps', key: 'failedSteps', width: 12 },
    { header: 'Total Steps', key: 'totalSteps', width: 12 },
  ];

  report.executions.forEach((exec) => {
    const passedSteps = exec.steps.filter((s) => s.status === 'PASSED').length;
    const failedSteps = exec.steps.filter((s) => s.status === 'FAILED').length;

    execSheet.addRow({
      id: exec.testCase.id,
      name: exec.testCase.name,
      type: exec.testCase.type,
      priority: exec.testCase.priority,
      severity: exec.testCase.severity,
      status: exec.status,
      passedSteps: passedSteps,
      failedSteps: failedSteps,
      totalSteps: exec.steps.length,
    });
  });

  // Style header
  execSheet.getRow(1).font = { bold: true };
  execSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  execSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Color code status column
  execSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const statusCell = row.getCell('status');
      const status = statusCell.value;
      if (status === 'PASSED') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC6EFCE' },
        };
      } else if (status === 'FAILED') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' },
        };
      }
    }
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Generate tester performance report as PDF
 */
export async function generateTesterPerformancePDF(userId, weeks = 4) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const [user, executions, bugs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.testExecution.findMany({
      where: { executedBy: userId, createdAt: { gte: startDate } },
      include: {
        testCase: { select: { type: true } },
      },
    }),
    prisma.defect.findMany({
      where: { reporterId: userId, createdAt: { gte: startDate } },
      select: { bugNumber: true, priority: true, severity: true },
    }),
  ]);

  const passed = executions.filter((e) => e.status === 'PASSED').length;
  const failed = executions.filter((e) => e.status === 'FAILED').length;
  const passRate = executions.length > 0 ? ((passed / executions.length) * 100).toFixed(2) : 0;

  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Tester Performance Report', 20, yPos);
  yPos += 15;

  // Tester Info
  doc.setFontSize(12);
  doc.text(`Tester: ${user?.name || 'Unknown'}`, 20, yPos);
  yPos += 7;
  doc.text(`Email: ${user?.email || 'N/A'}`, 20, yPos);
  yPos += 7;
  doc.text(`Period: Last ${weeks} weeks`, 20, yPos);
  yPos += 7;
  doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 12;

  // Execution Metrics
  doc.setFontSize(14);
  doc.text('Execution Metrics', 20, yPos);
  yPos += 8;
  doc.setFontSize(11);
  doc.text(`Total Executions: ${executions.length}`, 25, yPos);
  yPos += 6;
  doc.setTextColor(40, 167, 69);
  doc.text(`Passed: ${passed}`, 25, yPos);
  yPos += 6;
  doc.setTextColor(220, 53, 69);
  doc.text(`Failed: ${failed}`, 25, yPos);
  yPos += 6;
  doc.setTextColor(0, 123, 255);
  doc.text(`Pass Rate: ${passRate}%`, 25, yPos);
  yPos += 6;
  doc.setTextColor(0, 0, 0);
  doc.text(`Bugs Reported: ${bugs.length}`, 25, yPos);
  yPos += 6;
  const bugDetectionRate = executions.length > 0 ? ((bugs.length / executions.length) * 100).toFixed(2) : 0;
  doc.text(`Bug Detection Rate: ${bugDetectionRate}%`, 25, yPos);

  return doc.output('arraybuffer');
}

export default {
  generateEnhancedExecutionCSV,
  generateEnhancedBugReportCSV,
  generateTesterPerformanceCSV,
  generateDeveloperPerformanceCSV,
  generateAnalyticsDashboardCSV,
  generateExecutionPDF,
  generateExecutionExcel,
  generateTesterPerformancePDF,
};
