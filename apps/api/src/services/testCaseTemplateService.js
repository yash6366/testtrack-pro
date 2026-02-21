/**
 * TEST CASE TEMPLATE SERVICE
 * Handles template CRUD, creating test cases from templates, and template management
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import { assertPermissionContext } from '../lib/policy.js';

const prisma = getPrismaClient();

/**
 * Create a new test case template
 * @param {Object} data - Template data
 * @param {number} userId - Creator user ID
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Created template
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function createTestCaseTemplate(data, userId, auditContext = {}, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }

  const {
    projectId,
    name,
    description,
    category,
    type = 'FUNCTIONAL',
    priority = 'P2',
    severity = 'MINOR',
    preconditions,
    testData,
    environment,
    moduleArea,
    tags = [],
    templateSteps = [],
  } = data;

  // Validate required fields
  if (!projectId || !name) {
    throw new Error('ProjectId and name are required');
  }

  assertPermissionContext(permissionContext, 'testPlan:create', { projectId: Number(projectId) });

  // Check if template with same name exists in project
  const existing = await prisma.testCaseTemplate.findFirst({
    where: {
      projectId: Number(projectId),
      name,
    },
  });

  if (existing) {
    throw new Error('Template with this name already exists in project');
  }

  // Create template with steps
  const template = await prisma.testCaseTemplate.create({
    data: {
      projectId: Number(projectId),
      name,
      description: description || null,
      category: category || null,
      type,
      priority,
      severity,
      preconditions: preconditions || null,
      testData: testData || null,
      environment: environment || null,
      moduleArea: moduleArea || null,
      tags: tags.length > 0 ? tags : [],
      createdBy: userId,
      templateSteps: {
        create: templateSteps.map((step, index) => ({
          stepNumber: index + 1,
          action: step.action,
          expectedResult: step.expectedResult,
          notes: step.notes || null,
        })),
      },
    },
    include: {
      templateSteps: {
        orderBy: { stepNumber: 'asc' },
      },
      creator: { select: { id: true, name: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'ADMIN_ACTION', {
    resourceType: 'TESTCASE_TEMPLATE',
    resourceId: template.id,
    resourceName: template.name,
    projectId: template.projectId,
    description: `Created test case template: ${template.name}`,
    newValues: JSON.stringify({
      name: template.name,
      category: template.category,
      stepCount: template.templateSteps.length,
    }),
    ...auditContext,
  });

  return template;
}

/**
 * Update test case template
 * @param {number} templateId - Template ID
 * @param {Object} updates - Fields to update
 * @param {number} userId - Editor user ID
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<Object>} Updated template
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function updateTestCaseTemplate(templateId, updates, userId, auditContext = {}, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }

  const existing = await prisma.testCaseTemplate.findUnique({
    where: { id: templateId },
    include: { templateSteps: true },
  });

  if (!existing) {
    throw new Error('Template not found');
  }

  assertPermissionContext(permissionContext, 'testPlan:edit', { projectId: existing.projectId });

  const {
    name,
    description,
    category,
    type,
    priority,
    severity,
    preconditions,
    testData,
    environment,
    moduleArea,
    tags,
    templateSteps,
    isActive,
  } = updates;

  // Update template
  const updated = await prisma.testCaseTemplate.update({
    where: { id: templateId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(type && { type }),
      ...(priority && { priority }),
      ...(severity && { severity }),
      ...(preconditions !== undefined && { preconditions }),
      ...(testData !== undefined && { testData }),
      ...(environment !== undefined && { environment }),
      ...(moduleArea !== undefined && { moduleArea }),
      ...(tags !== undefined && { tags }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      templateSteps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
  });

  // Update template steps if provided
  if (templateSteps && Array.isArray(templateSteps)) {
    // Delete existing steps
    await prisma.templateStep.deleteMany({
      where: { templateId },
    });

    // Create new steps
    await Promise.all(
      templateSteps.map((step, index) =>
        prisma.templateStep.create({
          data: {
            templateId,
            stepNumber: index + 1,
            action: step.action,
            expectedResult: step.expectedResult,
            notes: step.notes || null,
          },
        })
      )
    );
  }

  // Audit log
  await logAuditAction(userId, 'ADMIN_ACTION', {
    resourceType: 'TESTCASE_TEMPLATE',
    resourceId: templateId,
    resourceName: updated.name,
    projectId: updated.projectId,
    description: `Updated test case template: ${updated.name}`,
    ...auditContext,
  });

  return updated;
}

/**
 * Delete test case template
 * @param {number} templateId - Template ID
 * @param {number} userId - User deleting
 * @param {Object} auditContext - Audit context
 * @param {Object} permissionContext - Permission context from authorization layer
 * @returns {Promise<boolean>} Success status
 * @throws {Error} If permissionContext is invalid or missing
 */
export async function deleteTestCaseTemplate(templateId, userId, auditContext = {}, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }

  const template = await prisma.testCaseTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  assertPermissionContext(permissionContext, 'testPlan:delete', { projectId: template.projectId });

  await prisma.testCaseTemplate.delete({
    where: { id: templateId },
  });

  // Audit log
  await logAuditAction(userId, 'ADMIN_ACTION', {
    resourceType: 'TESTCASE_TEMPLATE',
    resourceId: templateId,
    resourceName: template.name,
    projectId: template.projectId,
    description: `Deleted test case template: ${template.name}`,
    ...auditContext,
  });

  return true;
}

/**
 * Get project templates with filters
 * @param {number} projectId - Project ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Templates
 */
export async function getProjectTemplates(projectId, filters = {}) {
  const { category, isActive = true, skip = 0, take = 50 } = filters;

  const where = {
    projectId: Number(projectId),
    ...(category && { category }),
    ...(isActive !== undefined && { isActive }),
  };

  const [templates, total] = await Promise.all([
    prisma.testCaseTemplate.findMany({
      where,
      include: {
        templateSteps: {
          select: {
            id: true,
            stepNumber: true,
            action: true,
            expectedResult: true,
          },
          orderBy: { stepNumber: 'asc' },
        },
        creator: { select: { id: true, name: true } },
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.testCaseTemplate.count({ where }),
  ]);

  return { templates, total, skip, take };
}

/**
 * Get single template by ID
 * @param {number} templateId - Template ID
 * @returns {Promise<Object>} Template
 */
export async function getTemplateById(templateId) {
  const template = await prisma.testCaseTemplate.findUnique({
    where: { id: templateId },
    include: {
      templateSteps: {
        orderBy: { stepNumber: 'asc' },
      },
      creator: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  return template;
}

/**
 * Create test case from template
 * @param {number} templateId - Template ID
 * @param {number} projectId - Target project ID
 * @param {string} testCaseName - New test case name
 * @param {number} userId - Creator user ID
 * @returns {Promise<Object>} Created test case
 */
export async function createTestCaseFromTemplate(templateId, projectId, testCaseName, userId, auditContext = {}) {
  const template = await prisma.testCaseTemplate.findUnique({
    where: { id: templateId },
    include: {
      templateSteps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  if (!template.isActive) {
    throw new Error('Cannot create from inactive template');
  }

  // Check if test case with same name exists
  const existing = await prisma.testCase.findFirst({
    where: {
      projectId: Number(projectId),
      name: testCaseName,
      isDeleted: false,
    },
  });

  if (existing) {
    throw new Error('Test case with this name already exists in project');
  }

  // Create test case from template
  const testCase = await prisma.testCase.create({
    data: {
      projectId: Number(projectId),
      name: testCaseName,
      description: template.description,
      preconditions: template.preconditions,
      testData: template.testData,
      environment: template.environment,
      type: template.type,
      priority: template.priority,
      severity: template.severity,
      status: 'DRAFT',
      moduleArea: template.moduleArea,
      tags: template.tags,
      createdBy: userId,
      lastModifiedBy: userId,
      steps: {
        create: template.templateSteps.map((step) => ({
          stepNumber: step.stepNumber,
          action: step.action,
          expectedResult: step.expectedResult,
          notes: step.notes,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      creator: { select: { id: true, name: true } },
    },
  });

  // Audit log
  await logAuditAction(userId, 'TESTCASE_CREATED', {
    resourceType: 'TESTCASE',
    resourceId: testCase.id,
    resourceName: testCase.name,
    projectId: testCase.projectId,
    description: `Created test case from template: ${template.name}`,
    newValues: JSON.stringify({
      fromTemplate: templateId,
      templateName: template.name,
    }),
    ...auditContext,
  });

  return testCase;
}

export default {
  createTestCaseTemplate,
  updateTestCaseTemplate,
  deleteTestCaseTemplate,
  getProjectTemplates,
  getTemplateById,
  createTestCaseFromTemplate,
};
