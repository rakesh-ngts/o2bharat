const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Profile = require("../models/Profile");
const OTP = require("../models/OTP");
const ApiError = require("../utils/ApiError");
const config = require("../config");
const { generateOTP } = require("../utils/helpers");
const crypto = require("crypto");
const { USER_STATUS } = require("../utils/constants");

/**
 * Generate JWT tokens for user
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    config.JWT.SECRET,
    { expiresIn: config.JWT.EXPIRES_IN },
  );

  const refreshToken = jwt.sign({ id: user._id }, config.JWT.REFRESH_SECRET, {
    expiresIn: config.JWT.REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

/**
 * Register new user
 */
const register = async (userData) => {
  const {
    phone,
    email,
    password,
    name,
    address,
    dob,
    caste,
    community,
    subCaste,
    gender,
    profilePhoto,
  } = userData;

  const existingUser = await User.findOne({
    email,
  });

  if (existingUser) {
    throw new ApiError(400, "Email already registered.");
  }

  const user = await User.create({
    phone,
    email,
    password,
    name,
    address,
    dob: new Date(dob),
    caste,
    community,
    subCaste,
    gender,
    profilePhoto,
  });

  const userResponse = user.toObject();
  delete userResponse.password;

  return {
    user: userResponse,
  };
};

/**
 * Login user
 */
const login = async (email, password) => {
  // Find user by phone
  const user = await User.findOne({ email }).select("+password");

 

  if (!user) {
    throw new ApiError(401, "Invalid credentials.");
  }

  // Check if user is active
   if (user.status === USER_STATUS.INACTIVE) {
      return ApiResponse.error(res, { message: 'This account has been deleted.' }, 403);
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      return ApiResponse.error(res, { message: 'Account suspended. Contact support.' }, 403);
    }

    // if (user.status === USER_STATUS.BANNED) {
    //   return ApiResponse.error(res, { message: 'Account banned.' }, 403);
    // }

    // if (user.status === USER_STATUS.LOCKED) {
    //   return ApiResponse.error(res, { message: `Account locked. Reason: ${user.lockReason}` }, 403);
    // }

    // if (user.status === USER_STATUS.PENDING) {
    //   return ApiResponse.error(res, { message: 'Account not verified yet.' }, 403);
    // }


  // Compare password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials.");
  }

  // Check if user is verified
  // if (!user.isVerified) {
  //   // Generate new OTP for verification
  //   // const otp = await createOTP(phone, 'verification');
  //   throw new ApiError(403, 'Please verify your account first.', {
  //     requiresVerification: true,
  //     phone,
  //     // otp: config.NODE_ENV === 'development' ? otp : undefined
  //   });
  // }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Return user and tokens
  const userResponse = user.toObject();
  delete userResponse.password;

  return {
    user: userResponse,
    accessToken,
    refreshToken,
  };
};

/**
 * Verify OTP
 */
const verifyOTP = async (phone, otpCode, type = "registration") => {
  // Find valid OTP
  const otpRecord = await OTP.findOne({
    phone,
    otp: otpCode,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new ApiError(400, "Invalid or expired OTP.");
  }

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();

  // If registration/verification, verify user
  if (type === "registration" || type === "verification") {
    const user = await User.findOne({ phone });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    await user.save();

    // Create empty profile for user
    const existingProfile = await Profile.findOne({ user: user._id });
    if (!existingProfile) {
      await Profile.create({
        user: user._id,
        basicInfo: {
          name: user.name,
        },
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      verified: true,
      user: userResponse,
      accessToken,
      refreshToken,
    };
  }

  return { verified: true };
};

/**
 * Create and save OTP
 */
const createOTP = async (phone, type = "registration") => {
  // Generate OTP
  const otpCode = generateOTP(config.OTP.LENGTH);

  // Delete existing unused OTPs for this phone and type
  await OTP.deleteMany({ phone, type, isUsed: false });

  // Create new OTP
  const expiresAt = new Date(
    Date.now() + config.OTP.EXPIRY_MINUTES * 60 * 1000,
  );

  await OTP.create({
    phone,
    otp: otpCode,
    type,
    expiresAt,
  });

  // In production, send OTP via SMS
  // await sendSMS(phone, `Your OTP is ${otpCode}. Valid for ${config.OTP.EXPIRY_MINUTES} minutes.`);

  return otpCode;
};

/**
 * Resend OTP
 */
const resendOTP = async (phone, type = "registration") => {
  // Check if user exists
  const user = await User.findOne({ phone });

  if (type === "registration" && !user) {
    throw new ApiError(404, "User not found.");
  }

  // Check rate limiting (implement using Redis in production)
  // For now, just create new OTP

  // const otp = await createOTP(phone, type);

  return {
    message: "OTP sent successfully.",
    otp: config.NODE_ENV === "development" ? otp : undefined,
  };
};

/**
 * Forgot password - Send OTP
 */

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash token (security)
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Save in DB
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save();

  // Create reset URL
  const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

  // TODO: send email (nodemailer)
  console.log("Reset URL:", resetUrl);

  return {
    message: "Password reset link sent to email",
  };
};

/**
 * Reset password with OTP
 */

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token.");
  }

  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    throw new ApiError(
      400,
      "New password must be different from old password.",
    );
  }

  // 4.
  user.password = newPassword;

  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;

  // 6. Invalidate all existing sessions (IMPORTANT)
  user.refreshToken = null; // if storing single token
  // OR if using multiple tokens:
  // user.refreshTokens = [];

  // 7. Security flags
  user.isEmailVerified = true;
  user.passwordChangedAt = new Date();

  await user.save();

  console.log(`Password reset successful for user: ${user._id}`);

  return {
    message: "Password reset successful. Please login again.",
  };
};

/**
 * Change password (authenticated user)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return { message: "Password changed successfully." };
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, config.JWT.REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid refresh token.");
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }
};

/**
 * Logout user
 */
const logout = async (userId) => {
  // In production, invalidate refresh token in Redis
  // For now, just return success
  return { message: "Logged out successfully." };
};

/**
 * Delete account
 */
const deleteAccount = async (userId, password) => {
  const user = await User.findById(userId).select('+password');

  if (!user) throw new ApiError(404, 'User not found.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Password is incorrect.');

  await Profile.deleteOne({ user: userId });
  await OTP.deleteMany({ phone: user.phone });

  user.status  = USER_STATUS.INACTIVE;
  user.deletedAt = new Date();
console.log( user.tokenVersion)
  // ✅ Token invalidate — purane tokens kaam nahi karenge
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  return { message: 'Account deleted successfully.' };
};

/**
 * Admin login
 */
const adminLogin = async (email, password) => {
  const admin = await Admin.findOne({ email }).select("+password");

  if (!admin) {
    throw new ApiError(401, "Invalid credentials.");
  }

  if (!admin.isActive) {
    throw new ApiError(401, "Admin account is deactivated.");
  }

  const isMatch = await admin.comparePassword(password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const accessToken = jwt.sign(
    { id: admin._id, role: admin.role, isAdmin: true },
    config.JWT.SECRET,
    { expiresIn: "8h" },
  );

  admin.lastLogin = new Date();
  await admin.save();

  const adminResponse = admin.toObject();
  delete adminResponse.password;

  return {
    admin: adminResponse,
    accessToken,
  };
};

module.exports = {
  register,
  login,
  verifyOTP,
  createOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshAccessToken,
  logout,
  deleteAccount,
  adminLogin,
  generateTokens,
};
