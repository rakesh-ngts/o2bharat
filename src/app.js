const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');

const config = require('./config');
const logger = require('./config/logger');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const matchRoutes = require('./routes/matchRoutes');
const interestRoutes = require('./routes/interestRoutes');
const adminRoutes = require('./routes/adminRoutes');
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../src/config/swagger"); 

const app = express();

// Connect to database
connectDB();

// Request logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

//cron job

// app.js mein register karo


app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Matrimonial API is running.',
  });
});

// CORS configuration
app.use(cors({
  origin: config.CORS.ORIGIN,
  credentials: config.CORS.CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Compression
app.use(compression());

// Sanitize data
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'gender', 'religion', 'caste', 'education', 'occupation',
    'state', 'city', 'maritalStatus', 'manglik', 'page', 'limit'
  ]
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API rate limiting
if (config.NODE_ENV === 'production') {
  app.use('/api/', apiLimiter);
}



app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// API Routes
// app.use('/api/health', require('./routes/health.route'));
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/admin', adminRoutes);

// API Documentation (if enabled)
if (process.env.ENABLE_SWAGGER === 'true') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;