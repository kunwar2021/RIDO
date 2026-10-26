/**
 * ==============================================================================
 * Route: Curriculum Diagnostics & Architectural Demos (MVC Architecture)
 * ==============================================================================
 * Routes diagnostic endpoints to Curriculum Controller methods.
 */

const express = require('express');
const router = express.Router();
const curriculumController = require('../controllers/curriculum.controller');

// Diagnostic Routes
router.get('/event-loop', curriculumController.getEventLoopTrace);
router.get('/v8-diagnostics', curriculumController.getV8Diagnostics);
router.post('/buffers', curriculumController.testBuffers);
router.get('/events', curriculumController.testEventEmitter);
router.get('/fs-logs', curriculumController.getFsLogs);
router.get('/db-status', curriculumController.getDatabaseStatus);

module.exports = router;
