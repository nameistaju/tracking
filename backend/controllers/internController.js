const Attendance = require('../models/Attendance');
const Lead = require('../models/Lead');
const LocationLog = require('../models/LocationLog');
const User = require('../models/User');
const { reverseGeocode, hasMovedSignificantly } = require('../services/geocodingService');
const { processAndStoreDwellZones } = require('../services/dwellService');
const { getGpsQuality } = require('../services/reportService');

// @desc    Check-in
// @route   POST /api/intern/checkin
exports.checkIn = async (req, res) => {
  const { lat, lng } = req.body;
  const date = new Date().toISOString().split('T')[0];

  try {
    let attendance = await Attendance.findOne({ userId: req.user._id, date });
    if (attendance) return res.status(400).json({ message: 'Already checked in today' });

    attendance = await Attendance.create({
      userId: req.user._id,
      date,
      checkIn: { location: { lat, lng } }
    });

    // Update tracking status
    await User.findByIdAndUpdate(req.user._id, { trackingStatus: 'active' });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit Lead with reverse geocoding
// @route   POST /api/intern/lead
exports.submitLead = async (req, res) => {
  const {
    businessName,
    clientName,
    clientPhone,
    clientEmail,
    addressText,
    notes,
    status,
    visitOutcome,
    lat,
    lng,
    accuracy
  } = req.body;

  try {
    // Reverse geocode the lead location (non-blocking)
    let address = { area: '', city: '', formatted: '' };
    try {
      const geo = await reverseGeocode(lat, lng);
      address = { area: geo.area, city: geo.city, formatted: geo.formatted };
    } catch (e) {
      console.warn('Lead geocoding failed:', e.message);
    }

    const lead = await Lead.create({
      userId: req.user._id,
      businessName,
      clientName,
      clientPhone,
      clientEmail,
      addressText,
      notes,
      location: { lat, lng },
      address,
      status: status || 'new',
      visitOutcome: visitOutcome || 'visited',
      gps: {
        accuracy: typeof accuracy === 'number' ? accuracy : null,
        quality: getGpsQuality(accuracy)
      }
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Location with smart geocoding
// @route   POST /api/intern/location
exports.updateLocation = async (req, res) => {
  const { lat, lng, accuracy, battery, speed, heading, altitude, altitudeAccuracy } = req.body;

  try {
    // Get user's last known position to check if they moved significantly
    const user = await User.findById(req.user._id).lean();
    const lastLat = user?.lastSeen?.lat;
    const lastLng = user?.lastSeen?.lng;

    // Only geocode if moved > 200m from last geocoded position (saves API calls)
    let address = { area: '', city: '', state: '', formatted: '' };
    if (hasMovedSignificantly(lastLat, lastLng, lat, lng, 200)) {
      try {
        address = await reverseGeocode(lat, lng);
      } catch (e) {
        console.warn('Location geocoding failed:', e.message);
      }
    } else {
      // Re-use the previous address data from last log
      const lastLog = await LocationLog.findOne({ userId: req.user._id })
        .sort({ timestamp: -1 })
        .lean();
      if (lastLog?.address?.formatted) {
        address = lastLog.address;
      }
    }

    const gpsQuality = getGpsQuality(accuracy);

    // Create location log with enriched data
    await LocationLog.create({
      userId: req.user._id,
      location: { lat, lng },
      address,
      accuracy: accuracy || null,
      battery: battery || null,
      speed: speed || null,
      heading: heading || null,
      altitude: altitude || null,
      altitudeAccuracy: altitudeAccuracy || null,
      gpsQuality
    });

    // Update user's last seen with address
    const updateData = {
      lastSeen: { lat, lng, timestamp: Date.now(), address: address.formatted },
      trackingStatus: 'active'
    };
    if (battery !== undefined) updateData.lastBattery = battery;
    
    await User.findByIdAndUpdate(req.user._id, updateData);

    // Process dwell zones asynchronously (don't await — fire and forget)
    const today = new Date().toISOString().split('T')[0];
    processAndStoreDwellZones(req.user._id, today).catch(e => 
      console.warn('Dwell detection error:', e.message)
    );

    res.json({ message: 'Location updated', address: address.formatted, gpsQuality });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update tracking status
// @route   POST /api/intern/tracking-status
exports.updateTrackingStatus = async (req, res) => {
  const { status } = req.body; // 'active', 'paused', 'stopped'
  try {
    await User.findByIdAndUpdate(req.user._id, { trackingStatus: status });
    res.json({ message: `Tracking ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get My Stats (enhanced)
// @route   GET /api/intern/stats
exports.getMyStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [leadsCount, attendance, todayLogs] = await Promise.all([
      Lead.countDocuments({ userId: req.user._id }),
      Attendance.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5),
      LocationLog.countDocuments({
        userId: req.user._id,
        timestamp: { $gte: new Date(`${today}T00:00:00.000Z`) }
      })
    ]);

    res.json({
      leadsCount,
      recentAttendance: attendance,
      todayPings: todayLogs,
      trackingActive: todayLogs > 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
