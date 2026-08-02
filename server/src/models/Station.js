const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Connection sub-schema (weighted graph edge)
// ──────────────────────────────────────────────
const connectionSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    distance: {
      type: Number, // in kilometres
      required: true,
      min: 0,
    },
    travelTime: {
      type: Number, // in minutes
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────
// Station schema (graph node)
// ──────────────────────────────────────────────
const stationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Station name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Station code is required'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  line: {
    type: String,
    required: [true, 'Metro line is required'],
    enum: {
      values: ['Purple', 'Green', 'Yellow'],
      message: '{VALUE} is not a valid metro line',
    },
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  isInterchange: {
    type: Boolean,
    default: false,
  },
  connections: [connectionSchema],
});

// Index for quick lookups
stationSchema.index({ line: 1 });
stationSchema.index({ name: 1, line: 1 });

module.exports = mongoose.model('Station', stationSchema);
