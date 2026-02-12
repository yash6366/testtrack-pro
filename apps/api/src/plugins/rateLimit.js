/**
 * RATE LIMITING PLUGIN FOR FASTIFY
 * Protects against brute force and DDoS attacks
 * Uses in-memory storage (can be upgraded to Redis for distributed systems)
 */

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  constructor(windowSize = 60000, maxRequests = 100) {
    this.windowSize = windowSize; // Time window in milliseconds
    this.maxRequests = maxRequests; // Max requests per window
    this.requests = new Map(); // Key -> Array of timestamps
  }

  /**
   * Check if a request should be allowed
   * @param {string} key - Identifier (IP, user ID, etc)
   * @returns {boolean|number} True if allowed, false if rate limited, or remaining time
   */
  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowSize;

    // Get or initialize request list for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    let requestTimes = this.requests.get(key);

    // Remove old requests outside the window
    requestTimes = requestTimes.filter((time) => time > windowStart);
    this.requests.set(key, requestTimes);

    // Check if limit exceeded
    if (requestTimes.length >= this.maxRequests) {
      const oldestRequest = requestTimes[0];
      const timeUntilReset = oldestRequest + this.windowSize - now;
      return timeUntilReset;
    }

    // Record this request
    requestTimes.push(now);
    return true;
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Identifier to reset
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Clear all data (useful for testing)
   */
  clear() {
    this.requests.clear();
  }
}

// Rate limiters for different endpoints
const limiters = {
  // Auth endpoints - strict (100 req/15 min = ~6-7 per minute)
  auth: new RateLimiter(15 * 60 * 1000, 100),

  // Login specifically - very strict (20 per 5min)
  login: new RateLimiter(5 * 60 * 1000, 20),

  // Signup - moderate (50 per 15 min)
  signup: new RateLimiter(15 * 60 * 1000, 50),

  // Email verification - moderate (30 per hour)
  emailVerify: new RateLimiter(60 * 60 * 1000, 30),

  // Password reset - strict (10 per hour)
  passwordReset: new RateLimiter(60 * 60 * 1000, 10),

  // Search - moderate (200 per minute per user)
  search: new RateLimiter(60 * 1000, 200),

  // General API - generous (1000 per minute per user)
  general: new RateLimiter(60 * 1000, 1000),
};

/**
 * Get rate limiter by name
 * @param {string} name - Limiter name
 * @returns {RateLimiter} Rate limiter instance
 */
function getLimiter(name = 'general') {
  return limiters[name] || limiters.general;
}

/**
 * Get rate limit key from request
 * Prefers authenticated user ID, falls back to IP address
 * @param {object} request - Fastify request
 * @returns {string} Rate limit key
 */
function getRateLimitKey(request) {
  // If user is authenticated, use user ID
  if (request.user?.id) {
    return `user:${request.user.id}`;
  }

  // Fall back to IP address (supports X-Forwarded-For for proxies)
  const forwardedFor = request.headers['x-forwarded-for'];
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : request.ip;
  return `ip:${ip}`;
}

/**
 * Create rate limit middleware
 * @param {string} limiterName - Name of rate limiter to use
 * @returns {function} Middleware function
 */
function createRateLimitMiddleware(limiterName = 'general') {
  return async (request, reply) => {
    const limiter = getLimiter(limiterName);
    const key = getRateLimitKey(request);

    const result = limiter.isAllowed(key);

    if (result !== true) {
      // Rate limited
      const retryAfter = Math.ceil(result / 1000); // Convert to seconds

      // Set rate limit headers
      reply.header('Retry-After', retryAfter.toString());
      reply.header('X-RateLimit-Limit', limiter.maxRequests.toString());
      reply.header('X-RateLimit-Remaining', '0');
      reply.header('X-RateLimit-Reset', (Date.now() + result).toString());

      return reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
        metadata: {
          retryAfter,
          resetAt: new Date(Date.now() + result).toISOString(),
        },
      });
    }

    // Set rate limit headers for successful requests
    const limiter2 = getLimiter(limiterName);
    reply.header('X-RateLimit-Limit', limiter2.maxRequests.toString());
    reply.header('X-RateLimit-Remaining', (limiter2.maxRequests - 1).toString());
  };
}

/**
 * Fastify plugin for rate limiting
 * Usage: await fastify.register(rateLimitPlugin)
 * @param {object} fastify - Fastify instance
 * @param {object} options - Plugin options
 */
export async function rateLimitPlugin(fastify, options = {}) {
  const defaultLimiterName = options.defaultLimiter || 'general';

  // Add middleware for all requests (can customize per route)
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip rate limiting for health checks
    if (request.url === '/health') {
      return;
    }

    // Determine which limiter to use based on route
    let limiterName = defaultLimiterName;

    if (request.url.startsWith('/api/auth/login')) {
      limiterName = 'login';
    } else if (request.url.startsWith('/api/auth/signup')) {
      limiterName = 'signup';
    } else if (request.url.startsWith('/api/auth/verify-email')) {
      limiterName = 'emailVerify';
    } else if (request.url.startsWith('/api/auth/reset-password')) {
      limiterName = 'passwordReset';
    } else if (request.url.startsWith('/api/search')) {
      limiterName = 'search';
    }

    const middleware = createRateLimitMiddleware(limiterName);
    await middleware(request, reply);
  });

  // Expose limiter utilities on fastify instance
  fastify.decorate('rateLimiter', {
    getLimiter,
    getRateLimitKey,
    createRateLimitMiddleware,
    // For testing: reset rate limiter
    reset: (name) => {
      if (name) {
        getLimiter(name).clear();
      } else {
        Object.values(limiters).forEach((limiter) => limiter.clear());
      }
    },
  });

  fastify.log.info('Rate limiting plugin registered');
}

export { RateLimiter, createRateLimitMiddleware, getRateLimitKey };
