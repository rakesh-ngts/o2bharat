// config/logger.js — pura replace karo
const winston = require('winston');
const path    = require('path');

const isProd = process.env.NODE_ENV === 'production';

const devFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level     : isProd ? 'warn' : 'debug',
  // ✅ exceptionHandlers hata do — crash logger mein nahi, server.js mein handle karo
  exitOnError: false,
  transports: isProd
    ? [
        new winston.transports.Console({ format: jsonFormat }),
        new winston.transports.File({
          filename: path.join(__dirname, '../../logs/error.log'),
          level   : 'error',
          maxsize : 5 * 1024 * 1024,
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../../logs/combined.log'),
          maxsize : 5 * 1024 * 1024,
          maxFiles: 5,
        }),
      ]
    : [
        // ✅ Development — sirf colorful console
        new winston.transports.Console({ format: devFormat }),
      ],
});

logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;