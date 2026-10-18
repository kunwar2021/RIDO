/**
 * ==============================================================================
 * Lectures 39 & 41: User Schema & Model with Mongoose, Validation & bcrypt
 * ==============================================================================
 * Defines the user schema with strict validation, role-based authorization enums,
 * and pre-save password encryption via bcryptjs.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'fleet_manager', 'driver', 'company'],
        message: '{VALUE} is not a valid user role'
      },
      default: 'company'
    },
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
    },
    driverLicenseNumber: {
      type: String,
      trim: true
    },
    assignedVehicleId: {
      type: String,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true // Automatically generates createdAt and updatedAt
  }
);

// Mongoose Pre-Save Hook: Automatically hash password using bcrypt (Lecture 39 & 41)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance Method: Compare input password against stored hash (Lecture 39)
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
