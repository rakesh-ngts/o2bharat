const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');

// Create uploads directory if not exists
const fs = require('fs');
const uploadDirs = ['uploads', 'uploads/photos', 'logs'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Start server
const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🚀 Matrimonial API Server Started                       ║
  ║                                                           ║
  ║   Environment: ${config.NODE_ENV.padEnd(43)}║
  ║   Port: ${String(PORT).padEnd(51)}║
  ║   MongoDB: ${config.MONGODB_URI.split('@').pop().padEnd(47)}║
  ║                                                           ║
  ║   API: http://localhost:${PORT}/api                        ║
  ║   Health: http://localhost:${PORT}/api/health              ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  logger.error(err.stack);
  
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  logger.error(err.stack);
  
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    logger.info('💥 Process terminated!');
  });
});

module.exports = server;