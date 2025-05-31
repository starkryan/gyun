const mongoose = require('mongoose');

/**
 * Report Schema
 * Stores user reports about AI-generated content that might be offensive
 */
const ReportSchema = new mongoose.Schema({
  // Reference to the character that generated the content
  characterId: {
    type: String,
    required: true,
  },

  // Device ID or user ID of the reporter
  reporterId: {
    type: String,
    required: true,
  },

  // The original message that was reported
  messageContent: {
    type: String,
    required: true,
  },

  // Reporting reason
  reason: {
    type: String,
    required: true,
    enum: ['offensive_language', 'inappropriate_content', 'harmful_information', 'other'],
  },

  // Additional details/comments provided by the user
  details: {
    type: String,
  },

  // Metadata about the conversation
  metadata: {
    conversationId: String,
    messageId: String,
    messageTimestamp: Date,
    appVersion: String,
    deviceInfo: String,
  },

  // Report status tracking
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
  },

  // Admin handling data
  adminReview: {
    reviewedBy: String,
    reviewedAt: Date,
    resolution: String,
    notes: String,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp on save
ReportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for faster queries
ReportSchema.index({ characterId: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
