/**
 * ADMIN ROLE - PERMISSION MATRIX
 * Industry-grade role-based access control (RBAC) with explicit permission tracking
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  DEVELOPER: 'DEVELOPER',
  TESTER: 'TESTER',
};

/**
 * Comprehensive permission matrix
 * Each permission is marked as required for a role (true) or forbidden (false)
 */
export const PERMISSIONS = {
  // ============================================
  // USER MANAGEMENT
  // ============================================
  'user:create': {
    description: 'Create new users (Tester/Developer/Admin)',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'user:read': {
    description: 'Read user information',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true, // Can view own profile + team members
      [ROLES.TESTER]: true, // Can view own profile
    },
  },
  'user:read:all': {
    description: 'Read all users system-wide',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'user:edit': {
    description: 'Edit user details',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'user:deactivate': {
    description: 'Deactivate/reactivate users',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'user:resetPassword': {
    description: 'Reset user password',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'user:role:assign': {
    description: 'Assign roles to users',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'user:role:updatePermissions': {
    description: 'Customize permissions per role',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },

  // ============================================
  // PROJECT MANAGEMENT
  // ============================================
  'project:create': {
    description: 'Create new projects',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'project:read': {
    description: 'Read assigned projects',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'project:configure': {
    description: 'Configure project settings (modules, environments, fields)',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'project:delete': {
    description: 'Delete projects',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'project:isolation': {
    description: 'Enforce project isolation (users see only assigned projects)',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // TEST CASE MANAGEMENT
  // ============================================
  'testCase:create': {
    description: 'Create test cases',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true, // CHANGE: Testers CAN create test cases
    },
  },
  'testCase:edit': {
    description: 'Edit test cases they own or are assigned',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true, // CHANGE: Testers CAN edit owned test cases
    },
  },
  'testCase:delete': {
    description: 'Soft-delete/restore test cases',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true, // CHANGE: Testers CAN soft-delete owned test cases
    },
  },
  'testCase:read': {
    description: 'Read test cases',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testCase:history': {
    description: 'View test case version history',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testCase:clone': {
    description: 'Clone existing test cases',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testCase:import': {
    description: 'Import test cases from CSV/Excel',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testCase:export': {
    description: 'Export test cases to CSV/Excel/PDF',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // TEST EXECUTION (CRITICAL: ADMIN MUST NOT EXECUTE)
  // ============================================
  'testExecution:execute': {
    description: 'Execute test cases (FORBIDDEN FOR ADMIN)',
    roles: {
      [ROLES.ADMIN]: false, // CRITICAL: Admins cannot execute tests
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true,
    },
  },
  'testExecution:read': {
    description: 'Read test execution records',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testExecution:uploadEvidence': {
    description: 'Upload evidence (screenshots, videos, logs)',
    roles: {
      [ROLES.ADMIN]: false, // CRITICAL: Admins cannot upload execution evidence
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // TEST RESULT (CRITICAL: ADMIN MUST NOT MODIFY)
  // ============================================
  'testResult:modify': {
    description: 'Modify test results (FORBIDDEN FOR ADMIN)',
    roles: {
      [ROLES.ADMIN]: false, // CRITICAL: Admins cannot modify test results
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true,
    },
  },
  'testResult:comment': {
    description: 'Add comments to test results',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // BUG/DEFECT MANAGEMENT
  // 
  // DEVELOPER ROLE - BUG/ISSUE HANDLING
  // ====================================
  // Developers have full responsibility for managing assigned bugs:
  //
  // A Developer can manage bugs and issues assigned to them:
  //   ✓ View bugs/issues assigned to them
  //   ✓ View issue details including:
  //     - Title, description, severity, priority, status
  //     - Steps to reproduce
  //     - Expected and actual behavior
  //     - Environment and affected version
  //   ✓ Update bug status according to workflow:
  //     - Move bugs to "In Progress"
  //     - Mark bugs as "Fixed"
  //     - Mark bugs as "Won't Fix"
  //   ✓ Request re-testing after marking bug as "Fixed"
  //   ✓ Add comments and notes to bugs
  //   ✓ Update fix documentation (commit, branch, fix notes)
  //   ✓ View bug history and audit trail
  // ============================================
  'bug:create': {
    description: 'Create bugs from test failures',
    roles: {
      [ROLES.ADMIN]: false,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'bug:edit': {
    description: 'Edit bug details',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'bug:status:change': {
    description: 'Change bug status (DEVELOPER: In Progress, Fixed, Won\'t Fix | TESTER: CANNOT mark as FIXED)',
    roles: {
      [ROLES.ADMIN]: false, // CRITICAL: Admin changes status as admin action only
      [ROLES.DEVELOPER]: true, // Developers manage workflow: In Progress → Fixed → Won't Fix
      [ROLES.TESTER]: false, // CRITICAL: Tester cannot mark bug as FIXED
    },
  },
  'bug:verify': {
    description: 'Verify bug fixes and retest',
    roles: {
      [ROLES.ADMIN]: false,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true, // Only testers verify fixes
    },
  },
  'bug:reopen': {
    description: 'Reopen bugs that failed verification',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true, // Testers can reopen after failed verification
    },
  },
  'bug:assign': {
    description: 'Assign bugs to developers',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true, // Testers can assign bugs when creating
    },
  },
  'bug:comment': {
    description: 'Comment on bugs',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'bug:history': {
    description: 'View bug change history & audit trail',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // TEST SUITES & RUNS
  // ============================================
  'testSuite:create': {
    description: 'Create test suites/collections',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testSuite:edit': {
    description: 'Edit test suite details',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testRun:create': {
    description: 'Create test runs/cycles',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true,
    },
  },
  'testRun:assign': {
    description: 'Assign test runs to testers',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true, // Lead testers can assign
    },
  },
  'testRun:execute': {
    description: 'Execute assigned test runs',
    roles: {
      [ROLES.ADMIN]: false,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // TEST PLANS
  // ============================================
  'testPlan:create': {
    description: 'Create test plans',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testPlan:read': {
    description: 'Read test plans',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testPlan:edit': {
    description: 'Edit test plans',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testPlan:delete': {
    description: 'Delete test plans',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testPlan:execute': {
    description: 'Execute test plans (create runs)',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'testPlan:clone': {
    description: 'Clone test plans',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // MILESTONES
  // ============================================
  'milestone:read': {
    description: 'Read milestones',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'milestone:manage': {
    description: 'Create/update/delete milestones',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // API KEYS
  // ============================================
  'apiKey:create': {
    description: 'Create API keys',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'apiKey:read': {
    description: 'Read API keys',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'apiKey:edit': {
    description: 'Update API keys',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'apiKey:delete': {
    description: 'Delete API keys',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'apiKey:revoke': {
    description: 'Revoke API keys',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'apiKey:regenerate': {
    description: 'Regenerate API keys',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'apiKey:stats': {
    description: 'View API key usage stats',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },

  // ============================================
  // INTEGRATIONS & SEARCH
  // ============================================
  'github:manage': {
    description: 'Manage GitHub integrations',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'webhook:manage': {
    description: 'Manage webhooks',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'search:read': {
    description: 'Search across project resources',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'search:rebuild': {
    description: 'Rebuild search index',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },

  // ============================================
  // ADMIN
  // ============================================
  'admin:manage': {
    description: 'Perform administrative actions',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },

  // ============================================
  // REPORTING & METRICS
  // ============================================
  'report:execution': {
    description: 'Generate test execution reports',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'report:export': {
    description: 'Export reports to PDF/Excel/CSV',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'metrics:developerPerformance': {
    description: 'View developer performance metrics (bugs fixed, reopen rate, resolution time)',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true, // Can view own metrics
      [ROLES.TESTER]: false,
    },
  },
  'metrics:testerPerformance': {
    description: 'View tester performance metrics',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: true, // Can view own metrics
    },
  },

  // ============================================
  // AUDIT & LOGGING (ADMIN-ONLY)
  // ============================================
  'audit:read': {
    description: 'Read audit logs',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'audit:filter': {
    description: 'Filter audit logs by user/action/time',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'audit:export': {
    description: 'Export audit logs for compliance',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },

  // ============================================
  // SYSTEM CONFIGURATION (ADMIN-ONLY)
  // ============================================
  'system:configure': {
    description: 'Configure notification rules & global settings',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'system:notification:configure': {
    description: 'Configure email vs in-app notifications',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },

  // ============================================
  // BACKUP & RECOVERY (ADMIN-ONLY)
  // ============================================
  'backup:trigger': {
    description: 'Trigger database backups',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'backup:restore': {
    description: 'Restore from backups (CRITICAL)',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
  'backup:monitor': {
    description: 'Monitor backup status',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },

  // ============================================
  // COMMUNICATION
  // ============================================
  'chat:message': {
    description: 'Send chat messages',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: true,
      [ROLES.TESTER]: true,
    },
  },
  'announcement:broadcast': {
    description: 'Broadcast system-wide announcements',
    roles: {
      [ROLES.ADMIN]: true,
      [ROLES.DEVELOPER]: false,
      [ROLES.TESTER]: false,
    },
  },
};

/**
 * Check if a user role has a specific permission
 * @param {string} role - User role (ADMIN, DEVELOPER, TESTER)
 * @param {string} permission - Permission key (e.g., 'user:create')
 * @returns {boolean} True if user has permission
 */
export function hasPermission(role, permission) {
  const normRole = String(role).toUpperCase();
  const perm = PERMISSIONS[permission];

  if (!perm) {
    console.warn(`Unknown permission: ${permission}`);
    return false;
  }

  return perm.roles[normRole] === true;
}

/**
 * Check if a user role is forbidden from an action
 * @param {string} role - User role
 * @param {string} permission - Permission key
 * @returns {boolean} True if forbidden
 */
export function isForbidden(role, permission) {
  const normRole = String(role).toUpperCase();
  const perm = PERMISSIONS[permission];

  if (!perm) {
    return false;
  }

  return perm.roles[normRole] === false;
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {Array<string>} Array of permission keys
 */
export function getPermissionsForRole(role) {
  const normRole = String(role).toUpperCase();
  return Object.entries(PERMISSIONS)
    .filter(([_, perm]) => perm.roles[normRole] === true)
    .map(([key]) => key);
}

/**
 * Get role description
 */
export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'System Administrator - Full control with audit trail',
  [ROLES.DEVELOPER]: 'Developer - Manages bugs and issues, documents fixes, analyzes test failures',
  [ROLES.TESTER]: 'Tester - Can execute tests and report results',
};

/**
 * DEVELOPER ROLE - RESPONSIBILITIES
 * 
 * 1. BUG / ISSUE HANDLING
 * ========================
 * A Developer can manage bugs and issues assigned to them:
 * 
 * ✓ View bugs/issues assigned to them
 * ✓ View issue details including:
 *   - Title, description, severity, priority, status
 *   - Steps to reproduce
 *   - Expected and actual behavior
 *   - Environment and affected version
 * 
 * ✓ Update bug status according to the defined workflow, including:
 *   - Move bugs to "In Progress"
 *   - Mark bugs as "Fixed"
 *   - Mark bugs as "Won't Fix"
 *   - Request re-testing after marking a bug as "Fixed"
 * 
 * ✓ Add comments and notes to bugs
 * ✓ View detailed bug history and audit trail
 * ✓ Update fix documentation with:
 *   - Commit references
 *   - Branch information
 *   - Fix notes and technical details
 * 
 * 2. TEST CASE & EXECUTION ANALYSIS
 * ==================================
 * ✓ View test cases and test execution details
 * ✓ Analyze test failures and create/update bugs
 * ✓ View performance metrics for assigned bugs
 * ✓ Export bug reports and analytics
 * 
 * 3. COLLABORATION & COMMUNICATION
 * ==================================
 * ✓ Participate in team chat and discussions
 * ✓ Receive and respond to notifications
 * ✓ Comment on test results and bugs
 * ✓ View team project information
 * 
 * 4. RESTRICTED ACTIONS
 * =====================
 * ✗ Cannot execute test cases (Testers only)
 * ✗ Cannot verify bug fixes (Testers only)
 * ✗ Cannot reopen bugs after verification failure (Testers only)
 * ✗ Cannot create users or manage system settings (Admins only)
 * ✗ Cannot modify test results (Testers only)
 * ✗ Cannot trigger database backups or system operations (Admins only)
 */
export const DEVELOPER_RESPONSIBILITIES = {
  'Bug/Issue Management': [
    'View assigned bugs and issues',
    'View issue details (title, description, severity, priority, status, steps to reproduce, expected/actual behavior, environment info)',
    'Update bug status (In Progress, Fixed, Won\'t Fix)',
    'Request re-testing after marking bug as Fixed',
    'Add comments and notes to bugs',
    'View bug history and audit trail',
    'Update fix documentation (commit, branch, fix notes)',
  ],
  'Test Analysis': [
    'View test cases and test execution details',
    'Analyze test failures',
    'Create or update bugs from test failures',
    'View performance metrics',
    'Export bug reports',
  ],
  'Collaboration': [
    'Participate in team chat',
    'Receive and respond to notifications',
    'View team project information',
  ],
};

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  isForbidden,
  getPermissionsForRole,
  ROLE_DESCRIPTIONS,
  DEVELOPER_RESPONSIBILITIES,
};
