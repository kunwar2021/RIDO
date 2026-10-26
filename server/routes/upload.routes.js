/**
 * ==============================================================================
 * Route: Multer File Uploads (MVC Architecture)
 * ==============================================================================
 * Routes multipart form-data uploads to Upload Controller methods.
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');

// Upload Endpoints
router.post('/pod', uploadController.uploadPod);
router.post('/document', uploadController.uploadDocument);

module.exports = router;
