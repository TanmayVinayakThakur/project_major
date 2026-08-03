/**
 * Dijkstra's shortest path algorithm for Bangalore Metro (Namma Metro) network
 */

const findRoute = (stations, startIdOrCode, endIdOrCode, criteria = 'distance') => {
  // 1. Resolve start and end stations (can be Mongo ID or Station Code)
  const startStation = stations.find(
    (s) => s._id.toString() === startIdOrCode.toString() || s.code === startIdOrCode.toString().toUpperCase()
  );
  const endStation = stations.find(
    (s) => s._id.toString() === endIdOrCode.toString() || s.code === endIdOrCode.toString().toUpperCase()
  );

  if (!startStation || !endStation) {
    throw new Error('Start or destination station not found');
  }

  const startId = startStation._id.toString();
  const endId = endStation._id.toString();

  // If start is the same as end
  if (startId === endId) {
    return {
      path: [startStation],
      totalDistance: 0,
      travelTime: 0,
      fare: 0,
      interchanges: [],
    };
  }

  // 2. Setup Dijkstra data structures
  const distances = {};
  const previous = {};
  const queue = [];

  stations.forEach((station) => {
    const id = station._id.toString();
    distances[id] = Infinity;
    previous[id] = null;
    queue.push(id);
  });

  distances[startId] = 0;

  // 3. Main search loop
  while (queue.length > 0) {
    // Find node with minimum distance value in current priority queue
    let minIndex = 0;
    for (let i = 1; i < queue.length; i++) {
      if (distances[queue[i]] < distances[queue[minIndex]]) {
        minIndex = i;
      }
    }

    const u = queue[minIndex];
    queue.splice(minIndex, 1); // remove from queue

    if (u === endId) break; // reached destination
    if (distances[u] === Infinity) break; // remaining nodes are unreachable

    const uStation = stations.find((s) => s._id.toString() === u);
    if (!uStation) continue;

    // Process neighbor connections
    uStation.connections.forEach((conn) => {
      const neighborId = conn.stationId.toString();
      
      // Only process neighbors still in the queue
      if (!queue.includes(neighborId)) return;

      // Select weighting criteria
      const weight = criteria === 'travelTime' ? conn.travelTime : conn.distance;
      const alt = distances[u] + weight;

      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = u;
      }
    });
  }

  // 4. Reconstruct path from end to start
  const pathIds = [];
  let curr = endId;
  while (curr !== null) {
    pathIds.unshift(curr);
    curr = previous[curr];
  }

  // Path check
  if (pathIds[0] !== startId) {
    return null; // unreachable
  }

  // 5. Gather journey statistics
  const pathStations = pathIds.map((id) => stations.find((s) => s._id.toString() === id));
  
  let totalDistance = 0;
  let totalTime = 0;
  const interchanges = [];

  for (let i = 0; i < pathStations.length - 1; i++) {
    const s1 = pathStations[i];
    const s2 = pathStations[i + 1];

    // Find the weight of the connection between node i and i+1
    const connection = s1.connections.find(
      (c) => c.stationId.toString() === s2._id.toString()
    );
    
    if (connection) {
      totalDistance += connection.distance;
      totalTime += connection.travelTime;
    }

    // Detect interchange (line switch)
    // Interchange occurs when line colors differ and it's a physical transfer
    if (s1.line !== s2.line) {
      interchanges.push({
        station: s1.name,
        fromLine: s1.line,
        toLine: s2.line,
      });
    }
  }

  // 6. Calculate BMRCL-style fare
  // Base fare: ₹15 for up to 2 km
  // Additional distance: ₹5 per km
  // Max fare: ₹60
  let fare = 15;
  if (totalDistance > 2) {
    fare += Math.ceil(totalDistance - 2) * 5;
  }
  if (fare > 60) {
    fare = 60;
  }

  return {
    path: pathStations,
    totalDistance: parseFloat(totalDistance.toFixed(2)),
    travelTime: Math.ceil(totalTime),
    fare,
    interchanges,
  };
};

module.exports = { findRoute };
