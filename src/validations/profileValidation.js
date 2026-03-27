const { body, param, query } = require('express-validator');

/**
 * Validation for basic info section
 */
const basicInfoValidation = [
  body('basicInfo.name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('basicInfo.gender')
    .optional()
    .isIn(['male', 'female'])
    .withMessage('Gender must be male or female'),
  
  body('basicInfo.dateOfBirth')
    .optional()
    .isDate()
    .withMessage('Invalid date of birth')
    .custom((value) => {
      const age = calculateAgeFromDate(value);
      if (age < 18) throw new Error('Must be at least 18 years old');
      if (age > 80) throw new Error('Invalid date of birth');
      return true;
    }),
  
  body('basicInfo.religion')
    .optional()
    .isIn(['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'])
    .withMessage('Invalid religion'),
  
  body('basicInfo.motherTongue')
    .optional()
    .isIn(['Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Other'])
    .withMessage('Invalid mother tongue')
];

/**
 * Validation for astro details section
 */
const astroDetailsValidation = [
  body('astroDetails.maritalStatus')
    .optional()
    .isIn(['never_married', 'divorced', 'widowed', 'awaiting_divorce'])
    .withMessage('Invalid marital status'),
  
  body('astroDetails.manglik')
    .optional()
    .isIn(['yes', 'no', 'anshik'])
    .withMessage('Invalid manglik status'),
  
  body('astroDetails.nadi')
    .optional()
    .isIn(['adi', 'madhya', 'ant', 'none'])
    .withMessage('Invalid nadi type')
];

/**
 * Validation for physical details section
 */
const physicalDetailsValidation = [
  body('physicalDetails.height')
    .optional()
    .isInt({ min: 120, max: 250 })
    .withMessage('Height must be between 120cm and 250cm'),
  
  body('physicalDetails.weight')
    .optional()
    .isInt({ min: 30, max: 200 })
    .withMessage('Weight must be between 30kg and 200kg'),
  
  body('physicalDetails.bodyType')
    .optional()
    .isIn(['slim', 'average', 'athletic', 'heavy'])
    .withMessage('Invalid body type'),
  
  body('physicalDetails.complexion')
    .optional()
    .isIn(['fair', 'wheatish', 'dusky', 'dark'])
    .withMessage('Invalid complexion')
];

/**
 * Validation for education section
 */
const educationValidation = [
  body('education.highestQualification')
    .optional()
    .isIn([
      'High School', 'Intermediate', 'Diploma', 'B.A', 'B.Sc', 'B.Com', 
      'B.Tech', 'B.E', 'BBA', 'BCA', 'M.A', 'M.Sc', 'M.Com', 'M.Tech', 
      'M.E', 'MBA', 'MCA', 'PhD', 'Medical', 'Law', 'Other'
    ])
    .withMessage('Invalid qualification'),
  
  body('education.yearOfPassing')
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() + 5 })
    .withMessage('Invalid year of passing')
];

/**
 * Validation for career section
 */
const careerValidation = [
  body('career.occupation')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Occupation must be less than 100 characters'),
  
  body('career.annualIncome')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Annual income must be a positive number')
];

/**
 * Validation for family details section
 */
const familyDetailsValidation = [
  body('familyDetails.fatherName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Father name must be less than 50 characters'),
  
  body('familyDetails.motherName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Mother name must be less than 50 characters'),
  
  body('familyDetails.brothers')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Number of brothers must be between 0 and 20'),
  
  body('familyDetails.sisters')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Number of sisters must be between 0 and 20')
];

/**
 * Validation for address section
 */
const addressValidation = [
  body('address.currentCity')
    .optional()
    .isLength({ max: 50 })
    .withMessage('City must be less than 50 characters'),
  
  body('address.state')
    .optional()
    .isLength({ max: 50 })
    .withMessage('State must be less than 50 characters'),
  
  body('address.pincode')
    .optional()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Invalid pincode')
];

/**
 * Validation for lifestyle section
 */
const lifestyleValidation = [
  body('lifestyle.diet')
    .optional()
    .isIn(['vegetarian', 'non-vegetarian', 'eggetarian', 'vegan', 'jain'])
    .withMessage('Invalid diet preference'),
  
  body('lifestyle.smoking')
    .optional()
    .isIn(['never', 'occasionally', 'regularly'])
    .withMessage('Invalid smoking habit'),
  
  body('lifestyle.drinking')
    .optional()
    .isIn(['never', 'occasionally', 'regularly'])
    .withMessage('Invalid drinking habit')
];

/**
 * Validation for partner preferences
 */
const preferencesValidation = [
  body('preferences.preferredAgeMin')
    .optional()
    .isInt({ min: 18, max: 60 })
    .withMessage('Minimum age must be between 18 and 60'),
  
  body('preferences.preferredAgeMax')
    .optional()
    .isInt({ min: 18, max: 80 })
    .withMessage('Maximum age must be between 18 and 80')
    .custom((value, { req }) => {
      if (req.body.preferences?.preferredAgeMin && value < req.body.preferences.preferredAgeMin) {
        throw new Error('Maximum age must be greater than minimum age');
      }
      return true;
    }),
  
  body('preferences.preferredHeightMin')
    .optional()
    .isInt({ min: 120, max: 220 })
    .withMessage('Minimum height must be between 120cm and 220cm'),
  
  body('preferences.preferredHeightMax')
    .optional()
    .isInt({ min: 140, max: 250 })
    .withMessage('Maximum height must be between 140cm and 250cm')
];

/**
 * Validation for search parameters
 */
const searchValidation = [
  query('minAge')
    .optional()
    .isInt({ min: 18, max: 80 })
    .withMessage('Minimum age must be between 18 and 80'),
  
  query('maxAge')
    .optional()
    .isInt({ min: 18, max: 80 })
    .withMessage('Maximum age must be between 18 and 80'),
  
  query('minHeight')
    .optional()
    .isInt({ min: 120, max: 220 })
    .withMessage('Minimum height must be between 120cm and 220cm'),
  
  query('maxHeight')
    .optional()
    .isInt({ min: 140, max: 250 })
    .withMessage('Maximum height must be between 140cm and 250cm'),
  
  query('gender')
    .optional()
    .isIn(['male', 'female'])
    .withMessage('Gender must be male or female'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Helper function to calculate age from date
 */
function calculateAgeFromDate(dateString) {
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

module.exports = {
  basicInfoValidation,
  astroDetailsValidation,
  physicalDetailsValidation,
  educationValidation,
  careerValidation,
  familyDetailsValidation,
  addressValidation,
  lifestyleValidation,
  preferencesValidation,
  searchValidation
};