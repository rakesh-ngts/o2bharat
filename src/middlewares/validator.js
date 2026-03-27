const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Validate request using express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }));
    
    return next(new ApiError(400, 'Validation failed', errorMessages));
  }
  
  next();
};

/**
 * Custom validation middleware for file uploads
 */
const validateFileUpload = (fieldName, options = {}) => {
  const {
    required = false,
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
  } = options;

  return (req, res, next) => {
    if (!req.file && !req.files) {
      if (required) {
        return next(new ApiError(400, `File '${fieldName}' is required.`));
      }
      return next();
    }

    const files = req.files ? (Array.isArray(req.files[fieldName]) ? req.files[fieldName] : [req.files[fieldName]]) : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file size
      if (file.size > maxSize) {
        return next(new ApiError(400, `File '${file.originalname}' exceeds maximum size of ${maxSize / (1024 * 1024)}MB.`));
      }

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new ApiError(400, `File type '${file.mimetype}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
      }
    }

    next();
  };
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next(new ApiError(400, `${paramName} is required.`));
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ApiError(400, `Invalid ${paramName} format.`));
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return next(new ApiError(400, 'Page must be a positive integer.'));
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return next(new ApiError(400, 'Limit must be between 1 and 100.'));
  }

  next();
};

/**
 * Sanitize request body by removing undefined/null values
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            result[key] = sanitize(value);
          } else {
            result[key] = value;
          }
        }
      }
      return result;
    };
    req.body = sanitize(req.body);
  }
  next();
};

/**
 * Trim string values in request body
 */
const trimStrings = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const trim = (obj) => {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          result[key] = value.trim();
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null && !(value instanceof Date)) {
          result[key] = trim(value);
        } else if (Array.isArray(value)) {
          result[key] = value.map(item => 
            typeof item === 'string' ? item.trim() : 
            (typeof item === 'object' && item !== null ? trim(item) : item)
          );
        } else {
          result[key] = value;
        }
      }
      return result;
    };
    req.body = trim(req.body);
  }
  next();
};

module.exports = {
  validate,
  validateFileUpload,
  validateObjectId,
  validatePagination,
  sanitizeBody,
  trimStrings
};