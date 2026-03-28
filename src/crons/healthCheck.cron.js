// src/crons/healthCheck.cron.js
const cron  = require('node-cron');
const axios = require('axios');

const healthCheckCron = () => {
  // Har 10 minute mein chalega
  cron.schedule('*/4 * * * *', async () => {
    try {
      const url = `${process.env.BASE_URL}/api/health/`;
      const res = await axios.get(url);
      console.log(`[CRON] Health check OK — status: ${res.status} — ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`[CRON] Health check FAILED — ${error.message}`);
    }
  });
};

module.exports = healthCheckCron;