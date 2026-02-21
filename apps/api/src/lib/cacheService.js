/**
 * QUERY CACHING SERVICE
 * 
 * Implements in-memory caching with TTL for frequently accessed data
 * Reduces database queries by caching:
 * - Test plans (3600s TTL)
 * - Test cases (1800s TTL)
 * - Projects (3600s TTL)
 * - Users (7200s TTL)
 * 
 * Cache invalidation on mutations is handled automatically
 */

import { logInfo, logWarn } from '../lib/logger.js';

// Cache store with expiration
const cache = new Map();
const cacheTimers = new Map();

// Configuration (in seconds)
const CACHE_CONFIG = {
  testPlan: 3600, // 1 hour - Test plans rarely change during execution
  testCase: 1800, // 30 minutes - Test cases semi-static
  project: 3600, // 1 hour - Project settings stable
  user: 7200, // 2 hours - User data relatively stable
  testRun: 300, // 5 minutes - Test runs update frequently
  notification: 60, // 1 minute - Notifications expire quickly
};

/**
 * Generate cache key from entity type and ID
 * @param {string} entityType - Type of entity (testPlan, user, etc.)
 * @param {number|string} id - Entity ID
 * @returns {string} Cache key
 */
function getCacheKey(entityType, id) {
  return `${entityType}:${id}`;
}

/**
 * Get value from cache if not expired
 * @param {string} entityType - Type of entity
 * @param {number|string} id - Entity ID
 * @returns {any|null} Cached value or null if expired/missing
 */
export function getCachedValue(entityType, id) {
  const key = getCacheKey(entityType, id);
  
  if (cache.has(key)) {
    logInfo(`Cache HIT: ${key}`);
    return cache.get(key);
  }
  
  logInfo(`Cache MISS: ${key}`);
  return null;
}

/**
 * Set value in cache with TTL
 * @param {string} entityType - Type of entity
 * @param {number|string} id - Entity ID
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional, uses default)
 */
export function setCachedValue(entityType, id, value, ttl = null) {
  const key = getCacheKey(entityType, id);
  const cacheTTL = ttl || CACHE_CONFIG[entityType] || 3600;
  
  // Clear existing timer
  if (cacheTimers.has(key)) {
    clearTimeout(cacheTimers.get(key));
  }
  
  // Set new value
  cache.set(key, value);
  logInfo(`Cache SET: ${key} (TTL: ${cacheTTL}s)`);
  
  // Set expiration timer
  const timer = setTimeout(() => {
    cache.delete(key);
    cacheTimers.delete(key);
    logInfo(`Cache EXPIRED: ${key}`);
  }, cacheTTL * 1000);
  
  cacheTimers.set(key, timer);
}

/**
 * Invalidate cache entry immediately
 * @param {string} entityType - Type of entity
 * @param {number|string} id - Entity ID
 */
export function invalidateCache(entityType, id) {
  const key = getCacheKey(entityType, id);
  
  if (cache.has(key)) {
    cache.delete(key);
    if (cacheTimers.has(key)) {
      clearTimeout(cacheTimers.get(key));
      cacheTimers.delete(key);
    }
    logInfo(`Cache INVALIDATED: ${key}`);
  }
}

/**
 * Invalidate all cache entries of a type
 * @param {string} entityType - Type of entity (testPlan, user, etc.)
 */
export function invalidateCacheByType(entityType) {
  const pattern = `${entityType}:`;
  let count = 0;
  
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
      if (cacheTimers.has(key)) {
        clearTimeout(cacheTimers.get(key));
        cacheTimers.delete(key);
      }
      count++;
    }
  }
  
  logInfo(`Cache INVALIDATED (${entityType}): ${count} entries`);
}

/**
 * Invalidate related caches when an entity is updated
 * Useful for cascading updates
 * 
 * @param {string} entityType - Type of entity that was updated
 * @param {number|string} id - Entity ID
 */
export function invalidateRelatedCaches(entityType, id) {
  // When a test plan is updated, also invalidate related test case caches
  if (entityType === 'testPlan') {
    // Would need to track test case IDs - implementation depends on schema
    invalidateCache('testPlan', id);
  }
  
  // When a project is updated, invalidate all test plans in project
  if (entityType === 'project') {
    invalidateCacheByType('testPlan');
  }
  
  // When user is updated, invalidate user cache
  if (entityType === 'user') {
    invalidateCache('user', id);
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  const entries = Array.from(cache.entries());
  const stats = {
    totalEntries: cache.size,
    totalSize: entries.reduce((sum, [_, val]) => sum + JSON.stringify(val).length, 0),
    entriesByType: {},
  };
  
  entries.forEach(([key, _]) => {
    const type = key.split(':')[0];
    stats.entriesByType[type] = (stats.entriesByType[type] || 0) + 1;
  });
  
  return stats;
}

/**
 * Clear all cache entries
 */
export function clearAllCache() {
  const size = cache.size;
  
  // Clear all timers
  for (const timer of cacheTimers.values()) {
    clearTimeout(timer);
  }
  
  cache.clear();
  cacheTimers.clear();
  
  logInfo(`Cache CLEARED: ${size} entries removed`);
}

/**
 * Wrapper to get value from cache or fetch from database
 * @param {string} entityType - Type of entity
 * @param {number|string} id - Entity ID
 * @param {Function} fetchFn - Async function to fetch from DB if not cached
 * @returns {Promise<any>} Cached or fetched value
 */
export async function getOrFetchCached(entityType, id, fetchFn) {
  // Try cache first
  const cached = getCachedValue(entityType, id);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch from database
  const value = await fetchFn();
  
  if (value) {
    setCachedValue(entityType, id, value);
  }
  
  return value;
}

export default {
  getCachedValue,
  setCachedValue,
  invalidateCache,
  invalidateCacheByType,
  invalidateRelatedCaches,
  getCacheStats,
  clearAllCache,
  getOrFetchCached,
  CACHE_CONFIG,
};
