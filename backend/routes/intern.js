const express = require('express');
const {
  checkIn,
  checkOut,
  submitLead,
  updateLocation,
  getMyStats,
  updateTrackingStatus,
  createEvent
} = require('../controllers/internController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/checkin', protect, checkIn);
router.post('/checkout', protect, checkOut);
router.post('/lead', protect, submitLead);
router.post('/location', protect, updateLocation);
router.post('/tracking-status', protect, updateTrackingStatus);
router.post('/event', protect, createEvent);
router.get('/stats', protect, getMyStats);

module.exports = router;
