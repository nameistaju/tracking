const express = require('express');
const {
  getAllInterns,
  getAllLeads,
  getAllClients,
  exportClients,
  getDashboardSummary,
  getLiveAgents,
  getRouteHistory,
  getDwellZones,
  getAnalyticsSummary,
  getUserAnalytics,
  getDailyInternReport,
  exportDailyInternReport,
  getAlerts,
  getUnreadAlerts,
  markAlertRead,
  markAllAlertsRead
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// Existing routes
router.get('/interns', protect, admin, getAllInterns);
router.get('/leads', protect, admin, getAllLeads);
router.get('/clients', protect, admin, getAllClients);
router.get('/clients/export', protect, admin, exportClients);
router.get('/dashboard', protect, admin, getDashboardSummary);
router.get('/live-agents', protect, admin, getLiveAgents);

// NEW: Route history & playback
router.get('/route-history/:userId', protect, admin, getRouteHistory);

// NEW: Dwell zones
router.get('/dwell-zones/:userId', protect, admin, getDwellZones);

// NEW: Analytics
router.get('/analytics/summary', protect, admin, getAnalyticsSummary);
router.get('/analytics/user/:userId', protect, admin, getUserAnalytics);

// Reports
router.get('/reports/daily', protect, admin, getDailyInternReport);
router.get('/reports/daily/export', protect, admin, exportDailyInternReport);

// NEW: Alerts
router.get('/alerts', protect, admin, getAlerts);
router.get('/alerts/unread', protect, admin, getUnreadAlerts);
router.patch('/alerts/:id/read', protect, admin, markAlertRead);
router.patch('/alerts/read-all', protect, admin, markAllAlertsRead);

module.exports = router;
