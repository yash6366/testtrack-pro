import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';
import { requirePermission } from '../lib/policy.js';
import { requireEditPermission, requireDeletePermission, validateBulkPermissions } from '../lib/testCasePermissions.js';
import {
  createTestCase,
  updateTestCase,
  deleteTestCase,
  restoreTestCase,
  cloneTestCase,
  getProjectTestCases,
  exportTestCasesToCSV,
  importTestCasesFromCSV,
} from '../services/testCaseService.js';
import {
  bulkUpdateTestCases,
  bulkDeleteTestCases,
  bulkExportTestCases,
  bulkRestoreTestCases,
} from '../services/bulkTestCaseService.js';
import {
  getProjectTemplates,
  getTemplateById,
  createTestCaseTemplate,
  updateTestCaseTemplate,
  deleteTestCaseTemplate,
  createTestCaseFromTemplate,
} from '../services/testCaseTemplateService.js';
import { testCaseObject, errorResponse, bearerAuth, paginationParams } from '../schemas/common.js';

const prisma = getPrismaClient();

// Swagger schemas for test cases
const createTestCaseSchema = {
  tags: ['test-cases'],
  summary: 'Create a new test case',
  description: 'Create a new test case in a project',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  body: {
    type: 'object',
    required: ['name', 'type', 'priority'],
    properties: {
      name: { type: 'string', description: 'Test case name' },
      description: { type: 'string', description: 'Detailed description' },
      type: { type: 'string', enum: ['FUNCTIONAL', 'REGRESSION', 'SMOKE', 'SANITY', 'INTEGRATION', 'PERFORMANCE', 'SECURITY', 'USABILITY', 'DATA'] },
      priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
      status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            stepNumber: { type: 'number' },
            action: { type: 'string' },
            expectedResult: { type: 'string' },
          },
        },
      },
    },
  },
  response: {
    201: {
      description: 'Test case created successfully',
      type: 'object',
      properties: testCaseObject.properties,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getTestCasesSchema = {
  tags: ['test-cases'],
  summary: 'Get test cases for a project',
  description: 'Retrieve all test cases in a project with optional filtering and pagination',
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
      type: { type: 'string', description: 'Filter by type' },
      priority: { type: 'string', description: 'Filter by priority' },
      status: { type: 'string', description: 'Filter by status' },
      search: { type: 'string', description: 'Search in name and description' },
      includeDeleted: { type: 'string', description: 'Include deleted test cases' },
    },
  },
  response: {
    200: {
      description: 'Test cases retrieved successfully',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: testCaseObject,
        },
        total: { type: 'number' },
        skip: { type: 'number' },
        take: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getTestCaseSchema = {
  tags: ['test-cases'],
  summary: 'Get a specific test case',
  description: 'Retrieve detailed information about a single test case',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      testCaseId: { type: 'string', description: 'Test case ID' },
    },
  },
  response: {
    200: {
      description: 'Test case details',
      ...testCaseObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const updateTestCaseSchema = {
  tags: ['test-cases'],
  summary: 'Update a test case',
  description: 'Update an existing test case',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      testCaseId: { type: 'string', description: 'Test case ID' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      type: { type: 'string', enum: ['FUNCTIONAL', 'REGRESSION', 'SMOKE', 'SANITY', 'INTEGRATION', 'PERFORMANCE', 'SECURITY', 'USABILITY', 'DATA'] },
      priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
      status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] },
      steps: { type: 'array' },
      changeNote: { type: 'string', maxLength: 500, description: 'Optional note explaining the changes made in this version' },
      automationStatus: { type: 'string', enum: ['MANUAL', 'AUTOMATED', 'SEMI_AUTOMATED'] },
    },
  },
  response: {
    200: {
      description: 'Test case updated successfully',
      ...testCaseObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const deleteTestCaseSchema = {
  tags: ['test-cases'],
  summary: 'Delete a test case',
  description: 'Soft-delete a test case (can be restored)',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      testCaseId: { type: 'string', description: 'Test case ID' },
    },
  },
  response: {
    200: {
      description: 'Test case deleted successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        testCase: testCaseObject,
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const restoreTestCaseSchema = {
  tags: ['test-cases'],
  summary: 'Restore a deleted test case',
  description: 'Restore a previously deleted test case',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      testCaseId: { type: 'string', description: 'Test case ID' },
    },
  },
  response: {
    200: {
      description: 'Test case restored successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        testCase: testCaseObject,
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const cloneTestCaseSchema = {
  tags: ['test-cases'],
  summary: 'Clone a test case',
  description: 'Create a duplicate of an existing test case',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      testCaseId: { type: 'string', description: 'Test case ID' },
    },
  },
  body: {
    type: 'object',
    required: ['newName'],
    properties: {
      newName: { type: 'string', description: 'Name for the cloned test case' },
    },
  },
  response: {
    201: {
      description: 'Test case cloned successfully',
      ...testCaseObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const exportTestCasesSchema = {
  tags: ['test-cases'],
  summary: 'Export test cases to CSV',
  description: 'Export all test cases in a project to CSV format',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  response: {
    200: {
      description: 'CSV file of test cases',
      type: 'string',
      format: 'binary',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const importTestCasesSchema = {
  tags: ['test-cases'],
  summary: 'Import test cases from CSV',
  description: 'Bulk import test cases from a CSV file',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  body: {
    type: 'object',
    required: ['csvContent'],
    properties: {
      csvContent: { type: 'string', description: 'CSV file content' },
    },
  },
  response: {
    200: {
      description: 'Test cases imported successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        importedCount: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const bulkUpdateSchema = {
  tags: ['test-cases'],
  summary: 'Bulk update test cases',
  description: 'Update multiple test cases in one operation',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  body: {
    type: 'object',
    required: ['testCaseIds'],
    properties: {
      testCaseIds: { type: 'array', items: { type: 'number' } },
      updates: { type: 'object', description: 'Fields to update' },
    },
  },
  response: {
    200: {
      description: 'Test cases updated successfully',
      type: 'object',
      properties: {
        updated: { type: 'number' },
        failed: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const bulkDeleteSchema = {
  tags: ['test-cases'],
  summary: 'Bulk delete test cases',
  description: 'Delete multiple test cases at once',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  body: {
    type: 'object',
    required: ['testCaseIds'],
    properties: {
      testCaseIds: { type: 'array', items: { type: 'number' }, description: 'IDs of test cases to delete' },
    },
  },
  response: {
    200: {
      description: 'Test cases deleted successfully',
      type: 'object',
      properties: {
        deleted: { type: 'number' },
        failed: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const bulkRestoreSchema = {
  tags: ['test-cases'],
  summary: 'Bulk restore test cases',
  description: 'Restore multiple deleted test cases at once',
  params: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
  body: {
    type: 'object',
    required: ['testCaseIds'],
    properties: {
      testCaseIds: { type: 'array', items: { type: 'number' }, description: 'IDs of test cases to restore' },
    },
  },
  response: {
    200: {
      description: 'Test cases restored successfully',
      type: 'object',
      properties: {
        restored: { type: 'number' },
        failed: { type: 'number' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

// Template schemas
const getTemplatesSchema = {
  tags: ['test-cases'],
  summary: 'Get test case templates',
  description: 'Retrieve all test case templates for a project',
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
      category: { type: 'string', description: 'Filter by category' },
      isActive: { type: 'string', description: 'Filter by active status' },
    },
  },
  response: {
    200: {
      description: 'Templates retrieved successfully',
      type: 'array',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const getTemplateSchema = {
  tags: ['test-cases'],
  summary: 'Get a specific template',
  description: 'Retrieve details of a specific template',
  params: {
    type: 'object',
    properties: {
      templateId: { type: 'string', description: 'Template ID' },
    },
  },
  response: {
    200: {
      description: 'Template retrieved successfully',
      type: 'object',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const createTemplateSchema = {
  tags: ['test-cases'],
  summary: 'Create a test case template',
  description: 'Create a new test case template',
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
      name: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      steps: { type: 'array' },
    },
  },
  response: {
    201: {
      description: 'Template created successfully',
      type: 'object',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const updateTemplateSchema = {
  tags: ['test-cases'],
  summary: 'Update a test case template',
  description: 'Update an existing template',
  params: {
    type: 'object',
    properties: {
      templateId: { type: 'string', description: 'Template ID' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      steps: { type: 'array' },
    },
  },
  response: {
    200: {
      description: 'Template updated successfully',
      type: 'object',
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const deleteTemplateSchema = {
  tags: ['test-cases'],
  summary: 'Delete a test case template',
  description: 'Delete a template',
  params: {
    type: 'object',
    properties: {
      templateId: { type: 'string', description: 'Template ID' },
    },
  },
  response: {
    200: {
      description: 'Template deleted successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

const createTestCaseFromTemplateSchema = {
  tags: ['test-cases'],
  summary: 'Create test case from template',
  description: 'Create a new test case using a template',
  params: {
    type: 'object',
    properties: {
      templateId: { type: 'string', description: 'Template ID' },
    },
  },
  body: {
    type: 'object',
    required: ['projectId', 'testCaseName'],
    properties: {
      projectId: { type: 'number', description: 'Project ID' },
      testCaseName: { type: 'string', description: 'Name for the new test case' },
    },
  },
  response: {
    201: {
      description: 'Test case created from template',
      ...testCaseObject,
    },
    ...errorResponse,
  },
  security: bearerAuth,
};

export async function testRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  function getClientContext(request) {
    return {
      ipAddress: request.ip || request.socket?.remoteAddress || null,
      userAgent: request.headers['user-agent'] || null,
    };
  }

  // ============================================
  // TEST CASE MANAGEMENT APIs
  // ============================================

  // Create test case
  fastify.post(
    '/api/projects/:projectId/test-cases',
    { schema: createTestCaseSchema, preHandler: [requirePermission('testCase:create')] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.id;

        const testCase = await createTestCase(
          {
            ...request.body,
            projectId: Number(projectId),
          },
          userId,
          getClientContext(request),
          request.permissionContext,
        );

        reply.code(201).send(testCase);
      } catch (error) {
        console.error('Error creating test case:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Get test cases for project with filters
  fastify.get(
    '/api/projects/:projectId/test-cases',
    { schema: getTestCasesSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const filters = {
          type: request.query.type,
          priority: request.query.priority,
          status: request.query.status,
          search: request.query.search,
          skip: request.query.skip ? Number(request.query.skip) : 0,
          take: request.query.take ? Number(request.query.take) : 50,
          includeDeleted: request.query.includeDeleted === 'true',
        };

        const result = await getProjectTestCases(Number(projectId), filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Get single test case
  fastify.get(
    '/api/projects/:projectId/test-cases/:testCaseId',
    { schema: getTestCaseSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseId, projectId } = request.params;

        const testCase = await prisma.testCase.findFirst({
          where: { id: Number(testCaseId), projectId: Number(projectId) },
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
            creator: { select: { id: true, name: true, email: true } },
            lastModifier: { select: { id: true, name: true, email: true } },
            deleter: { select: { id: true, name: true } },
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

        if (!testCase) {
          return reply.code(404).send({ error: 'Test case not found' });
        }

        reply.send(testCase);
      } catch (error) {
        console.error('Error fetching test case:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Update test case
  fastify.patch(
    '/api/projects/:projectId/test-cases/:testCaseId',
    { schema: updateTestCaseSchema, preHandler: [requirePermission('testCase:edit')] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const userId = request.user.id;

        const updated = await updateTestCase(
          Number(testCaseId),
          request.body,
          userId,
          getClientContext(request),
          request.permissionContext,
        );
        reply.send(updated);
      } catch (error) {
        console.error('Error updating test case:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Soft-delete test case
  fastify.delete(
    '/api/projects/:projectId/test-cases/:testCaseId',
    { schema: deleteTestCaseSchema, preHandler: [requirePermission('testCase:delete')] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const userId = request.user.id;

        const deleted = await deleteTestCase(
          Number(testCaseId),
          userId,
          getClientContext(request),
          request.permissionContext,
        );
        reply.send({ success: true, testCase: deleted });
      } catch (error) {
        console.error('Error deleting test case:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Restore deleted test case
  fastify.post(
    '/api/projects/:projectId/test-cases/:testCaseId/restore',
    { schema: restoreTestCaseSchema, preHandler: [requirePermission('testCase:create')] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const userId = request.user.id;

        const restored = await restoreTestCase(
          Number(testCaseId),
          userId,
          getClientContext(request),
          request.permissionContext,
        );
        reply.send({ success: true, testCase: restored });
      } catch (error) {
        console.error('Error restoring test case:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Clone test case
  fastify.post(
    '/api/projects/:projectId/test-cases/:testCaseId/clone',
    { schema: cloneTestCaseSchema, preHandler: [requirePermission('testCase:clone')] },
    async (request, reply) => {
      try {
        const { testCaseId } = request.params;
        const { newName } = request.body;
        const userId = request.user.id;

        if (!newName) {
          return reply.code(400).send({ error: 'newName is required for cloning' });
        }

        const cloned = await cloneTestCase(
          Number(testCaseId),
          newName,
          userId,
          getClientContext(request),
          request.permissionContext,
        );
        reply.code(201).send(cloned);
      } catch (error) {
        console.error('Error cloning test case:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // ============================================
  // VERSION HISTORY APIs
  // ============================================

  // Get version history for a test case
  fastify.get(
    '/api/projects/:projectId/test-cases/:testCaseId/versions',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseId, projectId } = request.params;

        const versions = await prisma.testCaseVersion.findMany({
          where: {
            testCaseId: Number(testCaseId),
            testCase: { projectId: Number(projectId) },
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { changedAt: 'desc' },
        });

        reply.send({ versions });
      } catch (error) {
        console.error('Error fetching version history:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Compare two versions of a test case
  fastify.get(
    '/api/projects/:projectId/test-cases/:testCaseId/versions/compare',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseId, projectId } = request.params;
        const { v1, v2 } = request.query;

        if (!v1 || !v2) {
          return reply.code(400).send({ error: 'Both v1 and v2 version IDs are required' });
        }

        const [version1, version2] = await Promise.all([
          prisma.testCaseVersion.findFirst({
            where: {
              id: Number(v1),
              testCaseId: Number(testCaseId),
              testCase: { projectId: Number(projectId) },
            },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          }),
          prisma.testCaseVersion.findFirst({
            where: {
              id: Number(v2),
              testCaseId: Number(testCaseId),
              testCase: { projectId: Number(projectId) },
            },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          }),
        ]);

        if (!version1 || !version2) {
          return reply.code(404).send({ error: 'One or both versions not found' });
        }

        // Calculate differences
        const differences = {
          name: version1.name !== version2.name,
          description: version1.description !== version2.description,
          type: version1.type !== version2.type,
          priority: version1.priority !== version2.priority,
          severity: version1.severity !== version2.severity,
          status: version1.status !== version2.status,
          automationStatus: version1.automationStatus !== version2.automationStatus,
          preconditions: version1.preconditions !== version2.preconditions,
          postconditions: version1.postconditions !== version2.postconditions,
          expectedResult: version1.expectedResult !== version2.expectedResult,
          tags: JSON.stringify(version1.tags) !== JSON.stringify(version2.tags),
          steps: JSON.stringify(version1.steps) !== JSON.stringify(version2.steps),
        };

        const hasChanges = Object.values(differences).some((changed) => changed);

        reply.send({
          version1,
          version2,
          differences,
          hasChanges,
        });
      } catch (error) {
        console.error('Error comparing versions:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Export test cases to CSV
  fastify.get(
    '/api/projects/:projectId/test-cases/export/csv',
    { schema: exportTestCasesSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;

        const csv = await exportTestCasesToCSV(Number(projectId));

        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="testcases-project-${projectId}.csv"`)
          .send(csv);
      } catch (error) {
        console.error('Error exporting test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Import test cases from CSV
  fastify.post(
    '/api/projects/:projectId/test-cases/import/csv',
    { schema: importTestCasesSchema, preHandler: [requirePermission('testCase:import')] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { csvContent } = request.body;
        const userId = request.user.id;

        if (!csvContent) {
          return reply.code(400).send({ error: 'CSV content is required' });
        }

        const results = await importTestCasesFromCSV(
          Number(projectId),
          csvContent,
          userId,
          getClientContext(request),
          request.permissionContext,
        );

        reply.send(results);
      } catch (error) {
        console.error('Error importing test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // ============================================
  // BULK OPERATIONS
  // ============================================

  // Bulk update test cases
  fastify.post(
    '/api/projects/:projectId/test-cases/bulk/update',
    { schema: bulkUpdateSchema, preHandler: [requirePermission('testCase:edit')] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const userRole = request.user.role;
        const { projectId } = request.params;
        const results = await bulkUpdateTestCases(
          { ...request.body, projectId: Number(projectId) },
          userId,
          userRole,
          getClientContext(request),
          request.permissionContext,
        );
        reply.send(results);
      } catch (error) {
        console.error('Error bulk updating test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Bulk delete test cases
  fastify.post(
    '/api/projects/:projectId/test-cases/bulk/delete',
    { schema: bulkDeleteSchema, preHandler: [requirePermission('testCase:delete')] },
    async (request, reply) => {
      try {
        const { testCaseIds } = request.body;
        const userId = request.user.id;
        const userRole = request.user.role;
        const { projectId } = request.params;

        if (!testCaseIds || testCaseIds.length === 0) {
          return reply.code(400).send({ error: 'No test cases selected' });
        }

        const results = await bulkDeleteTestCases(
          testCaseIds,
          userId,
          userRole,
          getClientContext(request),
          Number(projectId),
          request.permissionContext,
        );
        reply.send(results);
      } catch (error) {
        console.error('Error bulk deleting test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Bulk restore test cases
  fastify.post(
    '/api/projects/:projectId/test-cases/bulk/restore',
    { schema: bulkRestoreSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { testCaseIds } = request.body;
        const userId = request.user.id;
        const { projectId } = request.params;

        if (!testCaseIds || testCaseIds.length === 0) {
          return reply.code(400).send({ error: 'No test cases selected' });
        }

        const results = await bulkRestoreTestCases(
          testCaseIds,
          userId,
          getClientContext(request),
          Number(projectId),
        );
        reply.send(results);
      } catch (error) {
        console.error('Error bulk restoring test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Bulk export test cases (custom selection)
  fastify.post(
    '/api/projects/:projectId/test-cases/bulk/export',
    { schema: bulkUpdateSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const exportData = {
          projectId: Number(projectId),
          ...request.body,
        };

        const csv = await bulkExportTestCases(exportData);

        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="testcases-bulk-export-${Date.now()}.csv"`)
          .send(csv);
      } catch (error) {
        console.error('Error bulk exporting test cases:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // ============================================
  // TEST CASE TEMPLATES
  // ============================================

  // Get project templates
  fastify.get(
    '/api/projects/:projectId/templates',
    { schema: getTemplatesSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const filters = {
          category: request.query.category,
          isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : true,
        };

        const result = await getProjectTemplates(Number(projectId), filters);
        reply.send(result);
      } catch (error) {
        console.error('Error fetching templates:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Get single template
  fastify.get(
    '/api/templates/:templateId',
    { schema: getTemplateSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const template = await getTemplateById(Number(templateId));
        reply.send(template);
      } catch (error) {
        console.error('Error fetching template:', error);
        reply.code(404).send({ error: error.message });
      }
    },
  );

  // Create template
  fastify.post(
    '/api/projects/:projectId/templates',
    { schema: createTemplateSchema, preHandler: [requirePermission('testPlan:create')] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.id;

        const template = await createTestCaseTemplate(
          {
            ...request.body,
            projectId: Number(projectId),
          },
          userId,
          getClientContext(request),
          request.permissionContext,
        );

        reply.code(201).send(template);
      } catch (error) {
        console.error('Error creating template:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Update template
  fastify.patch(
    '/api/templates/:templateId',
    { schema: updateTemplateSchema, preHandler: [requirePermission('testPlan:edit')] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const userId = request.user.id;

        const updated = await updateTestCaseTemplate(
          Number(templateId),
          request.body,
          userId,
          getClientContext(request),
          request.permissionContext,
        );
        reply.send(updated);
      } catch (error) {
        console.error('Error updating template:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Delete template
  fastify.delete(
    '/api/templates/:templateId',
    { schema: deleteTemplateSchema, preHandler: [requirePermission('testPlan:delete')] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const userId = request.user.id;

        await deleteTestCaseTemplate(
          Number(templateId),
          userId,
          getClientContext(request),
          request.permissionContext,
        );
        reply.send({ success: true, message: 'Template deleted successfully' });
      } catch (error) {
        console.error('Error deleting template:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Create test case from template
  fastify.post(
    '/api/templates/:templateId/create-test-case',
    { schema: createTestCaseFromTemplateSchema, preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const { projectId, testCaseName } = request.body;
        const userId = request.user.id;

        if (!projectId || !testCaseName) {
          return reply.code(400).send({ error: 'projectId and testCaseName are required' });
        }

        const testCase = await createTestCaseFromTemplate(
          Number(templateId),
          Number(projectId),
          testCaseName,
          userId,
          getClientContext(request),
        );

        reply.code(201).send(testCase);
      } catch (error) {
        console.error('Error creating test case from template:', error);
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // ============================================
  // LEGACY ENDPOINTS (for backward compatibility)
  // ============================================

  fastify.get(
    '/api/tests/summary',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request) => {
      const userId = request.user.id;

      const [total, passed, failed] = await Promise.all([
        prisma.legacyTestRun.count({ where: { userId } }),
        prisma.legacyTestRun.count({
          where: {
            userId,
            status: { equals: 'Passed', mode: 'insensitive' },
          },
        }),
        prisma.legacyTestRun.count({
          where: {
            userId,
            status: { equals: 'Failed', mode: 'insensitive' },
          },
        }),
      ]);

      const passRate = total > 0 ? (passed / total) * 100 : 0;

      return {
        total,
        passed,
        failed,
        passRate,
      };
    },
  );

  fastify.get(
    '/api/tests/recent',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request) => {
      const userId = request.user.id;

      const tests = await prisma.legacyTestRun.findMany({
        where: { userId },
        orderBy: { executedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          passRate: true,
          executedAt: true,
        },
      });

      return { tests };
    },
  );
}

export default testRoutes;
