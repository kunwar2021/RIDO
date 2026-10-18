/**
 * ==============================================================================
 * RIDO — Full-Stack Curriculum Laboratory (`curriculum-lab.js`)
 * ==============================================================================
 * Maps, demonstrates, and verifies all 41 Lecture Curriculum Concepts:
 * - Lectures 1-24: JavaScript Core, ES6, DOM, Form Validation, Storage
 * - Continuous Assessment 1
 * - Lectures 25-30: Async JS, Promises, Async/Await, Fetch API
 * - Lectures 31-36: Node.js V8, Event Loop, Modules, fs, Streams, EventEmitter
 * - Lectures 37-41: Express REST, Middleware, JWT, Multer & MongoDB Mongoose
 */

const CurriculumLab = {
  activeTab: 'core-js',

  openModal() {
    let modal = document.getElementById('modal-curriculum-lab');
    if (!modal) {
      this.createModalDOM();
      modal = document.getElementById('modal-curriculum-lab');
    }
    if (modal) {
      modal.classList.remove('hidden');
      this.renderTab(this.activeTab);
    }
  },

  closeModal() {
    const modal = document.getElementById('modal-curriculum-lab');
    if (modal) modal.classList.add('hidden');
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.curr-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this.renderTab(tabId);
  },

  createModalDOM() {
    const div = document.createElement('div');
    div.id = 'modal-curriculum-lab';
    div.className = 'modal-overlay hidden';
    div.innerHTML = `
      <div class="modal-card w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-lg">🎓</span>
            <div>
              <h3 class="text-base font-extrabold tracking-tight">Full-Stack Curriculum Laboratory (Lectures 1–41)</h3>
              <p class="text-[11px] text-slate-400 font-medium">Interactive verification suite for JavaScript, Node.js, Express, JWT & MongoDB</p>
            </div>
          </div>
          <button class="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer" onclick="CurriculumLab.closeModal()">✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-slate-200 bg-slate-100 text-xs font-bold overflow-x-auto">
          <button class="curr-tab-btn px-4 py-3 border-b-2 border-transparent hover:text-orange-600 cursor-pointer active" data-tab="core-js" onclick="CurriculumLab.switchTab('core-js')">
            📘 L1–24: Core JS & ES6
          </button>
          <button class="curr-tab-btn px-4 py-3 border-b-2 border-transparent hover:text-orange-600 cursor-pointer" data-tab="async-js" onclick="CurriculumLab.switchTab('async-js')">
            ⚡ L25–30: Async & Fetch
          </button>
          <button class="curr-tab-btn px-4 py-3 border-b-2 border-transparent hover:text-orange-600 cursor-pointer" data-tab="node-core" onclick="CurriculumLab.switchTab('node-core')">
            🖥️ L31–36: Node.js Core
          </button>
          <button class="curr-tab-btn px-4 py-3 border-b-2 border-transparent hover:text-orange-600 cursor-pointer" data-tab="express-mongo" onclick="CurriculumLab.switchTab('express-mongo')">
            🔐 L37–41: Express, JWT & MongoDB
          </button>
        </div>

        <!-- Tab Body -->
        <div class="flex-1 overflow-y-auto p-6" id="curr-tab-content">
          <!-- Dynamic Content Injected Here -->
        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Continuous Assessment Verification Engine • RIDO Enterprise Platform</span>
          <button class="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700 cursor-pointer" onclick="CurriculumLab.closeModal()">Close Lab</button>
        </div>

      </div>
    `;
    document.body.appendChild(div);
  },

  renderTab(tabId) {
    const container = document.getElementById('curr-tab-content');
    if (!container) return;

    if (tabId === 'core-js') {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="p-4 rounded-xl bg-orange-50/70 border border-orange-200">
            <h4 class="font-extrabold text-orange-950 text-sm mb-1">Lectures 1–24: JavaScript Fundamentals, Arrays, DOM & Modern ES6</h4>
            <p class="text-xs text-orange-800">Demonstrates variable scoping, type conversions, array higher-order methods, object destructuring, and form validations in production.</p>
          </div>

          <!-- Interactive Test 1: Array Methods & Higher Order Functions -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lectures 11–14: Higher-Order Functions (map, filter, reduce, sort)</span>
              <button class="btn btn-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runArrayDemo()">Run Demo</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-array-demo">// Click 'Run Demo' to execute filter(), map(), reduce() and sort() on Fleet Telemetry weights...</pre>
          </div>

          <!-- Interactive Test 2: Objects & ES6 Destructuring -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lectures 15–16 & 24: Object Destructuring, Spread & Template Literals</span>
              <button class="btn btn-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runES6Demo()">Run Demo</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-es6-demo">// Click 'Run Demo' to test destructuring, rest/spread operators, and template strings...</pre>
          </div>

          <!-- Interactive Test 3: LocalStorage & SessionStorage -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lecture 23: Browser Storage (localStorage vs sessionStorage)</span>
              <button class="btn btn-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runStorageDemo()">Inspect Storage</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-storage-demo">// Click 'Inspect Storage' to view active keys across localStorage and sessionStorage...</pre>
          </div>
        </div>
      `;
    } else if (tabId === 'async-js') {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
            <h4 class="font-extrabold text-blue-950 text-sm mb-1">Lectures 25–30: Asynchronous JavaScript, Promises & Fetch API</h4>
            <p class="text-xs text-blue-800">Demonstrates Promise chaining, async/await error boundaries, and REST API consumption against the local Express backend.</p>
          </div>

          <!-- Interactive Test: Fetch Backend Telemetry with async/await -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lectures 27–28: Async/Await & Fetch API (/api/fleet)</span>
              <button class="btn btn-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runAsyncFetchDemo()">Fetch Fleet Telemetry</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-async-demo">// Click to execute asynchronous fetch('/api/fleet') using async/await...</pre>
          </div>
        </div>
      `;
    } else if (tabId === 'node-core') {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <h4 class="font-extrabold text-emerald-950 text-sm mb-1">Lectures 31–36: Node.js Core Architecture, V8, Event Loop & Streams</h4>
            <p class="text-xs text-emerald-800">Traces non-blocking execution order across Call Stack, microtasks, setImmediate and timers, plus live Streams & Buffers.</p>
          </div>

          <!-- Interactive Test: Event Loop Execution Order -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lectures 31–32: Node.js Event Loop Execution Order Trace</span>
              <button class="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runEventLoopDemo()">Trace Event Loop</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-event-loop-demo">// Click to query live Event Loop execution sequence from Node.js server...</pre>
          </div>

          <!-- Interactive Test: Buffers & EventEmitter -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lecture 34: Buffers & EventEmitter Real-Time Signals</span>
              <button class="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runBuffersAndEventsDemo()">Test Buffers & Events</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-buffers-demo">// Click to test Buffer allocation and EventEmitter subscriber queues...</pre>
          </div>

          <!-- Interactive Test: Streams CSV Export -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lecture 34: Node.js Transform Stream CSV Export</span>
              <a href="/api/trips/export/csv" class="btn btn-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1 rounded inline-block" download>Download Stream CSV</a>
            </div>
            <p class="text-xs text-slate-500 font-mono">Streams trips directly to HTTP response via pipeline without loading entire payload into RAM.</p>
          </div>
        </div>
      `;
    } else if (tabId === 'express-mongo') {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
            <h4 class="font-extrabold text-purple-950 text-sm mb-1">Lectures 37–41: Express REST, JWT Auth, Multer & MongoDB / Mongoose</h4>
            <p class="text-xs text-purple-800">Test live JWT token generation, role-based route verification, Multer document uploads, and Mongoose database state.</p>
          </div>

          <!-- Database Status -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lecture 41: MongoDB & Mongoose Schemas/Models Status</span>
              <button class="btn btn-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runDBStatusDemo()">Check DB Status</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-db-status">// Click to check live Mongoose connection and active models...</pre>
          </div>

          <!-- JWT Login & Verification -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lectures 38–39: JWT Token Generation & Protected Route (/api/auth/me)</span>
              <button class="btn btn-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runJWTDemo()">Test JWT Auth</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-jwt-demo">// Click to simulate login, receive JWT token, and verify against protected route...</pre>
          </div>

          <!-- Multer File Upload Demo -->
          <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">Lecture 40: Multer Proof of Delivery (POD) Upload</span>
              <input type="file" id="lab-pod-file" class="text-xs text-slate-600" accept="image/*,application/pdf" />
              <button class="btn btn-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1 rounded" onclick="CurriculumLab.runMulterUploadDemo()">Upload via Multer</button>
            </div>
            <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto" id="output-multer-demo">// Select a receipt image/PDF and click Upload via Multer...</pre>
          </div>
        </div>
      `;
    }
  },

  // --------------------------------------------------------------------------
  // Demos Implementation
  // --------------------------------------------------------------------------
  runArrayDemo() {
    const rawFleet = [
      { name: 'Tata Ace EV', weightKg: 1000, type: 'Electric', costKm: 3.2 },
      { name: 'Ashok Leyland DOST', weightKg: 1860, type: 'Diesel', costKm: 7.8 },
      { name: 'Eicher Pro 2049', weightKg: 2500, type: 'Diesel', costKm: 9.6 },
      { name: 'Tata Ultra T.7', weightKg: 3700, type: 'Electric', costKm: 5.4 },
      { name: 'BharatBenz 1617R', weightKg: 9500, type: 'Diesel', costKm: 15.5 }
    ];

    // Filter
    const electricVehicles = rawFleet.filter(v => v.type === 'Electric');
    // Map
    const vehicleLabels = rawFleet.map(v => `${v.name} (${v.weightKg} kg)`);
    // Reduce
    const totalFleetPayloadKg = rawFleet.reduce((sum, v) => sum + v.weightKg, 0);
    // Sort
    const sortedByCost = [...rawFleet].sort((a, b) => a.costKm - b.costKm);

    const report = {
      originalCount: rawFleet.length,
      filteredElectric: electricVehicles,
      mappedLabels: vehicleLabels,
      reducedTotalPayloadKg: totalFleetPayloadKg,
      sortedCheapestFirst: sortedByCost.map(v => `${v.name} (₹${v.costKm}/km)`)
    };

    document.getElementById('output-array-demo').textContent = JSON.stringify(report, null, 2);
  },

  runES6Demo() {
    const vehicle = {
      id: 'TRK-9812',
      model: 'Tata Ace EV',
      specs: { capacity: 1000, rangeKm: 154 },
      activeDriver: 'Vikram Singh'
    };

    // Destructuring
    const { model, specs: { capacity, rangeKm }, activeDriver } = vehicle;

    // Spread Operator
    const baseStops = ['Delhi', 'Sonipat'];
    const fullRoute = ['Gurugram', ...baseStops, 'Panipat', 'Karnal'];

    // Template Literals & Rest Operator
    const formatDispatchNotice = (title, ...stops) => {
      return `${title}: Dispatched across ${stops.length} checkpoints [${stops.join(' ➔ ')}]`;
    };

    const report = {
      destructuredVariables: { model, capacity, rangeKm, activeDriver },
      spreadArrayResult: fullRoute,
      restAndTemplateString: formatDispatchNotice('MISSION-CRITICAL ROUTE', ...fullRoute)
    };

    document.getElementById('output-es6-demo').textContent = JSON.stringify(report, null, 2);
  },

  runStorageDemo() {
    // Demonstration of setting and reading
    sessionStorage.setItem('rido_lab_session_token', 'temp_sess_' + Date.now());
    localStorage.setItem('rido_lab_persistent_pref', 'metric_units');

    const report = {
      localStorageItemCount: localStorage.length,
      sessionStorageItemCount: sessionStorage.length,
      localStorageSample: {
        rido_active_trip: localStorage.getItem('rido_active_trip') ? 'Stored (JSON Active)' : 'Not set',
        rido_user_session: localStorage.getItem('rido_user_session') ? 'Authenticated' : 'Guest',
        rido_lab_persistent_pref: localStorage.getItem('rido_lab_persistent_pref')
      },
      sessionStorageSample: {
        rido_lab_session_token: sessionStorage.getItem('rido_lab_session_token')
      }
    };

    document.getElementById('output-storage-demo').textContent = JSON.stringify(report, null, 2);
  },

  async runAsyncFetchDemo() {
    const el = document.getElementById('output-async-demo');
    el.textContent = 'Fetching from /api/fleet using async/await...';
    try {
      const res = await fetch('/api/fleet');
      const data = await res.json();
      el.textContent = JSON.stringify({
        httpStatus: res.status,
        statusText: res.statusText,
        data
      }, null, 2);
    } catch (err) {
      el.textContent = 'Fetch failed: ' + err.message;
    }
  },

  async runEventLoopDemo() {
    const el = document.getElementById('output-event-loop-demo');
    el.textContent = 'Querying Node.js Event Loop diagnostic trace...';
    try {
      const res = await fetch('/api/curriculum/event-loop');
      const data = await res.json();
      el.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      el.textContent = 'Error: ' + err.message;
    }
  },

  async runBuffersAndEventsDemo() {
    const el = document.getElementById('output-buffers-demo');
    el.textContent = 'Querying Buffers & EventEmitter states...';
    try {
      const bufRes = await fetch('/api/curriculum/buffers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testConsignment: 'RIDO-CONS-991', weightKg: 2400 })
      });
      const bufData = await bufRes.json();

      const evRes = await fetch('/api/curriculum/events');
      const evData = await evRes.json();

      el.textContent = JSON.stringify({
        buffersReport: bufData,
        eventEmitterReport: evData
      }, null, 2);
    } catch (err) {
      el.textContent = 'Error: ' + err.message;
    }
  },

  async runDBStatusDemo() {
    const el = document.getElementById('output-db-status');
    el.textContent = 'Querying MongoDB / Mongoose connection state...';
    try {
      const res = await fetch('/api/curriculum/db-status');
      const data = await res.json();
      el.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      el.textContent = 'Error: ' + err.message;
    }
  },

  async runJWTDemo() {
    const el = document.getElementById('output-jwt-demo');
    el.textContent = 'Executing JWT login handshake against /api/auth/login...';
    try {
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@rido.in', password: 'Admin@123' })
      });
      const loginData = await loginRes.json();

      if (!loginData.success) {
        el.textContent = 'Login rejected: ' + JSON.stringify(loginData, null, 2);
        return;
      }

      const token = loginData.token;
      // Now query protected route
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meData = await meRes.json();

      el.textContent = JSON.stringify({
        step1_loginResponse: loginData,
        step2_protectedMeRouteResponse: meData
      }, null, 2);
    } catch (err) {
      el.textContent = 'Error: ' + err.message;
    }
  },

  async runMulterUploadDemo() {
    const el = document.getElementById('output-multer-demo');
    const fileInput = document.getElementById('lab-pod-file');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      // Create a dummy text/png file programmatically to demonstrate upload
      const dummyBlob = new Blob(['Mock Proof of Delivery - Received in Good Condition'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('document', dummyBlob, 'mock_pod_receipt.txt');

      el.textContent = 'Uploading mock document via Multer (/api/upload/document)...';
      const res = await fetch('/api/upload/document', { method: 'POST', body: formData });
      const data = await res.json();
      el.textContent = JSON.stringify({ note: 'Auto-uploaded mock file (or select your own file above)', result: data }, null, 2);
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('pod', file);

    el.textContent = `Uploading ${file.name} (${file.size} bytes) via Multer (/api/upload/pod)...`;
    try {
      const res = await fetch('/api/upload/pod', { method: 'POST', body: formData });
      const data = await res.json();
      el.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      el.textContent = 'Upload error: ' + err.message;
    }
  }
};

window.CurriculumLab = CurriculumLab;
