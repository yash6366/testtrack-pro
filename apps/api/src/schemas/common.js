/**
 * Common Swagger/OpenAPI schemas and definitions used across routes
 */

// Error response schemas
export const errorResponse = {
  400: {
    description: 'Bad Request',
    type: 'object',
    properties: {
      error: { type: 'string' },
      statusCode: { type: 'number' },
    },
  },
  401: {
    description: 'Unauthorized',
    type: 'object',
    properties: {
      error: { type: 'string' },
      statusCode: { type: 'number' },
    },
  },
  403: {
    description: 'Forbidden',
    type: 'object',
    properties: {
      error: { type: 'string' },
      statusCode: { type: 'number' },
    },
  },
  404: {
    description: 'Not Found',
    type: 'object',
    properties: {
      error: { type: 'string' },
      statusCode: { type: 'number' },
    },
  },
  500: {
    description: 'Internal Server Error',
    type: 'object',
    properties: {
      error: { type: 'string' },
      statusCode: { type: 'number' },
    },
  },
};

// Common user object schema
export const userObject = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['ADMIN', 'DEVELOPER', 'TESTER'] },
  },
};

// Common pagination schema
export const paginationParams = {
  skip: { type: 'number', description: 'Number of records to skip', default: 0 },
  take: { type: 'number', description: 'Number of records to take', default: 50 },
};

// Common pagination response wrapper
export const paginated = (itemSchema) => ({
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: itemSchema,
    },
    total: { type: 'number' },
    skip: { type: 'number' },
    take: { type: 'number' },
  },
});

// Test case schemas
export const testCaseObject = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    projectId: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
    type: { type: 'string', enum: ['FUNCTIONAL', 'PERFORMANCE', 'SECURITY', 'USABILITY'] },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    status: { type: 'string', enum: ['DRAFT', 'READY', 'IN_PROGRESS', 'COMPLETED', 'DEPRECATED'] },
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
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    deletedAt: { type: ['string', 'null'], format: 'date-time' },
  },
};

// Bug schemas
export const bugObject = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    projectId: { type: 'number' },
    title: { type: 'string' },
    description: { type: 'string' },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    severity: { type: 'string', enum: ['TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'] },
    status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'FIXED', 'VERIFIED_FIXED', 'REOPENED', 'CLOSED', 'DUPLICATE', 'WONT_FIX'] },
    environment: { type: 'string', enum: ['DEVELOPMENT', 'STAGING', 'UAT', 'PRODUCTION'] },
    assigneeId: { type: ['number', 'null'] },
    reporterId: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// Test suite schemas
export const testSuiteObject = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    projectId: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['DRAFT', 'READY', 'RUNNING', 'COMPLETED'] },
    testCaseIds: { type: 'array', items: { type: 'number' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// Common response schemas
export const successResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

export const successResponseWithData = (dataSchema) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: dataSchema,
  },
});

// Common parameter schemas
export const projectIdParam = {
  projectId: {
    type: 'string',
    description: 'Project ID',
    example: '1',
  },
};

export const idParam = (name = 'id') => ({
  [name]: {
    type: 'string',
    description: `${name} identifier`,
    example: '1',
  },
});

// Security scheme reference
export const bearerAuth = [{ bearerAuth: [] }];
