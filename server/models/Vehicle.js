/**
 * ==============================================================================
 * Lecture 41: Vehicle Schema & Model with Mongoose Validations & Types
 * ==============================================================================
 * Comprehensive logistics fleet vehicle schema demonstrating Mongoose field types,
 * range bounds, default values, and status enums.
 */

const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      required: [true, 'Vehicle Custom Identifier is required'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Vehicle model name is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Vehicle category is required'],
      enum: ['LCV (Electric)', 'Pick-up', 'ICV 4.9T', 'ICV (Electric)', 'MCV 16T', 'HCV Tipper', 'HCV 28T', 'Heavy Haulage']
    },
    capacityKg: {
      type: Number,
      required: [true, 'Payload capacity in kg is required'],
      min: [100, 'Payload capacity must be at least 100 kg'],
      max: [55000, 'Payload capacity cannot exceed 55,000 kg']
    },
    powertrain: {
      type: String,
      enum: ['Electric (EV)', 'Diesel', 'CNG', 'LNG'],
      default: 'Diesel'
    },
    fuelEfficiency: {
      type: String,
      required: true
    },
    costPerKm: {
      type: Number,
      required: [true, 'Operating cost per km is required'],
      min: [0, 'Cost per km cannot be negative']
    },
    status: {
      type: String,
      enum: ['available', 'en-route', 'maintenance', 'charging'],
      default: 'available'
    },
    driverName: {
      type: String,
      default: 'Unassigned'
    },
    currentLocation: {
      type: String,
      default: 'Central Logistics Hub'
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    fuelLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    odometerKm: {
      type: Number,
      default: 0
    },
    healthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 95
    }
  },
  {
    timestamps: true
  }
);

// Virtual property to check if vehicle is electric
vehicleSchema.virtual('isElectric').get(function () {
  return this.powertrain === 'Electric (EV)';
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
