import { createAuthGuards } from '../lib/rbac.js';
import {
  createSignedEvidenceUpload,
  createEvidenceRecord,
  listEvidence,
  parseEvidenceParams,
  softDeleteEvidence,
} from '../services/evidenceService.js';

export async function evidenceRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);

  fastify.post(
    '/api/projects/:projectId/test-executions/:executionId/steps/:stepId/evidence/signature',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      let params;
      try {
        params = parseEvidenceParams(request.params);
      } catch (error) {
        reply.code(500).send({ error: error.message });
        return;
      }

      const { projectId, executionId, stepId } = params;
      const { fileName, fileType, fileSize } = request.body || {};

      try {
        const payload = await createSignedEvidenceUpload({
          projectId,
          executionId,
          stepId,
          fileName,
          fileType,
          fileSize,
        });
        reply.send(payload);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  fastify.post(
    '/api/projects/:projectId/test-executions/:executionId/steps/:stepId/evidence',
    { preHandler: [requireAuth, requireRoles(['TESTER'])] },
    async (request, reply) => {
      let params;
      try {
        params = parseEvidenceParams(request.params);
      } catch (error) {
        reply.code(500).send({ error: error.message });
        return;
      }

      const { projectId, executionId, stepId } = params;
      const userId = request.user.id;

      try {
        const evidence = await createEvidenceRecord({
          projectId,
          executionId,
          stepId,
          payload: request.body || {},
          userId,
        });
        reply.code(201).send(evidence);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  fastify.get(
    '/api/projects/:projectId/test-executions/:executionId/evidence',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      let params;
      try {
        params = parseEvidenceParams(request.params);
      } catch (error) {
        reply.code(500).send({ error: error.message });
        return;
      }

      const { projectId, executionId } = params;

      try {
        const evidence = await listEvidence({ projectId, executionId, stepId: null });
        reply.send({ evidence });
      } catch (error) {
        reply.code(404).send({ error: error.message });
      }
    }
  );

  fastify.get(
    '/api/projects/:projectId/test-executions/:executionId/steps/:stepId/evidence',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER', 'ADMIN'])] },
    async (request, reply) => {
      let params;
      try {
        params = parseEvidenceParams(request.params);
      } catch (error) {
        reply.code(500).send({ error: error.message });
        return;
      }

      const { projectId, executionId, stepId } = params;

      try {
        const evidence = await listEvidence({ projectId, executionId, stepId });
        reply.send({ evidence });
      } catch (error) {
        reply.code(404).send({ error: error.message });
      }
    }
  );

  fastify.delete(
    '/api/projects/:projectId/evidence/:evidenceId',
    { preHandler: [requireAuth, requireRoles(['TESTER', 'DEVELOPER'])] },
    async (request, reply) => {
      const projectId = Number.parseInt(request.params.projectId, 10);
      const evidenceId = Number.parseInt(request.params.evidenceId, 10);
      const userId = request.user.id;

      if (Number.isNaN(projectId) || Number.isNaN(evidenceId)) {
        reply.code(400).send({ error: 'Invalid projectId or evidenceId' });
        return;
      }

      try {
        const deleted = await softDeleteEvidence({ projectId, evidenceId, userId });
        reply.send({ id: deleted.id, isDeleted: deleted.isDeleted, deletedAt: deleted.deletedAt });
      } catch (error) {
        reply.code(404).send({ error: error.message });
      }
    }
  );
}

export default evidenceRoutes;
