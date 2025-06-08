const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mongoose = require('mongoose');
const openaiService = require('../services/openaiService');
const { execSync } = require('child_process');

// Set up multer for file uploads - same config as in characterRoutes
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Ensure the directory exists
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  console.log('Admin route processing file:', file.fieldname, file.originalname);
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload middleware for character images
const characterUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
]);

// Authentication
router.post('/login', adminController.login);

// Protected admin routes
router.get('/stats', adminAuth, adminController.getStats);
router.get('/characters', adminAuth, adminController.getAllCharacters);

// Add debug middleware and Multer for character creation
router.post('/characters', adminAuth, (req, res, next) => {
  console.log('ADMIN CHARACTER CREATE - Pre-multer:', {
    contentType: req.headers['content-type'],
    body: req.body,
    files: req.files,
  });
  next();
}, characterUpload, (req, res, next) => {
  console.log('ADMIN CHARACTER CREATE - Post-multer:', {
    body: req.body,
    files: req.files,
  });
  next();
}, adminController.createCharacter);

router.put('/characters/:id', adminAuth, characterUpload, adminController.updateCharacter);
router.delete('/characters/:id', adminAuth, adminController.deleteCharacter);
router.get('/characters/:id', adminAuth, adminController.getCharacterById);

/**
 * @route GET /api/admin/status
 * @description Get server status information
 * @access Admin
 */
router.get('/status', async (req, res) => {
  try {
    // Get system information
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAvg: os.loadavg(),
    };

    // Get MongoDB connection status
    const dbStatus = {
      connected: mongoose.connection.readyState === 1,
      name: mongoose.connection.name || 'Not connected',
    };

    // Get OpenAI API status
    let openaiStatus;
    try {
      openaiStatus = await openaiService.checkHealth();
    } catch (error) {
      openaiStatus = { status: 'error', error: error.message };
    }

    // Get Git information
    let gitInfo = {};
    try {
      const rootDir = path.resolve(__dirname, '../..');

      // Get current branch
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: rootDir,
        encoding: 'utf8',
      }).trim();

      // Get last commit
      const lastCommit = execSync('git log -1 --pretty=format:"%h - %s (%cr)"', {
        cwd: rootDir,
        encoding: 'utf8',
      }).trim();

      // Get commit count
      const commitCount = execSync('git rev-list --count HEAD', {
        cwd: rootDir,
        encoding: 'utf8',
      }).trim();

      gitInfo = {
        branch,
        lastCommit,
        commitCount,
      };
    } catch (error) {
      gitInfo = { error: 'Git information unavailable' };
    }

    // Get Node.js information
    const nodeInfo = {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      env: process.env.NODE_ENV || 'development',
    };

    // Return all status information
    res.json({
      system: systemInfo,
      database: dbStatus,
      node: nodeInfo,
      openai: openaiStatus,
      git: gitInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting server status:', error);
    res.status(500).json({
      error: 'Failed to get server status',
      message: error.message,
    });
  }
});

/**
 * @route GET /api/admin/openai-status
 * @description Get OpenAI API status
 * @access Admin
 */
router.get('/openai-status', async (req, res) => {
  try {
    const status = await openaiService.checkHealth();
    res.json(status);
  } catch (error) {
    console.error('Error checking OpenAI status:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route GET /api/admin/models
 * @description Get available OpenAI models
 * @access Admin
 */
router.get('/models', async (req, res) => {
  try {
    const models = await openaiService.getAvailableModels();
    res.json({
      models,
      count: models.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting available models:', error);
    res.status(500).json({
      error: 'Failed to get available models',
      message: error.message,
    });
  }
});

module.exports = router;
