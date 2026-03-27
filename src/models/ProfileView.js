const mongoose = require('mongoose');

/**
 * ProfileView Schema - Track who viewed a profile
 */
const profileViewSchema = new mongoose.Schema(
  {
    // Profile that was viewed
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    
    // User who viewed
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // View metadata
    viewedAt: {
      type: Date,
      default: Date.now,
    },
    deviceType: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android',
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
profileViewSchema.index({ profile: 1, viewer: 1 });
profileViewSchema.index({ profile: 1, viewedAt: -1 });
profileViewSchema.index({ viewer: 1, viewedAt: -1 });

// Static method to record view
profileViewSchema.statics.recordView = async function (profileId, viewerId, metadata = {}) {
  // Check if already viewed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingView = await this.findOne({
    profile: profileId,
    viewer: viewerId,
    viewedAt: { $gte: today },
  });
  
  if (!existingView) {
    // Create new view record
    await this.create({
      profile: profileId,
      viewer: viewerId,
      deviceType: metadata.deviceType,
      ipAddress: metadata.ipAddress,
    });
    
    // Increment profile view count
    const Profile = require('./Profile');
    await Profile.findByIdAndUpdate(profileId, {
      $inc: { 'stats.profileViews': 1 },
    });
  }
  
  return !existingView;
};

// Static method to get profile views
profileViewSchema.statics.getProfileViews = function (profileId, options = {}) {
  return this.find({ profile: profileId })
    .populate('viewer', 'name')
    .sort({ viewedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get viewers list
profileViewSchema.statics.getViewers = async function (profileId, options = {}) {
  const views = await this.aggregate([
    { $match: { profile: mongoose.Types.ObjectId(profileId) } },
    { $sort: { viewedAt: -1 } },
    {
      $group: {
        _id: '$viewer',
        lastViewed: { $first: '$viewedAt' },
        viewCount: { $sum: 1 },
      },
    },
    { $skip: options.skip || 0 },
    { $limit: options.limit || 20 },
  ]);
  
  return views;
};

module.exports = mongoose.model('ProfileView', profileViewSchema);