import { PERMISSIONS, hasPermission } from './permissions.js';
import { requireProjectAccess } from './rbac.js';

const ACTION_ALIASES = {
  create: 'write',
  edit: 'write',
  update: 'write',
  delete: 'delete',
  read: 'read',
  list: 'read',
  export: 'read',
  import: 'write',
  clone: 'write',
  execute: 'write',
  assign: 'manage',
  configure: 'manage',
  manage: 'manage',
  revoke: 'manage',
  regenerate: 'manage',
  verify: 'manage',
  reopen: 'manage',
  status: 'manage',
  comment: 'write',
  uploadEvidence: 'write',
  history: 'read',
  resetPassword: 'manage',
  deactivate: 'manage',
  broadcast: 'manage',
};

const RESOURCE_TYPE_MAP = {
  user: 'user',
  project: 'project',
  testCase: 'test',
  testSuite: 'test',
  testRun: 'execution',
  testExecution: 'execution',
  testResult: 'execution',
  testPlan: 'test',
  bug: 'bug',
  milestone: 'project',
  notification: 'project',
  chat: 'project',
  evidence: 'execution',
  report: 'project',
  metrics: 'project',
  audit: 'global',
  apiKey: 'project',
  webhook: 'project',
  github: 'project',
  search: 'project',
  admin: 'global',
  tenant: 'tenant',
  announcement: 'global',
};

const RESOURCE_SCOPE_MAP = {
  user: 'global',
  project: 'tenant',
  test: 'project',
  execution: 'project',
  bug: 'project',
  tenant: 'tenant',
  global: 'global',
};

const POLICY_OVERRIDES = {
  'apiKey:create': { projectRoles: ['PROJECT_MANAGER', 'OWNER', 'ADMIN'] },
  'apiKey:edit': { projectRoles: ['PROJECT_MANAGER', 'OWNER', 'ADMIN'] },
  'apiKey:delete': { projectRoles: ['PROJECT_MANAGER', 'OWNER', 'ADMIN'] },
  'apiKey:revoke': { projectRoles: ['PROJECT_MANAGER', 'OWNER', 'ADMIN'] },
  'apiKey:regenerate': { projectRoles: ['PROJECT_MANAGER', 'OWNER', 'ADMIN'] },
  'milestone:manage': { projectRoles: ['PROJECT_MANAGER', 'OWNER', 'ADMIN'] },
  'project:configure': { projectRoles: ['PROJECT_MANAGER', 'OWNER', 'ADMIN'] },
};

function inferAction(permission) {
  const parts = String(permission || '').split(':');
  const verb = parts[parts.length - 1];
  return ACTION_ALIASES[verb] || 'manage';
}

function inferResourceType(permission) {
  const parts = String(permission || '').split(':');
  const resource = parts[0];
  return RESOURCE_TYPE_MAP[resource] || 'project';
}

function inferScope(permission) {
  const resourceType = inferResourceType(permission);
  return RESOURCE_SCOPE_MAP[resourceType] || 'project';
}

export const POLICY_MAP = Object.entries(PERMISSIONS).reduce((acc, [key, perm]) => {
  acc[key] = {
    action: inferAction(key),
    resourceType: inferResourceType(key),
    scope: inferScope(key),
    roles: Object.entries(perm.roles)
      .filter(([_, allowed]) => allowed === true)
      .map(([role]) => role),
    projectRoles: POLICY_OVERRIDES[key]?.projectRoles || null,
  };
  return acc;
}, {});

export function buildPermissionContext(request, permission) {
  return {
    validated: true,
    permission,
    permissions: [permission],
    userId: request.user?.id,
    role: request.user?.role,
    projectId: request.projectId || request.params?.projectId || request.query?.projectId || null,
  };
}

export function assertPermissionContext(authContext, permission, scopeContext = {}) {
  if (!authContext?.validated || !authContext?.permissions?.includes(permission)) {
    throw new Error('Missing permission context');
  }

  const policy = POLICY_MAP[permission];
  if (!policy) {
    throw new Error(`Unknown permission: ${permission}`);
  }

  const scope = policy.scope;
  if (scope === 'project') {
    if (!authContext.projectId) {
      throw new Error('Project scope required');
    }
    if (scopeContext.projectId && Number(authContext.projectId) !== Number(scopeContext.projectId)) {
      throw new Error('Project scope mismatch');
    }
  }

  return policy;
}

export function requirePermission(permission) {
  return async (request, reply) => {
    const policy = POLICY_MAP[permission];

    if (!policy) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if (!request.user?.role) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (!hasPermission(request.user.role, permission)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if (policy.scope === 'project') {
      const projectAccess = await requireProjectAccess(request, reply);
      if (projectAccess?.blocked) {
        return;
      }

      if (policy.projectRoles && !policy.projectRoles.includes(String(request.projectRole || '').toUpperCase())) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    }

    request.permissionContext = buildPermissionContext(request, permission);
  };
}

export default {
  POLICY_MAP,
  requirePermission,
  buildPermissionContext,
  assertPermissionContext,
};
