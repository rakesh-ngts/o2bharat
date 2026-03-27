const Profile = require('../models/Profile');
const Match = require('../models/Match');
const Interest = require('../models/Interest');
const ApiError = require('../utils/ApiError');
const { calculateAge, calculateMatchScore } = require('../utils/helpers');

/**
 * Get match suggestions for a user
 */
const getMatchSuggestions = async (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  // Get user's profile
  const userProfile = await Profile.findOne({ user: userId }).populate('user', 'gender');

  if (!userProfile) {
    throw new ApiError(404, 'Please complete your profile first.');
  }

  // Get user's preferences
  const preferences = userProfile.preferences || {};

  // Build match query
  const matchQuery = buildMatchQuery(userProfile, preferences);

  // Get already matched/interested profile IDs
  const existingInteractions = await getExistingInteractions(userId);

  // Exclude already interacted profiles
  matchQuery.user = { $nin: [...existingInteractions, userId] };

  // Find matching profiles
  const matches = await Profile.find(matchQuery)
    .sort({ lastActive: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name isVerified');

  // Calculate match scores
  const matchesWithScores = matches.map(match => {
    const score = calculateMatchScore(userProfile, match);
    return {
      profile: match,
      matchScore: score,
      matchReasons: getMatchReasons(userProfile, match)
    };
  });

  // Sort by match score
  matchesWithScores.sort((a, b) => b.matchScore - a.matchScore);

  // Save match suggestions to database
  await saveMatchSuggestions(userId, matchesWithScores);

  return matchesWithScores;
};

/**
 * Build query for finding matches
 */
const buildMatchQuery = (userProfile, preferences) => {
  const query = {
    isActive: true,
    'verification.isProfileComplete': true
  };

  // Gender preference (opposite gender by default)
  const userGender = userProfile.user.gender;
  if (userGender === 'male') {
    query['basicInfo.gender'] = 'female';
  } else if (userGender === 'female') {
    query['basicInfo.gender'] = 'male';
  }

  // Age range preference
  if (preferences.preferredAgeMin || preferences.preferredAgeMax) {
    const now = new Date();
    query['basicInfo.dateOfBirth'] = {};
    
    if (preferences.preferredAgeMax) {
      const minDate = new Date(now.setFullYear(now.getFullYear() - preferences.preferredAgeMax));
      query['basicInfo.dateOfBirth'].$gte = minDate;
    }
    
    if (preferences.preferredAgeMin) {
      const maxDate = new Date(now.setFullYear(now.getFullYear() - preferences.preferredAgeMin));
      query['basicInfo.dateOfBirth'].$lte = maxDate;
    }
  }

  // Height preference
  if (preferences.preferredHeightMin || preferences.preferredHeightMax) {
    query['physicalDetails.height'] = {};
    if (preferences.preferredHeightMin) {
      query['physicalDetails.height'].$gte = preferences.preferredHeightMin;
    }
    if (preferences.preferredHeightMax) {
      query['physicalDetails.height'].$lte = preferences.preferredHeightMax;
    }
  }

  // Marital status preference
  if (preferences.preferredMaritalStatus && preferences.preferredMaritalStatus.length > 0) {
    query['astroDetails.maritalStatus'] = { $in: preferences.preferredMaritalStatus };
  }

  // Religion preference
  if (preferences.preferredReligion) {
    query['basicInfo.religion'] = preferences.preferredReligion;
  }

  // Caste preference
  if (preferences.preferredCaste) {
    query['basicInfo.caste'] = { $regex: preferences.preferredCaste, $options: 'i' };
  }

  // Education preference
  if (preferences.preferredEducation && preferences.preferredEducation.length > 0) {
    query['education.highestQualification'] = { $in: preferences.preferredEducation };
  }

  // Location preference
  if (preferences.preferredLocation) {
    query['address.state'] = { $regex: preferences.preferredLocation, $options: 'i' };
  }

  // Manglik preference
  if (preferences.preferredManglik) {
    if (preferences.preferredManglik === 'no') {
      query['astroDetails.manglik'] = { $in: ['no', 'anshik'] };
    } else if (preferences.preferredManglik === 'yes') {
      query['astroDetails.manglik'] = 'yes';
    }
  }

  return query;
};

/**
 * Get existing interactions (matches, interests sent/received)
 */
const getExistingInteractions = async (userId) => {
  // Get sent interests
  const sentInterests = await Interest.find({ sender: userId }).select('receiver');
  
  // Get received interests
  const receivedInterests = await Interest.find({ receiver: userId }).select('sender');
  
  // Get existing matches
  const matches = await Match.find({
    $or: [{ user1: userId }, { user2: userId }]
  });

  const interactedUserIds = new Set();
  
  sentInterests.forEach(i => interactedUserIds.add(i.receiver.toString()));
  receivedInterests.forEach(i => interactedUserIds.add(i.sender.toString()));
  matches.forEach(m => {
    interactedUserIds.add(m.user1.toString());
    interactedUserIds.add(m.user2.toString());
  });

  return Array.from(interactedUserIds);
};

/**
 * Get match reasons for display
 */
const getMatchReasons = (userProfile, matchProfile) => {
  const reasons = [];

  // Check age compatibility
  const userAge = calculateAge(userProfile.basicInfo?.dateOfBirth);
  const matchAge = calculateAge(matchProfile.basicInfo?.dateOfBirth);
  const ageDiff = Math.abs(userAge - matchAge);
  
  if (ageDiff <= 3) {
    reasons.push('Age compatible');
  }

  // Check height compatibility
  const userHeight = userProfile.physicalDetails?.height;
  const matchHeight = matchProfile.physicalDetails?.height;
  if (userHeight && matchHeight) {
    reasons.push('Height preference matched');
  }

  // Check education
  const userEducation = userProfile.preferences?.preferredEducation || [];
  const matchEducation = matchProfile.education?.highestQualification;
  if (matchEducation && userEducation.includes(matchEducation)) {
    reasons.push('Education preference matched');
  }

  // Check location
  const userLocation = userProfile.preferences?.preferredLocation;
  const matchLocation = matchProfile.address?.state;
  if (userLocation && matchLocation && matchLocation.toLowerCase().includes(userLocation.toLowerCase())) {
    reasons.push('Location preference matched');
  }

  // Check religion/caste
  if (userProfile.basicInfo?.religion === matchProfile.basicInfo?.religion) {
    reasons.push('Same religion');
  }

  // Check manglik
  const userManglik = userProfile.astroDetails?.manglik;
  const matchManglik = matchProfile.astroDetails?.manglik;
  if (userManglik === matchManglik || matchManglik === 'no') {
    reasons.push('Manglik compatible');
  }

  return reasons.length > 0 ? reasons : ['Profile matches your preferences'];
};

/**
 * Save match suggestions to database
 */
const saveMatchSuggestions = async (userId, matches) => {
  // Clear old suggestions
  await Match.deleteMany({ 
    user1: userId, 
    status: 'suggested',
    createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  // Save new suggestions
  const matchDocs = matches.slice(0, 50).map(match => ({
    user1: userId,
    user2: match.profile.user._id,
    matchScore: match.matchScore,
    matchReasons: match.matchReasons,
    status: 'suggested'
  }));

  if (matchDocs.length > 0) {
    await Match.insertMany(matchDocs, { ordered: false });
  }
};

/**
 * Get daily matches
 */
const getDailyMatches = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let matches = await Match.find({
    user1: userId,
    status: 'suggested',
    createdAt: { $gte: today }
  })
  .sort({ matchScore: -1 })
  .limit(10)
  .populate({
    path: 'user2',
    select: 'basicInfo photos education career',
    populate: { path: 'user', select: 'name isVerified' }
  });

  // If no matches for today, generate new ones
  if (matches.length === 0) {
    const newMatches = await getMatchSuggestions(userId, { limit: 10 });
    matches = newMatches.map(m => ({
      user2: m.profile,
      matchScore: m.matchScore,
      matchReasons: m.matchReasons
    }));
  }

  return matches;
};

/**
 * Get mutual matches
 */
const getMutualMatches = async (userId) => {
  // Find accepted interests from both sides
  const sentAndAccepted = await Interest.find({
    sender: userId,
    status: 'accepted'
  }).select('receiver');

  const receivedAndAccepted = await Interest.find({
    receiver: userId,
    status: 'accepted'
  }).select('sender');

  // Find mutual matches
  const mutualMatchIds = new Set();
  sentAndAccepted.forEach(i => {
    const receivedFromSame = receivedAndAccepted.find(r => r.sender.toString() === i.receiver.toString());
    if (receivedFromSame) {
      mutualMatchIds.add(i.receiver.toString());
    }
  });

  if (mutualMatchIds.size === 0) {
    return [];
  }

  // Get profiles of mutual matches
  const profiles = await Profile.find({
    user: { $in: Array.from(mutualMatchIds) }
  }).populate('user', 'name isVerified');

  return profiles;
};

/**
 * Get nearby profiles
 */
const getNearbyProfiles = async (userId, radius = 100) => {
  const userProfile = await Profile.findOne({ user: userId });

  if (!userProfile || !userProfile.address?.coordinates) {
    throw new ApiError(400, 'Location not set in profile.');
  }

  const nearbyProfiles = await Profile.find({
    user: { $ne: userId },
    isActive: true,
    'address.coordinates': {
      $near: {
        $geometry: userProfile.address.coordinates,
        $maxDistance: radius * 1000 // Convert km to meters
      }
    }
  }).limit(20).populate('user', 'name isVerified');

  return nearbyProfiles;
};

/**
 * Get recently viewed profiles
 */
const getRecentlyViewed = async (userId) => {
  const ProfileView = require('../models/ProfileView');
  
  const recentViews = await ProfileView.find({ viewer: userId })
    .sort({ viewedAt: -1 })
    .limit(20)
    .populate({
      path: 'profile',
      populate: { path: 'user', select: 'name isVerified' }
    });

  return recentViews.map(v => v.profile);
};

/**
 * Get profile visitors
 */
const getProfileVisitors = async (userId) => {
  const ProfileView = require('../models/ProfileView');
  
  const user = await Profile.findOne({ user: userId });

  if (!user) {
    throw new ApiError(404, 'Profile not found.');
  }

  const visitors = await ProfileView.find({ profile: user._id })
    .sort({ viewedAt: -1 })
    .limit(50)
    .populate({
      path: 'viewer',
      populate: { path: 'user', select: 'name isVerified' }
    });

  return visitors;
};

module.exports = {
  getMatchSuggestions,
  getDailyMatches,
  getMutualMatches,
  getNearbyProfiles,
  getRecentlyViewed,
  getProfileVisitors
};