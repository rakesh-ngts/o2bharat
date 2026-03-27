const mongoose = require('mongoose');
const { REPORT_REASONS } = require('../utils/constants');

/**
 * Report Schema - User reports for profiles
 */
const reportSchema = new mongoose.Schema(
  {
    // Reporter
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Reported profile
    reportedProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Report details
    reason: {
      type: String,
      enum: Object.values(REPORT_REASONS),
      required: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
    },
    
    // Admin actions
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    action: {
      type: String,
      enum: ['none', 'warning', 'suspension', 'ban', 'profile_removed'],
      default: 'none',
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ reporter: 1 });
reportSchema.index({ reportedProfile: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });

// Static method to get pending reports
reportSchema.statics.getPendingReports = function (options = {}) {
  return this.find({ status: 'pending' })
    .populate('reporter', 'name email')
    .populate('reportedProfile', 'basicInfo profileId')
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

module.exports = mongoose.model('Report', reportSchema);