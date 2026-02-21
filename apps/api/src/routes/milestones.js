/**
 * MILESTONE ROUTES
 * 8 endpoints for creating, managing, and tracking milestones
 */

import {
  createMilestone,
  getProjectMilestones,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
  assignTestCasesToMilestone,
  assignDefectsToMilestone,
  removeTestCasesFromMilestone,
  getMilestoneProgress,
  getProjectMilestonesSummary,
} from '../services/milestoneService.js';
import { createAuthGuards } from '../lib/rbac.js';
import { errorResponse, bearerAuth, paginationParams } from '../schemas/common.js';

const { requireAuth, requireProjectRole } = createAuthGuards();

// Swagger schemas
const milestoneObject = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    projectId: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] },
    targetStartDate: { type: 'string', format: 'date-time' },
    targetEndDate: { type: 'string', format: 'date-time' },
    actualStartDate: { type: 'string', format: 'date-time' },
    actualEndDate: { type: 'string', format: 'date-time' },
    completionPercent: { type: 'number' },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    notes: { type: 'string' },
    creator: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const createMilestoneSchema = {
  tags: ['milestones'],
  summary: 'Create a new milestone',
  description: 'Create a new milestone in a project',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', description: 'Milestone name' },
      description: { type: 'string', description: 'Detailed description' },
      targetStartDate: { type: 'string', format: 'date-time', description: 'Target start date' },
      targetEndDate: { type: 'string', format: 'date-time', description: 'Target end date' },
      priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
      notes: { type: 'string', description: 'Additional notes' },
    },
  },
  response: {
    201: {
      description: 'Milestone created successfully',
      ...milestoneObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getMilestonesSchema = {
  tags: ['milestones'],
  summary: 'Get milestones for a project',
  description: 'Retrieve all milestones in a project with filtering and sorting',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      ...paginationParams,
      status: { type: 'string', description: 'Filter by status' },
      priority: { type: 'string', description: 'Filter by priority' },
      search: { type: 'string', description: 'Search by name or description' },
      sortBy: { type: 'string', description: 'Sort field', default: 'targetEndDate' },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
    },
  },
  response: {
    200: {
      description: 'Milestones retrieved successfully',
      type: 'object',
      properties: {
        data: { type: 'array', items: milestoneObject },
        total: { type: 'number' },
        skip: { type: 'number' },
        take: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getMilestoneSchema = {
  tags: ['milestones'],
  summary: 'Get milestone details',
  description: 'Retrieve a specific milestone with all related test cases and defects',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      milestoneId: { type: 'string', description: 'Milestone ID' },
    },
  },
  response: {
    200: {
      description: 'Milestone retrieved successfully',
      type: 'object',
      properties: {
        ...milestoneObject.properties,
        progress: {
          type: 'object',
          properties: {
            overall: { type: 'number', description: 'Overall completion percentage' },
            testCases: { type: 'number', description: 'Test case completion percentage' },
            defects: { type: 'number', description: 'Defect resolution percentage' },
            totalTestCases: { type: 'number' },
            completedTestCases: { type: 'number' },
            totalDefects: { type: 'number' },
            resolvedDefects: { type: 'number' },
          },
        },
        testCases: { type: 'array' },
        defects: { type: 'array' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const updateMilestoneSchema = {
  tags: ['milestones'],
  summary: 'Update a milestone',
  description: 'Update milestone details',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      milestoneId: { type: 'string', description: 'Milestone ID' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] },
      targetStartDate: { type: 'string', format: 'date-time' },
      targetEndDate: { type: 'string', format: 'date-time' },
      priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      notes: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Milestone updated successfully',
      ...milestoneObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const deleteMilestoneSchema = {
  tags: ['milestones'],
  summary: 'Delete a milestone',
  description: 'Delete a milestone (unassigns all related items)',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      milestoneId: { type: 'string', description: 'Milestone ID' },
    },
  },
  response: {
    200: {
      description: 'Milestone deleted successfully',
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const assignItemsSchema = {
  tags: ['milestones'],
  summary: 'Assign items to milestone',
  description: 'Assign test cases or defects to a milestone',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      milestoneId: { type: 'string', description: 'Milestone ID' },
    },
  },
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: { type: 'array', items: { type: 'number' }, description: 'IDs of items to assign' },
    },
  },
  response: {
    200: {
      description: 'Items assigned successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        assigned: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const progressSchema = {
  tags: ['milestones'],
  summary: 'Get milestone progress',
  description: 'Get the completion progress of a milestone',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      milestoneId: { type: 'string', description: 'Milestone ID' },
    },
  },
  response: {
    200: {
      description: 'Progress retrieved successfully',
      type: 'object',
      properties: {
        overall: { type: 'number' },
        testCases: { type: 'number' },
        defects: { type: 'number' },
        totalTestCases: { type: 'number' },
        completedTestCases: { type: 'number' },
        totalDefects: { type: 'number' },
        resolvedDefects: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const summarySchema = {
  tags: ['milestones'],
  summary: 'Get project milestones summary',
  description: 'Get a summary of all milestones in a project',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  response: {
    200: {
      description: 'Summary retrieved successfully',
      type: 'object',
      properties: {
        totalMilestones: { type: 'number' },
        completedMilestones: { type: 'number' },
        activeMilestones: { type: 'number' },
        statusBreakdown: { type: 'object' },
        priorityDistribution: { type: 'object' },
        totalTestCases: { type: 'number' },
        totalDefects: { type: 'number' },
        milestonesWithDueDate: { type: 'number' },
        overdueCount: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

async function milestoneRoutes(fastify) {
  // Create milestone
  fastify.post(
    '/:projectId/milestones',
    { schema: createMilestoneSchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);
        await requireProjectRole(request, reply, 'PROJECT_MANAGER');

        const { projectId } = request.params;
        const milestone = await createMilestone(request.body, request.user.id);

        reply.code(201).send(milestone);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get all milestones for project
  fastify.get(
    '/:projectId/milestones',
    { schema: getMilestonesSchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);

        const { projectId } = request.params;
        const { skip, take, status, priority, search, sortBy, sortOrder } = request.query;

        const result = await getProjectMilestones(
          projectId,
          { status, priority, search, sortBy, sortOrder },
          { skip, take }
        );

        reply.send(result);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get single milestone
  fastify.get(
    '/:projectId/milestones/:milestoneId',
    { schema: getMilestoneSchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);

        const milestone = await getMilestoneById(request.params.milestoneId);
        reply.send(milestone);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Update milestone
  fastify.patch(
    '/:projectId/milestones/:milestoneId',
    { schema: updateMilestoneSchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);
        await requireProjectRole(request, reply, 'PROJECT_MANAGER');

        const { milestoneId } = request.params;
        const updated = await updateMilestone(milestoneId, request.body, request.user.id);

        reply.send(updated);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Delete milestone
  fastify.delete(
    '/:projectId/milestones/:milestoneId',
    { schema: deleteMilestoneSchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);
        await requireProjectRole(request, reply, 'PROJECT_MANAGER');

        const { milestoneId } = request.params;
        await deleteMilestone(milestoneId, request.user.id);

        reply.send({ success: true });
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Assign test cases to milestone
  fastify.post(
    '/:projectId/milestones/:milestoneId/assign-test-cases',
    { schema: assignItemsSchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);
        await requireProjectRole(request, reply, 'PROJECT_MANAGER');

        const { milestoneId } = request.params;
        const { ids } = request.body;

        await assignTestCasesToMilestone(milestoneId, ids, request.user.id);
        reply.send({ success: true, assigned: ids.length });
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Assign defects to milestone
  fastify.post(
    '/:projectId/milestones/:milestoneId/assign-defects',
    { schema: assignItemsSchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);
        await requireProjectRole(request, reply, 'PROJECT_MANAGER');

        const { milestoneId } = request.params;
        const { ids } = request.body;

        await assignDefectsToMilestone(milestoneId, ids, request.user.id);
        reply.send({ success: true, assigned: ids.length });
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get milestone progress
  fastify.get(
    '/:projectId/milestones/:milestoneId/progress',
    { schema: progressSchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);

        const { milestoneId } = request.params;
        const progress = await getMilestoneProgress(milestoneId);

        reply.send(progress);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get project milestones summary
  fastify.get(
    '/:projectId/milestones-summary',
    { schema: summarySchema },
    async (request, reply) => {
      try {
        await requireAuth(request, reply);

        const { projectId } = request.params;
        const summary = await getProjectMilestonesSummary(projectId);

        reply.send(summary);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );
}

export default milestoneRoutes;
