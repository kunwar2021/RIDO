/**
 * ==============================================================================
 * Lectures 34, 38, 41: Trips & Dispatch Routes (Streams, Events, Relations)
 * ==============================================================================
 * Handles logistics trip dispatches, integration with EventEmitter for real-time
 * telemetry signals, fs-based audit logging, Mongoose populate, and Stream-based CSV exports.
 */

const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const { dispatchEvents, appendDispatchLog, streamTripsAsCSV } = require('../core/fsStreamManager');

// In-Memory Fallback Trips
const inMemoryTrips = [
  {
    id: 'TRIP-DEL-MUM-892',
    tripCode: 'TRIP-DEL-MUM-892',
    origin: 'New Delhi Distribution Hub',
    destination: 'Mumbai Nhava Sheva Terminal',
    vehicleCustomId: 'bharatbenz-1617r',
    driverName: 'Gurpreet Singh',
    status: 'In-Transit',
    distanceKm: 1410,
    fuelSavedPercentage: 18.4,
    estimatedTollCost: 3120,
    createdAt: new Date().toISOString()
  }
];

// 1. GET /api/trips (Lecture 41: Populate Demonstration)
router.get('/', async (req, res, next) => {
  try {
    try {
      // Use Mongoose query helper to populate vehicle and driver references
      const trips = await Trip.find().withFullDetails();
      if (trips && trips.length > 0) {
        return res.json({
          success: true,
          source: 'MongoDB Mongoose Model (Populated)',
          count: trips.length,
          trips
        });
      }
    } catch (e) {}

    res.json({
      success: true,
      source: 'In-Memory Trips',
      count: inMemoryTrips.length,
      trips: inMemoryTrips
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/trips/dispatch (Lectures 33, 34, 38)
router.post('/dispatch', async (req, res, next) => {
  try {
    const { vehicleId, driverName, origin, destination, waypoints, distanceKm, tollCost } = req.body;

    if (!vehicleId || !driverName) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: vehicleId and driverName are required for dispatch.'
      });
    }

    const tripCode = `TRIP-${Date.now().toString().slice(-6)}`;
    const newTrip = {
      id: tripCode,
      tripCode,
      origin: origin || 'Central Hub',
      destination: destination || 'Destination Hub',
      vehicleCustomId: vehicleId,
      driverName,
      waypoints: waypoints || [],
      distanceKm: Number(distanceKm) || 120,
      estimatedTollCost: Number(tollCost) || 450,
      status: 'Assigned',
      createdAt: new Date().toISOString()
    };

    // Save to Mongoose
    try {
      const tripDoc = new Trip(newTrip);
      await tripDoc.save();
    } catch (e) {}

    inMemoryTrips.unshift(newTrip);

    // Fire Node.js EventEmitter (Lecture 34)
    dispatchEvents.emit('trip_dispatched', newTrip);

    // Asynchronous FS Log (Lecture 33)
    await appendDispatchLog({
      action: 'DISPATCH',
      tripCode,
      vehicleId,
      driverName,
      origin: newTrip.origin,
      destination: newTrip.destination,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: `Trip ${tripCode} successfully dispatched to Driver ${driverName}!`,
      trip: newTrip
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/trips/export/csv (Lecture 34: Stream Pipeline Demonstration)
router.get('/export/csv', (req, res) => {
  streamTripsAsCSV(inMemoryTrips, res);
});

module.exports = router;
