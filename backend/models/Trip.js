/**
 * ==============================================================================
 * Lecture 41: Trip Schema with Mongoose Relations & Populate()
 * ==============================================================================
 * Demonstrates relational schemas in MongoDB using ObjectId references to
 * 'Vehicle' and 'User' (Driver), as well as embedded Waypoint subdocuments.
 */

const mongoose = require('mongoose');

// Embedded Waypoint Subdocument Schema
const waypointSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  customer: { type: String, required: true },
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  weightKg: { type: Number, default: 0 },
  priority: { type: String, enum: ['Urgent', 'High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'En-Route', 'Delivered', 'Cancelled'], default: 'Pending' }
}, { _id: false });

const tripSchema = new mongoose.Schema(
  {
    tripCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    origin: {
      type: String,
      required: true
    },
    destination: {
      type: String,
      required: true
    },
    // Relational Reference to Vehicle Model (Lecture 41: Populate)
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: false
    },
    vehicleCustomId: {
      type: String,
      required: true
    },
    // Relational Reference to User/Driver Model (Lecture 41: Populate)
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    driverName: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Assigned', 'In-Transit', 'Completed', 'Cancelled'],
      default: 'Assigned'
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0
    },
    fuelSavedPercentage: {
      type: Number,
      default: 0
    },
    estimatedTollCost: {
      type: Number,
      default: 0
    },
    proofOfDeliveryUrl: {
      type: String,
      default: null
    },
    // Embedded Subdocuments Array
    waypoints: [waypointSubSchema]
  },
  {
    timestamps: true
  }
);

// Query Helper to auto-populate vehicle and driver
tripSchema.query.withFullDetails = function () {
  return this.populate('vehicle', 'name category powertrain fuelEfficiency capacityKg')
             .populate('driver', 'name email phone driverLicenseNumber');
};

module.exports = mongoose.model('Trip', tripSchema);
