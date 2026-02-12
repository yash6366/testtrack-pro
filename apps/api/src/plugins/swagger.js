import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function setupSwagger(fastify) {
  // Register Swagger plugin
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'TestTrack Pro API',
        description: 'Full-stack software testing management platform API. Manage test cases, executions, bugs, and analytics.',
        version: '0.1.0',
        contact: {
          name: 'API Support',
          email: 'support@testtrackpro.com',
        },
        license: {
          name: 'MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
        {
          url: 'https://api.testtrackpro.com',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token in the format: Bearer <token>',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'test-cases', description: 'Test case management' },
        { name: 'test-runs', description: 'Test execution management' },
        { name: 'test-suites', description: 'Test suite management' },
        { name: 'bugs', description: 'Bug/defect tracking' },
        { name: 'analytics', description: 'Reports and analytics' },
        { name: 'admin', description: 'Administrative operations' },
        { name: 'tester', description: 'Tester-specific features' },
        { name: 'developer', description: 'Developer workflows' },
        { name: 'chat', description: 'Real-time messaging' },
        { name: 'notifications', description: 'Notification management' },
        { name: 'search', description: 'Global search' },
        { name: 'evidence', description: 'Evidence file management' },
      ],
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  fastify.log.info('Swagger documentation available at /docs');
}
