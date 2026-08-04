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

// Fetch road-following route from OSRM
const getDrivingRoute = async (fromLat, fromLng, toLat, toLng, apiKey) => {
  try {
    // Query public OSRM server (long,lat order)
    const url = `https://router.project-osrm.org/route/v1/driving/${parseFloat(fromLng)},${parseFloat(fromLat)};${parseFloat(toLng)},${parseFloat(toLat)}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CommuteIQ/1.0.0 (contact@commuteiq.local)'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const durationMinutes = Math.ceil(route.duration / 60);
        // OSRM coordinates are [longitude, latitude] -> convert to [latitude, longitude]
        const path = (route.geometry.coordinates || []).map(coords => [coords[1], coords[0]]);

        return {
          distanceKm: parseFloat(distanceKm.toFixed(2)),
          durationMinutes,
          path
        };
      }
    }
  } catch (err) {
    console.error(`OSRM route fetch failed: ${err.message}. Using fallback.`);
  }

  // Fallback to geometric straight line
  return getGeometricFallbackRoute(fromLat, fromLng, toLat, toLng);
};

const getGeometricFallbackRoute = (lat1, lng1, lat2, lng2) => {
  const straightLine = getHaversineDistance(lat1, lng1, lat2, lng2);
  const distanceKm = parseFloat((straightLine * 1.3).toFixed(2));
  // Bangalore average vehicle speed: 20 km/h
  const durationMinutes = Math.ceil((distanceKm / 20) * 60);
  return {
    distanceKm,
    durationMinutes,
    path: [
      [parseFloat(lat1), parseFloat(lng1)],
      [parseFloat(lat2), parseFloat(lng2)]
    ]
  };
};

const calculateComparisonLogic = async (from, to, apiKey) => {
  // Load all stations to search closest and run Dijkstra
  const stations = await Station.find({});
  if (!stations || stations.length === 0) {
    throw new Error('Metro stations database is empty');
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
    path: uberRoute.path,
  };

  // 4. Hybrid Route Analysis
  // We try getting off at each intermediate station along the metro route, and taking a cab from there.
  const hybridCandidates = [];

  // Skip the loop if it's the exact same station
  if (startStation.code !== endStation.code) {
    for (const sNode of metroResult.path) {
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
        path: cabRoute.path,
      });
    }
  }

  // Sort hybrid candidates to find the best compromise
  let bestHybrid = null;
  if (hybridCandidates.length > 0) {
    const validHybrids = hybridCandidates.filter(
      (c) => c.totalCostRupees < pureUber.costRupees && c.totalTimeMinutes < pureMetro.totalTimeMinutes
    );

    if (validHybrids.length > 0) {
      validHybrids.sort((a, b) => a.totalTimeMinutes - b.totalTimeMinutes);
      bestHybrid = validHybrids[0];
    } else {
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

  return {
    pureMetro,
    pureUber,
    hybrid: bestHybrid,
    recommendations: {
      faster: recommendationFaster,
      cheaper: recommendationCheaper,
    }
  };
};

router.post('/', async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
      return res.status(400).json({ message: 'Missing source or destination coordinates' });
    }

    const apiKey = req.headers['x-google-maps-key'] || process.env.GOOGLE_MAPS_API_KEY;
    const result = await calculateComparisonLogic(from, to, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ message: error.message || 'Internal server error calculating route comparisons' });
  }
});

module.exports = {
  router,
  calculateComparisonLogic,
  queryOSMNominatim: null // we will import this dynamically or export from location
};

