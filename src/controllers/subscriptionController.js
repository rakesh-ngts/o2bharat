const subscriptionService = require('../services/subscriptionService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/subscription/plans
 * Publicly visible — no auth needed
 */
const getPlans = asyncHandler(async (req, res) => {
  const plans = subscriptionService.getPlans();
  res.status(200).json(new ApiResponse(200, plans, 'Subscription plans fetched successfully.'));
});

/**
 * GET /api/subscription/current
 * Get logged-in user's active subscription
 */
const getCurrentSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getActiveSubscription(req.user._id);

  if (!subscription) {
    return res
      .status(200)
      .json(new ApiResponse(200, { plan: 'free', isActive: false }, 'No active paid subscription. You are on the Free plan.'));
  }

  res.status(200).json(new ApiResponse(200, subscription, 'Active subscription fetched.'));
});

/**
 * GET /api/subscription/history
 * Get subscription history of logged-in user
 */
const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const history = await subscriptionService.getSubscriptionHistory(req.user._id);
  res.status(200).json(new ApiResponse(200, history, 'Subscription history fetched.'));
});

/**
 * POST /api/subscription/create-order
 * Step 1 of payment — create a Razorpay order
 * Body: { planId, couponCode? }
 */
const createOrder = asyncHandler(async (req, res) => {
  const { planId, couponCode } = req.body;

  if (!planId) {
    throw new ApiError(400, 'planId is required.');
  }

  const order = await subscriptionService.createOrder(req.user._id, planId, couponCode);
  res.status(200).json(new ApiResponse(200, order, 'Razorpay order created. Proceed to payment.'));
});

/**
 * POST /api/subscription/verify-payment
 * Step 2 of payment — verify Razorpay signature & activate subscription
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId }
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !planId) {
    throw new ApiError(400, 'razorpayOrderId, razorpayPaymentId, razorpaySignature, and planId are all required.');
  }

  const subscription = await subscriptionService.verifyAndActivate(req.user._id, {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    planId,
  });

  res.status(201).json(new ApiResponse(201, subscription, `🎉 ${subscription.planName} plan activated successfully!`));
});

/**
 * POST /api/subscription/webhook
 * Razorpay sends payment events here
 * No auth middleware — verify signature manually inside service
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    throw new ApiError(400, 'Missing Razorpay signature header.');
  }

  const result = await subscriptionService.handleWebhook(req.body, signature);
  res.status(200).json(result);
});

/**
 * DELETE /api/subscription/cancel
 * Cancel current active subscription
 */
const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.cancelSubscription(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, subscription, 'Subscription cancelled. You will retain access till the end date.'));
});

module.exports = {
  getPlans,
  getCurrentSubscription,
  getSubscriptionHistory,
  createOrder,
  verifyPayment,
  handleWebhook,
  cancelSubscription,
};