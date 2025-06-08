/**
 * Report Controller
 *
 * Handles requests related to content reporting features,
 * allowing users to report offensive AI-generated content
 * and administrators to manage those reports.
 */

const Report = require('../models/Report');
const Character = require('../models/Character');
const logger = require('../utils/logger');

/**
 * Submit a new content report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function submitReport(req, res) {
  try {
    const {
      characterId,
      messageContent,
      reason,
      details,
      metadata,
    } = req.body;

    // Basic validation
    if (!characterId || !messageContent || !reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: characterId, messageContent, and reason are required',
      });
    }

    // Get reporter ID from request (could be device ID, user ID, or IP address if anonymous)
    const reporterId = req.headers['x-device-id'] || req.headers['firebase-id'] || req.ip;

    // Check if character exists - use only the id field, not _id (ObjectId)
    const characterExists = await Character.findOne({ id: characterId });

    if (!characterExists) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found',
      });
    }

    // Create the report
    const report = new Report({
      characterId,
      reporterId,
      messageContent,
      reason,
      details,
      metadata: {
        ...metadata,
        appVersion: req.headers['x-app-version'] || 'unknown',
        deviceInfo: req.headers['user-agent'] || 'unknown',
      },
    });

    // Save the report
    await report.save();

    // Log the report without sensitive content
    logger.info(`New content report submitted for character ${characterId} by ${reporterId}`);

    // Return success response
    return res.status(201).json({
      status: 'success',
      message: 'Report submitted successfully',
      reportId: report._id,
    });
  } catch (error) {
    logger.error('Error submitting report:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to submit report',
      error: error.message,
    });
  }
}

/**
 * Get reports (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getReports(req, res) {
  try {
    const { status, characterId, page = 1, limit = 20 } = req.query;

    // Build query based on filters
    const query = {};
    if (status) {query.status = status;}
    if (characterId) {query.characterId = characterId;}

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get reports with pagination
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Report.countDocuments(query);

    return res.json({
      status: 'success',
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting reports:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve reports',
      error: error.message,
    });
  }
}

/**
 * Get a single report by ID (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getReportById(req, res) {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
    }

    return res.json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    logger.error('Error getting report by ID:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve report',
      error: error.message,
    });
  }
}

/**
 * Update report status (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, resolution, notes } = req.body;

    // Validate status
    if (!status || !['pending', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value',
      });
    }

    // Find the report
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
    }

    // Update report status
    report.status = status;

    // Update admin review if status is resolved or dismissed
    if (status === 'resolved' || status === 'dismissed') {
      report.adminReview = {
        reviewedBy: req.adminUser?.username || 'admin',
        reviewedAt: new Date(),
        resolution: resolution || status,
        notes: notes,
      };
    }

    // Save changes
    await report.save();

    return res.json({
      status: 'success',
      message: 'Report status updated successfully',
      data: report,
    });
  } catch (error) {
    logger.error('Error updating report status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update report status',
      error: error.message,
    });
  }
}

/**
 * Get report statistics (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getReportStats(req, res) {
  try {
    // Get counts by status
    const statusCounts = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Format status counts
    const statusStats = {};
    statusCounts.forEach(item => {
      statusStats[item._id] = item.count;
    });

    // Get counts by reason
    const reasonCounts = await Report.aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } },
    ]);

    // Format reason counts
    const reasonStats = {};
    reasonCounts.forEach(item => {
      reasonStats[item._id] = item.count;
    });

    // Get reports by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyReports = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      status: 'success',
      data: {
        totalReports: await Report.countDocuments(),
        statusStats,
        reasonStats,
        dailyReports,
      },
    });
  } catch (error) {
    logger.error('Error getting report statistics:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve report statistics',
      error: error.message,
    });
  }
}

module.exports = {
  submitReport,
  getReports,
  getReportById,
  updateReportStatus,
  getReportStats,
};
