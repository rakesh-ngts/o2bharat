const Razorpay = require('razorpay');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Profile = require('../models/Profile');
const ApiError = require('../utils/ApiError');
const config = require('../config');

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Subscription plan config (single source of truth)
 */
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    duration: 365,
    features: {
      profileViews: 10,
      interestsPerDay: 5,
      chatAccess: false,
      viewContactDetails: false,
      priorityListing: false,
      profileHighlight: false,
    },
  },
  basic: {
    name: 'Basic',
    price: 1999,
    duration: 30,
    features: {
      profileViews: 50,
      interestsPerDay: 20,
      chatAccess: true,
      viewContactDetails: false,
      priorityListing: false,
      profileHighlight: false,
    },
  },
  premium: {
    name: 'Premium',
    price: 4999,
    duration: 90,
    features: {
      profileViews: -1,
      interestsPerDay: -1,
      chatAccess: true,
      viewContactDetails: true,
      priorityListing: true,
      profileHighlight: false,
    },
  },
  vip: {
    name: 'VIP',
    price: 9999,
    duration: 180,
    features: {
      profileViews: -1,
      interestsPerDay: -1,
      chatAccess: true,
      viewContactDetails: true,
      priorityListing: true,
      profileHighlight: true,
    },
  },
};

/**
 * Get all available plans
 */
const getPlans = () => {
  return Object.entries(PLANS).map(([key, plan]) => ({
    id: key,
    ...plan,
  }));
};

/**
 * Get user's active subscription
 */
const getActiveSubscription = async (userId) => {
  const subscription = await Subscription.getActiveSubscription(userId);
  return subscription;
};

/**
 * Get subscription history
 */
const getSubscriptionHistory = async (userId) => {
  const subscriptions = await Subscription.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10);
  return subscriptions;
};

/**
 * Create Razorpay order for subscription purchase
 */
const createOrder = async (userId, planId, couponCode = null) => {
  const plan = PLANS[planId];

  if (!plan) {
    throw new ApiError(400, `Invalid plan: "${planId}". Valid plans: ${Object.keys(PLANS).join(', ')}`);
  }

  if (plan.price === 0) {
    throw new ApiError(400, 'Free plan does not require payment.');
  }

  // Check if user already has an active paid subscription
  const existing = await Subscription.getActiveSubscription(userId);
  if (existing && existing.plan !== 'free') {
    throw new ApiError(
      400,
      `You already have an active ${existing.planName} plan valid till ${existing.endDate.toDateString()}. Cancel it first to buy a new plan.`
    );
  }

  // Calculate final price (apply discount/coupon if any)
  let finalPrice = plan.price;
  let discount = 0;

  if (couponCode) {
    const couponResult = applyCoupon(couponCode, plan.price);
    finalPrice = couponResult.finalPrice;
    discount = couponResult.discount;
  }

  // Create Razorpay order (amount in paise)
  const razorpayOrder = await razorpay.orders.create({
    amount: finalPrice * 100, // paise
    currency: 'INR',
    receipt: `sub_${userId}_${planId}_${Date.now()}`,
    notes: {
      userId: userId.toString(),
      planId,
      planName: plan.name,
    },
  });

  return {
    orderId: razorpayOrder.id,
    planId,
    planName: plan.name,
    duration: plan.duration,
    originalPrice: plan.price,
    discount,
    finalPrice,
    currency: 'INR',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  };
};

/**
 * Verify Razorpay payment & activate subscription
 */
const verifyAndActivate = async (userId, { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId }) => {
  // 1. Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new ApiError(400, 'Payment verification failed. Invalid signature.');
  }

  // 2. Fetch payment details from Razorpay
  const payment = await razorpay.payments.fetch(razorpayPaymentId);

  if (payment.status !== 'captured') {
    throw new ApiError(400, `Payment not captured. Status: ${payment.status}`);
  }

  const plan = PLANS[planId];
  if (!plan) {
    throw new ApiError(400, 'Invalid plan ID.');
  }

  const finalPrice = payment.amount / 100; // convert paise to rupees

  // 3. Expire any existing active subscription
  await Subscription.updateMany(
    { user: userId, status: 'active' },
    { status: 'cancelled' }
  );

  // 4. Create new subscription
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.duration);

  const subscription = await Subscription.create({
    user: userId,
    plan: planId,
    planName: plan.name,
    duration: plan.duration,
    price: plan.price,
    currency: 'INR',
    discount: plan.price - finalPrice,
    finalPrice,
    startDate,
    endDate,
    status: 'active',
    paymentId: razorpayPaymentId,
    paymentStatus: 'completed',
    transactionId: razorpayOrderId,
    features: plan.features,
  });

  // 5. Update Profile's subscription info
  await Profile.findOneAndUpdate(
    { user: userId },
    {
      'subscription.plan': planId,
      'subscription.startDate': startDate,
      'subscription.endDate': endDate,
      'subscription.isActive': true,
    }
  );

  return subscription;
};

/**
 * Handle Razorpay webhook events
 */
const handleWebhook = async (payload, signature) => {
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new ApiError(400, 'Invalid webhook signature.');
  }

  const event = payload.event;
  const paymentEntity = payload.payload?.payment?.entity;

  switch (event) {
    case 'payment.captured':
      // Payment successful — subscription is already activated via verifyAndActivate
      // This is a fallback/confirmation
      console.log('Webhook: payment.captured', paymentEntity?.id);
      break;

    case 'payment.failed':
      // Mark any pending subscriptions for this payment as failed
      if (paymentEntity?.order_id) {
        await Subscription.updateMany(
          { transactionId: paymentEntity.order_id, paymentStatus: 'pending' },
          { paymentStatus: 'failed', status: 'cancelled' }
        );
      }
      break;

    case 'refund.created':
      // Mark subscription as refunded
      if (paymentEntity?.payment_id) {
        await Subscription.findOneAndUpdate(
          { paymentId: paymentEntity.payment_id },
          { paymentStatus: 'refunded', status: 'cancelled' }
        );
      }
      break;

    default:
      console.log(`Unhandled webhook event: ${event}`);
  }

  return { received: true };
};

/**
 * Cancel active subscription
 */
const cancelSubscription = async (userId) => {
  const subscription = await Subscription.getActiveSubscription(userId);

  if (!subscription) {
    throw new ApiError(404, 'No active subscription found.');
  }

  subscription.status = 'cancelled';
  await subscription.save();

  // Revert profile to free plan
  await Profile.findOneAndUpdate(
    { user: userId },
    {
      'subscription.plan': 'free',
      'subscription.isActive': false,
    }
  );

  return subscription;
};

/**
 * Cron job helper - expire old subscriptions
 */
const expireOldSubscriptions = async () => {
  const result = await Subscription.updateMany(
    { status: 'active', endDate: { $lt: new Date() } },
    { status: 'expired' }
  );

  if (result.modifiedCount > 0) {
    // Revert profiles of expired subscriptions to free
    const expiredSubs = await Subscription.find({
      status: 'expired',
      endDate: { $lt: new Date() },
      updatedAt: { $gte: new Date(Date.now() - 60 * 1000) }, // last 1 min
    }).select('user');

    const userIds = expiredSubs.map((s) => s.user);

    await Profile.updateMany(
      { user: { $in: userIds } },
      {
        'subscription.plan': 'free',
        'subscription.isActive': false,
      }
    );
  }

  return result.modifiedCount;
};

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Apply coupon code discount
 * Extend this to hit a Coupon model in DB
 */
const applyCoupon = (couponCode, originalPrice) => {
  const COUPONS = {
    WELCOME20: { type: 'percent', value: 20 },
    FLAT500: { type: 'flat', value: 500 },
  };

  const coupon = COUPONS[couponCode?.toUpperCase()];
  if (!coupon) {
    throw new ApiError(400, 'Invalid or expired coupon code.');
  }

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.floor((originalPrice * coupon.value) / 100);
  } else {
    discount = Math.min(coupon.value, originalPrice);
  }

  return {
    discount,
    finalPrice: originalPrice - discount,
  };
};

module.exports = {
  PLANS,
  getPlans,
  getActiveSubscription,
  getSubscriptionHistory,
  createOrder,
  verifyAndActivate,
  handleWebhook,
  cancelSubscription,
  expireOldSubscriptions,
};