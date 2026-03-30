// src/crons/healthCheck.cron.js
const cron = require("node-cron");
const axios = require("axios");
const logger = require("../config/logger");
require("dotenv").config();

const healthCheckCron = () => {

  if (!process.env.BASE_URL) {
    logger.error("❌ BASE_URL missing in env. Cron not started.");
    return;
  }

  // Har 4 minute mein chalega (Render sleep prevent)
  cron.schedule(
    "*/4 * * * *",
    async () => {
      try {
        const url = `${process.env.BASE_URL}/api/health`;

        const res = await axios.get(url);

        logger.info(
          `[CRON] Health check OK — Status: ${res.status} — ${new Date().toISOString()}`
        );
      } catch (error) {
        logger.error(
          `[CRON] Health check FAILED — ${error.message} — ${new Date().toISOString()}`
        );
      }
    },
    {
      timezone: "Asia/Kolkata" // important 🔥
    }
  );

  logger.info("🕒 Health Check Cron Started (Every 4 min)");
};

module.exports = healthCheckCron;