const express = require('express');
const router = express.Router();
const Station = require('../models/Station');
const { findRoute } = require('../utils/dijkstra');
const { exec } = require('child_process');

// Haversine straight-line distance in km
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 +
            Math.cos(lat1 * p) * Math.cos(lat2 * p) *
            (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

// Predict fare using the trained python model
const predictFare = (distance, hour) => {
  return new Promise((resolve) => {
    // Escape and run Python subprocess
    const command = `python3 csv/predict.py --distance ${parseFloat(distance)} --hour ${parseInt(hour)}`;
    
    exec(command, { cwd: '/Users/tanmaymac/Project/project_major' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Fare prediction failed: ${stderr || error.message}. Using fallback.`);
        // Fallback formula matching typical taxi pricing: ₹15 base + ₹12/km
        const fallback = 15 + distance * 12;
        return resolve(parseFloat(fallback.toFixed(2)));
      }
      const val = parseFloat(stdout.trim());
      if (isNaN(val)) {
        const fallback = 15 + distance * 12;
        return resolve(fallback);
      }
      resolve(val);
    });
  });
};

// Query Google Maps Routes API (or fall back to simulated driving)
const getDrivingRoute = async (fromLat, fromLng, toLat, toLng, apiKey) => {
  if (!apiKey) {
    // Log once and use fallback
    return getGeometricFallbackRoute(fromLat, fromLng, toLat, toLng);
  }

  try {
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1'
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: parseFloat(fromLat),
              longitude: parseFloat(fromLng)
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: parseFloat(toLat),
              longitude: parseFloat(toLng)
            }
          }
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
      })
    });

    if (!response.ok) {
      console.warn(`Routes API responded with status ${response.status}. Using fallback.`);
      return getGeometricFallbackRoute(fromLat, fromLng, toLat, toLng);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return getGeometricFallbackRoute(fromLat, fromLng, toLat, toLng);
    }

    const route = data.routes[0];
    const distanceKm = route.distanceMeters / 1000;
    const durationSeconds = parseFloat(route.duration.replace('s', ''));
    const durationMinutes = Math.ceil(durationSeconds / 60);

    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMinutes
    };
  } catch (err) {
    console.error(`Routes API fetch failed: ${err.message}. Using fallback.`);
    return getGeometricFallbackRoute(fromLat, fromLng, toLat, toLng);
  }
};

const getGeometricFallbackRoute = (lat1, lng1, lat2, lng2) => {
  const straightLine = getHaversineDistance(lat1, lng1, lat2, lng2);
  const distanceKm = parseFloat((straightLine * 1.3).toFixed(2));
  // Bangalore average vehicle speed: 20 km/h
  const durationMinutes = Math.ceil((distanceKm / 20) * 60);
  return {
    distanceKm,
    durationMinutes
  };
};

router.post('/', async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
      return res.status(400).json({ message: 'Missing source or destination coordinates' });
    }

    const apiKey = req.headers['x-google-maps-key'] || process.env.GOOGLE_MAPS_API_KEY;

    // Load all stations to search closest and run Dijkstra
    const stations = await Station.find({});
    if (!stations || stations.length === 0) {
      return res.status(500).json({ message: 'Metro stations database is empty' });
    }

    // Get current hour of the day for fare predictions
    const currentHour = new Date().getHours();

    // 1. Locate closest start and end stations
    let minStartDist = Infinity;
    let startStation = null;
    let minEndDist = Infinity;
    let endStation = null;

    stations.forEach((s) => {
      const dStart = getHaversineDistance(from.lat, from.lng, s.coordinates.lat, s.coordinates.lng);
      if (dStart < minStartDist) {
        minStartDist = dStart;
        startStation = s;
      }
      const dEnd = getHaversineDistance(to.lat, to.lng, s.coordinates.lat, s.coordinates.lng);
      if (dEnd < minEndDist) {
        minEndDist = dEnd;
        endStation = s;
      }
    });

    // 2. Pure Metro Route
    // Walk to start station + Metro + Walk to final dest
    const metroResult = findRoute(stations, startStation._id, endStation._id, 'travelTime');
    const walkToStartKm = minStartDist;
    const walkToStartTime = Math.ceil((walkToStartKm / 4.5) * 60); // 4.5 km/h walk speed
    
    const walkFromEndKm = minEndDist;
    const walkFromEndTime = Math.ceil((walkFromEndKm / 4.5) * 60);

    const metroTotalTime = walkToStartTime + metroResult.travelTime + walkFromEndTime;
    const metroTotalCost = metroResult.fare;

    const pureMetro = {
      startStation: startStation.name,
      endStation: endStation.name,
      walkToStartKm: parseFloat(walkToStartKm.toFixed(2)),
      walkToStartTimeMinutes: walkToStartTime,
      walkFromEndKm: parseFloat(walkFromEndKm.toFixed(2)),
      walkFromEndTimeMinutes: walkFromEndTime,
      metroTimeMinutes: metroResult.travelTime,
      metroCostRupees: metroResult.fare,
      totalTimeMinutes: metroTotalTime,
      totalCostRupees: metroTotalCost,
      path: metroResult.path,
    };

    // 3. Pure Uber Route
    const uberRoute = await getDrivingRoute(from.lat, from.lng, to.lat, to.lng, apiKey);
    const uberCost = await predictFare(uberRoute.distanceKm, currentHour);

    const pureUber = {
      distanceKm: uberRoute.distanceKm,
      timeMinutes: uberRoute.durationMinutes,
      costRupees: uberCost,
    };

    // 4. Hybrid Route Analysis
    // We try getting off at each intermediate station along the metro route, and taking a cab from there.
    const hybridCandidates = [];

    // Skip the loop if it's the exact same station
    if (startStation.code !== endStation.code) {
      for (const sNode of metroResult.path) {
        // Trivial case: If it is the start station, it is equivalent to pure Uber (except walk to start)
        // If it is the end station, it is equivalent to pure Metro
        
        // Calculate metro path from startStation to sNode
        const partialMetro = findRoute(stations, startStation._id, sNode._id, 'travelTime');
        if (!partialMetro) continue;

        // Calculate cab route from sNode to target coordinates
        const cabRoute = await getDrivingRoute(sNode.coordinates.lat, sNode.coordinates.lng, to.lat, to.lng, apiKey);
        const cabCost = await predictFare(cabRoute.distanceKm, currentHour);

        // Walk to start + Metro to sNode + 5 min buffer to get a cab + Driving time
        const totalTime = walkToStartTime + partialMetro.travelTime + 5 + cabRoute.durationMinutes;
        const totalCost = partialMetro.fare + cabCost;

        hybridCandidates.push({
          exitStation: {
            name: sNode.name,
            code: sNode.code,
            line: sNode.line,
            coordinates: sNode.coordinates
          },
          metroFare: partialMetro.fare,
          metroTimeMinutes: partialMetro.travelTime,
          cabDistanceKm: cabRoute.distanceKm,
          cabTimeMinutes: cabRoute.durationMinutes,
          cabFare: cabCost,
          totalTimeMinutes: totalTime,
          totalCostRupees: totalCost,
        });
      }
    }

    // Sort hybrid candidates to find the best compromise
    // Best hybrid is the one that minimizes time while being significantly cheaper than pure Uber,
    // or saves significant time over pure Metro.
    let bestHybrid = null;
    if (hybridCandidates.length > 0) {
      // Find candidate that saves the most time compared to pure metro,
      // but is cheaper than pure Uber.
      // Or simply sort by a weighted score or find the one with the minimum time that costs less than Uber.
      const validHybrids = hybridCandidates.filter(
        (c) => c.totalCostRupees < pureUber.costRupees && c.totalTimeMinutes < pureMetro.totalTimeMinutes
      );

      if (validHybrids.length > 0) {
        // Sort by fastest
        validHybrids.sort((a, b) => a.totalTimeMinutes - b.totalTimeMinutes);
        bestHybrid = validHybrids[0];
      } else {
        // If none is cheaper and faster at the same time, pick the fastest hybrid overall (excluding trivial endpoints)
        hybridCandidates.sort((a, b) => a.totalTimeMinutes - b.totalTimeMinutes);
        bestHybrid = hybridCandidates[Math.floor(hybridCandidates.length / 2)] || null;
      }
    }

    // 5. Generate recommendations for "cheaper" vs "faster"
    let recommendationFaster = {};
    let recommendationCheaper = {};

    // For Faster:
    const times = [
      { type: 'metro', time: pureMetro.totalTimeMinutes, cost: pureMetro.totalCostRupees },
      { type: 'uber', time: pureUber.timeMinutes, cost: pureUber.costRupees },
    ];
    if (bestHybrid) {
      times.push({ type: 'hybrid', time: bestHybrid.totalTimeMinutes, cost: bestHybrid.totalCostRupees });
    }
    times.sort((a, b) => a.time - b.time);
    const fastestOption = times[0];

    if (fastestOption.type === 'uber') {
      recommendationFaster = {
        type: 'uber',
        title: 'Direct Uber Cab',
        reason: `Direct Uber is the fastest option. You will reach in ${pureUber.timeMinutes} mins, saving ${pureMetro.totalTimeMinutes - pureUber.timeMinutes} mins compared to Metro. Cost: ₹${pureUber.costRupees.toFixed(2)}.`
      };
    } else if (fastestOption.type === 'hybrid' && bestHybrid) {
      recommendationFaster = {
        type: 'hybrid',
        title: `Hybrid (Metro + Cab via ${bestHybrid.exitStation.name})`,
        reason: `Best speed compromise! Take Metro to ${bestHybrid.exitStation.name}, then board an Uber for the remaining ${bestHybrid.cabDistanceKm} km. You save ${pureMetro.totalTimeMinutes - bestHybrid.totalTimeMinutes} mins compared to pure Metro and save ₹${(pureUber.costRupees - bestHybrid.totalCostRupees).toFixed(2)} compared to direct Uber!`
      };
    } else {
      recommendationFaster = {
        type: 'metro',
        title: 'Namma Metro',
        reason: `Pure Metro is the fastest option here due to heavy driving detours/traffic, taking ${pureMetro.totalTimeMinutes} mins, and is also the cheapest (₹${pureMetro.totalCostRupees}).`
      };
    }

    // For Cheaper:
    // Metro is almost always cheaper. If hybrid exists and is faster than metro and relatively cheap, suggest it as a smart upgrade.
    recommendationCheaper = {
      type: 'metro',
      title: 'Namma Metro',
      reason: `At just ₹${pureMetro.totalCostRupees}, pure Metro is by far the cheapest option, taking ${pureMetro.totalTimeMinutes} mins.`
    };

    if (bestHybrid && (bestHybrid.totalTimeMinutes < pureMetro.totalTimeMinutes - 15) && (bestHybrid.totalCostRupees < pureMetro.totalCostRupees + 200)) {
      recommendationCheaper = {
        type: 'hybrid',
        title: `Smart Hybrid Upgrade (via ${bestHybrid.exitStation.name})`,
        reason: `For just ₹${(bestHybrid.totalCostRupees - pureMetro.totalCostRupees).toFixed(2)} more, you can take a hybrid route (cab from ${bestHybrid.exitStation.name}) and cut down your travel time by ${pureMetro.totalTimeMinutes - bestHybrid.totalTimeMinutes} mins!`
      };
    }

    res.json({
      pureMetro,
      pureUber,
      hybrid: bestHybrid,
      recommendations: {
        faster: recommendationFaster,
        cheaper: recommendationCheaper,
      }
    });

  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ message: 'Internal server error calculating route comparisons' });
  }
});

module.exports = router;
