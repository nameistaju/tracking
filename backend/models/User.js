const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Intern'], default: 'Intern' },
  isActive: { type: Boolean, default: true },
  lastSeen: {
    type: {
      lat: Number,
      lng: Number,
      timestamp: Date,
      address: String
    },
    default: null
  },
  trackingStatus: { type: String, enum: ['active', 'paused', 'stopped'], default: 'stopped' },
  lastBattery: { type: Number }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
