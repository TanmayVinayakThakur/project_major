const express = require('express');
const Station = require('../models/Station');
const router = express.Router();

// @desc    Get all metro stations
// @route   GET /api/stations
// @access  Public
router.get('/', async (req, res) => {
  try {
    const stations = await Station.find();
    res.json(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ message: 'Error fetching stations', error: error.message });
  }
});

module.exports = router;
