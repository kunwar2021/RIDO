/**
 * ==============================================================================
 * Middleware: Input Validation (express-validator)
 * ==============================================================================
 * Validation chains for auth, fleet, and trip routes.
 * Call validate(rules) in any route to auto-reject bad input with 422.
 */

const { body, validationResult } = require('express-validator');

/**
 * Run validation result — returns 422 with error list if any rule failed.
 */
const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed. Please check your input.',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }
    next();
  };
};

// ── Auth Validators ──────────────────────────────────────────────────────────

const registerRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role')
    .optional()
    .isIn(['admin', 'fleet_manager', 'manager', 'driver', 'company', 'dispatcher'])
    .withMessage('Invalid role specified.'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian phone number.')
];

const loginRules = [
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.')
];

// ── Fleet Validators ─────────────────────────────────────────────────────────

const createVehicleRules = [
  body('name')
    .trim().notEmpty().withMessage('Vehicle name is required.'),
  body('category')
    .notEmpty().withMessage('Vehicle category is required.')
    .isIn(['LCV (Electric)', 'Pick-up', 'ICV 4.9T', 'ICV (Electric)', 'MCV 16T', 'HCV Tipper', 'HCV 28T', 'Heavy Haulage'])
    .withMessage('Invalid vehicle category.'),
  body('capacityKg')
    .notEmpty().withMessage('Payload capacity is required.')
    .isFloat({ min: 100, max: 55000 }).withMessage('Capacity must be between 100–55,000 kg.'),
  body('powertrain')
    .optional()
    .isIn(['Electric (EV)', 'Diesel', 'CNG', 'LNG']).withMessage('Invalid powertrain type.'),
  body('costPerKm')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost per km cannot be negative.')
];

// ── Trip Validators ──────────────────────────────────────────────────────────

const createTripRules = [
  body('origin')
    .trim().notEmpty().withMessage('Origin is required.'),
  body('destination')
    .trim().notEmpty().withMessage('Destination is required.'),
  body('distanceKm')
    .optional()
    .isFloat({ min: 1 }).withMessage('Distance must be a positive number.'),
  body('driverName')
    .optional()
    .trim().isLength({ min: 2 }).withMessage('Driver name must be at least 2 characters.')
];

const optimizeRouteRules = [
  body('origin')
    .trim().notEmpty().withMessage('Origin is required.'),
  body('destination')
    .trim().notEmpty().withMessage('Destination is required.')
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  createVehicleRules,
  createTripRules,
  optimizeRouteRules
};
