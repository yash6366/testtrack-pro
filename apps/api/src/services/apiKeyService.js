/**
 * API KEY SERVICE
 * Manages API key generation, validation, and revocation for CI/CD integrations
 */

import { getPrismaClient } from '../lib/prisma.js';
import { logAuditAction } from './auditService.js';
import { assertPermissionContext } from '../lib/policy.js';
import crypto from 'crypto';

const prisma = getPrismaClient();

// Generate secure random key
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash API key for storage
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Create new API key
export async function createApiKey(projectId, data, userId, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'apiKey:create', { projectId });

  const { name, expiresAt, rateLimit = 1000 } = data;

  if (!projectId || !name) {
    throw new Error('ProjectId and name are required');
  }

  // Check for duplicate name
  const existing = await prisma.apiKey.findFirst({
    where: { projectId: Number(projectId), name },
  });
  if (existing) {
    throw new Error('API key with this name already exists');
  }

  // Generate the key
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      projectId: Number(projectId),
      name,
      keyHash,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      rateLimit: Number(rateLimit),
      isActive: true,
      createdBy: userId,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditAction(userId, 'APIKEY_CREATED', {
    resourceType: 'APIKEY',
    resourceId: apiKey.id,
    resourceName: apiKey.name,
    projectId: apiKey.projectId,
  });

  return {
    ...apiKey,
    key: rawKey, // Return the unhashed key only at creation
  };
}

// Get all API keys for project
export async function getProjectApiKeys(projectId, filters = {}, pagination = {}) {
  const { isActive = true, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  const { skip = 0, take = 20 } = pagination;

  const whereClause = { projectId: Number(projectId) };
  if (isActive !== null) whereClause.isActive = isActive;
  if (search) {
    whereClause.name = { contains: search, mode: 'insensitive' };
  }

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where: whereClause,
      include: { creator: { select: { id: true, name: true, email: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: Number(skip),
      take: Number(take),
      select: {
        id: true,
        projectId: true,
        name: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        rateLimit: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        creator: true,
      },
    }),
    prisma.apiKey.count({ where: whereClause }),
  ]);

  return {
    data: keys.map(k => ({
      ...k,
      isExpired: k.expiresAt && new Date(k.expiresAt) < new Date(),
    })),
    total,
    skip: Number(skip),
    take: Number(take),
  };
}

// Get single API key
export async function getApiKeyById(apiKeyId, projectId) {
  const key = await prisma.apiKey.findFirst({
    where: { id: Number(apiKeyId), projectId: Number(projectId) },
    include: { creator: { select: { id: true, name: true, email: true } } },
  });

  if (!key) {
    throw new Error('API key not found');
  }

  return {
    ...key,
    isExpired: key.expiresAt && new Date(key.expiresAt) < new Date(),
  };
}

// Validate API key
export async function validateApiKey(apiKey) {
  const keyHash = hashApiKey(apiKey);

  const key = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { project: true },
  });

  if (!key) {
    return { valid: false, reason: 'Invalid API key' };
  }

  if (!key.isActive) {
    return { valid: false, reason: 'API key has been revoked' };
  }

  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return { valid: false, reason: 'API key has expired' };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    projectId: key.projectId,
    name: key.name,
    rateLimit: key.rateLimit,
  };
}

// Revoke API key
export async function revokeApiKey(apiKeyId, userId, projectId, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'apiKey:revoke', { projectId });

  const key = await prisma.apiKey.findFirst({ where: { id: Number(apiKeyId), projectId: Number(projectId) } });
  if (!key) {
    throw new Error('API key not found');
  }

  const revoked = await prisma.apiKey.update({
    where: { id: Number(apiKeyId) },
    data: { isActive: false },
    include: { creator: { select: { id: true, name: true, email: true } } },
  });

  await logAuditAction(userId, 'APIKEY_REVOKED', {
    resourceType: 'APIKEY',
    resourceId: apiKeyId,
    resourceName: revoked.name,
    projectId: revoked.projectId,
  });

  return revoked;
}

// Delete API key
export async function deleteApiKey(apiKeyId, userId, projectId, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'apiKey:delete', { projectId });

  const key = await prisma.apiKey.findFirst({ where: { id: Number(apiKeyId), projectId: Number(projectId) } });
  if (!key) {
    throw new Error('API key not found');
  }

  await prisma.apiKey.delete({ where: { id: Number(apiKeyId) } });

  await logAuditAction(userId, 'APIKEY_DELETED', {
    resourceType: 'APIKEY',
    resourceId: apiKeyId,
    resourceName: key.name,
    projectId: key.projectId,
  });

  return key;
}

// Update API key
export async function updateApiKey(apiKeyId, data, userId, projectId, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'apiKey:edit', { projectId });

  const { name, expiresAt, rateLimit, isActive } = data;

  const key = await prisma.apiKey.findFirst({ where: { id: Number(apiKeyId), projectId: Number(projectId) } });
  if (!key) {
    throw new Error('API key not found');
  }

  if (name && name !== key.name) {
    const existing = await prisma.apiKey.findFirst({
      where: {
        projectId: key.projectId,
        name,
        id: { not: Number(apiKeyId) },
      },
    });
    if (existing) {
      throw new Error('API key with this name already exists');
    }
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (rateLimit) updateData.rateLimit = Number(rateLimit);
  if (isActive !== undefined) updateData.isActive = isActive;

  const updated = await prisma.apiKey.update({
    where: { id: Number(apiKeyId) },
    data: updateData,
    include: { creator: { select: { id: true, name: true, email: true } } },
  });

  await logAuditAction(userId, 'APIKEY_UPDATED', {
    resourceType: 'APIKEY',
    resourceId: apiKeyId,
    resourceName: updated.name,
    projectId: updated.projectId,
  });

  return updated;
}

// Regenerate API key (return new key)
export async function regenerateApiKey(apiKeyId, userId, projectId, permissionContext = null) {
  if (!permissionContext) {
    throw new Error('Missing permission context: direct service invocation not allowed');
  }
  assertPermissionContext(permissionContext, 'apiKey:regenerate', { projectId });

  const key = await prisma.apiKey.findFirst({ where: { id: Number(apiKeyId), projectId: Number(projectId) } });
  if (!key) {
    throw new Error('API key not found');
  }

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  const updated = await prisma.apiKey.update({
    where: { id: Number(apiKeyId) },
    data: { keyHash },
    include: { creator: { select: { id: true, name: true, email: true } } },
  });

  await logAuditAction(userId, 'APIKEY_REGENERATED', {
    resourceType: 'APIKEY',
    resourceId: apiKeyId,
    resourceName: updated.name,
    projectId: updated.projectId,
  });

  return {
    ...updated,
    key: rawKey,
  };
}

// Get API key usage stats
export async function getApiKeyStats(apiKeyId, projectId) {
  const key = await prisma.apiKey.findFirst({
    where: { id: Number(apiKeyId), projectId: Number(projectId) },
  });

  if (!key) {
    throw new Error('API key not found');
  }

  return {
    name: key.name,
    isActive: key.isActive,
    rateLimit: key.rateLimit,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    isExpired: key.expiresAt && new Date(key.expiresAt) < new Date(),
    daysUntilExpiry: key.expiresAt
      ? Math.ceil((new Date(key.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
      : null,
  };
}
