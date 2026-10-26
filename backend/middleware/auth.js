/**
 * ==============================================================================
 * Lectures 38 & 39: Express Middleware, JWT Authentication & Error Handling
 * ==============================================================================
 * Provides authentication token verification, role-based authorization guard,
 * request logger, and centralized error handler middleware.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rido_super_secret_jwt_key_2026_chitkara';

/**
 * 1. Middleware: Verify JWT Authentication Token (Lecture 39)
 * Checks the Authorization header for Bearer <token>
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: No authentication token provided in headers.'
    });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach decoded payload { id, email, role } to request
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token. Please sign in again.',
      error: err.name
    });
  }
};

/**
 * 2. Middleware: Role-Based Authorization Guard (Lecture 39)
 * Restricts access based on user role (e.g., ['admin', 'fleet_manager'])
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' lacks permission for this resource. Required: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};

/**
 * 3. Middleware: Request Logger & Lifecycle Inspector (Lecture 35 & 38)
 */
const requestInspector = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP ${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
};

/**
 * 4. Middleware: Centralized Error Handler (Lecture 38 & 39)
 * Catches all unhandled synchronous/asynchronous errors across Express routes.
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Express Global Error Handler]:', err.stack || err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error encountered in Logistics Engine.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = {
  verifyToken,
  requireRoles,
  requestInspector,
  errorHandler,
  JWT_SECRET
};
