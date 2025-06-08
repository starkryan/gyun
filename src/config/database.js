const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 30000, // Increased timeout for server selection
  connectTimeoutMS: 30000, // Increased connection timeout
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,
  autoIndex: true,
  bufferCommands: true,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
};

// Track connection retry attempts
let retryCount = 0;
const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY = 5000;
const MAX_RETRY_DELAY = 60000;

// Calculate exponential backoff delay
const getRetryDelay = () => {
  const delay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
    MAX_RETRY_DELAY
  );
  return delay;
};

// Connect to MongoDB with retry mechanism
const connectWithRetry = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    if (mongoose.connection.readyState === 1) {
      logger.info('🟢 MongoDB is already connected');
      return;
    }

    logger.info('Attempting to connect to MongoDB...');
    logger.info(`Using ${uri.includes('mongodb+srv') ? 'cloud' : 'local'} MongoDB connection`);

    await mongoose.connect(uri, mongoOptions);

    logger.info('🟢 MongoDB connection established');
    logger.info(`✅ Connected to MongoDB database: ${mongoose.connection.db.databaseName}`);

    // Reset retry count on successful connection
    retryCount = 0;

  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error.message);

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = getRetryDelay();
      logger.info(`🔄 Retrying connection in ${delay / 1000} seconds... (Attempt ${retryCount}/${MAX_RETRIES})`);
      setTimeout(connectWithRetry, delay);
    } else {
      logger.error(`❌ Failed to connect after ${MAX_RETRIES} attempts. Exiting...`);
      process.exit(1);
    }
  }
};

// Set up MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  logger.info('🟢 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  logger.error('🔴 MongoDB connection error:', err);
  if (mongoose.connection.readyState !== 1) {
    connectWithRetry();
  }
});

mongoose.connection.on('disconnected', () => {
  logger.warn('🟠 MongoDB disconnected');
  if (retryCount < MAX_RETRIES) {
    logger.info('Attempting to reconnect to MongoDB...');
    connectWithRetry();
  }
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    logger.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

// Export the connection function and mongoose instance
module.exports = {
  connectWithRetry,
  mongoose,
};
