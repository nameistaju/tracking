const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['inactive', 'tracking_stopped', 'no_location_update', 'low_battery'],
    required: true
  },
  message: { type: String, required: true },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  isRead: { type: Boolean, default: false },
  resolvedAt: { type: Date }
}, { timestamps: true });

alertSchema.index({ isRead: 1, createdAt: -1 });
alertSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
