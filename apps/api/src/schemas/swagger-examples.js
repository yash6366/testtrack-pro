/**
 * SWAGGER SCHEMA EXAMPLES
 * 
 * This file demonstrates how to add OpenAPI/Swagger documentation to your routes.
 * Copy these patterns to document your existing endpoints.
 * 
 * Usage:
 * 1. Add a 'schema' property to your route config
 * 2. Define tags, summary, description, body, response, security
 * 3. Swagger will auto-generate documentation at /docs
 */

// Example 1: Public POST endpoint (Login)
export const loginSchema = {
  tags: ['auth'],
  summary: 'User login',
  description: 'Authenticate user with email and password, returns JWT token',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address',
        example: 'user@example.com',
      },
      password: {
        type: 'string',
        minLength: 6,
        description: 'User password',
        example: 'securePassword123',
      },
    },
  },
  response: {
    200: {
      description: 'Successful login',
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'JWT authentication token',
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['ADMIN', 'DEVELOPER', 'TESTER'],
            },
          },
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
  },
  security: [], // Public endpoint, no auth required
};

// Example 2: Protected GET endpoint (Get user profile)
export const getUserProfileSchema = {
  tags: ['auth'],
  summary: 'Get current user profile',
  description: 'Retrieve authenticated user information',
  response: {
    200: {
      description: 'User profile',
      type: 'object',
      properties: {
        id: { type: 'number' },
        email: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
        isVerified: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    401: {
      description: 'Unauthorized',
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
  },
  security: [{ bearerAuth: [] }], // Requires JWT token
};

// Example 3: POST with path params and query params
export const createTestCaseSchema = {
  tags: ['test-cases'],
  summary: 'Create a new test case',
  description: 'Create a test case within a specific project',
  params: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: {
        type: 'number',
        description: 'Project ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        description: 'Test case name',
        example: 'Login with valid credentials',
      },
      description: {
        type: 'string',
        description: 'Test case description',
      },
      type: {
        type: 'string',
        enum: ['FUNCTIONAL', 'REGRESSION', 'SMOKE', 'SANITY', 'INTEGRATION', 'PERFORMANCE', 'SECURITY', 'USABILITY', 'DATA'],
        default: 'FUNCTIONAL',
      },
      priority: {
        type: 'string',
        enum: ['P0', 'P1', 'P2', 'P3'],
        default: 'P2',
      },
      severity: {
        type: 'string',
        enum: ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'],
        default: 'MINOR',
      },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            expectedResult: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
  response: {
    201: {
      description: 'Test case created',
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        projectId: { type: 'number' },
        type: { type: 'string' },
        priority: { type: 'string' },
        severity: { type: 'string' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    400: {
      description: 'Validation error',
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

// Example 4: GET with query parameters
export const listTestCasesSchema = {
  tags: ['test-cases'],
  summary: 'List test cases',
  description: 'Retrieve paginated list of test cases with filters',
  querystring: {
    type: 'object',
    properties: {
      projectId: {
        type: 'number',
        description: 'Filter by project ID',
      },
      status: {
        type: 'string',
        enum: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'],
        description: 'Filter by status',
      },
      priority: {
        type: 'string',
        enum: ['P0', 'P1', 'P2', 'P3'],
        description: 'Filter by priority',
      },
      page: {
        type: 'number',
        default: 1,
        minimum: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        default: 20,
        minimum: 1,
        maximum: 100,
        description: 'Items per page',
      },
      search: {
        type: 'string',
        description: 'Search term',
      },
    },
  },
  response: {
    200: {
      description: 'List of test cases',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              status: { type: 'string' },
              priority: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

// Example 5: DELETE endpoint
export const deleteTestCaseSchema = {
  tags: ['test-cases'],
  summary: 'Delete test case',
  description: 'Soft delete a test case by ID',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'number',
        description: 'Test case ID',
      },
    },
  },
  response: {
    200: {
      description: 'Test case deleted',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    404: {
      description: 'Test case not found',
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

/**
 * HOW TO USE IN ROUTES:
 * 
 * import { loginSchema } from './schemas/swagger-examples.js';
 * 
 * fastify.post('/api/auth/login', { schema: loginSchema }, async (request, reply) => {
 *   // handler code
 * });
 * 
 * OR with preHandler:
 * 
 * fastify.get('/api/profile', {
 *   schema: getUserProfileSchema,
 *   preHandler: requireAuth
 * }, async (request, reply) => {
 *   // handler code
 * });
 */
