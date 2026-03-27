const Profile = require('../models/Profile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const config = require('../config');
const { calculateAge, calculateMatchScore } = require('../utils/helpers');


/**
 * Create or update user profile
 */
const createUpdateProfile = async (userId, profileData) => {
  let profile = await Profile.findOne({ user: userId });

  if (profile) {
    // Update existing profile
    Object.keys(profileData).forEach(key => {
      if (typeof profileData[key] === 'object' && !Array.isArray(profileData[key])) {
        profile[key] = { ...profile[key].toObject(), ...profileData[key] };
      } else {
        profile[key] = profileData[key];
      }
    });
    
    profile.profileCompletionPercentage = calculateProfileCompletion(profile);
    await profile.save();
  } else {
    // Create new profile
    profile = await Profile.create({
      user: userId,
      ...profileData,
      profileCompletionPercentage: 0
    });
    
    profile.profileCompletionPercentage = calculateProfileCompletion(profile);
    await profile.save();
  }

  return profile;
};

/**
 * Get user profile
 */
const getProfile = async (userId) => {
  const profile = await Profile.findOne({ user: userId })
    .populate('user', 'name phone email isVerified');

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  return profile;
};

/**
 * Get profile by ID (for viewing other profiles)
 */
const getProfileById = async (profileId, viewerId = null) => {
  const profile = await Profile.findById(profileId)
    .populate('user', 'name isVerified');

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  // Hide sensitive information based on privacy settings
  const profileObj = profile.toObject();
  
  // If not the owner, apply privacy filters
  if (viewerId && viewerId.toString() !== profile.user._id.toString()) {
    // Hide contact details if privacy setting is enabled
    if (profile.privacySettings?.hideContactDetails) {
      delete profileObj.contactInfo;
    }
    
    // Hide photos if privacy setting is enabled
    if (profile.privacySettings?.hidePhotos) {
      profileObj.photos = profileObj.photos?.filter(p => p.isProfilePicture) || [];
    }

    // Increment profile views
    incrementProfileViews(profileId);
  }

  return profileObj;
};

/**
 * Increment profile views
 */
const incrementProfileViews = async (profileId) => {
  await Profile.findByIdAndUpdate(profileId, {
    $inc: { 'stats.totalViews': 1 }
  });

  // Update daily views (would typically use Redis for this)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // In production, use Redis to track daily views
};

/**
 * Update profile section
 */
const updateProfileSection = async (userId, section, sectionData) => {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  // Validate section exists in schema
  const validSections = [
    'basicInfo', 'astroDetails', 'physicalDetails', 'education',
    'career', 'familyDetails', 'address', 'lifestyle', 'preferences',
    'aboutMe', 'contactInfo'
  ];

  if (!validSections.includes(section)) {
    throw new ApiError(400, `Invalid section: ${section}`);
  }

  // Update section
  profile[section] = { ...profile[section]?.toObject(), ...sectionData };
  profile.profileCompletionPercentage = calculateProfileCompletion(profile);
  
  await profile.save();

  return profile;
};

/**
 * Upload photo
 */
const uploadPhoto = async (userId, photoData) => {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  // Check photo limit
  if (profile.photos && profile.photos.length >= 10) {
    throw new ApiError(400, 'Maximum 10 photos allowed.');
  }

  const newPhoto = {
    url: photoData.url,
    publicId: photoData.publicId,
    isProfilePicture: photoData.isProfilePicture || false,
    isVerified: false
  };

  // If setting as profile picture, unset others
  if (newPhoto.isProfilePicture) {
    profile.photos.forEach(p => p.isProfilePicture = false);
  }

  profile.photos.push(newPhoto);
  await profile.save();

  return profile;
};

/**
 * Delete photo
 */
const deletePhoto = async (userId, photoId) => {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  const photoIndex = profile.photos.findIndex(p => p._id.toString() === photoId);

  if (photoIndex === -1) {
    throw new ApiError(404, 'Photo not found.');
  }

  profile.photos.splice(photoIndex, 1);
  await profile.save();

  return profile;
};

/**
 * Set profile picture
 */
const setProfilePicture = async (userId, photoId) => {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  const photo = profile.photos.find(p => p._id.toString() === photoId);

  if (!photo) {
    throw new ApiError(404, 'Photo not found.');
  }

  // Unset all profile pictures
  profile.photos.forEach(p => p.isProfilePicture = false);
  
  // Set the selected photo as profile picture
  photo.isProfilePicture = true;

  await profile.save();

  return profile;
};

/**
 * Search profiles
 */
const searchProfiles = async (userId, searchParams, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  
  // Build search query
  const query = buildSearchQuery(searchParams, userId);

  // Execute search
  const profiles = await Profile.find(query)
    .sort({ lastActive: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name isVerified');

  // Get total count for pagination
  const total = await Profile.countDocuments(query);

  return {
    profiles,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Build search query from parameters
 */
const buildSearchQuery = (params, excludeUserId) => {
  const query = {
    'verification.isProfileComplete': true,
    user: { $ne: excludeUserId }
  };

  // Gender filter
  if (params.gender) {
    query['basicInfo.gender'] = params.gender;
  }

  // Age range
  if (params.minAge || params.maxAge) {
    const now = new Date();
    query['basicInfo.dateOfBirth'] = {};
    
    if (params.maxAge) {
      const minDate = new Date(now.setFullYear(now.getFullYear() - params.maxAge));
      query['basicInfo.dateOfBirth'].$gte = minDate;
    }
    
    if (params.minAge) {
      const maxDate = new Date(now.setFullYear(now.getFullYear() - params.minAge));
      query['basicInfo.dateOfBirth'].$lte = maxDate;
    }
  }

  // Height range
  if (params.minHeight || params.maxHeight) {
    query['physicalDetails.height'] = {};
    if (params.minHeight) query['physicalDetails.height'].$gte = params.minHeight;
    if (params.maxHeight) query['physicalDetails.height'].$lte = params.maxHeight;
  }

  // Marital status
  if (params.maritalStatus && params.maritalStatus.length > 0) {
    query['astroDetails.maritalStatus'] = { $in: params.maritalStatus };
  }

  // Religion/Caste
  if (params.religion) {
    query['basicInfo.religion'] = params.religion;
  }
  if (params.caste) {
    query['basicInfo.caste'] = { $regex: params.caste, $options: 'i' };
  }

  // Mother tongue
  if (params.motherTongue) {
    query['basicInfo.motherTongue'] = params.motherTongue;
  }

  // Education
  if (params.education && params.education.length > 0) {
    query['education.highestQualification'] = { $in: params.education };
  }

  // Occupation
  if (params.occupation) {
    query['career.occupation'] = { $regex: params.occupation, $options: 'i' };
  }

  // Location
  if (params.state) {
    query['address.state'] = { $regex: params.state, $options: 'i' };
  }
  if (params.city) {
    query['address.currentCity'] = { $regex: params.city, $options: 'i' };
  }

  // Manglik
  if (params.manglik) {
    query['astroDetails.manglik'] = params.manglik;
  }

  // Annual income range
  if (params.minIncome || params.maxIncome) {
    query['career.annualIncome'] = {};
    if (params.minIncome) query['career.annualIncome'].$gte = params.minIncome;
    if (params.maxIncome) query['career.annualIncome'].$lte = params.maxIncome;
  }

  // Diet
  if (params.diet) {
    query['lifestyle.diet'] = params.diet;
  }

  // Smoking
  if (params.smoking) {
    query['lifestyle.smoking'] = params.smoking;
  }

  // Drinking
  if (params.drinking) {
    query['lifestyle.drinking'] = params.drinking;
  }

  // Keyword search
  if (params.keyword) {
    query.$or = [
      { 'basicInfo.name': { $regex: params.keyword, $options: 'i' } },
      { 'aboutMe': { $regex: params.keyword, $options: 'i' } },
      { 'education.highestQualification': { $regex: params.keyword, $options: 'i' } },
      { 'career.occupation': { $regex: params.keyword, $options: 'i' } }
    ];
  }

  return query;
};

/**
 * Calculate profile completion percentage
 */
const calculateProfileCompletion = (profile) => {
  const sections = [
    { name: 'basicInfo', weight: 25, fields: ['name', 'gender', 'dateOfBirth', 'placeOfBirth'] },
    { name: 'astroDetails', weight: 15, fields: ['rashi', 'nakshatra', 'manglik', 'gotra'] },
    { name: 'physicalDetails', weight: 10, fields: ['height', 'weight', 'complexion'] },
    { name: 'education', weight: 15, fields: ['highestQualification'] },
    { name: 'career', weight: 10, fields: ['occupation', 'annualIncome'] },
    { name: 'familyDetails', weight: 10, fields: ['fatherName', 'motherName'] },
    { name: 'address', weight: 5, fields: ['currentCity', 'state'] },
    { name: 'lifestyle', weight: 5, fields: ['diet'] },
    { name: 'aboutMe', weight: 5, fields: ['aboutMe'] }
  ];

  let totalScore = 0;

  sections.forEach(section => {
    const sectionData = profile[section.name];
    if (!sectionData) return;

    const filledFields = section.fields.filter(field => {
      const value = sectionData[field];
      return value !== undefined && value !== null && value !== '';
    });

    const sectionScore = (filledFields.length / section.fields.length) * section.weight;
    totalScore += sectionScore;
  });

  // Bonus for photos
  if (profile.photos && profile.photos.length > 0) {
    totalScore = Math.min(100, totalScore + 5);
  }

  return Math.round(totalScore);
};

/**
 * Get profile statistics
 */
const getProfileStats = async (userId) => {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  return {
    totalViews: profile.stats?.totalViews || 0,
    profileViewsToday: profile.stats?.profileViewsToday || 0,
    totalInterests: profile.stats?.totalInterests || 0,
    interestsSent: profile.stats?.interestsSent || 0,
    interestsReceived: profile.stats?.interestsReceived || 0,
    interestsAccepted: profile.stats?.interestsAccepted || 0,
    profileCompletionPercentage: profile.profileCompletionPercentage
  };
};

/**
 * Update privacy settings
 */
const updatePrivacySettings = async (userId, settings) => {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  profile.privacySettings = {
    ...profile.privacySettings?.toObject(),
    ...settings
  };

  await profile.save();

  return profile;
};

/**
 * Deactivate/reactivate profile
 */
const toggleProfileStatus = async (userId, newStatus) => {
  const profile = await Profile.findOneAndUpdate(
     { user: userId },
    { $set: { status: newStatus } },
    { new: true, runValidators: true }
  );
console.log(profile)
  if (!profile) {
    throw new ApiError(404, 'User not found');
  }

  return;
};

module.exports = {
  createUpdateProfile,
  getProfile,
  getProfileById,
  updateProfileSection,
  uploadPhoto,
  deletePhoto,
  setProfilePicture,
  searchProfiles,
  getProfileStats,
  updatePrivacySettings,
  toggleProfileStatus,
  calculateProfileCompletion
};