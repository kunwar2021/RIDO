/**
 * ==============================================================================
 * Route: Trip Operations & Streaming (MVC Architecture)
 * ==============================================================================
 * Routes HTTP endpoints to Trip Controller methods.
 * Security: Input validated on write/optimize operations.
 */

const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');
const { validate, createTripRules, optimizeRouteRules } = require('../middleware/validator');

// Trip Operations
router.get('/',               tripController.getAllTrips);
router.post('/',              validate(createTripRules),    tripController.createTrip);
router.post('/dispatch',      validate(createTripRules),    tripController.createTrip);
router.get('/export/csv',     tripController.exportTripsCsv);
router.post('/optimize',      validate(optimizeRouteRules), tripController.optimizeRoute);
router.post('/google-directions', tripController.getGoogleDirections);

module.exports = router;
