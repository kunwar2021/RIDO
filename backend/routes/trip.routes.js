/**
 * ==============================================================================
 * Route: Trip Operations & Streaming (MVC Architecture)
 * ==============================================================================
 * Routes HTTP endpoints to Trip Controller methods.
 */

const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');

// Trip Operations
router.get('/', tripController.getAllTrips);
router.post('/', tripController.createTrip);
router.post('/dispatch', tripController.createTrip);
router.get('/export/csv', tripController.exportTripsCsv);
router.post('/optimize', tripController.optimizeRoute);

module.exports = router;
