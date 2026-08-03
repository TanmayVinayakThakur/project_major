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
const authRouter = require('./routes/auth');
const stationsRouter = require('./routes/stations');
const routeRouter = require('./routes/route');
const compareRouter = require('./routes/compare');

app.use('/api/auth', authRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/route', routeRouter);
app.use('/api/compare', compareRouter);

app.get('/', (_req, res) => {
  res.json({
    message: 'NammaRoute API is running 🚇',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      route: '/api/route  (Phase 2)',
      trips: '/api/trips  (Phase 2)',
    },
  });
});

// ──────────────────────────────────────────────
// Database Connection & Server Start
// ──────────────────────────────────────────────
const { connectDB } = require('./utils/db');
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚇 NammaRoute server running on http://localhost:${PORT}`);
  });
});

module.exports = app;
