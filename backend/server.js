require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { getCorsOrigins, matchesOrigin, validateEnv } = require('./config/env');
const { checkAndGenerateAlerts } = require('./services/alertService');

validateEnv();

// Connect to Database
connectDB();

const app = express();
const allowedOrigins = getCorsOrigins();

app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.some((allowedOrigin) => matchesOrigin(origin, allowedOrigin))) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes Placeholder
app.get('/', (req, res) => {
  res.json({
    service: 'Field Tracking API',
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Auth Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Intern Routes
const internRoutes = require('./routes/intern');
app.use('/api/intern', internRoutes);

// Admin Routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

app.use((error, _req, res, _next) => {
  console.error('[Server Error]', error.message);
  res.status(error.message === 'CORS origin not allowed' ? 403 : 500).json({
    message: error.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Run smart alert checks every 5 minutes
  setInterval(async () => {
    try {
      const alerts = await checkAndGenerateAlerts();
      if (alerts.length > 0) {
        console.log(`[Alert Engine] Generated ${alerts.length} new alerts`);
      }
    } catch (err) {
      console.error('[Alert Engine] Error:', err.message);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
