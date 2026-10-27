/**
 * ==============================================================================
 * MongoDB Database Initializer & Fresh Data Seeder
 * ==============================================================================
 * Automatically populates MongoDB with fresh, realistic logistics data
 * (Vehicles, Users, Active Trips, and Telemetry) so the platform is immediately
 * active with live, fresh records upon login.
 */

const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');

const seedVehicles = [
  {
    customId: 'tata-ace-ev',
    name: 'Tata Ace EV',
    category: 'LCV (Electric)',
    capacityKg: 1000,
    powertrain: 'Electric (EV)',
    fuelEfficiency: '154 km/charge',
    costPerKm: 3.2,
    status: 'available',
    driverName: 'Vikram Singh',
    currentLocation: 'Delhi Okhla Hub',
    batteryLevel: 94,
    fuelLevel: 100,
    odometerKm: 12450,
    healthScore: 98
  },
  {
    customId: 'ashok-dost',
    name: 'Ashok Leyland BADA DOST',
    category: 'Pick-up',
    capacityKg: 1860,
    powertrain: 'Diesel',
    fuelEfficiency: '13.5 km/l',
    costPerKm: 7.8,
    status: 'en-route',
    driverName: 'Rajesh Kumar',
    currentLocation: 'NH-44 Ambala Bypass',
    batteryLevel: null,
    fuelLevel: 72,
    odometerKm: 38920,
    healthScore: 94
  },
  {
    customId: 'eicher-pro-2049',
    name: 'Eicher Pro 2049',
    category: 'ICV 4.9T',
    capacityKg: 2500,
    powertrain: 'Diesel',
    fuelEfficiency: '10.5 km/l',
    costPerKm: 9.6,
    status: 'available',
    driverName: 'Harpreet Singh',
    currentLocation: 'Ludhiana GT Road Depot',
    batteryLevel: null,
    fuelLevel: 88,
    odometerKm: 29400,
    healthScore: 96
  },
  {
    customId: 'tata-ultra-t7',
    name: 'Tata Ultra T.7 Electric',
    category: 'ICV (Electric)',
    capacityKg: 3700,
    powertrain: 'Electric (EV)',
    fuelEfficiency: '180 km/charge',
    costPerKm: 5.4,
    status: 'charging',
    driverName: 'Amit Sharma',
    currentLocation: 'Chandigarh EV Depot',
    batteryLevel: 68,
    fuelLevel: 100,
    odometerKm: 15200,
    healthScore: 99
  },
  {
    customId: 'bharatbenz-1617r',
    name: 'BharatBenz 1617R',
    category: 'MCV 16T',
    capacityKg: 9500,
    powertrain: 'Diesel',
    fuelEfficiency: '6.2 km/l',
    costPerKm: 15.5,
    status: 'en-route',
    driverName: 'Gurpreet Singh',
    currentLocation: 'Karnal Toll Plaza Corridor',
    batteryLevel: null,
    fuelLevel: 64,
    odometerKm: 64200,
    healthScore: 91
  },
  {
    customId: 'tata-signa-4825',
    name: 'Tata Signa 4825.TK',
    category: 'HCV Tipper',
    capacityKg: 28000,
    powertrain: 'Diesel',
    fuelEfficiency: '3.4 km/l',
    costPerKm: 27.5,
    status: 'maintenance',
    driverName: 'Sukhwinder Singh',
    currentLocation: 'Jaipur Heavy Repair Workshop',
    batteryLevel: null,
    fuelLevel: 35,
    odometerKm: 112000,
    healthScore: 78
  }
];

const seedUsers = [
  {
    name: 'System Admin',
    email: 'admin@ridosaathi.com',
    password: 'Admin@123',
    role: 'admin',
    phone: '9800000001'
  },
  {
    name: 'Logistics Dispatch Admin',
    email: 'admin@rido.in',
    password: 'Admin@123',
    role: 'admin',
    phone: '9876543211'
  },
  {
    name: 'Rajinder Singh',
    email: 'driver.rajinder@transindia.in',
    password: 'Driver@123',
    role: 'driver',
    phone: '9876543210',
    driverLicenseNumber: 'DL-0420110012345',
    assignedVehicleId: 'tata-ace-ev'
  },
  {
    name: 'Vikram Mehta',
    email: 'admin@transindia.in',
    password: 'Company@123',
    role: 'company',
    phone: '9812345678'
  }
];

const seedTrips = [
  {
    tripCode: 'TRP-1001',
    origin: 'New Delhi Distribution Hub',
    destination: 'Mumbai Nhava Sheva Terminal',
    vehicleCustomId: 'bharatbenz-1617r',
    driverName: 'Gurpreet Singh',
    status: 'In-Transit',
    distanceKm: 1410,
    fuelSavedPercentage: 18.4,
    estimatedTollCost: 3120,
    waypoints: [
      { id: 'WP-1', customer: 'Jaipur Logistics Hub', address: 'VKIA Industrial Area, Jaipur', lat: 26.9678, lng: 75.7689, weightKg: 1200, priority: 'Urgent', status: 'Delivered' },
      { id: 'WP-2', customer: 'Vadodara Terminal', address: 'Makarpura GIDC, Vadodara', lat: 22.2530, lng: 73.1890, weightKg: 2400, priority: 'High', status: 'En-Route' }
    ]
  },
  {
    tripCode: 'TRP-1002',
    origin: 'Ludhiana Transport Nagar',
    destination: 'Okhla Industrial Area, Delhi',
    vehicleCustomId: 'eicher-pro-2049',
    driverName: 'Harpreet Singh',
    status: 'Assigned',
    distanceKm: 315,
    fuelSavedPercentage: 15.2,
    estimatedTollCost: 680,
    waypoints: [
      { id: 'WP-3', customer: 'Ambala Cantt Wholesale', address: 'GT Road Ambala', lat: 30.3610, lng: 76.8485, weightKg: 850, priority: 'Medium', status: 'Pending' }
    ]
  }
];

async function seedFreshDatabase(force = false) {
  try {
    const vehicleCount = await Vehicle.countDocuments();
    if (vehicleCount === 0 || force) {
      if (force) await Vehicle.deleteMany({});
      await Vehicle.insertMany(seedVehicles);
      console.log(`[MongoDB Seed] Inserted ${seedVehicles.length} fresh fleet vehicles.`);
    }

    // Seed Users
    for (const u of seedUsers) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        const newUser = new User(u);
        await newUser.save();
        console.log(`[MongoDB Seed] Created user: ${u.email} (${u.role})`);
      }
    }

    // Seed Trips (Only if force === true, otherwise leave at 0 for live presentation)
    if (force) {
      await Trip.deleteMany({});
      
      const sampleVeh = await Vehicle.findOne({ customId: 'bharatbenz-1617r' });
      const sampleDriver = await User.findOne({ role: 'driver' });

      for (const t of seedTrips) {
        const tripDoc = new Trip({
          ...t,
          vehicle: sampleVeh ? sampleVeh._id : undefined,
          driver: sampleDriver ? sampleDriver._id : undefined
        });
        await tripDoc.save();
      }
      console.log(`[MongoDB Seed] Inserted ${seedTrips.length} fresh active trips.`);
    }

    return {
      success: true,
      message: 'MongoDB database initialized with fresh vehicles, users, and trips.',
      vehiclesCount: await Vehicle.countDocuments(),
      usersCount: await User.countDocuments(),
      tripsCount: await Trip.countDocuments()
    };
  } catch (error) {
    console.error('[MongoDB Seed Error]:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { seedFreshDatabase };
