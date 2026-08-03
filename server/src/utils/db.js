const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nammaroute';

  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    // Connect with a 3-second timeout so it falls back quickly if MongoDB isn't running locally
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.log('⚠️ Could not connect to MongoDB. Attempting in-memory MongoDB fallback...');
    try {
      // Lazy load to avoid issues if the dependency is not used
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      console.log(`🚀 In-memory MongoDB launched at: ${mongoUri}`);
      
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to In-Memory MongoDB');

      // Auto-seed in-memory database since it starts fresh and empty
      const seedData = require('../seed/seedHelper');
      const seedResult = await seedData();
      console.log(`✅ Auto-seeded in-memory DB: ${seedResult.stationsSeeded} stations, ${seedResult.connectionsSeeded} connections`);
    } catch (fallbackErr) {
      console.error('❌ Failed to connect to MongoDB and failed to launch in-memory server:', fallbackErr.message);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting database:', error);
  }
};

module.exports = { connectDB, disconnectDB };
