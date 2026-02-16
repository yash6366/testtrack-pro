/**
 * COMPONENT LAZY LOADING UTILITY
 * Helper utilities for lazy loading React components with dynamic imports
 * Supports error boundaries and fallback components
 */

import { lazy, Suspense } from 'react';

/**
 * Lazy load a component with a fallback UI
 * @param {Function} importFunc - Dynamic import function
 * @param {React.ComponentType} fallback - Fallback component
 * @returns {React.ComponentType} Wrapped component
 */
export function lazyLoad(importFunc, fallback = null) {
  const LazyComponent = lazy(importFunc);

  return (props) => (
    <Suspense fallback={fallback || <LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Lazy load a modal component
 * Modal components don't need to be loaded until opened
 * @param {Function} importFunc - Dynamic import function
 * @returns {React.ComponentType} Lazy modal component
 */
export function lazyLoadModal(importFunc) {
  const LazyModal = lazy(importFunc);

  return (props) => (
    <Suspense fallback={null}>
      <LazyModal {...props} />
    </Suspense>
  );
}

/**
 * Dynamically import utility functions
 * Useful for large utility libraries that aren't needed on initial load
 * @param {string} module - Module path
 * @returns {Promise} Module import promise
 */
export async function dynamicImport(module) {
  try {
    const imported = await import(module);
    return imported;
  } catch (error) {
    console.error(`Failed to dynamically import ${module}:`, error);
    return null;
  }
}

/**
 * Pre-load a component for better performance
 * Call this when you know a component will be needed soon
 * @param {Function} importFunc - Dynamic import function
 */
export function preloadComponent(importFunc) {
  importFunc().catch((err) => {
    console.warn('Failed to preload component:', err);
  });
}

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default {
  lazyLoad,
  lazyLoadModal,
  dynamicImport,
  preloadComponent,
};
