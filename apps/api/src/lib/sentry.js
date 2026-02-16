/**
 * SENTRY ERROR TRACKING & PERFORMANCE MONITORING
 * Initialize Sentry for backend error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry
 * @param {Object} app - Fastify app instance
 */
export function initializeSentry(app) {
  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  
  // Only initialize if DSN is provided
  if (!sentryDsn) {
    console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // In production, reduce this to 0.1 (10%) or lower
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Enable Express tracing (Fastify compatible)
      new Sentry.Integrations.Express({
        app: app,
      }),
    ],

    // Ignore specific errors
    ignoreErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'AbortError',
      'CanceledError',
    ],

    // Filter out health check and monitoring endpoints
    beforeSendTransaction(event) {
      const transaction = event.transaction;
      if (
        transaction &&
        (transaction.includes('/health') ||
          transaction.includes('/metrics') ||
          transaction.includes('/api/health'))
      ) {
        return null; // Don't send to Sentry
      }
      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        service: 'testtrack-api',
      },
    },
  });

  console.log('✅ Sentry initialized for error tracking and performance monitoring');
}

/**
 * Capture exception to Sentry
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Capture message to Sentry
 * @param {string} message - Message to log
 * @param {string} level - Log level (info, warning, error)
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
}

/**
 * Set user context for Sentry
 * @param {Object} user - User object
 */
export function setUser(user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  });
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * @param {Object} breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a transaction for performance monitoring
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @returns {Transaction}
 */
export function startTransaction(name, op = 'http') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Fastify error handler for Sentry
 */
export function sentryErrorHandler(error, request, reply) {
  // Add request context
  Sentry.setContext('request', {
    method: request.method,
    url: request.url,
    query: request.query,
    headers: request.headers,
    ip: request.ip,
  });

  // Add user context if available
  if (request.user) {
    setUser(request.user);
  }

  // Capture the error
  Sentry.captureException(error);

  // Continue with default error handling
  reply.send(error);
}

/**
 * Close Sentry
 * @returns {Promise<boolean>}
 */
export async function closeSentry() {
  await Sentry.close(2000);
  console.log('Sentry connection closed');
}

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  sentryErrorHandler,
  closeSentry,
};
