/**
 * ==============================================================================
 * Lecture 40: Multer File Upload Routes (Proof of Delivery & Documentation)
 * ==============================================================================
 * Exposes endpoints for uploading binary multipart form-data:
 * POST /api/upload/pod       -> Uploads Proof of Delivery (POD) signed receipt
 * POST /api/upload/document  -> Uploads Driver License or Vehicle Insurance document
 */

const express = require('express');
const router = express.Router();
const { uploadPod, uploadDocument } = require('../middleware/upload');

// 1. POST /api/upload/pod (Proof of Delivery Receipt)
router.post('/pod', (req, res) => {
  uploadPod(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Multer Upload Error: ' + err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file received under field name "pod". Please select a JPEG, PNG, or PDF file.'
      });
    }

    const fileUrl = `/uploads/pod/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Proof of Delivery (POD) document uploaded successfully via Multer.',
      file: {
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimetype: req.file.mimetype,
        sizeBytes: req.file.size,
        url: fileUrl
      }
    });
  });
});

// 2. POST /api/upload/document (Driver/Vehicle Documentation)
router.post('/document', (req, res) => {
  uploadDocument(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Multer Upload Error: ' + err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file received under field name "document".'
      });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Fleet compliance document uploaded successfully.',
      file: {
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimetype: req.file.mimetype,
        sizeBytes: req.file.size,
        url: fileUrl
      }
    });
  });
});

module.exports = router;
