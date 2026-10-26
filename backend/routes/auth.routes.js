/**
 * ==============================================================================
 * Route: Authentication (MVC Architecture)
 * ==============================================================================
 * Routes HTTP endpoints to Auth Controller methods.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

// Public Auth Endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.get('/users', authController.getAllUsers);

// Protected User Profile Endpoint
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
