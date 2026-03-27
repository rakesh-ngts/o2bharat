const express = require('express');
const router = express.Router();
const interestController = require('../controllers/interestController');
const { protect, checkSubscriptionLimit } = require('../middlewares/auth');
const { validate, validateObjectId } = require('../middlewares/validator');
const { interestLimiter } = require('../middlewares/rateLimiter');
const { body } = require('express-validator');

// All interest routes require authentication
router.use(protect);

// Send interest
router.post(
  '/send',
  [
    interestLimiter,
    body('receiverId')
      .notEmpty()
      .withMessage('Receiver ID is required')
      .isMongoId()
      .withMessage('Invalid receiver ID'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message must be less than 500 characters'),
    validate
  ],
  interestController.sendInterest
);

// Bulk send interests
router.post(
  '/bulk-send',
  [
    interestLimiter,
    body('receiverIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Receiver IDs must be an array of 1-50 IDs'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message must be less than 500 characters'),
    validate
  ],
  interestController.bulkSendInterests
);

// Interest actions
router.post(
  '/:interestId/accept',
  validateObjectId('interestId'),
  interestController.acceptInterest
);

router.post(
  '/:interestId/reject',
  [
    validateObjectId('interestId'),
    body('reason')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Reason must be less than 200 characters'),
    validate
  ],
  interestController.rejectInterest
);

router.delete(
  '/:interestId/cancel',
  validateObjectId('interestId'),
  interestController.cancelInterest
);

// Get interests
router.get('/received', interestController.getReceivedInterests);
router.get('/sent', interestController.getSentInterests);
router.get('/stats', interestController.getInterestStats);
router.get('/mutual', interestController.getMutualInterests);

// Shortlist
router.post(
  '/shortlist/:profileId',
  validateObjectId('profileId'),
  interestController.shortlistProfile
);

router.get('/shortlisted', interestController.getShortlistedProfiles);

module.exports = router;