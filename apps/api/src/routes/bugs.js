/**
 * BUG/DEFECT MANAGEMENT ROUTES
 * Complete bug lifecycle management for testers and developers
 */

import { createAuthGuards } from '../lib/rbac.js';
import { getPrismaClient } from '../lib/prisma.js';
import {
  createBugFromExecution,
  updateBug,
  changeBugStatus,
  assignBug,
  addBugComment,
  getBugDetails,
  getProjectBugs,
  requestBugRetest,
} from '../services/bugService.js';
import { bugObject, errorResponse, bearerAuth, paginationParams } from '../schemas/common.js';

// Bug Swagger schemas
const createBugSchema = {
  tags: ['bugs'],
  summary: 'Create a new bug',
  description: 'Create a bug from a failed test execution',
  params: { projectId: { type: 'string', description: 'Project ID' } },
  body: {
    type: 'object',
    required: ['title', 'description', 'environment'],
    properties: {
      title: { type: 'string', description: 'Bug title' },
      description: { type: 'string', description: 'Detailed description' },
      priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3', 'P4'], description: 'Priority level (P0=highest to P4=lowest)' },
      severity: { type: 'string', enum: ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'], description: 'Severity level' },
      environment: { type: 'string', enum: ['DEVELOPMENT', 'STAGING', 'UAT', 'PRODUCTION'] },
      stepsToReproduce: { type: 'string' },
      expectedBehavior: { type: 'string' },
      actualBehavior: { type: 'string' },
      attachments: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    201: {
      description: 'Bug created successfully',
      ...bugObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getBugsSchema = {
  tags: ['bugs'],
  summary: 'Get bugs for a project',
  description: 'Retrieve all bugs in a project with optional filtering and pagination',
  params: { projectId: { type: 'string', description: 'Project ID' } },
  querystring: {
    type: 'object',
    properties: {
      ...paginationParams,
      status: { type: 'string', description: 'Filter by status' },
      priority: { type: 'string', description: 'Filter by priority' },
      severity: { type: 'string', description: 'Filter by severity' },
      assigneeId: { type: 'string', description: 'Filter by assignee' },
      reporterId: { type: 'string', description: 'Filter by reporter' },
      search: { type: 'string', description: 'Search in title and description' },
    },
  },
  response: {
    200: {
      description: 'Bugs retrieved successfully',
      type: 'object',
      properties: {
        data: { type: 'array', items: bugObject },
        total: { type: 'number' },
        skip: { type: 'number' },
        take: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getBugSchema = {
  tags: ['bugs'],
  summary: 'Get a specific bug',
  description: 'Retrieve detailed information about a single bug',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    bugId: { type: 'string', description: 'Bug ID' },
  },
  response: {
    200: {
      description: 'Bug details',
      ...bugObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const updateBugSchema = {
  tags: ['bugs'],
  summary: 'Update a bug',
  description: 'Update bug details (title, description, priority, etc.)',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    bugId: { type: 'string', description: 'Bug ID' },
  },
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3', 'P4'] },
      severity: { type: 'string', enum: ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] },
      stepsToReproduce: { type: 'string' },
      expectedBehavior: { type: 'string' },
      actualBehavior: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Bug updated successfully',
      ...bugObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const changeBugStatusSchema = {
  tags: ['bugs'],
  summary: 'Change bug status',
  description: 'Update bug status with workflow validation',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    bugId: { type: 'string', description: 'Bug ID' },
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
        enum: [
          'NEW',
          'ASSIGNED',
          'IN_PROGRESS',
          'FIXED',
          'AWAITING_VERIFICATION',
          'VERIFIED_FIXED',
          'REOPENED',
          'CANNOT_REPRODUCE',
          'DUPLICATE',
          'WORKS_AS_DESIGNED',
          'CLOSED',
          'DEFERRED',
          'WONTFIX',
        ],
      },
    },
  },
  response: {
    200: {
      description: 'Bug status updated successfully',
      ...bugObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const assignBugSchema = {
  tags: ['bugs'],
  summary: 'Assign bug to developer',
  description: 'Assign a bug to a developer for fixing',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    bugId: { type: 'string', description: 'Bug ID' },
  },
  body: {
    type: 'object',
    required: ['assigneeId'],
    properties: {
      assigneeId: { type: 'number', description: 'User ID of the developer' },
    },
  },
  response: {
    200: {
      description: 'Bug assigned successfully',
      ...bugObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const verifyBugFixSchema = {
  tags: ['bugs'],
  summary: 'Verify bug fix',
  description: 'Verify that a bug fix is working (Tester only)',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    bugId: { type: 'string', description: 'Bug ID' },
  },
  body: {
    type: 'object',
    required: ['verified'],
    properties: {
      verified: { type: 'boolean', description: 'Is the fix verified?' },
      notes: { type: 'string', description: 'Verification notes' },
    },
  },
  response: {
    200: {
      description: 'Bug verification completed',
      ...bugObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const reopenBugSchema = {
  tags: ['bugs'],
  summary: 'Reopen a bug',
  description: 'Mark a bug as reopened (Tester only)',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    bugId: { type: 'string', description: 'Bug ID' },
  },
  body: {
    type: 'object',
    properties: {
      reason: { type: 'string', description: 'Reason for reopening' },
    },
  },
  response: {
    200: {
      description: 'Bug reopened successfully',
      ...bugObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const addBugCommentSchema = {
  tags: ['bugs'],
  summary: 'Add comment to bug',
  description: 'Add a comment or discussion to a bug',
  params: {
    projectId: { type: 'string', description: 'Project ID' },
    bugId: { type: 'string', description: 'Bug ID' },
  },
  body: {
    type: 'object',
    required: ['body'],
    properties: {
      body: { type: 'string', description: 'Comment text' },
      isInternal: { type: 'boolean', description: 'Is this an internal note?', default: false },
    },
  },
  response: {
    201: {
      description: 'Comment added successfully',
      type: 'object',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

export async function bugRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);
  const prisma = getPrismaClient();

  function getClientContext(request) {
    return {
      ipAddress: request.ip || request.socket?.remoteAddress || null,
      userAgent: request.headers['user-agent'] || null,
    };
  }

  // ============================================
  // BUG CRUD OPERATIONS
  // ============================================

  /**
   * Create bug from failed test execution
   */
  fastify.post(
    '/api/projects/:projectId/bugs',
    { schema: createBugSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.id;

        // Validate required fields
        if (!request.body.title || !request.body.description) {
          return reply.code(400).send({ 
            error: 'Title and description are required', 
          });
        }

        if (!request.body.environment) {
          return reply.code(400).send({ 
            error: 'Environment is required (DEVELOPMENT, STAGING, UAT, PRODUCTION)', 
          });
        }

        const validEnvironments = ['DEVELOPMENT', 'STAGING', 'UAT', 'PRODUCTION'];
        if (!validEnvironments.includes(request.body.environment)) {
          return reply.code(400).send({ 
            error: `Invalid environment. Must be one of: ${validEnvironments.join(', ')}`, 
          });
        }

        const bug = await createBugFromExecution(
          {
            ...request.body,
            projectId: Number(projectId),
          },
          userId,
        );

        reply.code(201).send(bug);
      } catch (error) {
        console.error('Error creating bug:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Get bugs for project with filters
   */
  fastify.get(
    '/api/projects/:projectId/bugs',
    { schema: getBugsSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        
        const filters = {
          status: request.query.status,
          priority: request.query.priority,
          severity: request.query.severity,
          assigneeId: request.query.assigneeId,
          reporterId: request.query.reporterId,
          search: request.query.search,
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 50,
        };

        const result = await getProjectBugs(Number(projectId), filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching bugs:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  /**
   * Get single bug details
   */
  fastify.get(
    '/api/projects/:projectId/bugs/:bugId',
    { schema: getBugSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const bug = await getBugDetails(Number(bugId));
        reply.send(bug);
      } catch (error) {
        console.error('Error fetching bug:', error);
        reply.code(404).send({ error: error.message });
      }
    },
  );

  /**
   * Update bug details
   */
  fastify.patch(
    '/api/projects/:projectId/bugs/:bugId',
    { schema: updateBugSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const userId = request.user.id;

        const updated = await updateBug(Number(bugId), request.body, userId);
        reply.send(updated);
      } catch (error) {
        console.error('Error updating bug:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  // ============================================
  // BUG WORKFLOW OPERATIONS
  // ============================================

  /**
   * Change bug status (with workflow validation)
   */
  fastify.patch(
    '/api/projects/:projectId/bugs/:bugId/status',
    { schema: changeBugStatusSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { status } = request.body;
        const userId = request.user.id;
        const userRole = request.user.role;

        if (!status) {
          return reply.code(400).send({ error: 'Status is required' });
        }

        const updated = await changeBugStatus(
          Number(bugId),
          status,
          userId,
          userRole,
          getClientContext(request),
        );

        reply.send(updated);
      } catch (error) {
        console.error('Error changing bug status:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Assign bug to developer
   */
  fastify.patch(
    '/api/projects/:projectId/bugs/:bugId/assign',
    { schema: assignBugSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { assigneeId } = request.body;
        const userId = request.user.id;

        if (!assigneeId) {
          return reply.code(400).send({ error: 'assigneeId is required' });
        }

        const updated = await assignBug(
          Number(bugId),
          Number(assigneeId),
          userId,
        );

        reply.send(updated);
      } catch (error) {
        console.error('Error assigning bug:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Verify bug fix (TESTER only)
   */
  fastify.post(
    '/api/projects/:projectId/bugs/:bugId/verify',
    { schema: verifyBugFixSchema, preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { verified, notes } = request.body;
        const userId = request.user.id;

        if (typeof verified !== 'boolean') {
          return reply.code(400).send({ error: 'verified (boolean) is required' });
        }

        const newStatus = verified ? 'VERIFIED_FIXED' : 'REOPENED';
        const updated = await changeBugStatus(
          Number(bugId),
          newStatus,
          userId,
          'TESTER',
          getClientContext(request),
        );

        // Add verification comment
        if (notes) {
          await addBugComment(Number(bugId), notes, userId, false);
        }

        reply.send(updated);
      } catch (error) {
        console.error('Error verifying bug:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Reopen bug (TESTER only)
   */
  fastify.post(
    '/api/projects/:projectId/bugs/:bugId/reopen',
    { schema: reopenBugSchema, preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { reason } = request.body;
        const userId = request.user.id;

        const updated = await changeBugStatus(
          Number(bugId),
          'REOPENED',
          userId,
          'TESTER',
          getClientContext(request),
        );

        // Add reopen comment
        if (reason) {
          await addBugComment(Number(bugId), `Bug reopened: ${reason}`, userId, false);
        }

        reply.send(updated);
      } catch (error) {
        console.error('Error reopening bug:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  // ============================================
  // BUG COMMENTS
  // ============================================

  /**
   * Add comment to bug
   */
  fastify.post(
    '/api/projects/:projectId/bugs/:bugId/comments',
    { schema: addBugCommentSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { body, isInternal } = request.body;
        const userId = request.user.id;

        const comment = await addBugComment(
          Number(bugId),
          body,
          userId,
          isInternal || false,
        );

        reply.code(201).send(comment);
      } catch (error) {
        console.error('Error adding comment:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  // ============================================
  // BUG RETEST WORKFLOW
  // ============================================

  /**
   * Request retest for bug (DEVELOPER)
   */
  fastify.post(
    '/api/projects/:projectId/bugs/:bugId/retest-request',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { testerId } = request.body;
        const userId = request.user.id;

        if (!testerId) {
          return reply.code(400).send({ error: 'testerId is required' });
        }

        const retestRequest = await requestBugRetest(
          Number(bugId),
          userId,
          Number(testerId),
        );

        reply.code(201).send(retestRequest);
      } catch (error) {
        console.error('Error requesting retest:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Get bugs by reporter (my reported bugs)
   */
  fastify.get(
    '/api/bugs/reported',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;

        const result = await getProjectBugs(null, {
          reporterId: userId,
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 50,
        });

        reply.send({
          data: result.bugs,
          pagination: {
            totalCount: result.total,
            skip: result.skip,
            take: result.take,
          },
        });
      } catch (error) {
        console.error('Error fetching reported bugs:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  /**
   * Get bugs assigned to me
   */
  fastify.get(
    '/api/bugs/assigned',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER', 'TESTER'])] },
    async (request, reply) => {
      try {
        const userId = request.user.id;

        const result = await getProjectBugs(null, {
          assigneeId: userId,
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 50,
        });

        reply.send({
          data: result.bugs,
          pagination: {
            totalCount: result.total,
            skip: result.skip,
            take: result.take,
          },
        });
      } catch (error) {
        console.error('Error fetching assigned bugs:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // ============================================
  // CONVENIENCE ROUTES (without projectId in path)
  // ============================================

  /**
   * Get bugs list with filters (convenience route)
   */
  fastify.get(
    '/api/bugs',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const projectId = request.query.projectId;

        if (!projectId) {
          return reply.code(400).send({ error: 'projectId query parameter is required' });
        }

        const filters = {
          status: request.query.status,
          priority: request.query.priority,
          severity: request.query.severity,
          assigneeId: request.query.assigneeId,
          reporterId: request.query.reporterId,
          search: request.query.search,
          skip: request.query.page ? (Number(request.query.page) - 1) * (request.query.limit || 20) : 0,
          take: request.query.limit ? Number(request.query.limit) : 20,
        };

        const result = await getProjectBugs(Number(projectId), filters);
        
        reply.send({
          data: result.bugs,
          pagination: {
            totalCount: result.total,
            page: request.query.page || 1,
            limit: filters.take,
          },
        });
      } catch (error) {
        console.error('Error fetching bugs:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  /**
   * Get single bug details (convenience route)
   */
  fastify.get(
    '/api/bugs/:bugId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const bug = await getBugDetails(Number(bugId));
        reply.send(bug);
      } catch (error) {
        console.error('Error fetching bug:', error);
        reply.code(404).send({ error: error.message });
      }
    },
  );

  /**
   * Change bug status (convenience route)
   */
  fastify.patch(
    '/api/bugs/:bugId/status',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { newStatus, reason } = request.body;
        const userId = request.user.id;
        const userRole = request.user.role;

        if (!newStatus) {
          return reply.code(400).send({ error: 'newStatus is required' });
        }

        const updated = await changeBugStatus(
          Number(bugId),
          newStatus,
          userId,
          userRole,
          getClientContext(request),
        );

        // Add status change comment if reason provided
        if (reason) {
          await addBugComment(
            Number(bugId),
            `Status changed to ${newStatus}: ${reason}`,
            userId,
            false,
          );
        }

        reply.send(updated);
      } catch (error) {
        console.error('Error changing bug status:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Add comment to bug (convenience route)
   */
  fastify.post(
    '/api/bugs/:bugId/comments',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { body, isInternal } = request.body;
        const userId = request.user.id;

        const comment = await addBugComment(
          Number(bugId),
          body,
          userId,
          isInternal || false,
        );

        reply.code(201).send(comment);
      } catch (error) {
        console.error('Error adding comment:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Request retest for bug (convenience route)
   */
  fastify.post(
    '/api/bugs/:bugId/retest-request',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { testerId, notes } = request.body;
        const userId = request.user.id;

        if (!testerId) {
          return reply.code(400).send({ 
            error: 'testerId is required for retest request', 
          });
        }

        const retestRequest = await requestBugRetest(
          Number(bugId),
          userId,
          Number(testerId),
        );

        // Add note as comment if provided
        if (notes && notes.trim()) {
          await addBugComment(
            Number(bugId),
            `Re-test requested: ${notes}`,
            userId,
            false,
          );
        }

        reply.code(201).send(retestRequest);
      } catch (error) {
        console.error('Error requesting retest:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Link commit to bug
   */
  fastify.patch(
    '/api/bugs/:bugId/link-commit',
    { preHandler: [requireAuth, requireRoles(['DEVELOPER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { commitHash, branchName, codeReviewUrl } = request.body;
        const userId = request.user.id;

        if (!commitHash) {
          return reply.code(400).send({ error: 'commitHash is required' });
        }

        const updated = await prisma.defect.update({
          where: { id: Number(bugId) },
          data: {
            fixedInCommitHash: commitHash,
            fixBranchName: branchName || null,
            codeReviewUrl: codeReviewUrl || null,
            updatedBy: userId,
          },
          include: {
            reporter: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
          },
        });

        // Create history entries
        await Promise.all([
          prisma.defectHistory.create({
            data: {
              defectId: Number(bugId),
              fieldName: 'fixedInCommitHash',
              oldValue: '',
              newValue: commitHash,
              changedBy: userId,
            },
          }),
          branchName && prisma.defectHistory.create({
            data: {
              defectId: Number(bugId),
              fieldName: 'fixBranchName',
              oldValue: '',
              newValue: branchName,
              changedBy: userId,
            },
          }),
        ]);

        reply.send(updated);
      } catch (error) {
        console.error('Error linking commit:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );

  /**
   * Assign bug to developer (convenience route)
   */
  fastify.patch(
    '/api/bugs/:bugId/assign',
    { preHandler: [requireAuth, requireRoles(['ADMIN', 'DEVELOPER', 'TESTER'])] },
    async (request, reply) => {
      try {
        const { bugId } = request.params;
        const { assigneeId, reason } = request.body;
        const userId = request.user.id;

        if (!assigneeId) {
          return reply.code(400).send({ error: 'assigneeId is required' });
        }

        const updated = await assignBug(
          Number(bugId),
          Number(assigneeId),
          userId,
        );

        // Add assignment comment if reason provided
        if (reason) {
          await addBugComment(
            Number(bugId),
            `Assigned: ${reason}`,
            userId,
            false,
          );
        }

        reply.send(updated);
      } catch (error) {
        console.error('Error assigning bug:', error);
        reply.code(400).send({ error: error.message });
      }
    },
  );
}

export default bugRoutes;
