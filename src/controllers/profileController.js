const profileService = require('../services/profileService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateFilename } = require('../utils/helpers');
const { PROFILE_STATUS} = require("../utils/constants");
const User = require('../models/User');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/photos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user._id;
    const filename = generateFilename(file.originalname, userId);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

/**
 * Create or update user profile
 * @route POST /api/profile
 * @access Private
 */
const createUpdateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profileData = req.body;

    const profile = await profileService.createUpdateProfile(userId, profileData);

  
      return ApiResponse.success(res, profile, 'Profile saved successfully.')
   
  } catch (error) {
    next(error);
  }
};

/**
 * Edit user profile (PUT - Complete update of user and profile)
 * @route PUT /api/profile
 * @access Private
 */
const editProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    const result = await profileService.editProfile(userId, updateData);

    return ApiResponse.success(res, result, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile photo (User model's profilePhoto field)
 * @route PUT /api/profile/photo
 * @access Private
 */
const updateProfilePhoto = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      throw new ApiError(400, 'No file uploaded.');
    }

    const photoUrl = `/uploads/photos/${req.file.filename}`;

    // Update user's profilePhoto
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePhoto: photoUrl },
      { new: true, runValidators: true }
    );

    // Also add to profile photos array
    const photoData = {
      url: photoUrl,
      publicId: req.file.filename,
      isProfilePicture: true,
    };

    await profileService.uploadPhoto(userId, photoData);

    return ApiResponse.success(res, { 
      profilePhoto: photoUrl,
      user: user 
    }, 'Profile photo updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's own profile
 * @route GET /api/profile
 * @access Private
 */
const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await profileService.getProfile(userId);

   return ApiResponse.success(res, profile, 'Profile fetched successfully.')
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile by ID
 * @route GET /api/profile/:id
 * @access Private
 */
const getProfileById = async (req, res, next) => {
  try {
    const profileId = req.params.id;
    const viewerId = req.user._id;

    const profile = await profileService.getProfileById(profileId, viewerId);

    // Record profile view
    const ProfileView = require('../models/ProfileView');
    await ProfileView.findOneAndUpdate(
      { viewer: viewerId, profile: profileId },
      { viewedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json(
      new ApiResponse(200, profile, 'Profile fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile section
 * @route PATCH /api/profile/section/:section
 * @access Private
 */
const updateProfileSection = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const section = req.params.section;
    const sectionData = req.body;

    const profile = await profileService.updateProfileSection(userId, section, sectionData);

   return ApiResponse.success(res, profile, `${section} updated successfully.`)
  
  } catch (error) {
    next(error);
  }
};

/**
 * Upload photo
 * @route POST /api/profile/photos
 * @access Private
 */
const uploadPhoto = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      throw new ApiError(400, 'No file uploaded.');
    }

    const photoData = {
      url: `/uploads/photos/${req.file.filename}`,
      publicId: req.file.filename,
      isProfilePicture: req.body.isProfilePicture === 'true'
    };

    const profile = await profileService.uploadPhoto(userId, photoData);

  return ApiResponse.success(res, profile, 'Photo uploaded successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple photos
 * @route POST /api/profile/photos/multiple
 * @access Private
 */
const uploadMultiplePhotos = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'No files uploaded.');
    }

    const photosData = req.files.map(file => ({
      url: `/uploads/photos/${file.filename}`,
      publicId: file.filename,
      isProfilePicture: false
    }));

    let profile = await profileService.getProfile(userId);
    
    for (const photoData of photosData) {
      profile = await profileService.uploadPhoto(userId, photoData);
    }

    return ApiResponse(res, profile, 'Photos uploaded successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Delete photo
 * @route DELETE /api/profile/photos/:photoId
 * @access Private
 */
const deletePhoto = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const photoId = req.params.photoId;

    const profile = await profileService.deletePhoto(userId, photoId);

    res.status(200).json(
      new ApiResponse(200, profile, 'Photo deleted successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Set profile picture
 * @route PATCH /api/profile/photos/:photoId/profile-picture
 * @access Private
 */
const setProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const photoId = req.params.photoId;

    const profile = await profileService.setProfilePicture(userId, photoId);

    res.status(200).json(
      new ApiResponse(200, profile, 'Profile picture updated successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Search profiles
 * @route GET /api/profile/search
 * @access Private
 */
const searchProfiles = async (req, res, next) => {
  try {
    const userId = req.user._id;
  const { page, limit, ...searchParams } = { ...req.query, ...req.body };

    const result = await profileService.searchProfiles(
      userId,
      searchParams,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );

   return ApiResponse.success(res, result, 'Search results fetched successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile statistics
 * @route GET /api/profile/stats
 * @access Private
 */
const getProfileStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const stats = await profileService.getProfileStats(userId);

   return ApiResponse.success(res, stats, 'Profile statistics fetched successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Update privacy settings
 * @route PATCH /api/profile/privacy
 * @access Private
 */
const updatePrivacySettings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const settings = req.body;

    const profile = await profileService.updatePrivacySettings(userId, settings);
return ApiResponse.success(res, profile, 'Privacy settings updated successfully.')
 
} catch (error) {
    next(error);
  }
};

/**
 * Deactivate profile
 * @route POST /api/profile/deactivate
 * @access Private
 */
const deactivateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await profileService.toggleProfileStatus(userId, PROFILE_STATUS.INACTIVE);

   return ApiResponse.success(res, profile, 'Profile deactivated successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Activate profile
 * @route POST /api/profile/activate
 * @access Private
 */
const activateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await profileService.toggleProfileStatus(userId, PROFILE_STATUS.ACTIVE);

     return ApiResponse.success(res, profile, 'Profile activated successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile completion status
 * @route GET /api/profile/completion
 * @access Private
 */
const getProfileCompletion = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await profileService.getProfile(userId);

    const completion = {
      percentage: profile.profileCompletionPercentage,
      sections: {
        basicInfo: calculateSectionCompletion(profile, 'basicInfo', ['name', 'gender', 'dateOfBirth', 'placeOfBirth']),
        astroDetails: calculateSectionCompletion(profile, 'astroDetails', ['rashi', 'nakshatra', 'manglik', 'gotra']),
        physicalDetails: calculateSectionCompletion(profile, 'physicalDetails', ['height', 'weight', 'complexion']),
        education: calculateSectionCompletion(profile, 'education', ['highestQualification']),
        career: calculateSectionCompletion(profile, 'career', ['occupation', 'annualIncome']),
        familyDetails: calculateSectionCompletion(profile, 'familyDetails', ['fatherName', 'motherName']),
        address: calculateSectionCompletion(profile, 'address', ['currentCity', 'state']),
        lifestyle: calculateSectionCompletion(profile, 'lifestyle', ['diet']),
        aboutMe: calculateSectionCompletion(profile, 'aboutMe', ['aboutMe'])
      },
      hasPhotos: profile.photos && profile.photos.length > 0,
      isComplete: profile.verification?.isProfileComplete || false
    };

   return ApiResponse.success(res, completion, 'Profile completion status fetched successfully.')
  
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate section completion percentage
 */
const calculateSectionCompletion = (profile, section, fields) => {
  if (!profile[section]) return 0;

  const filledFields = fields.filter(field => {
    const value = profile[section][field];
    return value !== undefined && value !== null && value !== '';
  });

  return Math.round((filledFields.length / fields.length) * 100);
};

// Export multer upload middleware
const uploadMiddleware = upload.single('photo');
const uploadMultipleMiddleware = upload.array('photos', 10);

module.exports = {
  createUpdateProfile,
  editProfile,
  updateProfilePhoto,
  getMyProfile,
  getProfileById,
  updateProfileSection,
  uploadPhoto,
  uploadMultiplePhotos,
  deletePhoto,
  setProfilePicture,
  searchProfiles,
  getProfileStats,
  updatePrivacySettings,
  deactivateProfile,
  activateProfile,
  getProfileCompletion,
  uploadMiddleware,
  uploadMultipleMiddleware
};