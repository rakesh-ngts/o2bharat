const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middlewares/auth');
const { validate, validateObjectId } = require('../middlewares/validator');
const { body, param } = require('express-validator');

// All profile routes require authentication
router.use(protect);

// Profile CRUD
router.post('/', profileController.createUpdateProfile);
router.get('/', profileController.getMyProfile);
router.get('/stats', profileController.getProfileStats);
router.get('/completion', profileController.getProfileCompletion);
router.patch('/privacy', profileController.updatePrivacySettings);
router.post('/deactivate', profileController.deactivateProfile);
router.post('/activate', profileController.activateProfile);

// Profile section update
router.patch(
  '/section/:section',
  [
    param('section').isIn([
      'basicInfo', 'astroDetails', 'physicalDetails', 'education',
      'career', 'familyDetails', 'address', 'lifestyle', 
      'preferences', 'aboutMe', 'contactInfo'
    ]).withMessage('Invalid section name'),
    validate
  ],
  profileController.updateProfileSection
);

// Photo management
router.post(
  '/photos',
  profileController.uploadMiddleware,
  profileController.uploadPhoto
);

router.post(
  '/photos/multiple',
  profileController.uploadMultipleMiddleware,
  profileController.uploadMultiplePhotos
);

router.delete(
  '/photos/:photoId',
  validateObjectId('photoId'),
  profileController.deletePhoto
);

router.patch(
  '/photos/:photoId/profile-picture',
  validateObjectId('photoId'),
  profileController.setProfilePicture
);

// Profile search
router.get('/search', profileController.searchProfiles);

// View other profile
router.get(
  '/:id',
  validateObjectId('id'),
  profileController.getProfileById
);

module.exports = router;