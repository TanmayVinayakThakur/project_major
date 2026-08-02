const mongoose = require('mongoose');

const tripHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  startStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true,
  },
  endStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true,
  },
  routeTaken: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
    },
  ],
  interchanges: [
    {
      station: { type: String },          // e.g. "Nadaprabhu Kempegowda Station, Majestic"
      fromLine: { type: String },         // e.g. "Purple"
      toLine: { type: String },           // e.g. "Green"
    },
  ],
  totalDistance: {
    type: Number, // in kilometres
    required: true,
  },
  travelTime: {
    type: Number, // in minutes
    required: true,
  },
  fare: {
    type: Number, // in ₹
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('TripHistory', tripHistorySchema);
