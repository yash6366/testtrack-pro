/**
 * Admin Constraint Guards
 * Enforce that ADMINS cannot execute tests or modify test results
 */

import { ROLES, isForbidden } from './permissions.js';

/**
 * Guard: Prevent ADMIN from executing tests
 * @returns {function} Fastify preHandler middleware
 */
export function requireNotAdmin() {
  return async (request, reply) => {
    const userRole = request.user?.role?.toUpperCase?.();

    if (userRole === ROLES.ADMIN) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Administrators cannot execute test cases. This action is restricted to Testers only.',
        reason: 'ADMIN_UNAUTHORIZED_TEST_EXECUTION',
      });
    }
  };
}

/**
 * Guard: Prevent ADMIN from modifying test results
 * @returns {function} Fastify preHandler middleware
 */
export function requireTestResultModifier() {
  return async (request, reply) => {
    const userRole = request.user?.role?.toUpperCase?.();

    if (userRole === ROLES.ADMIN) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Administrators cannot modify test results. This action is restricted to Testers only.',
        reason: 'ADMIN_UNAUTHORIZED_RESULT_MODIFICATION',
      });
    }

    if (userRole === ROLES.DEVELOPER) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Only Testers can modify test results.',
        reason: 'DEVELOPER_UNAUTHORIZED_RESULT_MODIFICATION',
      });
    }
  };
}

/**
 * Guard: Prevent ADMIN from uploading evidence
 * @returns {function} Fastify preHandler middleware
 */
export function requireNotAdminForEvidence() {
  return async (request, reply) => {
    const userRole = request.user?.role?.toUpperCase?.();

    if (userRole === ROLES.ADMIN) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Administrators cannot upload test execution evidence. This action is restricted to Testers.',
        reason: 'ADMIN_UNAUTHORIZED_EVIDENCE_UPLOAD',
      });
    }
  };
}

/**
 * Guard: Ensure user has permission for action
 * Admin cannot execute tests or modify results
 * @param {string} permission - Permission string
 * @returns {function} Fastify preHandler middleware
 */
export function requirePermission(permission) {
  return async (request, reply) => {
    const userRole = request.user?.role?.toUpperCase?.();

    // Check if this role is forbidden from this permission
    if (isForbidden(userRole, permission)) {
      const permissionDetails = {
        'testExecution:execute': 'Test execution is restricted to Testers. Administrators cannot execute tests.',
        'testResult:modify': 'Test result modification is restricted to Testers. Administrators cannot modify results.',
        'testExecution:uploadEvidence': 'Evidence upload is restricted to Testers. Administrators cannot upload evidence.',
      };

      return reply.code(403).send({
        error: 'Forbidden',
        message: permissionDetails[permission] || `Permission denied: ${permission}`,
        permission,
        reason: 'PERMISSION_DENIED',
      });
    }
  };
}

export default {
  requireNotAdmin,
  requireTestResultModifier,
  requireNotAdminForEvidence,
  requirePermission,
};
