/**
 * FRONTEND MONITORING & ERROR TRACKING
 * Sentry integration for React frontend
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for frontend monitoring
 */
export function initializeMonitoring() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';

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
    
    // Enable React-specific features
    integrations: [
      new Sentry.BrowserTracing({
        // Set tracePropagationTargets to control the URLs we trace
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/.*\.testtrack\.app/,
        ],
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
      new Sentry.Replay({
        // Capture 10% of all sessions
        sessionSampleRate: 0.1,
        // Capture 100% of sessions with errors
        errorSampleRate: 1.0,
        // Mask all text content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter out errors we don't care about
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // Browser extension errors
      'Extension context invalidated',
      'chrome-extension://',
      'moz-extension://',
      // Third-party errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],

    // Filter out transactions we don't need
    beforeSendTransaction(event) {
      // Filter out health checks and other noise
      if (event.transaction?.includes('/health')) {
        return null;
      }
      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        service: 'testtrack-web',
      },
    },
  });

  console.log('✅ Sentry monitoring initialized');
}

/**
 * Set user context for error tracking
 * @param {Object} user - User object
 */
export function setUser(user) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

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
 * Capture exception manually
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
 * Capture message
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
 * Add breadcrumb for debugging
 * @param {Object} breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a performance transaction
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @returns {Transaction}
 */
export function startTransaction(name, op = 'pageload') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Create error boundary
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Create profiler for performance monitoring
 */
export const Profiler = Sentry.Profiler;

/**
 * Wrap React Router for better error tracking
 */
export function createSentryRoutes(routes) {
  return Sentry.wrapCreateBrowserRouter(
    createBrowserRouter
  )(routes);
}

export default {
  initializeMonitoring,
  setUser,
  clearUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  ErrorBoundary,
  Profiler,
  createSentryRoutes,
};
