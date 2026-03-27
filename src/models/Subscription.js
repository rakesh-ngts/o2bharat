const mongoose = require('mongoose');
const { SUBSCRIPTION_PLANS, PAYMENT_STATUS } = require('../utils/constants');

/**
 * Subscription Schema - User subscription plans
 */
const subscriptionSchema = new mongoose.Schema(
  {
    // User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Plan details
    plan: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PLANS),
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    
    // Duration
    duration: {
      type: Number, // in days
      required: true,
    },
    
    // Pricing
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    discount: {
      type: Number,
      default: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    
    // Validity
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    
    // Status
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    
    // Payment
    paymentId: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    transactionId: {
      type: String,
      default: null,
    },
    
    // Features
    features: {
      profileViews: {
        type: Number,
        default: -1, // -1 means unlimited
      },
      interestsPerDay: {
        type: Number,
        default: -1,
      },
      chatAccess: {
        type: Boolean,
        default: false,
      },
      viewContactDetails: {
        type: Boolean,
        default: false,
      },
      priorityListing: {
        type: Boolean,
        default: false,
      },
      profileHighlight: {
        type: Boolean,
        default: false,
      },
    },
    
    // Usage tracking
    usage: {
      profilesViewed: {
        type: Number,
        default: 0,
      },
      interestsSent: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

// Virtual for checking if active
subscriptionSchema.virtual('isActive').get(function () {
  return this.status === 'active' && this.endDate > new Date();
});

// Static method to get active subscription
subscriptionSchema.statics.getActiveSubscription = function (userId) {
  return this.findOne({
    user: userId,
    status: 'active',
    endDate: { $gt: new Date() },
  });
};

// Plan details
subscriptionSchema.statics.PLANS = {
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

module.exports = mongoose.model('Subscription', subscriptionSchema);