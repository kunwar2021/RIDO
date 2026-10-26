/**
 * ==============================================================================
 * Controller: Multer File Uploads (MVC Architecture)
 * ==============================================================================
 * Handles multipart/form-data file uploads for Proof of Delivery (POD)
 * receipts and vehicle/driver compliance documents.
 */

const { uploadPod, uploadDocument } = require('../middleware/upload');

// 1. Upload Proof of Delivery (POST /api/upload/pod)
exports.uploadPod = (req, res) => {
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
};

// 2. Upload Compliance Document (POST /api/upload/document)
exports.uploadDocument = (req, res) => {
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
};
