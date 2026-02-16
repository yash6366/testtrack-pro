import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';
import { errorResponse, bearerAuth, paginationParams } from '../schemas/common.js';
import * as scheduledReportService from '../services/scheduledReportService.js';

const prisma = getPrismaClient();

// Scheduled Report Swagger schemas
const createScheduledReportSchema = {
  tags: ['scheduled-reports'],
  summary: 'Create a new scheduled report',
  description: 'Create a scheduled report with defined frequency and recipients',
  params: { projectId: { type: 'string', description: 'Project ID' } },
  body: {
    type: 'object',
    required: ['name', 'frequency', 'recipientEmails'],
    properties: {
      name: { type: 'string', description: 'Report name' },
      description: { type: 'string', description: 'Report description' },
      type: {
        type: 'string',
        enum: ['EXECUTION_SUMMARY', 'DEFECT_ANALYSIS', 'MILESTONE_PROGRESS', 'TEAM_PERFORMANCE', 'REGRESSION_ANALYSIS'],
        default: 'EXECUTION_SUMMARY',
        description: 'Report type',
      },
      frequency: {
        type: 'string',
        enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY'],
        description: 'Report frequency',
      },
      dayOfWeek: { type: 'number', description: 'Day of week for weekly reports (0-6)' },
      dayOfMonth: { type: 'number', description: 'Day of month for monthly reports (1-31)' },
      time: { type: 'string', description: 'Time in HH:MM format', default: '09:00' },
      timezone: { type: 'string', description: 'Timezone', default: 'UTC' },
      recipientEmails: {
        type: 'array',
        items: { type: 'string' },
        description: 'Email addresses to send report to',
      },
      includeMetrics: { type: 'boolean', default: true },
      includeCharts: { type: 'boolean', default: true },
      includeFailures: { type: 'boolean', default: true },
      includeTestCases: { type: 'boolean', default: false },
      filterStatus: { type: 'array', items: { type: 'string' } },
      filterPriority: { type: 'array', items: { type: 'string' } },
      filterType: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    201: {
      description: 'Scheduled report created successfully',
      type: 'object',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getScheduledReportsSchema = {
  tags: ['scheduled-reports'],
  summary: 'Get all scheduled reports',
  description: 'Retrieve paginated list of scheduled reports for a project',
  params: { projectId: { type: 'string', description: 'Project ID' } },
  querystring: {
    type: 'object',
    properties: {
      ...paginationParams,
      isActive: { type: 'boolean', description: 'Filter by active status' },
    },
  },
  response: {
    200: {
      description: 'Scheduled reports retrieved successfully',
      type: 'object',
      properties: {
        data: { type: 'array' },
        total: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getScheduledReportSchema = {
  tags: ['scheduled-reports'],
  summary: 'Get a specific scheduled report',
  description: 'Retrieve detailed information about a scheduled report including delivery history',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    reportId: { type: 'string', description: 'Report ID' },
  },
  response: {
    200: {
      description: 'Scheduled report details',
      type: 'object',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const updateScheduledReportSchema = {
  tags: ['scheduled-reports'],
  summary: 'Update a scheduled report',
  description: 'Update scheduled report settings and schedule',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    reportId: { type: 'string', description: 'Report ID' },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      type: { type: 'string' },
      frequency: { type: 'string' },
      dayOfWeek: { type: 'number' },
      dayOfMonth: { type: 'number' },
      time: { type: 'string' },
      timezone: { type: 'string' },
      recipientEmails: { type: 'array', items: { type: 'string' } },
      includeMetrics: { type: 'boolean' },
      includeCharts: { type: 'boolean' },
      includeFailures: { type: 'boolean' },
      includeTestCases: { type: 'boolean' },
      filterStatus: { type: 'array' },
      filterPriority: { type: 'array' },
      filterType: { type: 'array' },
      isActive: { type: 'boolean' },
    },
  },
  response: {
    200: {
      description: 'Scheduled report updated successfully',
      type: 'object',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const deleteScheduledReportSchema = {
  tags: ['scheduled-reports'],
  summary: 'Delete a scheduled report',
  description: 'Delete a scheduled report and its delivery history',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    reportId: { type: 'string', description: 'Report ID' },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

/**
 * Register scheduled reports routes
 */
export async function registerScheduledReportsRoutes(fastify) {
  const { requireProjectAccess } = createAuthGuards(fastify);

  // Create scheduled report
  fastify.post(
    '/projects/:projectId/scheduled-reports',
    { schema: createScheduledReportSchema },
    async (request, reply) => {
      const { projectId } = request.params;
      const projectIdNum = parseInt(projectId, 10);

      await requireProjectAccess(request, projectIdNum);

      try {
        const report = await scheduledReportService.createScheduledReport(
          projectIdNum,
          request.body,
          request.user.id
        );
        return reply.code(201).send(report);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Get all scheduled reports
  fastify.get(
    '/projects/:projectId/scheduled-reports',
    { schema: getScheduledReportsSchema },
    async (request, reply) => {
      const { projectId } = request.params;
      const projectIdNum = parseInt(projectId, 10);
      const { skip = 0, take = 20, isActive } = request.query;

      await requireProjectAccess(request, projectIdNum);

      try {
        const result = await scheduledReportService.getScheduledReports(projectIdNum, {
          skip: parseInt(skip, 10),
          take: parseInt(take, 10),
          isActive: isActive ? isActive === 'true' : undefined,
        });
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Get specific scheduled report
  fastify.get(
    '/projects/:projectId/scheduled-reports/:reportId',
    { schema: getScheduledReportSchema },
    async (request, reply) => {
      const { projectId, reportId } = request.params;
      const projectIdNum = parseInt(projectId, 10);
      const reportIdNum = parseInt(reportId, 10);

      await requireProjectAccess(request, projectIdNum);

      try {
        const report = await scheduledReportService.getScheduledReport(reportIdNum, projectIdNum);
        return reply.send(report);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(error.message.includes('not found') ? 404 : 400).send({ error: error.message });
      }
    }
  );

  // Update scheduled report
  fastify.patch(
    '/projects/:projectId/scheduled-reports/:reportId',
    { schema: updateScheduledReportSchema },
    async (request, reply) => {
      const { projectId, reportId } = request.params;
      const projectIdNum = parseInt(projectId, 10);
      const reportIdNum = parseInt(reportId, 10);

      await requireProjectAccess(request, projectIdNum);

      try {
        const report = await scheduledReportService.updateScheduledReport(
          reportIdNum,
          projectIdNum,
          request.body
        );
        return reply.send(report);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(error.message.includes('not found') ? 404 : 400).send({ error: error.message });
      }
    }
  );

  // Delete scheduled report
  fastify.delete(
    '/projects/:projectId/scheduled-reports/:reportId',
    { schema: deleteScheduledReportSchema },
    async (request, reply) => {
      const { projectId, reportId } = request.params;
      const projectIdNum = parseInt(projectId, 10);
      const reportIdNum = parseInt(reportId, 10);

      await requireProjectAccess(request, projectIdNum);

      try {
        await scheduledReportService.deleteScheduledReport(reportIdNum, projectIdNum);
        return reply.code(200).send({ message: 'Scheduled report deleted successfully' });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(error.message.includes('not found') ? 404 : 400).send({ error: error.message });
      }
    }
  );
}

export default registerScheduledReportsRoutes;
