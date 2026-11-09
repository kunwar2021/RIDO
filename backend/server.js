/**
 * ==============================================================================
 * RIDO Enterprise Fleet Engine — MVC Modular Backend Server
 * ==============================================================================
 * Architecture: Model-View-Controller (MVC)
 * Tech Stack: Node.js, Express.js, MongoDB (Local & Atlas), Mongoose ORM, JWT, Multer
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { requestInspector, errorHandler } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimiter');

// Controllers for root endpoints
const analyticsController = require('./controllers/analytics.controller');
const tripController = require('./controllers/trip.controller');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Connect Database (MongoDB Atlas Cloud / Local Community Server)
connectDB();

// 2. Cross-Origin Resource Sharing (CORS) Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// 3. Body Parsing Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(requestInspector);

// Global API Rate Limiter (200 req/min per IP)
app.use('/api', apiLimiter);

// 4. Static Files & Multer Uploads Hosting
const frontendDir = path.join(__dirname, '..', 'frontend');
const rootDir = path.join(__dirname, '..');
const uploadsDir = path.join(__dirname, '..', 'uploads');

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(frontendDir));
app.use(express.static(rootDir));

// ==============================================================================
// 5. MVC REST API ROUTING
// ==============================================================================
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/fleet', require('./routes/fleet.routes'));
app.use('/api/trips', require('./routes/trip.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/curriculum', require('./routes/demo.routes'));

// Platform Health & Real-time Optimization Direct Shortcuts
app.get('/api/health', analyticsController.getHealth);
app.get('/api/analytics/summary', analyticsController.getAnalyticsSummary);
app.post('/api/optimize-route', tripController.optimizeRoute);

// API 404 handler (ensures API routes return JSON, not HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint '${req.originalUrl}' not found.` });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// SPA Fallback: serve frontend index.html for page navigation
app.use((req, res) => {
  const fs = require('fs');
  const frontendIndex = path.join(frontendDir, 'index.html');
  if (fs.existsSync(frontendIndex)) {
    return res.sendFile(frontendIndex);
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

// ==============================================================================
// Self-Ping Keep-Alive (prevents Render free tier from sleeping)
// Pings /api/health every 12 minutes using RENDER_EXTERNAL_URL env var.
// ==============================================================================
function startKeepAlive() {
  const PING_URL = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
    : null;

  if (!PING_URL) {
    console.log('ℹ️  Keep-alive skipped (RENDER_EXTERNAL_URL not set).');
    return;
  }

  const INTERVAL_MS = 12 * 60 * 1000; // every 12 minutes

  setInterval(() => {
    try {
      const https = require('https');
      const req = https.get(PING_URL, (res) => {
        console.log(`🏓 [Keep-Alive] Self-ping → ${res.statusCode} at ${new Date().toISOString()}`);
      });
      req.on('error', (err) => {
        console.warn(`⚠️  [Keep-Alive] Ping failed: ${err.message}`);
      });
      req.end();
    } catch (err) {
      console.warn(`⚠️  [Keep-Alive] Error: ${err.message}`);
    }
  }, INTERVAL_MS);

  console.log(`♻️  Keep-alive pinger started → ${PING_URL} (every 12 min)`);
}

// Start Server Listener
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n=================================================================`);
    console.log(`🚀 [RIDO Backend Server] Live on http://localhost:${PORT}`);
    console.log(`🏛️ Architecture: Model-View-Controller (MVC) Structure Active`);
    console.log(`📦 Database: MongoDB Community / Atlas Mongoose Layer`);
    console.log(`=================================================================\n`);
    startKeepAlive();
  });
}

module.exports = app;
