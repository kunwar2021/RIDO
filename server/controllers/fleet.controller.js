/**
 * ==============================================================================
 * Controller: Fleet Management (MVC Architecture)
 * ==============================================================================
 * Implements RESTful CRUD operations on fleet vehicles with Mongoose ORM
 * and robust query filtering (status, powertrain, capacity).
 */

const Vehicle = require('../models/Vehicle');

// Initial Seed Fleet Roster Fallback
let inMemoryFleet = [
  { id: 'tata-ace-ev', customId: 'tata-ace-ev', registrationNumber: 'DL-01-EV-2024', name: 'Tata Ace EV', category: 'LCV (Electric)', capacityKg: 1000, fuelEfficiency: '154 km/charge', powertrain: 'Electric (EV)', costPerKm: 3.2, status: 'available', driverName: 'Vikram Singh', currentLocation: 'Delhi Hub', batteryLevel: 94 },
  { id: 'ashok-dost', customId: 'ashok-dost', registrationNumber: 'DL-01-DL-8832', name: 'Ashok Leyland BADA DOST', category: 'Pick-up', capacityKg: 1860, fuelEfficiency: '13.5 km/l', powertrain: 'Diesel', costPerKm: 7.8, status: 'en-route', driverName: 'Rajesh Kumar', currentLocation: 'NH-44 Ambala', fuelLevel: 72 },
  { id: 'eicher-pro-2049', customId: 'eicher-pro-2049', registrationNumber: 'PB-10-EP-4921', name: 'Eicher Pro 2049', category: 'ICV 4.9T', capacityKg: 2500, fuelEfficiency: '10.5 km/l', powertrain: 'Diesel', costPerKm: 9.6, status: 'available', driverName: 'Harpreet Singh', currentLocation: 'Ludhiana Depot', fuelLevel: 88 },
  { id: 'tata-ultra-t7', customId: 'tata-ultra-t7', registrationNumber: 'CH-01-EV-7711', name: 'Tata Ultra T.7 Electric', category: 'ICV (Electric)', capacityKg: 3700, fuelEfficiency: '180 km/charge', powertrain: 'Electric (EV)', costPerKm: 5.4, status: 'charging', driverName: 'Amit Sharma', currentLocation: 'Chandigarh Depot', batteryLevel: 45 },
  { id: 'bharatbenz-1617r', customId: 'bharatbenz-1617r', registrationNumber: 'HR-26-BB-1617', name: 'BharatBenz 1617R', category: 'MCV 16T', capacityKg: 9500, fuelEfficiency: '6.2 km/l', powertrain: 'Diesel', costPerKm: 15.5, status: 'en-route', driverName: 'Gurpreet Singh', currentLocation: 'Karnal Toll Plaza', fuelLevel: 64 },
  { id: 'tata-signa-4825', customId: 'tata-signa-4825', registrationNumber: 'RJ-14-TS-4825', name: 'Tata Signa 4825.TK', category: 'HCV Tipper', capacityKg: 28000, fuelEfficiency: '3.4 km/l', powertrain: 'Diesel', costPerKm: 27.5, status: 'maintenance', driverName: 'Sukhwinder Singh', currentLocation: 'Jaipur Workshop', fuelLevel: 30 }
];

// 1. List all vehicles (GET /api/fleet)
exports.getAllVehicles = async (req, res, next) => {
  try {
    const { status, powertrain, maxCapacity } = req.query;

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
          vehicles,
          data: vehicles
        });
      }
    } catch (mongoErr) {}

    let results = [...inMemoryFleet];
    if (status) results = results.filter((v) => v.status === status);
    if (powertrain) results = results.filter((v) => v.powertrain.toLowerCase().includes(powertrain.toLowerCase()));
    if (maxCapacity) results = results.filter((v) => v.capacityKg <= Number(maxCapacity));

    res.json({
      success: true,
      source: 'In-Memory Telemetry Storage',
      count: results.length,
      vehicles: results,
      data: results
    });
  } catch (err) {
    next(err);
  }
};

// 2. Get single vehicle by ID (GET /api/fleet/:id)
exports.getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      let vehicle = null;
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        vehicle = await Vehicle.findById(id);
      }
      if (!vehicle) {
        vehicle = await Vehicle.findOne({ $or: [{ customId: id }, { registrationNumber: id }] });
      }
      if (vehicle) {
        return res.json({ success: true, vehicle, data: vehicle });
      }
    } catch (e) {}

    const v = inMemoryFleet.find((item) => item.id === id || item.customId === id || item.registrationNumber === id || item._id === id);
    if (!v) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found in fleet roster.` });
    }

    res.json({ success: true, vehicle: v, data: v });
  } catch (err) {
    next(err);
  }
};

// 3. Create new vehicle (POST /api/fleet)
exports.createVehicle = async (req, res, next) => {
  try {
    const customId = req.body.customId || req.body.registrationNumber || `VEH-${Date.now().toString().slice(-4)}`;
    const name = req.body.name || req.body.registrationNumber || 'Commercial Vehicle';
    const category = req.body.category || req.body.type || 'Commercial Fleet';
    const capacityKg = Number(req.body.capacityKg) || 5000;
    const powertrain = req.body.powertrain || (req.body.fuelType === 'electric' ? 'Electric (EV)' : (req.body.fuelType || 'Diesel'));
    const fuelEfficiency = req.body.fuelEfficiency || (powertrain.includes('Electric') ? '160 km/charge' : '10 km/l');
    const costPerKm = Number(req.body.costPerKm) || (powertrain.includes('Electric') ? 4.5 : 12.0);
    const driverName = req.body.driverName || 'Assigned Driver';
    const currentLocation = req.body.currentLocation || 'Central Logistics Depot';

    try {
      const exists = await Vehicle.findOne({ customId });
      if (exists) {
        return res.status(409).json({ success: false, message: `Vehicle ID '${customId}' already exists.` });
      }

      const newVehicle = new Vehicle({
        customId,
        registrationNumber: req.body.registrationNumber || customId,
        name,
        category,
        capacityKg,
        powertrain,
        fuelEfficiency,
        costPerKm,
        driverName,
        currentLocation,
        currentSpeed: Number(req.body.currentSpeed) || 0,
        batteryLevel: Number(req.body.batteryLevel) || 100
      });

      await newVehicle.save();
      return res.status(201).json({
        success: true,
        message: 'Vehicle registered in MongoDB.',
        vehicle: newVehicle,
        data: newVehicle
      });
    } catch (mongoErr) {}

    const fallbackVehicle = {
      _id: `mem-${Date.now()}`,
      id: customId,
      customId,
      registrationNumber: req.body.registrationNumber || customId,
      name,
      category,
      capacityKg,
      powertrain,
      costPerKm,
      status: 'available',
      driverName,
      currentLocation
    };
    inMemoryFleet.unshift(fallbackVehicle);

    res.status(201).json({
      success: true,
      message: 'Vehicle registered (In-Memory Fallback).',
      vehicle: fallbackVehicle,
      data: fallbackVehicle
    });
  } catch (err) {
    next(err);
  }
};

// 4. Update vehicle status / telemetry (PUT /api/fleet/:id)
exports.updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    try {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      const query = isObjectId ? { $or: [{ _id: id }, { customId: id }] } : { customId: id };
      const updatedVehicle = await Vehicle.findOneAndUpdate(
        query,
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (updatedVehicle) {
        return res.json({
          success: true,
          message: 'Vehicle telemetry updated in MongoDB.',
          vehicle: updatedVehicle,
          data: updatedVehicle
        });
      }
    } catch (mongoErr) {}

    const idx = inMemoryFleet.findIndex((item) => item.id === id || item.customId === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }

    inMemoryFleet[idx] = { ...inMemoryFleet[idx], ...updates };
    res.json({
      success: true,
      message: 'Vehicle telemetry updated (In-Memory).',
      vehicle: inMemoryFleet[idx],
      data: inMemoryFleet[idx]
    });
  } catch (err) {
    next(err);
  }
};

// 5. Delete vehicle (DELETE /api/fleet/:id)
exports.deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      const query = isObjectId ? { $or: [{ _id: id }, { customId: id }] } : { customId: id };
      const deleted = await Vehicle.findOneAndDelete(query);
      if (deleted) {
        return res.json({ success: true, message: `Vehicle '${id}' decommissioned from MongoDB.` });
      }
    } catch (mongoErr) {}

    const idx = inMemoryFleet.findIndex((item) => item.id === id || item.customId === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }

    inMemoryFleet.splice(idx, 1);
    res.json({ success: true, message: `Vehicle '${id}' decommissioned (In-Memory).` });
  } catch (err) {
    next(err);
  }
};
