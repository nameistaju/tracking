const Lead = require('../models/Lead');
const LocationLog = require('../models/LocationLog');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { haversineDistance } = require('./geocodingService');

function getDayRange(dateString) {
  const date = dateString || new Date().toISOString().split('T')[0];
  return {
    date,
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`)
  };
}

function getGpsQuality(accuracy) {
  if (typeof accuracy !== 'number' || Number.isNaN(accuracy)) return 'unknown';
  if (accuracy <= 20) return 'high';
  if (accuracy <= 60) return 'medium';
  return 'low';
}

function calculateRouteDistance(logs) {
  let totalDistanceKm = 0;
  for (let i = 1; i < logs.length; i++) {
    totalDistanceKm += haversineDistance(
      logs[i - 1].location.lat,
      logs[i - 1].location.lng,
      logs[i].location.lat,
      logs[i].location.lng
    ) / 1000;
  }

  return Math.round(totalDistanceKm * 100) / 100;
}

function escapeCsv(value) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(','))
  ];
  return lines.join('\n');
}

async function buildDailyInternReport(dateString) {
  const { date, start, end } = getDayRange(dateString);

  const [interns, logs, clients, attendance] = await Promise.all([
    User.find({ role: 'Intern' }).select('name email').lean(),
    LocationLog.find({ timestamp: { $gte: start, $lte: end } }).sort({ timestamp: 1 }).lean(),
    Lead.find({ createdAt: { $gte: start, $lte: end } }).populate('userId', 'name email').sort({ createdAt: 1 }).lean(),
    Attendance.find({ date }).lean()
  ]);

  const logsByUser = new Map();
  logs.forEach(log => {
    const key = String(log.userId);
    if (!logsByUser.has(key)) logsByUser.set(key, []);
    logsByUser.get(key).push(log);
  });

  const clientsByUser = new Map();
  clients.forEach(client => {
    const key = String(client.userId?._id || client.userId);
    if (!clientsByUser.has(key)) clientsByUser.set(key, []);
    clientsByUser.get(key).push(client);
  });

  const attendanceByUser = new Map(attendance.map(entry => [String(entry.userId), entry]));

  const summary = interns.map(intern => {
    const key = String(intern._id);
    const internLogs = logsByUser.get(key) || [];
    const internClients = clientsByUser.get(key) || [];
    const checkRecord = attendanceByUser.get(key);
    const distanceKm = calculateRouteDistance(internLogs);
    const accuratePings = internLogs.filter(log => log.gpsQuality === 'high' || log.gpsQuality === 'medium').length;
    const logsWithAccuracy = internLogs.filter(log => typeof log.accuracy === 'number');
    const averageAccuracy = logsWithAccuracy.length
      ? Math.round(logsWithAccuracy.reduce((sum, log) => sum + log.accuracy, 0) / logsWithAccuracy.length)
      : null;

    return {
      internId: intern._id,
      internName: intern.name,
      email: intern.email,
      date,
      checkInTime: checkRecord?.checkIn?.time || null,
      checkOutTime: checkRecord?.checkOut?.time || null,
      totalPings: internLogs.length,
      gpsReliablePings: accuratePings,
      averageAccuracyMeters: averageAccuracy,
      totalDistanceKm: distanceKm,
      clientsVisited: internClients.length,
      clientNames: internClients.map(client => client.clientName).join(', '),
      businesses: internClients.map(client => client.businessName).filter(Boolean).join(', ')
    };
  });

  return {
    date,
    summary,
    clients
  };
}

module.exports = {
  buildDailyInternReport,
  calculateRouteDistance,
  getDayRange,
  getGpsQuality,
  toCsv
};
