import { getPrismaClient } from '../lib/prisma.js';
import { createAuthGuards } from '../lib/rbac.js';
import { ROLES, hasPermission, isForbidden } from '../lib/permissions.js';
import { logAuditAction, getAuditLogs, getUserAuditLogs, exportAuditLogs } from '../services/auditService.js';
import * as adminProjectService from '../services/adminProjectService.js';
import { unlockAccount } from '../services/authService.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = getPrismaClient();
const ALLOWED_ROLES = ['ADMIN', 'DEVELOPER', 'TESTER'];

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

function getClientContext(request) {
  return {
    ipAddress: request.ip || request.socket?.remoteAddress || null,
    userAgent: request.headers['user-agent'] || null,
  };
}

export async function adminRoutes(fastify) {
  const { requireAuth, requireRoles } = createAuthGuards(fastify);
  const adminOnly = requireRoles([ROLES.ADMIN]);

  // ==========================================
  // ADMIN OVERVIEW
  // ==========================================
  fastify.get('/api/admin/overview', { preHandler: [requireAuth, adminOnly] }, async (request) => {
    const [totalUsers, activeUsers, adminCount, developerCount, testerCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: ROLES.ADMIN } }),
      prisma.user.count({ where: { role: ROLES.DEVELOPER } }),
      prisma.user.count({ where: { role: ROLES.TESTER } }),
    ]);

    return {
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        roleDistribution: {
          admins: adminCount,
          developers: developerCount,
          testers: testerCount,
        },
      },
    };
  });

  // ==========================================
  // GET ALL USERS (ADMIN-ONLY)
  // ==========================================
  fastify.get('/api/admin/users', { preHandler: [requireAuth, adminOnly] }, async (request) => {
    const { skip = 0, take = 50, role, isActive } = request.query;

    const where = {};
    if (role) {
      where.role = normalizeRole(role);
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: Math.max(0, Number(skip) || 0),
        take: Math.min(500, Math.max(1, Number(take) || 50)),
      }),
      prisma.user.count({ where }),
    ]);

    await logAuditAction(request.user.id, 'ADMIN_ACTION', {
      description: 'Listed all users',
      resourceType: 'SYSTEM',
      ...getClientContext(request),
    });

    return {
      users,
      pagination: { skip: Number(skip), take: Number(take), total },
    };
  });

  // ==========================================
  // GET SINGLE USER WITH AUDIT HISTORY
  // ==========================================
  fastify.get('/api/admin/users/:id', { preHandler: [requireAuth, adminOnly] }, async (request, reply) => {
    const userId = Number(request.params.id);

    if (Number.isNaN(userId)) {
      return reply.code(400).send({ error: 'Invalid user id' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Get audit history for this user
    const auditHistory = await getUserAuditLogs(userId);

    return { user, auditHistory };
  });

  // ==========================================
  // CREATE USER (ADMIN-ONLY)
  // ==========================================
  fastify.post('/api/admin/users', { preHandler: [requireAuth, adminOnly] }, async (request, reply) => {
    const { name, email, password, role = ROLES.DEVELOPER } = request.body || {};

    if (!name || !email || !password) {
      return reply.code(400).send({ error: 'Name, email, and password are required' });
    }

    const normalizedRole = normalizeRole(role);
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return reply.code(400).send({ error: 'Invalid role' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (auto-verified for admin-created users)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: normalizedRole,
        isVerified: true, // Admin-created users are auto-verified
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Log audit
    await logAuditAction(request.user.id, 'USER_CREATED', {
      resourceType: 'USER',
      resourceId: user.id,
      resourceName: user.name,
      description: `Created new ${normalizedRole} user: ${user.email}`,
      newValues: { name, email, role: normalizedRole },
      ...getClientContext(request),
    });

    return { user };
  });

  // ==========================================
  // EDIT USER DETAILS
  // ==========================================
  fastify.patch('/api/admin/users/:id', { preHandler: [requireAuth, adminOnly] }, async (request, reply) => {
    const targetUserId = Number(request.params.id);
    const { name, email } = request.body || {};

    if (Number.isNaN(targetUserId)) {
      return reply.code(400).send({ error: 'Invalid user id' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const oldValues = { name: user.name, email: user.email };
    const updateData = {};

    if (name) updateData.name = name;
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ error: 'Email already in use' });
      }
      updateData.email = email;
    }

    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });

    // Log audit
    await logAuditAction(request.user.id, 'USER_UPDATED', {
      resourceType: 'USER',
      resourceId: updated.id,
      resourceName: updated.name,
      description: `Updated user: ${updated.email}`,
      oldValues,
      newValues: updateData,
      ...getClientContext(request),
    });

    return { user: updated };
  });

  // ==========================================
  // ASSIGN/CHANGE USER ROLE
  // ==========================================
  fastify.patch('/api/admin/users/:id/role', { preHandler: [requireAuth, adminOnly] }, async (request, reply) => {
    const targetUserId = Number(request.params.id);
    const { role } = request.body || {};

    if (Number.isNaN(targetUserId)) {
      return reply.code(400).send({ error: 'Invalid user id' });
    }

    const normalizedRole = normalizeRole(role);
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return reply.code(400).send({ error: 'Invalid role' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (user.role === normalizedRole) {
      return reply.code(400).send({ error: 'User already has this role' });
    }

    const oldRole = user.role;

    // Update role and increment tokenVersion to invalidate existing tokens
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: normalizedRole,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, role: true },
    });

    // Log audit
    await logAuditAction(request.user.id, 'USER_ROLE_CHANGED', {
      resourceType: 'USER',
      resourceId: updated.id,
      resourceName: user.name,
      description: `Changed role from ${oldRole} to ${normalizedRole}`,
      oldValues: { role: oldRole },
      newValues: { role: normalizedRole },
      ...getClientContext(request),
    });

    return { user: updated, message: 'User tokens invalidated. They must log in again.' };
  });

  // ==========================================
  // DEACTIVATE USER
  // ==========================================
  fastify.patch('/api/admin/users/:id/deactivate', { preHandler: [requireAuth, adminOnly] }, async (request, reply) => {
    const targetUserId = Number(request.params.id);

    if (Number.isNaN(targetUserId)) {
      return reply.code(400).send({ error: 'Invalid user id' });
    }

    // Prevent self-deactivation
    if (targetUserId === request.user.id) {
      return reply.code(400).send({ error: 'Cannot deactivate yourself' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, isActive: true, name: true },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (!user.isActive) {
      return reply.code(400).send({ error: 'User is already inactive' });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isActive: false,
        tokenVersion: { increment: 1 }, // Invalidate all sessions
      },
      select: { id: true, email: true, isActive: true },
    });

    // Log audit
    await logAuditAction(request.user.id, 'USER_DEACTIVATED', {
      resourceType: 'USER',
      resourceId: updated.id,
      resourceName: user.name,
      description: `Deactivated user: ${user.email}`,
      oldValues: { isActive: true },
      newValues: { isActive: false },
      ...getClientContext(request),
    });

    return { user: updated };
  });

  // ==========================================
  // REACTIVATE USER
  // ==========================================
  fastify.patch('/api/admin/users/:id/reactivate', { preHandler: [requireAuth, adminOnly] }, async (request, reply) => {
    const targetUserId = Number(request.params.id);

    if (Number.isNaN(targetUserId)) {
      return reply.code(400).send({ error: 'Invalid user id' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, isActive: true, name: true },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (user.isActive) {
      return reply.code(400).send({ error: 'User is already active' });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isActive: true,
      },
      select: { id: true, email: true, isActive: true },
    });

    // Log audit
    await logAuditAction(request.user.id, 'USER_REACTIVATED', {
      resourceType: 'USER',
      resourceId: updated.id,
      resourceName: user.name,
      description: `Reactivated user: ${user.email}`,
      oldValues: { isActive: false },
      newValues: { isActive: true },
      ...getClientContext(request),
    });

    return { user: updated };
  });

  // ==========================================
  // RESET USER PASSWORD
  // ==========================================
  fastify.post('/api/admin/users/:id/reset-password', { preHandler: [requireAuth, adminOnly] }, async (request, reply) => {
    const targetUserId = Number(request.params.id);

    if (Number.isNaN(targetUserId)) {
      return reply.code(400).send({ error: 'Invalid user id' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
      },
    });

    // Log audit
    await logAuditAction(request.user.id, 'USER_PASSWORD_RESET', {
      resourceType: 'USER',
      resourceId: user.id,
      resourceName: user.name,
      description: `Initiated password reset for: ${user.email}`,
      ...getClientContext(request),
    });

    return { message: 'Password reset token generated', resetToken };
  });

  // Unlock Account
  fastify.post('/api/admin/users/:id/unlock', { preHandler: [requireAuth, adminOnly] }, async (request, reply) => {
    try {
      const targetUserId = Number(request.params.id);

      if (Number.isNaN(targetUserId)) {
        return reply.code(400).send({ error: 'Invalid user id' });
      }

      const result = await unlockAccount(request.user.id, targetUserId);

      // Log audit
      await logAuditAction(request.user.id, 'USER_ACCOUNT_UNLOCKED', {
        resourceType: 'USER',
        resourceId: targetUserId,
        resourceName: result.user.name,
        description: `Unlocked account for: ${result.user.email}`,
        ...getClientContext(request),
      });

      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: error.message });
    }
  });

  // ==========================================
  // AUDIT LOGS - LIST
  // ==========================================
  fastify.get('/api/admin/audit-logs', { preHandler: [requireAuth, adminOnly] }, async (request) => {
    const {
      action,
      performedBy,
      resourceType,
      resourceId,
      projectId,
      startDate,
      endDate,
      skip,
      take,
    } = request.query;

    const filters = {
      action,
      performedBy: performedBy ? Number(performedBy) : undefined,
      resourceType,
      resourceId: resourceId ? Number(resourceId) : undefined,
      projectId: projectId ? Number(projectId) : undefined,
      startDate,
      endDate,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    };

    return getAuditLogs(filters);
  });

  // ==========================================
  // AUDIT LOGS - EXPORT
  // ==========================================
  fastify.get('/api/admin/audit-logs/export', { preHandler: [requireAuth, adminOnly] }, async (request) => {
    const { action, performedBy, resourceType, projectId, startDate, endDate } = request.query;

    const filters = {
      action,
      performedBy: performedBy ? Number(performedBy) : undefined,
      resourceType,
      projectId: projectId ? Number(projectId) : undefined,
      startDate,
      endDate,
    };

    const json = await exportAuditLogs(filters);

    return {
      exportedAt: new Date().toISOString(),
      format: 'JSON',
      data: JSON.parse(json),
    };
  });

  // ==========================================


  // ==========================================
  // PROJECT MANAGEMENT ROUTES
  // ==========================================

  /**
   * Create new project
   */
  fastify.post(
    '/api/admin/projects',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { name, key, description, modules } = request.body;

        const project = await adminProjectService.createProject(
          { name, key, description, modules },
          request.user.id
        );

        reply.code(201).send(project);
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Get all projects
   */
  fastify.get(
    '/api/admin/projects',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { skip, take, isActive, search } = request.query;

        const result = await adminProjectService.getAllProjects({
          skip: Number(skip) || 0,
          take: Number(take) || 50,
          isActive: isActive ? isActive === 'true' : true,
          search: search || null,
        });

        reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Get project details
   */
  fastify.get(
    '/api/admin/projects/:projectId',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;

        const project = await adminProjectService.getProjectDetails(Number(projectId));

        reply.send(project);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Update project
   */
  fastify.patch(
    '/api/admin/projects/:projectId',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { name, description, modules, isActive } = request.body;

        const project = await adminProjectService.updateProject(
          Number(projectId),
          { name, description, modules, isActive },
          request.user.id
        );

        reply.send(project);
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Add environment to project
   */
  fastify.post(
    '/api/admin/projects/:projectId/environments',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { name, url, description } = request.body;

        const environment = await adminProjectService.addProjectEnvironment(
          Number(projectId),
          { name, url, description },
          request.user.id
        );

        reply.code(201).send(environment);
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Delete environment
   */
  fastify.delete(
    '/api/admin/projects/:projectId/environments/:envId',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { envId } = request.params;

        await adminProjectService.deleteEnvironment(Number(envId), request.user.id);

        reply.send({ message: 'Environment deleted' });
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Add custom field to project
   */
  fastify.post(
    '/api/admin/projects/:projectId/custom-fields',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { name, label, type, required, options, defaultValue, order } = request.body;

        const customField = await adminProjectService.addProjectCustomField(
          Number(projectId),
          { name, label, type, required, options, defaultValue, order },
          request.user.id
        );

        reply.code(201).send(customField);
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Delete custom field
   */
  fastify.delete(
    '/api/admin/projects/:projectId/custom-fields/:fieldId',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { fieldId } = request.params;

        await adminProjectService.deleteCustomField(Number(fieldId), request.user.id);

        reply.send({ message: 'Custom field deleted' });
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Allocate user to project
   */
  fastify.post(
    '/api/admin/projects/:projectId/allocate-user',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { userId, role } = request.body;

        if (!userId) {
          return reply.code(400).send({ error: 'User ID is required' });
        }

        const allocation = await adminProjectService.allocateUserToProject(
          Number(projectId),
          Number(userId),
          { role },
          request.user.id
        );

        reply.code(201).send(allocation);
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Remove user from project
   */
  fastify.post(
    '/api/admin/projects/:projectId/deallocate-user/:userId',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { projectId, userId } = request.params;

        await adminProjectService.deallocateUserFromProject(
          Number(projectId),
          Number(userId),
          request.user.id
        );

        reply.send({ message: 'User removed from project' });
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * Get project user allocations
   */
  fastify.get(
    '/api/admin/projects/:projectId/allocations',
    { preHandler: [requireAuth, adminOnly] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;

        const allocations = await adminProjectService.getProjectUserAllocations(Number(projectId));

        reply.send({ allocations });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message });
      }
    }
  );
}

export default adminRoutes;
