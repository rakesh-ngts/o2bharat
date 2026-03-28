const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, adminProtect } = require('../middlewares/auth');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiter');
const { validate } = require('../middlewares/validator');
const { body } = require('express-validator');

// Validation rules

const registerValidation = [

  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit Indian phone number'),

  body('email')
    .isEmail()
    .withMessage('Please enter a valid email'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),

  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  // body('address')
  //   .notEmpty()
  //   .withMessage('Address is required'),

  body('dob')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Invalid date format (YYYY-MM-DD)')
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();

      if (dob >= today) {
        throw new Error('DOB must be in the past');
      }

      return true;
    }),

  // body('caste')
  //   .notEmpty()
  //   .withMessage('Caste is required'),

 

  // body('community')
  //   .notEmpty()
  //   .withMessage('Caste is required'),

  // body('profilePhoto')
  //   .optional()
  //   .isURL()
  //   .withMessage('Profile photo must be a valid URL'),

  validate
];



const loginValidation = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please enter a valid email'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  validate
];

const otpValidation = [
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit Indian phone number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
  validate
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
  validate
];

const resetPasswordValidation = [
  // body('token')
  //   .notEmpty()
  //   .withMessage('Token is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),

  validate
];

// Public routes
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/verify-otp', otpLimiter, otpValidation, authController.verifyOTP);
router.post('/resend-otp', otpLimiter, authController.resendOTP);
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password/:token', otpLimiter, resetPasswordValidation, authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/check-phone', authController.checkPhone);
router.post('/check-email', authController.checkEmail);
router.post('/check-availability', authController.checkAvailability);

// Admin public routes
router.post('/admin/login', authLimiter, authController.adminLogin);

// Protected routes
router.use(protect);
router.get('/me', authController.getCurrentUser);
router.put('/change-password', changePasswordValidation, authController.changePassword);
router.post('/logout', authController.logout);
router.delete('/delete-account', authController.deleteAccount);

module.exports = router;