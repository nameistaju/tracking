const User = require('../models/User');
const Lead = require('../models/Lead');
const Attendance = require('../models/Attendance');
const LocationLog = require('../models/LocationLog');
const DwellZone = require('../models/DwellZone');
const Alert = require('../models/Alert');
const { haversineDistance } = require('../services/geocodingService');
const { getDwellZones } = require('../services/dwellService');
const { getUnreadAlerts, getAlerts, markAlertRead, markAllRead } = require('../services/alertService');
const { buildDailyInternReport, calculateRouteDistance, getDayRange, toCsv } = require('../services/reportService');

// @desc    Get All Active Interns
// @route   GET /api/admin/interns
exports.getAllInterns = async (req, res) => {
  try {
    const interns = await User.find({ role: 'Intern' }).select('-password');
    res.json(interns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Live Agent Locations (for the map)
// @route   GET /api/admin/live-agents
exports.getLiveAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: 'Intern' })
      .select('name email lastSeen isActive trackingStatus lastBattery createdAt')
      .sort({ 'lastSeen.timestamp': -1 });

    const now = Date.now();
    const enriched = agents.map(agent => {
      const obj = agent.toObject();
      const lastSeenMs = obj.lastSeen?.timestamp ? new Date(obj.lastSeen.timestamp).getTime() : 0;
      const minutesAgo = lastSeenMs ? Math.floor((now - lastSeenMs) / 60000) : null;
      return {
        ...obj,
        minutesAgo,
        isOnline: minutesAgo !== null && minutesAgo < 10,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Leads
// @route   GET /api/admin/leads
exports.getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find().populate('userId', 'name email').sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Client Details
// @route   GET /api/admin/clients
exports.getAllClients = async (req, res) => {
  try {
    const { status, internId, date } = req.query;
    const query = {};

    if (status) query.status = status;
    if (internId) query.userId = internId;
    if (date) {
      const { start, end } = getDayRange(date);
      query.createdAt = { $gte: start, $lte: end };
    }

    const clients = await Lead.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export All Client Details as CSV
// @route   GET /api/admin/clients/export
exports.exportClients = async (req, res) => {
  try {
    const { status, internId, date } = req.query;
    const query = {};

    if (status) query.status = status;
    if (internId) query.userId = internId;
    if (date) {
      const { start, end } = getDayRange(date);
      query.createdAt = { $gte: start, $lte: end };
    }

    const clients = await Lead.find(query).populate('userId', 'name email').sort({ createdAt: -1 }).lean();
    const rows = clients.map(client => ({
      Date: new Date(client.createdAt).toLocaleString(),
      Intern: client.userId?.name || '',
      BusinessName: client.businessName || '',
      ClientName: client.clientName || '',
      Phone: client.clientPhone || '',
      Email: client.clientEmail || '',
      Status: client.status || '',
      VisitOutcome: client.visitOutcome || '',
      Address: client.addressText || client.address?.formatted || '',
      Area: client.address?.area || '',
      City: client.address?.city || '',
      GPSAccuracyMeters: client.gps?.accuracy ?? '',
      GPSQuality: client.gps?.quality || '',
      Notes: client.notes || ''
    }));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="client-details-${date || 'all'}.csv"`);
    res.send(toCsv(rows));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Dashboard Summary (enhanced with analytics)
// @route   GET /api/admin/dashboard
exports.getDashboardSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(`${today}T00:00:00.000Z`);

    const [totalInterns, leadsTodayCount, totalLeads, activeToday, onlineAgents] = await Promise.all([
      User.countDocuments({ role: 'Intern' }),
      Lead.countDocuments({ createdAt: { $gte: todayStart } }),
      Lead.countDocuments({}),
      Attendance.countDocuments({ date: today }),
      User.countDocuments({ 
        role: 'Intern',
        'lastSeen.timestamp': { $gte: new Date(Date.now() - 10 * 60 * 1000) }
      })
    ]);

    // Unread alerts count
    const unreadAlerts = await Alert.countDocuments({ isRead: false });

    res.json({
      totalInterns,
      leadsTodayCount,
      totalLeads,
      activeToday,
      onlineAgents,
      unreadAlerts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Route History for a user (for route visualization + playback)
// @route   GET /api/admin/route-history/:userId
// @query   date (YYYY-MM-DD), startDate, endDate
exports.getRouteHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, startDate, endDate } = req.query;

    let query = { userId };

    if (date) {
      query.timestamp = {
        $gte: new Date(`${date}T00:00:00.000Z`),
        $lte: new Date(`${date}T23:59:59.999Z`)
      };
    } else if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${endDate}T23:59:59.999Z`)
      };
    } else {
      // Default: today
      const today = new Date().toISOString().split('T')[0];
      query.timestamp = {
        $gte: new Date(`${today}T00:00:00.000Z`),
        $lte: new Date(`${today}T23:59:59.999Z`)
      };
    }

    const logs = await LocationLog.find(query)
      .sort({ timestamp: 1 })
      .lean();

    const leadsQuery = { userId };
    if (query.timestamp) {
      leadsQuery.createdAt = query.timestamp;
    }

    const visitedClients = await Lead.find(leadsQuery)
      .sort({ createdAt: 1 })
      .lean();

    const accuracyLogs = logs.filter(log => typeof log.accuracy === 'number');
    const averageAccuracyMeters = accuracyLogs.length
      ? Math.round(accuracyLogs.reduce((sum, log) => sum + log.accuracy, 0) / accuracyLogs.length)
      : null;

    // Get user info
    const user = await User.findById(userId).select('name email').lean();

    res.json({
      user,
      logs,
      visitedClients,
      totalPoints: logs.length,
      totalDistanceKm: calculateRouteDistance(logs),
      averageAccuracyMeters,
      gpsSummary: {
        high: logs.filter(log => log.gpsQuality === 'high').length,
        medium: logs.filter(log => log.gpsQuality === 'medium').length,
        low: logs.filter(log => log.gpsQuality === 'low').length,
        unknown: logs.filter(log => !log.gpsQuality || log.gpsQuality === 'unknown').length
      },
      timeRange: logs.length > 0 ? {
        start: logs[0].timestamp,
        end: logs[logs.length - 1].timestamp
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Dwell Zones for a user
// @route   GET /api/admin/dwell-zones/:userId
// @query   date, startDate, endDate
exports.getDwellZones = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, startDate, endDate } = req.query;

    const zones = await getDwellZones(
      userId,
      date || startDate || new Date().toISOString().split('T')[0],
      endDate
    );

    res.json(zones);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Analytics Summary
// @route   GET /api/admin/analytics/summary
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(`${today}T00:00:00.000Z`);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Leads per user
    const leadsPerUser = await Lead.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', email: '$user.email', count: 1 } },
      { $sort: { count: -1 } }
    ]);

    // Activity per user (location pings today)
    const activityToday = await LocationLog.aggregate([
      { $match: { timestamp: { $gte: todayStart } } },
      { $group: { _id: '$userId', pings: { $sum: 1 }, lastPing: { $max: '$timestamp' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', pings: 1, lastPing: 1 } },
      { $sort: { pings: -1 } }
    ]);

    // Lead status distribution
    const leadsByStatus = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Weekly lead trend (last 7 days)
    const weeklyLeads = await Lead.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      leadsPerUser,
      activityToday,
      leadsByStatus,
      weeklyLeads
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Per-User Analytics
// @route   GET /api/admin/analytics/user/:userId
exports.getUserAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(`${today}T00:00:00.000Z`);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const user = await User.findById(userId).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [totalLeads, leadsThisWeek, todayPings, totalDwellToday, areasVisited] = await Promise.all([
      Lead.countDocuments({ userId }),
      Lead.countDocuments({ userId, createdAt: { $gte: weekAgo } }),
      LocationLog.countDocuments({ userId, timestamp: { $gte: todayStart } }),
      DwellZone.find({ userId, date: today }).lean(),
      LocationLog.distinct('address.city', {
        userId,
        timestamp: { $gte: todayStart },
        'address.city': { $ne: '' }
      })
    ]);

    // Calculate total distance today
    const todayLogs = await LocationLog.find({
      userId,
      timestamp: { $gte: todayStart }
    }).sort({ timestamp: 1 }).lean();

    const clientsVisitedToday = await Lead.find({
      userId,
      createdAt: { $gte: todayStart }
    }).sort({ createdAt: -1 }).lean();

    // Total dwell time today
    const totalDwellMinutes = totalDwellToday.reduce((sum, z) => sum + z.durationMinutes, 0);

    const accuracyLogs = todayLogs.filter(log => typeof log.accuracy === 'number');
    const averageAccuracyMeters = accuracyLogs.length
      ? Math.round(accuracyLogs.reduce((sum, log) => sum + log.accuracy, 0) / accuracyLogs.length)
      : null;

    res.json({
      user,
      totalLeads,
      leadsThisWeek,
      todayPings,
      totalDistanceKm: calculateRouteDistance(todayLogs),
      dwellZones: totalDwellToday,
      totalDwellMinutes,
      areasVisited,
      averageAccuracyMeters,
      clientsVisitedToday
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Daily Intern Reports
// @route   GET /api/admin/reports/daily
exports.getDailyInternReport = async (req, res) => {
  try {
    const report = await buildDailyInternReport(req.query.date);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export Daily Intern Reports
// @route   GET /api/admin/reports/daily/export
exports.exportDailyInternReport = async (req, res) => {
  try {
    const report = await buildDailyInternReport(req.query.date);
    const rows = report.summary.map(item => ({
      Date: item.date,
      Intern: item.internName,
      Email: item.email,
      CheckInTime: item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '',
      CheckOutTime: item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : '',
      TotalPings: item.totalPings,
      GPSReliablePings: item.gpsReliablePings,
      AverageAccuracyMeters: item.averageAccuracyMeters ?? '',
      DistanceKm: item.totalDistanceKm,
      ClientsVisited: item.clientsVisited,
      ClientNames: item.clientNames,
      Businesses: item.businesses
    }));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="daily-intern-report-${report.date}.csv"`);
    res.send(toCsv(rows));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Alerts
// @route   GET /api/admin/alerts
exports.getAlerts = async (req, res) => {
  try {
    const { page, type, severity } = req.query;
    const result = await getAlerts({ page: parseInt(page) || 1, type, severity });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Unread Alert Count
// @route   GET /api/admin/alerts/unread
exports.getUnreadAlerts = async (req, res) => {
  try {
    const alerts = await getUnreadAlerts(20);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark Alert as Read
// @route   PATCH /api/admin/alerts/:id/read
exports.markAlertRead = async (req, res) => {
  try {
    const alert = await markAlertRead(req.params.id);
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark All Alerts as Read
// @route   PATCH /api/admin/alerts/read-all
exports.markAllAlertsRead = async (req, res) => {
  try {
    await markAllRead();
    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
