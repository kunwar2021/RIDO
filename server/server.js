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

// Start Server Listener
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n=================================================================`);
    console.log(`🚀 [RIDO Backend Server] Live on http://localhost:${PORT}`);
    console.log(`🏛️ Architecture: Model-View-Controller (MVC) Structure Active`);
    console.log(`📦 Database: MongoDB Community / Atlas Mongoose Layer`);
    console.log(`=================================================================\n`);
  });
}

module.exports = app;
