/**
 * ==============================================================================
 * Lecture 41: MongoDB, MongoDB Atlas & Mongoose Database Layer (Cloud & Local)
 * ==============================================================================
 * Manages database connection lifecycle with automated resilient fallback to an
 * in-memory store if MongoDB instance is not currently active, ensuring zero
 * downtime during local development, deployment, and presentation environments.
 */

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://bansalkunwar753_db_user:etbowgPjIMeM4Ycp@cluster0.lrchh2q.mongodb.net/rido_logistics?retryWrites=true&w=majority';
  const isCloud = uri.includes('mongodb+srv://') || uri.includes('@');

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isCloud ? 8000 : 3000,
    });
    isConnected = true;
    console.log(`✅ [MongoDB] Connected successfully to: ${isCloud ? 'MongoDB Atlas (Cloud Cluster)' : 'Local Community Server'}`);
    console.log(`📡 [MongoDB] Host: ${conn.connection.host} | DB: ${conn.connection.name}`);
    const { seedFreshDatabase } = require('./seed');
    await seedFreshDatabase(false);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`⚠️ [MongoDB Warning] Database connection deferred (${error.message}).`);
    console.log('🛡️ [MongoDB Fallback] Operating in resilient InMemory-backed hybrid mode.');
    return false;
  }
};

const getDBStatus = () => ({
  connected: isConnected,
  readyState: mongoose.connection.readyState, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  host: isConnected ? mongoose.connection.host : 'local-in-memory-fallback',
  mode: isConnected ? (process.env.MONGODB_URI?.includes('+srv') ? 'MongoDB Atlas (Cloud)' : 'MongoDB Local Database') : 'Resilient In-Memory Storage'
});

module.exports = { connectDB, getDBStatus };
