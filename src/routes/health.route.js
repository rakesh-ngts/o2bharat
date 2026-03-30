// src/routes/health.route.js
const express = require('express');
const router  = express.Router();

router.get('/', (req, res, next) => {
  try{
  res.status(200).json({
    status   : 'OK',
    uptime   : process.uptime(),       // server kitne seconds se chal raha hai
    timestamp: new Date().toISOString()
  });
}catch(error){
  next(error)
}
});

module.exports = router;