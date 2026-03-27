const crypto = require('crypto');
const mongoose = require('mongoose');

/**
 * Generate random OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 0;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Format date to readable string
 */
const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

/**
 * Generate unique filename
 */
const generateFilename = (originalName, userId) => {
  const ext = originalName.split('.').pop();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${userId}_${timestamp}_${random}.${ext}`;
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

/**
 * Parse height string to cm
 */
const parseHeight = (heightStr) => {
  if (!heightStr) return null;
  
  // If already a number, return it
  if (typeof heightStr === 'number') return heightStr;
  
  // Parse formats like "5'6\"", "5ft 6in", "168 cm"
  const feetInchMatch = heightStr.match(/(\d+)'(\d+)/);
  const feetInchMatch2 = heightStr.match(/(\d+)\s*ft\s*(\d+)\s*in/i);
  const cmMatch = heightStr.match(/(\d+)\s*cm/i);
  
  if (feetInchMatch || feetInchMatch2) {
    const match = feetInchMatch || feetInchMatch2;
    const feet = parseInt(match[1]);
    const inches = parseInt(match[2]);
    return Math.round((feet * 30.48) + (inches * 2.54));
  }
  
  if (cmMatch) {
    return parseInt(cmMatch[1]);
  }
  
  return null;
};

/**
 * Convert cm to feet and inches
 */
const cmToFeetInches = (cm) => {
  if (!cm) return '';
  
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  
  return `${feet}'${inches}"`;
};

/**
 * Parse income string to number
 */
const parseIncome = (incomeStr) => {
  if (!incomeStr) return null;
  
  if (typeof incomeStr === 'number') return incomeStr;
  
  // Parse formats like "10 LPA", "10-15 LPA", "1000000"
  const lpaMatch = incomeStr.match(/(\d+)\s*-?\s*(\d*)\s*lpa/i);
  const numberMatch = incomeStr.match(/(\d+)/);
  
  if (lpaMatch) {
    const min = parseInt(lpaMatch[1]);
    const max = lpaMatch[2] ? parseInt(lpaMatch[2]) : min;
    return { min: min * 100000, max: max * 100000 };
  }
  
  if (numberMatch) {
    const value = parseInt(numberMatch[1]);
    // Assume LPA if value is small
    if (value < 1000) {
      return value * 100000;
    }
    return value;
  }
  
  return null;
};

/**
 * Calculate match score between two profiles
 */
const calculateMatchScore = (profile1, profile2) => {
  let score = 0;
  const maxScore = 100;

  // Age compatibility (20 points)
  const age1 = calculateAge(profile1.basicInfo?.dateOfBirth);
  const age2 = calculateAge(profile2.basicInfo?.dateOfBirth);
  const ageDiff = Math.abs(age1 - age2);
  
  if (ageDiff <= 2) score += 20;
  else if (ageDiff <= 5) score += 15;
  else if (ageDiff <= 8) score += 10;
  else if (ageDiff <= 10) score += 5;

  // Height compatibility (10 points)
  const prefHeight1 = profile1.preferences?.preferredHeightMin;
  const prefHeight2 = profile2.preferences?.preferredHeightMin;
  const height1 = profile1.physicalDetails?.height;
  const height2 = profile2.physicalDetails?.height;
  
  if (prefHeight1 && height2 && height2 >= prefHeight1) score += 5;
  if (prefHeight2 && height1 && height1 >= prefHeight2) score += 5;

  // Religion/Caste compatibility (20 points)
  if (profile1.basicInfo?.religion === profile2.basicInfo?.religion) {
    score += 10;
    if (profile1.basicInfo?.caste === profile2.basicInfo?.caste) {
      score += 10;
    }
  }

  // Education compatibility (10 points)
  const prefEducation1 = profile1.preferences?.preferredEducation || [];
  const prefEducation2 = profile2.preferences?.preferredEducation || [];
  
  if (prefEducation1.includes(profile2.education?.highestQualification)) score += 5;
  if (prefEducation2.includes(profile1.education?.highestQualification)) score += 5;

  // Location compatibility (10 points)
  if (profile1.address?.state === profile2.address?.state) {
    score += 10;
  } else if (profile1.address?.state && profile2.address?.state) {
    // Same region check (could be expanded)
    score += 5;
  }

  // Marital status preference (10 points)
  const prefMarital1 = profile1.preferences?.preferredMaritalStatus || [];
  const prefMarital2 = profile2.preferences?.preferredMaritalStatus || [];
  
  if (prefMarital1.includes(profile2.astroDetails?.maritalStatus)) score += 5;
  if (prefMarital2.includes(profile1.astroDetails?.maritalStatus)) score += 5;

  // Manglik compatibility (10 points)
  const manglik1 = profile1.astroDetails?.manglik;
  const manglik2 = profile2.astroDetails?.manglik;
  
  if (manglik1 === manglik2) score += 10;
  else if (manglik1 === 'no' || manglik2 === 'no') score += 5;

  // Diet preference (5 points)
  if (profile1.lifestyle?.diet === profile2.lifestyle?.diet) {
    score += 5;
  }

  // Profile completion bonus (5 points)
  const completion1 = profile1.profileCompletionPercentage || 0;
  const completion2 = profile2.profileCompletionPercentage || 0;
  score += Math.round((completion1 + completion2) / 40); // Max 5 points

  return Math.min(maxScore, score);
};

/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Check if ObjectId is valid
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Paginate results
 */
const paginate = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Generate slug from string
 */
const generateSlug = (str) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};


const generateProfileId = () => {
  const prefix = 'PROF';
  // Generates 4 random bytes and converts them to a hex string
  const randomHex = crypto.randomBytes(4).toString('hex'); 
  
  return `${prefix}-${randomHex}`.toUpperCase();
};

/**
 * Format phone number
 */
const formatPhoneNumber = (phone, countryCode = '+91') => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (cleaned.length === 10) {
    return `${countryCode}${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Mask phone number for privacy
 */
const maskPhoneNumber = (phone) => {
  if (!phone || phone.length < 6) return phone;
  
  const start = phone.slice(0, 2);
  const end = phone.slice(-2);
  const middle = '*'.repeat(phone.length - 4);
  
  return `${start}${middle}${end}`;
};

/**
 * Mask email for privacy
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);
  
  return `${maskedLocal}@${domain}`;
};

module.exports = {
  generateOTP,
  generateProfileId,
  calculateAge,
  formatDate,
  generateFilename,
  sanitizeInput,
  parseHeight,
  cmToFeetInches,
  parseIncome,
  calculateMatchScore,
  generateRandomString,
  isValidObjectId,
  paginate,
  generateSlug,
  formatPhoneNumber,
  maskPhoneNumber,
  maskEmail
};