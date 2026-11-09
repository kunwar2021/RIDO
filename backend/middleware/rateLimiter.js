/**
 * ==============================================================================
 * Middleware: Rate Limiting (Security Layer)
 * ==============================================================================
 * Protects sensitive endpoints from brute-force and abuse using express-rate-limit.
 */

const rateLimit = require('express-rate-limit');

/**
 * Auth Rate Limiter — login & register
 * Max 10 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts from this IP. Please try again after 15 minutes.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

/**
 * General API Rate Limiter — all /api routes
 * Max 200 requests per minute per IP
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

module.exports = { authLimiter, apiLimiter };
