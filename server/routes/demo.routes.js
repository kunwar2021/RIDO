/**
 * ==============================================================================
 * Lectures 31–36, 41: Curriculum Diagnostic & Live Demonstration Routes
 * ==============================================================================
 * Exposes live inspectable endpoints demonstrating the Node.js architecture:
 * GET /api/curriculum/event-loop      -> Live event loop phase trace (Call stack -> microtasks -> timers)
 * GET /api/curriculum/v8-diagnostics  -> V8 memory and runtime metrics
 * POST /api/curriculum/buffers        -> Buffer creation, base64 and hex encodings
 * GET /api/curriculum/events          -> Recent EventEmitter dispatch signals
 * GET /api/curriculum/fs-logs         -> fs.promises read of disk audit logs
 * GET /api/curriculum/db-status       -> Mongoose connection & schema status
 */

const express = require('express');
const router = express.Router();
const { getEventLoopExecutionOrder, getSystemV8Diagnostics } = require('../core/eventLoopDemo');
const { liveEventLog, createManifestBuffer, readRecentDispatchLogs } = require('../core/fsStreamManager');
const { getDBStatus } = require('../config/db');

// 1. Lecture 31 & 32: Event Loop Hierarchy Trace
router.get('/event-loop', async (req, res, next) => {
  try {
    const trace = await getEventLoopExecutionOrder();
    res.json({
      success: true,
      lecture: '31-32: Node.js V8 Engine & Event Loop Execution Order',
      description: 'Traces asynchronous non-blocking order: Call Stack -> process.nextTick -> Promise.then -> setImmediate -> setTimeout',
      executionOrder: trace
    });
  } catch (err) {
    next(err);
  }
});

// 2. Lecture 31: V8 Memory & Runtime Diagnostics
router.get('/v8-diagnostics', (req, res) => {
  res.json({
    success: true,
    lecture: '31: V8 Engine, REPL, Process & Global Objects',
    system: getSystemV8Diagnostics()
  });
});

// 3. Lecture 34: Buffers Demonstration
router.post('/buffers', (req, res) => {
  const data = req.body || { consignmentId: 'CONS-9821', priority: 'High', origin: 'Delhi', destination: 'Jaipur' };
  const bufferReport = createManifestBuffer(data);
  res.json({
    success: true,
    lecture: '34: Buffers & Binary Encodings',
    inputData: data,
    bufferReport
  });
});

// 4. Lecture 34: EventEmitter Real-time Audit
router.get('/events', (req, res) => {
  res.json({
    success: true,
    lecture: '34: EventEmitter & Publish/Subscribe Messaging',
    activeEventsCount: liveEventLog.length,
    events: liveEventLog
  });
});

// 5. Lecture 33: File System (fs & path) Logs
router.get('/fs-logs', async (req, res, next) => {
  try {
    const logs = await readRecentDispatchLogs();
    res.json({
      success: true,
      lecture: '33: File System (fs.promises) & Path Module',
      logEntriesCount: logs.length,
      logs
    });
  } catch (err) {
    next(err);
  }
});

// 6. Lecture 41: Database Status & Mongoose ORM
router.get('/db-status', (req, res) => {
  res.json({
    success: true,
    lecture: '41: MongoDB, Mongoose Schemas & Models',
    database: getDBStatus()
  });
});

// 7. Seed Fresh Data on demand (Vehicles, Users, Trips)
router.post('/seed-fresh-data', async (req, res, next) => {
  try {
    const { seedFreshDatabase } = require('../config/seed');
    const result = await seedFreshDatabase(true);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
