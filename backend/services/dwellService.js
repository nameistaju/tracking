/**
 * Dwell Time Detection Service
 * 
 * Analyzes location logs to detect when a user stayed at a location
 * for an extended period (> 5 minutes within a 100m radius)
 */

const LocationLog = require('../models/LocationLog');
const DwellZone = require('../models/DwellZone');
const { haversineDistance, reverseGeocode } = require('./geocodingService');

const DWELL_RADIUS_METERS = 100;    // Points within 100m are "same location"
const MIN_DWELL_MINUTES = 5;        // Minimum 5 minutes to count as a dwell

/**
 * Analyze a user's location logs for a given date and detect dwell zones
 * @param {string} userId 
 * @param {string} date - YYYY-MM-DD format
 * @returns {Array} Array of dwell zones detected
 */
async function detectDwellZones(userId, date) {
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const logs = await LocationLog.find({
    userId,
    timestamp: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ timestamp: 1 }).lean();

  if (logs.length < 2) return [];

  const dwellZones = [];
  let groupStart = 0;

  for (let i = 1; i <= logs.length; i++) {
    const anchor = logs[groupStart];
    const current = i < logs.length ? logs[i] : null;

    // Check if current point is still within dwell radius of anchor
    const withinRadius = current && haversineDistance(
      anchor.location.lat, anchor.location.lng,
      current.location.lat, current.location.lng
    ) <= DWELL_RADIUS_METERS;

    if (!withinRadius) {
      // End of group — check if it qualifies as a dwell
      const groupEnd = i - 1;
      const firstLog = logs[groupStart];
      const lastLog = logs[groupEnd];
      const durationMs = new Date(lastLog.timestamp) - new Date(firstLog.timestamp);
      const durationMinutes = Math.round(durationMs / 60000);

      if (durationMinutes >= MIN_DWELL_MINUTES) {
        // Calculate average position of dwell cluster
        let totalLat = 0, totalLng = 0, count = 0;
        for (let j = groupStart; j <= groupEnd; j++) {
          totalLat += logs[j].location.lat;
          totalLng += logs[j].location.lng;
          count++;
        }
        const avgLat = totalLat / count;
        const avgLng = totalLng / count;

        // Get address for this dwell zone
        let address = { area: '', city: '', formatted: '' };
        try {
          const geo = await reverseGeocode(avgLat, avgLng);
          address = { area: geo.area, city: geo.city, formatted: geo.formatted };
        } catch (e) {
          // Fallback — use existing address from log if available
          if (firstLog.address?.formatted) {
            address = firstLog.address;
          }
        }

        dwellZones.push({
          userId,
          location: { lat: avgLat, lng: avgLng },
          address,
          enteredAt: firstLog.timestamp,
          exitedAt: lastLog.timestamp,
          durationMinutes,
          date
        });
      }

      // Start new group from current point
      groupStart = i;
    }
  }

  return dwellZones;
}

/**
 * Process and store dwell zones for a user on a given date
 * Replaces any previously detected zones for that user+date combo
 */
async function processAndStoreDwellZones(userId, date) {
  const zones = await detectDwellZones(userId, date);

  if (zones.length > 0) {
    // Remove old detections for this user+date
    await DwellZone.deleteMany({ userId, date });
    // Store fresh detections
    await DwellZone.insertMany(zones);
  }

  return zones;
}

/**
 * Get dwell zones for a user within a date range
 */
async function getDwellZones(userId, startDate, endDate) {
  const query = { userId };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    query.date = startDate;
  }

  return DwellZone.find(query).sort({ enteredAt: -1 }).lean();
}

module.exports = {
  detectDwellZones,
  processAndStoreDwellZones,
  getDwellZones
};
