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

// Protected User Profile Endpoints
router.get('/me', verifyToken, authController.getMe);
router.put('/me', verifyToken, authController.updateProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/users/:id', verifyToken, authController.updateUserById);
router.put('/:id', verifyToken, authController.updateUserById);

module.exports = router;
