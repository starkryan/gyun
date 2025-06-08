const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const helmet = require('helmet');
const compression = require('compression');
const timeout = require('connect-timeout');
// const { AccessToken } = require('livekit-server-sdk'); // Removed LiveKit
// const { StreamClient } = require('@stream-io/node-sdk'); // Removed Stream.io
const crypto = require('crypto'); // For generating UUIDs for callId and userId

// Load environment variables
dotenv.config();

// OpenAI API Key
const openAiApiKey = process.env.OPENAI_API_KEY;

// let streamClient; // Removed Stream.io
// if (streamApiKey && streamApiSecret) { // Removed Stream.io
//   streamClient = new StreamClient(streamApiKey, streamApiSecret); // Removed Stream.io
//   logger.info('StreamClient initialized successfully.'); // Removed Stream.io
// } else { // Removed Stream.io
//   logger.warn('STREAM_API_KEY or STREAM_API_SECRET is missing. StreamClient not initialized. AI voice assistant features will not work.'); // Removed Stream.io
// } // Removed Stream.io

if (!openAiApiKey) {
  logger.warn('OPENAI_API_KEY is missing. OpenAI features might be affected.'); // Adjusted warning
}

// Import routes
const characterRoutes = require('./routes/characterRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reportRoutes = require('./routes/reportRoutes');
const mediaRoutes = require('./routes/mediaRoutes'); // Import media routes
// const payuRoutes = require('./routes/payuRoutes'); // Removed PayU routes
const userRoutes = require('./routes/userRoutes'); // Import user routes
const carasoulsRoutes = require('./routes/carasoulsRoutes'); // Import carousel routes

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Log important environment details at startup
logger.info(`Starting server with NODE_ENV: ${NODE_ENV}`);
logger.info(`PORT environment variable: ${process.env.PORT || '(not set, using default)'}`);
logger.info(`MongoDB URI: ${process.env.MONGODB_URI ? (process.env.MONGODB_URI.includes('mongodb+srv') ? 'Using cloud MongoDB' : 'Using local MongoDB') : 'Not set'}`);

// Apply security headers in production
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for admin dashboard
  }));
}

// Enable response compression
app.use(compression());

// Set request timeout (30 seconds)
app.use(timeout('30s'));

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log when the request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.url} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 400) {
      logger.warn(logMessage);
    } else {
      logger.info(logMessage);
    }
  });

  // Skip logging request bodies for sensitive endpoints
  const sensitiveEndpoints = [
    '/api/ai/character/response',
    '/character/response',
    '/api/characters',
    '/api/ai/character',
  ];

  const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => req.url.includes(endpoint));

  // Only log request bodies in development and for non-sensitive endpoints
  if (!isProduction && !isSensitiveEndpoint && (req.method === 'POST' || req.method === 'PUT')) {
    // Mask potential sensitive data in the request body
    const sanitizedBody = req.body ? { ...req.body } : {};

    // Mask potential sensitive fields
    if (sanitizedBody.message) {sanitizedBody.message = '[CONTENT MASKED]';}
    if (sanitizedBody.conversation) {sanitizedBody.conversation = '[CONVERSATION MASKED]';}
    if (sanitizedBody.messages) {sanitizedBody.messages = '[MESSAGES MASKED]';}
    if (sanitizedBody.content) {sanitizedBody.content = '[CONTENT MASKED]';}

    logger.debug('Request Body:', sanitizedBody);
    if (req.files) {
      const fileInfo = Object.keys(req.files).reduce((acc, key) => {
        acc[key] = {
          name: req.files[key].name,
          size: req.files[key].size,
          mimetype: req.files[key].mimetype,
        };
        return acc;
      }, {});
      logger.debug('Request Files:', fileInfo);
    }
  }

  next();
});

// Ensure required directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}:`, error);
    }
  }
};

// Create required directories
ensureDirectoryExists(path.join(__dirname, '../uploads/temp'));
ensureDirectoryExists(path.join(__dirname, '../public/images'));
ensureDirectoryExists(path.join(__dirname, '../logs'));

// Serve static files
app.use('/images', express.static(path.join(__dirname, '../public/images')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // Serve general uploads folder
app.use('/static', express.static(path.join(__dirname, '../public')));

// Serve admin dashboard static files
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Serve the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Removed Stream.io related helper function and endpoints

// Removed LiveKit Token Endpoint

// Add a MongoDB status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        status: 'error',
        message: 'MongoDB is not connected',
        readyState: mongoose.connection.readyState,
        readyStateDesc: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
      });
    }

    // Basic connectivity test
    const stats = await mongoose.connection.db.stats();

    // Get current database name
    const dbName = mongoose.connection.db.databaseName;

    // Return success with basic stats
    return res.json({
      status: 'success',
      message: 'MongoDB is connected',
      database: dbName,
      isCloudDB: process.env.MONGODB_URI?.includes('mongodb+srv') || false,
      stats: {
        collections: stats.collections,
        views: stats.views,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
      },
    });
  } catch (error) {
    logger.error('Error checking MongoDB status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error checking MongoDB status',
      error: error.message,
    });
  }
});

// Routes
app.use('/api/characters', characterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/media', mediaRoutes); // Use media routes
// app.use('/api/payu', payuRoutes); // Removed PayU routes
app.use('/api/users', userRoutes); // Use user routes
app.use('/api/carasouls', carasoulsRoutes); // Use carousel routes

// Health check route
app.get('/api/health', (req, res) => {
  const requestInfo = {
    ip: req.ip,
    protocol: req.protocol,
    host: req.get('host'),
    originalUrl: req.originalUrl,
  };

  logger.info(`Health check requested from: ${req.ip}`);

  // Don't log sensitive headers
  const sanitizedRequestInfo = { ...requestInfo };
  if (process.env.NODE_ENV === 'development') {
    // Create a sanitized headers object with sensitive values masked
    const sanitizedHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (['authorization', 'cookie', 'firebase-id', 'x-device-id'].includes(key.toLowerCase())) {
        sanitizedHeaders[key] = '[MASKED]';
      } else {
        sanitizedHeaders[key] = value;
      }
    }
    sanitizedRequestInfo.headers = sanitizedHeaders;
    logger.info(`Health check request details: ${JSON.stringify(sanitizedRequestInfo)}`);
  }

  const healthData = {
    status: 'ok',
    message: 'Server is running',
    environment: NODE_ENV,
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    hostname: require('os').hostname(),
    port: PORT,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  logger.info(`Health check response: ${JSON.stringify(healthData)}`);
  res.status(200).json(healthData);
});

// Admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// OpenAI status dashboard
app.get('/admin/openai-status', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/openai-status.html'));
});

// OpenAPI documentation
app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, './config/openapi.html'));
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error processing ${req.method} ${req.url}:`, err);

  // Handle timeout errors
  if (req.timedout) {
    return res.status(503).json({
      status: 'error',
      message: 'Request timeout',
      code: 'TIMEOUT',
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  // Add connection pool options for cloud MongoDB
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  // Add retry options
  retryWrites: true,
  retryReads: true,
  // Add timeout options
  heartbeatFrequencyMS: 10000,
  // Add auto index creation
  autoIndex: true,
  // Add buffer commands
  bufferCommands: true,
};

// Connect to MongoDB with retry logic
const connectWithRetry = () => {
  logger.info('Attempting to connect to MongoDB...');
  const isCloudConnection = process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv');

  if (isCloudConnection) {
    logger.info('Using cloud MongoDB connection');
    logger.info(`Connection string: ${process.env.MONGODB_URI.replace(/:[^:\/]+@/, ':****@')}`);
  } else {
    logger.info('Using local MongoDB connection');
    logger.warn('No MONGODB_URI environment variable found or not using cloud connection. This will fail on Railway.');
  }

  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lomu', mongoOptions)
    .then(() => {
      // Verify connection has a database
      if (!mongoose.connection.db) {
        logger.error('MongoDB connection succeeded but no database available');
        setTimeout(connectWithRetry, 5000);
        return;
      }

      try {
        const dbName = mongoose.connection.db.databaseName;
        logger.info('🟢 MongoDB connection established');
        logger.info(`✅ Connected to MongoDB database: ${dbName}`);

        // Start server only after successful MongoDB connection
        const server = app.listen(PORT, '0.0.0.0', () => {
          const isRailway = process.env.RAILWAY_SERVICE_ID !== undefined;
          const baseUrl = isRailway ? 'https://legabhai.up.railway.app' : `http://localhost:${PORT}`;

          logger.info(`✅ Server running on port ${PORT} in ${NODE_ENV} mode`);
          logger.info(`🌐 Server address: ${server.address().address}:${server.address().port}`);
          logger.info(`🔗 API Health Check: ${baseUrl}/api/health`);
          logger.info(`📚 API Docs: ${baseUrl}/api-docs`);
          logger.info(`👑 Admin Dashboard: ${baseUrl}/admin`);
        });

        // Handle server errors
        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
            process.exit(1);
          } else if (error.code === 'EACCES') {
            logger.error(`❌ No permission to bind to port ${PORT}. Try running with higher privileges.`);
            process.exit(1);
          } else {
            logger.error(`❌ Server error: ${error.message}`);
            process.exit(1);
          }
        });

        // Set server timeouts
        server.timeout = 60000; // 60 seconds
        server.keepAliveTimeout = 65000; // 65 seconds
        server.headersTimeout = 66000; // 66 seconds
      } catch (err) {
        logger.error('Error accessing database after connection:', err);
        setTimeout(connectWithRetry, 5000);
      }
    })
    .catch((err) => {
      logger.error('❌ Failed to connect to MongoDB:', err.message);

      // More detailed error diagnostics
      if (isCloudConnection) {
        logger.error('Cloud connection error details:');
        if (err.name === 'MongoServerSelectionError') {
          logger.error('  - Server selection timeout - check your network, VPN settings, or MongoDB Atlas status');
        } else if (err.message.includes('authentication failed')) {
          logger.error('  - Authentication failed - check your username and password in the connection string');
        } else if (err.message.includes('timed out')) {
          logger.error('  - Connection timed out - check your network or firewall settings');
        } else if (err.message.includes('ENOTFOUND')) {
          logger.error('  - DNS lookup failed - check your MongoDB host/cluster URL');
        }
      }

      logger.info('🔄 Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

// Initial connection attempt
connectWithRetry();

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  logger.info('🟢 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error('🔴 MongoDB connection error:', err);
  // Try to reconnect if this is a runtime error (not during initial connection)
  if (mongoose.connection.readyState !== 0) {
    logger.info('Attempting to reconnect to MongoDB...');
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lomu', mongoOptions)
      .catch(err => logger.error('Failed to reconnect:', err));
  }
});

mongoose.connection.on('disconnected', () => {
  logger.warn('🟠 MongoDB disconnected');
  // Only try to reconnect if the app is still running (not during shutdown)
  if (!process.env.SERVER_SHUTTING_DOWN) {
    logger.info('Attempting to reconnect to MongoDB...');
    setTimeout(connectWithRetry, 5000);
  }
});

// Handle app shutdown
process.on('SIGINT', async () => {
  process.env.SERVER_SHUTTING_DOWN = 'true';
  logger.info('SIGINT received. Shutting down gracefully...');

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  process.env.SERVER_SHUTTING_DOWN = 'true';
  logger.info('SIGTERM received. Shutting down gracefully...');

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥', err);
  // In production, we don't want to crash the server
  if (!isProduction) {
    process.exit(1);
  }
});
