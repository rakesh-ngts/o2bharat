const interestService = require('../services/interestService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * Send interest to a profile
 * @route POST /api/interests/send
 * @access Private
 */
const sendInterest = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const { receiverId, message } = req.body;

    const interest = await interestService.sendInterest(senderId, receiverId, message);

    res.status(201).json(
      new ApiResponse(201, interest, 'Interest sent successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Accept interest
 * @route POST /api/interests/:interestId/accept
 * @access Private
 */
const acceptInterest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interestId = req.params.interestId;

    const interest = await interestService.acceptInterest(interestId, userId);

    res.status(200).json(
      new ApiResponse(200, interest, 'Interest accepted successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reject interest
 * @route POST /api/interests/:interestId/reject
 * @access Private
 */
const rejectInterest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interestId = req.params.interestId;
    const { reason } = req.body;

    const interest = await interestService.rejectInterest(interestId, userId, reason);

    res.status(200).json(
      new ApiResponse(200, interest, 'Interest rejected.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel sent interest
 * @route DELETE /api/interests/:interestId/cancel
 * @access Private
 */
const cancelInterest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interestId = req.params.interestId;

    const result = await interestService.cancelInterest(interestId, userId);

    res.status(200).json(
      new ApiResponse(200, result, 'Interest cancelled successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get received interests
 * @route GET /api/interests/received
 * @access Private
 */
const getReceivedInterests = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, page, limit } = req.query;

    const result = await interestService.getReceivedInterests(userId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.status(200).json(
      new ApiResponse(200, result, 'Received interests fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get sent interests
 * @route GET /api/interests/sent
 * @access Private
 */
const getSentInterests = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, page, limit } = req.query;

    const result = await interestService.getSentInterests(userId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.status(200).json(
      new ApiResponse(200, result, 'Sent interests fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get interest statistics
 * @route GET /api/interests/stats
 * @access Private
 */
const getInterestStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const stats = await interestService.getInterestStats(userId);

    res.status(200).json(
      new ApiResponse(200, stats, 'Interest statistics fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get mutual interests
 * @route GET /api/interests/mutual
 * @access Private
 */
const getMutualInterests = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const interests = await interestService.getMutualInterests(userId);

    res.status(200).json(
      new ApiResponse(200, interests, 'Mutual interests fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk send interests
 * @route POST /api/interests/bulk-send
 * @access Private
 */
const bulkSendInterests = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const { receiverIds, message } = req.body;

    if (!receiverIds || !Array.isArray(receiverIds) || receiverIds.length === 0) {
      throw new ApiError(400, 'receiverIds must be a non-empty array.');
    }

    const result = await interestService.bulkSendInterests(senderId, receiverIds, message);

    res.status(200).json(
      new ApiResponse(200, result, 'Bulk interest operation completed.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Shortlist profile
 * @route POST /api/interests/shortlist/:profileId
 * @access Private
 */
const shortlistProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profileId = req.params.profileId;

    const result = await interestService.shortlistProfile(userId, profileId);

    res.status(200).json(
      new ApiResponse(200, result, result.message)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get shortlisted profiles
 * @route GET /api/interests/shortlisted
 * @access Private
 */
const getShortlistedProfiles = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page, limit } = req.query;

    const profiles = await interestService.getShortlistedProfiles(
      userId,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );

    res.status(200).json(
      new ApiResponse(200, profiles, 'Shortlisted profiles fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
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