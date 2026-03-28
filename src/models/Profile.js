const mongoose = require('mongoose');
const { 
  PROFILE_STATUS, MARITAL_STATUS, MANGLIK_STATUS, 
  NADI_TYPES, RASHI, EDUCATION_LEVELS, INCOME_RANGE,
  DIET, SMOKING, DRINKING 
} = require('../utils/constants');
const { calculateAge, generateProfileId } = require('../utils/helpers');

/**
 * Profile Schema - Detailed matrimonial profile
 */
const profileSchema = new mongoose.Schema(
  {
    // User Reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    
    // Profile ID (Public facing)
    profileId: {
      type: String,
      unique: true,
      default: () => generateProfileId(),
    },

    // ============ PRIVACY SETTINGS ============
privacySettings: {
  isProfileVisible: { 
    type: Boolean, 
    default: true 
  },
  isPhotoVisible: { 
    type: Boolean, 
    default: true 
  },
  showContactInfo: { 
    type: Boolean, 
    default: false // By default contact number hide rakhein
  },
  showIncome: {
    type: Boolean,
    default: true
  }
},
    
    // ============ BASIC INFORMATION ============
    basicInfo: {
         subCaste: {
      type: String,
      trim: true,
      default: null,
    },
      
      // dateOfBirth: {
      //   type: Date,
      //   required: [true, 'Date of birth is required'],
      // },
      timeOfBirth: {
        type: String,
        default: null,
      },
      placeOfBirth: {
        type: String,
        trim: true,
        default: '',
      },
      about: {
        type: String,
        maxlength: [2000, 'About cannot exceed 2000 characters'],
        default: '',
      },
    },
    
    // ============ ASTRO DETAILS ============
    astroDetails: {
      rashi: {
        type: String,
        enum: Object.values(RASHI),
        default: null,
      },
      nakshatra: {
        type: String,
        trim: true,
        default: '',
      },
      manglik: {
        type: String,
        enum: Object.values(MANGLIK_STATUS),
        default: MANGLIK_STATUS.NO,
      },
      nadi: {
        type: String,
        enum: Object.values(NADI_TYPES),
        default: NADI_TYPES.NONE,
      },
      gotra: {
        type: String,
        trim: true,
        default: '',
      },
    },
    
    // ============ PHYSICAL DETAILS ============
    physicalDetails: {
      height: {
        type: Number, // in cm
        required: [true, 'Height is required'],
      },
      weight: {
        type: Number, // in kg
        default: null,
      },
      bodyType: {
        type: String,
        enum: ['slim', 'average', 'athletic', 'heavy'],
        default: 'average',
      },
      complexion: {
        type: String,
        enum: ['fair', 'wheatish', 'dark'],
        default: 'wheatish',
      },
      physicalStatus: {
        type: String,
        enum: ['normal', 'physically_challenged'],
        default: 'normal',
      },
    },
    
    // ============ MARITAL & FAMILY STATUS ============
    maritalStatus: {
      type: String,
      enum: Object.values(MARITAL_STATUS),
      required: [true, 'Marital status is required'],
      default: MARITAL_STATUS.NEVER_MARRIED,
    },
    children: {
      hasChildren: {
        type: Boolean,
        default: false,
      },
      numberOfChildren: {
        type: Number,
        default: 0,
      },
      childrenLivingWith: {
        type: Boolean,
        default: false,
      },
    },
    
    // ============ EDUCATION & CAREER ============
    education: {
      highestQualification: {
        type: String,
        enum: Object.values(EDUCATION_LEVELS),
        required: [true, 'Qualification is required'],
      },
      qualification: {
        type: String, // e.g., "B.Tech in Computer Science"
        trim: true,
        default: '',
      },
      college: {
        type: String,
        trim: true,
        default: '',
      },
    },
    
    career: {
      workingWith: {
        type: String, // e.g., "Private Company", "Government", "Business"
        trim: true,
        default: '',
      },
      workingAs: {
        type: String, // Job title
        trim: true,
        default: '',
      },
      company: {
        type: String,
        trim: true,
        default: '',
      },
      annualIncome: {
        type: String,
        enum: Object.values(INCOME_RANGE),
        default: null,
      },
      incomeDisplay: {
        type: String, // Display value like "25 LPA"
        trim: true,
        default: '',
      },
    },
    
    // ============ FAMILY DETAILS ============
    familyDetails: {
      father: {
        name: {
          type: String,
          trim: true,
          default: '',
        },
        occupation: {
          type: String,
          trim: true,
          default: '',
        },
        gotra: {
          type: String,
          trim: true,
          default: '',
        },
      },
      mother: {
        name: {
          type: String,
          trim: true,
          default: '',
        },
        occupation: {
          type: String,
          trim: true,
          default: '',
        },
        gotra: {
          type: String,
          trim: true,
          default: '',
        },
      },
      siblings: {
        brothers: {
          type: Number,
          default: 0,
        },
        sisters: {
          type: Number,
          default: 0,
        },
        brotherDetails: [{
          name: String,
          occupation: String,
          maritalStatus: String,
        }],
        sisterDetails: [{
          name: String,
          occupation: String,
          maritalStatus: String,
        }],
      },
      familyType: {
        type: String,
        enum: ['joint', 'nuclear'],
        default: 'nuclear',
      },
      familyValues: {
        type: String,
        enum: ['traditional', 'moderate', 'liberal'],
        default: 'moderate',
      },
      familyStatus: {
        type: String,
        enum: ['middle', 'upper_middle', 'rich', 'affluent'],
        default: 'middle',
      },
    },
    
    // ============ ADDRESS DETAILS ============
    address: {
      current: {
        address: {
          type: String,
          trim: true,
          default: '',
        },
        city: {
          type: String,
          trim: true,
          default: '',
        },
        state: {
          type: String,
          trim: true,
          default: '',
        },
        country: {
          type: String,
          trim: true,
          default: 'India',
        },
        pincode: {
          type: String,
          trim: true,
          default: '',
        },
      },
      native: {
        village: {
          type: String,
          trim: true,
          default: '',
        },
        district: {
          type: String,
          trim: true,
          default: '',
        },
        state: {
          type: String,
          trim: true,
          default: '',
        },
      },
    },
    
    // ============ RELIGIOUS & COMMUNITY ============
    // religion: {
    //   type: String,
    //   trim: true,
    //   default: 'Hindu',
    // },
    // caste: {
    //   type: String,
    //   trim: true,
    //   default: '',
    // },
    // subCaste: {
    //   type: String,
    //   trim: true,
    //   default: '',
    // },
    motherTongue: {
      type: String,
      trim: true,
      default: 'Hindi',
    },
    languages: [{
      type: String,
    }],
    
    // ============ LIFESTYLE ============
    lifestyle: {
      diet: {
        type: String,
        enum: Object.values(DIET),
        default: DIET.VEGETARIAN,
      },
      smoking: {
        type: String,
        enum: Object.values(SMOKING),
        default: SMOKING.NO,
      },
      drinking: {
        type: String,
        enum: Object.values(DRINKING),
        default: DRINKING.NO,
      },
      hobbies: [{
        type: String,
      }],
      interests: [{
        type: String,
      }],
    },
    
    // ============ PREFERENCES ============
    preferences: {
      priority: {
        type: String,
        trim: true,
        default: '',
      },
      partnerAgeRange: {
        min: { type: Number, default: 21 },
        max: { type: Number, default: 35 },
      },
      partnerHeightRange: {
        min: { type: Number, default: 150 },
        max: { type: Number, default: 180 },
      },
      partnerMaritalStatus: [{
        type: String,
        enum: Object.values(MARITAL_STATUS),
      }],
      partnerEducation: [{
        type: String,
      }],
      partnerOccupation: [{
        type: String,
      }],
      partnerLocation: [{
        type: String,
      }],
      partnerReligion: {
        type: String,
        default: '',
      },
      partnerCaste: [{
        type: String,
      }],
      partnerDiet: [{
        type: String,
        enum: Object.values(DIET),
      }],
      partnerManglik: {
        type: String,
        default: '',
      },
      partnerNadi: [{
        type: String,
        enum: Object.values(NADI_TYPES),
      }],
    },
    
    // ============ CONTACT & REFERENCE ============
    contact: {
      referenceName: {
        type: String,
        trim: true,
        default: '',
      },
      referenceRelation: {
        type: String,
        trim: true,
        default: '',
      },
      referencePhone: {
        type: String,
        trim: true,
        default: '',
      },
      referenceWhatsapp: {
        type: String,
        trim: true,
        default: '',
      },
    },
    
    // ============ PHOTOS ============
    photos: [{
      url: {
        type: String,
        required: true,
      },
      isPrimary: {
        type: Boolean,
        default: false,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // ============ PROFILE STATUS ============
    status: {
      type: String,
      enum: Object.values(PROFILE_STATUS),
      default: PROFILE_STATUS.DRAFT,
    },
    profileCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isProfileVisible: {
      type: Boolean,
      default: true,
    },
    isPhotoVisible: {
      type: Boolean,
      default: true,
    },
    
    // ============ SUBSCRIPTION ============
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'vip'],
        default: 'free',
      },
      startDate: {
        type: Date,
        default: null,
      },
      endDate: {
        type: Date,
        default: null,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
    },
    
    // ============ STATS ============
    stats: {
      profileViews: {
        type: Number,
        default: 0,
      },
      interestsReceived: {
        type: Number,
        default: 0,
      },
      interestsSent: {
        type: Number,
        default: 0,
      },
      matchesViewed: {
        type: Number,
        default: 0,
      },
    },
    
    // ============ VERIFICATION ============
    verification: {
      isPhotoVerified: {
        type: Boolean,
        default: false,
      },
      isIdVerified: {
        type: Boolean,
        default: false,
      },
      isPhoneVerified: {
        type: Boolean,
        default: false,
      },
      isEmailVerified: {
        type: Boolean,
        default: false,
      },
    },
    
    // ============ ADMIN FIELDS ============
    adminNotes: {
      type: String,
      default: '',
    },
    rejectedReason: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
profileSchema.index({ status: 1 });
profileSchema.index({ 'basicInfo.gender': 1 });
profileSchema.index({ maritalStatus: 1 });
profileSchema.index({ religion: 1, caste: 1 });
profileSchema.index({ 'address.current.city': 1 });
profileSchema.index({ 'address.current.state': 1 });
profileSchema.index({ createdAt: -1 });

// Virtual for age
profileSchema.virtual('age').get(function () {
  return this.basicInfo?.dateOfBirth ? calculateAge(this.basicInfo.dateOfBirth) : null;
});

// Virtual for primary photo
profileSchema.virtual('primaryPhoto').get(function () {
  const primary = this.photos?.find(p => p.isPrimary);
  return primary?.url || null;
});

// Method to calculate profile completion
profileSchema.methods.calculateCompletion = function () {
  let completion = 0;
  const weights = {
    basicInfo: 20,
    astroDetails: 10,
    physicalDetails: 10,
    education: 10,
    career: 10,
    familyDetails: 15,
    address: 5,
    lifestyle: 5,
    preferences: 10,
    photos: 5,
  };

  // Basic Info
  if (this.basicInfo?.name && this.basicInfo?.dateOfBirth) completion += weights.basicInfo;
  
  // Astro Details
  if (this.astroDetails?.rashi || this.astroDetails?.gotra) completion += weights.astroDetails;
  
  // Physical Details
  if (this.physicalDetails?.height) completion += weights.physicalDetails;
  
  // Education
  if (this.education?.highestQualification) completion += weights.education;
  
  // Career
  if (this.career?.workingAs || this.career?.workingWith) completion += weights.career;
  
  // Family Details
  if (this.familyDetails?.father?.name || this.familyDetails?.mother?.name) completion += weights.familyDetails;
  
  // Address
  if (this.address?.current?.city) completion += weights.address;
  
  // Lifestyle
  if (this.lifestyle?.diet) completion += weights.lifestyle;
  
  // Preferences
  if (this.preferences?.partnerAgeRange?.min) completion += weights.preferences;
  
  // Photos
  if (this.photos?.length > 0) completion += weights.photos;

  return Math.min(completion, 100);
};

// Pre-save middleware
profileSchema.pre('save', function (next) {
  this.profileCompletion = this.calculateCompletion();
  next();
});

module.exports = mongoose.model('Profile', profileSchema);