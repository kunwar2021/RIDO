/**
 * ==============================================================================
 * Route: Analytics & Diagnostics (MVC Architecture)
 * ==============================================================================
 * Routes HTTP endpoints to Analytics Controller methods.
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/', analyticsController.getAnalyticsSummary);
router.get('/summary', analyticsController.getAnalyticsSummary);
router.get('/kpis', analyticsController.getAnalyticsSummary);
router.get('/health', analyticsController.getHealth);

module.exports = router;
