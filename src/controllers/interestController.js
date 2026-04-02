const interestService = require('../services/interestService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * BUG FIX: ApiResponse has only static methods.
 * WRONG: new ApiResponse(201, data, msg)  → returns empty {}
 * RIGHT: ApiResponse.success(res, data, msg, 201)
 */

const sendInterest = async (req, res, next) => {
  try {
    const interest = await interestService.sendInterest(req.user._id, req.body.receiverId, req.body.message);
    return ApiResponse.created(res, interest, 'Interest sent successfully.');
  } catch (error) { next(error); }
};

const acceptInterest = async (req, res, next) => {
  try {
    const interest = await interestService.acceptInterest(req.params.interestId, req.user._id);
    return ApiResponse.success(res, interest, 'Interest accepted successfully.');
  } catch (error) { next(error); }
};

const rejectInterest = async (req, res, next) => {
  try {
    const interest = await interestService.rejectInterest(req.params.interestId, req.user._id, req.body.reason);
    return ApiResponse.success(res, interest, 'Interest rejected.');
  } catch (error) { next(error); }
};

const cancelInterest = async (req, res, next) => {
  try {
    const result = await interestService.cancelInterest(req.params.interestId, req.user._id);
    return ApiResponse.success(res, result, 'Interest cancelled successfully.');
  } catch (error) { next(error); }
};

const getReceivedInterests = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const result = await interestService.getReceivedInterests(req.user._id, { status: req.query.status, page, limit });
    return ApiResponse.paginated(res, result.interests, result.pagination.page, result.pagination.limit, result.pagination.total, 'Received interests fetched successfully.');
  } catch (error) { next(error); }
};

const getSentInterests = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const result = await interestService.getSentInterests(req.user._id, { status: req.query.status, page, limit });
    return ApiResponse.paginated(res, result.interests, result.pagination.page, result.pagination.limit, result.pagination.total, 'Sent interests fetched successfully.');
  } catch (error) { next(error); }
};

const getInterestStats = async (req, res, next) => {
  try {
    const stats = await interestService.getInterestStats(req.user._id);
    return ApiResponse.success(res, stats, 'Interest statistics fetched successfully.');
  } catch (error) { next(error); }
};

const getMutualInterests = async (req, res, next) => {
  try {
    const interests = await interestService.getMutualInterests(req.user._id);
    return ApiResponse.success(res, interests, 'Mutual interests fetched successfully.');
  } catch (error) { next(error); }
};

const bulkSendInterests = async (req, res, next) => {
  try {
    const { receiverIds, message } = req.body;
    if (!Array.isArray(receiverIds) || receiverIds.length === 0) {
      throw new ApiError(400, 'receiverIds must be a non-empty array.');
    }
    const result = await interestService.bulkSendInterests(req.user._id, receiverIds, message);
    return ApiResponse.success(res, result, 'Bulk interest operation completed.');
  } catch (error) { next(error); }
};

const shortlistProfile = async (req, res, next) => {
  try {
    const result = await interestService.shortlistProfile(req.user._id, req.params.profileId);
    return ApiResponse.success(res, result, result.message);
  } catch (error) { next(error); }
};

const getShortlistedProfiles = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const result = await interestService.getShortlistedProfiles(req.user._id, page, limit);
    return ApiResponse.paginated(res, result.profiles, page, limit, result.total, 'Shortlisted profiles fetched successfully.');
  } catch (error) { next(error); }
};

module.exports = {
  sendInterest, acceptInterest, rejectInterest, cancelInterest,
  getReceivedInterests, getSentInterests, getInterestStats,
  getMutualInterests, bulkSendInterests, shortlistProfile, getShortlistedProfiles,
};