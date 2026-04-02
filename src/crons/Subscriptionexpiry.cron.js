const cron = require('node-cron');
const { expireOldSubscriptions } = require('../services/subscriptionService');

/**
 * Cron: Expire subscriptions whose endDate has passed
 * Runs every hour at :00
 */
const subscriptionExpiryCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await expireOldSubscriptions();
      if (count > 0) {
        console.log(`[CRON] Expired ${count} subscription(s).`);
      }
    } catch (err) {
      console.error('[CRON] Subscription expiry error:', err.message);
    }
  });

  console.log('[CRON] Subscription expiry cron registered (every hour).');
};

module.exports = subscriptionExpiryCron;