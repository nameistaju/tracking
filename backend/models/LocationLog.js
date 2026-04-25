const mongoose = require('mongoose');
const ttlDays = parseInt(process.env.LOCATION_LOG_TTL_DAYS || '7', 10);
const ttlSeconds = Math.max(ttlDays, 1) * 24 * 60 * 60;

const locationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  address: {
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    formatted: { type: String, default: '' }
  },
  accuracy: { type: Number },       // GPS accuracy in meters
  battery: { type: Number },        // Device battery percentage
  speed: { type: Number },          // Movement speed in m/s
  heading: { type: Number },
  altitude: { type: Number },
  altitudeAccuracy: { type: Number },
  gpsQuality: {
    type: String,
    enum: ['high', 'medium', 'low', 'unknown'],
    default: 'unknown'
  },
  timestamp: { type: Date, default: Date.now }
});

locationLogSchema.index({ userId: 1, timestamp: -1 });
locationLogSchema.index({ timestamp: -1 });
locationLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: ttlSeconds });
locationLogSchema.index({ 'address.city': 1 });

module.exports = mongoose.model('LocationLog', locationLogSchema);
