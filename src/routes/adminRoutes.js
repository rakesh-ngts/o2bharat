const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminProtect, authorize } = require('../middlewares/auth');
const { adminLimiter } = require('../middlewares/rateLimiter');
const { validate, validateObjectId } = require('../middlewares/validator');
const { body, param } = require('express-validator');

// All admin routes require admin authentication
router.use(adminProtect);

// Dashboard
router.get('/stats', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// User management
router.get('/users', adminController.getAllUsers);
router.get(
  '/users/:userId',
  validateObjectId('userId'),
  adminController.getUserDetails
);
router.patch(
  '/users/:userId/status',
  [
    validateObjectId('userId'),
    body('isActive')
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters'),
    validate
  ],
  adminController.updateUserStatus
);
router.patch(
  '/users/:userId/verify',
  validateObjectId('userId'),
  adminController.verifyUser
);

// Super admin only - delete user
router.delete(
  '/users/:userId',
  [
    authorize('super_admin'),
    validateObjectId('userId')
  ],
  adminController.deleteUser
);

// Profile management
router.get('/profiles', adminController.getAllProfiles);
router.patch(
  '/profiles/:profileId/photos/:photoId',
  [
    validateObjectId('profileId'),
    validateObjectId('photoId'),
    body('isApproved')
      .isBoolean()
      .withMessage('isApproved must be a boolean'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters'),
    validate
  ],
  adminController.reviewProfilePhoto
);

// Report management
router.get('/reports', adminController.getAllReports);
router.patch(
  '/reports/:reportId/resolve',
  [
    validateObjectId('reportId'),
    body('action')
      .isIn(['dismissed', 'warning_sent', 'user_blocked', 'block_user', 'other'])
      .withMessage('Invalid action'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters'),
    validate
  ],
  adminController.resolveReport
);

// Admin management (Super Admin only)
router.post(
  '/create',
  [
    authorize('super_admin'),
    body('name')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'moderator', 'super_admin'])
      .withMessage('Invalid role'),
    validate
  ],
  adminController.createAdmin
);

router.get('/admins', authorize('super_admin'), adminController.getAllAdmins);

router.patch(
  '/admins/:adminId/status',
  [
    authorize('super_admin'),
    validateObjectId('adminId'),
    body('isActive')
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    validate
  ],
  adminController.updateAdminStatus
);

module.exports = router;