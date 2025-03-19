/**
 * Simple logger utility for the application
 * Provides consistent logging across the codebase
 */

// Log levels enum
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
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
        console.error(error);
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
      console.debug(data);
    }
  }
};

// Export the logger functions
module.exports = {
  error,
  warn,
  info,
  debug,
  LOG_LEVELS
}; 