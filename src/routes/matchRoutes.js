const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { protect } = require('../middlewares/auth');

// All match routes require authentication
router.use(protect);

// Match suggestions
router.get('/suggestions', matchController.getMatchSuggestions);
router.get('/daily', matchController.getDailyMatches);
router.get('/mutual', matchController.getMutualMatches);
router.get('/nearby', matchController.getNearbyProfiles);
router.get('/recently-viewed', matchController.getRecentlyViewed);
router.get('/visitors', matchController.getProfileVisitors);

module.exports = router;