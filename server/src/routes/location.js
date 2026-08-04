const express = require('express');
const router = express.Router();
const Station = require('../models/Station');

// Helper to query OpenStreetMap Nominatim API restricted to Bangalore bounds, with country-wide fallback
const queryOSMNominatim = async (query) => {
  try {
    // 1. Try bounded search first (strictly limited to Bangalore box: west=77.3, south=12.7, east=77.9, north=13.2)
    const boundedUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&countrycodes=in&viewbox=77.3,12.7,77.9,13.2&bounded=1`;
    const response = await fetch(boundedUrl, {
      headers: {
        'User-Agent': 'CommuteIQ/1.0.0 (contact@commuteiq.local)'
      }
    });

    if (response.ok) {
      const data = await response.json();
      // If we got a good number of results, return them
      if (data && data.length >= 3) {
        return data.map((item) => ({
          description: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: 'osm'
        }));
      }

      // 2. Secondary fallback lookup without the strict bounding box limit (bounded=1 omitted)
      // but still biased to Bangalore viewbox and restricted to India
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&countrycodes=in&viewbox=77.3,12.7,77.9,13.2`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'CommuteIQ/1.0.0 (contact@commuteiq.local)'
        }
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const combined = [...data, ...fallbackData];
        
        // Deduplicate results by display_name
        const unique = [];
        const seen = new Set();
        for (const item of combined) {
          if (!seen.has(item.display_name)) {
            seen.add(item.display_name);
            unique.push(item);
          }
        }
        return unique.map((item) => ({
          description: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: 'osm'
        }));
      }
    }
  } catch (err) {
    console.error('OSM Nominatim query failed:', err.message);
  }
  return [];
};

// @route   GET /api/location/autocomplete
// @desc    Get autocomplete suggestions for address search
// @access  Public
router.get('/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input) {
    return res.status(400).json({ message: 'Input query parameter is required' });
  }

  try {
    // 1. Check local station name matches first
    const stations = await Station.find({});
    const query = input.toLowerCase();
    const matchedStations = stations
      .filter(s => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query))
      .map(s => ({
        description: `${s.name} Metro Station (${s.line} Line)`,
        lat: s.coordinates.lat,
        lng: s.coordinates.lng,
        type: 'station'
      }));

    // 2. Query OSM Nominatim for general Bangalore addresses (with fallback)
    const osmSuggestions = await queryOSMNominatim(input);

    // Merge both lists
    const suggestions = [...matchedStations, ...osmSuggestions].slice(0, 10);
    return res.json(suggestions);
  } catch (error) {
    console.error('Autocomplete fetch error:', error);
    return res.status(500).json({ message: 'Error fetching suggestions', error: error.message });
  }
});

// @route   GET /api/location/geocode
// @desc    Geocode an address or place ID to coordinates
// @access  Public
router.get('/geocode', async (req, res) => {
  const { address, placeId } = req.query;
  if (!address && !placeId) {
    return res.status(400).json({ message: 'Either address or placeId parameter is required' });
  }

  try {
    // 1. Try OSM Nominatim first for free geocoding (restricted to India, biased to Bangalore)
    if (address) {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in&viewbox=77.3,12.7,77.9,13.2`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CommuteIQ/1.0.0 (contact@commuteiq.local)'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const first = data[0];
          return res.json({
            address: first.display_name,
            lat: parseFloat(first.lat),
            lng: parseFloat(first.lon)
          });
        }
      }
    }

    // 2. Fallback to Google Maps if OSM yields nothing
    const apiKey = req.headers['x-google-maps-key'] || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(404).json({ message: 'No geocoding results found via OSM Nominatim and no Google Maps key configured' });
    }

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

// @route   GET /api/location/reverse
// @desc    Reverse geocode coordinates to an address
// @access  Public
router.get('/reverse', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ message: 'lat and lng parameters are required' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${parseFloat(lat)}&lon=${parseFloat(lng)}&format=json`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CommuteIQ/1.0.0 (contact@commuteiq.local)'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        address: data.display_name || `GPS Location`,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      });
    }
    return res.status(400).json({ message: 'Reverse geocoding failed' });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return res.status(500).json({ message: 'Reverse geocoding error', error: error.message });
  }
});

module.exports = router;
