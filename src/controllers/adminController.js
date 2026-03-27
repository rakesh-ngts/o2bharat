const User = require('../models/User');
const Profile = require('../models/Profile');
const Interest = require('../models/Interest');
const Report = require('../models/Report');
const Admin = require('../models/Admin');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const config = require('../config');

/**
 * Get admin dashboard stats
 * @route GET /api/admin/stats
 * @access Private (Admin)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
    const sevenDaysAgo = new Date(today.setDate(today.getDate() - 7));

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalProfiles,
      completeProfiles,
      totalInterests,
      pendingInterests,
      acceptedInterests,
      totalReports,
      pendingReports,
      premiumSubscribers
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Profile.countDocuments({}),
      Profile.countDocuments({ 'verification.isProfileComplete': true }),
      Interest.countDocuments({}),
      Interest.countDocuments({ status: 'pending' }),
      Interest.countDocuments({ status: 'accepted' }),
      Report.countDocuments({}),
      Report.countDocuments({ status: 'pending' }),
      Profile.countDocuments({ 'subscription.plan': { $in: ['premium', 'vip'] } })
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth
      },
      profiles: {
        total: totalProfiles,
        complete: completeProfiles,
        completionRate: totalProfiles > 0 ? Math.round((completeProfiles / totalProfiles) * 100) : 0
      },
      interests: {
        total: totalInterests,
        pending: pendingInterests,
        accepted: acceptedInterests,
        acceptanceRate: totalInterests > 0 ? Math.round((acceptedInterests / totalInterests) * 100) : 0
      },
      reports: {
        total: totalReports,
        pending: pendingReports
      },
      revenue: {
        premiumSubscribers,
        estimatedRevenue: premiumSubscribers * 2499 // Rough estimate
      }
    };

    res.status(200).json(
      new ApiResponse(200, stats, 'Dashboard stats fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users with pagination and filters
 * @route GET /api/admin/users
 * @access Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (isVerified === 'true') query.isVerified = true;
    if (isVerified === 'false') query.isVerified = false;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json(
      new ApiResponse(200, {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Users fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user details with profile
 * @route GET /api/admin/users/:userId
 * @access Private (Admin)
 */
const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const profile = await Profile.findOne({ user: userId });
    
    const interests = await Interest.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).populate('sender receiver', 'name phone');

    const reports = await Report.find({ reportedUser: userId });

    res.status(200).json(
      new ApiResponse(200, {
        user,
        profile,
        interests,
        reports
      }, 'User details fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Activate/Deactivate user
 * @route PATCH /api/admin/users/:userId/status
 * @access Private (Admin)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    user.isActive = isActive;
    if (!isActive) {
      user.deactivatedAt = new Date();
      user.deactivationReason = reason;
    }
    await user.save();

    // Also update profile status
    await Profile.findOneAndUpdate(
      { user: userId },
      { isActive }
    );

    res.status(200).json(
      new ApiResponse(200, user, `User ${isActive ? 'activated' : 'deactivated'} successfully.`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Verify user manually
 * @route PATCH /api/admin/users/:userId/verify
 * @access Private (Admin)
 */
const verifyUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    await user.save();

    res.status(200).json(
      new ApiResponse(200, user, 'User verified successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user permanently
 * @route DELETE /api/admin/users/:userId
 * @access Private (Super Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    // Delete related data
    await Profile.deleteOne({ user: userId });
    await Interest.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
    await User.deleteOne({ _id: userId });

    res.status(200).json(
      new ApiResponse(200, null, 'User deleted successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reports
 * @route GET /api/admin/reports
 * @access Private (Admin)
 */
const getAllReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (status) query.status = status;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('reportedBy', 'name phone')
      .populate('reportedUser', 'name phone');

    const total = await Report.countDocuments(query);

    res.status(200).json(
      new ApiResponse(200, {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Reports fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve report
 * @route PATCH /api/admin/reports/:reportId/resolve
 * @access Private (Admin)
 */
const resolveReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      throw new ApiError(404, 'Report not found.');
    }

    report.status = 'resolved';
    report.resolution = {
      action,
      notes,
      resolvedBy: req.admin._id,
      resolvedAt: new Date()
    };
    await report.save();

    // If action is to block user
    if (action === 'block_user') {
      await User.findByIdAndUpdate(report.reportedUser, { isActive: false });
    }

    res.status(200).json(
      new ApiResponse(200, report, 'Report resolved successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all profiles with pagination
 * @route GET /api/admin/profiles
 * @access Private (Admin)
 */
const getAllProfiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, gender, isComplete, subscription } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (gender) query['basicInfo.gender'] = gender;
    if (isComplete === 'true') query['verification.isProfileComplete'] = true;
    if (isComplete === 'false') query['verification.isProfileComplete'] = false;
    if (subscription) query['subscription.plan'] = subscription;

    const profiles = await Profile.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name phone email isVerified');

    const total = await Profile.countDocuments(query);

    res.status(200).json(
      new ApiResponse(200, {
        profiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Profiles fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Approve/Reject profile photo
 * @route PATCH /api/admin/profiles/:profileId/photos/:photoId
 * @access Private (Admin)
 */
const reviewProfilePhoto = async (req, res, next) => {
  try {
    const { profileId, photoId } = req.params;
    const { isApproved, reason } = req.body;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      throw new ApiError(404, 'Profile not found.');
    }

    const photo = profile.photos.id(photoId);
    if (!photo) {
      throw new ApiError(404, 'Photo not found.');
    }

    photo.isVerified = isApproved;
    photo.rejectionReason = isApproved ? null : reason;
    await profile.save();

    // Create notification for user
    const Notification = require('../models/Notification');
    await Notification.create({
      user: profile.user,
      type: isApproved ? 'photo_approved' : 'photo_rejected',
      title: isApproved ? 'Photo Approved' : 'Photo Rejected',
      message: isApproved 
        ? 'Your photo has been approved.' 
        : `Your photo was rejected: ${reason || 'Does not meet guidelines'}`
    });

    res.status(200).json(
      new ApiResponse(200, profile, `Photo ${isApproved ? 'approved' : 'rejected'} successfully.`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create new admin
 * @route POST /api/admin/create
 * @access Private (Super Admin)
 */
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new ApiError(400, 'Admin with this email already exists.');
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role: role || 'moderator'
    });

    res.status(201).json(
      new ApiResponse(201, admin, 'Admin created successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all admins
 * @route GET /api/admin/admins
 * @access Private (Super Admin)
 */
const getAllAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find().select('-password');

    res.status(200).json(
      new ApiResponse(200, admins, 'Admins fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update admin status
 * @route PATCH /api/admin/admins/:adminId/status
 * @access Private (Super Admin)
 */
const updateAdminStatus = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { isActive } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new ApiError(404, 'Admin not found.');
    }

    admin.isActive = isActive;
    await admin.save();

    res.status(200).json(
      new ApiResponse(200, admin, `Admin ${isActive ? 'activated' : 'deactivated'} successfully.`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get analytics data
 * @route GET /api/admin/analytics
 * @access Private (Admin)
 */
const getAnalytics = async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;

    let groupBy, dateFormat;
    switch (period) {
      case 'daily':
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        groupBy = { $week: '$createdAt' };
        dateFormat = '%Y-W%V';
        break;
      case 'monthly':
      default:
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        dateFormat = '%Y-%m';
    }

    // User registration trend
    const userTrend = await User.aggregate([
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Interest activity trend
    const interestTrend = await Interest.aggregate([
      {
        $group: {
          _id: groupBy,
          total: { $sum: 1 },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Gender distribution
    const genderDistribution = await Profile.aggregate([
      {
        $group: {
          _id: '$basicInfo.gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Subscription distribution
    const subscriptionDistribution = await Profile.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top locations
    const topLocations = await Profile.aggregate([
      {
        $group: {
          _id: '$address.state',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json(
      new ApiResponse(200, {
        userTrend,
        interestTrend,
        genderDistribution,
        subscriptionDistribution,
        topLocations
      }, 'Analytics data fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  verifyUser,
  deleteUser,
  getAllReports,
  resolveReport,
  getAllProfiles,
  reviewProfilePhoto,
  createAdmin,
  getAllAdmins,
  updateAdminStatus,
  getAnalytics
};