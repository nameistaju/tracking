/**
 * Smart Alert Engine
 * 
 * Monitors user activity and generates alerts:
 * - inactive: No location update for 30+ min during work hours (9am-7pm)
 * - tracking_stopped: User was tracking, then stopped for 15+ min
 * - no_location_update: Last seen > 1 hour ago
 * - low_battery: Battery < 15%
 */

const User = require('../models/User');
const Alert = require('../models/Alert');

const INACTIVE_THRESHOLD_MS = 30 * 60 * 1000;     // 30 minutes
const STOPPED_THRESHOLD_MS = 15 * 60 * 1000;       // 15 minutes
const NO_UPDATE_THRESHOLD_MS = 60 * 60 * 1000;     // 1 hour
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 19; // 7 PM

/**
 * Check if current time is within work hours
 */
function isWorkHours() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR;
}

/**
 * Run alert checks for all active interns
 * Call this periodically (every 5-10 minutes via a cron or interval)
 */
async function checkAndGenerateAlerts() {
  if (!isWorkHours()) return [];

  const interns = await User.find({ role: 'Intern', isActive: true }).lean();
  const now = Date.now();
  const newAlerts = [];

  for (const intern of interns) {
    const lastSeenTs = intern.lastSeen?.timestamp
      ? new Date(intern.lastSeen.timestamp).getTime()
      : 0;
    const timeSinceLastSeen = now - lastSeenTs;

    // Check: No location update for 1+ hour
    if (lastSeenTs > 0 && timeSinceLastSeen > NO_UPDATE_THRESHOLD_MS) {
      const existingAlert = await Alert.findOne({
        userId: intern._id,
        type: 'no_location_update',
        isRead: false,
        createdAt: { $gte: new Date(now - NO_UPDATE_THRESHOLD_MS) }
      });

      if (!existingAlert) {
        const minutesAgo = Math.round(timeSinceLastSeen / 60000);
        newAlerts.push({
          userId: intern._id,
          type: 'no_location_update',
          message: `${intern.name} has not updated location for ${minutesAgo} minutes`,
          severity: 'warning'
        });
      }
    }

    // Check: Tracking was active but stopped
    if (intern.trackingStatus === 'active' && timeSinceLastSeen > STOPPED_THRESHOLD_MS) {
      const existingAlert = await Alert.findOne({
        userId: intern._id,
        type: 'tracking_stopped',
        isRead: false,
        createdAt: { $gte: new Date(now - STOPPED_THRESHOLD_MS) }
      });

      if (!existingAlert) {
        newAlerts.push({
          userId: intern._id,
          type: 'tracking_stopped',
          message: `${intern.name}'s tracking appears to have stopped unexpectedly`,
          severity: 'critical'
        });
      }
    }

    // Check: Inactive during work hours
    if (lastSeenTs > 0 && timeSinceLastSeen > INACTIVE_THRESHOLD_MS && timeSinceLastSeen < NO_UPDATE_THRESHOLD_MS) {
      const existingAlert = await Alert.findOne({
        userId: intern._id,
        type: 'inactive',
        isRead: false,
        createdAt: { $gte: new Date(now - INACTIVE_THRESHOLD_MS) }
      });

      if (!existingAlert) {
        newAlerts.push({
          userId: intern._id,
          type: 'inactive',
          message: `${intern.name} has been inactive for ${Math.round(timeSinceLastSeen / 60000)} minutes`,
          severity: 'warning'
        });
      }
    }

    // Check: Low battery
    if (intern.lastBattery && intern.lastBattery < 15) {
      const existingAlert = await Alert.findOne({
        userId: intern._id,
        type: 'low_battery',
        isRead: false,
        createdAt: { $gte: new Date(now - 30 * 60 * 1000) } // Don't repeat within 30 min
      });

      if (!existingAlert) {
        newAlerts.push({
          userId: intern._id,
          type: 'low_battery',
          message: `${intern.name}'s device battery is at ${intern.lastBattery}%`,
          severity: 'info'
        });
      }
    }
  }

  // Bulk insert new alerts
  if (newAlerts.length > 0) {
    await Alert.insertMany(newAlerts);
  }

  return newAlerts;
}

/**
 * Get unread alerts (for admin dashboard)
 */
async function getUnreadAlerts(limit = 50) {
  return Alert.find({ isRead: false })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get all alerts with optional filters
 */
async function getAlerts({ page = 1, limit = 20, type, severity, isRead } = {}) {
  const query = {};
  if (type) query.type = type;
  if (severity) query.severity = severity;
  if (isRead !== undefined) query.isRead = isRead;

  const [alerts, total] = await Promise.all([
    Alert.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Alert.countDocuments(query)
  ]);

  return { alerts, total, pages: Math.ceil(total / limit) };
}

/**
 * Mark an alert as read
 */
async function markAlertRead(alertId) {
  return Alert.findByIdAndUpdate(alertId, {
    isRead: true,
    resolvedAt: new Date()
  }, { new: true });
}

/**
 * Mark all alerts as read
 */
async function markAllRead() {
  return Alert.updateMany(
    { isRead: false },
    { isRead: true, resolvedAt: new Date() }
  );
}

module.exports = {
  checkAndGenerateAlerts,
  getUnreadAlerts,
  getAlerts,
  markAlertRead,
  markAllRead
};
