const Profile = require('../models/Profile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const config = require('../config');
const { calculateAge, calculateMatchScore } = require('../utils/helpers');

/**
 * Create or update user profile
 */
const createUpdateProfile = async (userId, profileData) => {
  // User model fields alag nikalo
  const userFields = {};
  const userAllowedFields = ['name', 'dob', 'gender', 'address', 'community', 'caste'];
  
  userAllowedFields.forEach(field => {
    if (profileData[field] !== undefined) {
      userFields[field] = profileData[field];
      delete profileData[field]; // profile data se hata do
    }
  });

  // User update karo agar koi field aaya ho
  if (Object.keys(userFields).length > 0) {
    await User.findByIdAndUpdate(userId, userFields, { runValidators: true });
  }

  // Profile update/create
  let profile = await Profile.findOne({ user: userId });

  if (profile) {
    Object.keys(profileData).forEach(key => {
      if (
        typeof profileData[key] === 'object' &&
        !Array.isArray(profileData[key]) &&
        profileData[key] !== null
      ) {
        profile[key] = { 
          ...(profile[key]?.toObject?.() || {}), 
          ...profileData[key] 
        };
      } else {
        profile[key] = profileData[key];
      }
    });
  } else {
    profile = new Profile({ user: userId, ...profileData });
  }

  profile.profileCompletionPercentage = calculateProfileCompletion(profile);
  await profile.save();

  return profile;
};

/**
 * Edit Profile - PUT endpoint
 */
const editProfile = async (userId, updateData) => {
  const userFields = {};
  const userAllowedFields = ['name', 'dob', 'gender', 'address', 'community', 'caste', 'profilePhoto'];
  
  userAllowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      userFields[field] = updateData[field];
      delete updateData[field];
    }
  });

  let updatedUser = null;
  if (Object.keys(userFields).length > 0) {
    updatedUser = await User.findByIdAndUpdate(
      userId, 
      userFields, 
      { new: true, runValidators: true }
    );
  }

  let profile = await Profile.findOne({ user: userId });

  if (!profile) {
    profile = new Profile({ user: userId, ...updateData });
  } else {
    Object.keys(updateData).forEach(key => {
      if (
        typeof updateData[key] === 'object' &&
        !Array.isArray(updateData[key]) &&
        updateData[key] !== null
      ) {
        profile[key] = { 
          ...(profile[key]?.toObject?.() || {}), 
          ...updateData[key] 
        };
      } else {
        profile[key] = updateData[key];
      }
    });
  }

  profile.profileCompletion = profile.calculateCompletion();
  profile.profileCompletionPercentage = profile.profileCompletion;
  
  await profile.save();
  await profile.populate('user', 'name email phone profilePhoto dob gender address community caste');

  return {
    user: updatedUser || (await User.findById(userId)),
    profile: profile,
    completion: profile.completion,
  };
};

/**
 * Get user profile
 */
const getProfile = async (userId) => {
  const profile = await Profile.findOne({ user: userId })
    .populate('user', 'name phone email address dob caste community gender profilePhoto isVerified');

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  return profile;
};

/**
 * Get profile by ID
 */
const getProfileById = async (profileId, viewerId = null) => {
  const profile = await Profile.findById(profileId)
    .populate('user', 'name isVerified');

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  const profileObj = profile.toObject();
  
  if (viewerId && viewerId.toString() !== profile.user._id.toString()) {
    if (profile.privacySettings?.hideContactDetails) {
      delete profileObj.contactInfo;
    }
    if (profile.privacySettings?.hidePhotos) {
      profileObj.photos = profileObj.photos?.filter(p => p.isProfilePicture) || [];
    }
    incrementProfileViews(profileId);
  }

  return profileObj;
};

const incrementProfileViews = async (profileId) => {
  await Profile.findByIdAndUpdate(profileId, {
    $inc: { 'stats.totalViews': 1 }
  });
};

const updateProfileSection = async (userId, section, sectionData) => {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  const validSections = [
    'basicInfo', 'astroDetails', 'physicalDetails', 'education',
    'career', 'familyDetails', 'address', 'lifestyle', 'preferences',
    'aboutMe', 'contactInfo'
  ];

  if (!validSections.includes(section)) {
    throw new ApiError(400, `Invalid section: ${section}`);
  }

  profile[section] = { ...profile[section]?.toObject(), ...sectionData };
  profile.profileCompletionPercentage = calculateProfileCompletion(profile);
  
  await profile.save();

  return profile;
};

const uploadPhoto = async (userId, photoData) => {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Profile not found.');
  if (profile.photos && profile.photos.length >= 10) throw new ApiError(400, 'Maximum 10 photos allowed.');

  const newPhoto = {
    url: photoData.url,
    publicId: photoData.publicId,
    isProfilePicture: photoData.isProfilePicture || false,
    isVerified: false
  };

  if (newPhoto.isProfilePicture) {
    profile.photos.forEach(p => p.isProfilePicture = false);
  }

  profile.photos.push(newPhoto);
  await profile.save();
  return profile;
};

const deletePhoto = async (userId, photoId) => {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Profile not found.');

  const photoIndex = profile.photos.findIndex(p => p._id.toString() === photoId);
  if (photoIndex === -1) throw new ApiError(404, 'Photo not found.');

  profile.photos.splice(photoIndex, 1);
  await profile.save();
  return profile;
};

const setProfilePicture = async (userId, photoId) => {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Profile not found.');

  const photo = profile.photos.find(p => p._id.toString() === photoId);
  if (!photo) throw new ApiError(404, 'Photo not found.');

  profile.photos.forEach(p => p.isProfilePicture = false);
  photo.isProfilePicture = true;

  await profile.save();
  return profile;
};

/**
 * Search profiles
 * ✅ Issue 4 Fix: Await the async buildSearchQuery
 */
const searchProfiles = async (userId, searchParams, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  
  // ✅ Now buildSearchQuery is async because it looks up Users collection
  const query = await buildSearchQuery(searchParams, userId);

  // Fallback: Agar User filter mein koi match nahi mila, to empty array return karo
  if (query._id === null) {
    return {
      profiles: [],
      pagination: { page, limit, total: 0, pages: 0 }
    };
  }

  const profiles = await Profile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name isVerified gender dob caste');

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
 * ✅ Issue 4 Fix: All paths corrected, and made async for User DB Lookups
 */
const buildSearchQuery = async (params, excludeUserId) => {
  const query = {
    isProfileVisible: true // ✅ Fix 1: Removed 'verification.isProfileComplete: false'
  };

  // --- Step 1: User Model Lookups (Gender, Age, Caste) ---
  const userQuery = {};
  let performUserLookup = false;

  if (params.gender) {
    userQuery.gender = params.gender; // ✅ Fix 2: basicInfo.gender -> User gender
    performUserLookup = true;
  }

  if (params.caste) {
    userQuery.caste = { $regex: params.caste, $options: 'i' }; // ✅ Fix 5: basicInfo.caste -> User caste
    performUserLookup = true;
  }

  if (params.minAge || params.maxAge) {
    const now = new Date();
    userQuery.dob = {}; // ✅ Fix 3: basicInfo.dateOfBirth -> User dob
    
    if (params.maxAge) {
      const minDate = new Date(now.setFullYear(now.getFullYear() - params.maxAge));
      userQuery.dob.$gte = minDate;
    }
    
    if (params.minAge) {
      // Create new date instance to avoid mutating the previous one
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() - params.minAge);
      userQuery.dob.$lte = maxDate;
    }
    performUserLookup = true;
  }

  if (params.keyword) {
    userQuery.name = { $regex: params.keyword, $options: 'i' };
    performUserLookup = true;
  }

  // ✅ Search users if needed and bind to Profile query
  if (performUserLookup) {
    const matchedUsers = await User.find(userQuery).select('_id');
    if (matchedUsers.length === 0) {
      return { _id: null }; // Agar koi user match nahi kiya, to Profile query ko short-circuit kardo
    }
    const matchedUserIds = matchedUsers.map(u => u._id);
    query.user = { $in: matchedUserIds, $ne: excludeUserId };
  } else {
    query.user = { $ne: excludeUserId };
  }

  // --- Step 2: Profile Model Lookups ---

  // Height range
  if (params.minHeight || params.maxHeight) {
    query['physicalDetails.height'] = {};
    if (params.minHeight) query['physicalDetails.height'].$gte = params.minHeight;
    if (params.maxHeight) query['physicalDetails.height'].$lte = params.maxHeight;
  }

  // Marital status
  if (params.maritalStatus && params.maritalStatus.length > 0) {
    query['maritalStatus'] = { $in: params.maritalStatus }; // ✅ Fix 4: astroDetails.maritalStatus -> maritalStatus
  }

  // Mother tongue
  if (params.motherTongue) {
    query['motherTongue'] = params.motherTongue; // ✅ Fix 6: basicInfo.motherTongue -> motherTongue
  }

  // Religion
  if (params.religion) {
    query['basicInfo.religion'] = params.religion; 
  }

  // Education
  if (params.education && params.education.length > 0) {
    query['education.highestQualification'] = { $in: params.education };
  }

  // Occupation
  if (params.occupation) {
    query['career.workingAs'] = { $regex: params.occupation, $options: 'i' }; // ✅ Fix 9: career.occupation -> career.workingAs
  }

  // Location
  if (params.state) {
    query['address.current.state'] = { $regex: params.state, $options: 'i' }; // ✅ Fix 7: address.state -> address.current.state
  }
  if (params.city) {
    query['address.current.city'] = { $regex: params.city, $options: 'i' }; // ✅ Fix 8: address.currentCity -> address.current.city
  }

  // Manglik
  if (params.manglik) {
    query['astroDetails.manglik'] = params.manglik;
  }

  // Lifestyle
  if (params.diet) query['lifestyle.diet'] = params.diet;
  if (params.smoking) query['lifestyle.smoking'] = params.smoking;
  if (params.drinking) query['lifestyle.drinking'] = params.drinking;

  // Keyword OR logic on Profile
  if (params.keyword && !performUserLookup) {
    query.$or = [
      { 'basicInfo.about': { $regex: params.keyword, $options: 'i' } },
      { 'education.highestQualification': { $regex: params.keyword, $options: 'i' } },
      { 'career.workingAs': { $regex: params.keyword, $options: 'i' } }
    ];
  }

  return query;
};

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

  if (profile.photos && profile.photos.length > 0) {
    totalScore = Math.min(100, totalScore + 5);
  }

  return Math.round(totalScore);
};

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

const toggleProfileStatus = async (userId, newStatus) => {
  const profile = await Profile.findOneAndUpdate(
     { user: userId },
    { $set: { status: newStatus } },
    { new: true, runValidators: true }
  );

  if (!profile) throw new ApiError(404, 'User not found');
  return;
};

module.exports = {
  createUpdateProfile,
  editProfile,
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