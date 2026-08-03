/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NammaRoute — Bangalore Metro Station Seed Script           ║
 * ║  Seeds Purple Line, Green Line, and Yellow Line stations     ║
 * ║  using the seedData helper.                                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Run:  npm run seed
 *   or: node src/seed/seedStations.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const seedData = require('./seedHelper');

async function seedStations() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nammaroute';

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await seedData();
    console.log('\n══════════════════════════════════════════════');
    console.log('  NammaRoute Database Seeded Successfully! 🚇');
    console.log('══════════════════════════════════════════════');
    console.log(`  Seeded: ${result.stationsSeeded} stations`);
    console.log(`  Connections: ${result.connectionsSeeded} edges (bidirectional)`);
    console.log('══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Seed script failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the seed
seedStations();
