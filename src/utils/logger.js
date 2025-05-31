/**
 * Simple logger utility for the application
 * Provides consistent logging across the codebase
 */

// Log levels enum
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Current log level (can be set via environment variable)
// Default to INFO in production, DEBUG in development
const currentLogLevel = process.env.LOG_LEVEL
  ? parseInt(process.env.LOG_LEVEL)
  : (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

/**
 * Format the current timestamp for logging
 * @returns {string} Formatted timestamp
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Sanitize potentially sensitive data for logging
 * @param {any} data - Data to sanitize
 * @returns {any} - Sanitized data safe for logging
 */
const sanitizeForLogging = (data) => {
  if (!data) {return data;}

  // If data is a string, mask it if it's long
  if (typeof data === 'string' && data.length > 50) {
    return data.substring(0, 20) + '... [CONTENT TRUNCATED]';
  }

  // If data is an object or array, process recursively
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      // For arrays, sanitize each element
      return data.map(item => sanitizeForLogging(item));
    } else {
      // For objects, process each property
      const sanitized = {};

      // Sensitive keys that should always be masked
      const sensitiveKeys = [
        'message', 'content', 'conversation', 'system', 'prompt',
        'response', 'password', 'token', 'apiKey', 'secret',
        'authorization', 'userMessage', 'assistantMessage',
      ];

      for (const key in data) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          // This is a sensitive field - mask it
          sanitized[key] = '[SENSITIVE CONTENT MASKED]';
        } else {
          // Recursively sanitize non-sensitive fields
          sanitized[key] = sanitizeForLogging(data[key]);
        }
      }

      return sanitized;
    }
  }

  // Return primitive values as is
  return data;
};

/**
 * Log an error message
 * @param {string} message - The error message
 * @param {any} error - Optional error object
 */
const error = (message, error) => {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(`[${getTimestamp()}] [ERROR] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(error.stack || error.message);
      } else {
        console.error(sanitizeForLogging(error));
      }
    }
  }
};

/**
 * Log a warning message
 * @param {string} message - The warning message
 */
const warn = (message) => {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`);
  }
};

/**
 * Log an info message
 * @param {string} message - The info message
 */
const info = (message) => {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.info(`[${getTimestamp()}] [INFO] ${message}`);
  }
};

/**
 * Log a debug message
 * @param {string} message - The debug message
 * @param {any} data - Optional data to log
 */
const debug = (message, data) => {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.debug(`[${getTimestamp()}] [DEBUG] ${message}`);
    if (data !== undefined) {
      // Sanitize data before logging to prevent sensitive information leakage
      console.debug(sanitizeForLogging(data));
    }
  }
};

// Export the logger functions
module.exports = {
  error,
  warn,
  info,
  debug,
  sanitizeForLogging,
  LOG_LEVELS,
};
