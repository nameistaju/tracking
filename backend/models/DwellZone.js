const mongoose = require('mongoose');

const dwellZoneSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  address: {
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    formatted: { type: String, default: '' }
  },
  enteredAt: { type: Date, required: true },
  exitedAt: { type: Date },
  durationMinutes: { type: Number, default: 0 },
  date: { type: String, required: true } // YYYY-MM-DD for fast queries
}, { timestamps: true });

dwellZoneSchema.index({ userId: 1, date: 1 });
dwellZoneSchema.index({ userId: 1, enteredAt: -1 });

module.exports = mongoose.model('DwellZone', dwellZoneSchema);
