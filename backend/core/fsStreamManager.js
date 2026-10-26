/**
 * ==============================================================================
 * Lectures 33 & 34: Node.js Core Modules (fs, path, Buffer, Streams, EventEmitter)
 * ==============================================================================
 * Implements:
 * 1. EventEmitter for event-driven logistics dispatch signals.
 * 2. Buffers for binary encoding/decoding of logistics manifests.
 * 3. File System (fs & fs.promises) and Path for structured logging.
 * 4. Readable & Transform Streams for zero-memory CSV export streaming.
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { Readable, Transform } = require('stream');

// ==============================================================================
// 1. Custom EventEmitter: Logistics Dispatch Signal Engine (Lecture 34)
// ==============================================================================
class DispatchEventEmitter extends EventEmitter {}
const dispatchEvents = new DispatchEventEmitter();

// In-Memory Realtime Event Audit Log
const liveEventLog = [];

dispatchEvents.on('trip_dispatched', (payload) => {
  const event = {
    event: 'trip_dispatched',
    timestamp: new Date().toISOString(),
    payload
  };
  liveEventLog.unshift(event);
  if (liveEventLog.length > 50) liveEventLog.pop();
  console.log(`[EventEmitter] Event 'trip_dispatched' fired for Trip: ${payload.tripCode}`);
});

dispatchEvents.on('telemetry_update', (payload) => {
  const event = {
    event: 'telemetry_update',
    timestamp: new Date().toISOString(),
    payload
  };
  liveEventLog.unshift(event);
  if (liveEventLog.length > 50) liveEventLog.pop();
});

// ==============================================================================
// 2. Buffer Demonstration: Security & Manifest Encoding (Lecture 34)
// ==============================================================================
const createManifestBuffer = (manifestData) => {
  const jsonStr = JSON.stringify(manifestData);
  // Allocate Buffer from string
  const buf = Buffer.from(jsonStr, 'utf-8');
  return {
    rawBufferLength: buf.length,
    base64Encoded: buf.toString('base64'),
    hexEncoded: buf.toString('hex')
  };
};

// ==============================================================================
// 3. File System Module (fs & path): Structured Dispatch Audit (Lecture 33)
// ==============================================================================
const logDirectory = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const appendDispatchLog = async (logEntry) => {
  const logFilePath = path.join(logDirectory, 'dispatch-audit.log');
  const entryStr = `[${new Date().toISOString()}] ${JSON.stringify(logEntry)}\n`;
  await fs.promises.appendFile(logFilePath, entryStr, 'utf-8');
};

const readRecentDispatchLogs = async () => {
  const logFilePath = path.join(logDirectory, 'dispatch-audit.log');
  try {
    if (!fs.existsSync(logFilePath)) return [];
    const content = await fs.promises.readFile(logFilePath, 'utf-8');
    return content.trim().split('\n').filter(Boolean).slice(-20);
  } catch (err) {
    console.warn('[FS Warning] Could not read audit logs:', err.message);
    return [];
  }
};

// ==============================================================================
// 4. Stream Pipeline: High-Throughput CSV Manifest Streamer (Lecture 34)
// ==============================================================================
const streamTripsAsCSV = (trips, responseStream) => {
  responseStream.setHeader('Content-Type', 'text/csv');
  responseStream.setHeader('Content-Disposition', 'attachment; filename="trips_manifest.csv"');

  // Readable Stream from in-memory objects
  const readable = Readable.from(trips);

  // Transform Stream: Converts Objects into CSV Rows
  let isFirstRow = true;
  const csvTransformer = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      if (isFirstRow) {
        this.push('TripCode,Origin,Destination,Vehicle,Driver,DistanceKm,Status\n');
        isFirstRow = false;
      }
      const row = `"${chunk.tripCode || chunk.id}","${chunk.origin || ''}","${chunk.destination || ''}","${chunk.vehicleCustomId || chunk.vehicleId || ''}","${chunk.driverName || ''}",${chunk.distanceKm || 0},"${chunk.status || 'Active'}"\n`;
      callback(null, row);
    }
  });

  readable.pipe(csvTransformer).pipe(responseStream);
};

module.exports = {
  dispatchEvents,
  liveEventLog,
  createManifestBuffer,
  appendDispatchLog,
  readRecentDispatchLogs,
  streamTripsAsCSV
};
