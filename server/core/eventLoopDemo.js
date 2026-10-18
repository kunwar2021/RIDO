/**
 * ==============================================================================
 * Lectures 31 & 32: Node.js Architecture, V8 Engine & Event Loop Diagnostics
 * ==============================================================================
 * Demonstrates the asynchronous single-threaded Event Loop execution hierarchy:
 * 1. Synchronous Code (Call Stack)
 * 2. Microtask Queue (process.nextTick() followed by resolved Promises)
 * 3. Macrotask Queue (Timers: setTimeout / setInterval)
 * 4. Check Phase (setImmediate)
 * 5. Close Phase
 */

const getEventLoopExecutionOrder = () => {
  return new Promise((resolve) => {
    const trace = [];

    // 1. Call Stack (Synchronous)
    trace.push({ phase: 'Call Stack', label: '1. Synchronous Task Initialized', time: Date.now() });

    // 2. Microtasks: process.nextTick (Highest microtask priority)
    process.nextTick(() => {
      trace.push({ phase: 'Microtask Queue (nextTick)', label: '3. process.nextTick() Executed', time: Date.now() });
    });

    // 3. Microtasks: Promise.then (Second microtask priority)
    Promise.resolve().then(() => {
      trace.push({ phase: 'Microtask Queue (Promise)', label: '4. Promise.then() Executed', time: Date.now() });
    });

    // 4. Check Phase: setImmediate() (Runs after I/O callbacks)
    setImmediate(() => {
      trace.push({ phase: 'Check Phase (setImmediate)', label: '5. setImmediate() Executed', time: Date.now() });
    });

    // 5. Timers Phase: setTimeout(..., 0)
    setTimeout(() => {
      trace.push({ phase: 'Timers Phase (setTimeout 0ms)', label: '6. setTimeout(0) Executed', time: Date.now() });
      resolve(trace);
    }, 10);

    // Call Stack Continues
    trace.push({ phase: 'Call Stack', label: '2. Synchronous Block Concluded', time: Date.now() });
  });
};

const getSystemV8Diagnostics = () => {
  const mem = process.memoryUsage();
  return {
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: {
      rss: +(mem.rss / 1024 / 1024).toFixed(2),
      heapTotal: +(mem.heapTotal / 1024 / 1024).toFixed(2),
      heapUsed: +(mem.heapUsed / 1024 / 1024).toFixed(2),
      external: +(mem.external / 1024 / 1024).toFixed(2)
    }
  };
};

module.exports = {
  getEventLoopExecutionOrder,
  getSystemV8Diagnostics
};
