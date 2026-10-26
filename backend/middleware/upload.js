/**
 * ==============================================================================
 * Lecture 40: Multer File Uploads & Multipart Form-Data Middleware
 * ==============================================================================
 * Handles secure file uploads for Proof of Delivery (POD) bills and Driver/Vehicle
 * documentation with disk storage, file size caps, and strict MIME type validation.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure base upload directory exists
const uploadBasePath = path.join(__dirname, '..', '..', 'uploads');
const podPath = path.join(uploadBasePath, 'pod');
const docPath = path.join(uploadBasePath, 'documents');

[uploadBasePath, podPath, docPath].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer Disk Storage (Lecture 40)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'pod') {
      cb(null, podPath);
    } else {
      cb(null, docPath);
    }
  },
  filename: function (req, file, cb) {
    // Sanitize filename and append unique timestamp + random hash
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

// MIME Type Whitelist Filter (Lecture 40)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, PDF`), false);
  }
};

// Upload Instances with 5 MB Max File Size
const uploadPod = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 Megabytes
}).single('pod');

const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 } // 8 Megabytes
}).single('document');

module.exports = {
  uploadPod,
  uploadDocument,
  uploadBasePath
};
