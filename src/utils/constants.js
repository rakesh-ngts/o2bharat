/**
 * Application Constants for Matrimonial Website
 */

// User Roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

// User Status
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  BANNED: 'banned',
  LOCKED: 'locked', // User locked their account
};

// Profile Status
const PROFILE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  REJECTED: 'rejected',
  HIDDEN: 'hidden',
};

// Gender
const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
};

// Marital Status
const MARITAL_STATUS = {
  NEVER_MARRIED: 'never_married',
  DIVORCED: 'divorced',
  WIDOWED: 'widowed',
  AWAITING_DIVORCE: 'awaiting_divorce',
};

// Manglik Status
const MANGLIK_STATUS = {
  YES: 'yes',
  NO: 'no',
  ANSHIK: 'anshik', // Partial Manglik
};

// Nadi Types (Astrology)
const NADI_TYPES = {
  ADI: 'adi',
  MADHYA: 'madhya',
  ANT: 'ant',
  NONE: 'none',
};

// Zodiac Signs (Rashi)
const RASHI = {
  ARIES: 'aries',
  TAURUS: 'taurus',
  GEMINI: 'gemini',
  CANCER: 'cancer',
  LEO: 'leo',
  VIRGO: 'virgo',
  LIBRA: 'libra',
  SCORPIO: 'scorpio',
  SAGITTARIUS: 'sagittarius',
  CAPRICORN: 'capricorn',
  AQUARIUS: 'aquarius',
  PISCES: 'pisces',
};

// Education Levels
const EDUCATION_LEVELS = {
  HIGH_SCHOOL: 'high_school',
  INTERMEDIATE: 'intermediate',
  DIPLOMA: 'diploma',
  BACHELORS: 'bachelors',
  MASTERS: 'masters',
  DOCTORATE: 'doctorate',
  PROFESSIONAL: 'professional',
};

// Income Range (Annual in Lakhs)
const INCOME_RANGE = {
  BELOW_5: 'below_5',
  RANGE_5_10: '5_10',
  RANGE_10_20: '10_20',
  RANGE_20_30: '20_30',
  RANGE_30_50: '30_50',
  RANGE_50_100: '50_100',
  ABOVE_100: 'above_100',
};

// Diet Preferences
const DIET = {
  VEGETARIAN: 'vegetarian',
  NON_VEGETARIAN: 'non_vegetarian',
  EGGETARIAN: 'eggetarian',
  VEGAN: 'vegan',
};

// Smoking Habits
const SMOKING = {
  NO: 'no',
  OCCASIONALLY: 'occasionally',
  YES: 'yes',
};

// Drinking Habits
const DRINKING = {
  NO: 'no',
  OCCASIONALLY: 'occasionally',
  YES: 'yes',
};

// Interest Status
const INTEREST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// Subscription Plans
const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  VIP: 'vip',
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Report Reasons
const REPORT_REASONS = {
  FAKE_PROFILE: 'fake_profile',
  INAPPROPRIATE_PHOTOS: 'inappropriate_photos',
  SCAM: 'scam',
  HARASSMENT: 'harassment',
  OTHER: 'other',
};

// OTP Types
const OTP_TYPES = {
  REGISTER: 'register',
  LOGIN: 'login',
  FORGOT_PASSWORD: 'forgot_password',
  VERIFY_PHONE: 'verify_phone',
  VERIFY_EMAIL: 'verify_email',
};

// Notification Types
const NOTIFICATION_TYPES = {
  INTEREST_RECEIVED: 'interest_received',
  INTEREST_ACCEPTED: 'interest_accepted',
  INTEREST_REJECTED: 'interest_rejected',
  PROFILE_VIEW: 'profile_view',
  NEW_MATCH: 'new_match',
  SUBSCRIPTION: 'subscription',
  SYSTEM: 'system',
};

// Height Range (in cm)
const HEIGHT_RANGE = {
  MIN: 120,
  MAX: 250,
};

// Age Range
const AGE_RANGE = {
  MIN: 18,
  MAX: 70,
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  USER_ROLES,
  USER_STATUS,
  PROFILE_STATUS,
  GENDER,
  MARITAL_STATUS,
  MANGLIK_STATUS,
  NADI_TYPES,
  RASHI,
  EDUCATION_LEVELS,
  INCOME_RANGE,
  DIET,
  SMOKING,
  DRINKING,
  INTEREST_STATUS,
  SUBSCRIPTION_PLANS,
  PAYMENT_STATUS,
  REPORT_REASONS,
  OTP_TYPES,
  NOTIFICATION_TYPES,
  HEIGHT_RANGE,
  AGE_RANGE,
  PAGINATION,
};