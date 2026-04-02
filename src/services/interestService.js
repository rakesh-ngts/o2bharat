const mongoose = require('mongoose');
const Interest = require('../models/Interest');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

const getDailyInterestLimit = (plan) => {
  const limits = { free: 5, basic: 15, premium: -1, vip: -1 };
  return limits[plan?.toLowerCase()] ?? limits.free;
};


const PUBLIC_PROFILE_FIELDS = 'profileId photos basicInfo education career address.current.city address.current.state';

// ─────────────────────────────────────────────────────────────────────────────
// sendInterest
// BUG FIX: Interest schema requires senderProfile + receiverProfile (ObjectId).
// Earlier code only passed sender/receiver (User refs) → Mongoose validation error.
// ─────────────────────────────────────────────────────────────────────────────
const sendInterest = async (senderId, receiverId, message = '') => {
  // 1. Load both profiles in parallel
  const [senderProfile, receiverProfile] = await Promise.all([
    Profile.findOne({ user: senderId }),
    Profile.findOne({ user: receiverId, isProfileVisible: true }),
  ]);

  if (!senderProfile) {
    throw new ApiError(400, 'Please complete your profile before sending interests.');
  }
  if (!receiverProfile) {
    throw new ApiError(404, 'Profile not found or not visible.');
  }
  if (senderId.toString() === receiverId.toString()) {
    throw new ApiError(400, 'You cannot send interest to yourself.');
  }

  // 2. Duplicate check
  const existing = await Interest.findOne({ sender: senderId, receiver: receiverId });
  if (existing) {
    throw new ApiError(400, 'You have already sent an interest to this profile.');
  }

  // 3. Daily limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sentToday  = await Interest.countDocuments({ sender: senderId, createdAt: { $gte: todayStart } });
  const dailyLimit = getDailyInterestLimit(senderProfile.subscription?.plan);

  if (dailyLimit !== -1 && sentToday >= dailyLimit) {
    throw new ApiError(403, `Daily limit of ${dailyLimit} interests reached. Please upgrade your plan.`);
  }

  // 4. Create interest — pass BOTH senderProfile & receiverProfile
  const interest = await Interest.create({
    sender:          senderId,
    senderProfile:   senderProfile._id,   // ← BUG FIX
    receiver:        receiverId,
    receiverProfile: receiverProfile._id, // ← BUG FIX
    message,
    status: 'pending',
  });

  // 5. Update stats
  await Promise.all([
    Profile.findByIdAndUpdate(senderProfile._id,   { $inc: { 'stats.interestsSent':     1 } }),
    Profile.findByIdAndUpdate(receiverProfile._id, { $inc: { 'stats.interestsReceived': 1 } }),
  ]);

  // 6. Notify receiver
  await Notification.create({
    user:    receiverId,
    type:    'interest_received',
    title:   'New Interest Received',
    message: `${senderProfile.basicInfo?.name || 'Someone'} sent you an interest.`,
    data:    { interestId: interest._id, senderId, profileId: senderProfile._id },
  });

  return interest;
};

// ─────────────────────────────────────────────────────────────────────────────
// acceptInterest
// ─────────────────────────────────────────────────────────────────────────────
const acceptInterest = async (interestId, userId) => {
  const interest = await Interest.findById(interestId);
  if (!interest) throw new ApiError(404, 'Interest not found.');
  if (interest.receiver.toString() !== userId.toString()) throw new ApiError(403, 'Not authorized to accept this interest.');
  if (interest.status !== 'pending') throw new ApiError(400, `Interest is already ${interest.status}.`);

  interest.status      = 'accepted';
  interest.respondedAt = new Date();
  await interest.save();

  await Profile.findOneAndUpdate({ user: userId }, { $inc: { 'stats.interestsAccepted': 1 } });

  const receiverProfile = await Profile.findOne({ user: userId });
  await Notification.create({
    user:    interest.sender,
    type:    'interest_accepted',
    title:   'Interest Accepted!',
    message: `${receiverProfile?.basicInfo?.name || 'Someone'} accepted your interest.`,
    data:    { interestId: interest._id, receiverId: userId, profileId: receiverProfile?._id },
  });

  return interest;
};

// ─────────────────────────────────────────────────────────────────────────────
// rejectInterest
// ─────────────────────────────────────────────────────────────────────────────
const rejectInterest = async (interestId, userId, reason = '') => {
  const interest = await Interest.findById(interestId);
  if (!interest) throw new ApiError(404, 'Interest not found.');
  if (interest.receiver.toString() !== userId.toString()) throw new ApiError(403, 'Not authorized to reject this interest.');
  if (interest.status !== 'pending') throw new ApiError(400, `Interest is already ${interest.status}.`);

  interest.status          = 'rejected';
  interest.respondedAt     = new Date();
  interest.responseMessage = reason;
  await interest.save();

  return interest;
};

// ─────────────────────────────────────────────────────────────────────────────
// cancelInterest
// ─────────────────────────────────────────────────────────────────────────────
const cancelInterest = async (interestId, userId) => {
  const interest = await Interest.findById(interestId);
  if (!interest) throw new ApiError(404, 'Interest not found.');
  if (interest.sender.toString() !== userId.toString()) throw new ApiError(403, 'Not authorized to cancel this interest.');
  if (interest.status !== 'pending') throw new ApiError(400, `Cannot cancel an interest that is already ${interest.status}.`);

  await Profile.findOneAndUpdate({ user: userId }, { $inc: { 'stats.interestsSent': -1 } });
  await interest.deleteOne();

  return { cancelled: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// getReceivedInterests
// BUG FIX: populate senderProfile (Profile ref), not sender (User ref).
// ─────────────────────────────────────────────────────────────────────────────
const getReceivedInterests = async (userId, options = {}) => {
  const { status, page = 1, limit = 20 } = options;
  const skip  = (page - 1) * limit;
  const query = { receiver: userId };
  if (status) query.status = status;

  const [interests, total] = await Promise.all([
    Interest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderProfile', PUBLIC_PROFILE_FIELDS), // ← BUG FIX
    Interest.countDocuments(query),
  ]);

  return { interests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

// ─────────────────────────────────────────────────────────────────────────────
// getSentInterests
// BUG FIX: populate receiverProfile (Profile ref), not receiver (User ref).
// ─────────────────────────────────────────────────────────────────────────────
const getSentInterests = async (userId, options = {}) => {
  const { status, page = 1, limit = 20 } = options;
  const skip  = (page - 1) * limit;
  const query = { sender: userId };
  if (status) query.status = status;

  const [interests, total] = await Promise.all([
    Interest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('receiverProfile', PUBLIC_PROFILE_FIELDS), // ← BUG FIX
    Interest.countDocuments(query),
  ]);

  return { interests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

// ─────────────────────────────────────────────────────────────────────────────
// getInterestStats
// BUG FIX: Cast userId to ObjectId for aggregation pipeline.
// ─────────────────────────────────────────────────────────────────────────────
const getInterestStats = async (userId) => {
  const oid = new mongoose.Types.ObjectId(userId); // ← BUG FIX

  const [result] = await Interest.aggregate([
    {
      $facet: {
        sent: [
          { $match: { sender: oid } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        received: [
          { $match: { receiver: oid } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const tally = (arr) =>
    arr.reduce(
      (acc, { _id, count }) => { acc[_id] = count; acc.total += count; return acc; },
      { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 }
    );

  return { sent: tally(result.sent), received: tally(result.received) };
};

// ─────────────────────────────────────────────────────────────────────────────
// getMutualInterests
// BUG FIX: populate senderProfile, not sender.
// ─────────────────────────────────────────────────────────────────────────────
const getMutualInterests = async (userId) => {
  const sentInterests    = await Interest.find({ sender: userId, status: 'pending' }).select('receiver');
  const sentReceiverIds  = sentInterests.map((i) => i.receiver);

  const mutualInterests  = await Interest.find({
    sender:   { $in: sentReceiverIds },
    receiver: userId,
    status:   'pending',
  }).populate('senderProfile', PUBLIC_PROFILE_FIELDS); // ← BUG FIX

  return mutualInterests;
};

// ─────────────────────────────────────────────────────────────────────────────
// bulkSendInterests
// ─────────────────────────────────────────────────────────────────────────────
const bulkSendInterests = async (senderId, receiverIds, message = '') => {
  const results = { success: [], failed: [] };

  for (const receiverId of receiverIds) {
    try {
      const interest = await sendInterest(senderId, receiverId, message);
      results.success.push({ receiverId, interestId: interest._id });
    } catch (error) {
      results.failed.push({ receiverId, error: error.message });
    }
  }

  return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// shortlistProfile
// ─────────────────────────────────────────────────────────────────────────────
const shortlistProfile = async (userId, profileId) => {
  const [myProfile, targetProfile] = await Promise.all([
    Profile.findOne({ user: userId }),
    Profile.findById(profileId),
  ]);

  if (!myProfile)     throw new ApiError(404, 'Your profile not found.');
  if (!targetProfile) throw new ApiError(404, 'Target profile not found.');

  const isShortlisted = myProfile.shortlisted?.some((id) => id.toString() === profileId);

  if (isShortlisted) {
    await Profile.findByIdAndUpdate(myProfile._id, { $pull: { shortlisted: profileId } });
    return { shortlisted: false, message: 'Profile removed from shortlist.' };
  } else {
    await Profile.findByIdAndUpdate(myProfile._id, { $addToSet: { shortlisted: profileId } });
    return { shortlisted: true, message: 'Profile added to shortlist.' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getShortlistedProfiles
// ─────────────────────────────────────────────────────────────────────────────
const getShortlistedProfiles = async (userId, page = 1, limit = 20) => {
  const myProfile = await Profile.findOne({ user: userId }).select('shortlisted');
  if (!myProfile) throw new ApiError(404, 'Profile not found.');

  const total    = (myProfile.shortlisted || []).length;
  const skip     = (page - 1) * limit;

  const profile  = await Profile.findOne({ user: userId }).populate({
    path:    'shortlisted',
    select:  PUBLIC_PROFILE_FIELDS,
    options: { skip, limit },
  });

  return { profiles: profile?.shortlisted || [], total };
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
  getShortlistedProfiles,
};