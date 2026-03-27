const mongoose = require('mongoose');
const { INTEREST_STATUS } = require('../utils/constants');

/**
 * Interest Schema - When one user sends interest to another
 */
const interestSchema = new mongoose.Schema(
  {
    // Sender (who sent the interest)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    
    // Receiver (who received the interest)
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    
    // Message with the interest
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      default: '',
    },
    
    // Status
    status: {
      type: String,
      enum: Object.values(INTEREST_STATUS),
      default: INTEREST_STATUS.PENDING,
    },
    
    // Response
    responseMessage: {
      type: String,
      maxlength: [500, 'Response message cannot exceed 500 characters'],
      default: '',
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    
    // Expiry (if not responded within certain time)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    
    // Seen
    seenAt: {
      type: Date,
      default: null,
    },
    
    // Match Score (calculated at time of sending)
    matchScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
interestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
interestSchema.index({ receiver: 1, status: 1 });
interestSchema.index({ sender: 1, status: 1 });
interestSchema.index({ createdAt: -1 });

// Method to accept interest
interestSchema.methods.accept = function (message = '') {
  this.status = INTEREST_STATUS.ACCEPTED;
  this.responseMessage = message;
  this.respondedAt = new Date();
  return this.save();
};

// Method to reject interest
interestSchema.methods.reject = function (message = '') {
  this.status = INTEREST_STATUS.REJECTED;
  this.responseMessage = message;
  this.respondedAt = new Date();
  return this.save();
};

// Method to cancel interest
interestSchema.methods.cancel = function () {
  this.status = INTEREST_STATUS.CANCELLED;
  return this.save();
};

// Method to mark as seen
interestSchema.methods.markSeen = function () {
  this.seenAt = new Date();
  return this.save();
};

// Static method to get sent interests
interestSchema.statics.getSentInterests = function (userId, options = {}) {
  return this.find({ sender: userId })
    .populate('receiverProfile', 'basicInfo photos profileId')
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get received interests
interestSchema.statics.getReceivedInterests = function (userId, options = {}) {
  return this.find({ receiver: userId })
    .populate('senderProfile', 'basicInfo photos profileId')
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to check if interest exists
interestSchema.statics.checkInterest = async function (senderId, receiverId) {
  const sent = await this.findOne({ sender: senderId, receiver: receiverId });
  const received = await this.findOne({ sender: receiverId, receiver: senderId });
  
  return {
    hasSentInterest: !!sent,
    hasReceivedInterest: !!received,
    sentInterest: sent,
    receivedInterest: received,
  };
};

module.exports = mongoose.model('Interest', interestSchema);