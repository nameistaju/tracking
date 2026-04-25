const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['break_start', 'break_end'],
    required: true,
  },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: {
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    formatted: { type: String, default: '' },
  },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

eventSchema.index({ userId: 1, timestamp: -1 });
eventSchema.index({ userId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('Event', eventSchema);
