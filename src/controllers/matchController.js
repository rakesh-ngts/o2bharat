const matchService = require('../services/matchService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * Get match suggestions
 * @route GET /api/matches/suggestions
 * @access Private
 */
const getMatchSuggestions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page, limit } = req.query;

    const matches = await matchService.getMatchSuggestions(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.status(200).json(
      new ApiResponse(200, matches, 'Match suggestions fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily matches
 * @route GET /api/matches/daily
 * @access Private
 */
const getDailyMatches = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const matches = await matchService.getDailyMatches(userId);

    res.status(200).json(
      new ApiResponse(200, matches, 'Daily matches fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get mutual matches
 * @route GET /api/matches/mutual
 * @access Private
 */
const getMutualMatches = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const matches = await matchService.getMutualMatches(userId);

    res.status(200).json(
      new ApiResponse(200, matches, 'Mutual matches fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get nearby profiles
 * @route GET /api/matches/nearby
 * @access Private
 */
const getNearbyProfiles = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { radius } = req.query;

    const profiles = await matchService.getNearbyProfiles(
      userId,
      parseInt(radius) || 100
    );

    res.status(200).json(
      new ApiResponse(200, profiles, 'Nearby profiles fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get recently viewed profiles
 * @route GET /api/matches/recently-viewed
 * @access Private
 */
const getRecentlyViewed = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profiles = await matchService.getRecentlyViewed(userId);

    res.status(200).json(
      new ApiResponse(200, profiles, 'Recently viewed profiles fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile visitors
 * @route GET /api/matches/visitors
 * @access Private
 */
const getProfileVisitors = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const visitors = await matchService.getProfileVisitors(userId);

    res.status(200).json(
      new ApiResponse(200, visitors, 'Profile visitors fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMatchSuggestions,
  getDailyMatches,
  getMutualMatches,
  getNearbyProfiles,
  getRecentlyViewed,
  getProfileVisitors
};