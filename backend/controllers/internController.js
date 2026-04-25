const Attendance = require('../models/Attendance');
const Lead = require('../models/Lead');
const LocationLog = require('../models/LocationLog');
const Event = require('../models/Event');
const User = require('../models/User');
const { reverseGeocode, hasMovedSignificantly, haversineDistance } = require('../services/geocodingService');
const { processAndStoreDwellZones } = require('../services/dwellService');
const { getGpsQuality } = require('../services/reportService');

const LOCATION_DEDUPE_METERS = parseInt(process.env.LOCATION_LOG_MIN_DISTANCE_METERS || '15', 10);
const MAX_ACCEPTABLE_GPS_ACCURACY = parseInt(process.env.MAX_ACCEPTABLE_GPS_ACCURACY_METERS || '100', 10);

const getTodayString = () => new Date().toISOString().split('T')[0];

const ensureAttendanceSession = async (userId, location) => {
  const date = getTodayString();
  let attendance = await Attendance.findOne({ userId, date });

  if (!attendance) {
    attendance = await Attendance.create({
      userId,
      date,
      checkIn: {
        time: new Date(),
        location,
      }
    });
  }

  return attendance;
};

// @desc    Check-in
// @route   POST /api/intern/checkin
exports.checkIn = async (req, res) => {
  const { lat, lng } = req.body;
  const date = getTodayString();

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

// @desc    Check-out
// @route   POST /api/intern/checkout
exports.checkOut = async (req, res) => {
  const { lat, lng } = req.body;
  const date = getTodayString();

  try {
    const attendance = await Attendance.findOne({ userId: req.user._id, date });
    if (!attendance) {
      return res.status(400).json({ message: 'Cannot end work before starting it' });
    }

    attendance.checkOut = {
      time: new Date(),
      location: typeof lat === 'number' && typeof lng === 'number'
        ? { lat, lng }
        : attendance.checkOut?.location
    };

    await attendance.save();
    await User.findByIdAndUpdate(req.user._id, { trackingStatus: 'stopped' });

    return res.json(attendance);
  } catch (error) {
    return res.status(500).json({ message: error.message });
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
    if (typeof accuracy === 'number' && accuracy > MAX_ACCEPTABLE_GPS_ACCURACY) {
      return res.status(202).json({
        message: 'Location skipped due to poor GPS accuracy',
        skipped: true,
        reason: 'poor_accuracy'
      });
    }

    // Get user's last known position to check if they moved significantly
    const user = await User.findById(req.user._id).lean();
    const lastLat = user?.lastSeen?.lat;
    const lastLng = user?.lastSeen?.lng;
    const previousLog = await LocationLog.findOne({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .lean();

    if (previousLog) {
      const distanceFromLastLog = haversineDistance(
        previousLog.location.lat,
        previousLog.location.lng,
        lat,
        lng
      );

      if (distanceFromLastLog < LOCATION_DEDUPE_METERS) {
        const updateData = {
          lastSeen: {
            lat,
            lng,
            timestamp: Date.now(),
            address: previousLog.address?.formatted || user?.lastSeen?.address || ''
          },
          trackingStatus: 'active'
        };
        if (battery !== undefined) updateData.lastBattery = battery;

        await User.findByIdAndUpdate(req.user._id, updateData);

        return res.status(202).json({
          message: 'Location skipped as duplicate movement',
          skipped: true,
          reason: 'duplicate_location',
          address: previousLog.address?.formatted || '',
          gpsQuality: getGpsQuality(accuracy)
        });
      }
    }

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
      if (previousLog?.address?.formatted) {
        address = previousLog.address;
      }
    }

    const gpsQuality = getGpsQuality(accuracy);
    await ensureAttendanceSession(req.user._id, { lat, lng });

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
    const today = getTodayString();
    processAndStoreDwellZones(req.user._id, today).catch(e => 
      console.warn('Dwell detection error:', e.message)
    );

    res.json({ message: 'Location updated', address: address.formatted, gpsQuality });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create break event
// @route   POST /api/intern/event
exports.createEvent = async (req, res) => {
  const { type, lat, lng } = req.body;

  if (!['break_start', 'break_end'].includes(type)) {
    return res.status(400).json({ message: 'Invalid event type' });
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ message: 'Break location is required' });
  }

  try {
    const attendance = await Attendance.findOne({ userId: req.user._id, date: getTodayString() });

    if (!attendance) {
      return res.status(400).json({ message: 'Start work before using breaks' });
    }

    const lastEvent = await Event.findOne({ userId: req.user._id }).sort({ timestamp: -1 }).lean();

    if (type === 'break_start' && lastEvent?.type === 'break_start') {
      return res.status(400).json({ message: 'Break already active' });
    }

    if (type === 'break_end' && lastEvent?.type !== 'break_start') {
      return res.status(400).json({ message: 'No active break to end' });
    }

    let address = { area: '', city: '', state: '', formatted: '' };
    try {
      address = await reverseGeocode(lat, lng);
    } catch (error) {
      console.warn('Break geocoding failed:', error.message);
    }

    const event = await Event.create({
      userId: req.user._id,
      type,
      lat,
      lng,
      address,
    });

    return res.status(201).json(event);
  } catch (error) {
    return res.status(500).json({ message: error.message });
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
    const today = getTodayString();

    const [leadsCount, attendance, todayAttendance, todayLogs, latestEvent] = await Promise.all([
      Lead.countDocuments({ userId: req.user._id }),
      Attendance.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5),
      Attendance.findOne({ userId: req.user._id, date: today }).lean(),
      LocationLog.countDocuments({
        userId: req.user._id,
        timestamp: { $gte: new Date(`${today}T00:00:00.000Z`) }
      }),
      Event.findOne({ userId: req.user._id }).sort({ timestamp: -1 }).lean()
    ]);

    res.json({
      leadsCount,
      recentAttendance: attendance,
      todayPings: todayLogs,
      trackingActive: todayLogs > 0,
      todayAttendance,
      breakActive: latestEvent?.type === 'break_start',
      latestEvent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
