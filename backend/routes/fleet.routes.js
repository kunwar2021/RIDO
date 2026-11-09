/**
 * ==============================================================================
 * Route: Fleet Management (MVC Architecture)
 * ==============================================================================
 * Routes HTTP endpoints to Fleet Controller methods with role authorization.
 * Security: Input validated on write operations.
 */

const express = require('express');
const router = express.Router();
const fleetController = require('../controllers/fleet.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { validate, createVehicleRules } = require('../middleware/validator');

// Public & Read Endpoints
router.get('/',    fleetController.getAllVehicles);
router.get('/:id', fleetController.getVehicleById);

// Protected + Validated Write Endpoints
router.post('/',
  verifyToken,
  requireRoles('admin', 'fleet_manager', 'manager', 'dispatcher'),
  validate(createVehicleRules),
  fleetController.createVehicle
);
router.put('/:id',
  verifyToken,
  requireRoles('admin', 'fleet_manager', 'manager', 'dispatcher'),
  fleetController.updateVehicle
);
router.delete('/:id',
  verifyToken,
  requireRoles('admin', 'fleet_manager', 'manager'),
  fleetController.deleteVehicle
);

module.exports = router;
