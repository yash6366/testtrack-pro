/**
 * INPUT VALIDATION UTILITIES
 * Safe parsing and validation functions to prevent NaN and injection issues
 */

/**
 * Safely parse a value to an integer
 * @param {any} value - Value to parse
 * @param {Object} options - Parsing options
 * @param {string} options.fieldName - Name of field (for error messages)
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @param {boolean} options.allowNull - Whether null/undefined is allowed
 * @returns {number|null} Parsed integer
 * @throws {Error} If value is invalid
 */
export function parseIntSafe(value, options = {}) {
  const {
    fieldName = 'Value',
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    allowNull = false,
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      return null;
    }
    throw new Error(`${fieldName} is required`);
  }

  // Parse the value
  const parsed = parseInt(value, 10);

  // Check if parsing resulted in NaN
  if (isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid integer`);
  }

  // Check if it's a safe integer
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${fieldName} is outside safe integer range`);
  }

  // Validate range
  if (parsed < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (parsed > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }

  return parsed;
}

/**
 * Safely parse a value to a positive integer (ID)
 * @param {any} value - Value to parse
 * @param {string} fieldName - Name of field (for error messages)
 * @param {boolean} allowNull - Whether null/undefined is allowed
 * @returns {number|null} Parsed positive integer
 * @throws {Error} If value is invalid or not positive
 */
export function parseId(value, fieldName = 'ID', allowNull = false) {
  const parsed = parseIntSafe(value, { fieldName, min: 1, allowNull });
  
  if (parsed !== null && parsed < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  
  return parsed;
}

/**
 * Safely parse an array of IDs
 * @param {any} values - Array of values to parse
 * @param {string} fieldName - Name of field (for error messages)
 * @returns {number[]} Array of parsed positive integers
 * @throws {Error} If any value is invalid
 */
export function parseIdArray(values, fieldName = 'IDs') {
  if (!Array.isArray(values)) {
    throw new Error(`${fieldName} must be an array`);
  }

  if (values.length === 0) {
    throw new Error(`${fieldName} array cannot be empty`);
  }

  return values.map((value, index) => 
    parseId(value, `${fieldName}[${index}]`, false)
  );
}

/**
 * Safely parse a value to a float
 * @param {any} value - Value to parse
 * @param {Object} options - Parsing options
 * @param {string} options.fieldName - Name of field (for error messages)
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @param {boolean} options.allowNull - Whether null/undefined is allowed
 * @returns {number|null} Parsed float
 * @throws {Error} If value is invalid
 */
export function parseFloatSafe(value, options = {}) {
  const {
    fieldName = 'Value',
    min = -Infinity,
    max = Infinity,
    allowNull = false,
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      return null;
    }
    throw new Error(`${fieldName} is required`);
  }

  // Parse the value
  const parsed = parseFloat(value);

  // Check if parsing resulted in NaN
  if (isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  // Check if it's finite
  if (!isFinite(parsed)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  // Validate range
  if (parsed < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (parsed > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }

  return parsed;
}

/**
 * Safely parse pagination parameters
 * @param {any} skip - Skip/offset value
 * @param {any} take - Take/limit value
 * @returns {Object} Validated {skip, take}
 */
export function parsePagination(skip, take) {
  const validatedSkip = parseIntSafe(skip, {
    fieldName: 'skip',
    min: 0,
    max: 1000000,
    allowNull: true,
  }) ?? 0;

  const validatedTake = parseIntSafe(take, {
    fieldName: 'take',
    min: 1,
    max: 100,
    allowNull: true,
  }) ?? 20;

  return { skip: validatedSkip, take: validatedTake };
}

/**
 * Validate that a value is one of allowed enum values
 * @param {any} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of field (for error messages)
 * @param {boolean} allowNull - Whether null/undefined is allowed
 * @returns {string|null} Validated value
 * @throws {Error} If value is not in allowed values
 */
export function validateEnum(value, allowedValues, fieldName = 'Value', allowNull = false) {
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      return null;
    }
    throw new Error(`${fieldName} is required`);
  }

  if (!allowedValues.includes(value)) {
    throw new Error(
      `${fieldName} must be one of: ${allowedValues.join(', ')}. Got: ${value}`
    );
  }

  return value;
}

/**
 * Safely convert route parameter to integer
 * @param {any} param - Route parameter
 * @param {string} paramName - Parameter name
 * @returns {number} Validated integer
 * @throws {Error} If parameter is invalid
 */
export function validateRouteParam(param, paramName = 'parameter') {
  return parseId(param, paramName, false);
}

/**
 * Batch validate multiple IDs
 * @param {Object} params - Object with ID parameters
 * @returns {Object} Object with validated IDs
 * @throws {Error} If any ID is invalid
 */
export function validateRouteParams(params) {
  const validated = {};
  
  for (const [key, value] of Object.entries(params)) {
    // Only validate parameters that end with 'Id' or are named 'id'
    if (key === 'id' || key.endsWith('Id')) {
      validated[key] = parseId(value, key, false);
    } else {
      validated[key] = value;
    }
  }
  
  return validated;
}

export default {
  parseIntSafe,
  parseId,
  parseIdArray,
  parseFloatSafe,
  parsePagination,
  validateEnum,
  validateRouteParam,
  validateRouteParams,
};
