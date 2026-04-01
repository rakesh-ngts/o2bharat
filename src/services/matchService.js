const Profile = require('../models/Profile');
const Match = require('../models/Match');
const Interest = require('../models/Interest');
const ProfileView = require('../models/ProfileView');
const ApiError = require('../utils/ApiError');
const { PROFILE_STATUS, GENDER, INTEREST_STATUS } = require('../utils/constants');
const { calculateAge, calculateMatchScore } = require('../utils/helpers');

/**
 * Build a flexible query. 
 * Gender filter is applied after fetching (not in query).
 */
const buildMatchQuery = (userProfile) => {
  const query = {
    isProfileVisible: true,
    user: { $ne: userProfile.user._id } // Exclude self
  };

  // Don't filter by status to allow draft profiles to be matched
  // This makes the app more usable during testing/development
  // In production, you may want to enable this:
  // status: { $in: [PROFILE_STATUS.ACTIVE, PROFILE_STATUS.DRAFT] }

  return query;
};

/**
 * Filter profiles by opposite gender (applied after fetching)
 */
const filterByOppositeGender = (profiles, userGender) => {
  const targetGender = userGender === GENDER.MALE ? GENDER.FEMALE : GENDER.MALE;
  
  return profiles.filter(profile => {
    // Gender can be in user object (populated) or in basicInfo
    const profileGender = profile.user?.gender?.toLowerCase() || 
                          profile.basicInfo?.gender?.toLowerCase();
    return profileGender === targetGender;
  });
};

/**
 * Get match suggestions for a user
 */
const getMatchSuggestions = async (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  // 1. Get user's profile with user data (for gender)
  const userProfile = await Profile.findOne({ user: userId }).populate('user');

  if (!userProfile) {
    throw new ApiError(404, 'Please complete your profile first.');
  }

  // Get user's gender from User model
  const userGender = userProfile.user?.gender?.toLowerCase();
  
  if (!userGender) {
    throw new ApiError(400, 'Gender information is required for matching.');
  }

  // 2. Build Query (Flexible - no status filter, no gender filter in query)
  const matchQuery = buildMatchQuery(userProfile);

  // 3. Exclude already interacted users
  const existingInteractions = await getExistingInteractions(userId);
  if (existingInteractions.length > 0) {
    matchQuery.user = { ...matchQuery.user, $nin: existingInteractions };
  }

  // 4. Fetch Profiles with user data for gender
  const allMatches = await Profile.find(matchQuery)
    .limit(100)
    .populate('user', 'name isVerified gender');

  // 5. Filter by opposite gender (done in JS after fetching)
  const matches = filterByOppositeGender(allMatches, userGender);

  // 6. Calculate scores & Filter by Preferences in memory
  const matchesWithScores = matches.map(match => {
    const score = calculateMatchScore(userProfile, match);
    return {
      profile: match,
      matchScore: score,
      matchReasons: getMatchReasons(userProfile, match)
    };
  });

  // 7. Sort by highest score first
  matchesWithScores.sort((a, b) => b.matchScore - a.matchScore);

  // 8. Apply Pagination on the scored list
  const paginatedMatches = matchesWithScores.slice(skip, skip + limit);

  // 9. Save suggestions in background
  saveMatchSuggestions(userId, paginatedMatches).catch(e => console.error("Save Error:", e));

  return {
    matches: paginatedMatches,
    pagination: {
      currentPage: page,
      limit: limit,
      totalResults: matchesWithScores.length,
      hasNextPage: matchesWithScores.length > skip + limit
    }
  };
};

/**
 * Get daily matches for a user
 */
const getDailyMatches = async (userId) => {
  // Get user's profile
  const userProfile = await Profile.findOne({ user: userId }).populate('user');
  
  if (!userProfile) {
    throw new ApiError(404, 'Please complete your profile first.');
  }

  // Get today's date (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if we have today's matches cached
  const cachedMatches = await Match.find({
    user: userId,
    computedAt: { $gte: today },
    isIgnored: false
  })
    .populate({
      path: 'matchedProfile',
      populate: {
        path: 'user',
        select: 'name isVerified gender'
      }
    })
    .sort({ matchScore: -1 })
    .limit(10);

  // If we have cached matches, return them
  if (cachedMatches.length > 0) {
    const formattedMatches = cachedMatches.map(m => ({
      profile: m.matchedProfile,
      matchScore: m.matchScore,
      matchReasons: m.matchReasons,
      isViewed: m.isViewed,
      isShortlisted: m.isShortlisted
    }));

    return {
      matches: formattedMatches,
      total: formattedMatches.length,
      message: 'Daily matches refreshed'
    };
  }

  // Otherwise generate new daily matches
  const result = await getMatchSuggestions(userId, { page: 1, limit: 10 });
  
  return {
    matches: result.matches,
    total: result.matches.length,
    message: 'Daily matches refreshed'
  };
};

/**
 * Get mutual matches (both users liked each other)
 */
const getMutualMatches = async (userId) => {
  // Find accepted interests where user is sender
  const sentAndAccepted = await Interest.find({
    sender: userId,
    status: INTEREST_STATUS.ACCEPTED
  })
    .populate({
      path: 'receiverProfile',
      populate: {
        path: 'user',
        select: 'name isVerified gender'
      }
    })
    .populate('receiver', 'name isVerified gender');

  // Find accepted interests where user is receiver
  const receivedAndAccepted = await Interest.find({
    receiver: userId,
    status: INTEREST_STATUS.ACCEPTED
  })
    .populate({
      path: 'senderProfile',
      populate: {
        path: 'user',
        select: 'name isVerified gender'
      }
    })
    .populate('sender', 'name isVerified gender');

  // Format mutual matches
  const mutualMatches = [];

  sentAndAccepted.forEach(interest => {
    mutualMatches.push({
      profile: interest.receiverProfile,
      matchedAt: interest.respondedAt,
      matchId: interest._id,
      isMutual: true
    });
  });

  receivedAndAccepted.forEach(interest => {
    // Avoid duplicates
    const exists = mutualMatches.find(
      m => m.profile && m.profile.user && 
           m.profile.user._id.toString() === interest.sender._id.toString()
    );
    if (!exists) {
      mutualMatches.push({
        profile: interest.senderProfile,
        matchedAt: interest.respondedAt,
        matchId: interest._id,
        isMutual: true
      });
    }
  });

  return {
    matches: mutualMatches,
    total: mutualMatches.length,
    message: mutualMatches.length > 0 ? 'Mutual matches found' : 'No mutual matches yet'
  };
};

/**
 * Get nearby profiles
 */
const getNearbyProfiles = async (userId, radius = 100) => {
  // Get user's profile
  const userProfile = await Profile.findOne({ user: userId }).populate('user');
  
  if (!userProfile) {
    throw new ApiError(404, 'Please complete your profile first.');
  }

  const userGender = userProfile.user?.gender?.toLowerCase();
  const userState = userProfile.address?.current?.state;
  const userCity = userProfile.address?.current?.city;

  // Build query for nearby profiles (no status filter)
  const nearQuery = {
    isProfileVisible: true,
    user: { $ne: userId }
  };

  // First try same city
  if (userCity) {
    nearQuery['address.current.city'] = userCity;
  }

  let nearbyProfiles = await Profile.find(nearQuery)
    .populate('user', 'name isVerified gender')
    .limit(50);

  // If not enough, expand to same state
  if (nearbyProfiles.length < 10 && userState) {
    delete nearQuery['address.current.city'];
    nearQuery['address.current.state'] = userState;
    
    nearbyProfiles = await Profile.find(nearQuery)
      .populate('user', 'name isVerified gender')
      .limit(50);
  }

  // Filter by opposite gender
  if (userGender) {
    nearbyProfiles = filterByOppositeGender(nearbyProfiles, userGender);
  }

  // Calculate distance approximation and format response
  const formattedProfiles = nearbyProfiles.map(profile => {
    let distance = 'Unknown';
    let distanceValue = 999;

    if (profile.address?.current?.city === userCity) {
      distance = 'Same city';
      distanceValue = 5;
    } else if (profile.address?.current?.state === userState) {
      distance = 'Same state';
      distanceValue = 50;
    }

    return {
      profile,
      distance,
      distanceValue,
      matchScore: calculateMatchScore(userProfile, profile)
    };
  });

  // Sort by distance then by match score
  formattedProfiles.sort((a, b) => {
    if (a.distanceValue !== b.distanceValue) {
      return a.distanceValue - b.distanceValue;
    }
    return b.matchScore - a.matchScore;
  });

  return {
    profiles: formattedProfiles,
    total: formattedProfiles.length,
    radius,
    location: {
      city: userCity,
      state: userState
    }
  };
};

/**
 * Get recently viewed profiles
 */
const getRecentlyViewed = async (userId) => {
  // Get user's profile
  const userProfile = await Profile.findOne({ user: userId });
  
  if (!userProfile) {
    throw new ApiError(404, 'Please complete your profile first.');
  }

  // Get recent profile views by this user
  const recentViews = await ProfileView.find({ viewer: userId })
    .populate({
      path: 'profile',
      populate: {
        path: 'user',
        select: 'name isVerified gender'
      }
    })
    .sort({ viewedAt: -1 })
    .limit(50);

  // Format response
  const viewedProfiles = recentViews
    .filter(view => view.profile) // Ensure profile exists
    .map(view => ({
      profile: view.profile,
      viewedAt: view.viewedAt,
      deviceType: view.deviceType
    }));

  return {
    profiles: viewedProfiles,
    total: viewedProfiles.length,
    message: viewedProfiles.length > 0 ? 'Recently viewed profiles' : 'No recently viewed profiles'
  };
};

/**
 * Get profile visitors
 */
const getProfileVisitors = async (userId) => {
  // Get user's profile
  const userProfile = await Profile.findOne({ user: userId });
  
  if (!userProfile) {
    throw new ApiError(404, 'Please complete your profile first.');
  }

  // Get visitors who viewed this user's profile
  const visitorViews = await ProfileView.find({ profile: userProfile._id })
    .populate({
      path: 'viewer',
      select: 'name isVerified gender'
    })
    .sort({ viewedAt: -1 })
    .limit(50);

  // Get visitor profiles for more details
  const visitorIds = visitorViews.map(v => v.viewer?._id).filter(id => id);
  
  const visitorProfiles = await Profile.find({ 
    user: { $in: visitorIds },
    status: PROFILE_STATUS.ACTIVE,
    isProfileVisible: true
  }).populate('user', 'name isVerified gender');

  // Create a map for quick profile lookup
  const profileMap = new Map();
  visitorProfiles.forEach(p => {
    profileMap.set(p.user?._id?.toString(), p);
  });

  // Format response with visitor details
  const visitors = visitorViews
    .filter(view => view.viewer && profileMap.has(view.viewer._id.toString()))
    .map(view => {
      const profile = profileMap.get(view.viewer._id.toString());
      return {
        viewer: view.viewer,
        profile,
        viewedAt: view.viewedAt,
        deviceType: view.deviceType,
        isVerified: view.viewer?.isVerified || false
      };
    });

  return {
    visitors,
    total: visitors.length,
    totalViews: userProfile.stats?.profileViews || 0,
    message: visitors.length > 0 ? 'Profile visitors' : 'No profile visitors yet'
  };
};

/**
 * Helper to get IDs of people already liked/rejected/matched
 */
const getExistingInteractions = async (userId) => {
  const [interestsSent, interestsReceived, matches] = await Promise.all([
    Interest.find({ sender: userId }).select('receiver'),
    Interest.find({ receiver: userId }).select('sender'),
    Match.find({ user: userId }).select('matchedProfile')
  ]);

  const interactedIds = new Set();
  interestsSent.forEach(i => interactedIds.add(i.receiver.toString()));
  interestsReceived.forEach(i => interactedIds.add(i.sender.toString()));
  matches.forEach(m => {
    if (m.matchedProfile) {
      interactedIds.add(m.matchedProfile.toString());
    }
  });

  return Array.from(interactedIds);
};

/**
 * Logic to generate readable match reasons
 */
const getMatchReasons = (userProfile, matchProfile) => {
  const reasons = [];
  const prefs = userProfile.preferences || {};

  // Location Match
  if (matchProfile.address?.current?.state === userProfile.address?.current?.state) {
    reasons.push('From your state');
  }

  // Education Match
  if (prefs.partnerEducation?.includes(matchProfile.education?.highestQualification)) {
    reasons.push('Education matches your preference');
  }

  // Marital Status
  if (matchProfile.maritalStatus === userProfile.maritalStatus) {
    reasons.push('Same marital status');
  }

  // Age compatibility
  const userAge = calculateAge(userProfile.basicInfo?.dateOfBirth);
  const matchAge = calculateAge(matchProfile.basicInfo?.dateOfBirth);
  if (userAge && matchAge && Math.abs(userAge - matchAge) <= 5) {
    reasons.push('Age compatible');
  }

  // Height compatibility
  if (userProfile.physicalDetails?.height && matchProfile.physicalDetails?.height) {
    const heightDiff = Math.abs(userProfile.physicalDetails.height - matchProfile.physicalDetails.height);
    if (heightDiff <= 15) {
      reasons.push('Height compatible');
    }
  }

  return reasons.length > 0 ? reasons : ['Matches your basic criteria'];
};

/**
 * Save suggestions for the 'Daily Matches' feature
 */
const saveMatchSuggestions = async (userId, matches) => {
  // Only save if we have matches
  if (!matches || matches.length === 0) return;

  // Remove old suggestions
  await Match.deleteMany({ user: userId });

  const matchDocs = matches.slice(0, 20).map(m => ({
    user: userId,
    matchedProfile: m.profile.user?._id || m.profile.user,
    matchScore: m.matchScore,
    matchReasons: m.matchReasons,
    computedAt: new Date()
  }));

  if (matchDocs.length > 0) {
    await Match.insertMany(matchDocs, { ordered: false });
  }
};

module.exports = {
  getMatchSuggestions,
  getDailyMatches,
  getMutualMatches,
  getNearbyProfiles,
  getRecentlyViewed,
  getProfileVisitors,
  getExistingInteractions,
  getMatchReasons
};