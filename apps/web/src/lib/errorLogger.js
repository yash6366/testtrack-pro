/**
 * Error logging utility
 * Logs errors to console in development and can send to monitoring services in production
 */

/* eslint-disable no-console */

const isDevelopment = import.meta.env.DEV;

/**
 * Log an error with context
 * @param {Error|string} error - The error to log
 * @param {string} context - Context about where/why the error occurred
 * @param {Object} metadata - Additional metadata to log
 */
export function logError(error, context = '', metadata = {}) {
  // Always log to console in development
  if (isDevelopment) {
    if (context) {
      console.error(`[${context}]`, error);
    } else {
      console.error(error);
    }
    
    if (Object.keys(metadata).length > 0) {
      console.error('Additional context:', metadata);
    }
  }

  // In production, you could send to Sentry or other monitoring service
  // Example (if Sentry is configured):
  // if (!isDevelopment && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     tags: { context },
  //     extra: metadata
  //   });
  // }
}

/**
 * Log a warning with context
 * @param {string} message - Warning message
 * @param {Object} metadata - Additional metadata
 */
export function logWarning(message, metadata = {}) {
  if (isDevelopment) {
    console.warn(message);
    if (Object.keys(metadata).length > 0) {
      console.warn('Additional context:', metadata);
    }
  }
}

/**
 * Log info message (development only)
 * @param {string} message - Info message
 * @param {any} data - Additional data to log
 */
export function logInfo(message, data) {
  if (isDevelopment) {
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
}
