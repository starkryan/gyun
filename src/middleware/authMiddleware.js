/**
 * Authentication Middleware
 *
 * Handles authentication for admin routes and protected endpoints
 */

const logger = require('../utils/logger');

/**
 * Validate admin credentials from request
 * Checks for admin API key in headers or query parameters
 */
const validateAdmin = (req, res, next) => {
  try {
    // Get the admin API key from environment variables
    const validApiKey = process.env.ADMIN_API_KEY;

    if (!validApiKey) {
      logger.error('ADMIN_API_KEY not set in environment variables');
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error',
      });
    }

    // Get the provided API key from headers or query parameters
    const providedApiKey = req.headers['x-api-key'] || req.query.apiKey;

    // Check if the API key is valid
    if (providedApiKey !== validApiKey) {
      logger.warn(`Invalid admin API key attempt: ${req.ip}`);
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - invalid API key',
      });
    }

    // Set admin user info for use in controllers
    req.adminUser = {
      username: 'admin',
      role: 'admin',
      timestamp: new Date(),
    };

    // Authentication successful, proceed to the next middleware
    next();
  } catch (error) {
    logger.error('Error in admin authentication middleware:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication',
    });
  }
};

/**
 * Validate Firebase authentication
 * Checks for Firebase auth token in headers
 */
const validateFirebaseAuth = (req, res, next) => {
  try {
    // Get the Firebase token from the request headers
    const firebaseToken = req.headers['firebase-token'];
    const firebaseId = req.headers['firebase-id'];

    // For anonymous auth, we only validate that an ID is present
    // In a production app, you would verify the token with Firebase Admin SDK
    if (!firebaseId) {
      logger.warn(`Authentication attempt without Firebase ID: ${req.ip}`);
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - missing authentication',
      });
    }

    // Set the authenticated user info for use in controllers
    req.user = {
      firebaseId,
      isAnonymous: !firebaseToken, // If no token, assume anonymous auth
      timestamp: new Date(),
    };

    // Authentication successful, proceed to the next middleware
    next();
  } catch (error) {
    logger.error('Error in Firebase authentication middleware:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication',
    });
  }
};

/**
 * Validate basic user authentication
 * For future use with user accounts
 */
const validateUser = (req, res, next) => {
  // For now, we'll just pass through as we don't have user accounts yet
  // This is a placeholder for future implementation
  next();
};

module.exports = {
  validateAdmin,
  validateUser,
  validateFirebaseAuth,
};
