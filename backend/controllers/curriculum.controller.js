/**
 * ==============================================================================
 * Controller: Curriculum Diagnostics & Architecture Demos (MVC Architecture)
 * ==============================================================================
 * Exposes live test endpoints demonstrating Node.js architecture:
 * Event Loop execution order, V8 heap memory, Buffers, Streams, and EventEmitter.
 */

const { getEventLoopExecutionOrder, getSystemV8Diagnostics } = require('../core/eventLoopDemo');
const { liveEventLog, createManifestBuffer, readRecentDispatchLogs } = require('../core/fsStreamManager');
const { getDBStatus } = require('../config/db');

// 1. Event Loop Hierarchy Trace (GET /api/curriculum/event-loop)
exports.getEventLoopTrace = async (req, res, next) => {
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
};

// 2. V8 Memory & Runtime Diagnostics (GET /api/curriculum/v8-diagnostics)
exports.getV8Diagnostics = (req, res) => {
  res.json({
    success: true,
    lecture: '31: V8 Engine, REPL, Process & Global Objects',
    system: getSystemV8Diagnostics()
  });
};

// 3. Binary Buffers Demonstration (POST /api/curriculum/buffers)
exports.testBuffers = (req, res) => {
  const data = req.body || { consignmentId: 'CONS-9821', priority: 'High', origin: 'Delhi', destination: 'Jaipur' };
  const bufferReport = createManifestBuffer(data);
  res.json({
    success: true,
    lecture: '34: Buffers & Binary Encodings',
    inputData: data,
    bufferReport
  });
};

// 4. EventEmitter Real-time Audit (GET /api/curriculum/events)
exports.testEventEmitter = (req, res) => {
  res.json({
    success: true,
    lecture: '34: EventEmitter & Publish/Subscribe Messaging',
    activeEventsCount: liveEventLog.length,
    events: liveEventLog
  });
};

// 5. File System (fs & path) Logs (GET /api/curriculum/fs-logs)
exports.getFsLogs = async (req, res, next) => {
  try {
    const logs = await readRecentDispatchLogs();
    res.json({
      success: true,
      lecture: '33: File System (fs.promises) & Path Module',
      logCount: logs.length,
      logs
    });
  } catch (err) {
    next(err);
  }
};

// 6. Database Connection Status (GET /api/curriculum/db-status)
exports.getDatabaseStatus = (req, res) => {
  res.json({
    success: true,
    lecture: '41: MongoDB, Mongoose Schemas & Cloud Persistence',
    database: getDBStatus()
  });
};
