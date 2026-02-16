/**
 * Audit Logging Service
 * Immutable, admin-only audit trail for compliance and tracking
 */

import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

/**
 * Log an admin action to the audit trail
 * @param {number} performedByUserId - Admin user ID
 * @param {string} action - AuditAction enum value
 * @param {object} options - Additional options
 * @param {string} options.resourceType - Type of resource (USER, TESTCASE, etc)
 * @param {number} options.resourceId - ID of affected resource
 * @param {string} options.resourceName - Human-readable name
 * @param {number} options.projectId - Project context (optional)
 * @param {string} options.description - Human-readable description
 * @param {object} options.oldValues - Previous state (JSON)
 * @param {object} options.newValues - New state (JSON)
 * @param {string} options.ipAddress - Client IP
 * @param {string} options.userAgent - Client user agent
 * @returns {Promise<object>} Created audit log record
 */
export async function logAuditAction(performedByUserId, action, options = {}) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        action,
        userId: performedByUserId,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        resourceName: options.resourceName,
        projectId: options.projectId,
        description: options.description || `${action} executed`,
        oldValues: options.oldValues ? JSON.stringify(options.oldValues) : null,
        newValues: options.newValues ? JSON.stringify(options.newValues) : null,
        ipAddress: options.ipAddress,
      },
      select: {
        id: true,
        action: true,
        userId: true,
        resourceType: true,
        resourceId: true,
        timestamp: true,
      },
    });

    return auditLog;
  } catch (error) {
    console.error('Failed to log audit action:', error);
    // Don't throw - audit failures should not break operations
    // But log to stderr for debugging
    process.stderr.write(`Audit log error: ${error.message}\n`);
    return null;
  }
}

/**
 * Get audit logs with filtering and pagination
 * @param {object} filters - Filter criteria
 * @param {string} filters.action - Filter by action (optional)
 * @param {number} filters.performedBy - Filter by admin user ID (optional)
 * @param {string} filters.resourceType - Filter by resource type (optional)
 * @param {number} filters.resourceId - Filter by resource ID (optional)
 * @param {number} filters.projectId - Filter by project (optional)
 * @param {Date} filters.startDate - Filter from date (optional)
 * @param {Date} filters.endDate - Filter to date (optional)
 * @param {number} filters.skip - Pagination offset (default: 0)
 * @param {number} filters.take - Pagination limit (default: 50, max: 500)
 * @returns {Promise<object>} Paginated audit logs
 */
export async function getAuditLogs(filters = {}) {
  const skip = Math.max(0, filters.skip || 0);
  const take = Math.min(500, Math.max(1, filters.take || 50)); // Limit max to 500

  const where = {};

  // Build where clause
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.performedBy) {
    where.userId = filters.performedBy;
  }
  if (filters.resourceType) {
    where.resourceType = filters.resourceType;
  }
  if (filters.resourceId) {
    where.resourceId = filters.resourceId;
  }
  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) {
      where.timestamp.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.timestamp.lte = new Date(filters.endDate);
    }
  }

  // Execute query
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        resourceType: true,
        resourceId: true,
        resourceName: true,
        projectId: true,
        description: true,
        oldValues: true, // JSON string
        newValues: true, // JSON string
        ipAddress: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      performedBy: log.userId,
      actor: log.user,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      resourceName: log.resourceName,
      projectId: log.projectId,
      description: log.description,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
      ipAddress: log.ipAddress,
      userAgent: null,
      createdAt: log.timestamp,
    })),
    pagination: {
      skip,
      take,
      total,
      pages: Math.ceil(total / take),
    },
  };
}

/**
 * Get audit logs for a specific user (admin viewing their targets)
 * @param {number} targetUserId - User to audit
 * @param {object} options - Additional options
 * @returns {Promise<Array>} Audit logs related to that user
 */
export async function getUserAuditLogs(targetUserId, options = {}) {
  const skip = Math.max(0, options.skip || 0);
  const take = Math.min(100, Math.max(1, options.take || 20));

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { userId: targetUserId }, // Actions performed by user
        { resourceType: 'USER', resourceId: targetUserId }, // Actions performed on user
      ],
    },
    select: {
      id: true,
      action: true,
      userId: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      description: true,
      oldValues: true,
      newValues: true,
      timestamp: true,
    },
    orderBy: { timestamp: 'desc' },
    skip,
    take,
  });

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    performedBy: log.userId,
    actor: log.user,
    description: log.description,
    oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
    newValues: log.newValues ? JSON.parse(log.newValues) : null,
    createdAt: log.timestamp,
  }));
}

/**
 * Export audit logs as JSON (for compliance/archival)
 * @param {object} filters - Same as getAuditLogs
 * @returns {Promise<string>} JSON string of audit logs
 */
export async function exportAuditLogs(filters = {}) {
  const { logs } = await getAuditLogs({ ...filters, take: 5000 });
  return JSON.stringify(logs, null, 2);
}

export default {
  logAuditAction,
  getAuditLogs,
  getUserAuditLogs,
  exportAuditLogs,
};
