# Matrimonial Website Backend API

A production-ready, scalable backend API for a matrimonial website similar to Shaadi.com or Jeevansathi, built with Node.js, Express, and MongoDB.

## 🌟 Features

### Authentication & Security

- **Dual-Token JWT Authentication**: Utilizes short-lived Access Tokens for secure API access and long-lived Refresh Tokens.
- **Automated Session Management**: Refresh tokens are securely stored in HTTP-only cookies and trigger automatically to generate new Access Tokens when the current session expires.
- **Secure Password Recovery**: Email-based password reset flow using cryptographically secure, time-bound (15-minute) hashed tokens sent via URL links.
- **Advanced Threat Protection**: Built-in rate limiting and brute-force attack prevention.
- **Data Integrity**: Strict input validation, data sanitization, and protection against XSS (Cross-Site Scripting) and NoSQL injection attacks.

### Profile Management

- Complete profile with Indian matrimonial specifics
- Multiple photo uploads with verification
- Profile completion tracking
- Privacy settings

### Indian Matrimonial Features

- **Astro Details**: Rashi, Nakshatra, Manglik, Nadi, Gotra
- **Family Details**: Father/Mother names, occupations, Gotra
- **Lifestyle**: Diet, smoking, drinking preferences
- **Location**: Current address, Native village, District, State

### Match System

- Smart matching algorithm
- Daily match suggestions
- Nearby profiles
- Recently viewed & profile visitors

### Interest System

- Send, accept, reject interests
- Shortlist profiles
- Interest statistics
- Bulk interest sending

### Admin Panel

- Dashboard with statistics
- User management
- Profile moderation
- Report handling
- Analytics

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development server
npm run dev
```

### Using Docker

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   ├── logger.js     # Winston logger
│   │   ├── swagger.js    # API documentation
│   │   └── index.js      # Config exports
│   │
│   ├── controllers/      # Request handlers
│   │   ├── authController.js
│   │   ├── profileController.js
│   │   ├── matchController.js
│   │   ├── interestController.js
│   │   └── adminController.js
│   │
│   ├── middlewares/      # Express middlewares
│   │   ├── auth.js       # Authentication
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validator.js
│   │
│   ├── models/           # Mongoose models
│   │   ├── User.js
│   │   ├── Profile.js
│   │   ├── Interest.js
│   │   ├── Match.js
│   │   ├── Notification.js
│   │   └── ...
│   │
│   ├── routes/           # API routes
│   │   ├── authRoutes.js
│   │   ├── profileRoutes.js
│   │   ├── matchRoutes.js
│   │   ├── interestRoutes.js
│   │   └── adminRoutes.js
│   │
│   ├── services/         # Business logic
│   │   ├── authService.js
│   │   ├── profileService.js
│   │   ├── matchService.js
│   │   └── interestService.js
│   │
│   ├── utils/            # Utility functions
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── asyncHandler.js
│   │
│   ├── validations/      # Input validations
│   │   └── profileValidation.js
│   │
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
│
├── uploads/              # Uploaded files
├── logs/                 # Application logs
├── tests/                # Test files
├── .env.example          # Environment template
├── Dockerfile            # Docker image
├── docker-compose.yml    # Docker services
├── nginx.conf            # Nginx configuration
└── package.json
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint                | Description            |
| ------ | ----------------------- | ---------------------- |
| POST   | `/auth/register`        | Register new user      |
| POST   | `/auth/login`           | Login user             |
| POST   | `/auth/verify-otp`      | Verify OTP             |
| POST   | `/auth/resend-otp`      | Resend OTP             |
| POST   | `/auth/forgot-password` | Request password reset |
| POST   | `/auth/reset-password`  | Reset password         |
| POST   | `/auth/refresh-token`   | Refresh access token   |
| POST   | `/auth/logout`          | Logout user            |
| GET    | `/auth/me`              | Get current user       |

### Profile Endpoints

| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| GET    | `/profile`                  | Get own profile         |
| POST   | `/profile`                  | Create/Update profile   |
| PATCH  | `/profile/section/:section` | Update specific section |
| GET    | `/profile/search`           | Search profiles         |
| GET    | `/profile/stats`            | Get profile statistics  |
| POST   | `/profile/photos`           | Upload photo            |
| DELETE | `/profile/photos/:id`       | Delete photo            |
| GET    | `/profile/:id`              | View other profile      |

### Match Endpoints

| Method | Endpoint               | Description           |
| ------ | ---------------------- | --------------------- |
| GET    | `/matches/suggestions` | Get match suggestions |
| GET    | `/matches/daily`       | Get daily matches     |
| GET    | `/matches/mutual`      | Get mutual matches    |
| GET    | `/matches/nearby`      | Get nearby profiles   |
| GET    | `/matches/visitors`    | Get profile visitors  |

### Interest Endpoints

| Method | Endpoint                   | Description            |
| ------ | -------------------------- | ---------------------- |
| POST   | `/interests/send`          | Send interest          |
| POST   | `/interests/:id/accept`    | Accept interest        |
| POST   | `/interests/:id/reject`    | Reject interest        |
| DELETE | `/interests/:id/cancel`    | Cancel interest        |
| GET    | `/interests/received`      | Get received interests |
| GET    | `/interests/sent`          | Get sent interests     |
| POST   | `/interests/shortlist/:id` | Shortlist profile      |

### Admin Endpoints

| Method | Endpoint                     | Description          |
| ------ | ---------------------------- | -------------------- |
| GET    | `/admin/stats`               | Dashboard statistics |
| GET    | `/admin/users`               | Get all users        |
| PATCH  | `/admin/users/:id/status`    | Update user status   |
| GET    | `/admin/reports`             | Get all reports      |
| PATCH  | `/admin/reports/:id/resolve` | Resolve report       |
| GET    | `/admin/analytics`           | Get analytics        |

## 🔒 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/matrimonial

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# OTP
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=*
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

## 📊 Database Models

### User Model

```javascript
{
  phone: String,          // 10-digit Indian number
  email: String,
  password: String,       // Hashed
  name: String,
  isVerified: Boolean,
  role: String,          // 'user' | 'admin'
  lastLogin: Date
}
```

### Profile Model

```javascript
{
  user: ObjectId,
  basicInfo: {
    name, gender, dateOfBirth, timeOfBirth, placeOfBirth,
    religion, caste, motherTongue
  },
  astroDetails: {
    rashi, nakshatra, manglik, nadi, gotra, maritalStatus
  },
  physicalDetails: {
    height, weight, bodyType, complexion
  },
  education: {
    highestQualification, college, yearOfPassing
  },
  career: {
    occupation, company, annualIncome
  },
  familyDetails: {
    fatherName, fatherOccupation, motherName, motherOccupation,
    fatherGotra, motherGotra, brothers, sisters
  },
  address: {
    currentAddress, currentCity, district, state, pincode, nativeVillage
  },
  lifestyle: {
    diet, smoking, drinking
  },
  preferences: {
    preferredAgeMin, preferredAgeMax, preferredHeightMin, preferredHeightMax,
    preferredReligion, preferredCaste, preferredLocation
  },
  photos: [{
    url, publicId, isProfilePicture, isVerified
  }],
  subscription: {
    plan, startDate, endDate
  },
  verification: {
    isProfileComplete, isPhoneVerified, isEmailVerified
  },
  stats: {
    totalViews, totalInterests, interestsSent, interestsReceived
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@matrimonial.com or join our Slack channel.

---

Made with ❤️ for Indian Matrimony
