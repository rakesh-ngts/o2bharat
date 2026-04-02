const app      = require('./app');
const config   = require('./config');
const logger   = require('./config/logger');
const mongoose = require('mongoose');
const initCrons = require('../src/crons/index');
require('dotenv').config();

const fs = require('fs');
['uploads', 'uploads/photos', 'logs'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const PORT = config.PORT;


mongoose.connect(config.MONGODB_URI).then(() => {

  const server = app.listen(PORT, () => {
    logger.info(`Server started — port ${PORT} — env ${config.NODE_ENV}`);

    // ✅ Server ready hone ke baad crons start karo
    // initCrons();
  });

  // Unhandled rejections
  process.on('unhandledRejection', (err) => {
    logger.error(`UNHANDLED REJECTION: ${err.message}`, { stack: err.stack });
    server.close(() => process.exit(1));
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.warn('SIGTERM received — shutting down gracefully');
    server.close(() => {
      mongoose.connection.close();
      logger.info('Process terminated.');
      process.exit(0);
    });
  });

}).catch((err) => {
  logger.error(`MongoDB connection failed: ${err.message}`);
  process.exit(1);
});

// Uncaught exceptions — DB connect se pehle bhi catch ho
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, { stack: err.stack });
  process.exit(1);
});