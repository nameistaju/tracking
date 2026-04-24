const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkIn: {
    time: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number
    }
  },
  checkOut: {
    time: { type: Date },
    location: {
      lat: Number,
      lng: Number
    }
  },
  date: { type: String, required: true } // Format: YYYY-MM-DD
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
