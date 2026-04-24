const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName: { type: String, trim: true, default: '' },
  clientName: { type: String, required: true },
  clientPhone: { type: String, required: true },
  clientEmail: { type: String, trim: true, lowercase: true, default: '' },
  addressText: { type: String, trim: true, default: '' },
  notes: { type: String },
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
  gps: {
    accuracy: { type: Number, default: null },
    quality: {
      type: String,
      enum: ['high', 'medium', 'low', 'unknown'],
      default: 'unknown'
    }
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost', 'follow-up', 'not-interested'],
    default: 'new'
  },
  visitOutcome: {
    type: String,
    enum: ['visited', 'revisit-needed', 'not-available', 'follow-up', 'converted', 'not-interested'],
    default: 'visited'
  },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

leadSchema.index({ userId: 1, createdAt: -1 });
leadSchema.index({ status: 1 });

module.exports = mongoose.model('Lead', leadSchema);
