const express = require('express');
const Station = require('../models/Station');
const { findRoute } = require('../utils/dijkstra');

const router = express.Router();

// @desc    Calculate route between two stations
// @route   GET /api/route
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { from, to, criteria } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: 'Please provide both "from" and "to" station codes or IDs' });
    }

    // Load all stations to build the graph
    const stations = await Station.find();

    // Find route using Dijkstra
    const route = findRoute(stations, from, to, criteria || 'distance');

    if (!route) {
      return res.status(404).json({ message: 'No route found between the specified stations' });
    }

    res.json(route);
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ message: 'Error calculating route', error: error.message });
  }
});

module.exports = router;
