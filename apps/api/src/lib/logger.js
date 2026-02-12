/**
 * STRUCTURED LOGGING SERVICE
 * Provides centralized, structured logging for the entire application
 * Outputs logs as JSON for easy parsing and analysis
 */

let loggerInstance = null;

/**
 * Initialize logger (should be called with Fastify logger)
 * @param {object} fastifyLogger - Fastify's built-in logger
 */
export function initializeLogger(fastifyLogger) {
  loggerInstance = fastifyLogger;
}

/**
 * Get logger instance, fallback to console if not initialized
 * @returns {object} Logger instance
 */
function getLogger() {
  return (
    loggerInstance || {
      info: (msg, data) => console.log(JSON.stringify({ level: 'info', message: msg, ...data })),
      error: (msg, data) => console.error(JSON.stringify({ level: 'error', message: msg, ...data })),
      warn: (msg, data) => console.warn(JSON.stringify({ level: 'warn', message: msg, ...data })),
      debug: (msg, data) => console.log(JSON.stringify({ level: 'debug', message: msg, ...data })),
    }
  );
}

/**
 * Log informational message
 * @param {string} message - Log message
 * @param {object} data - Additional context data
 */
export function logInfo(message, data = {}) {
  const logger = getLogger();
  logger.info(message, {
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {object} data - Additional context data
 */
export function logWarn(message, data = {}) {
  const logger = getLogger();
  logger.warn(message, {
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Log error message with stack trace and context
 * @param {string} message - Log message
 * @param {Error|object} error - Error object or error data
 * @param {object} context - Additional context data
 */
export function logError(message, error = null, context = {}) {
  const logger = getLogger();
  const errorData = {
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (error instanceof Error) {
    errorData.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (typeof error === 'object') {
    errorData.error = error;
  }

  logger.error(message, errorData);
}

/**
 * Log debug message (only in development)
 * @param {string} message - Log message
 * @param {object} data - Additional context data
 */
export function logDebug(message, data = {}) {
  if (process.env.NODE_ENV !== 'production') {
    const logger = getLogger();
    logger.debug(message, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
}

/**
 * Log API request details
 * @param {object} request - Fastify request object
 * @param {object} additionalData - Extra data to include
 */
export function logRequest(request, additionalData = {}) {
  logInfo('API Request', {
    method: request.method,
    url: request.url,
    ip: request.ip,
    userId: request.user?.id,
    userRole: request.user?.role,
    ...additionalData,
  });
}

/**
 * Log API response details
 * @param {object} request - Fastify request object
 * @param {number} statusCode - HTTP status code
 * @param {number} duration - Duration in milliseconds
 * @param {object} additionalData - Extra data to include
 */
export function logResponse(request, statusCode, duration = 0, additionalData = {}) {
  const level = statusCode >= 400 ? 'warn' : 'info';
  const logFn = level === 'warn' ? logWarn : logInfo;

  logFn('API Response', {
    method: request.method,
    url: request.url,
    statusCode,
    durationMs: duration,
    ip: request.ip,
    userId: request.user?.id,
    ...additionalData,
  });
}

/**
 * Log database operation
 * @param {string} operation - Operation type (SELECT, INSERT, UPDATE, DELETE)
 * @param {string} table - Table name
 * @param {object} data - Operation data
 */
export function logDatabase(operation, table, data = {}) {
  logDebug('Database Operation', {
    operation,
    table,
    ...data,
  });
}

/**
 * Log authentication event
 * @param {string} action - Auth action (LOGIN, LOGOUT, SIGNUP, etc)
 * @param {number} userId - User ID
 * @param {object} additionalData - Extra data
 */
export function logAuth(action, userId = null, additionalData = {}) {
  logInfo(`Auth: ${action}`, {
    userId,
    action,
    ...additionalData,
  });
}

/**
 * Log business event (user action that changes state)
 * @param {string} event - Event name
 * @param {number} userId - User ID performing action
 * @param {string} resourceType - Type of resource affected
 * @param {number} resourceId - ID of resource affected
 * @param {object} changes - What changed
 */
export function logBusinessEvent(event, userId, resourceType, resourceId, changes = {}) {
  logInfo('Business Event', {
    event,
    userId,
    resourceType,
    resourceId,
    changes,
  });
}

/**
 * Log performance metric
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @param {string} unit - Unit of measurement (ms, requests, etc)
 * @param {object} tags - Additional tags
 */
export function logMetric(metric, value, unit = '', tags = {}) {
  logDebug('Performance Metric', {
    metric,
    value,
    unit,
    tags,
  });
}

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {string} severity - Severity level (LOW, MEDIUM, HIGH, CRITICAL)
 * @param {object} details - Event details
 */
export function logSecurityEvent(event, severity = 'MEDIUM', details = {}) {
  const logFn = severity === 'CRITICAL' ? logError : logWarn;
  logFn(`Security Event: ${event}`, {
    event,
    severity,
    ...details,
  });
}

/**
 * Log a validation error
 * @param {string} field - Field name that failed validation
 * @param {string} reason - Why validation failed
 * @param {object} context - Additional context
 */
export function logValidationError(field, reason, context = {}) {
  logWarn('Validation Error', {
    field,
    reason,
    ...context,
  });
}

/**
 * Create a request logger middleware for Fastify
 * @returns {function} Middleware function
 */
export function createRequestLoggerMiddleware() {
  return async (request, reply) => {
    const startTime = Date.now();

    // Log request
    logRequest(request, {
      body: request.method !== 'GET' ? '[redacted]' : undefined,
    });

    // Hook to log response
    reply.addHook('onSend', (request, reply, payload, done) => {
      const duration = Date.now() - startTime;
      logResponse(request, reply.statusCode, duration);
      done(null, payload);
    });
  };
}

export default {
  initializeLogger,
  logInfo,
  logWarn,
  logError,
  logDebug,
  logRequest,
  logResponse,
  logDatabase,
  logAuth,
  logBusinessEvent,
  logMetric,
  logSecurityEvent,
  logValidationError,
  createRequestLoggerMiddleware,
};
