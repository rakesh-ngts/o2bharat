const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validator');

// ── Public ───────────────────────────────────────────────────────────────────

// GET /api/subscription/plans
router.get('/plans', subscriptionController.getPlans);

// POST /api/subscription/webhook  (Razorpay calls this — no JWT auth)
// IMPORTANT: Use express.raw() for this route so signature verification works.
// Register it in app.js BEFORE express.json() or use raw body parser here.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // raw body for signature check
  subscriptionController.handleWebhook
);

// ── Protected (requires login) ───────────────────────────────────────────────
router.use(protect);

// GET /api/subscription/current
router.get('/current', subscriptionController.getCurrentSubscription);

// GET /api/subscription/history
router.get('/history', subscriptionController.getSubscriptionHistory);

// POST /api/subscription/create-order
router.post(
  '/create-order',
  [
    body('planId')
      .notEmpty().withMessage('planId is required')
      .isIn(['basic', 'premium', 'vip']).withMessage('planId must be basic, premium, or vip'),
    body('couponCode')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 20 }).withMessage('Coupon code too long'),
    validate,
  ],
  subscriptionController.createOrder
);

// POST /api/subscription/verify-payment
router.post(
  '/verify-payment',
  [
    body('razorpayOrderId').notEmpty().withMessage('razorpayOrderId is required'),
    body('razorpayPaymentId').notEmpty().withMessage('razorpayPaymentId is required'),
    body('razorpaySignature').notEmpty().withMessage('razorpaySignature is required'),
    body('planId')
      .notEmpty().withMessage('planId is required')
      .isIn(['basic', 'premium', 'vip']).withMessage('Invalid planId'),
    validate,
  ],
  subscriptionController.verifyPayment
);

// DELETE /api/subscription/cancel
router.delete('/cancel', subscriptionController.cancelSubscription);

module.exports = router;