/**
 * ==============================================================================
 * Lectures 37, 38, 39: Authentication & Security Routes (JWT, bcrypt, Validation)
 * ==============================================================================
 * Exposes:
 * POST /api/auth/register  -> User registration with bcrypt hashing
 * POST /api/auth/login     -> User authentication with JWT token issuance
 * GET  /api/auth/me        -> Protected profile route using verifyToken middleware
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// In-Memory User Fallback Store (when MongoDB is offline)
const inMemoryUsers = [
  {
    id: 'user_admin_01',
    name: 'Logistics Dispatch Admin',
    email: 'admin@rido.in',
    passwordHash: bcrypt.hashSync('Admin@123', 10),
    role: 'admin',
    phone: '9876543210'
  },
  {
    id: 'user_driver_01',
    name: 'Rajinder Singh',
    email: 'driver@rido.in',
    passwordHash: bcrypt.hashSync('Driver@123', 10),
    role: 'driver',
    phone: '9812345678'
  }
];

// 1. POST /api/auth/register (Lecture 38 & 39)
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Password must be at least 6 characters long.'
      });
    }

    // Try Mongoose first
    try {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      const newUser = new User({
        name,
        email: email.toLowerCase(),
        password,
        role: role || 'company',
        phone
      });

      await newUser.save();

      const token = jwt.sign(
        { id: newUser._id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'User registered successfully via Mongoose model.',
        token,
        user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
      });
    } catch (mongoErr) {
      // Fallback: Use in-memory store
      const exists = inMemoryUsers.find((u) => u.email === email.toLowerCase());
      if (exists) {
        return res.status(409).json({ success: false, message: 'User already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const fallbackUser = {
        id: 'usr_' + Date.now(),
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: role || 'company',
        phone
      };
      inMemoryUsers.push(fallbackUser);

      const token = jwt.sign(
        { id: fallbackUser.id, email: fallbackUser.email, role: fallbackUser.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'User registered successfully (In-Memory Fallback).',
        token,
        user: { id: fallbackUser.id, name: fallbackUser.name, email: fallbackUser.email, role: fallbackUser.role }
      });
    }
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/auth/login (Lecture 38 & 39)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required to sign in.'
      });
    }

    let authenticatedUser = null;

    // Check Mongoose
    try {
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (user) {
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          authenticatedUser = { id: user._id, name: user.name, email: user.email, role: user.role };
        }
      }
    } catch (mongoErr) {
      // Ignore if offline
    }

    // Check Fallback Store if not resolved
    if (!authenticatedUser) {
      const fbUser = inMemoryUsers.find((u) => u.email === email.toLowerCase());
      if (fbUser) {
        const isMatch = await bcrypt.compare(password, fbUser.passwordHash);
        if (isMatch) {
          authenticatedUser = { id: fbUser.id, name: fbUser.name, email: fbUser.email, role: fbUser.role };
        }
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: Email or password does not match our records.'
      });
    }

    // Sign JWT Token (Lecture 39)
    const token = jwt.sign(
      authenticatedUser,
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: `Welcome back, ${authenticatedUser.name}!`,
      token,
      user: authenticatedUser
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/auth/me (Lecture 39 - Protected Route)
router.get('/me', verifyToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Authorized: Token successfully verified.',
    user: req.user
  });
});

// 4. GET /api/auth/users - Return real users from MongoDB
router.get('/users', async (req, res, next) => {
  try {
    try {
      const users = await User.find({}, '-password');
      if (users && users.length > 0) {
        return res.json({
          success: true,
          count: users.length,
          users
        });
      }
    } catch (e) {}

    res.json({
      success: true,
      count: inMemoryUsers.length,
      users: inMemoryUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
