const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_STATUS, GENDER, USER_ROLES } = require("../utils/constants");
const { boolean } = require("joi");

/**
 * User Schema - Basic authentication and account info
 */
const userSchema = new mongoose.Schema(
  {
    // Authentication
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // Basic Info
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    profilePhoto: {
      type: String, // store URL (Cloudinary / S3)
      default: null,
    },

    dob: {
      type: Date,
      required: [true, "Date of birth is required"],
    },

    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },

    community: {
      type: String,
      trim: true,
      required: [true, "Caste is required"],
    },
    caste: {
      type: String,
     trim: true,
      required: [true, "Caste is required"],
    },
 
    gender: {
        type: String,
        enum: Object.values(GENDER),
         lowercase: true,
        required: true,
      },

    // Profile Reference
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
    },

    

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpire: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },

    // Role & Status
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING,
    },

    // Verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // Device & Notification
    deviceToken: {
      type: String,
      default: null,
    },
    deviceType: {
      type: String,
      enum: ["android", "ios", "web"],
      default: "android",
    },

    // Last Activity
    lastLogin: {
      type: Date,
      default: null,
    },
    loginCount: {
      type: Number,
      default: 0,
    },

    // Account Lock
    lockedAt: {
      type: Date,
      default: null,
    },
    lockReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if active
userSchema.methods.isActive = function () {
  return this.status === USER_STATUS.ACTIVE;
};

// Method to update last login
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Transform output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model("User", userSchema);
