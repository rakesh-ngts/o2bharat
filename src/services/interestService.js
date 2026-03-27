const Interest = require('../models/Interest');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');

/**
 * Send interest to a profile
 */
const sendInterest = async (senderId, receiverId, message = '') => {
  // Check if sender profile is complete
  const senderProfile = await Profile.findOne({ user: senderId });
  
  if (!senderProfile || !senderProfile.verification?.isProfileComplete) {
    throw new ApiError(400, 'Please complete your profile before sending interests.');
  }

  // Check if receiver exists and profile is active
  const receiverProfile = await Profile.findOne({ user: receiverId, isActive: true });
  
  if (!receiverProfile) {
    throw new ApiError(404, 'Profile not found or inactive.');
  }

  // Check if interest already sent
  const existingInterest = await Interest.findOne({
    sender: senderId,
    receiver: receiverId
  });

  if (existingInterest) {
    throw new ApiError(400, 'Interest already sent to this profile.');
  }

  // Check daily limit based on subscription
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const sentToday = await Interest.countDocuments({
    sender: senderId,
    createdAt: { $gte: today }
  });

  // Subscription limit check (simplified - use config values)
  const dailyLimit = getDailyInterestLimit(senderProfile.subscription?.plan);
  
  if (sentToday >= dailyLimit && dailyLimit !== -1) {
    throw new ApiError(403, 'Daily interest limit reached. Please upgrade your plan.');
  }

  // Create interest
  const interest = await Interest.create({
    sender: senderId,
    receiver: receiverId,
    message,
    status: 'pending'
  });

  // Update stats
  await Profile.findByIdAndUpdate(senderProfile._id, {
    $inc: { 'stats.interestsSent': 1 }
  });
  
  await Profile.findByIdAndUpdate(receiverProfile._id, {
    $inc: { 'stats.interestsReceived': 1 }
  });

  // Create notification for receiver
  await Notification.create({
    user: receiverId,
    type: 'interest_received',
    title: 'New Interest Received',
    message: `${senderProfile.basicInfo?.name || 'Someone'} sent you an interest.`,
    data: {
      interestId: interest._id,
      senderId: senderId,
      profileId: senderProfile._id
    }
  });

  return interest;
};

/**
 * Get daily interest limit based on subscription plan
 */
const getDailyInterestLimit = (plan) => {
  const limits = {
    'free': 5,
    'basic': 15,
    'premium': -1, // Unlimited
    'vip': -1
  };
  return limits[plan?.toLowerCase()] || limits.free;
};

/**
 * Accept interest
 */
const acceptInterest = async (interestId, userId) => {
  const interest = await Interest.findById(interestId);

  if (!interest) {
    throw new ApiError(404, 'Interest not found.');
  }

  // Verify user is the receiver
  if (interest.receiver.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to accept this interest.');
  }

  // Check if already processed
  if (interest.status !== 'pending') {
    throw new ApiError(400, `Interest already ${interest.status}.`);
  }

  // Update interest status
  interest.status = 'accepted';
  interest.acceptedAt = new Date();
  await interest.save();

  // Update stats
  await Profile.findOneAndUpdate(
    { user: interest.receiver },
    { $inc: { 'stats.interestsAccepted': 1 } }
  );

  // Create notification for sender
  const receiverProfile = await Profile.findOne({ user: userId });
  await Notification.create({
    user: interest.sender,
    type: 'interest_accepted',
    title: 'Interest Accepted!',
    message: `${receiverProfile.basicInfo?.name || 'Someone'} accepted your interest.`,
    data: {
      interestId: interest._id,
      receiverId: userId,
      profileId: receiverProfile._id
    }
  });

  return interest;
};

/**
 * Reject interest
 */
const rejectInterest = async (interestId, userId, reason = '') => {
  const interest = await Interest.findById(interestId);

  if (!interest) {
    throw new ApiError(404, 'Interest not found.');
  }

  // Verify user is the receiver
  if (interest.receiver.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to reject this interest.');
  }

  // Check if already processed
  if (interest.status !== 'pending') {
    throw new ApiError(400, `Interest already ${interest.status}.`);
  }

  // Update interest status
  interest.status = 'rejected';
  interest.rejectedAt = new Date();
  interest.rejectionReason = reason;
  await interest.save();

  return interest;
};

/**
 * Cancel sent interest
 */
const cancelInterest = async (interestId, userId) => {
  const interest = await Interest.findById(interestId);

  if (!interest) {
    throw new ApiError(404, 'Interest not found.');
  }

  // Verify user is the sender
  if (interest.sender.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to cancel this interest.');
  }

  // Check if already processed
  if (interest.status !== 'pending') {
    throw new ApiError(400, `Cannot cancel interest that is already ${interest.status}.`);
  }

  // Update stats
  await Profile.findOneAndUpdate(
    { user: userId },
    { $inc: { 'stats.interestsSent': -1 } }
  );

  await interest.deleteOne();

  return { message: 'Interest cancelled successfully.' };
};

/**
 * Get received interests
 */
const getReceivedInterests = async (userId, options = {}) => {
  const { status, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const query = { receiver: userId };
  if (status) {
    query.status = status;
  }

  const interests = await Interest.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'sender',
      select: 'basicInfo photos education career',
      populate: { path: 'user', select: 'name isVerified' }
    });

  const total = await Interest.countDocuments(query);

  return {
    interests,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get sent interests
 */
const getSentInterests = async (userId, options = {}) => {
  const { status, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const query = { sender: userId };
  if (status) {
    query.status = status;
  }

  const interests = await Interest.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'receiver',
      select: 'basicInfo photos education career',
      populate: { path: 'user', select: 'name isVerified' }
    });

  const total = await Interest.countDocuments(query);

  return {
    interests,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get interest stats
 */
const getInterestStats = async (userId) => {
  const stats = await Interest.aggregate([
    {
      $facet: {
        sent: [
          { $match: { sender: userId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        received: [
          { $match: { receiver: userId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);

  const sentStats = {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  };

  const receivedStats = {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  };

  stats[0].sent.forEach(s => {
    sentStats[s._id] = s.count;
    sentStats.total += s.count;
  });

  stats[0].received.forEach(s => {
    receivedStats[s._id] = s.count;
    receivedStats.total += s.count;
  });

  return {
    sent: sentStats,
    received: receivedStats
  };
};

/**
 * Get mutual interests
 */
const getMutualInterests = async (userId) => {
  // Find users who sent interest to current user and current user sent interest to them
  const sentInterests = await Interest.find({
    sender: userId,
    status: 'pending'
  }).select('receiver');

  const sentReceiverIds = sentInterests.map(i => i.receiver);

  const mutualInterests = await Interest.find({
    sender: { $in: sentReceiverIds },
    receiver: userId,
    status: 'pending'
  }).populate({
    path: 'sender',
    select: 'basicInfo photos education career',
    populate: { path: 'user', select: 'name isVerified' }
  });

  return mutualInterests;
};

/**
 * Bulk send interests
 */
const bulkSendInterests = async (senderId, receiverIds, message = '') => {
  const results = {
    success: [],
    failed: []
  };

  for (const receiverId of receiverIds) {
    try {
      const interest = await sendInterest(senderId, receiverId, message);
      results.success.push({
        receiverId,
        interestId: interest._id
      });
    } catch (error) {
      results.failed.push({
        receiverId,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Shortlist profile
 */
const shortlistProfile = async (userId, profileId) => {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, 'Your profile not found.');
  }

  const targetProfile = await Profile.findById(profileId);

  if (!targetProfile) {
    throw new ApiError(404, 'Target profile not found.');
  }

  // Check if already shortlisted
  const isShortlisted = profile.shortlisted?.includes(profileId);

  if (isShortlisted) {
    // Remove from shortlist
    await Profile.findByIdAndUpdate(profile._id, {
      $pull: { shortlisted: profileId }
    });
    return { shortlisted: false, message: 'Profile removed from shortlist.' };
  } else {
    // Add to shortlist
    await Profile.findByIdAndUpdate(profile._id, {
      $addToSet: { shortlisted: profileId }
    });
    return { shortlisted: true, message: 'Profile added to shortlist.' };
  }
};

/**
 * Get shortlisted profiles
 */
const getShortlistedProfiles = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const profile = await Profile.findOne({ user: userId })
    .populate({
      path: 'shortlisted',
      options: { skip, limit, sort: { createdAt: -1 } },
      populate: { path: 'user', select: 'name isVerified' }
    });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  return profile.shortlisted || [];
};

module.exports = {
  sendInterest,
  acceptInterest,
  rejectInterest,
  cancelInterest,
  getReceivedInterests,
  getSentInterests,
  getInterestStats,
  getMutualInterests,
  bulkSendInterests,
  shortlistProfile,
  getShortlistedProfiles
};