const Station = require('../models/Station');

// Haversine distance calculator in kilometres
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 +
            Math.cos(lat1 * p) * Math.cos(lat2 * p) *
            (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

// 1. Purple Line Stations (30 stations, sequential order Challaghatta to Whitefield)
const PURPLE_LINE_STATIONS = [
  ['CLGT', 'Challaghatta',                          'Purple', 12.9179, 77.4725, false],
  ['KNGR', 'Kengeri',                               'Purple', 12.9181, 77.4839, false],
  ['KGBT', 'Kengeri Bus Terminal',                  'Purple', 12.9213, 77.4950, false],
  ['PTGR', 'Pattanagere',                           'Purple', 12.9255, 77.5028, false],
  ['JNBT', 'Jnanabharathi',                         'Purple', 12.9304, 77.5098, false],
  ['RRNV', 'Rajarajeshwari Nagar',                  'Purple', 12.9366, 77.5186, false],
  ['MYRD', 'Mysuru Road',                            'Purple', 12.9463, 77.5300, false],
  ['DPLY', 'Deepanjali Nagar',                       'Purple', 12.9522, 77.5357, false],
  ['ASOK', 'Attiguppe',                              'Purple', 12.9620, 77.5332, false],
  ['VLKY', 'Vijayanagar',                            'Purple', 12.9696, 77.5370, false],
  ['HSPT', 'Hosahalli',                              'Purple', 12.9710, 77.5430, false],
  ['MGFM', 'Magadi Road',                            'Purple', 12.9718, 77.5562, false],
  ['CTRW', 'Krantivira Sangolli Rayanna (City Rly)', 'Purple', 12.9754, 77.5728, false],
  ['MSJP', 'Nadaprabhu Kempegowda (Majestic)',       'Purple', 12.9756, 77.5728, true],
  ['VSVY', 'Sir M. Visvesvaraya (Vidhana Soudha)',   'Purple', 12.9789, 77.5800, false],
  ['CPBK', 'Cubbon Park',                            'Purple', 12.9795, 77.5870, false],
  ['MGRD', 'MG Road',                                'Purple', 12.9756, 77.6067, false],
  ['TRNY', 'Trinity',                                'Purple', 12.9730, 77.6174, false],
  ['HLSR', 'Halasuru',                               'Purple', 12.9816, 77.6264, false],
  ['INDG', 'Indiranagar',                            'Purple', 12.9784, 77.6408, false],
  ['SVRD', 'Swami Vivekananda Road',                 'Purple', 12.9850, 77.6540, false],
  ['BYPL', 'Baiyappanahalli',                        'Purple', 12.9907, 77.6695, false],
  ['BSKM', 'Benniganahalli',                         'Purple', 12.9980, 77.6810, false],
  ['KRPM', 'Krishnarajapuram (KR Puram)',            'Purple', 13.0012, 77.6967, false],
  ['MSTH', 'Mahadevapura',                           'Purple', 12.9940, 77.7100, false],
  ['GAUR', 'Garudacharpalya',                        'Purple', 12.9930, 77.7230, false],
  ['VTHL', 'Hoodi',                                  'Purple', 12.9940, 77.7360, false],
  ['KDIA', 'Kadugodi Industrial Area',               'Purple', 12.9941, 77.7470, false],
  ['HFCS', 'Hopefarm Channasandra',                  'Purple', 12.9942, 77.7510, false],
  ['WHTF', 'Whitefield (Kadugodi)',                  'Purple', 12.9945, 77.7600, false],
];

// 2. Green Line Stations (31 stations, sequential order Madavara to Silk Institute)
const GREEN_LINE_STATIONS = [
  ['MDVR', 'Madavara',                               'Green', 13.0920, 77.5080, false],
  ['CIGN', 'Chikkabidarakallu',                      'Green', 13.0800, 77.5100, false],
  ['NGSD', 'Nagasandra',                              'Green', 13.0690, 77.5150, false],
  ['DSHL', 'Dasarahalli',                             'Green', 13.0580, 77.5180, false],
  ['JLHL', 'Jalahalli',                               'Green', 13.0460, 77.5200, false],
  ['PYIN', 'Peenya Industry',                         'Green', 13.0350, 77.5210, false],
  ['PYNY', 'Peenya',                                  'Green', 13.0280, 77.5220, false],
  ['GORG', 'Goraguntepalya',                         'Green', 13.0180, 77.5300, false],
  ['YWPR', 'Yeshwanthpur',                            'Green', 13.0220, 77.5370, false],
  ['SDSF', 'Sandal Soap Factory',                     'Green', 13.0130, 77.5420, false],
  ['MSGH', 'Mahalakshmi',                             'Green', 13.0060, 77.5490, false],
  ['RJNR', 'Rajajinagar',                             'Green', 12.9980, 77.5530, false],
  ['KVPR', 'Kuvempu Road',                            'Green', 12.9930, 77.5590, false],
  ['SRPR', 'Srirampura',                              'Green', 12.9880, 77.5650, false],
  ['SMPG', 'Sampige Road',                            'Green', 12.9810, 77.5680, false],
  ['MSJG', 'Nadaprabhu Kempegowda (Majestic)',        'Green', 12.9756, 77.5728, true],
  ['CKPT', 'Chickpete',                               'Green', 12.9700, 77.5740, false],
  ['KRMK', 'K.R. Market',                             'Green', 12.9600, 77.5750, false],
  ['NTLC', 'National College',                        'Green', 12.9500, 77.5730, false],
  ['LBGH', 'Lalbagh',                                 'Green', 12.9430, 77.5800, false],
  ['SECC', 'South End Circle',                        'Green', 12.9370, 77.5810, false],
  ['JYNR', 'Jayanagar',                               'Green', 12.9300, 77.5820, false],
  ['RVRD', 'R.V. Road',                               'Green', 12.9215, 77.5820, true],
  ['BNSK', 'Banashankari',                             'Green', 12.9150, 77.5730, false],
  ['JPNR', 'J.P. Nagar',                              'Green', 12.9070, 77.5710, false],
  ['YLCH', 'Yelachenahalli',                           'Green', 12.8960, 77.5700, false],
  ['KNKT', 'Konanakunte Cross',                        'Green', 12.8850, 77.5680, false],
  ['DKSD', 'Doddakallasandra',                        'Green', 12.8740, 77.5660, false],
  ['VJHL', 'Vajrahalli',                              'Green', 12.8630, 77.5650, false],
  ['TGTP', 'Thalaghattapura',                         'Green', 12.8520, 77.5640, false],
  ['SILK', 'Silk Institute',                           'Green', 12.8410, 77.5630, false],
];

// 3. Yellow Line Stations (16 stations, sequential order RV Road to Bommasandra)
const YELLOW_LINE_STATIONS = [
  ['RVRY', 'R.V. Road (Yellow)',                       'Yellow', 12.9215, 77.5820, true],
  ['RGRD', 'Ragigudda',                                'Yellow', 12.9160, 77.5910, false],
  ['JKNR', 'Jayadeva Hospital',                        'Yellow', 12.9170, 77.6010, false],
  ['BTML', 'BTM Layout',                               'Yellow', 12.9160, 77.6120, false],
  ['SLKB', 'Silk Board',                               'Yellow', 12.9170, 77.6230, false],
  ['BMNH', 'Bommanahalli',                             'Yellow', 12.9090, 77.6320, false],
  ['HNSD', 'Hongasandra',                              'Yellow', 12.8990, 77.6430, false],
  ['KDGT', 'Kudlu Gate',                               'Yellow', 12.8890, 77.6530, false],
  ['SNSD', 'Singasandra',                              'Yellow', 12.8790, 77.6630, false],
  ['HSRD', 'Hosa Road',                                'Yellow', 12.8690, 77.6730, false],
  ['BTAG', 'Beratena Agrahara',                        'Yellow', 12.8580, 77.6830, false],
  ['KPAG', 'Konappana Agrahara',                       'Yellow', 12.8480, 77.6930, false],
  ['ELCY', 'Electronic City',                          'Yellow', 12.8390, 77.7020, false],
  ['HKRD', 'Hushkur Road',                             'Yellow', 12.8290, 77.7120, false],
  ['HBGD', 'Hebbagodi',                                'Yellow', 12.8120, 77.7230, false],
  ['BMSD', 'Bommasandra',                              'Yellow', 12.7950, 77.7340, false],
];

async function seedData() {
  try {
    // Clear existing stations
    await Station.deleteMany({});
    console.log('🗑️  Cleared existing stations in helper');

    const allStationData = [
      ...PURPLE_LINE_STATIONS,
      ...GREEN_LINE_STATIONS,
      ...YELLOW_LINE_STATIONS,
    ];

    const stationMap = new Map(); // code -> Station document

    // Create all station documents
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

    console.log(`📍 Created ${stationMap.size} stations in helper`);

    let connectionCount = 0;

    // Helper to add a bidirectional connection
    const addConnection = (fromCode, toCode, distance, time) => {
      const s1 = stationMap.get(fromCode);
      const s2 = stationMap.get(toCode);
      if (s1 && s2) {
        s1.connections.push({ stationId: s2._id, distance, travelTime: time });
        s2.connections.push({ stationId: s1._id, distance, travelTime: time });
        connectionCount++;
      }
    };

    // 1. Programmatically connect adjacent stations for Purple Line
    for (let i = 0; i < PURPLE_LINE_STATIONS.length - 1; i++) {
      const fromCode = PURPLE_LINE_STATIONS[i][0];
      const toCode = PURPLE_LINE_STATIONS[i + 1][0];
      const lat1 = PURPLE_LINE_STATIONS[i][3];
      const lon1 = PURPLE_LINE_STATIONS[i][4];
      const lat2 = PURPLE_LINE_STATIONS[i + 1][3];
      const lon2 = PURPLE_LINE_STATIONS[i + 1][4];
      
      const dist = parseFloat(getHaversineDistance(lat1, lon1, lat2, lon2).toFixed(2));
      // Calculate realistic travel time based on avg speed of 40 km/h + 1 min dwell time
      const time = Math.max(1, Math.ceil((dist / 40) * 60) + 1);

      addConnection(fromCode, toCode, dist, time);
    }

    // 2. Programmatically connect adjacent stations for Green Line
    for (let i = 0; i < GREEN_LINE_STATIONS.length - 1; i++) {
      const fromCode = GREEN_LINE_STATIONS[i][0];
      const toCode = GREEN_LINE_STATIONS[i + 1][0];
      const lat1 = GREEN_LINE_STATIONS[i][3];
      const lon1 = GREEN_LINE_STATIONS[i][4];
      const lat2 = GREEN_LINE_STATIONS[i + 1][3];
      const lon2 = GREEN_LINE_STATIONS[i + 1][4];
      
      const dist = parseFloat(getHaversineDistance(lat1, lon1, lat2, lon2).toFixed(2));
      const time = Math.max(1, Math.ceil((dist / 40) * 60) + 1);

      addConnection(fromCode, toCode, dist, time);
    }

    // 3. Programmatically connect adjacent stations for Yellow Line
    for (let i = 0; i < YELLOW_LINE_STATIONS.length - 1; i++) {
      const fromCode = YELLOW_LINE_STATIONS[i][0];
      const toCode = YELLOW_LINE_STATIONS[i + 1][0];
      const lat1 = YELLOW_LINE_STATIONS[i][3];
      const lon1 = YELLOW_LINE_STATIONS[i][4];
      const lat2 = YELLOW_LINE_STATIONS[i + 1][3];
      const lon2 = YELLOW_LINE_STATIONS[i + 1][4];
      
      const dist = parseFloat(getHaversineDistance(lat1, lon1, lat2, lon2).toFixed(2));
      const time = Math.max(1, Math.ceil((dist / 40) * 60) + 1);

      addConnection(fromCode, toCode, dist, time);
    }

    // 4. Connect Interchanges
    // Majestic: Purple (MSJP) ↔ Green (MSJG) (0.2 km, 3 minutes transfer walk)
    addConnection('MSJP', 'MSJG', 0.2, 3);
    
    // RV Road: Green (RVRD) ↔ Yellow (RVRY) (0.2 km, 3 minutes transfer walk)
    addConnection('RVRD', 'RVRY', 0.2, 3);

    // Save all station modifications
    for (const station of stationMap.values()) {
      await station.save();
    }

    console.log(`🔗 Created ${connectionCount} bidirectional connections in helper`);
    return {
      success: true,
      stationsSeeded: stationMap.size,
      connectionsSeeded: connectionCount,
    };
  } catch (error) {
    console.error('Error in seedData helper:', error);
    throw error;
  }
}

module.exports = seedData;
