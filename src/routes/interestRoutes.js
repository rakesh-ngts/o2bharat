const express = require('express');
const router = express.Router();
const interestController = require('../controllers/interestController');
const { protect } = require('../middlewares/auth');
const { validate, validateObjectId } = require('../middlewares/validator');
const { interestLimiter } = require('../middlewares/rateLimiter');
const { body, query } = require('express-validator');

// All interest routes require authentication
router.use(protect);

// ── Send Interest ─────────────────────────────────────────────────────────────
router.post(
  '/send',
  [
    interestLimiter,
    body('receiverId')
      .notEmpty().withMessage('Receiver ID is required')
      .isMongoId().withMessage('Invalid receiver ID format'),
    body('message')
      .optional()
      .isString().withMessage('Message must be a string')
      .trim()
      .isLength({ max: 500 }).withMessage('Message must be less than 500 characters'),
    validate,
  ],
  interestController.sendInterest
);

// ── Bulk Send ─────────────────────────────────────────────────────────────────
router.post(
  '/bulk-send',
  [
    interestLimiter,
    body('receiverIds')
      .isArray({ min: 1, max: 50 }).withMessage('receiverIds must be an array of 1-50 IDs'),
    // BUG FIX: validate each item in the array as a MongoId
    body('receiverIds.*')
      .isMongoId().withMessage('Each receiverId must be a valid MongoDB ID'),
    body('message')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 }).withMessage('Message must be less than 500 characters'),
    validate,
  ],
  interestController.bulkSendInterests
);

// ── Interest Actions ──────────────────────────────────────────────────────────
router.post('/:interestId/accept', validateObjectId('interestId'), interestController.acceptInterest);

router.post(
  '/:interestId/reject',
  [
    validateObjectId('interestId'),
    body('reason')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 200 }).withMessage('Reason must be less than 200 characters'),
    validate,
  ],
  interestController.rejectInterest
);

router.delete('/:interestId/cancel', validateObjectId('interestId'), interestController.cancelInterest);

// ── Get Interests ─────────────────────────────────────────────────────────────
router.get(
  '/received',
  [
    query('status')
      .optional()
      .isIn(['pending', 'accepted', 'rejected', 'cancelled', 'expired'])
      .withMessage('Invalid status filter'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    validate,
  ],
  interestController.getReceivedInterests
);

router.get(
  '/sent',
  [
    query('status')
      .optional()
      .isIn(['pending', 'accepted', 'rejected', 'cancelled', 'expired'])
      .withMessage('Invalid status filter'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    validate,
  ],
  interestController.getSentInterests
);

router.get('/stats',   interestController.getInterestStats);
router.get('/mutual',  interestController.getMutualInterests);

// ── Shortlist ─────────────────────────────────────────────────────────────────
router.post('/shortlist/:profileId', validateObjectId('profileId'), interestController.shortlistProfile);

router.get(
  '/shortlisted',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    validate,
  ],
  interestController.getShortlistedProfiles
);

module.exports = router;