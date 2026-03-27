require('dotenv').config();

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/matrimonial',
  
  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-change-in-production',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  
  // Bcrypt Configuration
  BCRYPT: {
    SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },
  
  // OTP Configuration
  OTP: {
    LENGTH: parseInt(process.env.OTP_LENGTH) || 6,
    EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
  },
  
  // SMS Configuration (for OTP)
  SMS: {
    PROVIDER: process.env.SMS_PROVIDER || 'twilio',
    TWILIO: {
      ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      FROM_NUMBER: process.env.TWILIO_FROM_NUMBER
    }
  },
  
  // Email Configuration
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.EMAIL_PORT) || 587,
    SECURE: process.env.EMAIL_SECURE === 'true',
    USER: process.env.EMAIL_USER,
    PASS: process.env.EMAIL_PASS,
    FROM: process.env.EMAIL_FROM || 'noreply@matrimonial.com'
  },
  
  // File Upload Configuration
  UPLOAD: {
    MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/'
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },
  
  // Pagination Defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },
  
  // Subscription Plans
  SUBSCRIPTION: {
    FREE: {
      NAME: 'Free',
      PRICE: 0,
      PROFILE_VIEWS_PER_DAY: 5,
      INTERESTS_PER_DAY: 5,
      CHAT_ACCESS: false,
      DURATION_DAYS: 0
    },
    BASIC: {
      NAME: 'Basic',
      PRICE: 999,
      PROFILE_VIEWS_PER_DAY: 20,
      INTERESTS_PER_DAY: 15,
      CHAT_ACCESS: true,
      DURATION_DAYS: 30
    },
    PREMIUM: {
      NAME: 'Premium',
      PRICE: 2499,
      PROFILE_VIEWS_PER_DAY: -1, // Unlimited
      INTERESTS_PER_DAY: -1,
      CHAT_ACCESS: true,
      DURATION_DAYS: 90
    },
    VIP: {
      NAME: 'VIP',
      PRICE: 4999,
      PROFILE_VIEWS_PER_DAY: -1,
      INTERESTS_PER_DAY: -1,
      CHAT_ACCESS: true,
      DURATION_DAYS: 180
    }
  },
  
  // CORS Configuration
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || '*',
    CREDENTIALS: true
  },
  
  // Redis Configuration (for caching and sessions)
  REDIS: {
    URL: process.env.REDIS_URL || 'redis://localhost:6379'
  }
};