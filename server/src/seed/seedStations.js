/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NammaRoute — Bangalore Metro Station Seed Script           ║
 * ║  Seeds Purple Line, Green Line, and Yellow Line stations     ║
 * ║  with real GPS coordinates and realistic distance/time data  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Run:  npm run seed
 *   or: node src/seed/seedStations.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const Station = require('../models/Station');

// ──────────────────────────────────────────────────────────────
// RAW STATION DATA
// Each entry: [code, name, line, lat, lng, isInterchange]
// ──────────────────────────────────────────────────────────────

const PURPLE_LINE_STATIONS = [
  ['CLGT', 'Challaghatta',                          'Purple', 12.9713, 77.5234, false],
  ['ASOK', 'Attiguppe',                              'Purple', 12.9696, 77.5370, false],
  ['VLKY', 'Vijayanagar',                            'Purple', 12.9710, 77.5430, false],
  ['HSPT', 'Hosahalli',                              'Purple', 12.9588, 77.5380, false],
  ['MYRD', 'Mysuru Road',                            'Purple', 12.9598, 77.5479, false],
  ['DPLY', 'Deepanjali Nagar',                       'Purple', 12.9522, 77.5357, false],
  ['GORG', 'Goraguntepalya',                         'Purple', 12.9618, 77.5560, false],
  ['MGFM', 'Magadi Road',                            'Purple', 12.9720, 77.5540, false],
  ['CTRW', 'Krantivira Sangolli Rayanna (City Rly)', 'Purple', 12.9772, 77.5700, false],
  ['MSJP', 'Nadaprabhu Kempegowda (Majestic)',       'Purple', 12.9767, 77.5713, true],
  ['VSVY', 'Sir M. Visvesvaraya (Vidhana Soudha)',   'Purple', 12.9789, 77.5800, false],
  ['CPBK', 'Cubbon Park',                            'Purple', 12.9795, 77.5870, false],
  ['MGRD', 'MG Road',                                'Purple', 12.9756, 77.5960, false],
  ['TRNY', 'Trinity',                                'Purple', 12.9720, 77.6010, false],
  ['HLSR', 'Halasuru',                               'Purple', 12.9816, 77.6080, false],
  ['INDG', 'Indiranagar',                            'Purple', 12.9784, 77.6408, false],
  ['SVRD', 'Swami Vivekananda Road',                 'Purple', 12.9850, 77.6540, false],
  ['BYPL', 'Baiyappanahalli',                        'Purple', 12.9920, 77.6690, false],
  ['BSKM', 'Benniganahalli',                         'Purple', 12.9980, 77.6810, false],
  ['KRPM', 'Krishnarajapuram',                       'Purple', 13.0010, 77.6940, false],
  ['MSTH', 'Mahadevapura',                           'Purple', 12.9940, 77.7100, false],
  ['GAUR', 'Garudacharpalya',                        'Purple', 12.9930, 77.7230, false],
  ['VTHL', 'Hoodi',                                  'Purple', 12.9940, 77.7360, false],
  ['WHTF', 'Whitefield (Kadugodi)',                  'Purple', 12.9942, 77.7560, false],
];

const GREEN_LINE_STATIONS = [
  ['MDVR', 'Madavara',                               'Green', 13.0920, 77.5080, false],
  ['CIGN', 'Chikkabidarakallu',                      'Green', 13.0800, 77.5100, false],
  ['NGSD', 'Nagasandra',                              'Green', 13.0690, 77.5150, false],
  ['DSHL', 'Dasarahalli',                             'Green', 13.0580, 77.5180, false],
  ['JLHL', 'Jalahalli',                               'Green', 13.0460, 77.5200, false],
  ['PYIN', 'Peenya Industry',                         'Green', 13.0350, 77.5210, false],
  ['PYNY', 'Peenya',                                  'Green', 13.0280, 77.5220, false],
  ['YWPR', 'Yeshwanthpur',                            'Green', 13.0220, 77.5370, false],
  ['SDSF', 'Sandal Soap Factory',                     'Green', 13.0130, 77.5420, false],
  ['RJNR', 'Rajajinagar',                             'Green', 13.0060, 77.5490, false],
  ['MSGH', 'Mahalakshmi',                             'Green', 12.9980, 77.5530, false],
  ['SRPR', 'Srirampura',                              'Green', 12.9930, 77.5590, false],
  ['SMPG', 'Sampige Road',                            'Green', 12.9880, 77.5650, false],
  ['MSJG', 'Nadaprabhu Kempegowda (Majestic)',        'Green', 12.9767, 77.5713, true],
  ['CKPT', 'Chickpete',                               'Green', 12.9720, 77.5750, false],
  ['KRMK', 'K.R. Market',                             'Green', 12.9660, 77.5770, false],
  ['NTLC', 'National College',                        'Green', 12.9590, 77.5730, false],
  ['LBGH', 'Lalbagh',                                 'Green', 12.9510, 77.5780, false],
  ['SECC', 'South End Circle',                        'Green', 12.9420, 77.5760, false],
  ['JYNR', 'Jayanagar',                               'Green', 12.9340, 77.5790, false],
  ['RVRD', 'R.V. Road',                               'Green', 12.9260, 77.5750, false],
  ['BNSK', 'Banashankari',                             'Green', 12.9170, 77.5730, false],
  ['JPNR', 'J.P. Nagar',                              'Green', 12.9070, 77.5710, false],
  ['YLCH', 'Yelachenahalli',                           'Green', 12.8960, 77.5700, false],
  ['KNKT', 'Konanakunte Cross',                        'Green', 12.8850, 77.5680, false],
  ['SILK', 'Silk Institute',                           'Green', 12.8740, 77.5670, false],
];

const YELLOW_LINE_STATIONS = [
  ['RVRY', 'R.V. Road (Yellow)',                       'Yellow', 12.9260, 77.5750, true],
  ['RGRD', 'Ragigudda',                                'Yellow', 12.9200, 77.5890, false],
  ['JKNR', 'Jayadeva Hospital',                        'Yellow', 12.9170, 77.5980, false],
  ['BTML', 'BTM Layout',                               'Yellow', 12.9160, 77.6100, false],
  ['SLKB', 'Silk Board',                               'Yellow', 12.9170, 77.6230, false],
  ['HSLR', 'HSR Layout',                               'Yellow', 12.9140, 77.6380, false],
  ['ITYE', 'Iblur',                                    'Yellow', 12.9120, 77.6490, false],
  ['BLDK', 'Bellandur',                                'Yellow', 12.9280, 77.6590, false],
  ['EKTA', 'Ekalavya (Outer Ring Road)',               'Yellow', 12.9340, 77.6710, false],
  ['CNRK', 'Central Silk Board Junction',              'Yellow', 12.9310, 77.6800, false],
  ['BMSD', 'Bommasandra',                              'Yellow', 12.9080, 77.6930, false],
];

// ──────────────────────────────────────────────────────────────
// ADJACENCY DEFINITIONS
// Each entry: [fromCode, toCode, distanceKm, travelTimeMin]
// Distances are realistic mock values based on BMRCL data
// ──────────────────────────────────────────────────────────────

const PURPLE_ADJACENCY = [
  ['CLGT', 'ASOK', 1.5, 2],
  ['ASOK', 'VLKY', 0.9, 2],
  ['VLKY', 'HSPT', 1.6, 2],
  ['HSPT', 'MYRD', 1.2, 2],
  ['MYRD', 'DPLY', 1.5, 2],
  ['DPLY', 'GORG', 1.8, 3],
  ['GORG', 'MGFM', 1.3, 2],
  ['MGFM', 'CTRW', 2.0, 3],
  ['CTRW', 'MSJP', 0.5, 1],
  ['MSJP', 'VSVY', 1.0, 2],
  ['VSVY', 'CPBK', 0.8, 2],
  ['CPBK', 'MGRD', 1.0, 2],
  ['MGRD', 'TRNY', 0.7, 1],
  ['TRNY', 'HLSR', 1.2, 2],
  ['HLSR', 'INDG', 3.5, 4],
  ['INDG', 'SVRD', 1.5, 2],
  ['SVRD', 'BYPL', 1.8, 3],
  ['BYPL', 'BSKM', 1.5, 2],
  ['BSKM', 'KRPM', 1.6, 2],
  ['KRPM', 'MSTH', 2.0, 3],
  ['MSTH', 'GAUR', 1.5, 2],
  ['GAUR', 'VTHL', 1.5, 2],
  ['VTHL', 'WHTF', 2.2, 3],
];

const GREEN_ADJACENCY = [
  ['MDVR', 'CIGN', 1.5, 2],
  ['CIGN', 'NGSD', 1.3, 2],
  ['NGSD', 'DSHL', 1.4, 2],
  ['DSHL', 'JLHL', 1.4, 2],
  ['JLHL', 'PYIN', 1.3, 2],
  ['PYIN', 'PYNY', 0.8, 1],
  ['PYNY', 'YWPR', 1.8, 3],
  ['YWPR', 'SDSF', 1.2, 2],
  ['SDSF', 'RJNR', 1.0, 2],
  ['RJNR', 'MSGH', 1.0, 2],
  ['MSGH', 'SRPR', 0.8, 1],
  ['SRPR', 'SMPG', 0.8, 1],
  ['SMPG', 'MSJG', 1.3, 2],
  ['MSJG', 'CKPT', 0.7, 1],
  ['CKPT', 'KRMK', 0.8, 1],
  ['KRMK', 'NTLC', 0.9, 2],
  ['NTLC', 'LBGH', 1.0, 2],
  ['LBGH', 'SECC', 1.1, 2],
  ['SECC', 'JYNR', 1.0, 2],
  ['JYNR', 'RVRD', 1.0, 2],
  ['RVRD', 'BNSK', 1.1, 2],
  ['BNSK', 'JPNR', 1.2, 2],
  ['JPNR', 'YLCH', 1.3, 2],
  ['YLCH', 'KNKT', 1.3, 2],
  ['KNKT', 'SILK', 1.3, 2],
];

const YELLOW_ADJACENCY = [
  ['RVRY', 'RGRD', 1.5, 2],
  ['RGRD', 'JKNR', 1.2, 2],
  ['JKNR', 'BTML', 1.4, 2],
  ['BTML', 'SLKB', 1.5, 2],
  ['SLKB', 'HSLR', 1.8, 3],
  ['HSLR', 'ITYE', 1.3, 2],
  ['ITYE', 'BLDK', 2.0, 3],
  ['BLDK', 'EKTA', 1.4, 2],
  ['EKTA', 'CNRK', 1.2, 2],
  ['CNRK', 'BMSD', 2.8, 4],
];

// ──────────────────────────────────────────────────────────────
// INTERCHANGE CONNECTIONS
// These connect the same physical station across different lines
// ──────────────────────────────────────────────────────────────

const INTERCHANGE_CONNECTIONS = [
  // Majestic: Purple ↔ Green
  ['MSJP', 'MSJG', 0.2, 3],
  // R.V. Road: Green ↔ Yellow
  ['RVRD', 'RVRY', 0.2, 3],
];

// ──────────────────────────────────────────────────────────────
// SEED FUNCTION
// ──────────────────────────────────────────────────────────────

async function seedStations() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nammaroute';

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing stations
    await Station.deleteMany({});
    console.log('🗑️  Cleared existing stations');

    // ── Step 1: Create all station documents (without connections) ──
    const allStationData = [
      ...PURPLE_LINE_STATIONS,
      ...GREEN_LINE_STATIONS,
      ...YELLOW_LINE_STATIONS,
    ];

    const stationMap = new Map(); // code → Station document

    for (const [code, name, line, lat, lng, isInterchange] of allStationData) {
      const station = await Station.create({
        name,
        code,
        line,
        coordinates: { lat, lng },
        isInterchange,
        connections: [],
      });
      stationMap.set(code, station);
    }

    console.log(`📍 Created ${stationMap.size} stations`);

    // ── Step 2: Build all connections (bidirectional) ──
    const allAdjacency = [
      ...PURPLE_ADJACENCY,
      ...GREEN_ADJACENCY,
      ...YELLOW_ADJACENCY,
      ...INTERCHANGE_CONNECTIONS,
    ];

    let connectionCount = 0;

    for (const [fromCode, toCode, distance, travelTime] of allAdjacency) {
      const fromStation = stationMap.get(fromCode);
      const toStation = stationMap.get(toCode);

      if (!fromStation || !toStation) {
        console.warn(`⚠️  Skipping connection: ${fromCode} → ${toCode} (station not found)`);
        continue;
      }

      // Add bidirectional connection
      fromStation.connections.push({
        stationId: toStation._id,
        distance,
        travelTime,
      });

      toStation.connections.push({
        stationId: fromStation._id,
        distance,
        travelTime,
      });

      connectionCount++;
    }

    // Save all updated stations
    for (const station of stationMap.values()) {
      await station.save();
    }

    console.log(`🔗 Created ${connectionCount} bidirectional connections`);

    // ── Step 3: Print summary ──
    console.log('\n══════════════════════════════════════════════');
    console.log('  NammaRoute Database Seeded Successfully! 🚇');
    console.log('══════════════════════════════════════════════');
    console.log(`  Purple Line: ${PURPLE_LINE_STATIONS.length} stations`);
    console.log(`  Green Line:  ${GREEN_LINE_STATIONS.length} stations`);
    console.log(`  Yellow Line: ${YELLOW_LINE_STATIONS.length} stations`);
    console.log(`  Total:       ${stationMap.size} stations`);
    console.log(`  Connections: ${connectionCount} edges (bidirectional)`);
    console.log('  Interchanges:');
    console.log('    • Majestic (Purple ↔ Green)');
    console.log('    • R.V. Road (Green ↔ Yellow)');
    console.log('══════════════════════════════════════════════\n');

    // ── Step 4: Verify interchange integrity ──
    const majesticPurple = stationMap.get('MSJP');
    const majesticGreen = stationMap.get('MSJG');
    const hasCrossLink = majesticPurple.connections.some(
      (c) => c.stationId.toString() === majesticGreen._id.toString()
    );
    console.log(
      hasCrossLink
        ? '✅ Interchange verification passed: Majestic Purple ↔ Green connected'
        : '❌ Interchange verification FAILED: Majestic cross-link missing!'
    );

    const rvRoadGreen = stationMap.get('RVRD');
    const rvRoadYellow = stationMap.get('RVRY');
    const hasYellowLink = rvRoadGreen.connections.some(
      (c) => c.stationId.toString() === rvRoadYellow._id.toString()
    );
    console.log(
      hasYellowLink
        ? '✅ Interchange verification passed: R.V. Road Green ↔ Yellow connected'
        : '❌ Interchange verification FAILED: R.V. Road cross-link missing!'
    );

  } catch (err) {
    console.error('❌ Seed script failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the seed
seedStations();
