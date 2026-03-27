const authService = require('../services/authService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * Register new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
  const userData =  req.body;

 

    const result = await authService.register(userData);

    return ApiResponse.success(res, result, 'Registration successful.');
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    

    const result = await authService.login(email, password);

    // Set refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'strict'
    });

    return ApiResponse.success(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP
 * @route POST /api/auth/verify-otp
 * @access Public
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp, type } = req.body;

    const result = await authService.verifyOTP(phone, otp, type || 'registration');

    // If user is now verified, set refresh token
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'strict'
      });
    }

   
      return ApiResponse.success(res, result, 'OTP verified successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP
 * @route POST /api/auth/resend-otp
 * @access Public
 */
const resendOTP = async (req, res, next) => {
  try {
    const { phone, type } = req.body;

    const result = await authService.resendOTP(phone, type || 'registration');

    
      return ApiResponse.success(res, result, 'OTP sent successfully.')
 
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - Send link
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    return ApiResponse.success(res, result, 'Reset link sent to your email.');
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with OTP
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res, next) => {
  try {
     const { token } = req.params;   // raw token from the email link
    const { newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict'
    });

    return ApiResponse.success(res, result, 'Password reset successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Change password (authenticated user)
 * @route POST /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const result = await authService.changePassword(userId, currentPassword, newPassword);

  
      return ApiResponse.success(res, result, 'Password changed successfully.')
    
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required.');
    }

    const result = await authService.refreshAccessToken(refreshToken);

    
      return ApiResponse.success(res, result, 'Token refreshed successfully.')
    
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await authService.logout(userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

   
      return ApiResponse.success(res, null, 'Logged out successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * @route GET /api/auth/me
 * @access Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = req.user;
      return ApiResponse.success(res, user, 'User fetched successfully.');
  
  } catch (error) {
    next(error);
  }
};

/**
 * Delete account
 * @route DELETE /api/auth/delete-account
 * @access Private
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    const result = await authService.deleteAccount(userId, password);

    res.clearCookie('refreshToken');

   return ApiResponse.success(res, result, 'Account deleted successfully.')
   
  } catch (error) {
    next(error);
  }
};

/**
 * Admin login
 * @route POST /api/auth/admin/login
 * @access Public
 */
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.adminLogin(email, password);

    res.cookie('adminToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      sameSite: 'strict'
    });

     return ApiResponse.success(200, result, 'Admin login successful.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Check phone availability
 * @route POST /api/auth/check-phone
 * @access Public
 */
const checkPhone = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const User = require('../models/User');

    const existingUser = await User.findOne({ phone });

    
      return ApiResponse.success(res, { 
        available: !existingUser,
        message: existingUser ? 'Phone number already registered.' : 'Phone number is available.'
      })
  
  } catch (error) {
    next(error);
  }
};

/**
 * Check email availability
 * @route POST /api/auth/check-email
 * @access Public
 */
const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const User = require('../models/User');

    const existingUser = await User.findOne({ email });

    return ApiResponse.success(res, { 
        available: !existingUser,
        message: existingUser ? 'Email already registered.' : 'Email is available.'
      })
  
  } catch (error) {
    next(error);
  }
};

const checkAvailability = async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    const User = require('../models/User');

    if (!phone && !email) {
      return ApiResponse.error(res, { message: 'Phone or email is required.' }, 400);
    }

    const orConditions = [];
    if (phone) orConditions.push({ phone });
    if (email) orConditions.push({ email });

    const existingUser = await User.findOne({ $or: orConditions });

    // Sirf wo fields response me bhejo jo request me aayi hain
    const result = {};

    if (phone) {
      result.phone = existingUser?.phone === phone
        ? { available: false, message: 'Phone number already registered.' }
        : { available: true,  message: 'Phone number is available.' };
    }

    if (email) {
      result.email = existingUser?.email === email
        ? { available: false, message: 'Email already registered.' }
        : { available: true,  message: 'Email is available.' };
    }

    return ApiResponse.success(res, result);

  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
  getCurrentUser,
  deleteAccount,
  adminLogin,
  checkPhone,
  checkEmail,
  checkAvailability
};