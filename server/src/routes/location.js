const express = require('express');
const router = express.Router();
const Station = require('../models/Station');

// Static landmarks fallback list
const LANDMARKS = [
  { name: 'Lalbagh Botanical Garden', stationCode: 'LBGH' },
  { name: 'Cubbon Park Garden', stationCode: 'CPBK' },
  { name: 'Vidhana Soudha (Assembly)', stationCode: 'VSVY' },
  { name: 'Kempegowda Majestic Bus Stand', stationCode: 'MSJP' },
  { name: 'Yeshwanthpur Railway Station', stationCode: 'YWPR' },
  { name: 'KSR Bengaluru City Railway Station', stationCode: 'CTRW' },
  { name: 'Forum Mall Koramangala', stationCode: 'BTML' },
  { name: 'Central Silk Board Junction', stationCode: 'CNRK' },
  { name: 'Phoenix Marketcity Mall', stationCode: 'MSTH' },
  { name: 'M.G. Road Boulevard / UB City', stationCode: 'MGRD' },
];

// @route   GET /api/location/autocomplete
// @desc    Get autocomplete suggestions for address search
// @access  Public
router.get('/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input) {
    return res.status(400).json({ message: 'Input query parameter is required' });
  }

  const apiKey = req.headers['x-google-maps-key'] || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.log('No Google Maps key found. Using local fallback search for autocomplete.');
    return handleLocalAutocomplete(input, res);
  }

  try {
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1'
      },
      body: JSON.stringify({
        input: input,
        locationBias: {
          circle: {
            center: {
              latitude: 12.9716,
              longitude: 77.5946
            },
            radius: 50000.0 // 50km around Bangalore
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Places autocomplete error status ${response.status}: ${errText}. Using fallback.`);
      return handleLocalAutocomplete(input, res);
    }

    const data = await response.json();
    const suggestions = (data.suggestions || []).map(s => ({
      description: s.placePrediction.text.text,
      placeId: s.placePrediction.placeId,
      type: 'google'
    }));

    return res.json(suggestions);
  } catch (error) {
    console.error('Autocomplete fetch error:', error);
    return handleLocalAutocomplete(input, res);
  }
});

const handleLocalAutocomplete = async (input, res) => {
  try {
    const query = input.toLowerCase();
    const stations = await Station.find({});

    const matchedStations = stations
      .filter(s => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query))
      .map(s => ({
        description: `${s.name} Metro Station (${s.line} Line)`,
        lat: s.coordinates.lat,
        lng: s.coordinates.lng,
        type: 'station'
      }));

    const matchedLandmarks = LANDMARKS
      .filter(l => l.name.toLowerCase().includes(query))
      .map(l => {
        const station = stations.find(s => s.code === l.stationCode);
        return {
          description: `${l.name} (Landmark)`,
          lat: station ? station.coordinates.lat : 12.9716,
          lng: station ? station.coordinates.lng : 77.5946,
          type: 'landmark'
        };
      });

    const suggestions = [...matchedStations, ...matchedLandmarks].slice(0, 6);
    return res.json(suggestions);
  } catch (err) {
    console.error('Local fallback search error:', err);
    return res.status(500).json({ message: 'Error in local search', error: err.message });
  }
};

// @route   GET /api/location/geocode
// @desc    Geocode an address or place ID to coordinates
// @access  Public
router.get('/geocode', async (req, res) => {
  const { address, placeId } = req.query;
  if (!address && !placeId) {
    return res.status(400).json({ message: 'Either address or placeId parameter is required' });
  }

  const apiKey = req.headers['x-google-maps-key'] || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ message: 'Google Maps API key is required for Geocoding service.' });
  }

  try {
    let url = 'https://maps.googleapis.com/maps/api/geocode/json';
    if (placeId) {
      url += `?place_id=${placeId}&key=${apiKey}`;
    } else {
      url += `?address=${encodeURIComponent(address)}&key=${apiKey}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ message: 'Geocoding service error' });
    }

    const data = await response.json();
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return res.status(404).json({ message: `No geocoding results found. Status: ${data.status}` });
    }

    const result = data.results[0];
    const loc = result.geometry.location;
    return res.json({
      address: result.formatted_address,
      lat: loc.lat,
      lng: loc.lng
    });
  } catch (error) {
    console.error('Geocoding fetch error:', error);
    return res.status(500).json({ message: 'Geocoding API fetch error', error: error.message });
  }
});

module.exports = router;
