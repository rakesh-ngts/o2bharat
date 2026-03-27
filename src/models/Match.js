const mongoose = require('mongoose');

/**
 * Match Schema - Suggested matches for users
 */
const matchSchema = new mongoose.Schema(
  {
    // User for whom this match is suggested
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Matched profile
    matchedProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    
    // Match score (calculated)
    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    
    // Match reasons
    matchReasons: [{
      type: String,
    }],
    
    // Status
    isViewed: {
      type: Boolean,
      default: false,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    isShortlisted: {
      type: Boolean,
      default: false,
    },
    shortlistedAt: {
      type: Date,
      default: null,
    },
    isIgnored: {
      type: Boolean,
      default: false,
    },
    ignoredAt: {
      type: Date,
      default: null,
    },
    
    // Algorithm version (to recompute if algorithm changes)
    algorithmVersion: {
      type: String,
      default: '1.0',
    },
    
    // Computed at
    computedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
matchSchema.index({ user: 1, matchedProfile: 1 }, { unique: true });
matchSchema.index({ user: 1, matchScore: -1 });
matchSchema.index({ user: 1, isViewed: 1 });
matchSchema.index({ user: 1, isShortlisted: 1 });
matchSchema.index({ computedAt: 1 });

// Method to mark as viewed
matchSchema.methods.markViewed = function () {
  this.isViewed = true;
  this.viewedAt = new Date();
  return this.save();
};

// Method to shortlist
matchSchema.methods.shortlist = function () {
  this.isShortlisted = true;
  this.shortlistedAt = new Date();
  return this.save();
};

// Method to remove from shortlist
matchSchema.methods.unshortlist = function () {
  this.isShortlisted = false;
  this.shortlistedAt = null;
  return this.save();
};

// Method to ignore
matchSchema.methods.ignore = function () {
  this.isIgnored = true;
  this.ignoredAt = new Date();
  return this.save();
};

// Static method to get matches
matchSchema.statics.getMatches = function (userId, options = {}) {
  const query = { user: userId, isIgnored: false };
  
  if (options.shortlisted) query.isShortlisted = true;
  if (options.unviewed) query.isViewed = false;
  
  return this.find(query)
    .populate({
      path: 'matchedProfile',
      select: 'basicInfo photos profileId physicalDetails education career address.current maritalStatus religion caste',
    })
    .sort({ matchScore: -1, createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get daily matches
matchSchema.statics.getDailyMatches = function (userId, limit = 10) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    user: userId,
    isIgnored: false,
    computedAt: { $gte: today },
  })
    .populate('matchedProfile', 'basicInfo photos profileId')
    .sort({ matchScore: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Match', matchSchema);