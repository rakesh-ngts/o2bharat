const mongoose = require('mongoose');
const { OTP_TYPES } = require('../utils/constants');

/**
 * OTP Schema - One-time passwords for verification
 */
const otpSchema = new mongoose.Schema(
  {
    // Contact (email or phone)
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    
    // OTP Code
    otp: {
      type: String,
      required: true,
    },
    
    // OTP Type
    type: {
      type: String,
      enum: Object.values(OTP_TYPES),
      required: true,
    },
    
    // Verification Status
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    
    // Expiry
    expiresAt: {
      type: Date,
      required: true,
    },
    
    // Attempt Tracking
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
otpSchema.index({ email: 1, type: 1, isActive: 1 });
otpSchema.index({ phone: 1, type: 1, isActive: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// Virtual for checking expiry
otpSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiresAt;
});

// Method to verify OTP
otpSchema.methods.verify = function (inputOtp) {
  if (this.isVerified) return { success: false, message: 'OTP already used' };
  if (this.isExpired) return { success: false, message: 'OTP has expired' };
  if (!this.isActive) return { success: false, message: 'OTP is no longer valid' };
  if (this.attempts >= 5) return { success: false, message: 'Maximum attempts exceeded' };
  
  if (this.otp !== inputOtp) {
    this.attempts += 1;
    this.save();
    return { success: false, message: 'Invalid OTP', attemptsRemaining: 5 - this.attempts };
  }
  
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.isActive = false;
  this.save();
  
  return { success: true, message: 'OTP verified successfully' };
};

// Static method to create OTP
otpSchema.statics.createOTP = async function (data) {
  const { email, phone, type, otpLength = 6, expiryMinutes = 10 } = data;
  
  // Deactivate existing OTPs
  const query = { type, isActive: true };
  if (email) query.email = email;
  if (phone) query.phone = phone;
  
  await this.updateMany(query, { isActive: false });
  
  // Generate OTP
  const otp = generateNumericOTP(otpLength);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  return this.create({ email, phone, type, otp, expiresAt });
};

// Static method to find valid OTP
otpSchema.statics.findValidOTP = function (identifier, type) {
  const query = {
    type,
    isActive: true,
    isVerified: false,
    expiresAt: { $gt: new Date() },
  };
  
  if (identifier.includes('@')) {
    query.email = identifier.toLowerCase();
  } else {
    query.phone = identifier;
  }
  
  return this.findOne(query).sort({ createdAt: -1 });
};

// Helper function
function generateNumericOTP(length) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

module.exports = mongoose.model('OTP', otpSchema);