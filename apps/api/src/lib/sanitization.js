/**
 * INPUT SANITIZATION & VALIDATION UTILITY
 * Provides centralized sanitization for user inputs to prevent XSS and injection attacks
 */

// HTML special characters to escape
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Sanitize a text input (trim, length validation, escape HTML)
 * @param {string} input - Input text
 * @param {Object} options - Configuration options
 * @returns {string} Sanitized text
 */
export function sanitizeText(input, options = {}) {
  const {
    minLength = 1,
    maxLength = 1000,
    trim = true,
    escapeHtml: shouldEscape = false,
    nullable = false,
  } = options;

  // Handle null/undefined
  if (!input) {
    if (nullable) return null;
    return '';
  }

  // Ensure it's a string
  if (typeof input !== 'string') {
    if (nullable) return null;
    return String(input);
  }

  // Trim whitespace if requested
  let sanitized = trim ? input.trim() : input;

  // Validate length
  if (sanitized.length < minLength) {
    throw new Error(`Input must be at least ${minLength} characters`);
  }

  if (sanitized.length > maxLength) {
    throw new Error(`Input must not exceed ${maxLength} characters`);
  }

  // Escape HTML if requested
  if (shouldEscape) {
    sanitized = escapeHtml(sanitized);
  }

  return sanitized;
}

/**
 * Sanitize an email address
 * @param {string} email - Email to sanitize
 * @returns {string} Sanitized email (lowercase, trimmed)
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a valid string');
  }

  const sanitized = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  if (sanitized.length > 255) {
    throw new Error('Email must not exceed 255 characters');
  }

  return sanitized;
}

/**
 * Sanitize a URL
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a valid string');
  }

  const trimmed = url.trim();

  // Reject dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();

  if (dangerousProtocols.some((proto) => lowerUrl.startsWith(proto))) {
    throw new Error('URL contains dangerous protocol');
  }

  // Validate URL format
  try {
    new URL(trimmed, 'http://localhost');
  } catch {
    throw new Error('Invalid URL format');
  }

  return trimmed;
}

/**
 * Sanitize a JSON field containing potentially untrusted content
 * @param {Object} json - Object to sanitize
 * @param {Array} fieldsToEscape - Fields that should have HTML escaped
 * @returns {Object} Sanitized object
 */
export function sanitizeJson(json, fieldsToEscape = []) {
  if (!json || typeof json !== 'object') {
    return json;
  }

  const sanitized = { ...json };

  for (const field of fieldsToEscape) {
    if (field in sanitized && typeof sanitized[field] === 'string') {
      sanitized[field] = escapeHtml(sanitized[field]);
    }
  }

  return sanitized;
}

/**
 * Sanitize a description or comment field
 * @param {string} description - Description text
 * @param {Object} options - Configuration options
 * @returns {string} Sanitized description
 */
export function sanitizeDescription(description, options = {}) {
  return sanitizeText(description, {
    minLength: 0,
    maxLength: 5000, // Longer max for descriptions
    trim: true,
    escapeHtml: true, // Always escape HTML in descriptions
    nullable: options.nullable || false,
  });
}

/**
 * Sanitize an array of tags
 * @param {Array} tags - Array of tags
 * @returns {Array} Sanitized tags
 */
export function sanitizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
    .map((tag) => sanitizeText(tag, { maxLength: 50 }))
    .slice(0, 20); // Limit to 20 tags
}

/**
 * Sanitize search query
 * @param {string} query - Search query
 * @returns {string} Sanitized query
 */
export function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query must be a valid string');
  }

  const sanitized = sanitizeText(query, {
    minLength: 2,
    maxLength: 200,
    trim: true,
    escapeHtml: false, // Don't escape for search
  });

  // Remove dangerous regex characters
  return sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize numeric input
 * @param {any} value - Value to sanitize as number
 * @param {Object} options - Configuration options
 * @returns {number} Sanitized number
 */
export function sanitizeNumber(value, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, nullable = false } = options;

  if (value === null || value === undefined) {
    if (nullable) return null;
    throw new Error('Number is required');
  }

  const num = Number(value);

  if (isNaN(num)) {
    throw new Error('Invalid number');
  }

  if (num < min || num > max) {
    throw new Error(`Number must be between ${min} and ${max}`);
  }

  return num;
}

/**
 * Batch sanitize an object based on schema
 * @param {Object} data - Object to sanitize
 * @param {Object} schema - Schema defining which fields to sanitize and how
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(data, schema = {}) {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const sanitized = {};

  for (const [field, config] of Object.entries(schema)) {
    const value = data[field];

    if (value === undefined || value === null) {
      if (config.nullable) {
        sanitized[field] = null;
      }
      continue;
    }

    switch (config.type) {
      case 'text':
        sanitized[field] = sanitizeText(value, config);
        break;
      case 'email':
        sanitized[field] = sanitizeEmail(value);
        break;
      case 'url':
        sanitized[field] = sanitizeUrl(value);
        break;
      case 'number':
        sanitized[field] = sanitizeNumber(value, config);
        break;
      case 'tags':
        sanitized[field] = sanitizeTags(value);
        break;
      case 'description':
        sanitized[field] = sanitizeDescription(value, config);
        break;
      default:
        sanitized[field] = value;
    }
  }

  return sanitized;
}

export default {
  escapeHtml,
  sanitizeText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeJson,
  sanitizeDescription,
  sanitizeTags,
  sanitizeSearchQuery,
  sanitizeNumber,
  sanitizeObject,
};
