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
        // enum: Object.values(RASHI),
        default: null,
      },
      nakshatra: {
        type: String,
        trim: true,
        default: '',
      },
      manglik: {
        type: String,
        // enum: Object.values(MANGLIK_STATUS),
        default: MANGLIK_STATUS.NO,
      },
      nadi: {
        type: String,
        // enum: Object.values(NADI_TYPES),
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
    
      },
      weight: {
        type: Number, // in kg
        default: null,
      },
      bodyType: {
        type: String,
        // enum: ['slim', 'average', 'athletic', 'heavy'],
        default: 'average',
      },
      complexion: {
        type: String,
        // enum: ['fair', 'wheatish', 'dark'],
        default: 'wheatish',
      },
      physicalStatus: {
        type: String,
        // enum: ['normal', 'physically_challenged'],
        default: 'normal',
      },
    },
    
    // ============ MARITAL & FAMILY STATUS ============
    maritalStatus: {
      type: String,
      // enum: Object.values(MARITAL_STATUS),
   
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
        // enum: Object.values(EDUCATION_LEVELS),
       
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
        // enum: Object.values(INCOME_RANGE),
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
        // enum: ['joint', 'nuclear'],
        default: 'nuclear',
      },
      familyValues: {
        type: String,
        // enum: ['traditional', 'moderate', 'liberal'],
        default: 'moderate',
      },
      familyStatus: {
        type: String,
        // enum: ['middle', 'upper_middle', 'rich', 'affluent'],
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
        // enum: Object.values(DIET),
        default: DIET.VEGETARIAN,
      },
      smoking: {
        type: String,
        // enum: Object.values(SMOKING),
        default: SMOKING.NO,
      },
      drinking: {
        type: String,
        // enum: Object.values(DRINKING),
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
        // enum: Object.values(MARITAL_STATUS),
      }],
      genderPre:{
        type:String
      },
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
        // enum: Object.values(DIET),
      }],
      partnerManglik: {
        type: String,
        default: '',
      },
      partnerNadi: [{
        type: String,
        // enum: Object.values(NADI_TYPES),
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
    // Detailed completion breakdown
    completion: {
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      sections: {
        basicInfo: { type: Number, default: 0 },
        astroDetails: { type: Number, default: 0 },
        physicalDetails: { type: Number, default: 0 },
        education: { type: Number, default: 0 },
        career: { type: Number, default: 0 },
        familyDetails: { type: Number, default: 0 },
        address: { type: Number, default: 0 },
        lifestyle: { type: Number, default: 0 },
        preferences: { type: Number, default: 0 },
        photos: { type: Number, default: 0 },
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
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

// Method to calculate profile completion with detailed breakdown
profileSchema.methods.calculateCompletion = function () {
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

  const sections = {
    basicInfo: 0,
    astroDetails: 0,
    physicalDetails: 0,
    education: 0,
    career: 0,
    familyDetails: 0,
    address: 0,
    lifestyle: 0,
    preferences: 0,
    photos: 0,
  };

  // Basic Info - Check multiple fields
  const basicInfoFields = [
    this.basicInfo?.subCaste,
    this.basicInfo?.timeOfBirth,
    this.basicInfo?.placeOfBirth,
    this.basicInfo?.about,
  ].filter(f => f).length;
  if (this.basicInfo?.about || this.basicInfo?.subCaste || this.basicInfo?.placeOfBirth) {
    sections.basicInfo = Math.min(100, Math.round((basicInfoFields / 4) * weights.basicInfo));
  }

  // Astro Details
  const astroFields = [
    this.astroDetails?.rashi,
    this.astroDetails?.nakshatra,
    this.astroDetails?.gotra,
    this.astroDetails?.manglik,
  ].filter(f => f).length;
  sections.astroDetails = Math.round((astroFields / 4) * weights.astroDetails);

  // Physical Details
  const physicalFields = [
    this.physicalDetails?.height,
    this.physicalDetails?.weight,
    this.physicalDetails?.bodyType,
    this.physicalDetails?.complexion,
  ].filter(f => f).length;
  sections.physicalDetails = Math.round((physicalFields / 4) * weights.physicalDetails);

  // Education
  const eduFields = [
    this.education?.highestQualification,
    this.education?.qualification,
    this.education?.college,
  ].filter(f => f).length;
  sections.education = Math.round((eduFields / 3) * weights.education);

  // Career
  const careerFields = [
    this.career?.workingWith,
    this.career?.workingAs,
    this.career?.company,
    this.career?.annualIncome,
  ].filter(f => f).length;
  sections.career = Math.round((careerFields / 4) * weights.career);

  // Family Details
  const familyFields = [
    this.familyDetails?.father?.name,
    this.familyDetails?.mother?.name,
    this.familyDetails?.familyType,
    this.familyDetails?.familyValues,
  ].filter(f => f).length;
  sections.familyDetails = Math.round((familyFields / 4) * weights.familyDetails);

  // Address
  const addressFields = [
    this.address?.current?.city,
    this.address?.current?.state,
    this.address?.current?.pincode,
  ].filter(f => f).length;
  sections.address = Math.round((addressFields / 3) * weights.address);

  // Lifestyle
  const lifestyleFields = [
    this.lifestyle?.diet,
    this.lifestyle?.smoking,
    this.lifestyle?.drinking,
  ].filter(f => f).length;
  sections.lifestyle = Math.round((lifestyleFields / 3) * weights.lifestyle);

  // Preferences
  const prefFields = [
    this.preferences?.partnerAgeRange?.min,
    this.preferences?.partnerHeightRange?.min,
    this.preferences?.partnerMaritalStatus?.length > 0,
  ].filter(f => f).length;
  sections.preferences = Math.round((prefFields / 3) * weights.preferences);

  // Photos
  if (this.photos?.length > 0) {
    sections.photos = weights.photos;
  }

  // Calculate total
  const totalCompletion = Object.values(sections).reduce((a, b) => a + b, 0);

  // Update completion object
  this.completion = {
    percentage: Math.min(totalCompletion, 100),
    sections: sections,
    lastUpdated: new Date(),
  };

  return Math.min(totalCompletion, 100);
};

// Pre-save middleware
profileSchema.pre('save', function (next) {
  this.profileCompletion = this.calculateCompletion();
  next();
});

module.exports = mongoose.model('Profile', profileSchema);