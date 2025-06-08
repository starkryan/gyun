/**
 * Report Routes
 *
 * API routes for content reporting features:
 * - Public routes for users to submit reports
 * - Admin routes for managing and reviewing reports
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { validateAdmin, validateFirebaseAuth } = require('../middleware/authMiddleware');

// Public route - submit a report (requires Firebase auth)
router.post('/', validateFirebaseAuth, reportController.submitReport);

// Admin routes - protected by admin authentication
router.get('/', validateAdmin, reportController.getReports);
router.get('/stats', validateAdmin, reportController.getReportStats);
router.get('/:id', validateAdmin, reportController.getReportById);
router.put('/:id/status', validateAdmin, reportController.updateReportStatus);

module.exports = router;
