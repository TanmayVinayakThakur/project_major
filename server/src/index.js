const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────
// Routes (Phase 2)
// ──────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    message: 'NammaRoute API is running 🚇',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth   (Phase 2)',
      route: '/api/route  (Phase 2)',
      trips: '/api/trips  (Phase 2)',
    },
  });
});

// ──────────────────────────────────────────────
// Database Connection & Server Start
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nammaroute';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚇 NammaRoute server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
