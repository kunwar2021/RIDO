/**
 * ==============================================================================
 * Lectures 37, 38, 41: Fleet Management CRUD REST APIs & Mongoose Models
 * ==============================================================================
 * Exposes complete RESTful CRUD operations:
 * GET    /api/fleet      -> List all fleet vehicles (with query filtering)
 * GET    /api/fleet/:id  -> Get specific vehicle details
 * POST   /api/fleet      -> Create new vehicle (Protected: admin, fleet_manager)
 * PUT    /api/fleet/:id  -> Update vehicle telemetry or details
 * DELETE /api/fleet/:id  -> Delete vehicle (Protected: admin)
 */

const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { verifyToken, requireRoles } = require('../middleware/auth');

// Initial Seed Fleet Roster
let inMemoryFleet = [
  { id: 'tata-ace-ev', customId: 'tata-ace-ev', name: 'Tata Ace EV', category: 'LCV (Electric)', capacityKg: 1000, fuelEfficiency: '154 km/charge', powertrain: 'Electric (EV)', costPerKm: 3.2, status: 'available', driverName: 'Vikram Singh', currentLocation: 'Delhi Hub', batteryLevel: 94 },
  { id: 'ashok-dost', customId: 'ashok-dost', name: 'Ashok Leyland BADA DOST', category: 'Pick-up', capacityKg: 1860, fuelEfficiency: '13.5 km/l', powertrain: 'Diesel', costPerKm: 7.8, status: 'en-route', driverName: 'Rajesh Kumar', currentLocation: 'NH-44 Ambala', fuelLevel: 72 },
  { id: 'eicher-pro-2049', customId: 'eicher-pro-2049', name: 'Eicher Pro 2049', category: 'ICV 4.9T', capacityKg: 2500, fuelEfficiency: '10.5 km/l', powertrain: 'Diesel', costPerKm: 9.6, status: 'available', driverName: 'Harpreet Singh', currentLocation: 'Ludhiana Depot', fuelLevel: 88 },
  { id: 'tata-ultra-t7', customId: 'tata-ultra-t7', name: 'Tata Ultra T.7 Electric', category: 'ICV (Electric)', capacityKg: 3700, fuelEfficiency: '180 km/charge', powertrain: 'Electric (EV)', costPerKm: 5.4, status: 'charging', driverName: 'Amit Sharma', currentLocation: 'Chandigarh Depot', batteryLevel: 45 },
  { id: 'bharatbenz-1617r', customId: 'bharatbenz-1617r', name: 'BharatBenz 1617R', category: 'MCV 16T', capacityKg: 9500, fuelEfficiency: '6.2 km/l', powertrain: 'Diesel', costPerKm: 15.5, status: 'en-route', driverName: 'Gurpreet Singh', currentLocation: 'Karnal Toll Plaza', fuelLevel: 64 },
  { id: 'tata-signa-4825', customId: 'tata-signa-4825', name: 'Tata Signa 4825.TK', category: 'HCV Tipper', capacityKg: 28000, fuelEfficiency: '3.4 km/l', powertrain: 'Diesel', costPerKm: 27.5, status: 'maintenance', driverName: 'Sukhwinder Singh', currentLocation: 'Jaipur Workshop', fuelLevel: 30 }
];

// 1. GET /api/fleet (Lecture 38: Query Params Filtering & Read)
router.get('/', async (req, res, next) => {
  try {
    const { status, powertrain, maxCapacity } = req.query;

    // Try Mongoose
    try {
      const query = {};
      if (status) query.status = status;
      if (powertrain) query.powertrain = powertrain;
      if (maxCapacity) query.capacityKg = { $lte: Number(maxCapacity) };

      const vehicles = await Vehicle.find(query);
      if (vehicles && vehicles.length > 0) {
        return res.json({
          success: true,
          source: 'MongoDB Mongoose Model',
          count: vehicles.length,
          vehicles
        });
      }
    } catch (mongoErr) {
      // Fallback
    }

    // In-Memory Filter
    let results = [...inMemoryFleet];
    if (status) results = results.filter((v) => v.status === status);
    if (powertrain) results = results.filter((v) => v.powertrain.toLowerCase().includes(powertrain.toLowerCase()));
    if (maxCapacity) results = results.filter((v) => v.capacityKg <= Number(maxCapacity));

    res.json({
      success: true,
      source: 'In-Memory Telemetry Storage',
      count: results.length,
      vehicles: results
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/fleet/:id (Lecture 38: Route Parameters)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try Mongoose
    try {
      const vehicle = await Vehicle.findOne({ customId: id });
      if (vehicle) {
        return res.json({ success: true, vehicle });
      }
    } catch (e) {}

    const v = inMemoryFleet.find((item) => item.id === id || item.customId === id);
    if (!v) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found in fleet roster.` });
    }

    res.json({ success: true, vehicle: v });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/fleet (Lecture 38 & 39: Create with Role Protection)
router.post('/', verifyToken, requireRoles('admin', 'fleet_manager'), async (req, res, next) => {
  try {
    const { customId, name, category, capacityKg, powertrain, fuelEfficiency, costPerKm, driverName } = req.body;

    if (!customId || !name || !capacityKg) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: customId, name, and capacityKg are required.'
      });
    }

    const newVehicleData = {
      id: customId,
      customId,
      name,
      category: category || 'ICV 4.9T',
      capacityKg: Number(capacityKg),
      powertrain: powertrain || 'Diesel',
      fuelEfficiency: fuelEfficiency || '10.5 km/l',
      costPerKm: Number(costPerKm) || 10,
      status: 'available',
      driverName: driverName || 'Unassigned',
      currentLocation: 'Hub-1 Delhi'
    };

    // Try Mongoose Save
    try {
      const doc = new Vehicle(newVehicleData);
      await doc.save();
    } catch (e) {}

    inMemoryFleet.unshift(newVehicleData);

    res.status(201).json({
      success: true,
      message: `Vehicle ${newVehicleData.name} (${newVehicleData.customId}) successfully enlisted into fleet!`,
      vehicle: newVehicleData
    });
  } catch (err) {
    next(err);
  }
});

// 4. PUT /api/fleet/:id (Lecture 38: Update Vehicle)
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Mongoose Update
    try {
      await Vehicle.findOneAndUpdate({ customId: id }, updates, { runValidators: true });
    } catch (e) {}

    const idx = inMemoryFleet.findIndex((item) => item.id === id || item.customId === id);
    if (idx !== -1) {
      inMemoryFleet[idx] = { ...inMemoryFleet[idx], ...updates };
      return res.json({
        success: true,
        message: `Vehicle ${id} updated successfully.`,
        vehicle: inMemoryFleet[idx]
      });
    }

    res.status(404).json({ success: false, message: `Vehicle ${id} not found.` });
  } catch (err) {
    next(err);
  }
});

// 5. DELETE /api/fleet/:id (Lecture 38: Delete - Admin Protected)
router.delete('/:id', verifyToken, requireRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await Vehicle.findOneAndDelete({ customId: id });
    } catch (e) {}

    const initialLen = inMemoryFleet.length;
    inMemoryFleet = inMemoryFleet.filter((v) => v.id !== id && v.customId !== id);

    if (inMemoryFleet.length === initialLen) {
      return res.status(404).json({ success: false, message: `Vehicle ${id} not found.` });
    }

    res.json({ success: true, message: `Vehicle ${id} removed from fleet records.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.inMemoryFleet = inMemoryFleet;
