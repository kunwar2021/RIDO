/**
 * ==============================================================================
 * Lecture 41: MongoDB, MongoDB Atlas & Mongoose Database Layer
 * ==============================================================================
 * Manages database connection lifecycle with automated resilient fallback to an
 * in-memory store if MongoDB instance is not currently active, ensuring zero
 * downtime during local development and presentation environments.
 */

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rido_logistics';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout to avoid hanging if offline
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    console.log(`[MongoDB] Database Name: ${conn.connection.name}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB Warning] Live MongoDB daemon not reachable (${error.message}).`);
    console.log('[MongoDB Fallback] Operating in resilient InMemory-backed hybrid mode.');
    return false;
  }
};

const getDBStatus = () => ({
  connected: isConnected,
  readyState: mongoose.connection.readyState, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  host: isConnected ? mongoose.connection.host : 'local-in-memory-fallback',
  mode: isConnected ? 'Mongoose Live Database' : 'Resilient In-Memory Storage'
});

module.exports = { connectDB, getDBStatus };
