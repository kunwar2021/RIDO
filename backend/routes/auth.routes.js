/**
 * ==============================================================================
 * Route: Authentication (MVC Architecture)
 * ==============================================================================
 * Routes HTTP endpoints to Auth Controller methods.
 * Security: Rate-limited + input validated.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerRules, loginRules } = require('../middleware/validator');

// Public Auth Endpoints (rate-limited + validated)
router.post('/register', authLimiter, validate(registerRules), authController.register);
router.post('/login',    authLimiter, validate(loginRules),    authController.login);
router.post('/google',   authLimiter,                          authController.googleAuth);

// Protected Endpoints (require valid JWT)
router.get('/users', verifyToken, authController.getAllUsers);
router.get('/me',    verifyToken, authController.getMe);

module.exports = router;
