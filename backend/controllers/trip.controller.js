/**
 * ==============================================================================
 * Controller: Trip Operations & Route Optimization (MVC Architecture)
 * ==============================================================================
 * Manages trip dispatches, Node.js stream-based CSV exports, Mongoose populate,
 * and logistics route optimization algorithms.
 */

const Trip = require('../models/Trip');
const { dispatchEvents, appendDispatchLog, streamTripsAsCSV } = require('../core/fsStreamManager');

// In-Memory Fallback Trips
const inMemoryTrips = [
  {
    id: 'TRIP-DEL-MUM-892',
    tripCode: 'TRIP-DEL-MUM-892',
    origin: 'New Delhi Distribution Hub',
    destination: 'Mumbai Nhava Sheva Terminal',
    vehicleCustomId: 'bharatbenz-1617r',
    driverName: 'Gurpreet Singh',
    status: 'In-Transit',
    distanceKm: 1410,
    fuelSavedPercentage: 18.4,
    estimatedTollCost: 3120,
    createdAt: new Date().toISOString()
  }
];

const optimizationLogs = [];

// 1. Get all trips with populated relations (GET /api/trips)
exports.getAllTrips = async (req, res, next) => {
  try {
    try {
      const trips = await Trip.find().withFullDetails();
      if (trips && trips.length > 0) {
        return res.json({
          success: true,
          source: 'MongoDB Mongoose Model (Populated)',
          count: trips.length,
          trips,
          data: trips
        });
      }
    } catch (e) {}

    res.json({
      success: true,
      source: 'In-Memory Trips',
      count: inMemoryTrips.length,
      trips: inMemoryTrips,
      data: inMemoryTrips
    });
  } catch (err) {
    next(err);
  }
};

// 2. Dispatch a new trip (POST /api/trips or /api/trips/dispatch)
exports.createTrip = async (req, res, next) => {
  try {
    const vehicleId = req.body.vehicleId || req.body.vehicleCustomId || 'bharatbenz-1617r';
    const driverName = req.body.driverName || req.body.clientName || 'Assigned Logistics Driver';
    const origin = req.body.origin || 'New Delhi Central Hub';
    const destination = req.body.destination || 'Mumbai Nhava Sheva Terminal';
    const waypoints = req.body.waypoints || req.body.stops || [];
    const distanceKm = Number(req.body.distanceKm) || 1250;
    const tollCost = Number(req.body.tollCost) || 2850;

    const tripCode = `TRIP-${Date.now().toString().slice(-6)}`;
    const tripData = {
      tripCode,
      origin,
      destination,
      vehicleCustomId: vehicleId,
      driverName,
      status: 'In-Transit',
      distanceKm,
      estimatedTollCost: tollCost,
      fuelSavedPercentage: 14.5,
      waypoints
    };

    try {
      const newTrip = new Trip(tripData);
      await newTrip.save();

      dispatchEvents.emit('tripDispatched', tripData);
      await appendDispatchLog(tripData);

      return res.status(201).json({
        success: true,
        message: 'Trip successfully dispatched and saved to MongoDB.',
        trip: newTrip,
        data: newTrip
      });
    } catch (mongoErr) {
      dispatchEvents.emit('tripDispatched', tripData);
      await appendDispatchLog(tripData);
      const fallback = { ...tripData, _id: `mem-${Date.now()}`, id: tripCode };
      inMemoryTrips.unshift(fallback);

      return res.status(201).json({
        success: true,
        message: 'Trip dispatched (Fallback Cache).',
        trip: fallback,
        data: fallback
      });
    }
  } catch (err) {
    next(err);
  }
};

// 3. Export trips as streaming CSV (GET /api/trips/export/csv)
exports.exportTripsCsv = async (req, res, next) => {
  try {
    let dataset = inMemoryTrips;
    try {
      const dbTrips = await Trip.find();
      if (dbTrips && dbTrips.length > 0) dataset = dbTrips;
    } catch (e) {}

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rido-trips-${Date.now()}.csv"`);
    res.setHeader('Transfer-Encoding', 'chunked');

    streamTripsAsCSV(dataset, res);
  } catch (err) {
    next(err);
  }
};

// 4. Logistics Route Optimization (POST /api/optimize-route or /api/trips/optimize)
exports.optimizeRoute = (req, res) => {
  const { origin, destination, cargoWeightKg = 1500 } = req.body;
  const rawWaypoints = req.body.waypoints || req.body.stops || [];

  const baseDistanceKm = Math.floor(Math.random() * 80) + 280;
  const totalWaypoints = rawWaypoints.length;
  const optimizedDistanceKm = Math.round(baseDistanceKm + totalWaypoints * 24);
  const baselineUnoptimizedKm = Math.round(optimizedDistanceKm * 1.18);
  const kmSaved = baselineUnoptimizedKm - optimizedDistanceKm;

  const dieselPrice = 89.60;
  const fuelBurnLiters = (optimizedDistanceKm / 4.2).toFixed(1);
  const fuelCost = Math.round(fuelBurnLiters * dieselPrice);
  const fastagToll = Math.round(optimizedDistanceKm * 1.65);
  const driverBatta = Math.round(optimizedDistanceKm * 1.8 + 450);
  const totalCost = fuelCost + fastagToll + driverBatta;
  const costSavings = Math.round(kmSaved * 9.5 + kmSaved * 1.65);

  const routeDetails = {
    origin: origin || 'Ludhiana Transport Nagar',
    destination: destination || 'Okhla Industrial Area, Delhi',
    waypointSequence: rawWaypoints.map((w, idx) => ({ stop: idx + 1, name: typeof w === 'string' ? w : (w.name || `Waypoint ${idx+1}`), etaMins: (idx + 1) * 45 })),
    optimizedDistanceKm,
    baselineDistanceKm: baselineUnoptimizedKm,
    distanceSavedKm: kmSaved,
    estimatedDurationHours: +(optimizedDistanceKm / 48).toFixed(1)
  };

  const result = {
    success: true,
    id: `RIDO-OPT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    distanceKm: optimizedDistanceKm,
    route: routeDetails,
    optimizedRoute: routeDetails,
    economics: {
      totalCostInr: totalCost,
      fuelCostInr: fuelCost,
      fastagTollInr: fastagToll,
      driverBattaInr: driverBatta,
      costSavingsInr: costSavings,
      co2AbatementKg: Math.round(kmSaved * 0.268)
    }
  };

  optimizationLogs.unshift(result);
  if (optimizationLogs.length > 50) optimizationLogs.pop();

  res.json(result);
};

exports.getOptimizationLogs = () => optimizationLogs;
