const express = require('express');
const { checkIn, submitLead, updateLocation, getMyStats, updateTrackingStatus } = require('../controllers/internController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/checkin', protect, checkIn);
router.post('/lead', protect, submitLead);
router.post('/location', protect, updateLocation);
router.post('/tracking-status', protect, updateTrackingStatus);
router.get('/stats', protect, getMyStats);

module.exports = router;
