const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const config = require('../config');

/**
 * Protect routes - Verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized to access this route. Please login.');
    }

    // Verify token
    const decoded = jwt.verify(token, config.JWT.SECRET);

    // Find user by ID from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new ApiError(401, 'User not found. Please login again.');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'Your account has been deactivated. Please contact support.');
    }

    // Check if user is verified
    // if (!user.isVerified) {
    //   throw new ApiError(401, 'Please verify your account to continue.');
    // }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Invalid token. Please login again.'));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Token expired. Please login again.'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional auth - Attach user if token present, but don't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, config.JWT.SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive && user.isVerified) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};

/**
 * Admin authentication middleware
 */
const adminProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized. Admin login required.');
    }

    const decoded = jwt.verify(token, config.JWT.SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      throw new ApiError(401, 'Admin not found.');
    }

    if (!admin.isActive) {
      throw new ApiError(401, 'Admin account is deactivated.');
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Invalid admin token.'));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Admin token expired.'));
    } else {
      next(error);
    }
  }
};

/**
 * Role-based authorization for admins
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new ApiError(403, 'Not authorized to perform this action.'));
    }

    if (!roles.includes(req.admin.role)) {
      return next(new ApiError(403, `Role '${req.admin.role}' is not authorized to perform this action.`));
    }
    next();
  };
};

/**
 * Check if user owns the profile/resource
 */
const checkOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        throw new ApiError(400, 'Resource ID is required.');
      }

      // For Profile model, check if user owns the profile
      if (resourceModel.modelName === 'Profile') {
        const profile = await resourceModel.findById(resourceId);
        
        if (!profile) {
          throw new ApiError(404, 'Resource not found.');
        }

        if (profile.user.toString() !== req.user._id.toString()) {
          throw new ApiError(403, 'Not authorized to access this resource.');
        }
        
        req.resource = profile;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check subscription limits
 */
const checkSubscriptionLimit = (feature) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const profile = await require('../models/Profile').findOne({ user: user._id });

      if (!profile) {
        throw new ApiError(404, 'Profile not found.');
      }

      // Check subscription and limits
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));

      // If subscription is active, check feature limits
      if (profile.subscription && profile.subscription.endDate > new Date()) {
        // Get subscription limits from config
        const planKey = profile.subscription.plan.toUpperCase();
        const planConfig = config.SUBSCRIPTION[planKey] || config.SUBSCRIPTION.FREE;

        switch (feature) {
          case 'profileView':
            if (planConfig.PROFILE_VIEWS_PER_DAY !== -1) {
              const viewsToday = profile.stats?.profileViewsToday || 0;
              if (viewsToday >= planConfig.PROFILE_VIEWS_PER_DAY) {
                throw new ApiError(403, 'Daily profile view limit reached. Please upgrade your plan.');
              }
            }
            break;
          case 'sendInterest':
            if (planConfig.INTERESTS_PER_DAY !== -1) {
              const interestsToday = profile.stats?.interestsSentToday || 0;
              if (interestsToday >= planConfig.INTERESTS_PER_DAY) {
                throw new ApiError(403, 'Daily interest limit reached. Please upgrade your plan.');
              }
            }
            break;
          case 'chat':
            if (!planConfig.CHAT_ACCESS) {
              throw new ApiError(403, 'Chat access requires a paid subscription.');
            }
            break;
        }
      } else {
        // Free user limits
        switch (feature) {
          case 'profileView':
            const viewsToday = profile.stats?.profileViewsToday || 0;
            if (viewsToday >= config.SUBSCRIPTION.FREE.PROFILE_VIEWS_PER_DAY) {
              throw new ApiError(403, 'Daily profile view limit reached. Please upgrade your plan.');
            }
            break;
          case 'sendInterest':
            const interestsToday = profile.stats?.interestsSentToday || 0;
            if (interestsToday >= config.SUBSCRIPTION.FREE.INTERESTS_PER_DAY) {
              throw new ApiError(403, 'Daily interest limit reached. Please upgrade your plan.');
            }
            break;
          case 'chat':
            throw new ApiError(403, 'Chat access requires a paid subscription.');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Rate limiter for sensitive operations
 */
const sensitiveRateLimit = (maxAttempts = 5, windowMinutes = 15) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // Clean old entries
    for (const [k, v] of attempts.entries()) {
      if (now - v.firstAttempt > windowMs) {
        attempts.delete(k);
      }
    }

    const userAttempts = attempts.get(key);

    if (!userAttempts) {
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    if (userAttempts.count >= maxAttempts) {
      const timeLeft = Math.ceil((windowMs - (now - userAttempts.firstAttempt)) / 1000 / 60);
      throw new ApiError(429, `Too many attempts. Please try again in ${timeLeft} minutes.`);
    }

    userAttempts.count++;
    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  adminProtect,
  authorize,
  checkOwnership,
  checkSubscriptionLimit,
  sensitiveRateLimit
};