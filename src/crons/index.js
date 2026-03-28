const healthCheckCron = require('./healthCheck.cron');

const initCrons = () => {
  healthCheckCron();
  console.log('[CRON] All cron jobs initialized');
};

module.exports = initCrons;