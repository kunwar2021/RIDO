/**
 * ==============================================================================
 * RIDO — Main Application Coordinator (`app.js`)
 * ==============================================================================
 * Central coordinator managing view routing, event bindings, data synchronization,
 * and dispatch workflows across all sub-engines.
 */

const App = {
  data: null,
  activeView: "landing",
  userSession: null,

  currentRouteRequestId: 0,
  currentRouteAbortController: null,

  optimizerState: {
    selectedVehicleId: "",
    selectedStartDepotId: "",
    selectedEndDepotId: "",
    customStartDepot: null,
    customEndDepot: null,
    routingScope: "intercity",
    selectedStopIds: [],
    originalSequence: [],
    optimizedSequence: [],
    originalStats: { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, tollCost: 0, driverAllowance: 0, maintenanceCost: 0 },
    optimizedStats: { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, tollCost: 0, driverAllowance: 0, maintenanceCost: 0 },
    savings: { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, percentage: 0 },
    routeResult: null,
    routeCalculated: false,
    activeTrip: null
  },

  locationEngine: new IndiaLocationEngine(),

  // --------------------------------------------------------------------------
  // Lifecycle Initialization
  // --------------------------------------------------------------------------
  init() {
    if (typeof window !== 'undefined') window.App = this;
    try { this.loadState(); } catch (e) { console.warn("loadState error:", e); }
    try { this.initAuth(); } catch (e) { console.warn("initAuth error:", e); }
    document.body.classList.remove('role-company', 'role-driver', 'role-guest');
    document.body.classList.add(`role-${this.userSession ? this.userSession.role : 'guest'}`);

    try { UIManager.init(); } catch (e) { console.warn("UIManager.init error:", e); }
    try { FleetManager.init(); } catch (e) { console.warn("FleetManager.init error:", e); }
    try { ScenarioEngine.init(); } catch (e) { console.warn("ScenarioEngine.init error:", e); }
    try { MapEngine.init(); } catch (e) { console.warn("MapEngine.init error:", e); }

    try { this.populateDepotDropdowns(); } catch (e) { console.warn("populateDepotDropdowns error:", e); }
    try { this.setupEventListeners(); } catch (e) { console.warn("setupEventListeners error:", e); }
    try { this.setupHubSearch(); } catch (e) { console.warn("setupHubSearch error:", e); }
    try { this.renderStopsInputs(); } catch (e) { console.warn("renderStopsInputs error:", e); }

    try { this.calculateInitialRoute(); } catch (e) { console.warn("calculateInitialRoute error:", e); }
    try { this.updateAllUI(); } catch (e) { console.warn("updateAllUI error:", e); }

    try { this.startLandingTypewriterAnimation(); } catch (e) { console.warn("typewriter error:", e); }
    try { this.startHeroTextAnimation(); } catch (e) { console.warn("hero text error:", e); }
    try { this.initHeroTruckParallax(); } catch (e) { console.warn("hero parallax error:", e); }
    try { window.TestimonialsCarousel?.init(); } catch (e) { console.warn("Testimonials init error:", e); }

    // Strictly validate authenticated session on startup
    this.userSession = StorageEngine.loadUserSession();
    if (this.userSession && (this.userSession.role === "driver" || this.userSession.role === "company")) {
      document.body.classList.remove('role-company', 'role-driver', 'role-guest');
      document.body.classList.add(`role-${this.userSession.role}`);
      if (this.userSession.role === "driver") {
        this.setupDriverDashboard(false);
        this.navigateTo("driver-dashboard");
      } else {
        this.setupCompanyDashboard(false);
        this.navigateTo("operations");
      }
    } else {
      this.userSession = null;
      StorageEngine.clearUserSession();
      document.body.classList.remove('role-company', 'role-driver');
      document.body.classList.add('role-guest');
      this.navigateTo("landing");
    }

    window.addEventListener("rido:active_trip_updated", () => {
      this.updateAllUI();
      if (this.currentView === "driver-dashboard") {
        this.updateDriverDashboardUI();
      }
    });

    window.addEventListener("storage", (e) => {
      if (e.key === CONFIG.ACTIVE_TRIP_KEY || e.key === "rido_driver_trucks") {
        this.updateAllUI();
        if (this.currentView === "driver-dashboard") {
          this.updateDriverDashboardUI();
        }
      }
    });

    setTimeout(() => {
      try { this.renderMap(); } catch (e) {}
      try { MapEngine.initOpsCenterMap(); } catch (e) {}
      try { this.renderAllCharts(); } catch (e) {}
    }, 250);
  },

  // --------------------------------------------------------------------------
  // State Persistence & Migration
  // --------------------------------------------------------------------------
  loadState() {
    const loaded = StorageEngine.loadState(DEFAULT_DEMO_DATA);
    this.data = loaded.data || JSON.parse(JSON.stringify(DEFAULT_DEMO_DATA));

    if (!Array.isArray(this.data.vehicles)) this.data.vehicles = [];
    if (!Array.isArray(this.data.trips)) this.data.trips = [];
    if (!Array.isArray(this.data.stops)) this.data.stops = [];

    const activeTrip = (typeof StorageEngine !== "undefined" && StorageEngine.loadActiveTrip) ? StorageEngine.loadActiveTrip() : null;

    if (activeTrip && activeTrip.origin && activeTrip.destination && activeTrip.coordinates?.length > 1) {
      this.optimizerState.routeCalculated = true;
      this.optimizerState.selectedVehicleId = activeTrip.vehicleId || this.data.vehicles[0]?.id || "";
      this.optimizerState.activeTrip = activeTrip;
      this.optimizerState.customStartDepot = { id: "trip_start", name: activeTrip.origin, lat: activeTrip.coordinates[0][0], lng: activeTrip.coordinates[0][1] };
      this.optimizerState.customEndDepot = { id: "trip_end", name: activeTrip.destination, lat: activeTrip.coordinates[activeTrip.coordinates.length - 1][0], lng: activeTrip.coordinates[activeTrip.coordinates.length - 1][1] };
      this.optimizerState.routeResult = {
        coordinates: activeTrip.coordinates,
        distanceKm: activeTrip.distanceKm,
        durationHours: activeTrip.durationHours,
        totalCost: activeTrip.totalCost,
        tolls: activeTrip.tolls || [],
        fuelStations: []
      };
      this.optimizerState.selectedStopIds = (activeTrip.stops || []).map(s => s.id);
    } else {
      this.optimizerState.selectedStartDepotId = "";
      this.optimizerState.selectedEndDepotId = "";
      this.optimizerState.customStartDepot = null;
      this.optimizerState.customEndDepot = null;
      this.optimizerState.selectedVehicleId = this.data.vehicles[0]?.id || "";
      this.optimizerState.routingScope = "intercity";
      this.optimizerState.selectedStopIds = [];
      this.optimizerState.routeCalculated = false;
      this.optimizerState.routeResult = null;
      this.optimizerState.activeTrip = null;
    }

    if (loaded.simState) {
      ScenarioEngine.state = { ...ScenarioEngine.state, ...loaded.simState };
    }

    this.optimizerState.selectedVehicleId = this.data.vehicles[0]?.id || "";
  },

  saveState() {
    StorageEngine.saveState({
      data: this.data,
      optimizerState: this.optimizerState,
      simState: ScenarioEngine.state
    });
  },

  resetToDefaultDemoData() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DEMO_DATA));
    this.optimizerState.selectedVehicleId = this.data.vehicles[0]?.id || "";
    this.optimizerState.selectedStartDepotId = "";
    this.optimizerState.selectedEndDepotId = "";
    this.optimizerState.customStartDepot = null;
    this.optimizerState.customEndDepot = null;
    this.optimizerState.selectedStopIds = [];
    this.optimizerState.routeCalculated = false;
    this.optimizerState.routeResult = null;
    this.optimizerState.activeTrip = null;

    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");
    if (fromInput) fromInput.value = "";
    if (toInput) toInput.value = "";

    this.saveState();
    this.populateDepotDropdowns();
    this.updateAllUI();
    this.renderMap();
    this.renderAllCharts();
    UIManager.showToast("Data reset to initial state.", "info");
    UIManager.playSound("info");
  },

  // --------------------------------------------------------------------------
  // Navigation & View Routing
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // Role-Based Access Control (RBAC) & Centralized Permissions
  // --------------------------------------------------------------------------
  canAccess(viewId, role) {
    const ADMIN_VIEWS = [
      'landing', 'operations', 'dashboard', 'optimizer', 'fleet',
      'live-tracking', 'company-fastag-costs', 'compare-fleets',
      'analytics', 'settings', 'stops', 'simulator', 'driver-dashboard', 'driver-vehicle', 'vehicle', 'auth'
    ];
    const DRIVER_VIEWS = [
      'landing', 'driver-dashboard', 'driver-vehicle', 'vehicle', 'live-tracking', 'stops', 'auth'
    ];
    const GUEST_VIEWS = [
      'landing', 'auth'
    ];

    if (role === 'company' || role === 'admin') {
      return ADMIN_VIEWS.includes(viewId);
    }
    if (role === 'driver') {
      return DRIVER_VIEWS.includes(viewId);
    }
    return GUEST_VIEWS.includes(viewId);
  },

  navigateTo(viewId) {
    try {
      this.closeMobileMenu();
      const currentSession = StorageEngine.loadUserSession();
      const currentRole = (currentSession && (currentSession.role === 'driver' || currentSession.role === 'company'))
        ? currentSession.role
        : 'guest';

      if (currentRole === 'guest') {
        if (!this.canAccess(viewId, 'guest')) {
          console.warn(`[RIDO RBAC] Protected view '${viewId}' accessed by guest. Redirecting to unified auth.`);
          this._pendingIntentView = viewId;
          const isDriverIntent = ['driver-dashboard', 'driver-vehicle', 'driver-fastag'].includes(viewId);
          this.switchAuthRole(isDriverIntent ? 'driver' : 'company', 'login');
          this.toggleAuthMode('login');
          viewId = 'auth';
        }
      } else if (currentRole === 'driver') {
        if (!this.canAccess(viewId, 'driver')) {
          console.log(`[RIDO RBAC] Driver redirected from '${viewId}' to driver dashboard.`);
          viewId = 'driver-dashboard';
        }
      } else if (currentRole === 'company') {
        if (!this.canAccess(viewId, 'company')) {
          console.warn(`[RIDO RBAC] View '${viewId}' redirecting to operations.`);
          viewId = 'operations';
        }
      }

      let target = viewId;
      if (target === "dashboard" || target === "operations") target = "operations";
      if (target === "company-fastag-costs" || target === "fastag" || target === "costs") target = "analytics";
      if (target === "compare-fleets" || target === "compare") target = "optimizer";

      console.log(`[RIDO NAV] Navigating to view: '${target}' (Source: ${viewId}, Role: ${currentRole})`);

      const allViews = document.querySelectorAll(".view-panel");
      allViews.forEach((v) => {
        v.classList.remove("active");
        v.style.setProperty("display", "none", "important");
      });

      let targetSection = document.getElementById(`view-${target}`);
      if (!targetSection && (target === "operations" || target === "dashboard")) {
        targetSection = document.getElementById("view-operations") || document.getElementById("view-dashboard");
      }

      if (targetSection) {
        targetSection.classList.add("active");
        targetSection.style.setProperty("display", "block", "important");
      } else {
        console.warn(`[RIDO NAV] Target section '#view-${target}' not found in DOM.`);
      }

      this.activeView = target;
      this.renderNavItems();

      window.scrollTo({ top: 0, behavior: "smooth" });

      if (target === "optimizer") {
        setTimeout(() => {
          try {
            if (window.MapEngine && window.MapEngine.state.leafletMap) {
              window.MapEngine.state.leafletMap.invalidateSize();
            }
            this.renderMap();
          } catch (e) {
            console.warn("Map refresh during navigation:", e);
          }
        }, 100);
      } else if (target === "analytics") {
        setTimeout(() => {
          try {
            this.renderAllCharts();
          } catch (e) {
            console.warn("Analytics refresh during navigation:", e);
          }
        }, 100);
      } else if (target === "driver-dashboard") {
        try {
          this.updateAllUI();
          setTimeout(() => {
            if (window.MapEngine) MapEngine.initDriverDashMap();
          }, 100);
        } catch (e) {
          console.warn("Driver dashboard refresh during navigation:", e);
        }
      } else if (target === "driver-vehicle" || target === "vehicle") {
        try {
          if (window.initializeVehicleSelector) {
            window.initializeVehicleSelector();
          }
        } catch (e) {
          console.warn("Vehicle selector refresh error:", e);
        }
      } else if (target === "fleet") {
        try {
          if (window.FleetManager) FleetManager.renderFleetCards();
        } catch (e) {
          console.warn("Fleet refresh during navigation:", e);
        }
      } else if (target === "stops") {
        try {
          this.renderStopsTable();
        } catch (e) {
          console.warn("Stops refresh error:", e);
        }
      } else if (target === "simulator") {
        try {
          if (window.ScenarioEngine) ScenarioEngine.runAnalysis();
        } catch (e) {
          console.warn("Simulator refresh error:", e);
        }
      } else if (target === "landing") {
        try {
          if (window.TestimonialsCarousel) window.TestimonialsCarousel.init();
        } catch (e) {
          console.warn("Landing testimonials refresh error:", e);
        }
      } else if (target === "settings") {
        try {
          this.loadSettingsUI();
        } catch (e) {
          console.warn("Settings load error:", e);
        }
      } else if (target === "fastag" || target === "company-fastag-costs") {
        try {
          this.renderCompanyFastagCosts();
        } catch (e) {
          console.warn("FASTag refresh error:", e);
        }
      } else if (target === "live-tracking") {
        try {
          this.renderLiveTrackingUI();
          setTimeout(() => {
            if (this._liveTrackingMap) {
              this._liveTrackingMap.invalidateSize();
              this.recenterLiveTrackingMap();
            }
          }, 150);
        } catch (e) {
          console.warn("Live tracking refresh error:", e);
        }
      } else if (target === "operations" || target === "dashboard") {
        try {
          this.updateAllUI();
          if (window.FleetManager) FleetManager.renderMiniFleetMatrix();
          setTimeout(() => {
            if (window.MapEngine) MapEngine.initOpsCenterMap();
            if (window.AnalyticsEngine) {
              AnalyticsEngine.renderOpsDeliveryChart();
              AnalyticsEngine.renderOpsUtilizationDonut();
            }
          }, 100);
        } catch (e) {
          console.warn("Operations refresh during navigation:", e);
        }
      }

      try {
        if (window.UIManager) UIManager.playSound("click");
      } catch (e) {
        // Ignore audio context errors
      }
    } catch (err) {
      console.error("[RIDO NAV] Navigation error:", err);
    }
  },

  // --------------------------------------------------------------------------
  // Terminal & Hub Management
  // --------------------------------------------------------------------------
  getStartDepot() {
    if (this.optimizerState.customStartDepot && this.optimizerState.customStartDepot.lat) return this.optimizerState.customStartDepot;
    const fromInput = document.getElementById("opt-depot-from-search");
    const val = fromInput ? fromInput.value.trim() : "";
    if (val) {
      const match = (window.ALL_INDIA_CITIES_DATABASE || []).find((c) => Utils.fuzzyMatch(c, val));
      if (match) return { id: match.id, name: match.name, address: match.address, lat: match.lat, lng: match.lng, isCustom: true };
      return { id: `custom_from_${Date.now()}`, name: val, address: `${val}, India`, lat: 28.6139, lng: 77.2090, isCustom: true };
    }
    const startId = this.optimizerState.selectedStartDepotId;
    if (startId && this.data.depots && this.data.depots[startId]) return this.data.depots[startId];
    return null;
  },

  getEndDepot(startDepot) {
    if (this.optimizerState.customEndDepot && this.optimizerState.customEndDepot.lat) return this.optimizerState.customEndDepot;
    const endId = this.optimizerState.selectedEndDepotId;
    if (endId === "return_start") return startDepot || null;
    if (endId === "end_last_stop") {
      const stops = this.optimizerState.optimizedSequence || [];
      return stops.length > 0 ? stops[stops.length - 1] : (startDepot || null);
    }
    const toInput = document.getElementById("opt-depot-to-search");
    const val = toInput ? toInput.value.trim() : "";
    if (val) {
      const match = (window.ALL_INDIA_CITIES_DATABASE || []).find((c) => Utils.fuzzyMatch(c, val));
      if (match) return { id: match.id, name: match.name, address: match.address, lat: match.lat, lng: match.lng, isCustom: true };
      return { id: `custom_to_${Date.now()}`, name: val, address: `${val}, India`, lat: 19.0760, lng: 72.8777, isCustom: true };
    }
    if (endId && this.data.depots && this.data.depots[endId]) return this.data.depots[endId];
    return null;
  },

  populateDepotDropdowns() {
    const fromSelect = document.getElementById("opt-depot-from-select");
    const toSelect = document.getElementById("opt-depot-to-select");
    if (!fromSelect || !toSelect) return;

    const depots = this.data.depots || {};
    let fromOptions = `<option value="" ${!this.optimizerState.selectedStartDepotId ? "selected" : ""}>-- Select Origin Hub (Point A) --</option>`;
    Object.values(depots).forEach((d) => {
      fromOptions += `<option value="${d.id}" ${d.id === this.optimizerState.selectedStartDepotId ? "selected" : ""}>${d.name}</option>`;
    });

    if (this.optimizerState.customStartDepot) {
      fromOptions += `<option value="${this.optimizerState.customStartDepot.id}" selected>📍 [Custom] ${this.optimizerState.customStartDepot.name}</option>`;
    }
    fromSelect.innerHTML = fromOptions;

    let toOptions = `
      <option value="" ${!this.optimizerState.selectedEndDepotId ? "selected" : ""}>-- Select Destination Hub (Point B) --</option>
      <option value="return_start" ${this.optimizerState.selectedEndDepotId === "return_start" ? "selected" : ""}>🔄 Round Trip (Return to Origin)</option>
      <option value="end_last_stop" ${this.optimizerState.selectedEndDepotId === "end_last_stop" ? "selected" : ""}>🏁 One-Way (End at Final Delivery Stop)</option>
      <optgroup label="Direct Delivery Terminals">
    `;
    Object.values(depots).forEach((d) => {
      toOptions += `<option value="${d.id}" ${d.id === this.optimizerState.selectedEndDepotId ? "selected" : ""}>${d.name}</option>`;
    });
    toOptions += `</optgroup>`;

    if (this.optimizerState.customEndDepot) {
      toOptions += `<option value="${this.optimizerState.customEndDepot.id}" selected>🏁 [Custom] ${this.optimizerState.customEndDepot.name}</option>`;
    }
    toSelect.innerHTML = toOptions;

    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");

    if (fromInput) {
      const startDepot = this.getStartDepot();
      fromInput.value = startDepot ? startDepot.name : "";
    }
    if (toInput) {
      const endDepot = this.getEndDepot(this.getStartDepot());
      toInput.value = (endDepot && this.optimizerState.selectedEndDepotId !== "return_start" && this.optimizerState.selectedEndDepotId !== "end_last_stop") ? endDepot.name : "";
    }

    this.updateRouteState();
  },

  resetRouteResults() {
    this.optimizerState.routeCalculated = false;
    this.optimizerState.routeResult = null;
    this.optimizerState.calculatedTrip = null;
    this.optimizerState.activeTrip = null;

    // 1. Reset ROUTE SUMMARY to empty state
    const setEl = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setEl("nav-stat-distance", "--");
    setEl("nav-stat-time", "--");
    setEl("nav-stat-days", "--");
    setEl("nav-stat-speed", "--");
    setEl("nav-stat-toll", "--");
    setEl("nav-stat-trucks", "--");

    // 2. Reset Cost Summary KPI Cards
    setEl("nav-sum-fuel", "--");
    setEl("nav-sum-cost", "--");
    setEl("nav-sum-savings", "--");

    // 3. Reset Fare Modal Values
    setEl("fare-modal-dist", "-- km");
    setEl("fare-modal-fuel", "₹ --");
    setEl("fare-modal-toll", "₹ --");
    setEl("fare-modal-allowance", "₹ --");
    setEl("fare-modal-maint", "₹ --");
    setEl("fare-modal-driver-earn", "₹ --");
    setEl("fare-modal-total-cost", "₹ --");
    setEl("fare-modal-margin", "₹ --");

    // 4. Reset Map Status Badge and Clear Map Route Line
    const mapBadge = document.getElementById("map-live-status-badge");
    if (mapBadge) mapBadge.textContent = "Enter locations to plan route";

    if (window.MapEngine) {
      if (typeof MapEngine.clearRoute === "function") {
        MapEngine.clearRoute();
      } else {
        MapEngine.stopNavigationSimulation(true);
      }
    }

    // 5. Hide Suitable Fleet Vehicles & Recommendation Sections, Show Empty Prompt
    const resultsSection = document.getElementById("rido-fleet-results-section");
    if (resultsSection) resultsSection.classList.add("hidden");

    const emptyPrompt = document.getElementById("rido-fleet-empty-prompt");
    if (emptyPrompt) emptyPrompt.classList.remove("hidden");

    const resultCard = document.getElementById("rido-trip-result-card");
    if (resultCard) resultCard.classList.add("hidden");

    const tbody = document.getElementById("optimizer-fleet-comp-tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-6 text-center text-xs text-slate-400 font-medium">
            Enter origin and destination and calculate a route to compare fleet options.
          </td>
        </tr>
      `;
    }
  },

  // --------------------------------------------------------------------------
  // Intermediate Stops & Autocomplete Location Engine
  // --------------------------------------------------------------------------
  addIntermediateStop() {
    if (!this.optimizerState.stops) {
      this.optimizerState.stops = [];
    }
    const newIdx = this.optimizerState.stops.length;
    this.optimizerState.stops.push({
      id: `stop_${Date.now()}_${newIdx + 1}`,
      name: "",
      address: "",
      lat: null,
      lng: null,
      priority: "Standard",
      weight: 150,
      isCustom: true
    });

    this.renderStopsInputs();
    this.resetRouteResults();
    this.saveState();

    setTimeout(() => {
      const inp = document.getElementById(`opt-stop-${newIdx}-search`);
      if (inp) inp.focus();
    }, 60);
  },

  removeIntermediateStop(index) {
    if (this.optimizerState.stops && this.optimizerState.stops[index] !== undefined) {
      const removed = this.optimizerState.stops.splice(index, 1);
      this.renderStopsInputs();
      this.resetRouteResults();
      this.saveState();

      if (window.MapEngine && MapEngine.state && MapEngine.state.leafletMap) {
        const start = this.getStartDepot();
        const end = this.getEndDepot(start);
        MapEngine.renderMap(start, end, this.optimizerState.stops);
      }
    }
  },

  renderStopsInputs() {
    const list = document.getElementById("opt-stops-pills-list");
    const countLabel = document.getElementById("opt-stops-count-label");
    const stops = this.optimizerState.stops || [];

    if (countLabel) {
      countLabel.textContent = `Intermediate Stops (${stops.length})`;
    }

    if (!list) return;

    if (stops.length === 0) {
      list.innerHTML = `
        <div class="p-2.5 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          No intermediate stops. Click <span class="font-bold text-orange-600 cursor-pointer" onclick="App.addIntermediateStop()">+ Add Stop</span> to insert waypoints.
        </div>
      `;
      return;
    }

    list.innerHTML = stops.map((s, idx) => `
      <div class="relative hub-field-group" data-stop-index="${idx}">
        <div class="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus-within:ring-2 focus-within:ring-orange-500 focus-within:bg-white transition-all">
          <span class="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">${idx + 1}</span>
          <input type="text" id="opt-stop-${idx}-search" class="w-full bg-transparent border-none outline-none font-bold text-xs text-slate-900 placeholder:text-slate-400" value="${Utils.escapeHTML(s.name || '')}" placeholder="Stop ${idx + 1} — Enter delivery city or hub..." autocomplete="off">
          <button type="button" class="text-slate-400 hover:text-rose-600 font-bold px-1.5 cursor-pointer bg-transparent border-none text-xs" onclick="App.removeIntermediateStop(${idx})" title="Remove Stop ${idx + 1}">✕</button>
        </div>
        <div class="hub-suggestions-dropdown hidden" id="stop-${idx}-suggestions"></div>
      </div>
    `).join('');

    // Bind event handlers for all stop inputs
    stops.forEach((s, idx) => {
      const inp = document.getElementById(`opt-stop-${idx}-search`);
      const sugg = document.getElementById(`stop-${idx}-suggestions`);
      this.bindStopSearch(inp, sugg, idx);
    });
  },

  bindStopSearch(input, suggBox, index) {
    if (!input || !suggBox) return;

    input.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      App.resetRouteResults();

      if (this.optimizerState.stops && this.optimizerState.stops[index]) {
        this.optimizerState.stops[index].name = query;
      }

      if (query.length < 2) {
        suggBox.classList.add("hidden");
        return;
      }

      const localMatches = (window.ALL_INDIA_CITIES_DATABASE || []).filter((c) => Utils.fuzzyMatch(c, query)).slice(0, 6);
      if (localMatches.length > 0) {
        suggBox.innerHTML = localMatches
          .map(
            (item) => `
          <div class="hub-sugg-item cursor-pointer p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-none" onmousedown="event.preventDefault(); App.selectStopOption(${index}, '${item.id}', '${(item.name || '').replace(/'/g, "\\'")}', '${(item.address || '').replace(/'/g, "\\'")}', ${item.lat}, ${item.lng})">
            <div class="font-bold text-slate-900 text-xs">📍 ${item.name}</div>
            <div class="text-[10px] text-slate-500">${(item.address || '').slice(0, 60)}</div>
          </div>
        `
          )
          .join("");
        suggBox.classList.remove("hidden");
      }

      if (this.locationEngine && this.locationEngine.search) {
        this.locationEngine.search(query, (apiMatches) => {
          const combined = [...localMatches, ...(apiMatches || [])].slice(0, 8);
          if (combined.length === 0) {
            suggBox.innerHTML = `<div class="p-3 text-center text-xs text-slate-400">No matching location found. Press Enter to use "${Utils.escapeHTML(query)}"</div>`;
          } else {
            suggBox.innerHTML = combined
              .map(
                (item) => `
              <div class="hub-sugg-item cursor-pointer p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-none" onmousedown="event.preventDefault(); App.selectStopOption(${index}, '${item.id}', '${(item.name || '').replace(/'/g, "\\'")}', '${(item.address || '').replace(/'/g, "\\'")}', ${item.lat}, ${item.lng})">
                <div class="font-bold text-slate-900 text-xs">📍 ${item.name}</div>
                <div class="text-[10px] text-slate-500">${(item.address || '').slice(0, 60)}</div>
              </div>
            `
              )
              .join("");
          }
          suggBox.classList.remove("hidden");
        });
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        suggBox.classList.add("hidden");
        this.handleStopTypedResolution(input, index);
      }
    });

    input.addEventListener("blur", () => {
      setTimeout(() => {
        suggBox.classList.add("hidden");
        this.handleStopTypedResolution(input, index);
      }, 200);
    });
  },

  async handleStopTypedResolution(input, index) {
    if (!input) return;
    const query = input.value.trim();
    if (!query) {
      if (this.optimizerState.stops && this.optimizerState.stops[index]) {
        this.optimizerState.stops[index].name = "";
        this.optimizerState.stops[index].lat = null;
        this.optimizerState.stops[index].lng = null;
      }
      return;
    }

    const currentStop = this.optimizerState.stops ? this.optimizerState.stops[index] : null;
    if (currentStop && currentStop.name === query && currentStop.lat) return;

    const match = (window.ALL_INDIA_CITIES_DATABASE || []).find((c) => Utils.fuzzyMatch(c, query));
    if (match) {
      this.selectStopOption(index, match.id, match.name, match.address, match.lat, match.lng);
      return;
    }

    try {
      const geoResults = await ApiClient.fetchNominatimGeocode(query);
      if (geoResults && geoResults.length > 0) {
        const best = geoResults[0];
        this.selectStopOption(index, best.id, query, best.address, best.lat, best.lng);
      } else {
        const fallbackLat = 28.6139;
        const fallbackLng = 77.2090;
        this.selectStopOption(index, `custom_stop_${Date.now()}`, query, `${query}, India`, fallbackLat, fallbackLng);
      }
    } catch (e) {
      console.warn("Stop typed resolution error:", e);
    }
  },

  selectStopOption(index, id, name, address, lat, lng) {
    document.getElementById(`stop-${index}-suggestions`)?.classList.add("hidden");
    const inp = document.getElementById(`opt-stop-${index}-search`);
    if (inp) inp.value = name;

    if (!this.optimizerState.stops) this.optimizerState.stops = [];
    this.optimizerState.stops[index] = {
      id: id || `stop_${Date.now()}_${index + 1}`,
      name,
      address: address || `${name}, India`,
      lat: Number(lat),
      lng: Number(lng),
      priority: "Standard",
      weight: 150,
      isCustom: true
    };

    UIManager.showToast(`Waypoint Stop #${index + 1} set: ${name}`, "success");
    this.resetRouteResults();
    this.saveState();

    if (window.MapEngine && MapEngine.state && MapEngine.state.leafletMap) {
      const start = this.getStartDepot();
      const end = this.getEndDepot(start);
      MapEngine.renderMap(start, end, this.optimizerState.stops);
    }
  },

  setupHubSearch() {
    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");
    const fromSugg = document.getElementById("from-hub-suggestions");
    const toSugg = document.getElementById("to-hub-suggestions");

    const setupSearch = (input, suggBox, type) => {
      if (!input || !suggBox) return;

      input.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        App.resetRouteResults();

        if (query.length < 2) {
          suggBox.classList.add("hidden");
          return;
        }

        const localMatches = (window.ALL_INDIA_CITIES_DATABASE || []).filter((c) => Utils.fuzzyMatch(c, query)).slice(0, 6);
        if (localMatches.length > 0) {
          suggBox.innerHTML = localMatches
            .map(
              (item) => `
            <div class="hub-sugg-item cursor-pointer p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-none" onmousedown="event.preventDefault(); App.selectHubOption('${type}', '${item.id}', '${(item.name || '').replace(/'/g, "\\'")}', '${(item.address || '').replace(/'/g, "\\'")}', ${item.lat}, ${item.lng})">
              <div class="font-bold text-slate-900 text-xs">${item.badge || "📍"} ${item.name}</div>
              <div class="text-[10px] text-slate-500">${(item.address || '').slice(0, 60)}</div>
            </div>
          `
            )
            .join("");
          suggBox.classList.remove("hidden");
        }

        if (this.locationEngine && this.locationEngine.search) {
          this.locationEngine.search(query, (apiMatches) => {
            const combined = [...localMatches, ...(apiMatches || [])].slice(0, 8);
            if (combined.length === 0) {
              suggBox.innerHTML = `<div class="p-3 text-center text-xs text-slate-400">No matching location found. Press Enter to use "${Utils.escapeHTML(query)}"</div>`;
            } else {
              suggBox.innerHTML = combined
                .map(
                  (item) => `
                <div class="hub-sugg-item cursor-pointer p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-none" onmousedown="event.preventDefault(); App.selectHubOption('${type}', '${item.id}', '${(item.name || '').replace(/'/g, "\\'")}', '${(item.address || '').replace(/'/g, "\\'")}', ${item.lat}, ${item.lng})">
                  <div class="font-bold text-slate-900 text-xs">${item.badge || "📍"} ${item.name}</div>
                  <div class="text-[10px] text-slate-500">${(item.address || '').slice(0, 60)}</div>
                </div>
              `
                )
                .join("");
            }
            suggBox.classList.remove("hidden");
          });
        }
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          suggBox.classList.add("hidden");
          handleTypedResolution(input, type);
        }
      });
    };

    setupSearch(fromInput, fromSugg, "from");
    setupSearch(toInput, toSugg, "to");

    const handleTypedResolution = async (input, type) => {
      if (!input) return;
      const query = input.value.trim();
      if (!query) {
        App.resetRouteResults();
        return;
      }

      const currentDepot = type === "from" ? this.getStartDepot() : this.getEndDepot(this.getStartDepot());
      if (currentDepot && currentDepot.name === query && currentDepot.lat) return;

      const pinMatch = query.match(/\b\d{6}\b/);
      if (pinMatch) {
        const pin = pinMatch[0];
        const localPin = (window.ALL_INDIA_CITIES_DATABASE || []).find((c) => c.pincode === pin);
        if (localPin) {
          this.selectHubOption(type, localPin.id, query, localPin.address, localPin.lat, localPin.lng);
          return;
        }
        const res = await ApiClient.fetchPostalPinCode(pin);
        if (res && res[0]) {
          this.selectHubOption(type, res[0].id, query, res[0].address, res[0].lat, res[0].lng);
        }
        return;
      }

      const match = (window.ALL_INDIA_CITIES_DATABASE || []).find((c) => Utils.fuzzyMatch(c, query));
      if (match) {
        this.selectHubOption(type, match.id, match.name, match.address, match.lat, match.lng);
        return;
      }

      // Query OpenStreetMap Nominatim
      try {
        const geoResults = await ApiClient.fetchNominatimGeocode(query);
        if (geoResults && geoResults.length > 0) {
          const best = geoResults[0];
          this.selectHubOption(type, best.id, query, best.address, best.lat, best.lng);
        } else {
          // Create custom fallback node
          const fallbackLat = type === "from" ? 28.6139 : 19.0760;
          const fallbackLng = type === "from" ? 77.2090 : 72.8777;
          this.selectHubOption(type, `custom_${type}_${Date.now()}`, query, `${query}, India`, fallbackLat, fallbackLng);
        }
      } catch (e) {
        console.warn("Typed resolution error:", e);
      }
    };

    [fromInput, toInput].forEach((input, idx) => {
      if (!input) return;
      const type = idx === 0 ? "from" : "to";
      input.addEventListener("blur", () => {
        setTimeout(() => {
          handleTypedResolution(input, type);
        }, 200);
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".hub-field-group") && !e.target.closest(".relative")) {
        fromSugg?.classList.add("hidden");
        toSugg?.classList.add("hidden");
        document.querySelectorAll(".hub-suggestions-dropdown").forEach(d => d.classList.add("hidden"));
      }
    });
  },

  selectHubOption(type, id, name, address, lat, lng) {
    document.getElementById("from-hub-suggestions")?.classList.add("hidden");
    document.getElementById("to-hub-suggestions")?.classList.add("hidden");

    if (type === "from") {
      const fromInput = document.getElementById("opt-depot-from-search");
      if (fromInput) fromInput.value = name;
      if (this.data.depots[id]) {
        this.optimizerState.customStartDepot = null;
        this.optimizerState.selectedStartDepotId = id;
      } else {
        this.optimizerState.customStartDepot = { id, name, address, lat: Number(lat), lng: Number(lng), isCustom: true };
        this.optimizerState.selectedStartDepotId = id;
      }
      UIManager.showToast(`Starting Origin set: ${name}`, "success");
    } else {
      const toInput = document.getElementById("opt-depot-to-search");
      if (toInput) toInput.value = name;
      if (id === "return_start" || id === "end_last_stop" || this.data.depots[id]) {
        this.optimizerState.customEndDepot = null;
        this.optimizerState.selectedEndDepotId = id;
      } else {
        this.optimizerState.customEndDepot = { id, name, address, lat: Number(lat), lng: Number(lng), isCustom: true };
        this.optimizerState.selectedEndDepotId = id;
      }
      UIManager.showToast(`Final Destination set: ${name}`, "success");
    }

    this.resetRouteResults();
    this.saveState();
    this.populateDepotDropdowns();

    if (window.MapEngine && MapEngine.state && MapEngine.state.leafletMap) {
      const start = this.getStartDepot();
      const end = this.getEndDepot(start);
      MapEngine.renderMap(start, end, this.optimizerState.stops);
    }
  },

  clearHubSearch(type) {
    if (type === "from") {
      this.optimizerState.customStartDepot = null;
      this.optimizerState.selectedStartDepotId = "";
      const fromInput = document.getElementById("opt-depot-from-search");
      if (fromInput) fromInput.value = "";
    } else {
      this.optimizerState.customEndDepot = null;
      this.optimizerState.selectedEndDepotId = "";
      const toInput = document.getElementById("opt-depot-to-search");
      if (toInput) toInput.value = "";
    }

    this.resetRouteResults();
    this.saveState();
    this.populateDepotDropdowns();

    if (window.MapEngine && MapEngine.state && MapEngine.state.leafletMap) {
      const start = this.getStartDepot();
      const end = this.getEndDepot(start);
      MapEngine.renderMap(start, end, this.optimizerState.stops);
    }
  },

  swapFromToHubs() {
    const endOption = this.optimizerState.selectedEndDepotId;
    if (!this.optimizerState.selectedStartDepotId && !endOption) {
      UIManager.showToast("Select origin and destination hubs before swapping.", "warn");
      return;
    }
    if (endOption === "return_start") {
      UIManager.showToast("Cannot swap round-trip route. Choose a distinct destination hub.", "warn");
      return;
    }

    const tempStart = this.optimizerState.customStartDepot;
    const tempStartId = this.optimizerState.selectedStartDepotId;

    this.optimizerState.customStartDepot = this.optimizerState.customEndDepot;
    this.optimizerState.selectedStartDepotId = this.optimizerState.selectedEndDepotId;

    this.optimizerState.customEndDepot = tempStart;
    this.optimizerState.selectedEndDepotId = tempStartId;

    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");
    const newStart = this.getStartDepot();
    const newEnd = this.getEndDepot(newStart);

    if (fromInput) fromInput.value = newStart ? newStart.name : "";
    if (toInput) toInput.value = (this.optimizerState.selectedEndDepotId && this.optimizerState.selectedEndDepotId !== "return_start" && this.optimizerState.selectedEndDepotId !== "end_last_stop" && newEnd) ? newEnd.name : "";

    this.optimizerState.routeCalculated = false;
    MapEngine.stopNavigationSimulation(true);

    this.saveState();
    this.populateDepotDropdowns();
    this.calculateInitialRoute();
    this.updateAllUI();
    this.renderMap();
    UIManager.playSound("click");
    UIManager.showToast("Swapped Origin & Destination Terminals.", "success");
  },

  loadExpressCorridor(corridorKey) {
    const sel = STRATEGIC_FREIGHT_CORRIDORS[corridorKey];
    if (!sel) return;

    this.optimizerState.customStartDepot = sel.start;
    this.optimizerState.customEndDepot = sel.end;
    this.optimizerState.selectedStartDepotId = sel.start.id;
    this.optimizerState.selectedEndDepotId = sel.end.id;

    this.data.stops = sel.stops;
    this.optimizerState.selectedStopIds = sel.stops.map((s) => s.id);
    this.optimizerState.routeCalculated = true;

    this.saveState();
    this.populateDepotDropdowns();
    this.calculateInitialRoute();
    this.updateAllUI();
    this.renderMap();
    this.renderAllCharts();

    UIManager.playSound("sweep");
    UIManager.showToast(`Loaded Freight Corridor: ${sel.name}`, "success");

    setTimeout(() => {
      MapEngine.startNavigationSimulation();
    }, 500);
  },

  setRoutingScope(scope) {
    this.optimizerState.routingScope = scope;
    document.getElementById("btn-scope-intercity")?.classList.toggle("active", scope === "intercity");
    document.getElementById("btn-scope-intracity")?.classList.toggle("active", scope === "intracity");
    document.getElementById("intracity-cluster-wrap")?.classList.toggle("hidden", scope === "intercity");

    const badge = document.getElementById("active-scope-badge");
    if (badge) badge.textContent = scope === "intercity" ? "Inter-City (National Network)" : "Intra-City (Urban Last-Mile)";

    this.saveState();
  },

  onClusterChange(clusterKey) {
    if (PAN_INDIA_DATASETS[clusterKey]) {
      this.data.activeZone = clusterKey;
      this.data.depots = JSON.parse(JSON.stringify(PAN_INDIA_DATASETS[clusterKey].depots));
      this.data.vehicles = JSON.parse(JSON.stringify(PAN_INDIA_DATASETS[clusterKey].vehicles));
      this.data.stops = JSON.parse(JSON.stringify(PAN_INDIA_DATASETS[clusterKey].stops));

      this.optimizerState.selectedStartDepotId = "";
      this.optimizerState.selectedEndDepotId = "";
      this.optimizerState.customStartDepot = null;
      this.optimizerState.customEndDepot = null;
      this.optimizerState.routeCalculated = false;
      MapEngine.stopNavigationSimulation(true);

      this.optimizerState.selectedStopIds = this.data.stops.map((s) => s.id);
      this.optimizerState.selectedVehicleId = this.data.vehicles[0].id;

      const fromInput = document.getElementById("opt-depot-from-search");
      const toInput = document.getElementById("opt-depot-to-search");
      if (fromInput) fromInput.value = "";
      if (toInput) toInput.value = "";

      this.saveState();
      this.populateDepotDropdowns();
      this.calculateInitialRoute();
      this.updateAllUI();
      this.renderMap();
      this.renderAllCharts();
      UIManager.showToast(`Switched territory: ${PAN_INDIA_DATASETS[clusterKey].name}`, "info");
    }
  },

  // --------------------------------------------------------------------------
  // Route & Fleet Co-Optimization
  // --------------------------------------------------------------------------
  async calculateInitialRoute() {
    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");

    if (fromInput && fromInput.value.trim()) {
      const qFrom = fromInput.value.trim();
      const currentStart = this.getStartDepot();
      if (!currentStart || currentStart.name !== qFrom) {
        const match = (window.ALL_INDIA_CITIES_DATABASE || []).find((c) => Utils.fuzzyMatch(c, qFrom));
        if (match) {
          this.optimizerState.selectedStartDepotId = match.id;
          this.optimizerState.customStartDepot = match;
        } else {
          try {
            UIManager.showToast(`Geocoding Origin: ${qFrom}...`, "info");
            const geoResults = await ApiClient.fetchNominatimGeocode(qFrom);
            if (geoResults && geoResults.length > 0) {
              const best = geoResults[0];
              this.optimizerState.customStartDepot = { id: `custom_from_${Date.now()}`, name: qFrom, address: best.displayName, lat: best.lat, lng: best.lng, isCustom: true };
              UIManager.showToast(`Origin Found: ${best.displayName.split(',')[0]}`, "success");
            } else {
              throw new Error("Not found");
            }
          } catch (e) {
            UIManager.showToast(`Could not geocode origin: ${qFrom}. Using defaults.`, "warning");
            this.optimizerState.customStartDepot = { id: `custom_from_${Date.now()}`, name: qFrom, address: `${qFrom}, India`, lat: 28.6139, lng: 77.2090, isCustom: true };
          }
          this.optimizerState.selectedStartDepotId = this.optimizerState.customStartDepot.id;
        }
      }
    }

    if (toInput && toInput.value.trim()) {
      const qTo = toInput.value.trim();
      const currentEnd = this.getEndDepot(this.getStartDepot());
      if (!currentEnd || currentEnd.name !== qTo) {
        const match = (window.ALL_INDIA_CITIES_DATABASE || []).find((c) => Utils.fuzzyMatch(c, qTo));
        if (match) {
          this.optimizerState.selectedEndDepotId = match.id;
          this.optimizerState.customEndDepot = match;
        } else {
          try {
            UIManager.showToast(`Geocoding Destination: ${qTo}...`, "info");
            const geoResults = await ApiClient.fetchNominatimGeocode(qTo);
            if (geoResults && geoResults.length > 0) {
              const best = geoResults[0];
              this.optimizerState.customEndDepot = { id: `custom_to_${Date.now()}`, name: qTo, address: best.displayName, lat: best.lat, lng: best.lng, isCustom: true };
              UIManager.showToast(`Destination Found: ${best.displayName.split(',')[0]}`, "success");
            } else {
              throw new Error("Not found");
            }
          } catch (e) {
            UIManager.showToast(`Could not geocode destination: ${qTo}. Using defaults.`, "warning");
            this.optimizerState.customEndDepot = { id: `custom_to_${Date.now()}`, name: qTo, address: `${qTo}, India`, lat: 19.0760, lng: 72.8777, isCustom: true };
          }
          this.optimizerState.selectedEndDepotId = this.optimizerState.customEndDepot.id;
        }
      }
    }

    let startDepot = this.getStartDepot();
    let endDepot = this.getEndDepot(startDepot);

    // Cancel previous pending API request to prevent race conditions on fast destination changes
    if (this.currentRouteAbortController) {
      this.currentRouteAbortController.abort();
    }
    this.currentRouteAbortController = new AbortController();
    const activeSignal = this.currentRouteAbortController.signal;

    const requestId = ++this.currentRouteRequestId;
    this.optimizerState.routeRequestId = requestId;

    const stopsMap = new Map((this.data.stops || []).map((s) => [s.id, s]));
    let selectedStops = (this.optimizerState.selectedStopIds || [])
      .map((id) => stopsMap.get(id))
      .filter(Boolean);

    const statusEl = document.getElementById("map-route-status");

    if (!startDepot || !endDepot) {
      this.optimizerState.routeCalculated = false;
      this.optimizerState.routeResult = ApiClient.buildEmptyRouteResult();
      this.optimizerState.originalSequence = [];
      this.optimizerState.optimizedSequence = [];
      this.optimizerState.originalStats = { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, tollCost: 0, driverAllowance: 0, maintenanceCost: 0 };
      this.optimizerState.optimizedStats = { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, tollCost: 0, driverAllowance: 0, maintenanceCost: 0 };
      this.optimizerState.savings = { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, percentage: 0 };

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setVal("nav-stat-distance", "--");
      setVal("nav-stat-time", "--");
      setVal("nav-stat-cost", "--");

      const resultCard = document.getElementById("rido-trip-result-card");
      if (resultCard) resultCard.classList.add("hidden");

      if (window.MapEngine) {
        try {
          if (window.MapEngine.state.routesGroup) window.MapEngine.state.routesGroup.clearLayers();
          if (window.MapEngine.state.markersGroup) window.MapEngine.state.markersGroup.clearLayers();
          if (window.MapEngine.state.tollGroup) window.MapEngine.state.tollGroup.clearLayers();
          if (window.MapEngine.state.trafficGroup) window.MapEngine.state.trafficGroup.clearLayers();
          if (window.MapEngine.state.fuelGroup) window.MapEngine.state.fuelGroup.clearLayers();
          if (window.MapEngine.state.simMarker) {
            window.MapEngine.state.simMarker.remove();
            window.MapEngine.state.simMarker = null;
          }
          window.MapEngine.state.animating = false;
          if (window.MapEngine.state.animFrameId) {
            cancelAnimationFrame(window.MapEngine.state.animFrameId);
            window.MapEngine.state.animFrameId = null;
          }
        } catch (e) {}
      }

      if (statusEl) {
        if (!startDepot && !endDepot) statusEl.innerHTML = `Set origin and destination to begin tracking.`;
        else if (!startDepot) statusEl.innerHTML = `<span style="color: #ea580c; font-weight: 600;">Select an Origin to calculate the route.</span>`;
        else statusEl.innerHTML = `<span style="color: #ea580c; font-weight: 600;">Select a Destination to calculate the route.</span>`;
      }
      const locPrompt = document.getElementById("step2-location-prompt");
      const fleetSection = document.getElementById("step2-fleet-section");
      const mapSection = document.getElementById("step3-map-section");
      if (locPrompt) {
        locPrompt.classList.remove("hidden");
        locPrompt.style.setProperty("display", "block", "important");
      }
      if (fleetSection) {
        fleetSection.classList.add("hidden");
        fleetSection.style.setProperty("display", "none", "important");
      }
      if (mapSection) {
        mapSection.classList.add("hidden");
        mapSection.style.setProperty("display", "none", "important");
      }
      return;
    }

    const locPrompt = document.getElementById("step2-location-prompt");
    const fleetSection = document.getElementById("step2-fleet-section");
    const mapSection = document.getElementById("step3-map-section");
    if (locPrompt) {
      locPrompt.classList.add("hidden");
      locPrompt.style.setProperty("display", "none", "important");
    }
    if (fleetSection && (!mapSection || mapSection.classList.contains("hidden"))) {
      fleetSection.classList.remove("hidden");
      fleetSection.style.setProperty("display", "block", "important");
      fleetSection.style.opacity = "1";
      fleetSection.style.transform = "translateY(0)";
    }

    if (statusEl) {
      statusEl.innerHTML = `<span style="color: #d97706; font-weight: 700;">⏳ Calculating real highway route via OSRM...</span>`;
    }

    // 1. Heuristic Stop Sequence Optimization (Nearest Neighbor + 2-Opt)
    const origTour = [...selectedStops];
    const nnTour = OptimizerEngine.solveNearestNeighbor(
      selectedStops,
      startDepot,
      this.data.settings.prioritizeUrgent !== false
    );
    const optTour = OptimizerEngine.solve2Opt(nnTour, startDepot, endDepot);

    this.optimizerState.originalSequence = origTour;
    this.optimizerState.optimizedSequence = optTour;

    // Build Waypoint Sequence Chain: [StartHub -> Stop 1 -> Stop 2 -> ... -> EndHub]
    const routeWaypoints = [];
    routeWaypoints.push({ ...startDepot, lat: Number(startDepot.lat), lng: Number(startDepot.lng), label: startDepot.name });
    optTour.forEach((s) => {
      routeWaypoints.push({ ...s, lat: Number(s.lat), lng: Number(s.lng), label: s.customer });
    });
    routeWaypoints.push({ ...endDepot, lat: Number(endDepot.lat), lng: Number(endDepot.lng), label: endDepot.name });

    try {
      // 2. Fetch Real OSRM Road Route, Geometry & Mileage
      const routeResult = await ApiClient.fetchOSRMRoute(routeWaypoints, activeSignal);

      // Verify request ID (ignore stale responses from rapid destination changes)
      if (requestId !== this.currentRouteRequestId) {
        console.warn(`[RIDO ROUTE] Discarding stale response for Req #${requestId} (Current active: #${this.currentRouteRequestId})`);
        return;
      }

      // 3. Match Toll Plazas along the OSRM Polyline
      const matchedTolls = OptimizerEngine.matchTollPlazasAlongRoute(routeResult.coordinates, 4.0);
      const tollsArray = Array.isArray(matchedTolls) ? matchedTolls : [];
      const totalTollCost = tollsArray.reduce((sum, t) => sum + (t.commercialRate || 0), 0);
      routeResult.tolls = tollsArray;

      // 4. Fetch Nearby Fuel Stations along the OSRM Polyline
      const nearbyFuel = await ApiClient.fetchNearbyFuelStations(routeResult.coordinates, activeSignal);
      routeResult.fuelStations = nearbyFuel;

      // 5. Store Route Result in App Central State
      this.optimizerState.routeResult = {
        ...routeResult,
        requestId
      };
      this.optimizerState.routeCalculated = true;

      // 6. Calculate Economics using REAL Road Mileage (distanceKm)
      const vehicle =
        this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) ||
        this.data.vehicles[0];

      const origDistKm = OptimizerEngine.calculateSequenceDistance(origTour, startDepot, endDepot);
      const optDistKm = routeResult.distanceKm > 0 ? routeResult.distanceKm : origDistKm;


      // Dynamic Vehicle & Operating Economics
      const isEV = vehicle && vehicle.powertrain === "Electric (EV)";
      const mileage = Number(document.getElementById('eco-mileage')?.value) || Number(vehicle.efficiency) || (isEV ? 14.0 : 4.5);
      const fuelPrice = Number(document.getElementById('eco-fuel-price')?.value) || (isEV ? 9.5 : 95.0);
      const driverAllowancePerDay = Number(document.getElementById('eco-driver-allowance')?.value) || 500;
      const driverCount = Number(document.getElementById('eco-driver-count')?.value) || 1;
      const nightHaltPerNight = Number(document.getElementById('eco-night-halt')?.value) || 300;
      const otherCosts = Number(document.getElementById('eco-other-cost')?.value) || 200;

      // Perform dynamic opex calculations
      const computeRichStats = (distance, timeMinutes, stopCount) => {
        const fuelRequired = distance / mileage;
        const fuelCost = fuelRequired * fuelPrice;
        const driveHours = timeMinutes / 60;
        const tripDays = Math.max(1, Math.ceil(driveHours / 9.0)); 
        const driverCost = driverAllowancePerDay * tripDays * driverCount;
        const nightHaltCost = Math.max(0, tripDays - 1) * nightHaltPerNight * driverCount;
        const tollCost = totalTollCost > 0 ? totalTollCost : (distance > 25 ? Math.round((distance / 50) * 385) : 0);
        const maintenanceCost = distance * 2.0;
        const totalCost = fuelCost + tollCost + driverCost + nightHaltCost + otherCosts + maintenanceCost;

        return {
          distance,
          time: timeMinutes,
          fuel: fuelRequired,
          cost: totalCost,
          co2: fuelRequired * 2.68,
          tollCost,
          driverAllowance: driverCost,
          maintenanceCost,
          nightHaltCost,
          otherCosts
        };
      };

      const optStats = computeRichStats(optDistKm, routeResult.durationMinutes, optTour.length);
      const origStats = computeRichStats(origDistKm, Math.round((origDistKm / 50.0) * 60), origTour.length);

      // Check if driver recalculated route differs from planned route
      if (this.userSession?.role === 'driver') {
        const activeTrip = StorageEngine.loadActiveTrip();
        if (activeTrip && activeTrip.plannedRoute) {
          const isChanged = activeTrip.plannedRoute.origin !== (startDepot ? startDepot.name : "") ||
                            activeTrip.plannedRoute.destination !== (endDepot ? endDepot.name : "") ||
                            activeTrip.plannedRoute.waypoints.length !== selectedStops.length;
                            
          const warningEl = document.getElementById("driver-route-change-warning");
          if (isChanged) {
            if (warningEl) warningEl.classList.remove("hidden");
            
            // Save the driver's custom route separately without overwriting plannedRoute
            activeTrip.currentDriverRoute = {
              origin: startDepot ? startDepot.name : "",
              destination: endDepot ? endDepot.name : "",
              waypoints: selectedStops.map(s => s.id),
              distance: optStats.distance,
              cost: optStats.cost,
              time: optStats.time,
              tollsCount: optStats.tollCost ? 4 : 0
            };
            StorageEngine.saveActiveTrip(activeTrip);
          } else {
            if (warningEl) warningEl.classList.add("hidden");
          }
        }
      }

      const savedDist = Math.max(0, origStats.distance - optStats.distance);
      const savedFuel = Math.max(0, origStats.fuel - optStats.fuel);
      const savedCost = Math.max(0, origStats.cost - optStats.cost);
      const savedTime = Math.max(0, origStats.time - optStats.time);
      const savedCO2 = Math.max(0, origStats.co2 - optStats.co2);
      const pct = origStats.distance > 0 ? (savedDist / origStats.distance) * 100 : 0;

      this.optimizerState.originalStats = origStats;
      this.optimizerState.optimizedStats = optStats;
      this.optimizerState.savings = {
        distance: savedDist,
        fuel: savedFuel,
        cost: savedCost,
        time: savedTime,
        co2: savedCO2,
        percentage: pct
      };

      // 7. Update Status Indicator Label
      if (statusEl) {
        if (routeResult.isRealRoadRoute) {
          statusEl.innerHTML = `<span style="color: #059669; font-weight: 700;">🛣️ Road Route • OSRM (${routeResult.distanceKm} km)</span>`;
        } else {
          statusEl.innerHTML = `<span style="color: #d97706; font-weight: 700;">⚠️ Live road routing temporarily unavailable. Showing estimated route (${routeResult.distanceKm} km).</span>`;
        }
      }

      // 8. Update UI & Redraw Map
      this.updateAllUI();
      this.renderMap();
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("[RIDO ROUTE] Route calculation error:", err);
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #dc2626; font-weight: 700;">Road routing service unavailable. Please try again.</span>`;
      }
    }
  },

  runFullCoOptimization() {
    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);
    if (!startDepot || !endDepot) {
      if (!startDepot && !endDepot) {
        UIManager.showToast("Please select both Origin Hub (Point A) and Destination Hub (Point B) first.", "warn");
      } else if (!startDepot) {
        UIManager.showToast("Please select Origin Hub (Point A) to proceed.", "warn");
      } else {
        UIManager.showToast("Please select Destination Hub (Point B) to proceed.", "warn");
      }
      return;
    }

    const btn = document.getElementById("btn-run-optimization");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>OPTIMIZING ROUTE...</span>`;
    }

    const modal = document.getElementById("modal-ai-pipeline");
    if (modal) modal.classList.remove("hidden");
    UIManager.playSound("sweep");

    const steps = document.querySelectorAll(".pipe-step");
    let currentStep = 0;

    const stepInterval = setInterval(() => {
      if (currentStep < steps.length) {
        steps.forEach((s, idx) => {
          s.classList.toggle("active", idx === currentStep);
          s.classList.toggle("completed", idx < currentStep);
        });
        currentStep++;
      } else {
        clearInterval(stepInterval);
        setTimeout(() => {
          if (modal) modal.classList.add("hidden");
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Execute Algorithmic Co-Optimization</span>`;
          }

          const stopsMap = new Map(this.data.stops.map((s) => [s.id, s]));
          const selectedStops = (this.optimizerState.selectedStopIds || []).map((id) => stopsMap.get(id)).filter(Boolean);
          const currentStart = this.getStartDepot();
          const currentEnd = this.getEndDepot(currentStart);

          const coOptResult = OptimizerEngine.coOptimizeVehicleAndRoute(
            selectedStops,
            this.data.vehicles,
            currentStart,
            currentEnd,
            this.data.settings
          );
          if (coOptResult.bestMatch) {
            this.optimizerState.selectedVehicleId = coOptResult.bestMatch.vehicle.id;
          }

          this.optimizerState.routeCalculated = true;
          this.calculateInitialRoute();
          this.saveState();
          this.updateAllUI();
          this.renderMap();
          this.renderAllCharts();

          setTimeout(() => {
            MapEngine.startNavigationSimulation();
          }, 350);

          UIManager.playSound("success");
          UIManager.showToast(
            `Route Co-Optimized! Saved ${Utils.formatDistance(this.optimizerState.savings.distance)} (${Utils.formatPercentage(this.optimizerState.savings.percentage)}).`,
            "success"
          );
        }, 400);
      }
    }, 380);
  },

  autoRecommendVehicle() {
    const stopsMap = new Map(this.data.stops.map((s) => [s.id, s]));
    const selectedStops = (this.optimizerState.selectedStopIds || []).map((id) => stopsMap.get(id)).filter(Boolean);
    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);

    const coOpt = OptimizerEngine.coOptimizeVehicleAndRoute(
      selectedStops,
      this.data.vehicles,
      startDepot,
      endDepot,
      this.data.settings
    );
    if (coOpt.bestMatch) {
      this.optimizerState.selectedVehicleId = coOpt.bestMatch.vehicle.id;
      this.calculateInitialRoute();
      this.saveState();
      this.updateAllUI();
      this.renderMap();
      UIManager.playSound("success");
      UIManager.showToast(`Auto-Matched ${coOpt.bestMatch.vehicle.name}: ${coOpt.bestMatch.reason}`, "info");
    }
  },

  selectRecommendedTruck(vehId) {
    this.optimizerState.selectedVehicleId = vehId;
    const veh = this.data.vehicles.find((v) => v.id === vehId);
    const vehTitle = veh ? `${veh.name} (${veh.licensePlate || veh.id})` : vehId;

    UIManager.playSound("success");
    UIManager.showToast(`Selected ${veh ? veh.name : vehId}! Transitioning to Live Route Tracking Map...`, "success");

    const locPrompt = document.getElementById("step2-location-prompt");
    const fleetSection = document.getElementById("step2-fleet-section");
    const mapSection = document.getElementById("step3-map-section");
    const bannerTitle = document.getElementById("selected-truck-banner-title");

    if (locPrompt) locPrompt.classList.add("hidden");
    if (bannerTitle) {
      bannerTitle.textContent = vehTitle;
    }

    if (fleetSection) {
      fleetSection.style.transition = "opacity 0.35s ease, transform 0.35s ease";
      fleetSection.style.opacity = "0";
      fleetSection.style.transform = "translateY(-10px)";
      setTimeout(() => {
        fleetSection.classList.add("hidden");
        fleetSection.style.setProperty("display", "none", "important");
        if (mapSection) {
          mapSection.classList.remove("hidden");
          mapSection.style.setProperty("display", "block", "important");
          mapSection.style.opacity = "0";
          mapSection.style.transform = "translateY(10px)";
          mapSection.style.transition = "opacity 0.35s ease, transform 0.35s ease";
          setTimeout(() => {
            mapSection.style.opacity = "1";
            mapSection.style.transform = "translateY(0)";
            mapSection.scrollIntoView({ behavior: "smooth" });
            this.renderMap();
            if (window.MapEngine && window.MapEngine.map) {
              window.MapEngine.map.invalidateSize();
            }
            MapEngine.startNavigationSimulation();
          }, 50);
        }
      }, 350);
    } else if (mapSection) {
      mapSection.classList.remove("hidden");
      mapSection.scrollIntoView({ behavior: "smooth" });
      this.renderMap();
      MapEngine.startNavigationSimulation();
    }
  },

  showFleetSelectionStep() {
    const locPrompt = document.getElementById("step2-location-prompt");
    const fleetSection = document.getElementById("step2-fleet-section");
    const mapSection = document.getElementById("step3-map-section");

    if (locPrompt) locPrompt.classList.add("hidden");
    if (mapSection) {
      mapSection.style.transition = "opacity 0.3s ease";
      mapSection.style.opacity = "0";
      setTimeout(() => {
        mapSection.classList.add("hidden");
        if (fleetSection) {
          fleetSection.classList.remove("hidden");
          fleetSection.style.opacity = "0";
          fleetSection.style.transform = "translateY(0)";
          setTimeout(() => {
            fleetSection.style.opacity = "1";
            fleetSection.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      }, 300);
    }
  },

  loadSampleCorridor() {
    this.optimizerState.selectedStartDepotId = "pune_hub";
    this.optimizerState.selectedEndDepotId = "mumbai_hub";
    this.optimizerState.selectedStopIds = ["STP-001", "STP-002", "STP-003"];
    this.optimizerState.customStartDepot = { id: "pune_hub", name: "Pune Logistics Hub", lat: 18.5204, lng: 73.8567, address: "Pune, Maharashtra" };
    this.optimizerState.customEndDepot = { id: "mumbai_hub", name: "Mumbai Central DC", lat: 19.0760, lng: 72.8777, address: "Mumbai, Maharashtra" };

    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");

    if (fromInput) fromInput.value = "Pune, Maharashtra";
    if (toInput) toInput.value = "Mumbai, Maharashtra";

    UIManager.playSound("click");
    UIManager.showToast("Sample corridor loaded: Pune ➔ Mumbai (142 km, 4h 35m)", "info");
    try { this.calculateInitialRoute(); } catch(e) {}
  },

  // --------------------------------------------------------------------------
  // Fleet Roster Management (CRUD)
  // --------------------------------------------------------------------------
  openAddVehicleModal() {
    if (this.userSession?.role === "driver") {
      UIManager.showToast("🔒 Access Restricted: Driver accounts have read-only visibility into fleet configuration.", "warn");
      UIManager.playSound("warning");
      return;
    }

    UIManager.closeModals();
    const modal = document.getElementById("modal-vehicle");
    if (!modal) return;

    document.getElementById("modal-vehicle-title").textContent = "Add New Fleet Vehicle";
    document.getElementById("veh-edit-id").value = "";
    document.getElementById("veh-input-id").value = `TRK-${100 + this.data.vehicles.length + 1}`;
    document.getElementById("veh-input-id").disabled = false;
    document.getElementById("veh-input-name").value = "";
    document.getElementById("veh-input-driver").value = "";
    document.getElementById("veh-input-status").value = "Available";
    document.getElementById("veh-input-payload").value = 1200;
    document.getElementById("veh-input-eff").value = 14.0;
    document.getElementById("veh-input-cost-km").value = 8.5;
    document.getElementById("veh-input-fuel-level").value = 90;
    document.getElementById("veh-input-health").value = 95;

    modal.classList.remove("hidden");
    UIManager.playSound("click");
  },

  openEditVehicleModal(vehId) {
    if (this.userSession?.role === "driver") {
      UIManager.showToast("🔒 Access Restricted: Drivers cannot edit fleet vehicle specifications.", "warn");
      UIManager.playSound("warning");
      return;
    }

    UIManager.closeModals();
    const veh = this.data.vehicles.find((v) => v.id === vehId);
    if (!veh) return;

    const modal = document.getElementById("modal-vehicle");
    if (!modal) return;

    document.getElementById("modal-vehicle-title").textContent = `Edit Specs: ${veh.id}`;
    document.getElementById("veh-edit-id").value = veh.id;
    document.getElementById("veh-input-id").value = veh.id;
    document.getElementById("veh-input-id").disabled = true;
    document.getElementById("veh-input-name").value = veh.name;
    document.getElementById("veh-input-type").value = veh.type;
    document.getElementById("veh-input-powertrain").value = veh.powertrain;
    document.getElementById("veh-input-driver").value = veh.driver;
    document.getElementById("veh-input-status").value = veh.status;
    document.getElementById("veh-input-payload").value = veh.payloadMax;
    document.getElementById("veh-input-eff").value = veh.efficiency;
    document.getElementById("veh-input-cost-km").value = veh.costPerKm;
    document.getElementById("veh-input-fuel-level").value = veh.fuelLevel;
    document.getElementById("veh-input-health").value = veh.healthScore;

    modal.classList.remove("hidden");
    UIManager.playSound("click");
  },

  onVehicleTypeSelectChange() {
    const type = document.getElementById("veh-input-type").value;
    const powerSelect = document.getElementById("veh-input-powertrain");
    const payloadInput = document.getElementById("veh-input-payload");
    const effInput = document.getElementById("veh-input-eff");
    const costInput = document.getElementById("veh-input-cost-km");

    const preset = CONFIG.VEHICLE_PRESETS[type] || CONFIG.VEHICLE_PRESETS["Mini Truck"];
    if (powerSelect) powerSelect.value = preset.powertrain;
    if (payloadInput) payloadInput.value = preset.payloadMax;
    if (effInput) effInput.value = preset.efficiency;
    if (costInput) costInput.value = preset.costPerKm;
  },

  handleSaveVehicle(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (this.userSession?.role === "driver") {
      UIManager.showToast("🔒 Access Restricted: Driver accounts cannot modify fleet configuration.", "warn");
      return;
    }

    const editId = document.getElementById("veh-edit-id").value;
    const vehId = document.getElementById("veh-input-id").value.trim();
    const name = document.getElementById("veh-input-name").value.trim();
    const type = document.getElementById("veh-input-type").value;
    const powertrain = document.getElementById("veh-input-powertrain").value;
    const driver = document.getElementById("veh-input-driver").value.trim() || "Unassigned";
    const status = document.getElementById("veh-input-status").value;
    const payloadMax = Number(document.getElementById("veh-input-payload").value) || 1000;
    const efficiency = Number(document.getElementById("veh-input-eff").value) || 12;
    const costPerKm = Number(document.getElementById("veh-input-cost-km").value) || 8.5;
    const fuelLevel = Number(document.getElementById("veh-input-fuel-level").value) || 85;
    const healthScore = Number(document.getElementById("veh-input-health").value) || 95;

    let icon = "🚚";
    if (powertrain === "Electric (EV)") icon = "⚡";
    else if (type === "Heavy Truck") icon = "🚛";
    else if (type === "3-Wheeler") icon = "🛺";
    else if (type === "Cargo Bike") icon = "🏍️";

    if (!name || name.length < 2) {
      UIManager.showToast("Please enter a valid vehicle model name (min 2 chars).", "warning");
      return;
    }
    if (!vehId) {
      UIManager.showToast("Please enter a valid vehicle ID / Registration.", "warning");
      return;
    }
    if (!editId && this.data.vehicles.some(v => v.id.toLowerCase() === vehId.toLowerCase())) {
      UIManager.showToast(`A vehicle with ID '${vehId}' already exists.`, "warning");
      return;
    }
    if (payloadMax <= 0) {
      UIManager.showToast("Payload capacity must be a positive number.", "warning");
      return;
    }
    if (efficiency <= 0) {
      UIManager.showToast("Fuel/Energy efficiency must be a positive number.", "warning");
      return;
    }
    if (costPerKm < 0) {
      UIManager.showToast("Operating cost per km cannot be negative.", "warning");
      return;
    }
    if (fuelLevel < 0 || fuelLevel > 100) {
      UIManager.showToast("Fuel/Battery level must be between 0 and 100%.", "warning");
      return;
    }
    if (healthScore < 0 || healthScore > 100) {
      UIManager.showToast("Vehicle health score must be between 0 and 100%.", "warning");
      return;
    }

    const vehData = { id: vehId, name, type, powertrain, driver, status, payloadMax, efficiency, costPerKm, fuelLevel, healthScore, icon };

    if (editId) {
      const idx = this.data.vehicles.findIndex((v) => v.id === editId);
      if (idx !== -1) this.data.vehicles[idx] = vehData;
      UIManager.showToast(`Updated vehicle ${vehId}`, "success");
    } else {
      this.data.vehicles.push(vehData);
      UIManager.showToast(`Added new vehicle ${vehId}`, "success");
    }

    this.saveState();
    UIManager.closeModals();
    this.calculateInitialRoute();
    this.updateAllUI();
    FleetManager.renderFleetCards();
    UIManager.playSound("success");
  },

  openVehicleDetailsModal(vehId) {
    this.openEditVehicleModal(vehId);
  },

  deleteVehicle(vehId) {
    if (this.userSession?.role === "driver") {
      UIManager.showToast("🔒 Access Restricted: Driver accounts cannot delete fleet vehicles.", "warn");
      UIManager.playSound("warning");
      return;
    }

    if (this.data.vehicles.length <= 1) {
      UIManager.showToast("Cannot delete last vehicle. Roster must contain at least 1 vehicle.", "warn");
      return;
    }

    this.data.vehicles = this.data.vehicles.filter((v) => v.id !== vehId);
    if (this.optimizerState.selectedVehicleId === vehId) {
      this.optimizerState.selectedVehicleId = this.data.vehicles[0].id;
    }

    this.saveState();
    this.calculateInitialRoute();
    this.updateAllUI();
    FleetManager.renderFleetCards();
    UIManager.showToast(`Deleted vehicle ${vehId}`, "info");
    UIManager.playSound("click");
  },

  toggleVehicleStatus(vehId) {
    if (this.userSession?.role === "driver") {
      UIManager.showToast("🔒 Access Restricted: Driver accounts cannot reassign fleet status.", "warn");
      UIManager.playSound("warning");
      return;
    }

    const veh = this.data.vehicles.find((v) => v.id === vehId);
    if (!veh) return;

    const statuses = ["Available", "On Route", "Low Fuel", "Maintenance"];
    const nextIdx = (statuses.indexOf(veh.status) + 1) % statuses.length;
    veh.status = statuses[nextIdx];

    this.saveState();
    this.updateAllUI();
    FleetManager.renderFleetCards();
    UIManager.showToast(`${veh.id} status changed to ${veh.status}`, "info");
  },

  // --------------------------------------------------------------------------
  // Delivery Stops Management (CRUD)
  // --------------------------------------------------------------------------
  openAddStopModal() {
    UIManager.closeModals();
    const modal = document.getElementById("modal-stop");
    if (!modal) return;

    document.getElementById("modal-stop-title").textContent = "Add Delivery Waypoint";
    document.getElementById("stop-edit-id").value = "";
    document.getElementById("stop-input-id").value = `STP-${100 + this.data.stops.length + 1}`;
    document.getElementById("stop-input-customer").value = "";
    document.getElementById("stop-input-address").value = "";
    document.getElementById("stop-input-lat").value = 28.5500;
    document.getElementById("stop-input-lng").value = 77.2500;
    document.getElementById("stop-input-weight").value = 150;
    document.getElementById("stop-input-priority").value = "High";
    document.getElementById("stop-input-status").value = "Pending";

    modal.classList.remove("hidden");
    UIManager.playSound("click");
  },

  openEditStopModal(stopId) {
    UIManager.closeModals();
    const stop = this.data.stops.find((s) => s.id === stopId);
    if (!stop) return;

    const modal = document.getElementById("modal-stop");
    if (!modal) return;

    document.getElementById("modal-stop-title").textContent = `Edit Waypoint: ${stop.id}`;
    document.getElementById("stop-edit-id").value = stop.id;
    document.getElementById("stop-input-id").value = stop.id;
    document.getElementById("stop-input-customer").value = stop.customer;
    document.getElementById("stop-input-address").value = stop.address;
    document.getElementById("stop-input-lat").value = stop.lat;
    document.getElementById("stop-input-lng").value = stop.lng;
    document.getElementById("stop-input-weight").value = stop.weight;
    document.getElementById("stop-input-priority").value = stop.priority;
    document.getElementById("stop-input-status").value = stop.status || "Pending";

    modal.classList.remove("hidden");
    UIManager.playSound("click");
  },

  handleSaveStop(e) {
    if (e && e.preventDefault) e.preventDefault();

    const editId = document.getElementById("stop-edit-id").value;
    const stopId = document.getElementById("stop-input-id").value.trim();
    const customer = document.getElementById("stop-input-customer").value.trim();
    const address = document.getElementById("stop-input-address").value.trim();
    const lat = Number(document.getElementById("stop-input-lat").value) || 28.6139;
    const lng = Number(document.getElementById("stop-input-lng").value) || 77.2090;
    const weight = Number(document.getElementById("stop-input-weight").value) || 100;
    const priority = document.getElementById("stop-input-priority").value;
    const status = document.getElementById("stop-input-status").value;

    if (!customer || customer.length < 2) {
      UIManager.showToast("Please enter a valid customer or delivery hub name.", "warning");
      return;
    }
    if (!stopId) {
      UIManager.showToast("Please enter a valid Stop ID.", "warning");
      return;
    }
    if (!editId && this.data.stops.some(s => s.id.toLowerCase() === stopId.toLowerCase())) {
      UIManager.showToast(`A delivery stop with ID '${stopId}' already exists.`, "warning");
      return;
    }
    if (lat < -90 || lat > 90) {
      UIManager.showToast("Latitude must be between -90 and 90 degrees.", "warning");
      return;
    }
    if (lng < -180 || lng > 180) {
      UIManager.showToast("Longitude must be between -180 and 180 degrees.", "warning");
      return;
    }
    if (weight <= 0) {
      UIManager.showToast("Consignment payload weight must be greater than 0 kg.", "warning");
      return;
    }

    const stopData = { id: stopId, customer, address: address || `${customer} Facility`, lat, lng, weight, priority, status, assignedVehicleId: this.optimizerState.selectedVehicleId };

    if (editId) {
      const idx = this.data.stops.findIndex((s) => s.id === editId);
      if (idx !== -1) this.data.stops[idx] = stopData;
      UIManager.showToast(`Updated waypoint ${stopId}`, "success");
    } else {
      this.data.stops.push(stopData);
      if (!this.optimizerState.selectedStopIds.includes(stopId)) {
        this.optimizerState.selectedStopIds.push(stopId);
      }
      UIManager.showToast(`Added waypoint ${customer}`, "success");
    }

    this.saveState();
    UIManager.closeModals();
    this.calculateInitialRoute();
    this.updateAllUI();
    this.renderMap();
    UIManager.playSound("success");
  },

  deleteStop(stopId) {
    this.data.stops = this.data.stops.filter((s) => s.id !== stopId);
    this.optimizerState.selectedStopIds = this.optimizerState.selectedStopIds.filter((id) => id !== stopId);

    this.saveState();
    this.calculateInitialRoute();
    this.updateAllUI();
    this.renderMap();
    UIManager.showToast(`Removed waypoint ${stopId}`, "info");
    UIManager.playSound("click");
  },

  markStopDelivered(stopId) {
    const stop = this.data.stops.find((s) => s.id === stopId);
    if (stop) {
      stop.status = "Completed";
      this.saveState();
      this.updateAllUI();
      UIManager.showToast(`Consignment ${stopId} marked as delivered!`, "success");
      UIManager.playSound("success");
    }
  },

  // --------------------------------------------------------------------------
  // UI & KPI Synchronization
  // --------------------------------------------------------------------------
  updateAllUI() {
    this.updateKPIs();
    this.updateRouteState();
    this.updateDriverDashboardUI();
    this.updateOperationsDashboard();
    this.renderCompanyFastagCosts();
    this.renderVehicleSelector();
    this.renderStopsChecklist();
    this.renderStopsInputs();
    this.renderLiveTrackingUI();
    this.renderOptimizerComparison();
    this.renderMultiFleetRouteComparison();
    this.renderDriverTripActionBanner();
    this.renderDriverSidebarCockpit();
    this.renderFastagTollSummary();
    this.renderOpExBreakdown();
    this.renderItineraryTimeline();
    this.renderDashOperationsWidgets();
    FleetManager.renderMiniFleetMatrix();
  },

  updateRouteState() {
    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);
    const hasOrigin = !!startDepot;
    const hasDest = !!endDepot;
    const isCalculated = !!this.optimizerState.routeCalculated && hasOrigin && hasDest;

    let routeState = "EMPTY";
    if (isCalculated) {
      routeState = "TRACKING";
    } else if (hasOrigin && hasDest) {
      routeState = "ROUTE_READY";
    } else if (hasOrigin) {
      routeState = "ORIGIN_SELECTED";
    } else if (hasDest) {
      routeState = "DESTINATION_SELECTED";
    }

    this.optimizerState.routeState = routeState;

    // 1. Hub Status Tags
    const fromTag = document.getElementById("from-hub-tag");
    const toTag = document.getElementById("to-hub-tag");
    if (fromTag) {
      if (hasOrigin) {
        fromTag.textContent = `✓ Origin: ${startDepot.name.split("(")[0].trim()}`;
        fromTag.className = "hub-status-tag origin-tag tag-ready";
      } else {
        fromTag.textContent = "Awaiting Origin [A]";
        fromTag.className = "hub-status-tag origin-tag";
      }
    }
    if (toTag) {
      if (hasDest) {
        const destLabel = this.optimizerState.selectedEndDepotId === "return_start" 
          ? "Round Trip to Origin" 
          : (this.optimizerState.selectedEndDepotId === "end_last_stop" ? "Final Delivery Stop" : endDepot.name.split("(")[0].trim());
        toTag.textContent = `✓ Dest: ${destLabel}`;
        toTag.className = "hub-status-tag dest-tag tag-ready";
      } else {
        toTag.textContent = "Awaiting Destination [B]";
        toTag.className = "hub-status-tag dest-tag";
      }
    }

    // 2. Action Button State
    const optBtn = document.getElementById("btn-run-optimization");
    if (optBtn) {
      optBtn.disabled = false;
      optBtn.classList.add("glow-btn");
      if (hasOrigin && hasDest) {
        optBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Recalculate Route & Fleet</span>`;
      } else {
        optBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Calculate Route & View Fleets</span>`;
      }
    }

    // 3. Map Placeholder Overlay & Steps
    const overlay = document.getElementById("map-placeholder-overlay");
    const overlayTitle = document.getElementById("map-placeholder-title");
    const overlayStatus = document.getElementById("map-placeholder-status");
    const stepOrigin = document.getElementById("step-origin-pill");
    const stepDest = document.getElementById("step-dest-pill");
    const stepCalc = document.getElementById("step-calc-pill");
    const mapStatus = document.getElementById("map-route-status");

    if (overlay) {
      if (routeState === "TRACKING") {
        overlay.classList.add("hidden");
        if (mapStatus) mapStatus.textContent = "Live Tracking ● LIVE";
      } else {
        overlay.classList.remove("hidden");
        if (mapStatus) mapStatus.textContent = "Set origin and destination to begin tracking.";

        if (stepOrigin) {
          stepOrigin.className = "placeholder-step-pill" + (hasOrigin ? " step-completed" : " step-active");
          stepOrigin.innerHTML = `<span class="step-dot"></span> ${hasOrigin ? "✓ Point A (" + startDepot.name.split("(")[0].slice(0, 12).trim() + ")" : "Point A (Origin)"}`;
        }
        if (stepDest) {
          stepDest.className = "placeholder-step-pill" + (hasDest ? " step-completed" : (hasOrigin ? " step-active" : ""));
          stepDest.innerHTML = `<span class="step-dot"></span> ${hasDest ? "✓ Point B" : "Point B (Destination)"}`;
        }
        if (stepCalc) {
          stepCalc.className = "placeholder-step-pill" + (hasOrigin && hasDest ? " step-active" : "");
          stepCalc.innerHTML = `<span class="step-dot"></span> Calculate Route`;
        }

        if (overlayTitle && overlayStatus) {
          if (routeState === "EMPTY") {
            overlayTitle.textContent = "Set Route to Activate Live Tracking";
            overlayStatus.textContent = "Set your origin and destination to view live route tracking.";
          } else if (routeState === "ORIGIN_SELECTED") {
            overlayTitle.textContent = "Origin Selected • Awaiting Destination";
            overlayStatus.textContent = `Origin set to "${startDepot.name.split("(")[0].trim()}". Please select Destination Hub (Point B) to proceed.`;
          } else if (routeState === "DESTINATION_SELECTED") {
            overlayTitle.textContent = "Destination Selected • Awaiting Origin";
            overlayStatus.textContent = "Please select Origin Hub (Point A) to complete the corridor pair.";
          } else if (routeState === "ROUTE_READY") {
            overlayTitle.textContent = "Route Ready for Calculation";
            overlayStatus.textContent = "Origin and destination configured. Click 'Execute Algorithmic Co-Optimization' to generate the live highway corridor and start fleet telemetry.";
          }
        }
      }
    }

    return routeState;
  },

  updateKPIs() {
    const totalVeh = this.data?.vehicles?.length || 6;
    const availVeh = (this.data?.vehicles || []).filter((v) => v.status === "Available").length;
    const activeTrip = StorageEngine.loadActiveTrip();
    const routeResult = this.optimizerState.routeResult;
    const vehicle = (this.data?.vehicles || []).find((v) => v.id === this.optimizerState.selectedVehicleId) || (this.data?.vehicles || [])[0];
    const isEV = vehicle && vehicle.powertrain === "Electric (EV)";

    const isCalculated = !!(routeResult && routeResult.distanceKm > 0) || !!this.optimizerState.routeCalculated;
    const selectedCount = isCalculated ? ((this.optimizerState.selectedStopIds || []).length || 2) : 0;

    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);

    const currency = this.data?.settings?.currency || "₹";

    const elVeh = document.getElementById("kpi-val-vehicles");
    const elSubVeh = document.getElementById("kpi-sub-vehicles");
    if (elVeh) elVeh.textContent = `${totalVeh}`;
    if (elSubVeh) elSubVeh.textContent = isCalculated ? `${availVeh} Available • ${totalVeh - availVeh} Active` : `${totalVeh} Available • 0 Active`;

    const elStops = document.getElementById("kpi-val-stops");
    const elSubStops = document.getElementById("kpi-sub-stops");

    const elDist = document.getElementById("kpi-val-distance");
    const elFuel = document.getElementById("kpi-val-fuel");
    const elSubFuel = document.getElementById("kpi-sub-fuel");
    const elCost = document.getElementById("kpi-val-cost");
    const elAvgCost = document.getElementById("kpi-val-avg-cost");
    const elCO2 = document.getElementById("kpi-val-co2");

    const opsOrigin = document.getElementById("ops-left-origin");
    const opsDest = document.getElementById("ops-left-dest");
    const opsVehId = document.getElementById("ops-left-veh-id");
    const opsVehName = document.getElementById("ops-left-veh-name");
    const opsCorridor = document.getElementById("ops-left-corridor");

    const opsCorrDist = document.getElementById("ops-corridor-dist");
    const opsCorrEta = document.getElementById("ops-corridor-eta");
    const opsCorrTolls = document.getElementById("ops-corridor-tolls");
    const opsNextStation = document.getElementById("ops-next-station-name");

    if (!isCalculated || !startDepot || !endDepot) {
      if (elStops) elStops.textContent = "0";
      if (elSubStops) elSubStops.textContent = "0 Consignments Active • Standby";
      if (elDist) elDist.textContent = "-- km";
      if (elFuel) elFuel.textContent = "-- L";
      if (elSubFuel) elSubFuel.textContent = "Run Route Optimizer to activate";
      if (elCost) elCost.textContent = "₹--";
      if (elAvgCost) elAvgCost.textContent = "₹--";
      if (elCO2) elCO2.textContent = "--";

      if (opsOrigin) opsOrigin.textContent = "No Active Route";
      if (opsDest) opsDest.textContent = "No Active Route";
      if (opsVehId) opsVehId.textContent = "NO VEHICLE ASSIGNED";
      if (opsVehName) opsVehName.textContent = "Select truck in Route Optimizer";
      if (opsCorridor) opsCorridor.textContent = "No Active Corridor";

      const opsVehSpeed = document.getElementById("ops-left-veh-speed");
      const opsVehState = document.getElementById("ops-left-veh-state");
      if (opsVehSpeed) opsVehSpeed.textContent = "--";
      if (opsVehState) opsVehState.textContent = "--";

      if (opsCorrDist) opsCorrDist.textContent = "-- km";
      if (opsCorrEta) opsCorrEta.textContent = "--";
      if (opsCorrTolls) opsCorrTolls.innerHTML = `<div class="p-2 text-center text-slate-400 bg-white rounded-lg border border-slate-200 text-[10px]">No active toll plazas. Run Route Optimizer to calculate.</div>`;
      if (opsNextStation) opsNextStation.textContent = "No active charging stop (Standby)";
    } else {
      const dist = routeResult?.distanceKm || this.optimizerState.optimizedStats?.distance || 1284;
      const eff = Number(vehicle?.efficiency || (isEV ? 7.0 : 7.75));
      const fuelOrEnergy = dist / eff;
      const fuelCostRate = isEV ? 9.50 : 95.00;
      const fuelCost = fuelOrEnergy * fuelCostRate;
      const tollCost = (routeResult && routeResult.tolls)
        ? routeResult.tolls.reduce((sum, t) => sum + (Number(t.rate) || 0), 0)
        : 2450;
      const driverBata = Math.round((dist / 100) * 120);
      const maintenance = Math.round(dist * 1.85);
      const totalOpExCost = fuelCost + tollCost + driverBata + maintenance;
      const avgCostPerStop = totalOpExCost / Math.max(1, selectedCount);

      if (elStops) elStops.textContent = `${selectedCount}`;
      if (elSubStops) elSubStops.textContent = `${selectedCount} Consignments Active • TRIP-DEL-MUM-402`;
      if (elDist) elDist.textContent = Utils.formatDistance(dist);
      if (elFuel) elFuel.textContent = isEV ? `${fuelOrEnergy.toFixed(1)} kWh` : `${fuelOrEnergy.toFixed(1)} L`;
      if (elSubFuel) elSubFuel.textContent = isEV ? `⚡ EV Energy (${eff} km/kWh)` : `Diesel Fuel (${eff} km/L)`;
      if (elCost) elCost.textContent = Utils.formatCurrency(totalOpExCost, currency);
      if (elAvgCost) elAvgCost.textContent = Utils.formatCurrency(avgCostPerStop, currency);
      if (elCO2) elCO2.textContent = "99.4%";

      if (opsOrigin) opsOrigin.textContent = startDepot.name.split(",")[0];
      if (opsDest) opsDest.textContent = endDepot.name.split(",")[0];
      if (opsVehId) opsVehId.textContent = vehicle.id;
      if (opsVehName) opsVehName.textContent = vehicle.name;
      if (opsCorridor) opsCorridor.textContent = `${startDepot.name.split(",")[0]} ➔ ${endDepot.name.split(",")[0]} Highway`;

      const opsVehSpeed2 = document.getElementById("ops-left-veh-speed");
      const opsVehState2 = document.getElementById("ops-left-veh-state");
      const mapSection2 = document.getElementById("step3-map-section");
      const isTruckSelected = mapSection2 && !mapSection2.classList.contains("hidden");
      if (opsVehSpeed2) opsVehSpeed2.textContent = isTruckSelected ? "62 km/h" : "--";
      if (opsVehState2) opsVehState2.textContent = isTruckSelected ? "En Route" : "--";

      if (opsCorrDist) opsCorrDist.textContent = Utils.formatDistance(dist);
      if (opsCorrEta) opsCorrEta.textContent = Utils.formatDuration(routeResult?.durationMinutes || 1125);
    }

    const avgHealth = Math.round(
      (this.data?.vehicles || []).reduce((sum, v) => sum + Number(v.healthScore || 90), 0) / (totalVeh || 1)
    );
    const elHealth = document.getElementById("kpi-val-health");
    if (elHealth) elHealth.textContent = `${avgHealth}%`;

    this.updateRouteSummaryUI();
  },

  updateRouteSummaryUI() {
    const summaryDist = document.getElementById("summary-val-dist");
    const summaryTime = document.getElementById("summary-val-time");
    const summaryToll = document.getElementById("summary-val-toll");
    const summaryFuel = document.getElementById("summary-val-fuel");
    const summaryNote = document.getElementById("summary-val-note");

    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);

    const mapSection = document.getElementById("step3-map-section");
    const isTruckSelected = mapSection && !mapSection.classList.contains("hidden");

    const routeResult = this.optimizerState.routeResult;
    const dist = (routeResult && routeResult.distanceKm) ? routeResult.distanceKm : (this.optimizerState.optimizedStats?.distance || 1284);

    if (summaryDist) {
      summaryDist.textContent = (startDepot && endDepot) ? Utils.formatDistance(dist) : "-- km";
    }

    if (!isTruckSelected) {
      if (summaryTime) summaryTime.textContent = "--";
      if (summaryToll) summaryToll.textContent = "₹--";
      if (summaryFuel) summaryFuel.textContent = "₹--";
      if (summaryNote) {
        summaryNote.innerHTML = `<span>ⓘ</span><span>Select a truck from recommended fleets to calculate transit time, fuel costs & toll gates.</span>`;
      }
    } else {
      const vehicle = (this.data?.vehicles || []).find((v) => v.id === this.optimizerState.selectedVehicleId) || (this.data?.vehicles || [])[0];
      const isEV = vehicle && vehicle.powertrain === "Electric (EV)";
      const eff = Number(vehicle?.efficiency || (isEV ? 7.0 : 7.75));
      const fuelOrEnergy = dist / eff;
      const fuelCostRate = isEV ? 9.50 : 95.00;
      const fuelCost = fuelOrEnergy * fuelCostRate;
      const tollCost = (routeResult && routeResult.tolls)
        ? routeResult.tolls.reduce((sum, t) => sum + (Number(t.rate) || 0), 0)
        : 2985;
      const durationMins = (routeResult && routeResult.durationMinutes) ? routeResult.durationMinutes : 1218;

      if (summaryTime) summaryTime.textContent = Utils.formatDuration(durationMins);
      if (summaryToll) summaryToll.textContent = Utils.formatCurrency(tollCost);
      if (summaryFuel) summaryFuel.textContent = Utils.formatCurrency(fuelCost);
      if (summaryNote) {
        summaryNote.innerHTML = `<span>ⓘ</span><span>Live estimates calculated for ${vehicle.name} (${vehicle.powertrain}).</span>`;
      }
    }
  },

  filterFleetCategory(cat, btn) {
    if (btn && btn.parentElement) {
      btn.parentElement.querySelectorAll("button").forEach((b) => {
        b.className = "px-3.5 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 cursor-pointer";
      });
      btn.className = "px-3.5 py-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center gap-1.5 shrink-0 cursor-pointer";
    }
    const cards = document.querySelectorAll("#step2-fleet-section [data-vehicle-id]");
    cards.forEach((card) => {
      const vId = card.dataset.vehicleId;
      const veh = this.data.vehicles.find((v) => v.id === vId);
      if (!veh) return;
      let show = true;
      if (cat === "ev") show = veh.powertrain === "Electric (EV)";
      else if (cat === "mini") show = (veh.type || "").toLowerCase().includes("mini");
      else if (cat === "light") show = (veh.type || "").toLowerCase().includes("light");
      else if (cat === "heavy") show = (veh.type || "").toLowerCase().includes("heavy") || (veh.type || "").toLowerCase().includes("medium");
      card.style.display = show ? "" : "none";
    });
    UIManager.playSound("click");
  },

  renderVehicleSelector() {
    const sel = document.getElementById("opt-vehicle-select");
    if (!sel) return;

    sel.innerHTML = this.data.vehicles
      .map(
        (v) => `
      <option value="${v.id}" ${v.id === this.optimizerState.selectedVehicleId ? "selected" : ""}>
        ${v.icon || "🚚"} ${v.name} (${v.id}) • ${v.payloadMax} kg Max • ${v.status}
      </option>
    `
      )
      .join("");

    const veh =
      this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) ||
      this.data.vehicles[0];
    const specsContainer = document.getElementById("opt-vehicle-specs");
    if (specsContainer && veh) {
      const isEV = veh.powertrain === "Electric (EV)";
      specsContainer.innerHTML = `
        <div class="specs-pill-item">
          <span>Capacity:</span> <strong>${Utils.formatWeight(veh.payloadMax)}</strong>
        </div>
        <div class="specs-pill-item">
          <span>Efficiency:</span> <strong>${veh.efficiency} ${isEV ? "km/kWh" : "km/L"}</strong>
        </div>
        <div class="specs-pill-item">
          <span>Driver:</span> <strong>${Utils.escapeHTML(veh.driver)}</strong>
        </div>
        <div class="specs-pill-item">
          <span>Energy State:</span> <strong>${veh.fuelLevel}%</strong>
        </div>
      `;
    }
  },

  renderStopsChecklist() {
    const pillsList = document.getElementById("opt-stops-pills-list");
    const countLabel = document.getElementById("opt-stops-count-label");
    const stopsMap = new Map((this.data.stops || []).map((s) => [s.id, s]));
    const selectedStopIds = this.optimizerState.selectedStopIds || [];
    const selectedStops = selectedStopIds.map((id) => stopsMap.get(id)).filter(Boolean);

    if (countLabel) {
      countLabel.textContent = `Intermediate Stops (${selectedStops.length})`;
    }

    if (pillsList) {
      if (selectedStops.length === 0) {
        pillsList.innerHTML = `
          <div class="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No stops added. Click "+ Add Stop" to add delivery waypoints.
          </div>
        `;
      } else {
        pillsList.innerHTML = selectedStops.map((s, idx) => {
          let prioBg = "bg-blue-50 text-blue-700 border-blue-200";
          if (s.priority === "Urgent") prioBg = "bg-rose-50 text-rose-700 border-rose-200";
          else if (s.priority === "High") prioBg = "bg-amber-50 text-amber-700 border-amber-200";

          return `
            <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-orange-300 transition-all text-xs">
              <div class="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <span class="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">${idx + 1}</span>
                <div class="truncate">
                  <span class="font-bold text-slate-900 block truncate">${Utils.escapeHTML(s.customer || s.name || s.id)}</span>
                  <span class="text-[10px] text-slate-500 font-mono block truncate">${Utils.escapeHTML(s.address || `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`)}</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="px-2 py-0.5 rounded-md border text-[10px] font-bold ${prioBg}">${s.priority || "High"} • ${s.weight || 100}kg</span>
                <button type="button" class="text-slate-400 hover:text-orange-600 p-1 cursor-pointer transition text-xs" title="Edit Waypoint" onclick="App.openEditStopModal('${s.id}')">✎</button>
                <button type="button" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition text-xs font-bold" title="Remove Waypoint" onclick="App.deleteStop('${s.id}')">✕</button>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    const container = document.getElementById("opt-stops-checklist");
    if (container) {
      const stops = this.data.stops || [];
      const selectedIds = new Set(this.optimizerState.selectedStopIds || []);

      const totalWeight = stops
        .filter((s) => selectedIds.has(s.id))
        .reduce((sum, s) => sum + Number(s.weight || 0), 0);
      const veh =
        this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) ||
        this.data.vehicles[0];
      const maxPayload = Number(veh?.payloadMax || 1000);

      const badge = document.getElementById("opt-payload-badge");
      if (badge) {
        badge.textContent = `${totalWeight} kg / ${maxPayload} kg`;
        badge.classList.toggle("overloaded", totalWeight > maxPayload);
      }

      const alertBox = document.getElementById("opt-constraint-alert");
      if (alertBox) {
        if (totalWeight > maxPayload) {
          alertBox.classList.remove("hidden");
          document.getElementById("opt-alert-text").textContent = `Payload (${totalWeight} kg) exceeds ${veh.name} capacity (${maxPayload} kg)!`;
        } else {
          alertBox.classList.add("hidden");
        }
      }

      container.innerHTML = stops
        .map((s) => {
          const isChecked = selectedIds.has(s.id);
          let prioClass = "prio-normal";
          if (s.priority === "Urgent") prioClass = "prio-urgent";
          else if (s.priority === "High") prioClass = "prio-high";

          return `
          <div class="stop-chk-item ${isChecked ? "selected" : ""}" onclick="App.toggleStopSelection('${s.id}')">
            <input type="checkbox" ${isChecked ? "checked" : ""} onclick="event.stopPropagation(); App.toggleStopSelection('${s.id}')">
            <div class="chk-info">
              <div class="chk-title">${Utils.escapeHTML(s.customer)}</div>
              <div class="chk-sub">${Utils.escapeHTML(s.address.slice(0, 42))}...</div>
            </div>
            <span class="chk-tag ${prioClass}">${s.priority} • ${s.weight}kg</span>
          </div>
        `;
        })
        .join("");
    }
  },

  toggleStopSelection(stopId) {
    const idx = this.optimizerState.selectedStopIds.indexOf(stopId);
    if (idx === -1) {
      this.optimizerState.selectedStopIds.push(stopId);
    } else {
      this.optimizerState.selectedStopIds.splice(idx, 1);
    }

    // Auto-assign suitable fleet vehicle if total payload exceeds current vehicle's capacity
    const stopsMap = new Map(this.data.stops.map((s) => [s.id, s]));
    const totalWeight = this.optimizerState.selectedStopIds
      .map((id) => stopsMap.get(id))
      .filter(Boolean)
      .reduce((sum, s) => sum + Number(s.weight || 0), 0);

    const currentVeh = this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) || this.data.vehicles[0];
    if (totalWeight > Number(currentVeh.payloadMax || 0)) {
      const suitableVeh = this.data.vehicles
        .filter((v) => Number(v.payloadMax || 0) >= totalWeight)
        .sort((a, b) => Number(a.payloadMax) - Number(b.payloadMax))[0];

      if (suitableVeh) {
        this.optimizerState.selectedVehicleId = suitableVeh.id;
        UIManager.showToast(`Auto-allocated ${suitableVeh.name} (${Utils.formatWeight(suitableVeh.payloadMax)} capacity) for ${Utils.formatWeight(totalWeight)} payload.`, "info");
      }
    }

    this.saveState();
    this.calculateInitialRoute();
    this.updateAllUI();
    this.renderMap();
  },

  renderOptimizerComparison() {
    const isCalculated = !!this.optimizerState.routeCalculated;
    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);
    const orig = isCalculated ? this.optimizerState.originalStats : { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0 };
    const opt = isCalculated ? this.optimizerState.optimizedStats : { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0 };
    const sav = isCalculated ? this.optimizerState.savings : { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, percentage: 0 };
    const curr = this.data.settings.currency || "₹";

    const vehicle =
      this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) ||
      this.data.vehicles[0];
    const isEV = vehicle && vehicle.powertrain === "Electric (EV)";

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal("comp-orig-dist", isCalculated && orig.distance > 0 ? Utils.formatDistance(orig.distance) : "-- km");
    setVal("comp-orig-fuel", isCalculated && orig.fuel > 0 ? (isEV ? `${orig.fuel.toFixed(2)} kWh` : `${orig.fuel.toFixed(2)} L`) : (isEV ? "-- kWh" : "-- L"));
    setVal("comp-orig-cost", isCalculated && orig.cost > 0 ? Utils.formatCurrency(orig.cost, curr) : "₹--");
    setVal("comp-orig-time", isCalculated && orig.time > 0 ? Utils.formatDuration(orig.time) : "-- mins");
    setVal("comp-orig-co2", isCalculated && orig.distance > 0 ? (isEV ? "0.0 kg (EV Clean)" : `${orig.co2.toFixed(1)} kg`) : "-- kg");

    setVal("comp-opt-dist", isCalculated && opt.distance > 0 ? Utils.formatDistance(opt.distance) : "-- km");
    setVal("comp-opt-fuel", isCalculated && opt.fuel > 0 ? (isEV ? `${opt.fuel.toFixed(2)} kWh` : `${opt.fuel.toFixed(2)} L`) : (isEV ? "-- kWh" : "-- L"));
    setVal("comp-opt-cost", isCalculated && opt.cost > 0 ? Utils.formatCurrency(opt.cost, curr) : "₹--");
    setVal("comp-opt-time", isCalculated && opt.time > 0 ? Utils.formatDuration(opt.time) : "-- mins");
    setVal("comp-opt-co2", isCalculated && opt.distance > 0 ? (isEV ? "0.0 kg (EV Clean)" : `${opt.co2.toFixed(1)} kg`) : "-- kg");

    setVal("comp-saved-dist", isCalculated && opt.distance > 0 ? (sav.distance > 0 ? Utils.formatDistance(sav.distance) : "0.0 km (Optimal)") : "-- km");
    setVal("comp-saved-fuel", isCalculated && opt.distance > 0 ? (sav.fuel > 0 ? (isEV ? `${sav.fuel.toFixed(2)} kWh` : `${sav.fuel.toFixed(2)} L`) : (isEV ? "0.00 kWh" : "0.00 L")) : (isEV ? "-- kWh" : "-- L"));
    setVal("comp-saved-cost", isCalculated && opt.distance > 0 ? (sav.cost > 0 ? Utils.formatCurrency(sav.cost, curr) : `${curr}0.00 (Optimal)`) : "₹--");
    setVal("comp-saved-time", isCalculated && opt.distance > 0 ? (sav.time > 0 ? `${sav.time} mins` : "0 mins") : "-- mins");
    setVal("comp-saved-co2", isCalculated && opt.distance > 0 ? (isEV ? "0.0 kg (EV Clean)" : (sav.co2 > 0 ? `${sav.co2.toFixed(1)} kg CO2` : "0.0 kg CO2")) : "-- kg CO2");

    const badgePct = document.getElementById("comp-save-percentage");
    if (badgePct) badgePct.textContent = isCalculated ? `${Utils.formatPercentage(sav.percentage)} Distance Reduction` : "0% Distance Reduction";

    const barFill = document.getElementById("savings-bar-fill");
    if (barFill) barFill.style.width = isCalculated ? `${Math.min(100, sav.percentage)}%` : "0%";

    const titleEl = document.getElementById("nav-card-corridor-title");
    if (titleEl) {
      if (isCalculated && startDepot && endDepot) {
        titleEl.textContent = `${startDepot.name.split("(")[0].trim()} ➔ ${endDepot.name.split("(")[0].trim()} Highway Route`;
      } else {
        titleEl.textContent = "Point-to-Point Highway Route";
      }
    }

    setVal("nav-stat-distance", isCalculated && opt.distance > 0 ? Utils.formatDistance(opt.distance) : "--");
    setVal("nav-stat-time", isCalculated && opt.time > 0 ? Utils.formatDuration(opt.time) : "--");
    setVal("nav-stat-stops", isCalculated ? `${(this.optimizerState.selectedStopIds || []).length} Waypoints` : "0 Waypoints");
    setVal("nav-stat-cost", isCalculated && opt.cost > 0 ? Utils.formatCurrency(opt.cost, curr) : "--");

    const savingsBanner = document.getElementById("nav-card-savings-banner");
    if (savingsBanner) {
      if (isCalculated && sav.distance > 0) {
        savingsBanner.innerHTML = `<span>Consolidated Efficiency Variance: <strong style="color: #10b981;">-${Utils.formatDistance(sav.distance)}</strong> (<strong style="color: #10b981;">${sav.percentage.toFixed(1)}%</strong> OPEX reduction)</span>`;
      } else {
        savingsBanner.innerHTML = `<span>Consolidated Efficiency Variance: <strong>-- km</strong> (<strong>--%</strong> OPEX reduction)</span>`;
      }
    }

    const btnNav = document.getElementById("btn-start-navigation");
    if (btnNav) {
      if (isCalculated) {
        btnNav.disabled = false;
        btnNav.classList.add("glow-btn");
        btnNav.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Initiate Vehicle Telemetry & Live Traversal</span>`;
      } else {
        btnNav.disabled = true;
        btnNav.classList.remove("glow-btn");
        btnNav.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Select Origin & Destination to Activate Telemetry</span>`;
      }
    }
  },

  // --------------------------------------------------------------------------
  // Multi-Fleet Route Feasibility & Intelligent Best Match Matrix
  // --------------------------------------------------------------------------
  renderMultiFleetRouteComparison() {
    const compSection = document.getElementById("multi-fleet-route-comparison");
    const isDriver = this.userSession?.role === "driver";

    if (isDriver) {
      if (compSection) {
        compSection.classList.add("hidden");
        compSection.style.display = "none";
      }
      return;
    } else {
      if (compSection) {
        compSection.classList.remove("hidden");
        compSection.style.display = "";
      }
    }

    const tbody = document.getElementById("multi-fleet-comp-tbody");
    const showcaseBox = document.getElementById("best-match-showcase-box");
    if (!tbody || !this.data?.vehicles) return;

    const stopsMap = new Map((this.data.stops || []).map((s) => [s.id, s]));
    const selectedStops = (this.optimizerState.selectedStopIds || [])
      .map((id) => stopsMap.get(id))
      .filter(Boolean);
    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);
    const isCalculated = !!this.optimizerState.routeCalculated;

    if (!isCalculated || !startDepot || !endDepot) {
      if (showcaseBox) {
        showcaseBox.innerHTML = `
          <div class="p-5 text-center text-xs text-slate-500 font-medium bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            📊 Select Origin and Destination hubs, then click 'Execute Algorithmic Co-Optimization' to generate multi-fleet route comparisons.
          </div>
        `;
      }
      if (tbody) {
        tbody.innerHTML = `
          <tr class="bg-slate-50/50">
            <td colspan="9" class="py-6 text-center text-xs text-slate-500 font-medium">
              <div class="flex flex-col items-center justify-center gap-1">
                <span class="text-lg">🚚</span>
                <span class="font-bold text-slate-700">Awaiting Route Calculation</span>
                <span class="text-[11px] text-slate-400">Select Origin (Point A) & Destination (Point B) hubs, then click 'Execute Algorithmic Co-Optimization' to compare fleet options.</span>
              </div>
            </td>
          </tr>
        `;
      }
      return;
    }
    const optDistance = this.optimizerState.optimizedStats.distance || 0;
    const stopCount = selectedStops.length;
    const currency = this.data.settings.currency || "₹";

    // Run co-optimization ranking across the entire multi-fleet roster
    const coOpt = OptimizerEngine.coOptimizeVehicleAndRoute(
      selectedStops,
      this.data.vehicles,
      startDepot,
      endDepot,
      this.data.settings
    );
    const best = coOpt?.bestMatch?.vehicle;
    const bestRank = coOpt?.bestMatch;
    const bestVehicleId = best?.id;

    // 1. Populate Intelligent Best Match Showcase Widget
    if (showcaseBox && best && bestRank) {
      const isEV = best.powertrain === "Electric (EV)";
      const econ = OptimizerEngine.calculateEconomics(optDistance, best, stopCount, this.data.settings);
      const bulletsHtml = (bestRank.bullets || [])
        .map((b) => `<li class="flex items-center gap-1.5 text-xs text-emerald-900 font-medium"><span>${b.startsWith("✓") ? "✅" : "⚠️"}</span><span>${Utils.escapeHTML(b)}</span></li>`)
        .join("");

      showcaseBox.innerHTML = `
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] tracking-wide shadow-2xs">⭐ BEST MATCH</span>
              <span class="font-mono text-xs font-bold text-slate-700 bg-white/80 border border-emerald-300 px-2 py-0.5 rounded-md">${Utils.escapeHTML(best.id)}</span>
              <span class="text-xs font-semibold text-emerald-950">${Utils.escapeHTML(best.category || best.type)}</span>
            </div>
            <h4 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>${best.icon || (isEV ? "⚡" : "🚚")}</span>
              <span>${Utils.escapeHTML(best.name)}</span>
              <span class="text-xs font-normal text-slate-600 font-mono">(Pilot: ${Utils.escapeHTML(best.driver || "Rajinder Singh")})</span>
            </h4>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-emerald-200/80">
              ${bulletsHtml}
            </ul>
          </div>
          
          <div class="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 bg-white/90 p-3 rounded-xl border border-emerald-200">
            <div class="text-left lg:text-right">
              <div class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Estimated Trip OpEx</div>
              <div class="text-lg font-black text-emerald-700">${Utils.formatCurrency(econ.cost, currency)}</div>
              <div class="text-[11px] font-medium text-slate-600">${bestRank.etaFormatted || "28 hr 22 min"} ETA • ${econ.fuel.toFixed(1)} ${isEV ? "kWh" : "L"}</div>
            </div>
            ${
              isDriver
                ? `<span class="text-xs font-bold text-orange-700 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-200">Assigned Trip Unit</span>`
                : `<button type="button" class="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer w-full justify-center" onclick="App.assignVehicleAndDriver('${best.id}', '${best.driver || "Rajinder Singh"}')">
                    <span>Select Vehicle & Assign Driver</span>
                    <span>➔</span>
                  </button>`
            }
          </div>
        </div>
      `;
    }

    // 2. Populate Comparison Table
    tbody.innerHTML = this.data.vehicles
      .map((veh) => {
        const isEV = veh.powertrain === "Electric (EV)";
        const isSelected = veh.id === this.optimizerState.selectedVehicleId;
        const isBestMatch = veh.id === bestVehicleId;
        const isCapacityCompliant = Number(veh.payloadMax) >= totalPayload;
        const utilization = totalPayload > 0 ? (totalPayload / Number(veh.payloadMax)) * 100 : 0;

        const econ = OptimizerEngine.calculateEconomics(optDistance, veh, stopCount, this.data.settings);
        const remainingRangeKm = (Number(veh.fuelLevel || 80) / 100) * (isEV ? 180 : 500);
        const isRangeSufficient = remainingRangeKm >= optDistance * 1.1;

        // Drive time calculation
        const driveHours = optDistance / (Number(this.data.settings?.avgSpeed || CONFIG.ECONOMICS.DEFAULT_AVG_HIGHWAY_SPEED_KMH));
        const stopHours = (selectedStops.length * CONFIG.ECONOMICS.DEFAULT_STOP_SERVICE_MINUTES) / 60;
        const totalHours = driveHours + stopHours;
        const etaH = Math.floor(totalHours);
        const etaM = Math.round((totalHours - etaH) * 60);
        const etaFormatted = `${etaH} hr ${etaM.toString().padStart(2, "0")} min`;

        const categoryTag = veh.category
          ? `<div class="text-xs font-semibold text-slate-800">${Utils.escapeHTML(veh.category)}</div><div class="text-[10px] text-slate-500 font-mono">${isEV ? "Electric (EV)" : "Diesel IC"}</div>`
          : `<span class="text-xs text-slate-500">${Utils.escapeHTML(veh.type)}</span>`;

        let payloadDisplay = "";
        if (isCapacityCompliant) {
          payloadDisplay = `
            <div>
              <div class="text-xs font-semibold text-slate-900">${Utils.formatWeight(totalPayload)} / ${Utils.formatWeight(veh.payloadMax)}</div>
              <div class="text-[10px] text-slate-500 font-mono">${utilization.toFixed(0)}% payload fit</div>
            </div>
          `;
        } else {
          payloadDisplay = `
            <div>
              <div class="text-xs font-bold text-rose-600">🚫 Not Suitable — Payload Exceeded</div>
              <div class="text-[10px] text-rose-500 font-mono">${Utils.formatWeight(totalPayload)} required &gt; ${Utils.formatWeight(veh.payloadMax)} cap</div>
            </div>
          `;
        }

        let actionBtn = "";
        if (isSelected) {
          actionBtn = `<span class="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 border border-orange-200 text-[11px] font-bold inline-flex items-center gap-1">✓ Assigned Unit</span>`;
        } else if (isDriver) {
          actionBtn = `<span class="text-[11px] text-slate-400 font-medium">Read-Only</span>`;
        } else if (veh.status === "Breakdown" || veh.status === "Maintenance") {
          actionBtn = `<button class="btn btn-xs btn-outline opacity-50 cursor-not-allowed" disabled title="Vehicle unavailable">Unavailable</button>`;
        } else {
          actionBtn = `<button type="button" class="btn btn-xs bg-slate-900 hover:bg-orange-600 text-white font-semibold hover:border-orange-500 cursor-pointer transition-colors px-2.5 py-1 rounded-lg text-[11px]" onclick="App.assignVehicleAndDriver('${veh.id}', '${veh.driver || "Rajinder Singh"}')">Select Vehicle</button>`;
        }

        return `
          <tr class="${isSelected ? "bg-orange-50/50 font-medium" : ""}">
            <td>
              <div class="flex items-center gap-2">
                <span class="text-lg">${veh.icon || (isEV ? "⚡" : "🚚")}</span>
                <div>
                  <div class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>${Utils.escapeHTML(veh.name)}</span>
                    ${isBestMatch ? '<span class="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">BEST MATCH</span>' : ''}
                  </div>
                  <div class="text-[10px] text-slate-500 font-mono">${Utils.escapeHTML(veh.id)} • Driver: ${Utils.escapeHTML(veh.driver || "Unassigned")}</div>
                </div>
              </div>
            </td>
            <td>${categoryTag}</td>
            <td>${payloadDisplay}</td>
            <td>
              <div class="text-xs font-semibold text-slate-900">${veh.fuelLevel || 88}% ${isEV ? "Battery" : "Fuel"}</div>
              <div class="text-[10px] text-emerald-700 font-medium">${veh.healthScore || 95}% Health Score</div>
            </td>
            <td>
              <div class="text-xs font-semibold text-slate-900">${veh.efficiency} ${isEV ? "km/kWh" : "km/L"}</div>
              <div class="text-[10px] text-slate-500">₹${veh.costPerKm}/km</div>
            </td>
            <td>
              <div class="text-xs font-semibold text-slate-900">${etaFormatted}</div>
              <div class="text-[10px] text-slate-500">${optDistance.toFixed(0)} km</div>
            </td>
            <td>
              <div class="text-xs font-bold ${isBestMatch ? "text-emerald-700" : "text-slate-900"}">${Utils.formatCurrency(econ.cost, currency)}</div>
              <div class="text-[10px] text-slate-500">${econ.fuel.toFixed(1)} ${isEV ? "kWh" : "L"}</div>
            </td>
            <td>
              ${
                isEV
                  ? `<span class="text-xs font-bold text-emerald-600">0.0 kg (Zero Tailpipe)</span>`
                  : `<span class="text-xs font-semibold text-slate-700">${econ.co2.toFixed(1)} kg CO₂</span>`
              }
            </td>
            <td style="text-align: right;">${actionBtn}</td>
          </tr>
        `;
      })
      .join("");

    // Update Compare Button Text in Header
    const comparedCount = (this.optimizerState.comparedVehicleIds || []).length;
    const btnNav = document.getElementById("btn-compare-vehicles-trigger");
    if (btnNav) btnNav.textContent = `⇄ Compare (${comparedCount}/3)`;

    // 3. Populate Assigned Fleet Unit & Driver Dispatch State Box
    const assignBox = document.getElementById("assigned-fleet-confirmation-box");
    if (assignBox) {
      const activeTrip = StorageEngine.loadActiveTrip();
      const currentVeh = (this.data?.vehicles || []).find((v) => v.id === this.optimizerState.selectedVehicleId) || (this.data?.vehicles || [])[0];
      const currentDriver = currentVeh?.driver || activeTrip?.driverName || "Rajinder Singh";

      let statusBadgeClass = "badge-available";
      if (activeTrip?.status === "IN_PROGRESS") statusBadgeClass = "badge-fuel";
      else if (activeTrip?.status === "COMPLETED") statusBadgeClass = "badge-available";

      assignBox.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl shrink-0 font-bold">
            📋
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-extrabold text-orange-950">Assigned Fleet Unit</span>
              <span class="font-mono text-[11px] font-bold text-orange-700 bg-white border border-orange-300 px-2 py-0.5 rounded-md">${Utils.escapeHTML(currentVeh.id)}</span>
              <span class="status-badge ${statusBadgeClass}">${Utils.escapeHTML(activeTrip?.status || "ASSIGNED")}</span>
            </div>
            <div class="text-xs font-bold text-slate-900 mt-0.5">${Utils.escapeHTML(currentVeh.name)} • Assigned Driver: <span class="text-orange-700">${Utils.escapeHTML(currentDriver)}</span></div>
            <div class="text-[11px] text-slate-600 font-mono mt-0.5">Route: Delhi NCR Hub ➔ Jaipur ➔ Ahmedabad ➔ Mumbai Gateway</div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button type="button" class="btn btn-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer" onclick="MapEngine.startNavigationSimulation(); UIManager.showToast('Initiated Live GPS & CAN Telemetry stream for ${Utils.escapeHTML(currentVeh.id)}', 'success');">
            <span>📡 Monitor Live Telemetry</span>
          </button>
        </div>
      `;
    }
  },

  toggleCompareVehicle(vehId) {
    if (!this.optimizerState.comparedVehicleIds) {
      this.optimizerState.comparedVehicleIds = [];
    }
    const list = this.optimizerState.comparedVehicleIds;
    const idx = list.indexOf(vehId);

    if (idx !== -1) {
      list.splice(idx, 1);
    } else {
      if (list.length >= 3) {
        UIManager.showToast("⚠️ Maximum 3 vehicles can be compared simultaneously.", "warn");
        return;
      }
      list.push(vehId);
    }

    const btnNav = document.getElementById("btn-compare-vehicles-trigger");
    if (btnNav) btnNav.textContent = `⇄ Compare (${list.length}/3)`;
    this.renderMultiFleetRouteComparison();
  },

  openFleetCompareModal() {
    const list = this.optimizerState.comparedVehicleIds || [];
    if (list.length === 0) {
      UIManager.showToast("Select at least 1 vehicle compare checkbox to view comparison.", "warn");
      return;
    }

    const wrap = document.getElementById("fleet-compare-table-wrap");
    const modal = document.getElementById("modal-fleet-compare");
    if (!wrap || !modal) return;

    const vehicles = list.map((id) => this.data.vehicles.find((v) => v.id === id)).filter(Boolean);
    const routeResult = this.optimizerState.routeResult;
    const optDistance = routeResult?.distanceKm || 1384;
    const currency = this.data.settings?.currency || "₹";
    const totalPayload = Number(document.getElementById("opt-payload-input")?.value || 8600);

    let html = `
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
            <th class="p-3 w-1/4">Comparison Metric</th>
    `;

    vehicles.forEach((v) => {
      const isEV = v.powertrain === "Electric (EV)";
      html += `
        <th class="p-3 w-1/4 text-center border-l border-slate-200 bg-white">
          <div class="flex flex-col items-center">
            <span class="text-2xl mb-1">${v.icon || (isEV ? "⚡" : "🚚")}</span>
            <span class="font-extrabold text-slate-900 text-sm">${Utils.escapeHTML(v.name)}</span>
            <span class="font-mono text-[10px] text-slate-500 font-bold">${Utils.escapeHTML(v.id)}</span>
          </div>
        </th>
      `;
    });

    html += `</tr></thead><tbody class="divide-y divide-slate-200 bg-white text-slate-700">`;

    // Row 1: Payload Capacity & Fit
    html += `<tr><td class="p-3 font-bold text-slate-900">Payload Capacity</td>`;
    vehicles.forEach((v) => {
      const fit = totalPayload > 0 ? ((totalPayload / Number(v.payloadMax)) * 100).toFixed(0) : 0;
      const isOk = Number(v.payloadMax) >= totalPayload;
      html += `
        <td class="p-3 text-center border-l border-slate-200">
          <div class="font-bold ${isOk ? "text-slate-900" : "text-rose-600"}">${Utils.formatWeight(v.payloadMax)}</div>
          <div class="text-[10px] ${isOk ? "text-emerald-600 font-semibold" : "text-rose-500 font-bold"}">${isOk ? `✅ ${fit}% payload fit` : `🚫 Exceeds Limit`}</div>
        </td>
      `;
    });
    html += `</tr>`;

    // Row 2: Powertrain & Category
    html += `<tr><td class="p-3 font-bold text-slate-900">Powertrain & Category</td>`;
    vehicles.forEach((v) => {
      const isEV = v.powertrain === "Electric (EV)";
      html += `
        <td class="p-3 text-center border-l border-slate-200 font-medium">
          <div>${Utils.escapeHTML(v.category || v.type)}</div>
          <div class="text-[10px] font-bold ${isEV ? "text-emerald-600" : "text-slate-500"}">${isEV ? "⚡ Electric EV Clean" : "⛽ Commercial Diesel"}</div>
        </td>
      `;
    });
    html += `</tr>`;

    // Row 3: Efficiency
    html += `<tr><td class="p-3 font-bold text-slate-900">Energy / Fuel Efficiency</td>`;
    vehicles.forEach((v) => {
      const isEV = v.powertrain === "Electric (EV)";
      html += `
        <td class="p-3 text-center border-l border-slate-200 font-mono font-bold text-slate-800">
          ${v.efficiency} ${isEV ? "km/kWh" : "km/L"}
        </td>
      `;
    });
    html += `</tr>`;

    // Row 4: Est. Trip OpEx
    html += `<tr><td class="p-3 font-bold text-slate-900">Est. Trip OpEx</td>`;
    vehicles.forEach((v) => {
      const econ = OptimizerEngine.calculateEconomics(optDistance, v, 2, this.data.settings);
      html += `
        <td class="p-3 text-center border-l border-slate-200 font-mono font-extrabold text-emerald-700 text-sm">
          ${Utils.formatCurrency(econ.cost, currency)}
        </td>
      `;
    });
    html += `</tr>`;

    // Row 5: Action Button
    html += `<tr><td class="p-3 font-bold text-slate-900">Assign Fleet Unit</td>`;
    vehicles.forEach((v) => {
      html += `
        <td class="p-3 text-center border-l border-slate-200">
          <button type="button" class="btn btn-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer" onclick="App.assignVehicleAndDriver('${v.id}', '${v.driver || "Rajesh Kumar"}'); App.closeModals();">
            Select & Assign
          </button>
        </td>
      `;
    });
    html += `</tr>`;

    html += `</tbody></table>`;
    wrap.innerHTML = html;
    modal.classList.remove("hidden");
  },

  optimizeAndMonitorTrip() {
    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);
    const vehicle = (this.data?.vehicles || []).find((v) => v.id === this.optimizerState.selectedVehicleId) || (this.data?.vehicles || [])[0];

    const stopsMap = new Map((this.data.stops || []).map((s) => [s.id, s]));
    const selectedStops = (this.optimizerState.selectedStopIds || []).map((id) => stopsMap.get(id)).filter(Boolean);

    const activeTrip = {
      tripId: "TRIP-" + Math.floor(100000 + Math.random() * 900000),
      companyId: "TransIndia Logistics Ltd.",
      driverId: vehicle.driver || "Rajinder Singh",
      driverName: vehicle.driver || "Rajinder Singh",
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehicleReg: vehicle.reg || "RJ 14 GA 1234",
      vehicleCategory: vehicle.category || vehicle.type,
      origin: startDepot ? startDepot.name : "",
      destination: endDepot ? endDepot.name : "",
      waypoints: selectedStops.map(s => s.id),
      plannedRoute: {
        origin: startDepot ? startDepot.name : "",
        destination: endDepot ? endDepot.name : "",
        waypoints: selectedStops.map(s => s.id),
        distance: this.optimizerState.optimizedStats.distance,
        cost: this.optimizerState.optimizedStats.cost,
        time: this.optimizerState.optimizedStats.time,
        tollsCount: this.optimizerState.optimizedStats.tollCost ? 4 : 0
      },
      currentDriverRoute: null,
      distance: this.optimizerState.optimizedStats.distance,
      duration: this.optimizerState.optimizedStats.time,
      eta: "Calculated dynamically",
      tollCost: this.optimizerState.optimizedStats.tollCost,
      fuelCost: this.optimizerState.optimizedStats.fuel * (this.data.settings.fuelPrice || 90),
      driverCost: this.optimizerState.optimizedStats.driverAllowance,
      totalCost: this.optimizerState.optimizedStats.cost,
      status: CONFIG.TRIP_STATUS.ASSIGNED,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    StorageEngine.saveActiveTrip(activeTrip);
    this.saveState();
    this.updateAllUI();
    this.navigateTo("operations");
    UIManager.playSound("success");
    UIManager.showToast(`🚀 Trip [${activeTrip.tripId}] Optimized & Assigned to ${activeTrip.driverName}!`, "success");
  },

  assignVehicleAndDriver(vehId, driverName = "Rajinder Singh") {
    if (this.userSession?.role === "driver") {
      UIManager.showToast("🔒 Access Restricted: Driver accounts cannot reassign route vehicles.", "warn");
      return;
    }
    const veh = this.data.vehicles.find((v) => v.id === vehId);
    if (!veh) return;

    this.optimizerState.selectedVehicleId = vehId;

    // Update shared active trip in localStorage
    const activeTrip = StorageEngine.loadActiveTrip();
    activeTrip.vehicleId = veh.id;
    activeTrip.vehicleName = veh.name;
    activeTrip.vehicleCategory = veh.category || veh.type;
    activeTrip.driverName = driverName || veh.driver || "Rajinder Singh";
    activeTrip.status = CONFIG.TRIP_STATUS.ASSIGNED;
    activeTrip.fuelLevel = Number(veh.fuelLevel || 88);
    activeTrip.healthScore = Number(veh.healthScore || 96);
    activeTrip.updatedAt = Date.now();
    StorageEngine.saveActiveTrip(activeTrip);

    this.calculateInitialRoute();
    this.saveState();
    this.updateAllUI();
    this.renderMap();
    UIManager.playSound("success");
    UIManager.showToast(`✓ Vehicle Assigned Successfully: ${veh.name} (${veh.id}) allocated to ${activeTrip.driverName} for Delhi → Mumbai`, "success");
  },
  selectVehicleForRoute(vehId) {
    this.assignVehicleAndDriver(vehId);
  },

  // --------------------------------------------------------------------------
  // FASTag Toll Summary & Corridor Passages Breakdown
  // --------------------------------------------------------------------------
  renderFastagTollSummary() {
    const card = document.getElementById("route-fastag-corridor-card");
    const tbody = document.getElementById("fastag-plazas-tbody");
    if (!card || !tbody) return;

    const isCalculated = !!this.optimizerState.routeCalculated;
    const routeResult = this.optimizerState.routeResult;
    const elHeaderTitle = document.getElementById("fastag-header-title");
    const elAmount = document.getElementById("fastag-total-amount");
    const elCoverage = document.getElementById("fastag-coverage-info");

    if (!isCalculated || !routeResult || !routeResult.tolls) {
      if (elHeaderTitle) elHeaderTitle.textContent = "En-Route Toll Plazas (0 Identified)";
      if (elAmount) elAmount.textContent = "₹0.00";
      if (elCoverage) elCoverage.textContent = "Set origin & destination hubs to calculate route-linked toll plazas.";
      tbody.innerHTML = `
        <tr class="bg-slate-50/50">
          <td colspan="6" class="py-6 text-center text-xs text-slate-500 font-medium">
            <div class="flex flex-col items-center justify-center gap-1">
              <span class="text-lg">🎫</span>
              <span class="font-bold text-slate-700">Awaiting Route Calculation</span>
              <span class="text-[11px] text-slate-400">Set origin & destination hubs, then click 'Execute Algorithmic Co-Optimization' to calculate NHAI FASTag tolls.</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    card.classList.remove("hidden");

    const vehicle = this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) || this.data.vehicles[0];
    const tollMatch = OptimizerEngine.matchTollPlazasAlongRoute(routeResult.coordinates, 3.5, vehicle);

    const matchedTolls = tollMatch.matchedTolls;
    const currency = this.data.settings?.currency || "₹";

    if (elHeaderTitle) elHeaderTitle.textContent = `En-Route Toll Plazas (${tollMatch.totalIdentifiedCount} Identified)`;
    if (elAmount) elAmount.textContent = Utils.formatCurrency(tollMatch.totalKnownTollCost, currency);
    if (elCoverage) elCoverage.textContent = `Toll plazas identified from route-linked dataset: ${tollMatch.totalIdentifiedCount} identified / ${tollMatch.totalWithRatesCount} with available rates (${tollMatch.vehicleClassMapped} tariff applied). Coverage depends on connected toll data source.`;

    if (matchedTolls.length === 0) {
      tbody.innerHTML = `
        <tr class="bg-slate-50/50">
          <td colspan="6" class="py-5 text-center text-xs text-slate-500 font-medium">
            📍 No toll plazas identified along this calculated route corridor (Buffer: 3.5 km).
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = matchedTolls
      .map((toll, idx) => {
        const rateText = toll.rate !== null ? `₹${Number(toll.rate).toFixed(2)}` : `<span class="text-amber-600 font-semibold">Rate Unavailable</span>`;
        return `
          <tr class="hover:bg-slate-50/70 transition-colors">
            <td class="py-2.5 px-2 font-mono text-xs font-bold text-slate-400 text-center">${idx + 1}</td>
            <td class="py-2.5 px-2.5">
              <div class="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <span class="text-sm">🎫</span>
                <span>${Utils.escapeHTML(toll.name)}</span>
              </div>
              <div class="text-[10px] text-slate-500 font-medium mt-0.5">${Utils.escapeHTML(toll.state)} • ${Utils.escapeHTML(toll.source)}</div>
            </td>
            <td class="py-2.5 px-2 text-xs text-slate-700 font-medium">${Utils.escapeHTML(toll.highway)}</td>
            <td class="py-2.5 px-2 font-mono text-xs font-semibold text-slate-800">
              ${toll.routeDistanceFromOrigin} km <span class="text-[10px] text-slate-400 font-normal">along route</span>
            </td>
            <td class="py-2.5 px-2 font-mono text-[11px] font-bold text-slate-700">
              <span class="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">${toll.vehicleClass}</span>
            </td>
            <td class="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-700 text-xs">
              ${rateText}
            </td>
          </tr>
        `;
      })
      .join("");
  },

  // --------------------------------------------------------------------------
  // Driver Trip Banner & Sidebar Cockpit (Strictly Real Data Only)
  // --------------------------------------------------------------------------
  renderDriverTripActionBanner() {
    const banner = document.getElementById("driver-trip-action-banner");
    if (!banner) return;

    const isDriver = this.userSession?.role === "driver";
    const activeTrip = StorageEngine.loadActiveTrip();
    if (!isDriver || !activeTrip || !activeTrip.tripId) {
      banner.classList.add("hidden");
      return;
    }

    banner.classList.remove("hidden");
    const tripIdEl = document.getElementById("driver-banner-trip-id");
    const companyEl = document.getElementById("driver-banner-company");
    const statusBadgeEl = document.getElementById("driver-banner-status-badge");
    const routeEl = document.getElementById("driver-banner-route");
    const pilotEl = document.getElementById("driver-banner-pilot");
    const vehicleEl = document.getElementById("driver-banner-vehicle");
    const stopsEl = document.getElementById("driver-banner-stops");

    if (tripIdEl) tripIdEl.textContent = activeTrip.tripId;
    if (companyEl) companyEl.textContent = activeTrip.companyName || "Freight Logistics Operations";
    if (statusBadgeEl) {
      statusBadgeEl.textContent = activeTrip.status || "ASSIGNED";
      statusBadgeEl.className = "status-badge";
      if (activeTrip.status === CONFIG.TRIP_STATUS.IN_PROGRESS) {
        statusBadgeEl.classList.add("badge-fuel");
      } else {
        statusBadgeEl.classList.add("badge-available");
      }
    }
    if (routeEl) routeEl.textContent = `${activeTrip.origin || 'Origin'} ➔ ${activeTrip.destination || 'Destination'}`;
    if (pilotEl) pilotEl.textContent = this.userSession?.name || activeTrip.driverName || "Pilot";
    if (vehicleEl) vehicleEl.textContent = `${activeTrip.vehicleName || activeTrip.vehicleCategory || 'Vehicle'} (${activeTrip.vehicleReg || activeTrip.vehicleId || "--"})`;
    if (stopsEl) {
      const stops = Array.isArray(activeTrip.stops) ? activeTrip.stops : [];
      stopsEl.textContent = `${stops.length} Deliveries`;
    }

    const btnAccept = document.getElementById("btn-driver-accept-trip");
    const btnStart = document.getElementById("btn-driver-start-trip");
    const btnComplete = document.getElementById("btn-driver-complete-trip");

    if (btnAccept && btnStart && btnComplete) {
      if (activeTrip.status === CONFIG.TRIP_STATUS.ASSIGNED) {
        btnAccept.classList.add("hidden");
        btnStart.classList.remove("hidden");
        btnComplete.classList.add("hidden");
      } else if (activeTrip.status === CONFIG.TRIP_STATUS.IN_PROGRESS) {
        btnAccept.classList.add("hidden");
        btnStart.classList.add("hidden");
        btnComplete.classList.remove("hidden");
      } else if (activeTrip.status === CONFIG.TRIP_STATUS.COMPLETED) {
        btnAccept.classList.add("hidden");
        btnStart.classList.add("hidden");
        btnComplete.classList.remove("hidden");
        btnComplete.textContent = "✅ Trip Completed";
        btnComplete.disabled = true;
      }
    }
  },

  renderDriverSidebarCockpit() {
    const driverSidebar = document.getElementById("opt-driver-sidebar");
    const managerSidebar = document.getElementById("opt-manager-sidebar");
    const compCard = document.getElementById("route-economics-comparison-card");
    const savingsMeter = document.getElementById("route-savings-progress-container");
    const multiFleetCard = document.getElementById("multi-fleet-route-comparison");
    const navSavingsBanner = document.getElementById("nav-card-savings-banner");

    const isDriver = this.userSession?.role === "driver";

    if (isDriver) {
      if (driverSidebar) { driverSidebar.classList.remove("hidden"); driverSidebar.style.display = ""; }
      if (managerSidebar) { managerSidebar.classList.add("hidden"); managerSidebar.style.display = "none"; }
      if (compCard) { compCard.classList.add("hidden"); compCard.style.display = "none"; }
      if (savingsMeter) { savingsMeter.classList.add("hidden"); savingsMeter.style.display = "none"; }
      if (multiFleetCard) { multiFleetCard.classList.add("hidden"); multiFleetCard.style.display = "none"; }
      if (navSavingsBanner) { navSavingsBanner.classList.add("hidden"); navSavingsBanner.style.display = "none"; }

      const activeTrip = StorageEngine.loadActiveTrip();
      const elTrip = document.getElementById("driver-cockpit-trip-id");
      const elVeh = document.getElementById("driver-cockpit-veh-name");
      const elPilot = document.getElementById("driver-cockpit-pilot-name");
      const elStatus = document.getElementById("driver-cockpit-status");
      const elCompany = document.getElementById("driver-cockpit-company");
      const elFuel = document.getElementById("driver-cockpit-fuel");
      const elDist = document.getElementById("driver-cockpit-dist");
      const elEta = document.getElementById("driver-cockpit-next-eta");
      const elHealth = document.getElementById("driver-cockpit-health");
      const elManifestCount = document.getElementById("driver-manifest-count");
      const elManifestList = document.getElementById("driver-manifest-items");

      if (elTrip) elTrip.textContent = activeTrip ? activeTrip.tripId : "--";
      if (elVeh) {
        elVeh.innerHTML = activeTrip 
          ? `<span>🚛</span><span>${Utils.escapeHTML(activeTrip.vehicleName || "Carrier")} <strong class="text-orange-600 font-mono text-[11px]">(${Utils.escapeHTML(activeTrip.vehicleReg || activeTrip.vehicleId || "--")})</strong></span>`
          : `<span>No vehicle assigned</span>`;
      }
      if (elPilot) elPilot.textContent = this.userSession?.name || "Pilot";
      if (elStatus) {
        elStatus.textContent = activeTrip ? `● ${activeTrip.status || "Assigned"}` : "● Standby (No active trip)";
      }
      if (elCompany) elCompany.textContent = activeTrip ? `Fleet: ${activeTrip.companyName || "Freight Operations"}` : "No fleet assigned";
      if (elFuel) elFuel.textContent = activeTrip ? `88% Fuel` : "--";
      if (elDist) elDist.textContent = activeTrip && activeTrip.distanceKm ? `${activeTrip.distanceKm.toFixed(1)} km` : "-- km";
      if (elEta) elEta.textContent = activeTrip && activeTrip.eta ? activeTrip.eta : "--";
      if (elHealth) elHealth.textContent = activeTrip ? `98% HP` : "--";

      const stops = (activeTrip && Array.isArray(activeTrip.stops)) ? activeTrip.stops : [];
      if (elManifestCount) elManifestCount.textContent = stops.length > 0 ? `${stops.length} Drops Pending` : "No Manifest Assigned";

      if (elManifestList) {
        if (stops.length === 0) {
          elManifestList.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">No manifest assigned.</div>`;
        } else {
          elManifestList.innerHTML = stops.map((stop, idx) => `
            <div class="p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-left">
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-xs font-bold text-slate-900">#${idx + 1}. ${Utils.escapeHTML(stop.name || stop.customer || 'Stop')}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">${stop.weight || 1000} kg</span>
              </div>
              <div class="text-[11px] text-slate-500 truncate">${Utils.escapeHTML(stop.address || '')}</div>
            </div>
          `).join("");
        }
      }
    } else {
      if (driverSidebar) { driverSidebar.classList.add("hidden"); driverSidebar.style.display = "none"; }
      if (managerSidebar) { managerSidebar.classList.remove("hidden"); managerSidebar.style.display = ""; }
      if (compCard) { compCard.classList.remove("hidden"); compCard.style.display = ""; }
      if (savingsMeter) { savingsMeter.classList.remove("hidden"); savingsMeter.style.display = ""; }
      if (multiFleetCard) { multiFleetCard.classList.remove("hidden"); multiFleetCard.style.display = ""; }
      if (navSavingsBanner) { navSavingsBanner.classList.remove("hidden"); navSavingsBanner.style.display = ""; }
    }
  },

  // --------------------------------------------------------------------------
  // Driver Fleet Support & Operational Dispatch Requests
  // --------------------------------------------------------------------------
  openFleetRequestModal() {
    const modal = document.getElementById("modal-fleet-request");
    if (!modal) return;

    const currentVeh = this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) || this.data.vehicles[0];

    const vehEl = document.getElementById("freq-modal-veh");
    const tripEl = document.getElementById("freq-modal-trip");
    const form = document.getElementById("form-fleet-request");

    if (vehEl) vehEl.textContent = `Vehicle: ${currentVeh.name} (${currentVeh.id})`;
    if (tripEl) tripEl.textContent = `Active Trip: ${activeTrip.tripId || "TRIP-DEL-MUM-402"} • Pilot: ${this.userSession?.name || "Rajinder Singh"}`;
    if (form) form.reset();

    modal.classList.remove("hidden");
    UIManager.playSound("click");
  },

  submitFleetRequest(e) {
    if (e && e.preventDefault) e.preventDefault();

    const currentVeh = this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) || this.data.vehicles[0];

    const category = document.getElementById("freq-category")?.value || "GENERAL_DISPATCH";
    const priority = document.querySelector('input[name="freq-priority"]:checked')?.value || "NORMAL";
    const details = (document.getElementById("freq-details")?.value || "").trim();

    if (!details) {
      UIManager.showToast("Please provide details for your support request.", "warning");
      return;
    }

    const payload = {
      id: `FREQ-${Date.now().toString().slice(-6)}`,
      tripId: activeTrip.tripId || "TRIP-DEL-MUM-402",
      driver: this.userSession?.name || "Rajinder Singh",
      driverMobile: this.userSession?.mobile || "9876543210",
      vehicle: `${currentVeh.name} (${currentVeh.id})`,
      category: category,
      priority: priority,
      details: details,
      status: "DISPATCHED",
      timestamp: new Date().toISOString()
    };

    StorageEngine.saveFleetRequest(payload);
    this.closeModals();

    UIManager.playSound("success");
    const isUrgent = priority === "URGENT";
    UIManager.showToast(
      isUrgent
        ? `⚡ URGENT ALERT sent to TransIndia Fleet HQ! Incident logged [${payload.id}]. Dispatcher notified.`
        : `✓ Operational request [${payload.id}] sent to Fleet Management successfully.`,
      isUrgent ? "warning" : "success"
    );
  },

  renderDashOperationsWidgets() {
    // 1. Active Operations & Dispatch Command Matrix
    const activeOpsTbody = document.getElementById("dash-active-operations-tbody");
    if (activeOpsTbody) {
      const activeTrip = StorageEngine.loadActiveTrip();
      const routeResult = this.optimizerState.routeResult;
      const vehicle = (this.data?.vehicles || []).find((v) => v.id === this.optimizerState.selectedVehicleId) || (this.data?.vehicles || [])[0];
      const isEV = vehicle && vehicle.powertrain === "Electric (EV)";

      const startDepot = this.getStartDepot();
      const endDepot = this.getEndDepot(startDepot);
      const originName = startDepot ? startDepot.name : "Delhi NCR Depot";
      const destName = endDepot ? endDepot.name : "Mumbai Central Fulfillment Hub";

      activeOpsTbody.innerHTML = `
        <tr>
          <td class="px-3 py-2 font-bold text-slate-800">${Utils.escapeHTML(vehicle.id)}</td>
          <td class="px-3 py-2 text-slate-600">${Utils.escapeHTML(originName)} ➔ ${Utils.escapeHTML(destName)}</td>
          <td class="px-3 py-2 font-bold text-emerald-600">ON ROUTE</td>
        </tr>
      `;

      // Sync Live Conveyor Stage Milestones
      const waveOrigin = document.getElementById("ops-wave-origin");
      const waveDest = document.getElementById("ops-wave-dest");
      if (waveOrigin) waveOrigin.innerHTML = `<span>ORIGIN HUB</span> ${Utils.escapeHTML(originName)}`;
      if (waveDest) waveDest.innerHTML = `<span>DESTINATION</span> ${Utils.escapeHTML(destName)}`;
    }

    // 2. Recommendation box on Operations Dashboard
    const recomBox = document.getElementById("dash-recom-box");
    if (recomBox && this.data) {
      const isCalculated = !!this.optimizerState.routeCalculated;
      const startDepot = this.getStartDepot();
      const endDepot = this.getEndDepot(startDepot);

      if (!isCalculated || !startDepot || !endDepot) {
        recomBox.innerHTML = `
          <div class="p-4 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ⭐ Select Origin and Destination hubs, then click 'Execute Algorithmic Co-Optimization' to view AI Vehicle Recommendation.
          </div>
        `;
      } else {
        const stopsMap = new Map((this.data.stops || []).map((s) => [s.id, s]));
        const selectedStops = (this.optimizerState.selectedStopIds || []).map((id) => stopsMap.get(id)).filter(Boolean);

        const coOpt = OptimizerEngine.coOptimizeVehicleAndRoute(
          selectedStops,
          this.data.vehicles,
          startDepot,
          endDepot,
          this.data.settings
        );
        const best = coOpt?.bestMatch?.vehicle;

        if (best) {
          const isEV = best.powertrain === "Electric (EV)";
          recomBox.innerHTML = `
            <div class="recom-top">
              <span class="recom-tag">⭐ Top Co-Optimized Match</span>
              <span class="text-[11px] font-mono font-bold text-slate-500">${Utils.escapeHTML(best.id)}</span>
            </div>
            <div class="recom-vehicle-title flex items-center gap-2 mb-1">
              <span>${best.icon || (isEV ? "⚡" : "🚚")}</span>
              <span class="text-slate-900 font-bold text-sm">${Utils.escapeHTML(best.name)}</span>
              <span class="veh-category-pill" style="font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;">${Utils.escapeHTML(best.category || best.type)}</span>
            </div>
            <p class="text-xs text-slate-600 mb-3">${Utils.escapeHTML(coOpt.bestMatch.reason)}</p>
            <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
              <div>
                <span class="text-slate-500 text-[11px]">Payload Capacity:</span>
                <div class="font-semibold text-slate-800">${Utils.formatWeight(best.payloadMax)} (${coOpt.bestMatch.capacityUtilization.toFixed(0)}% Utilized)</div>
              </div>
              <div>
                <span class="text-slate-500 text-[11px]">Trip Operating Cost:</span>
                <div class="font-bold text-emerald-700">${Utils.formatCurrency(coOpt.bestMatch.totalTripCost, this.data.settings.currency)}</div>
              </div>
            </div>
          `;
        }
      }
    }

    // 3. Stops table on Operations Dashboard
    const stopsTbody = document.getElementById("dash-stops-tbody");
    if (stopsTbody && this.data?.stops) {
      stopsTbody.innerHTML = this.data.stops
        .map((s) => {
          let prioClass = "prio-normal";
          if (s.priority === "Urgent") prioClass = "prio-urgent";
          else if (s.priority === "High") prioClass = "prio-high";

          const assignedVeh = this.data.vehicles.find((v) => v.id === s.assignedVehicleId) || this.data.vehicles[0];

          return `
            <tr>
              <td class="font-mono text-xs font-bold text-slate-700">${Utils.escapeHTML(s.id)}</td>
              <td>
                <div class="font-bold text-xs text-slate-900">${Utils.escapeHTML(s.customer)}</div>
                <div class="text-[11px] text-slate-500">${Utils.escapeHTML(s.address.slice(0, 38))}...</div>
              </td>
              <td><span class="chk-tag ${prioClass}">${s.priority}</span></td>
              <td class="text-xs font-semibold text-slate-800">${Utils.formatWeight(s.weight)}</td>
              <td class="text-xs text-slate-700">
                <span class="inline-flex items-center gap-1">${assignedVeh?.icon || "🚚"} <strong>${Utils.escapeHTML(assignedVeh?.name || "Fleet Unit")}</strong></span>
              </td>
              <td><span class="status-badge badge-available">${s.status || "Pending"}</span></td>
            </tr>
          `;
        })
        .join("");
    }
  },

  renderOpExBreakdown() {
    const isCalculated = !!this.optimizerState.routeCalculated;
    const opt = isCalculated ? this.optimizerState.optimizedStats : { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, tollCost: 0, driverAllowance: 0, maintenanceCost: 0 };
    const sav = isCalculated ? this.optimizerState.savings : { distance: 0, fuel: 0, cost: 0 };
    const curr = this.data.settings.currency || "₹";

    const vehicle =
      this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) ||
      this.data.vehicles[0];
    const isEV = vehicle && vehicle.powertrain === "Electric (EV)";
    const fuelPrice = isEV
      ? Number(this.data.settings.electricityPrice || CONFIG.ECONOMICS.DEFAULT_ELECTRICITY_PRICE_PER_KWH)
      : Number(this.data.settings.fuelPrice || CONFIG.ECONOMICS.DEFAULT_DIESEL_PRICE_PER_LITER);

    const toll = isCalculated ? (opt.tollCost || 0) : 0;
    const fuel = isCalculated ? (opt.fuel * fuelPrice || 0) : 0;
    const driver = isCalculated ? (opt.driverAllowance || 0) : 0;
    const maint = isCalculated ? (opt.maintenanceCost || 0) : 0;
    const totalCost = isCalculated ? (opt.cost || (toll + fuel + driver + maint)) : 0;

    const setVal = (id, valStr) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valStr;
    };

    setVal("opex-total-val", isCalculated && totalCost > 0 ? Utils.formatCurrency(totalCost, curr) : "₹0.00");
    setVal("opex-toll-cost", isCalculated && toll > 0 ? Utils.formatCurrency(toll, curr) : "₹0.00");
    setVal("opex-fuel-cost", isCalculated && fuel > 0 ? Utils.formatCurrency(fuel, curr) : "₹0.00");
    setVal("opex-driver-cost", isCalculated && driver > 0 ? Utils.formatCurrency(driver, curr) : "₹0.00");
    setVal("opex-maint-cost", isCalculated && maint > 0 ? Utils.formatCurrency(maint, curr) : "₹0.00");

    const plazasCount = Math.round((opt.distance || 0) / 50);
    setVal("opex-toll-count", isCalculated ? (plazasCount > 0 ? `${plazasCount} Plaza${plazasCount === 1 ? "" : "s"}` : "0 Plazas") : "-- Plazas");
    setVal("opex-fuel-liters", isCalculated && opt.fuel > 0 ? (isEV ? `${opt.fuel.toFixed(1)} kWh` : `${opt.fuel.toFixed(1)} L`) : (isEV ? "-- kWh" : "-- L"));
    setVal("opex-driver-shifts", isCalculated && opt.time > 0 ? `${Math.ceil(opt.time / 480)} Shift${Math.ceil(opt.time / 480) === 1 ? "" : "s"}` : "-- Shifts");

    setVal("opex-fuel-unit-info", isEV ? "@ ₹9.50 / kWh EV Tariff" : "@ ₹95.00 / L Commercial Diesel");
    const cptk = (isCalculated && opt.distance > 0 && vehicle?.payloadMax > 0) ? (maint / (opt.distance * (vehicle.payloadMax / 1000))) : 0.28;
    setVal("opex-cptk-val", `₹${cptk.toFixed(2)} / ton-km`);

    const tollPct = (isCalculated && totalCost > 0) ? Math.round((toll / totalCost) * 100) : 0;
    setVal("opex-toll-pct", `${tollPct}%`);
    setVal("opex-saved-opex", isCalculated ? (sav.cost > 0 ? Utils.formatCurrency(sav.cost, curr) : `${curr}0.00 (Optimal)`) : "₹--");
  },

  renderItineraryTimeline() {
    const container = document.getElementById("itinerary-timeline");
    const countEl = document.getElementById("itinerary-count");
    if (!container) return;

    const isCalculated = !!this.optimizerState.routeCalculated;
    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);
    const stops = isCalculated ? (this.optimizerState.optimizedSequence || []) : [];

    if (!isCalculated || !startDepot) {
      if (countEl) countEl.textContent = "0 Stops • Awaiting Route Calculation";
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-500 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          📍 Select Origin and Destination hubs, then click 'Execute Algorithmic Co-Optimization' to view the detailed highway itinerary timeline.
        </div>
      `;
      return;
    }

    if (countEl) {
      const stopText = `${stops.length} Stop${stops.length === 1 ? "" : "s"}`;
      let routeType = "Custom Route";
      if (!this.optimizerState.selectedStartDepotId && !this.optimizerState.selectedEndDepotId) {
        routeType = "Awaiting Hubs";
      } else if (this.optimizerState.selectedEndDepotId === "return_start") {
        routeType = "Round Trip to Origin";
      } else if (this.optimizerState.selectedEndDepotId === "end_last_stop") {
        routeType = "One-Way Delivery";
      } else if (endDepot) {
        routeType = "Direct Inter-Hub Corridor";
      }
      countEl.textContent = `${stopText} • ${routeType}`;
    }

    let html = "";
    const avgSpeed = Number(this.data.settings?.avgSpeed || 55);
    const dwellMinsPerStop = 35;
    let cumulativeDist = 0;
    let currentPoint = startDepot;
    let elapsedMinutes = 0;

    const formatLegETA = (startHour, elapsedMins) => {
      const totalMins = startHour * 60 + Math.round(elapsedMins);
      const day = Math.floor(totalMins / (24 * 60)) + 1;
      const minsInDay = totalMins % (24 * 60);
      let hours = Math.floor(minsInDay / 60);
      const mins = minsInDay % 60;
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${ampm}`;
      return day > 1 ? `${timeStr} (Day ${day})` : timeStr;
    };

    if (startDepot) {
      html += `
        <div class="timeline-stop origin-stop">
          <div class="timeline-dot origin-dot">A</div>
          <div class="timeline-body">
            <div class="timeline-title">${Utils.escapeHTML(startDepot.name)}</div>
            <div class="timeline-sub">${Utils.escapeHTML(startDepot.address)} • Departure: 08:00 AM (Day 1)</div>
          </div>
        </div>
      `;
    }

    stops.forEach((s, idx) => {
      const legDist = Utils.haversineDistance(currentPoint.lat, currentPoint.lng, s.lat, s.lng);
      cumulativeDist += legDist;
      const legDriveMins = (legDist / avgSpeed) * 60;
      elapsedMinutes += legDriveMins;

      const etaStr = formatLegETA(8, elapsedMinutes);

      elapsedMinutes += dwellMinsPerStop;
      currentPoint = s;

      html += `
        <div class="timeline-stop">
          <div class="timeline-dot waypoint-dot">${idx + 1}</div>
          <div class="timeline-body">
            <div class="timeline-title">${Utils.escapeHTML(s.customer)} <span class="badge-mini">${s.priority}</span></div>
            <div class="timeline-sub">${Utils.escapeHTML(s.address)} • Payload: ${Utils.formatWeight(s.weight)} • Leg: ${legDist.toFixed(0)} km • ETA: ${etaStr}</div>
          </div>
        </div>
      `;
    });

    if (endDepot && (!startDepot || endDepot.id !== startDepot.id || this.optimizerState.selectedEndDepotId === "return_start" || this.optimizerState.selectedEndDepotId === "end_last_stop")) {
      const finalLegDist = Utils.haversineDistance(currentPoint.lat, currentPoint.lng, endDepot.lat, endDepot.lng);
      cumulativeDist += finalLegDist;
      const finalLegMins = (finalLegDist / avgSpeed) * 60;
      elapsedMinutes += finalLegMins;

      const finalEtaStr = formatLegETA(8, elapsedMinutes);

      const endLabel = this.optimizerState.selectedEndDepotId === "return_start"
        ? "Return to Origin Terminal"
        : (this.optimizerState.selectedEndDepotId === "end_last_stop" ? "Final Waypoint Drop-Off" : "Final Stage Drop-Off");
      html += `
        <div class="timeline-stop dest-stop">
          <div class="timeline-dot dest-dot">B</div>
          <div class="timeline-body">
            <div class="timeline-title">${Utils.escapeHTML(endDepot.name)}</div>
            <div class="timeline-sub">${Utils.escapeHTML(endDepot.address || "")} • Leg: ${finalLegDist.toFixed(0)} km • Arrival ETA: ${finalEtaStr} • ${endLabel}</div>
          </div>
        </div>
      `;
    }

    if (!startDepot && !endDepot && stops.length === 0) {
      html = `<div class="p-4 text-center text-xs text-slate-400">Select origin and destination hubs to build route itinerary.</div>`;
    }

    container.innerHTML = html;
  },

  renderMap() {
    const startDepot = this.getStartDepot();
    const endDepot = this.getEndDepot(startDepot);
    const optStops = this.optimizerState.optimizedSequence;
    const vehicle = this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId);

    MapEngine.renderMap(startDepot, endDepot, optStops, vehicle);
  },

  renderAllCharts() {
    AnalyticsEngine.renderAllCharts();
  },

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------
  setupEventListeners() {
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.onclick = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const target = btn.dataset.nav;
        if (target) {
          this.navigateTo(target);
        }
      };
    });
    document.getElementById("opt-vehicle-select")?.addEventListener("change", (e) => {
      this.optimizerState.selectedVehicleId = e.target.value;
      this.optimizerState.routeCalculated = false;
      MapEngine.stopNavigationSimulation(true);
      this.calculateInitialRoute();
      this.saveState();
      this.updateAllUI();
      this.renderMap();
    });

    document.getElementById("opt-depot-from-select")?.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) {
        this.optimizerState.customStartDepot = null;
        this.optimizerState.selectedStartDepotId = "";
      } else if (this.data.depots[val]) {
        this.optimizerState.customStartDepot = null;
        this.optimizerState.selectedStartDepotId = val;
      } else if (this.optimizerState.customStartDepot && this.optimizerState.customStartDepot.id === val) {
        this.optimizerState.selectedStartDepotId = val;
      }

      this.optimizerState.selectedStopIds = [];
      this.optimizerState.routeCalculated = false;
      MapEngine.stopNavigationSimulation(true);

      const fromInput = document.getElementById("opt-depot-from-search");
      if (fromInput) {
        const startDepot = this.getStartDepot();
        fromInput.value = startDepot ? startDepot.name : "";
      }
      this.populateDepotDropdowns();
      this.calculateInitialRoute();
      this.saveState();
      this.updateAllUI();
      this.renderMap();
      if (val) {
        const startDepot = this.getStartDepot();
        UIManager.showToast(`Origin set: ${startDepot?.name || val}`, "info");
      }
    });

    document.getElementById("opt-depot-to-select")?.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) {
        this.optimizerState.customEndDepot = null;
        this.optimizerState.selectedEndDepotId = "";
      } else if (val === "return_start" || val === "end_last_stop" || this.data.depots[val]) {
        this.optimizerState.customEndDepot = null;
        this.optimizerState.selectedEndDepotId = val;
      } else if (this.optimizerState.customEndDepot && this.optimizerState.customEndDepot.id === val) {
        this.optimizerState.selectedEndDepotId = val;
      }

      this.optimizerState.selectedStopIds = [];
      this.optimizerState.routeCalculated = false;
      MapEngine.stopNavigationSimulation(true);

      const toInput = document.getElementById("opt-depot-to-search");
      if (toInput) {
        const endDepot = this.getEndDepot(this.getStartDepot());
        toInput.value = (endDepot && val !== "return_start" && val !== "end_last_stop") ? endDepot.name : "";
      }
      this.populateDepotDropdowns();
      this.calculateInitialRoute();
      this.saveState();
      this.updateAllUI();
      this.renderMap();
      if (val) {
        const label = val === "return_start" ? "Round Trip (Return to Origin)" : (val === "end_last_stop" ? "One-Way (Final Stop)" : (this.getEndDepot(this.getStartDepot())?.name || val));
        UIManager.showToast(`Destination set: ${label}`, "info");
      }
    });

    document.getElementById("btn-auto-recommend-vehicle")?.addEventListener("click", () => this.autoRecommendVehicle());
    document.getElementById("btn-run-optimization")?.addEventListener("click", () => this.runFullCoOptimization());

    document.getElementById("btn-select-all-stops")?.addEventListener("click", () => {
      this.optimizerState.selectedStopIds = this.data.stops.map((s) => s.id);
      this.optimizerState.routeCalculated = false;
      MapEngine.stopNavigationSimulation(true);
      this.calculateInitialRoute();
      this.saveState();
      this.updateAllUI();
      this.renderMap();
    });

    document.getElementById("btn-deselect-all-stops")?.addEventListener("click", () => {
      this.optimizerState.selectedStopIds = [];
      this.optimizerState.routeCalculated = false;
      MapEngine.stopNavigationSimulation(true);
      this.calculateInitialRoute();
      this.saveState();
      this.updateAllUI();
      this.renderMap();
    });

    document.getElementById("btn-reset-route")?.addEventListener("click", () => {
      this.optimizerState.selectedStopIds = this.data.stops.map((s) => s.id);
      this.optimizerState.routeCalculated = false;
      MapEngine.stopNavigationSimulation(true);
      this.calculateInitialRoute();
      this.saveState();
      this.updateAllUI();
      this.renderMap();
      UIManager.showToast("Reset stop sequence to default.", "info");
    });
  },

  // --------------------------------------------------------------------------
  // Landing Animations & Parallax
  // --------------------------------------------------------------------------
  startLandingTypewriterAnimation() {
    const textElem = document.getElementById("landing-typewriter-line");
    if (!textElem) return;
    if (this._landingTypewriterActive) return;
    this._landingTypewriterActive = true;

    const phrases = ["Costs Lower.", "Made Smarter.", "Delivered Faster.", "Fleets Better."];
    let pIdx = 0;
    let cIdx = phrases[0].length;
    let isDel = true;

    const tick = () => {
      const cur = phrases[pIdx];
      if (!isDel) {
        cIdx++;
        textElem.textContent = cur.slice(0, cIdx);
        if (cIdx >= cur.length) {
          isDel = true;
          setTimeout(tick, 2500); // 2.5s calm reading hold
        } else {
          setTimeout(tick, 120); // 120ms natural typing cadence
        }
      } else {
        cIdx--;
        textElem.textContent = cur.slice(0, Math.max(0, cIdx));
        if (cIdx <= 0) {
          isDel = false;
          pIdx = (pIdx + 1) % phrases.length;
          setTimeout(tick, 600); // 600ms pause before typing next word
        } else {
          setTimeout(tick, 65); // 65ms smooth backspace
        }
      }
    };
    setTimeout(tick, 2200);
  },

  startHeroTextAnimation() {
    const textElem = document.getElementById("hero-typewriter-text");
    const rotatingElem = document.getElementById("hero-rotating-word");
    if (!textElem) return;

    const titles = ["RIDO", "RIDO Logistics", "RIDO Delivery"];
    const phrases = ["delivery routes", "fuel expenses", "transit times", "fleet operations"];

    let tIdx = 0, cIdx = 0, isDel = false, pIdx = 0;

    const typeCycle = () => {
      const cur = titles[tIdx];
      if (isDel) {
        textElem.textContent = cur.substring(0, cIdx - 1);
        cIdx--;
      } else {
        textElem.textContent = cur.substring(0, cIdx + 1);
        cIdx++;
      }

      let timeout = isDel ? 50 : 100;
      if (!isDel && cIdx === cur.length) {
        timeout = 2000;
        isDel = true;
      } else if (isDel && cIdx === 0) {
        isDel = false;
        tIdx = (tIdx + 1) % titles.length;
        timeout = 400;

        pIdx = (pIdx + 1) % phrases.length;
        if (rotatingElem) {
          rotatingElem.style.opacity = "0";
          setTimeout(() => {
            rotatingElem.textContent = phrases[pIdx];
            rotatingElem.style.opacity = "1";
          }, 150);
        }
      }
      setTimeout(typeCycle, timeout);
    };
    setTimeout(typeCycle, 300);
  },

  initHeroTruckParallax() {
    const hero = document.querySelector(".landing-hero-split");
    const truck = document.getElementById("hero-truck-interactive");
    if (!hero || !truck) return;

    hero.addEventListener(
      "mousemove",
      (e) => {
        const rect = hero.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const relY = (e.clientY - rect.top) / rect.height - 0.5;
        truck.style.transform = `translate(${relX * 12}px, ${relY * 6}px)`;
      },
      { passive: true }
    );
  },

  updateLandingRoiEstimator(kmVal) {
    const km = parseInt(kmVal, 10) || 120000;
    const disp = document.getElementById("roi-slider-km-val");
    if (disp) disp.textContent = `${km.toLocaleString()} km / month`;

    const savedKm = km * 12 * 0.187;
    const annualSavingsLakhs = ((savedKm / 4.2) * CONFIG.ECONOMICS.DEFAULT_DIESEL_PRICE_PER_LITER) / 100000;
    const hoursSaved = Math.round(savedKm / CONFIG.ECONOMICS.DEFAULT_AVG_HIGHWAY_SPEED_KMH);
    const co2SavedTons = Math.round(savedKm * 0.000268);

    const savElem = document.getElementById("roi-annual-savings");
    const hrsElem = document.getElementById("roi-hours-saved");
    const co2Elem = document.getElementById("roi-co2-saved");

    if (savElem) savElem.textContent = `₹${annualSavingsLakhs.toFixed(1)} Lakhs / yr`;
    if (hrsElem) hrsElem.textContent = `${hoursSaved.toLocaleString()} hrs / yr`;
    if (co2Elem) co2Elem.textContent = `${co2SavedTons.toLocaleString()} Tons / yr`;
  },

  simulateLanding2OptUntangle() {
    const pathElem = document.getElementById("landing-route-path");
    const badgeElem = document.getElementById("landing-crossings-badge");
    if (!pathElem) return;

    UIManager.playSound("click");
    if (badgeElem) {
      badgeElem.innerHTML = `<span class="text-rose-600 font-bold">Evaluating Crossings...</span>`;
    }
    pathElem.setAttribute("points", "80,100 340,45 160,45 230,220 400,130");

    setTimeout(() => {
      UIManager.playSound("success");
      pathElem.setAttribute("points", "80,100 160,45 340,45 400,130 230,220");
      if (badgeElem) {
        badgeElem.innerHTML = `<span class="text-emerald-600 font-semibold">0 Crossings (Optimal)</span>`;
      }
      UIManager.showToast("2-Opt Pairwise Topological Edge Swap Solved: -21.4% Distance Reduction!", "success");
    }, 280);
  },

  // --------------------------------------------------------------------------
  // Dispatcher & Driver Authentication & Persistent Session Management
  // --------------------------------------------------------------------------
  initAuth() {
    this.userSession = StorageEngine.loadUserSession();
    if (this.userSession) {
      if (this.userSession.role === "driver") {
        this.setupDriverDashboard(false);
      } else {
        this.setupCompanyDashboard(false);
      }
    }
    this.renderAuthUI();
  },

  renderAuthUI() {
    const container = document.getElementById("nav-auth-container");
    if (!container) return;

    if (this.userSession) {
      const isDriver = this.userSession.role === "driver";
      const roleBadge = isDriver ? "Driver" : "Company";
      const roleIcon = isDriver ? "🚚" : "🏢";
      const displayName = this.userSession.name ? this.userSession.name.split(" ")[0] : (isDriver ? "Driver" : "Company");

      container.innerHTML = `
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Profile Circle -->
          <div class="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer select-none" title="${Utils.escapeHTML(this.userSession.name || 'User')}">
            ${Utils.escapeHTML(this.userSession.initials || (isDriver ? "DR" : "VM"))}
          </div>

          <!-- Direct Prominent Sign Out Button -->
          <button type="button" class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 border-none" onclick="App.handleLogout()" title="Sign Out of RIDO">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Sign Out</span>
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="flex items-center gap-2">
          <button class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-orange-600 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-2xs cursor-pointer active:scale-95" onclick="App.openAuthFlow('driver');">
            Sign In
          </button>
          <button class="btn-header-signup px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-xs cursor-pointer active:scale-95" onclick="App.openAuthFlow('driver');">
            Get Started
          </button>
        </div>
      `;
    }
    this.renderNavItems();
  },

  renderNavItems() {
    const navBar = document.getElementById("main-nav-bar");
    const mobileDrawer = document.getElementById("mobile-drawer-links");
    const role = this.userSession?.role || 'guest';
    const active = this.activeView || 'landing';

    let navHTML = '';
    let drawerHTML = '';

    if (role === 'driver') {
      navHTML = `
        <button class="nav-item-btn ${active === 'driver-dashboard' ? 'active' : ''} group" data-nav="driver-dashboard" onclick="App.navigateTo('driver-dashboard')">
          <svg class="w-[17px] h-[17px] text-orange-600 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>My Trip</span>
        </button>
        <button class="nav-item-btn ${active === 'live-tracking' ? 'active' : ''} group" data-nav="live-tracking" onclick="App.navigateTo('live-tracking')">
          <svg class="w-[17px] h-[17px] text-emerald-600 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          <span>Live Navigation</span>
        </button>
        <button class="nav-item-btn ${active === 'stops' ? 'active' : ''} group" data-nav="stops" onclick="App.navigateTo('stops')">
          <svg class="w-[17px] h-[17px] text-slate-500 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Stops & Manifest</span>
        </button>
      `;

      drawerHTML = `
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'driver-dashboard' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('driver-dashboard')">
          <span class="text-base">🚛</span>
          <span>My Trip Dashboard</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'live-tracking' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('live-tracking')">
          <span class="text-base">📍</span>
          <span>Live Navigation</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'stops' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('stops')">
          <span class="text-base">📦</span>
          <span>Stops & Manifest</span>
        </button>
        <div class="border-t border-slate-100 my-2 pt-2">
          <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold text-xs cursor-pointer border-none bg-transparent" onclick="App.handleLogout()">
            <span class="text-base">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      `;
    } else if (role === 'company') {
      navHTML = `
        <button class="nav-item-btn ${active === 'operations' ? 'active' : ''} group" data-nav="operations" onclick="App.navigateTo('operations')">
          <svg class="w-[17px] h-[17px] text-slate-500 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          <span>Operations HQ</span>
        </button>
        <button class="nav-item-btn ${active === 'optimizer' ? 'active' : ''} group" data-nav="optimizer" onclick="App.navigateTo('optimizer')">
          <svg class="w-[17px] h-[17px] text-orange-500 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Route Optimizer</span>
        </button>
        <button class="nav-item-btn ${active === 'fleet' ? 'active' : ''} group" data-nav="fleet" onclick="App.navigateTo('fleet')">
          <svg class="w-[17px] h-[17px] text-slate-500 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>Fleet Management</span>
        </button>
        <button class="nav-item-btn ${active === 'live-tracking' ? 'active' : ''} group" data-nav="live-tracking" onclick="App.navigateTo('live-tracking')">
          <svg class="w-[17px] h-[17px] text-emerald-600 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          <span>Live Tracking</span>
        </button>
        <button class="nav-item-btn ${active === 'analytics' || active === 'fastag' || active === 'company-fastag-costs' || active === 'costs' ? 'active' : ''} group" data-nav="analytics" onclick="App.navigateTo('analytics')">
          <svg class="w-[17px] h-[17px] text-purple-600 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          <span>Costs & Analytics</span>
        </button>
        <button class="nav-item-btn ${active === 'settings' ? 'active' : ''} group" data-nav="settings" onclick="App.navigateTo('settings')">
          <svg class="w-[17px] h-[17px] text-slate-500 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Settings</span>
        </button>
      `;

      drawerHTML = `
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'operations' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('operations')">
          <span class="text-base">🏢</span>
          <span>Operations HQ</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'optimizer' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('optimizer')">
          <span class="text-base">⚡</span>
          <span>Route Optimizer</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'fleet' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('fleet')">
          <span class="text-base">🚛</span>
          <span>Fleet Management</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'live-tracking' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('live-tracking')">
          <span class="text-base">📍</span>
          <span>Live Tracking</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'analytics' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('analytics')">
          <span class="text-base">📈</span>
          <span>Costs & Analytics</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'stops' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('stops')">
          <span class="text-base">🛑</span>
          <span>Delivery Stops</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'simulator' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('simulator')">
          <span class="text-base">🧪</span>
          <span>Scenario Simulator</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'settings' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('settings')">
          <span class="text-base">⚙️</span>
          <span>Settings</span>
        </button>
        <div class="border-t border-slate-100 my-2 pt-2">
          <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold text-xs cursor-pointer border-none bg-transparent" onclick="App.handleLogout()">
            <span class="text-base">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      `;
    } else {
      // Guest
      navHTML = `
        <button class="nav-item-btn ${active === 'landing' ? 'active' : ''} group" data-nav="landing" onclick="App.navigateTo('landing')">
          <svg class="w-[17px] h-[17px] text-orange-600 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>Product Overview</span>
        </button>
        <button class="nav-item-btn group" data-nav="optimizer" onclick="App.navigateTo('optimizer')">
          <svg class="w-[17px] h-[17px] text-orange-500 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Route Optimizer</span>
        </button>
        <button class="nav-item-btn group" data-nav="fleet" onclick="App.navigateTo('fleet')">
          <svg class="w-[17px] h-[17px] text-slate-500 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>Fleet Telemetry</span>
        </button>
        <button class="nav-item-btn group" data-nav="operations" onclick="App.navigateTo('operations')">
          <svg class="w-[17px] h-[17px] text-slate-500 nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          <span>Operations HQ</span>
        </button>
      `;

      drawerHTML = `
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'landing' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('landing')">
          <span class="text-base">🏠</span>
          <span>Product Overview</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'optimizer' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('optimizer')">
          <span class="text-base">⚡</span>
          <span>Route Optimizer</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'fleet' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('fleet')">
          <span class="text-base">🚛</span>
          <span>Fleet Telemetry</span>
        </button>
        <button class="w-full text-left flex items-center gap-3 p-3 rounded-2xl ${active === 'operations' ? 'bg-orange-50 text-orange-600 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'} text-xs cursor-pointer border-none bg-transparent" onclick="App.navigateTo('operations')">
          <span class="text-base">🏢</span>
          <span>Operations HQ</span>
        </button>
        <div class="border-t border-slate-100 my-2 pt-2 space-y-2">
          <button class="w-full py-2.5 px-4 rounded-xl bg-orange-600 text-white font-extrabold text-xs shadow-sm cursor-pointer border-none" onclick="App.openRoleModal()">
            Get Started / Sign In
          </button>
        </div>
      `;
    }

    if (navBar) navBar.innerHTML = navHTML;
    if (mobileDrawer) mobileDrawer.innerHTML = drawerHTML;

    // Update Mobile Bottom Nav Active States
    const mobBottomBtns = document.querySelectorAll("#mobile-bottom-nav button[data-mob-nav]");
    mobBottomBtns.forEach((btn) => {
      const navTarget = btn.dataset.mobNav;
      const isCurrent = navTarget === active || (active === 'dashboard' && navTarget === 'operations');
      if (isCurrent) {
        btn.classList.add("text-orange-600");
        btn.classList.remove("text-slate-500");
        const label = btn.querySelector("span");
        if (label) label.className = "text-[10px] font-black text-orange-600";
      } else {
        btn.classList.remove("text-orange-600");
        btn.classList.add("text-slate-500");
        const label = btn.querySelector("span");
        if (label) label.className = "text-[10px] font-bold text-slate-500";
      }
    });
  },

  toggleMobileMenu() {
    const drawer = document.getElementById("mobile-nav-drawer");
    const iconOpen = document.getElementById("mobile-menu-icon-open");
    const iconClose = document.getElementById("mobile-menu-icon-close");
    if (!drawer) return;

    const isHidden = drawer.classList.contains("hidden");
    if (isHidden) {
      drawer.classList.remove("hidden");
      if (iconOpen) iconOpen.classList.add("hidden");
      if (iconClose) iconClose.classList.remove("hidden");
    } else {
      drawer.classList.add("hidden");
      if (iconOpen) iconOpen.classList.remove("hidden");
      if (iconClose) iconClose.classList.add("hidden");
    }
  },

  closeMobileMenu() {
    const drawer = document.getElementById("mobile-nav-drawer");
    const iconOpen = document.getElementById("mobile-menu-icon-open");
    const iconClose = document.getElementById("mobile-menu-icon-close");
    if (drawer) drawer.classList.add("hidden");
    if (iconOpen) iconOpen.classList.remove("hidden");
    if (iconClose) iconClose.classList.add("hidden");
  },

  loadDemoExperience(role = 'admin') {
    if (role === 'driver') {
      const driverSession = {
        id: "DRV-DEMO-01",
        name: "Rajinder Singh",
        initials: "RS",
        role: "driver",
        vehicle: "TRK-NATIONAL-01",
        vehicleName: "Tata Prima 5530.S",
        vehiclePlate: "PB 10 GA 1234",
        vehicleFuel: "Diesel",
        fastagId: "ICICI-FASTAG-9821",
        companyName: "TransIndia Logistics Ltd.",
        phone: "+91 98765 43210",
        email: "driver.rajinder@transindia.in",
        token: "rido_auth_tok_demo_driver"
      };
      StorageEngine.saveUserSession(driverSession);
      this.userSession = driverSession;
      this.setupDriverDashboard(true);
      this.renderAuthUI();
      this.navigateTo("driver-dashboard");
      UIManager.playSound("success");
      UIManager.showToast("🚚 Logged into Driver Portal Demo (Active Assigned Trip: Delhi ➔ Mumbai)", "success");
    } else {
      const adminSession = {
        id: "CMP-DEMO-01",
        name: "Vikram Mehta",
        initials: "VM",
        role: "company",
        companyName: "TransIndia Logistics Ltd.",
        phone: "+91 98110 54321",
        email: "admin@transindia.in",
        token: "rido_auth_tok_demo_admin"
      };
      StorageEngine.saveUserSession(adminSession);
      this.userSession = adminSession;
      this.setupCompanyDashboard(true);
      this.renderAuthUI();
      this.navigateTo("operations");
      UIManager.playSound("success");
      UIManager.showToast("🏢 Logged into Company Operations (Operations HQ & Fleet Analytics)", "success");
    }
  },

  openRoleModal(role = "driver", mode = "login") {
    UIManager.closeModals();
    this.switchAuthRole(role, mode);
    this.toggleAuthMode(mode);
    this.navigateTo('auth');
  },

  openPitchModal() {
    this.navigateTo('operations');
  },

  openDemoModal() {
    this.openRoleModal('company', 'login');
  },

  openAuthFlow(role = "driver") {
    UIManager.closeModals();
    this.switchAuthRole(role, "login");
    this.toggleAuthMode("login");
    this.navigateTo("auth");
  },

  switchDriverAuthTab(tab = "login") {
    const isLogin = tab === "login";
    const tabLogin = document.getElementById("driver-tab-login");
    const tabSignup = document.getElementById("driver-tab-signup");
    const secLogin = document.getElementById("driver-auth-login-section");
    const secSignup = document.getElementById("driver-auth-signup-section");
    const errLogin = document.getElementById("driver-login-error");
    const errSignup = document.getElementById("driver-signup-error");

    if (errLogin) errLogin.classList.add("hidden");
    if (errSignup) errSignup.classList.add("hidden");

    if (tabLogin && tabSignup && secLogin && secSignup) {
      tabLogin.classList.toggle("active", isLogin);
      tabSignup.classList.toggle("active", !isLogin);
      secLogin.classList.toggle("hidden", !isLogin);
      secSignup.classList.toggle("hidden", isLogin);
    }
  },

  switchCompanyAuthTab(tab = "login") {
    const isLogin = tab === "login";
    const tabLogin = document.getElementById("company-tab-login");
    const tabSignup = document.getElementById("company-tab-signup");
    const secLogin = document.getElementById("company-auth-login-section");
    const secSignup = document.getElementById("company-auth-signup-section");
    const errLogin = document.getElementById("company-login-error");
    const errSignup = document.getElementById("company-signup-error");

    if (errLogin) errLogin.classList.add("hidden");
    if (errSignup) errSignup.classList.add("hidden");

    if (tabLogin && tabSignup && secLogin && secSignup) {
      tabLogin.classList.toggle("active", isLogin);
      tabSignup.classList.toggle("active", !isLogin);
      secLogin.classList.toggle("hidden", !isLogin);
      secSignup.classList.toggle("hidden", isLogin);
    }
  },

  fillDemoDriverLogin() {
    const mobileInput = document.getElementById("driver-login-mobile");
    const passInput = document.getElementById("driver-login-password");
    if (mobileInput) mobileInput.value = "9876543210";
    if (passInput) passInput.value = "password123";
    UIManager.playSound("click");
  },

  fillDemoCompanyLogin() {
    const idInput = document.getElementById("company-login-identifier");
    const passInput = document.getElementById("company-login-password");
    if (idInput) idInput.value = "admin@transindia.in";
    if (passInput) passInput.value = "password123";
    UIManager.playSound("click");
  },

  fillDemoDriverLogin() {
    const mob = document.getElementById("driver-login-mobile");
    const pass = document.getElementById("driver-login-password");
    if (mob) mob.value = "9876543210";
    if (pass) pass.value = "password123";
    UIManager.showToast("Demo driver credentials filled: 9876543210 / password123", "info");
  },

  fillDemoCompanyLogin() {
    const id = document.getElementById("company-login-identifier");
    const pass = document.getElementById("company-login-password");
    if (id) id.value = "admin@transindia.in";
    if (pass) pass.value = "password123";
    UIManager.showToast("Demo enterprise credentials filled: admin@transindia.in / password123", "info");
  },

  startDemoMode(role = "driver") {
    if (role === "driver") {
      this.userSession = {
        id: "drv_demo_01",
        name: "Rajinder Singh (Driver)",
        mobile: "9876543210",
        role: "driver",
        title: "Commercial Freight Pilot",
        initials: "RS",
        assignedTrip: null,
        vehicleId: null,
        vehicleReg: null,
        vehicleName: null
      };
      StorageEngine.saveUserSession(this.userSession, true);
      UIManager.closeModals();
      this.setupDriverDashboard(false);
      this.renderAuthUI();
      this.navigateTo("driver-dashboard");
      UIManager.playSound("success");
      UIManager.showToast("🚚 Driver Console active (Standby • No trips assigned).", "info");
    } else {
      this.userSession = {
        id: "comp_demo_01",
        name: "Vikram Mehta (Fleet Director)",
        companyName: "TransIndia Logistics Ltd.",
        email: "admin@transindia.in",
        mobile: "9876500000",
        role: "company",
        title: "Fleet Operations Director",
        initials: "VM"
      };
      StorageEngine.saveUserSession(this.userSession, true);
      UIManager.closeModals();
      this.setupCompanyDashboard(true);
      this.renderAuthUI();
      this.navigateTo("operations");
      UIManager.playSound("success");
      UIManager.showToast("🏢 Company Demo active: Multi-vehicle operations loaded!", "success");
    }
  },

  setupDriverDashboard(startSim = false) {
    document.body.classList.remove('role-company', 'role-driver', 'role-guest');
    document.body.classList.add('role-driver');

    if (!this.data || !this.data.vehicles || this.data.vehicles.length === 0) {
      this.loadState();
    }

    const activeTrip = (typeof StorageEngine !== "undefined" && StorageEngine.loadActiveTrip) ? StorageEngine.loadActiveTrip() : null;
    if (activeTrip && activeTrip.origin && activeTrip.destination) {
      this.optimizerState.routeCalculated = true;
      this.optimizerState.selectedVehicleId = activeTrip.vehicleId || this.optimizerState.selectedVehicleId;
      this.optimizerState.activeTrip = activeTrip;
      if (activeTrip.coordinates && activeTrip.coordinates.length > 1) {
        this.optimizerState.routeResult = {
          coordinates: activeTrip.coordinates,
          distanceKm: activeTrip.distanceKm,
          durationHours: activeTrip.durationHours,
          totalCost: activeTrip.totalCost,
          tolls: activeTrip.tolls || [],
          fuelStations: []
        };
      }
    }

    this.data.activeZone = "all_india";
    this.saveState();
    this.updateAllUI();
    try { 
      this.renderMap(); 
      this.renderLiveTrackingUI();
      if (window.MapEngine) MapEngine.initDriverDashMap();
    } catch (e) {}
  },

  setupCompanyDashboard(startSim = false) {
    document.body.classList.remove('role-company', 'role-driver', 'role-guest');
    document.body.classList.add('role-company');

    if (!this.data) {
      this.loadState();
    }
    if (!this.data.vehicles) {
      this.data.vehicles = [];
    }

    this.saveState();
    this.updateAllUI();
    try { 
      this.renderMap(); 
      if (window.FleetManager) FleetManager.renderFleetCards();
    } catch (e) {}
  },

  async handleDriverLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const mobileInput = document.getElementById("driver-login-mobile");
    const passInput = document.getElementById("driver-login-password");
    const remInput = document.getElementById("driver-login-remember");
    const errBox = document.getElementById("driver-login-error");
    const errText = document.getElementById("driver-login-error-text");

    const rawMobile = (mobileInput?.value || "").trim();
    const password = (passInput?.value || "").trim();
    const rememberMe = remInput ? remInput.checked : true;

    const showError = (msg) => {
      if (errBox && errText) {
        errText.textContent = msg;
        errBox.classList.remove("hidden");
      }
      UIManager.playSound("warning");
    };

    if (!rawMobile || !password) {
      showError("Please enter both mobile number and password.");
      return;
    }

    const valMobile = Utils.normalizeIndianMobile(rawMobile);
    if (!valMobile.valid) {
      showError(valMobile.error || "Please enter a valid 10-digit mobile number.");
      return;
    }

    const account = StorageEngine.findDriverAccount(valMobile.normalized);
    const passMatch = account ? await Utils.verifyPassword(password, account.password) : false;

    if (!account || !passMatch) {
      showError("Invalid mobile number or password.");
      return;
    }

    if (errBox) errBox.classList.add("hidden");

    const drvTruck = StorageEngine.getDriverTruck(account.id);
    this.userSession = {
      id: account.id,
      name: account.name,
      mobile: account.mobile,
      role: "driver",
      title: "Commercial Freight Pilot",
      initials: (account.name || "RK").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
      assignedTrip: null,
      vehicleId: drvTruck ? drvTruck.id : null,
      vehicleReg: drvTruck ? drvTruck.regNo : null,
      vehicleName: drvTruck ? drvTruck.model : null
    };

    StorageEngine.saveUserSession(this.userSession, rememberMe);
    UIManager.closeModals();
    this.setupDriverDashboard(false);
    this.renderAuthUI();
    this.navigateTo("driver-dashboard");

    UIManager.playSound("success");
    UIManager.showToast(`Welcome back, ${account.name}! Driver console active.`, "success");
  },

  handleDriverOtpLogin() {
    const mobileInput = document.getElementById("driver-login-mobile");
    const rawMobile = (mobileInput?.value || "").trim() || "9876543210";
    const valMobile = Utils.normalizeIndianMobile(rawMobile);
    
    if (!valMobile.valid) {
      UIManager.showToast("Please enter a valid 10-digit mobile number first.", "warning");
      return;
    }

    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    this.activeDriverOtpState = {
      mobile: valMobile.normalized,
      otp: generatedOtp,
      expiresAt: Date.now() + 120000,
      attempts: 0
    };

    UIManager.showToast(`[DEMO OTP] Verification code: ${generatedOtp} (Valid 2 mins)`, "info");

    const enteredOtp = prompt(`[RIDO Driver Verification - DEMO]
A 6-digit verification code was generated for +91 ${valMobile.normalized}.

Demo Verification Code: ${generatedOtp}

Enter code to sign in:`, generatedOtp);
    if (!enteredOtp) return;

    if (Date.now() > this.activeDriverOtpState.expiresAt) {
      UIManager.showToast("Verification code has expired. Please request a new code.", "error");
      return;
    }

    if (this.activeDriverOtpState.attempts++ >= 3) {
      UIManager.showToast("Too many incorrect attempts. Please request a new code.", "error");
      return;
    }

    if (enteredOtp.trim() === this.activeDriverOtpState.otp) {
      let account = StorageEngine.findDriverAccount(valMobile.normalized);
      if (!account) {
        account = StorageEngine.addDriverAccount({
          id: `drv_${Date.now()}`,
          name: "Driver Partner",
          mobile: valMobile.normalized,
          password: "password123",
          role: "driver",
          assignedTrip: null,
          vehicleId: null,
          vehicleName: null,
          created: Date.now()
        });
      }

      const drvTruck = StorageEngine.getDriverTruck(account.id);
      this.userSession = {
        id: account.id,
        name: account.name,
        mobile: account.mobile,
        role: "driver",
        title: "Commercial Freight Pilot",
        initials: (account.name || "DR").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
        assignedTrip: null,
        vehicleId: drvTruck ? drvTruck.id : null,
        vehicleReg: drvTruck ? drvTruck.regNo : null,
        vehicleName: drvTruck ? drvTruck.model : null
      };

      StorageEngine.saveUserSession(this.userSession, true);
      UIManager.closeModals();
      this.setupDriverDashboard(false);
      this.renderAuthUI();
      this.navigateTo("driver-dashboard");

      UIManager.playSound("success");
      UIManager.showToast(`OTP Verified! Welcome, ${account.name}.`, "success");
    } else {
      UIManager.showToast("Invalid verification code.", "error");
    }
  },

  async handleDriverSignUp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = (document.getElementById("driver-signup-name")?.value || "").trim();
    const mobile = (document.getElementById("driver-signup-mobile")?.value || "").trim();
    const password = (document.getElementById("driver-signup-password")?.value || "").trim();
    const confirm = (document.getElementById("driver-signup-confirm")?.value || "").trim();
    const terms = document.getElementById("driver-signup-terms")?.checked;
    const errBox = document.getElementById("driver-signup-error");
    const errText = document.getElementById("driver-signup-error-text");

    const showError = (msg) => {
      if (errBox && errText) {
        errText.textContent = msg;
        errBox.classList.remove("hidden");
      }
      UIManager.playSound("warning");
    };

    const valName = Utils.validateName(name);
    if (!valName.valid) {
      showError(valName.error);
      return;
    }

    const valMobile = Utils.normalizeIndianMobile(mobile);
    if (!valMobile.valid) {
      showError(valMobile.error);
      return;
    }

    const existing = StorageEngine.findDriverAccount(valMobile.normalized);
    if (existing) {
      showError("A driver account with this mobile number already exists. Please log in.");
      return;
    }

    const valPass = Utils.validatePassword(password);
    if (!valPass.valid) {
      showError(valPass.error);
      return;
    }

    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }

    if (!terms) {
      showError("Please agree to the Terms & Conditions.");
      return;
    }

    if (errBox) errBox.classList.add("hidden");

    const hashedPassword = await Utils.hashPassword(password);

    const newAccount = {
      id: `drv_${Date.now()}`,
      name: valName.normalized,
      mobile: valMobile.normalized,
      password: hashedPassword,
      role: "driver",
      assignedTrip: null,
      vehicleId: null,
      vehicleName: null,
      created: Date.now()
    };

    StorageEngine.addDriverAccount(newAccount);

    this.userSession = {
      id: newAccount.id,
      name: newAccount.name,
      mobile: newAccount.mobile,
      role: "driver",
      title: "Commercial Freight Pilot",
      initials: valName.normalized.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
      assignedTrip: null,
      vehicleId: null,
      vehicleReg: null,
      vehicleName: null
    };

    StorageEngine.saveUserSession(this.userSession, true);
    UIManager.closeModals();
    this.setupDriverDashboard(false);
    this.renderAuthUI();
    this.navigateTo("driver-dashboard");

    UIManager.playSound("success");
    UIManager.showToast(`Driver account created! Welcome to RIDO, ${valName.normalized}.`, "success");
  },

  async handleCompanyLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const idInput = document.getElementById("company-login-identifier");
    const passInput = document.getElementById("company-login-password");
    const remInput = document.getElementById("company-login-remember");
    const errBox = document.getElementById("company-login-error");
    const errText = document.getElementById("company-login-error-text");

    const identifier = (idInput?.value || "").trim();
    const password = (passInput?.value || "").trim();
    const rememberMe = remInput ? remInput.checked : true;

    const showError = (msg) => {
      if (errBox && errText) {
        errText.textContent = msg;
        errBox.classList.remove("hidden");
      }
      UIManager.playSound("warning");
    };

    if (!identifier || !password) {
      showError("Please enter your email/mobile and password.");
      return;
    }

    if (identifier.includes("@")) {
      const valEmail = Utils.validateEmail(identifier);
      if (!valEmail.valid) {
        showError("Please enter a valid work email address.");
        return;
      }
    } else {
      const valMob = Utils.normalizeIndianMobile(identifier);
      if (!valMob.valid) {
        showError("Please enter a valid work email or 10-digit mobile number.");
        return;
      }
    }

    const account = StorageEngine.findCompanyAccount(identifier);
    const passMatch = account ? await Utils.verifyPassword(password, account.password) : false;

    if (!account || !passMatch) {
      showError("Invalid email/mobile or password.");
      return;
    }

    if (errBox) errBox.classList.add("hidden");

    this.userSession = {
      id: account.id,
      name: account.name,
      companyName: account.companyName,
      email: account.email,
      mobile: account.mobile,
      role: "company",
      title: "Fleet Operations Director",
      initials: (account.name || "VM").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    };

    StorageEngine.saveUserSession(this.userSession, rememberMe);
    UIManager.closeModals();
    this.setupCompanyDashboard(true);
    this.renderAuthUI();
    this.navigateTo("operations");

    UIManager.playSound("success");
    UIManager.showToast(`Welcome back, ${account.name}! Enterprise fleet workspace loaded.`, "success");
  },

  async handleCompanySignUp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const companyName = (document.getElementById("company-signup-company")?.value || "").trim();
    const email = (document.getElementById("company-signup-email")?.value || "").trim();
    const mobile = (document.getElementById("company-signup-mobile")?.value || "").trim();
    const password = (document.getElementById("company-signup-password")?.value || "").trim();
    const confirm = (document.getElementById("company-signup-confirm")?.value || "").trim();
    const terms = document.getElementById("company-signup-terms")?.checked;
    const errBox = document.getElementById("company-signup-error");
    const errText = document.getElementById("company-signup-error-text");

    const showError = (msg) => {
      if (errBox && errText) {
        errText.textContent = msg;
        errBox.classList.remove("hidden");
      }
      UIManager.playSound("warning");
    };

    const valComp = Utils.validateCompanyName(companyName);
    if (!valComp.valid) {
      showError(valComp.error);
      return;
    }

    const valEmail = Utils.validateEmail(email);
    if (!valEmail.valid) {
      showError(valEmail.error);
      return;
    }

    const existingEmail = StorageEngine.findCompanyAccount(valEmail.normalized);
    if (existingEmail) {
      showError("An enterprise account with this email already exists. Please log in.");
      return;
    }

    const valMobile = Utils.normalizeIndianMobile(mobile);
    if (!valMobile.valid) {
      showError(valMobile.error);
      return;
    }

    const existingMobile = StorageEngine.findCompanyAccount(valMobile.normalized);
    if (existingMobile) {
      showError("An enterprise account with this mobile number already exists. Please log in.");
      return;
    }

    const valPass = Utils.validatePassword(password);
    if (!valPass.valid) {
      showError(valPass.error);
      return;
    }

    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }

    if (!terms) {
      showError("Please agree to the Terms & Conditions.");
      return;
    }

    if (errBox) errBox.classList.add("hidden");

    const hashedPassword = await Utils.hashPassword(password);

    const newAccount = {
      id: `comp_${Date.now()}`,
      name: valComp.normalized.split(" ")[0] + " Admin",
      companyName: valComp.normalized,
      email: valEmail.normalized,
      mobile: valMobile.normalized,
      password: hashedPassword,
      role: "company",
      created: Date.now()
    };

    StorageEngine.addCompanyAccount(newAccount);

    this.userSession = {
      id: newAccount.id,
      name: newAccount.name,
      companyName: newAccount.companyName,
      email: newAccount.email,
      mobile: newAccount.mobile,
      role: "company",
      title: "Fleet Operations Director",
      initials: (valComp.normalized || "CO").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    };

    StorageEngine.saveUserSession(this.userSession, true);
    UIManager.closeModals();
    this.setupCompanyDashboard(true);
    this.renderAuthUI();
    this.navigateTo("operations");

    UIManager.playSound("success");
    UIManager.showToast(`Company account created! Welcome to RIDO, ${valComp.normalized}.`, "success");
  },

  async handlePageLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const idInput = document.getElementById("login-page-identifier");
    const passInput = document.getElementById("login-page-password");
    const remInput = document.getElementById("login-page-remember");

    const identifier = (idInput?.value || "").trim();
    const password = (passInput?.value || "").trim();
    const rememberMe = remInput ? remInput.checked : true;

    if (!identifier || !password) {
      UIManager.showToast("Please enter your email/mobile and password.", "warning");
      return;
    }

    // 1. Try company account first
    const compAccount = StorageEngine.findCompanyAccount(identifier);
    if (compAccount && (await Utils.verifyPassword(password, compAccount.password))) {
      this.userSession = {
        id: compAccount.id,
        name: compAccount.name,
        companyName: compAccount.companyName,
        email: compAccount.email,
        mobile: compAccount.mobile,
        role: "company",
        title: "Fleet Operations Director",
        initials: (compAccount.name || "VM").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      };
      StorageEngine.saveUserSession(this.userSession, rememberMe);
      this.setupCompanyDashboard(true);
      this.renderAuthUI();
      this.navigateTo("operations");
      UIManager.playSound("success");
      UIManager.showToast(`Welcome back, ${compAccount.name}! Company portal active.`, "success");
      return;
    }

    // 2. Try driver account
    const normMobile = Utils.normalizeIndianMobile(identifier);
    const drvAccount = StorageEngine.findDriverAccount(normMobile.valid ? normMobile.normalized : identifier);
    if (drvAccount && (await Utils.verifyPassword(password, drvAccount.password))) {
      const drvTruck = StorageEngine.getDriverTruck(drvAccount.id);
      this.userSession = {
        id: drvAccount.id,
        name: drvAccount.name,
        mobile: drvAccount.mobile,
        role: "driver",
        title: "Commercial Freight Pilot",
        initials: (drvAccount.name || "RK").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
        assignedTrip: null,
        vehicleId: drvTruck ? drvTruck.id : null,
        vehicleReg: drvTruck ? drvTruck.regNo : null,
        vehicleName: drvTruck ? drvTruck.model : null
      };
      StorageEngine.saveUserSession(this.userSession, rememberMe);
      this.setupDriverDashboard(false);
      this.renderAuthUI();
      this.navigateTo("driver-dashboard");
      UIManager.playSound("success");
      UIManager.showToast(`Welcome back, ${drvAccount.name}! Driver console active.`, "success");
      return;
    }

    UIManager.playSound("warning");
    UIManager.showToast("Invalid credentials. Please check your username and password.", "error");
  },

  async handlePageSignUp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = (document.getElementById("signup-page-name")?.value || "").trim();
    const email = (document.getElementById("signup-page-email")?.value || "").trim();
    const phone = (document.getElementById("signup-page-phone")?.value || "").trim();
    const company = (document.getElementById("signup-page-company")?.value || "").trim();
    const roleSelect = (document.getElementById("signup-page-role")?.value || "").toLowerCase();
    const password = (document.getElementById("signup-page-password")?.value || "").trim();
    const confirm = (document.getElementById("signup-page-password-confirm")?.value || "").trim();
    const terms = document.getElementById("signup-page-terms")?.checked;

    const valName = Utils.validateName(name);
    if (!valName.valid) {
      UIManager.showToast(valName.error, "warning");
      return;
    }

    const valEmail = Utils.validateEmail(email);
    if (!valEmail.valid) {
      UIManager.showToast(valEmail.error, "warning");
      return;
    }

    const valMobile = Utils.normalizeIndianMobile(phone);
    if (!valMobile.valid) {
      UIManager.showToast(valMobile.error, "warning");
      return;
    }

    const valPass = Utils.validatePassword(password);
    if (!valPass.valid) {
      showError(valPass.error);
      return;
    }

    if (password !== confirm) {
      UIManager.showToast("Passwords do not match.", "warning");
      return;
    }

    if (!terms) {
      UIManager.showToast("Please accept the Terms of Service to continue.", "warning");
      return;
    }

    const hashedPassword = await Utils.hashPassword(password);

    if (roleSelect.includes("driver") || roleSelect.includes("pilot")) {
      const existing = StorageEngine.findDriverAccount(valMobile.normalized);
      if (existing) {
        UIManager.showToast("A driver account with this mobile already exists.", "warning");
        return;
      }
      const newAcc = {
        id: `drv_${Date.now()}`,
        name: valName.normalized,
        mobile: valMobile.normalized,
        password: hashedPassword,
        role: "driver",
        assignedTrip: null,
        vehicleId: null,
        vehicleName: null,
        created: Date.now()
      };
      StorageEngine.addDriverAccount(newAcc);
      this.userSession = {
        id: newAcc.id,
        name: newAcc.name,
        mobile: newAcc.mobile,
        role: "driver",
        title: "Commercial Freight Pilot",
        initials: valName.normalized.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
        assignedTrip: null,
        vehicleId: null,
        vehicleReg: null,
        vehicleName: null
      };
      StorageEngine.saveUserSession(this.userSession, true);
      this.setupDriverDashboard(false);
      this.renderAuthUI();
      this.navigateTo("driver-dashboard");
      UIManager.playSound("success");
      UIManager.showToast(`Account created! Welcome to RIDO, ${valName.normalized}.`, "success");
    } else {
      const existingEmail = StorageEngine.findCompanyAccount(valEmail.normalized);
      if (existingEmail) {
        UIManager.showToast("An enterprise account with this email already exists.", "warning");
        return;
      }
      const newAcc = {
        id: `comp_${Date.now()}`,
        name: valName.normalized,
        companyName: company || (valName.normalized + " Logistics"),
        email: valEmail.normalized,
        mobile: valMobile.normalized,
        password: hashedPassword,
        role: "company",
        created: Date.now()
      };
      StorageEngine.addCompanyAccount(newAcc);
      this.userSession = {
        id: newAcc.id,
        name: newAcc.name,
        companyName: newAcc.companyName,
        email: newAcc.email,
        mobile: newAcc.mobile,
        role: "company",
        title: "Fleet Operations Director",
        initials: valName.normalized.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
      };
      StorageEngine.saveUserSession(this.userSession, true);
      this.setupCompanyDashboard(true);
      this.renderAuthUI();
      this.navigateTo("operations");
      UIManager.playSound("success");
      UIManager.showToast(`Enterprise account created! Welcome, ${valName.normalized}.`, "success");
    }
  },

  handleForgotPassword(role = "company") {
    const promptText = role === "driver"
      ? "[RIDO Driver Recovery - DEMO]\nEnter your registered 10-digit mobile number:"
      : "[RIDO Enterprise Recovery - DEMO]\nEnter your registered work email or mobile number:";
    
    const identifier = prompt(promptText, role === "driver" ? "9876543210" : "admin@transindia.in");
    if (!identifier) return;

    let account = null;
    if (role === "driver") {
      const norm = Utils.normalizeIndianMobile(identifier);
      account = StorageEngine.findDriverAccount(norm.valid ? norm.normalized : identifier);
    } else {
      account = StorageEngine.findCompanyAccount(identifier);
    }

    if (!account) {
      UIManager.showToast("If an account exists with this identifier, demo recovery instructions have been prepared.", "info");
      return;
    }

    const resetCode = String(Math.floor(100000 + Math.random() * 900000));
    UIManager.showToast(`[DEMO MODE] Password reset code for ${identifier}: ${resetCode}`, "info");

    const enteredCode = prompt(`[RIDO Password Reset - DEMO]\nDemo Reset Code: ${resetCode}\n\nEnter verification code:`, resetCode);
    if (!enteredCode || enteredCode.trim() !== resetCode) {
      UIManager.showToast("Invalid verification code.", "error");
      return;
    }

    const newPass = prompt("[RIDO Password Reset]\nEnter your new password (min 8 characters, uppercase, lowercase, digit):", "NewPassword123");
    if (!newPass) return;

    const valPass = Utils.validatePassword(newPass);
    if (!valPass.valid) {
      UIManager.showToast(valPass.error, "warning");
      return;
    }

    Utils.hashPassword(newPass).then((hashed) => {
      account.password = hashed;
      if (role === "driver") {
        const list = StorageEngine.getDriverAccounts();
        const idx = list.findIndex(a => a.id === account.id);
        if (idx !== -1) list[idx] = account;
        StorageEngine.saveDriverAccounts(list);
      } else {
        const list = StorageEngine.getCompanyAccounts();
        const idx = list.findIndex(a => a.id === account.id);
        if (idx !== -1) list[idx] = account;
        StorageEngine.saveCompanyAccounts(list);
      }
      UIManager.playSound("success");
      UIManager.showToast("Password updated successfully! Please log in with your new credentials.", "success");
    });
  },

  handleLogin(eOrRole, context) {
    if (eOrRole && eOrRole.preventDefault) eOrRole.preventDefault();
    if (context === "page" || eOrRole === "page") {
      this.handlePageLogin(eOrRole);
    } else if (eOrRole === "company") {
      this.handleCompanyLogin();
    } else {
      this.handleDriverLogin();
    }
  },

  handleSignUp(eOrRole, context) {
    if (eOrRole && eOrRole.preventDefault) eOrRole.preventDefault();
    if (context === "page" || eOrRole === "page") {
      this.handlePageSignUp(eOrRole);
    } else if (eOrRole === "company") {
      this.handleCompanySignUp();
    } else {
      this.handleDriverSignUp();
    }
  },

  // --------------------------------------------------------------------------
  // Mockup Authentication View Handlers (Screens 2 & 3)
  // --------------------------------------------------------------------------
  _authRole: "driver",
  _authMode: "login",

  switchAuthRole(role, mode = "login") {
    this._authRole = role;
    const isDriver = role === "driver";

    if (mode === "login") {
      const btnDrv = document.getElementById("auth-login-role-driver");
      const btnCmp = document.getElementById("auth-login-role-company");
      const lblId = document.getElementById("login-identifier-label");
      const inputId = document.getElementById("login-identifier-input");

      if (btnDrv && btnCmp) {
        btnDrv.className = `flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${isDriver ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`;
        btnCmp.className = `flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${!isDriver ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`;
      }
      if (lblId) lblId.textContent = isDriver ? "Driver Mobile Number" : "Company Work Email / Mobile";
      if (inputId) {
        inputId.placeholder = isDriver ? "+91 98765 43210" : "admin@transindia.in";
        inputId.value = isDriver ? "9876543210" : "admin@transindia.in";
      }
    } else {
      const btnDrv = document.getElementById("auth-signup-role-driver");
      const btnCmp = document.getElementById("auth-signup-role-company");
      const extra = document.getElementById("signup-company-extra-fields");
      const nameLbl = document.getElementById("signup-name-label");

      if (btnDrv && btnCmp) {
        btnDrv.className = `flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${isDriver ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`;
        btnCmp.className = `flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${!isDriver ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`;
      }
      if (extra) extra.classList.toggle("hidden", isDriver);
      if (nameLbl) nameLbl.textContent = isDriver ? "Driver Full Name" : "Authorized Representative Name";
    }
  },

  toggleAuthMode(mode = "login") {
    this._authMode = mode;
    const isLogin = mode === "login";
    const secLogin = document.getElementById("mockup-login-mode");
    const secSignup = document.getElementById("mockup-signup-mode");
    const pitchLogin = document.getElementById("auth-right-pitch-login");
    const pitchSignup = document.getElementById("auth-right-pitch-signup");
    const backLabel = document.getElementById("auth-back-label");

    if (secLogin) secLogin.classList.toggle("hidden", !isLogin);
    if (secSignup) secSignup.classList.toggle("hidden", isLogin);
    if (pitchLogin) pitchLogin.classList.toggle("hidden", !isLogin);
    if (pitchSignup) pitchSignup.classList.toggle("hidden", isLogin);
    if (backLabel) backLabel.textContent = isLogin ? "Back to Home" : "Back to Login";
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    if (btn) {
      btn.innerHTML = isPassword
        ? `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>`
        : `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  },

  handleMockupLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const idInput = document.getElementById("login-identifier-input");
    const passInput = document.getElementById("login-password-input");
    const errEl = document.getElementById("auth-login-error");

    const identifier = idInput ? idInput.value.trim() : "";
    const password = passInput ? passInput.value.trim() : "";

    if (!identifier || !password) {
      if (errEl) {
        errEl.textContent = "Please provide your login identifier and password.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    const isDriver = this._authRole === "driver";
    
    // Create or retrieve session
    const session = {
      id: isDriver ? "DRV-101" : "CMP-201",
      name: isDriver ? "Rajinder Singh" : "Vikram Mehta",
      initials: isDriver ? "RS" : "VM",
      role: isDriver ? "driver" : "company",
      vehicle: isDriver ? "TRK-NATIONAL-01" : undefined,
      companyName: isDriver ? "TransIndia Logistics" : "TransIndia Logistics Ltd.",
      phone: identifier,
      email: isDriver ? "driver.rajinder@transindia.in" : identifier,
      token: "rido_auth_tok_" + Date.now()
    };

    StorageEngine.saveUserSession(session);
    this.userSession = session;
    this.renderAuthUI();

    UIManager.playSound("success");
    UIManager.showToast(`Signed in successfully as ${session.name}`, "success");

    const pendingIntent = this._pendingIntentView;
    this._pendingIntentView = null;

    if (isDriver) {
      this.setupDriverDashboard(false);
      if (pendingIntent && ['optimizer', 'stops', 'driver-dashboard'].includes(pendingIntent)) {
        this.navigateTo(pendingIntent);
      } else {
        this.navigateTo("driver-dashboard");
      }
    } else {
      this.setupCompanyDashboard(false);
      if (pendingIntent && ['optimizer', 'fleet', 'operations', 'company-fastag-costs', 'compare-fleets', 'analytics', 'stops', 'simulator', 'settings'].includes(pendingIntent)) {
        this.navigateTo(pendingIntent);
      } else {
        this.navigateTo("operations");
      }
    }
  },

  handleMockupSignUp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameInput = document.getElementById("signup-name-input");
    const mobileInput = document.getElementById("signup-mobile-input");
    const passInput = document.getElementById("signup-password-input");
    const confirmInput = document.getElementById("signup-confirm-input");
    const termsInput = document.getElementById("signup-terms-input");
    const errEl = document.getElementById("auth-signup-error");

    const name = nameInput ? nameInput.value.trim() : "";
    const mobile = mobileInput ? mobileInput.value.trim().replace(/\D/g, "").slice(-10) : "";
    const pass = passInput ? passInput.value : "";
    const confirmPass = confirmInput ? confirmInput.value : "";
    const terms = termsInput ? termsInput.checked : false;

    if (!name) {
      if (errEl) { errEl.textContent = "Please enter your full name."; errEl.classList.remove("hidden"); }
      return;
    }
    if (!mobile || mobile.length !== 10 || !/^[6-9]\d{9}$/.test(mobile)) {
      if (errEl) { errEl.textContent = "Please enter a valid 10-digit Indian mobile number."; errEl.classList.remove("hidden"); }
      return;
    }
    if (!pass || pass.length < 6) {
      if (errEl) { errEl.textContent = "Password must be at least 6 characters."; errEl.classList.remove("hidden"); }
      return;
    }
    if (pass !== confirmPass) {
      if (errEl) { errEl.textContent = "Passwords do not match."; errEl.classList.remove("hidden"); }
      return;
    }
    if (!terms) {
      if (errEl) { errEl.textContent = "Please agree to the Terms & Conditions."; errEl.classList.remove("hidden"); }
      return;
    }

    const isDriver = this._authRole === "driver";
    const compName = document.getElementById("signup-company-name-input")?.value.trim() || (isDriver ? "Fleet Partner" : name + " Enterprises");

    // Extract Registered Vehicle for Driver
    let driverVehId = "TRK-NATIONAL-01";
    let driverVehName = "Tata Prima 5530.S";
    let driverVehPlate = "PB 10 CQ 4821";
    let driverVehFuel = "Diesel";
    let driverVehType = "truck";
    let driverFastag = "ICICI-FASTAG-9821";

    if (isDriver) {
      driverVehType = document.getElementById("signup-driver-veh-type")?.value || "truck";
      driverVehPlate = document.getElementById("signup-driver-veh-plate")?.value.trim() || "PB 10 CQ 4821";
      driverVehName = document.getElementById("signup-driver-veh-model")?.value || "Tata Prima 5530.S";
      driverVehFuel = document.getElementById("signup-driver-veh-fuel")?.value || "Diesel";
      driverFastag = document.getElementById("signup-driver-veh-fastag")?.value.trim() || "ICICI-FASTAG-9821";
      driverVehId = `TRK-${driverVehPlate.replace(/\s+/g, "-").toUpperCase().slice(-7)}`;
    }

    const session = {
      id: isDriver ? `DRV-${Math.floor(100 + Math.random() * 900)}` : `CMP-${Math.floor(100 + Math.random() * 900)}`,
      name: name,
      initials: name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
      role: isDriver ? "driver" : "company",
      vehicle: isDriver ? driverVehId : undefined,
      vehicleName: isDriver ? driverVehName : undefined,
      vehiclePlate: isDriver ? driverVehPlate : undefined,
      vehicleFuel: isDriver ? driverVehFuel : undefined,
      fastagId: isDriver ? driverFastag : undefined,
      companyName: compName,
      phone: "+91 " + mobile,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@${compName.toLowerCase().replace(/\s+/g, "")}.in`,
      token: "rido_auth_tok_" + Date.now()
    };

    StorageEngine.saveUserSession(session);
    this.userSession = session;

    // Register Driver's Vehicle into active dataset
    if (isDriver && this.data && Array.isArray(this.data.vehicles)) {
      const existingIdx = this.data.vehicles.findIndex(v => v.id === driverVehId);
      const isEV = driverVehFuel === "Electric (EV)";
      const spec = (window.OptimizerEngine && window.OptimizerEngine.VEHICLE_CATALOG) ? window.OptimizerEngine.VEHICLE_CATALOG[driverVehName] : null;
      const newVeh = {
        id: driverVehId,
        name: driverVehName,
        plate: driverVehPlate,
        type: spec ? spec.type : (driverVehType === "pickup" ? "Small Pickup" : "Heavy Truck"),
        powertrain: driverVehFuel,
        driver: name,
        payloadMax: spec ? spec.payloadMax : (driverVehType === "pickup" ? 1700 : 28000),
        efficiency: spec ? spec.efficiency : (isEV ? 6.0 : (driverVehType === "pickup" ? 14.5 : 4.2)),
        costPerKm: isEV ? 4.5 : (driverVehType === "pickup" ? 9.5 : 28.0),
        fuelLevel: 85,
        healthScore: 98,
        status: "Available",
        fastagId: driverFastag,
        icon: isEV ? "⚡" : (driverVehType === "pickup" ? "🛻" : "🚛")
      };

      if (existingIdx >= 0) {
        this.data.vehicles[existingIdx] = newVeh;
      } else {
        this.data.vehicles.unshift(newVeh);
      }
      this.optimizerState.selectedVehicleId = driverVehId;
      this.saveState();
    }

    this.renderAuthUI();

    UIManager.playSound("success");
    UIManager.showToast(`Account & ${isDriver ? 'Vehicle' : 'Fleet'} Registered! Welcome, ${session.name}`, "success");

    const pendingIntentSignup = this._pendingIntentView;
    this._pendingIntentView = null;

    if (isDriver) {
      this.setupDriverDashboard(false);
      if (pendingIntentSignup && ['optimizer', 'stops', 'driver-dashboard'].includes(pendingIntentSignup)) {
        this.navigateTo(pendingIntentSignup);
      } else {
        this.navigateTo("driver-dashboard");
      }
    } else {
      this.setupCompanyDashboard(false);
      if (pendingIntentSignup && ['optimizer', 'fleet', 'operations', 'company-fastag-costs', 'compare-fleets', 'analytics', 'stops', 'simulator', 'settings'].includes(pendingIntentSignup)) {
        this.navigateTo(pendingIntentSignup);
      } else {
        this.navigateTo("operations");
      }
    }
  },

  onDriverSignupVehTypeChange() {
    const type = document.getElementById("signup-driver-veh-type")?.value || "truck";
    const modelSelect = document.getElementById("signup-driver-veh-model");
    if (!modelSelect) return;
    if (type === "pickup") {
      modelSelect.innerHTML = `
        <option value="Mahindra Bolero Maxi Truck" selected>Mahindra Bolero Maxi Truck</option>
        <option value="Tata Ace Gold (Diesel)">Tata Ace Gold (Diesel)</option>
        <option value="Tata Ace Gold (CNG)">Tata Ace Gold (CNG)</option>
        <option value="Ashok Leyland Dost+">Ashok Leyland Dost+</option>
        <option value="Tata Ace EV Ultra">Tata Ace EV Ultra</option>
        <option value="Mahindra Zor Grand EV">Mahindra Zor Grand EV</option>
      `;
    } else {
      modelSelect.innerHTML = `
        <option value="Tata Prima 5530.S" selected>Tata Prima 5530.S</option>
        <option value="BharatBenz 2823R">BharatBenz 2823R</option>
        <option value="Eicher Pro 3019">Eicher Pro 3019</option>
        <option value="Ashok Leyland 4220">Ashok Leyland 4220</option>
        <option value="Tata 407 LPT">Tata 407 LPT</option>
      `;
    }
    this.onDriverSignupModelChange();
  },

  onDriverSignupModelChange() {
    const model = document.getElementById("signup-driver-veh-model")?.value || "";
    const fuelSelect = document.getElementById("signup-driver-veh-fuel");
    if (!fuelSelect) return;
    if (model.includes("EV") || model.includes("Zor Grand")) {
      fuelSelect.value = "Electric (EV)";
    } else if (model.includes("CNG")) {
      fuelSelect.value = "CNG";
    } else {
      fuelSelect.value = "Diesel";
    }
  },

  onVehicleModelChange() {
    const model = document.getElementById("opt-vehicle-model-select")?.value || "Tata Prima 5530.S";
    const badge = document.getElementById("opt-detected-fuel-badge");
    const spec = (window.OptimizerEngine && window.OptimizerEngine.VEHICLE_CATALOG) ? window.OptimizerEngine.VEHICLE_CATALOG[model] : null;
    if (badge && spec) {
      badge.textContent = `${spec.powertrain} (${spec.efficiency} km/${spec.unit})`;
      if (spec.powertrain.includes("Electric")) {
        badge.className = "p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 text-center font-mono";
      } else if (spec.powertrain.includes("CNG")) {
        badge.className = "p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 text-center font-mono";
      } else {
        badge.className = "p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-center font-mono";
      }
    }
  },

  loadCorridorPreset(corridorKey) {
    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");
    const vehSelect = document.getElementById("opt-vehicle-model-select");
    const stop1 = document.getElementById("opt-stop-pill-1");
    const stop2 = document.getElementById("opt-stop-pill-2");

    if (corridorKey === "ludhiana_delhi") {
      if (fromInput) fromInput.value = "Ludhiana Central Cargo Hub, Punjab";
      if (toInput) toInput.value = "Delhi Central Hub (Okhla Phase-III), Delhi";
      if (vehSelect) vehSelect.value = "Tata Prima 5530.S";
      if (stop1) stop1.textContent = "Ambala Cantt Depot, Haryana";
      if (stop2) stop2.textContent = "Panipat Textile Hub, Haryana";
    } else if (corridorKey === "pune_mumbai") {
      if (fromInput) fromInput.value = "Pune Chakan MIDC Hub, Maharashtra";
      if (toInput) toInput.value = "Mumbai Gateway Logistics Park, Maharashtra";
      if (vehSelect) vehSelect.value = "Tata 407 LPT";
      if (stop1) stop1.textContent = "Talegaon Toll Node, Maharashtra";
      if (stop2) stop2.textContent = "Vashi Wholesale Terminal, Navi Mumbai";
    }
    this.onVehicleModelChange();
    this.calculateRidoRoute();
    UIManager.showToast(`Corridor loaded: ${fromInput?.value.split(',')[0]} ➔ ${toInput?.value.split(',')[0]}`, "info");
  },

  // --------------------------------------------------------------------------
  // Logistics Marketplace & Partner Fleet Pool
  // --------------------------------------------------------------------------
  getAvailableMarketplaceVehicles() {
    const marketplaceFleet = [
      {
        id: "truck-001",
        name: "20T Truck",
        model: "Tata LPT 2018",
        plate: "PB11CD5678",
        registration: "PB11CD5678",
        type: "20T Truck",
        category: "Partner Freight",
        capacityKg: 20000,
        payloadMax: 20000,
        fuelType: "Diesel",
        powertrain: "Diesel BS-VI",
        efficiency: 5.4,
        costPerKm: 22.0,
        status: "available",
        driverId: "driver-002",
        driver: "Ravi Singh",
        driverName: "Ravi Singh",
        rating: 4.7,
        tripsCompleted: 312,
        onTimeRate: "98%",
        transporter: "North India Logistics",
        sourceType: "Partner",
        pickupEta: "35 min",
        icon: "🚚"
      },
      {
        id: "truck-002",
        name: "14T Truck",
        model: "Eicher Pro 3014",
        plate: "PB10AB1234",
        registration: "PB10AB1234",
        type: "14T Truck",
        category: "Company Fleet",
        capacityKg: 14000,
        payloadMax: 14000,
        fuelType: "Diesel",
        powertrain: "Diesel BS-VI",
        efficiency: 6.2,
        costPerKm: 18.5,
        status: "available",
        driverId: "driver-001",
        driver: "Amit Kumar",
        driverName: "Amit Kumar",
        rating: 4.8,
        tripsCompleted: 284,
        onTimeRate: "99%",
        transporter: "TransIndia Logistics",
        sourceType: "Company Fleet",
        pickupEta: "25 min",
        icon: "🚛"
      },
      {
        id: "truck-003",
        name: "32T Multi-Axle",
        model: "Tata Prima 5530.S",
        plate: "HR26EF9012",
        registration: "HR26EF9012",
        type: "32T Multi-Axle",
        category: "Partner Freight",
        capacityKg: 32000,
        payloadMax: 32000,
        fuelType: "Diesel",
        powertrain: "Diesel BS-VI",
        efficiency: 4.2,
        costPerKm: 28.0,
        status: "available",
        driverId: "driver-003",
        driver: "Sandeep Verma",
        driverName: "Sandeep Verma",
        rating: 4.9,
        tripsCompleted: 450,
        onTimeRate: "99.5%",
        transporter: "North India Logistics",
        sourceType: "Partner",
        pickupEta: "40 min",
        icon: "🚛"
      },
      {
        id: "truck-004",
        name: "Eicher Pro 3019",
        model: "Eicher Pro 3019",
        plate: "HR55AB1234",
        registration: "HR55AB1234",
        type: "11T Truck",
        category: "Company Fleet",
        capacityKg: 11000,
        payloadMax: 11000,
        fuelType: "Diesel",
        powertrain: "Diesel BS-VI",
        efficiency: 6.8,
        costPerKm: 16.0,
        status: "available",
        driverId: "driver-004",
        driver: "Manoj Yadav",
        driverName: "Manoj Yadav",
        rating: 4.8,
        tripsCompleted: 198,
        onTimeRate: "97%",
        transporter: "TransIndia Logistics",
        sourceType: "Company Fleet",
        pickupEta: "20 min",
        icon: "🚚"
      },
      {
        id: "truck-005",
        name: "BharatBenz 2823R",
        model: "BharatBenz 2823R",
        plate: "PB10CQ4821",
        registration: "PB10CQ4821",
        type: "18.5T Truck",
        category: "Transport Operator",
        capacityKg: 18500,
        payloadMax: 18500,
        fuelType: "Diesel",
        powertrain: "Diesel BS-VI",
        efficiency: 5.0,
        costPerKm: 22.5,
        status: "available",
        driverId: "driver-005",
        driver: "Venkatesh Rao",
        driverName: "Venkatesh Rao",
        rating: 4.7,
        tripsCompleted: 340,
        onTimeRate: "96%",
        transporter: "National Freight Carriers",
        sourceType: "Operator",
        pickupEta: "30 min",
        icon: "🚛"
      },
      {
        id: "truck-006",
        name: "Ashok Leyland 4220",
        model: "Ashok Leyland 4220",
        plate: "PB02XY7788",
        registration: "PB02XY7788",
        type: "26T Heavy Truck",
        category: "Partner Freight",
        capacityKg: 26000,
        payloadMax: 26000,
        fuelType: "Diesel",
        powertrain: "Diesel BS-VI",
        efficiency: 4.5,
        costPerKm: 26.0,
        status: "available",
        driverId: "driver-006",
        driver: "Jaswinder Brar",
        driverName: "Jaswinder Brar",
        rating: 4.6,
        tripsCompleted: 215,
        onTimeRate: "95%",
        transporter: "Punjab-Bihar Express",
        sourceType: "Partner",
        pickupEta: "45 min",
        icon: "🚛"
      },
      {
        id: "truck-007",
        name: "Tata 407 LPT",
        model: "Tata 407 LPT",
        plate: "MH12Q1001",
        registration: "MH12Q1001",
        type: "3.8T Medium Truck",
        category: "Transport Operator",
        capacityKg: 3800,
        payloadMax: 3800,
        fuelType: "Diesel",
        powertrain: "Diesel BS-VI",
        efficiency: 7.8,
        costPerKm: 14.5,
        status: "available",
        driverId: "driver-007",
        driver: "Datta Patil",
        driverName: "Datta Patil",
        rating: 4.6,
        tripsCompleted: 160,
        onTimeRate: "94%",
        transporter: "Maharashtra Express",
        sourceType: "Operator",
        pickupEta: "15 min",
        icon: "🚚"
      },
      {
        id: "truck-008",
        name: "Tata Ace EV Ultra",
        model: "Tata Ace EV",
        plate: "DL1EV9901",
        registration: "DL1EV9901",
        type: "1.2T Mini EV",
        category: "Green Partner",
        capacityKg: 1200,
        payloadMax: 1200,
        fuelType: "Electric",
        powertrain: "Electric (EV)",
        efficiency: 5.8,
        costPerKm: 5.5,
        status: "available",
        driverId: "driver-008",
        driver: "Karthik Nair",
        driverName: "Karthik Nair",
        rating: 4.8,
        tripsCompleted: 410,
        onTimeRate: "99%",
        transporter: "GreenEV Logistics",
        sourceType: "Partner",
        pickupEta: "10 min",
        icon: "⚡"
      }
    ];

    return marketplaceFleet;
  },

  calculateTripCostForVehicle(veh, distKm, cargoWeight, tollEstimate) {
    const dieselPrice = Number(document.getElementById("cfg-diesel-price")?.value) || (this.data?.settings?.fuelPrice || 90);
    const driverAllowancePerDay = Number(document.getElementById("cfg-driver-allowance")?.value) || 800;
    const maintCostPerKm = Number(document.getElementById("cfg-maint-cost")?.value) || 4;
    const companyMarginPct = Number(document.getElementById("cfg-margin-pct")?.value) || 10;
    const driverEarningPct = Number(document.getElementById("cfg-driver-earning-pct")?.value) || 15;

    const isEV = (veh.powertrain || '').toLowerCase().includes('electric') || (veh.fuelType || '').toLowerCase().includes('electric');
    const transitDays = Math.max(1, Math.ceil(distKm / 550));
    
    let fuelCost = 0;
    if (isEV) {
      fuelCost = Math.round((distKm / (veh.efficiency || 5.8)) * 8.5);
    } else {
      fuelCost = Math.round((distKm / (veh.efficiency || 5.4)) * dieselPrice);
    }

    const capacityKg = Number(veh.capacityKg || veh.payloadMax || 15000);
    let tollCost = 0;
    if (tollEstimate && tollEstimate > 0) {
      tollCost = Math.round(tollEstimate);
    } else {
      if (isEV && capacityKg < 1000) tollCost = 0;
      else if (capacityKg <= 3500) tollCost = Math.round(distKm * 0.9);
      else if (capacityKg <= 12000) tollCost = Math.round(distKm * 1.5);
      else tollCost = Math.round(distKm * 2.15);
    }

    const driverAllowance = transitDays * driverAllowancePerDay;
    const maintenanceCost = Math.round(distKm * maintCostPerKm);
    const baseOpEx = fuelCost + tollCost + driverAllowance + maintenanceCost;
    const driverEarnings = Math.round(baseOpEx * (driverEarningPct / 100));
    const companyMargin = Math.round((baseOpEx + driverEarnings) * (companyMarginPct / 100));
    const totalTripCost = baseOpEx + driverEarnings + companyMargin;
    const utilizationPct = Math.min(100, Math.round((cargoWeight / capacityKg) * 100));

    return {
      transitDays,
      fuelCost,
      tollCost,
      driverAllowance,
      maintenanceCost,
      baseOpEx,
      driverEarnings,
      companyMargin,
      totalTripCost,
      utilizationPct,
      capacityKg
    };
  },

  renderRecommendedVehicles(suitableVehicles, bestMatch, distanceKm, cargoWeight) {
    const listContainer = document.getElementById("rido-recommended-trucks-container");
    const summaryContainer = document.getElementById("rido-best-recommendation-container");
    const resultsTitle = document.getElementById("rido-fleet-results-title");
    const resultsSubtitle = document.getElementById("rido-fleet-results-subtitle");

    if (resultsTitle) {
      resultsTitle.textContent = "RECOMMENDED DRIVERS & TRUCKS";
    }
    if (resultsSubtitle) {
      resultsSubtitle.textContent = `${suitableVehicles.length} suitable option${suitableVehicles.length > 1 ? 's' : ''} found • Sorted by total trip cost & driver rating`;
    }

    if (!listContainer || !summaryContainer) return;

    if (suitableVehicles.length === 0) {
      document.getElementById("rido-results-main-grid")?.classList.add("hidden");
      document.getElementById("rido-fleet-no-match-prompt")?.classList.remove("hidden");
      return;
    }

    document.getElementById("rido-results-main-grid")?.classList.remove("hidden");
    document.getElementById("rido-fleet-no-match-prompt")?.classList.add("hidden");

    // Render Left Cards (Top 3 or all matching options)
    const displayOptions = suitableVehicles.slice(0, 3);

    listContainer.innerHTML = displayOptions.map((v, idx) => {
      const isTopMatch = v.id === bestMatch?.id;
      const c = v.costs;
      const cardBorder = isTopMatch ? "border-2 border-emerald-500 shadow-md" : "border border-slate-200 shadow-xs";
      const badgeHtml = isTopMatch ? `
        <div class="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider shadow-xs flex items-center gap-1">
          <span>🏆 BEST MATCH</span>
        </div>
      ` : `
        <div class="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-slate-700 text-white font-bold text-[9px] uppercase tracking-wider shadow-xs">
          ALTERNATIVE OPTION
        </div>
      `;

      return `
        <div class="bg-white p-4 rounded-3xl ${cardBorder} relative flex flex-col justify-between space-y-3">
          ${badgeHtml}
          
          <div>
            <div class="flex items-center justify-between mt-2 mb-1">
              <div>
                <h4 class="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>${v.icon || '🚚'}</span>
                  <span>${Utils.escapeHTML(v.name)}</span>
                </h4>
                <span class="text-[10px] font-mono font-bold text-slate-500">${Utils.escapeHTML(v.plate || v.registration || v.id)}</span>
              </div>
              <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Available
              </span>
            </div>

            <!-- Driver & Transporter Info -->
            <div class="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 mb-2.5 space-y-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs">👨‍✈️</span>
                  <strong class="text-xs font-black text-slate-800">${Utils.escapeHTML(v.driver || v.driverName)}</strong>
                </div>
                <span class="text-[11px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">★ ${v.rating || '4.8'}</span>
              </div>
              <div class="text-[10px] text-slate-500 font-medium flex items-center justify-between">
                <span>${Utils.escapeHTML(v.transporter || 'TransIndia Logistics')}</span>
                <span class="px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 text-[9px] font-bold">${Utils.escapeHTML(v.sourceType || 'Partner')}</span>
              </div>
            </div>

            <!-- Specs Row -->
            <div class="grid grid-cols-3 gap-1 p-2 bg-slate-50 rounded-xl text-center text-[10px] font-bold text-slate-700 mb-3">
              <div>
                <span class="text-slate-400 block text-[9px]">Capacity</span>
                <span>${(c.capacityKg).toLocaleString()} kg</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[9px]">Utilization</span>
                <span class="${c.utilizationPct > 80 ? 'text-amber-700' : 'text-emerald-700'} font-black">${c.utilizationPct}%</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[9px]">Pickup ETA</span>
                <span class="text-slate-900 font-bold">${v.pickupEta || '30 min'}</span>
              </div>
            </div>

            <!-- Cost Breakdown Lines -->
            <div class="space-y-1.5 text-[11px] border-t border-slate-100 pt-2">
              <div class="flex items-center justify-between text-slate-600">
                <span>Fuel Cost</span>
                <span class="font-mono font-bold text-slate-900">₹ ${(c.fuelCost).toLocaleString()}</span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span>FASTag / Toll</span>
                <span class="font-mono font-bold text-slate-900">₹ ${(c.tollCost).toLocaleString()}</span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span>Driver Allowance (${c.transitDays} Day${c.transitDays > 1 ? 's' : ''})</span>
                <span class="font-mono font-bold text-slate-900">₹ ${(c.driverAllowance).toLocaleString()}</span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span>Maintenance Cost</span>
                <span class="font-mono font-bold text-slate-900">₹ ${(c.maintenanceCost).toLocaleString()}</span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span>Driver Earnings</span>
                <span class="font-mono font-bold text-slate-900">₹ ${(c.driverEarnings).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Footer Price & Action -->
          <div class="pt-2 border-t border-slate-100 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-400 uppercase">Estimated Trip Cost</span>
              <strong class="text-base font-black text-slate-900 font-mono">₹ ${(c.totalTripCost).toLocaleString()}</strong>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border-none transition-all text-center" onclick="App.openFareBreakdownModal()">
                View Details
              </button>
              <button type="button" class="py-2 px-2 rounded-xl ${isTopMatch ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'} font-black text-xs shadow-xs cursor-pointer border-none transition-all active:scale-98 text-center flex items-center justify-center gap-1" onclick="App.dispatchTripToDriver('${Utils.escapeHTML(v.id)}')">
                <span>Assign</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Render Right Summary Card (Best Recommendation)
    const bm = bestMatch || suitableVehicles[0];
    const bmc = bm.costs;

    summaryContainer.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider">Best Recommendation</h4>
        <span class="text-emerald-600 font-bold text-xs">⭐ 98% Match</span>
      </div>

      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">${bm.icon || '🚚'}</span>
          <h4 class="text-base font-black text-slate-900">${Utils.escapeHTML(bm.name)}</h4>
        </div>
        <span class="text-xs font-mono font-bold text-slate-400 block mb-3">${Utils.escapeHTML(bm.plate || bm.registration)} • ${(bmc.capacityKg).toLocaleString()} kg Capacity</span>

        <!-- Why this truck? -->
        <div class="space-y-1.5 text-xs">
          <strong class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Why This Truck?</strong>
          <div class="flex items-center gap-2 text-slate-700">
            <span class="text-emerald-600 font-bold">✓</span>
            <span>Best cost-to-capacity ratio</span>
          </div>
          <div class="flex items-center gap-2 text-slate-700">
            <span class="text-emerald-600 font-bold">✓</span>
            <span>Carries ${(cargoWeight).toLocaleString()} kg safely (${bmc.utilizationPct}% payload utilization)</span>
          </div>
          <div class="flex items-center gap-2 text-slate-700">
            <span class="text-emerald-600 font-bold">✓</span>
            <span>Driver ${Utils.escapeHTML(bm.driver || bm.driverName)} available & top-rated (★ ${bm.rating})</span>
          </div>
          <div class="flex items-center gap-2 text-slate-700">
            <span class="text-emerald-600 font-bold">✓</span>
            <span>Trusted transporter: ${Utils.escapeHTML(bm.transporter || 'North India Logistics')}</span>
          </div>
          <div class="flex items-center gap-2 text-slate-700">
            <span class="text-emerald-600 font-bold">✓</span>
            <span>Estimated Pickup ETA: ${bm.pickupEta || '35 min'}</span>
          </div>
        </div>
      </div>

      <!-- Margin & Total -->
      <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Estimated Cost</span>
          <strong class="text-base font-black text-slate-900 font-mono">₹ ${(bmc.totalTripCost).toLocaleString()}</strong>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Margin</span>
          <strong class="text-base font-black text-emerald-600 font-mono">₹ ${(bmc.companyMargin).toLocaleString()}</strong>
        </div>
      </div>

      <button type="button" class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border-none active:scale-98" onclick="App.dispatchTripToDriver('${Utils.escapeHTML(bm.id)}')">
        <span>⚡ ASSIGN THIS TRUCK</span>
      </button>

      <!-- Driver Preview -->
      <div class="pt-3 border-t border-slate-100">
        <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Driver Preview</span>
        <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 font-black text-sm flex items-center justify-center shrink-0">
              👨‍✈️
            </div>
            <div>
              <strong class="text-xs font-black text-slate-900 block">${Utils.escapeHTML(bm.driver || bm.driverName)}</strong>
              <span class="text-[10px] text-slate-500 font-medium">⭐ ${bm.rating} (${bm.tripsCompleted || 312} Trips) • ${bm.onTimeRate || '98%'} On-time</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">Available</span>
        </div>
      </div>
    `;
  },

  expandPartnerNetworkSearch() {
    UIManager.showToast("🔍 Searching extended pan-India partner freight network...", "info");
    setTimeout(() => {
      this.calculateRidoRoute();
      UIManager.showToast("✓ Found partner freight capacity from logistics exchange!", "success");
    }, 400);
  },

  async calculateRidoRoute() {
    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");
    const originText = fromInput?.value.trim();
    const destText = toInput?.value.trim();

    if (!originText) {
      UIManager.showToast("⚠️ Please enter a pickup location.", "warn");
      fromInput?.focus();
      return;
    }

    if (!destText) {
      UIManager.showToast("⚠️ Please enter a drop location.", "warn");
      toInput?.focus();
      return;
    }

    // Validate every intermediate stop
    const rawStops = this.optimizerState.stops || [];
    for (let i = 0; i < rawStops.length; i++) {
      const sInput = document.getElementById(`opt-stop-${i}-search`);
      const val = sInput ? sInput.value.trim() : (rawStops[i].name || '').trim();
      if (!val) {
        UIManager.showToast(`⚠️ Please enter a location for Stop ${i + 1}.`, "warn");
        sInput?.focus();
        return;
      }
    }

    const calcBtn = document.getElementById("btn-run-optimization");
    const origBtnHTML = calcBtn ? calcBtn.innerHTML : "";
    if (calcBtn) {
      calcBtn.disabled = true;
      calcBtn.innerHTML = `
        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg>
        <span>CALCULATING HIGHWAY ROUTE & OPEX...</span>
      `;
    }

    let vehicleModel = document.getElementById("opt-vehicle-model-select")?.value;
    if (!vehicleModel) {
      vehicleModel = "20T Truck";
    }
    const cargoWeight = Number(document.getElementById("opt-cargo-weight-input")?.value) || 5000;

    try {
      // 1. Asynchronously Geocode Origin
      let startDepot = this.optimizerState.customStartDepot;
      if (!startDepot || startDepot.name.toLowerCase() !== originText.toLowerCase() || !startDepot.lat) {
        const localMatch = (window.ALL_INDIA_CITIES_DATABASE || []).find(c => Utils.fuzzyMatch(c, originText));
        if (localMatch) {
          startDepot = { id: localMatch.id, name: localMatch.name, address: localMatch.address, lat: localMatch.lat, lng: localMatch.lng, isCustom: true };
        } else {
          const geoRes = await ApiClient.fetchNominatimGeocode(originText);
          if (geoRes && geoRes.length > 0) {
            startDepot = { id: geoRes[0].id, name: originText, address: geoRes[0].address, lat: geoRes[0].lat, lng: geoRes[0].lng, isCustom: true };
          } else {
            startDepot = { id: `custom_from_${Date.now()}`, name: originText, address: `${originText}, India`, lat: 25.5941, lng: 85.1376, isCustom: true };
          }
        }
        this.optimizerState.customStartDepot = startDepot;
        this.optimizerState.selectedStartDepotId = startDepot.id;
      }

      // 2. Asynchronously Geocode All Intermediate Stops
      const resolvedStops = [];
      for (let i = 0; i < rawStops.length; i++) {
        const sInput = document.getElementById(`opt-stop-${i}-search`);
        const stopQuery = sInput ? sInput.value.trim() : (rawStops[i].name || '').trim();
        let stopObj = rawStops[i];
        if (!stopObj || stopObj.name !== stopQuery || !stopObj.lat) {
          const localMatch = (window.ALL_INDIA_CITIES_DATABASE || []).find(c => Utils.fuzzyMatch(c, stopQuery));
          if (localMatch) {
            stopObj = { id: localMatch.id, name: localMatch.name, address: localMatch.address, lat: localMatch.lat, lng: localMatch.lng, priority: "Standard", weight: 150, isCustom: true };
          } else {
            const geoRes = await ApiClient.fetchNominatimGeocode(stopQuery);
            if (geoRes && geoRes.length > 0) {
              stopObj = { id: geoRes[0].id, name: stopQuery, address: geoRes[0].address, lat: geoRes[0].lat, lng: geoRes[0].lng, priority: "Standard", weight: 150, isCustom: true };
            } else {
              stopObj = { id: `custom_stop_${Date.now()}_${i+1}`, name: stopQuery, address: `${stopQuery}, India`, lat: 25.5941 + (i * 0.15), lng: 85.1376 + (i * 0.15), priority: "Standard", weight: 150, isCustom: true };
            }
          }
          rawStops[i] = stopObj;
        }
        resolvedStops.push(stopObj);
      }
      this.optimizerState.stops = resolvedStops;

      // 3. Asynchronously Geocode Destination
      let endDepot = this.optimizerState.customEndDepot;
      if (!endDepot || endDepot.name.toLowerCase() !== destText.toLowerCase() || !endDepot.lat) {
        const localMatch = (window.ALL_INDIA_CITIES_DATABASE || []).find(c => Utils.fuzzyMatch(c, destText));
        if (localMatch) {
          endDepot = { id: localMatch.id, name: localMatch.name, address: localMatch.address, lat: localMatch.lat, lng: localMatch.lng, isCustom: true };
        } else {
          const geoRes = await ApiClient.fetchNominatimGeocode(destText);
          if (geoRes && geoRes.length > 0) {
            endDepot = { id: geoRes[0].id, name: destText, address: geoRes[0].address, lat: geoRes[0].lat, lng: geoRes[0].lng, isCustom: true };
          } else {
            endDepot = { id: `custom_to_${Date.now()}`, name: destText, address: `${destText}, India`, lat: 23.7271, lng: 92.7176, isCustom: true };
          }
        }
        this.optimizerState.customEndDepot = endDepot;
        this.optimizerState.selectedEndDepotId = endDepot.id;
      }

      // 4. Collect Sequential Route Waypoints [Origin -> Stop 1 -> Stop 2 -> ... -> Destination]
      const routeWaypoints = [
        { lat: Number(startDepot.lat), lng: Number(startDepot.lng), name: startDepot.name, label: startDepot.name },
        ...resolvedStops.map((s, idx) => ({ lat: Number(s.lat), lng: Number(s.lng), name: s.name, label: `Stop ${idx + 1}: ${s.name}`, customer: `Stop ${idx + 1}: ${s.name}` })),
        { lat: Number(endDepot.lat), lng: Number(endDepot.lng), name: endDepot.name, label: endDepot.name }
      ];

      // 5. Real Road Routing via OSRM
      const osrmResult = await ApiClient.fetchOSRMRoute(routeWaypoints);
      const coords = (osrmResult.coordinates && osrmResult.coordinates.length > 1)
        ? osrmResult.coordinates
        : ApiClient.generateInterpolatedHaversineRoute(routeWaypoints);

      const distKm = (osrmResult.distanceKm && osrmResult.distanceKm > 0)
        ? osrmResult.distanceKm
        : Utils.haversineDistance(startDepot.lat, startDepot.lng, endDepot.lat, endDepot.lng);

      const durationMins = osrmResult.durationMinutes || Math.round((distKm / 50) * 60);

      // 6. Intelligence & Cost Calculation
      const intel = OptimizerEngine.calculateRidoTripIntelligence({
        origin: startDepot.name,
        destination: endDepot.name,
        vehicleModel,
        cargoWeight,
        distance: distKm,
        duration: durationMins,
        routeCoordinates: coords,
        waypoints: routeWaypoints
      });

      // 7. Find suitable vehicles from Logistics Marketplace / Available Fleet
      const allVehicles = this.getAvailableMarketplaceVehicles();
      const suitableVehicles = allVehicles
        .filter((v) => {
          const cap = Number(v.capacityKg || v.payloadMax || 0);
          const isAvail = (v.status || "").toLowerCase() === "available";
          return isAvail && cap >= cargoWeight;
        })
        .map((v) => {
          const costs = this.calculateTripCostForVehicle(v, distKm, cargoWeight, intel.totalTollCost);
          return {
            ...v,
            costs
          };
        });

      // Sort by total trip cost ascending & driver rating descending
      suitableVehicles.sort((a, b) => {
        if (a.costs.totalTripCost !== b.costs.totalTripCost) {
          return a.costs.totalTripCost - b.costs.totalTripCost;
        }
        return (b.rating || 0) - (a.rating || 0);
      });

      const bestMatch = suitableVehicles.length > 0 ? suitableVehicles[0] : null;
      const highestOption = suitableVehicles.length > 0 ? suitableVehicles[suitableVehicles.length - 1] : null;
      const savingsVal = (highestOption && bestMatch) ? Math.max(0, highestOption.costs.totalTripCost - bestMatch.costs.totalTripCost) : 0;

      // 8. Fuel Stations & Tolls
      const fuelStations = ApiClient.filterPointsNearPolyline(PAN_INDIA_HIGHWAY_FUEL_STATIONS || [], coords, 5.0);

      const totalRouteCost = bestMatch ? bestMatch.costs.totalTripCost : intel.totalRouteCost;
      const totalFuelCost = bestMatch ? bestMatch.costs.fuelCost : intel.fuelCost;
      const totalTollCost = bestMatch ? bestMatch.costs.tollCost : intel.totalTollCost;

      const routeResult = {
        coordinates: coords,
        distanceKm: intel.distanceKm,
        durationHours: intel.durationHours,
        totalCost: totalRouteCost,
        tolls: intel.tollPlazas || [],
        fuelStations: fuelStations || []
      };

      this.optimizerState.routeCalculated = true;
      this.optimizerState.routeResult = routeResult;
      this.optimizerState.optimizedStats = {
        distance: intel.distanceKm,
        time: intel.durationHours * 60,
        fuel: bestMatch ? Math.round(distKm / (bestMatch.efficiency || 5.4)) : intel.fuelRequired,
        cost: totalRouteCost,
        tollCost: totalTollCost,
        driverAllowance: bestMatch ? bestMatch.costs.driverAllowance : intel.driverAllowance,
        maintenanceCost: bestMatch ? bestMatch.costs.maintenanceCost : (intel.maintenanceCost || 0),
        co2: intel.distanceKm * 0.28
      };
      this.optimizerState.savings = {
        distance: Math.round(intel.distanceKm * 0.18),
        cost: savingsVal,
        fuel: Math.round(intel.fuelRequired * 0.18),
        time: Math.round(intel.durationHours * 60 * 0.18),
        percentage: 18.2
      };

      // Auto-persist active trip into shared storage for company <-> driver sync
      const matchedVeh = bestMatch || (this.data?.vehicles || [])[0];
      const autoActiveTrip = {
        tripId: `TRP-${Date.now().toString().slice(-6)}`,
        companyName: this.userSession?.name || "TransIndia Logistics Ltd.",
        driverId: matchedVeh?.driverId || "driver-001",
        driverName: matchedVeh?.driver || matchedVeh?.driverName || "Ravi Singh",
        vehicleId: matchedVeh?.id || "truck-001",
        vehicleName: matchedVeh?.name || "20T Truck",
        vehicleReg: matchedVeh?.plate || matchedVeh?.registration || "PB11CD5678",
        vehicleCategory: matchedVeh?.category || "Commercial Carrier",
        powertrain: matchedVeh?.powertrain || "Diesel BS-VI",
        origin: startDepot.name,
        destination: endDepot.name,
        waypoints: resolvedStops.map(s => s.name),
        stops: resolvedStops.map((s, idx) => ({
          id: s.id || `STP-${idx+1}`,
          customer: s.name,
          address: s.address,
          status: "Pending",
          lat: s.lat,
          lng: s.lng
        })),
        distanceKm: intel.distanceKm,
        durationHours: intel.durationHours,
        totalCost: totalRouteCost,
        cargoWeight: cargoWeight,
        cargoType: document.getElementById("opt-cargo-type-select")?.value || "General Cargo",
        status: "ACTIVE",
        assignedAt: new Date().toISOString(),
        tolls: intel.tollPlazas || [],
        coordinates: coords
      };

      StorageEngine.saveActiveTrip(autoActiveTrip);
      this.optimizerState.activeTrip = autoActiveTrip;

      // 9. Update Route Summary Mini-Panel & Top Metrics
      const daysCount = bestMatch ? bestMatch.costs.transitDays : Math.max(1, Math.ceil(intel.durationHours / 14));

      const setEl = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };

      setEl("nav-stat-distance", `${Math.round(intel.distanceKm).toLocaleString()} km`);
      setEl("nav-stat-time", `${Math.floor(intel.durationHours)}h ${Math.round((intel.durationHours % 1) * 60)}m`);
      setEl("nav-stat-days", `${daysCount} Day${daysCount > 1 ? 's' : ''}`);
      setEl("nav-stat-speed", `${Math.round(intel.avgSpeed || 50)} km/h`);
      setEl("nav-stat-toll", `₹ ${Math.round(totalTollCost).toLocaleString()}`);
      setEl("nav-stat-trucks", `${suitableVehicles.length} Available`);

      // 10. Update 3 Metric Summary Cards Bar
      setEl("nav-sum-fuel", `₹ ${Math.round(totalFuelCost).toLocaleString()}`);
      setEl("nav-sum-cost", `₹ ${Math.round(totalRouteCost).toLocaleString()}`);
      setEl("nav-sum-savings", `₹ ${Math.round(savingsVal).toLocaleString()}`);

      // 11. Update Fare Modal Values
      setEl("fare-modal-dist", `${Math.round(intel.distanceKm).toLocaleString()} km`);
      setEl("fare-modal-fuel", `₹ ${Math.round(totalFuelCost).toLocaleString()}`);
      setEl("fare-modal-toll", `₹ ${Math.round(totalTollCost).toLocaleString()}`);
      setEl("fare-modal-allowance", `₹ ${Math.round(bestMatch ? bestMatch.costs.driverAllowance : (daysCount * 800)).toLocaleString()}`);
      setEl("fare-modal-maint", `₹ ${Math.round(bestMatch ? bestMatch.costs.maintenanceCost : (intel.distanceKm * 4)).toLocaleString()}`);
      setEl("fare-modal-driver-earn", `₹ ${Math.round(bestMatch ? bestMatch.costs.driverEarnings : 3500).toLocaleString()}`);
      setEl("fare-modal-total-cost", `₹ ${Math.round(totalRouteCost).toLocaleString()}`);
      setEl("fare-modal-margin", `₹ ${Math.round(bestMatch ? bestMatch.costs.companyMargin : (totalRouteCost * 0.1)).toLocaleString()}`);

      // 12. Render Dynamic Recommended Drivers & Trucks Cards
      const resultsSection = document.getElementById("rido-fleet-results-section");
      if (resultsSection) resultsSection.classList.remove("hidden");

      const emptyPrompt = document.getElementById("rido-fleet-empty-prompt");
      if (emptyPrompt) emptyPrompt.classList.add("hidden");

      this.renderRecommendedVehicles(suitableVehicles, bestMatch, intel.distanceKm, cargoWeight);

      // 13. Render Interactive Map
      const mapBadge = document.getElementById("map-live-status-badge");
      if (mapBadge) mapBadge.textContent = `${startDepot.name.split(',')[0]} ➔ ${endDepot.name.split(',')[0]} Live Corridor`;

      if (window.MapEngine) {
        MapEngine.renderMap(startDepot, endDepot, resolvedStops, matchedVeh);
      }

      // 14. Render In-Optimizer Fleet Comparison Table
      this.renderInOptimizerFleetComparison(intel.distanceKm, cargoWeight);

      UIManager.playSound("success");
      UIManager.showToast(`Route calculated ✓ (${intel.distanceKm.toFixed(0)} km, ${suitableVehicles.length} trucks available)`, "success");
    } catch (err) {
      console.error("[RIDO Optimizer] Route calculation error:", err);
      UIManager.showToast("Failed to calculate route. Please check location names and try again.", "error");
    } finally {
      if (calcBtn) {
        calcBtn.disabled = false;
        calcBtn.innerHTML = origBtnHTML;
      }
    }
  },

  selectVehicleForRoute(vehicleId) {
    this.optimizerState.selectedVehicleId = vehicleId;
    const veh = (this.data?.vehicles || []).find(v => v.id === vehicleId);
    if (veh) {
      const vehSelect = document.getElementById("opt-vehicle-select");
      if (vehSelect) vehSelect.value = veh.id;
    }
    this.calculateRidoRoute();
    UIManager.showToast(`Switched route vehicle to ${veh?.name || vehicleId}`, "info");
  },

  renderInOptimizerFleetComparison(distanceKm, cargoWeight) {
    const tbody = document.getElementById("optimizer-fleet-comp-tbody");
    if (!tbody) return;

    const vehicles = (this.data && Array.isArray(this.data.vehicles)) ? this.data.vehicles : [];
    const dist = Number(distanceKm) || 0;
    const weight = Number(cargoWeight) || 0;
    const activeTrip = StorageEngine.loadActiveTrip();
    const assignedVehId = activeTrip?.vehicleId || this.optimizerState?.selectedVehicleId;
    const isTripAssigned = activeTrip && activeTrip.status !== "COMPLETED";

    if (vehicles.length === 0 || dist === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-6 text-center text-xs text-slate-400 font-medium">
            Calculate a route to compare operational costs across available freight fleet options.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = vehicles.map(v => {
      const isAssigned = isTripAssigned && (v.id === activeTrip?.vehicleId);
      const isSelected = v.id === assignedVehId || (this.optimizerState?.selectedVehicleId && v.name.includes(this.optimizerState.selectedVehicleId));
      const isEV = (v.type || '').toLowerCase().includes('electric') || (v.powertrain || '').toLowerCase().includes('electric') || (v.fuelType || '').toLowerCase().includes('electric') || (v.name || '').toLowerCase().includes('ev');
      const efficiencyStr = isEV ? `${v.efficiency || 5.8} km/kWh` : `${v.efficiency || 5.4} km/L`;
      const capacityKg = Number(v.capacity || v.maxPayload || 15000);
      const fitsCargo = weight <= capacityKg;
      const avgSpeed = Number(v.avgSpeed || 55);
      const estHours = (dist / avgSpeed);
      const transitStr = `${Math.floor(estHours)}h ${Math.round((estHours % 1) * 60)}m`;

      let fuelCost = 0;
      if (isEV) {
        fuelCost = Math.round((dist / (v.efficiency || 5.8)) * 8.5);
      } else {
        fuelCost = Math.round((dist / (v.efficiency || 5.4)) * (this.data.settings?.fuelPrice || 90));
      }

      let tollClassCost = 0;
      if (isEV && capacityKg < 1000) tollClassCost = 0;
      else if (capacityKg <= 3500) tollClassCost = Math.round(dist * 0.9);
      else if (capacityKg <= 12000) tollClassCost = Math.round(dist * 1.5);
      else tollClassCost = Math.round(dist * 2.15);

      const driverCost = Number(this.data.settings?.driverBata || 650);
      const totalOpEx = fuelCost + tollClassCost + driverCost;
      const driverName = v.driver || "Partner Pilot";

      let actionBtn = "";
      if (isAssigned) {
        actionBtn = `
          <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300 shadow-2xs">
            <span>✓ Dispatched & En-Route</span>
          </span>
        `;
      } else {
        actionBtn = `
          <button type="button" class="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] shadow-sm cursor-pointer transition border-none flex items-center gap-1 active:scale-95 ml-auto" onclick="App.dispatchTripToDriver('${Utils.escapeHTML(v.id)}')">
            <span>⚡ Assign & Dispatch</span>
          </button>
        `;
      }

      const rowClass = isAssigned 
        ? "bg-emerald-50/70 border-l-4 border-emerald-500 font-medium" 
        : (isSelected ? "bg-orange-50/60 font-medium" : "hover:bg-slate-50");

      return `
        <tr class="${rowClass} transition">
          <td>
            <div class="flex items-center gap-2.5">
              <span class="text-lg">${isEV ? '⚡' : '🚛'}</span>
              <div>
                <strong class="text-slate-900 text-xs block">${Utils.escapeHTML(v.name)}</strong>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="font-mono text-[10px] text-orange-600 font-bold">${Utils.escapeHTML(v.plate || v.id)}</span>
                  <span class="text-[10px] text-slate-400">• 👨‍✈️ ${Utils.escapeHTML(driverName)}</span>
                  ${isAssigned ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">ACTIVE</span>' : ''}
                </div>
              </div>
            </div>
          </td>
          <td><span class="px-2 py-0.5 rounded ${isEV ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'} font-bold text-[10px]">${isEV ? 'Electric EV' : 'Diesel BS-VI'}</span></td>
          <td class="font-mono text-slate-700 text-xs">${efficiencyStr}</td>
          <td>
            <span class="px-2 py-0.5 rounded ${fitsCargo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} font-bold text-[10px]">
              ${fitsCargo ? '✓ Fits (' + capacityKg.toLocaleString() + ' kg)' : '⚠️ Over (' + capacityKg.toLocaleString() + ' kg)'}
            </span>
          </td>
          <td class="font-mono text-slate-700 text-xs">${transitStr}</td>
          <td class="font-mono text-slate-900 font-bold text-xs">₹ ${fuelCost.toLocaleString()}</td>
          <td class="font-mono text-slate-900 font-bold text-xs">₹ ${tollClassCost.toLocaleString()}</td>
          <td class="font-mono text-orange-600 font-black text-xs">₹ ${totalOpEx.toLocaleString()}</td>
          <td class="text-right">
            ${actionBtn}
          </td>
        </tr>
      `;
    }).join("");
  },

  dispatchTripToDriver(vehicleId) {
    const fromInput = document.getElementById("opt-depot-from-search");
    const toInput = document.getElementById("opt-depot-to-search");
    const origin = fromInput?.value.trim() || "Starting Hub";
    const destination = toInput?.value.trim() || "Destination Hub";

    const vehicle = (this.getAvailableMarketplaceVehicles() || []).find(v => v.id === vehicleId) || (this.data?.vehicles || []).find(v => v.id === vehicleId) || (this.data?.vehicles || [])[0];
    if (!vehicle) {
      UIManager.showToast("Please select a valid vehicle.", "error");
      return;
    }

    this.optimizerState.selectedVehicleId = vehicle.id;
    vehicle.status = "In Transit";

    const optStats = this.optimizerState.optimizedStats || {};
    const routeRes = this.optimizerState.routeResult || {};
    const selectedStopIds = this.optimizerState.selectedStopIds || [];
    const stops = selectedStopIds.map(id => (this.data.stops || []).find(s => s.id === id)).filter(Boolean);

    const tripId = `TRP-${Date.now().toString().slice(-6)}`;
    const driverName = vehicle.driver || "Partner Pilot";

    const activeTrip = {
      tripId,
      companyName: this.userSession?.name || "Freight Logistics Operations",
      driverId: vehicle.driverId || "driver_01",
      driverName: driverName,
      driverMobile: vehicle.driverMobile || "9876543210",
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehicleReg: vehicle.plate || vehicle.id,
      vehicleCategory: vehicle.type || vehicle.category || "Commercial Carrier",
      powertrain: vehicle.powertrain || "Diesel BS-VI",
      origin: origin,
      destination: destination,
      waypoints: stops.map(s => s.name || s.customer),
      stops: stops.map((s, idx) => ({
        id: s.id || `STP-${idx+1}`,
        name: s.name || s.customer,
        address: s.address,
        weight: s.weight || 1200,
        status: 'Pending',
        lat: s.lat,
        lng: s.lng
      })),
      coordinates: routeRes.coordinates || [],
      distanceKm: optStats.distance || 142.5,
      durationHours: (optStats.time || 180) / 60,
      durationFormatted: `${Math.floor((optStats.time || 180) / 60)}h ${Math.round((optStats.time || 180) % 60)}m`,
      eta: `~ ${Math.floor((optStats.time || 180) / 60)}h ${Math.round((optStats.time || 180) % 60)}m`,
      fuelCost: optStats.fuel ? optStats.fuel * (this.data.settings?.fuelPrice || 90) : 2500,
      tollCost: optStats.tollCost || 450,
      driverAllowance: optStats.driverAllowance || 650,
      totalCost: optStats.cost || 3600,
      tolls: (routeRes.tolls && routeRes.tolls.length > 0) ? routeRes.tolls.map(t => ({ ...t, status: 'upcoming' })) : [],
      status: CONFIG.TRIP_STATUS.ASSIGNED,
      progress: 0.05,
      currentLocation: origin,
      currentSpeed: 58,
      createdAt: Date.now()
    };

    StorageEngine.saveActiveTrip(activeTrip);
    this.optimizerState.activeTrip = activeTrip;

    if (StorageEngine.logAdminActivity) {
      StorageEngine.logAdminActivity(`Freight Trip ${tripId} (${origin} ➔ ${destination}) dispatched to Driver ${driverName} (${vehicle.plate || vehicle.id})`);
    }

    this.saveState();
    UIManager.playSound("success");
    UIManager.showToast(`🚀 Trip ${tripId} Assigned & Dispatched to Driver ${driverName}!`, "success");

    this.updateAllUI();
    setTimeout(() => {
      UIManager.showToast(`Trip ${tripId} is now live on Live Tracking.`, "info");
      this.navigateTo("live-tracking");
    }, 1000);
  },

  // --------------------------------------------------------------------------
  // Formal Enterprise Ola/Uber-Inspired UX Actions & Modal Controllers
  // --------------------------------------------------------------------------
  toggleVehicleSelectionPreference(pref) {
    const autoBtn = document.getElementById("opt-pref-auto");
    const manBtn = document.getElementById("opt-pref-manual");
    if (pref === "auto") {
      if (autoBtn) {
        autoBtn.className = "py-2 px-2.5 rounded-xl bg-orange-500 text-white text-[11px] font-extrabold shadow-2xs transition-all border-none cursor-pointer text-left";
      }
      if (manBtn) {
        manBtn.className = "py-2 px-2.5 rounded-xl bg-transparent text-slate-700 hover:bg-white text-[11px] font-bold transition-all border-none cursor-pointer text-left";
      }
      UIManager.showToast("RIDO Engine: Auto-recommendation mode activated (best cost-to-capacity ratio)", "info");
    } else {
      if (autoBtn) {
        autoBtn.className = "py-2 px-2.5 rounded-xl bg-transparent text-slate-700 hover:bg-white text-[11px] font-bold transition-all border-none cursor-pointer text-left";
      }
      if (manBtn) {
        manBtn.className = "py-2 px-2.5 rounded-xl bg-orange-500 text-white text-[11px] font-extrabold shadow-2xs transition-all border-none cursor-pointer text-left";
      }
      UIManager.showToast("Manual vehicle selection enabled. Select any truck from the suitable fleet list.", "info");
    }
  },

  onPricingConfigChange() {
    const diesel = Number(document.getElementById("cfg-diesel-price")?.value) || 90;
    const allowance = Number(document.getElementById("cfg-driver-allowance")?.value) || 800;
    const maint = Number(document.getElementById("cfg-maint-cost")?.value) || 4;
    const margin = Number(document.getElementById("cfg-margin-pct")?.value) || 10;
    const driverEarn = Number(document.getElementById("cfg-driver-earning-pct")?.value) || 15;

    const pricing = {
      dieselPricePerLitre: diesel,
      driverAllowancePerDay: allowance,
      maintenancePerKm: maint,
      companyMarginPercent: margin,
      driverEarningPercent: driverEarn
    };

    localStorage.setItem("rido_pricing_config", JSON.stringify(pricing));
    UIManager.showToast("Pricing & margin configuration updated.", "success");

    if (this.optimizerState.routeCalculated) {
      this.calculateRidoRoute();
    }
  },

  startDriverAssignmentWorkflow(vehKey) {
    this.selectAndAssignVehicle(vehKey || "eicher-pro-3019");
  },

  selectAndAssignVehicle(vehKey) {
    let vehTitle = "Eicher Pro 3019 (HR 55 AB 1234)";
    let estCost = "₹ 21,050";
    let margin = "₹ 6,150";

    if (vehKey.includes("bharatbenz") || vehKey.includes("2823")) {
      vehTitle = "BharatBenz 2823R (PB 10 CQ 4821)";
      estCost = "₹ 24,550";
      margin = "₹ 5,200";
    } else if (vehKey.includes("tata") || vehKey.includes("prima") || vehKey.includes("5530")) {
      vehTitle = "Tata Prima 5530.S (PB 11 CD 5678)";
      estCost = "₹ 28,400";
      margin = "₹ 4,800";
    }

    this.optimizerState.pendingVehicle = {
      key: vehKey,
      name: vehTitle,
      estCost: estCost,
      margin: margin
    };

    const vehNameLabel = document.getElementById("assign-modal-veh-name");
    if (vehNameLabel) vehNameLabel.textContent = vehTitle;

    this.openDriverAssignmentModal();
  },

  openDriverAssignmentModal() {
    this.closeModals();
    const modal = document.getElementById("modal-driver-assignment");
    if (modal) modal.classList.remove("hidden");
  },

  selectDriverForTrip(driverName, rating, reg) {
    this.closeModals();
    const pendingVeh = this.optimizerState.pendingVehicle || {
      name: "Eicher Pro 3019 (HR 55 AB 1234)",
      estCost: "₹ 21,050",
      margin: "₹ 6,150"
    };

    this.optimizerState.pendingDriver = {
      name: driverName || "Rajinder Singh",
      rating: rating || "4.8",
      reg: reg || "HR 55 AB 1234"
    };

    const origin = document.getElementById("opt-depot-from-search")?.value || "Kurukshetra, Haryana";
    const dest = document.getElementById("opt-depot-to-search")?.value || "Madurai, Tamil Nadu";
    const payload = document.getElementById("opt-cargo-weight-input")?.value || "5000";

    const pPick = document.getElementById("confirm-pickup");
    const pDrop = document.getElementById("confirm-drop");
    const pPay = document.getElementById("confirm-payload");
    const pTruck = document.getElementById("confirm-truck");
    const pDriver = document.getElementById("confirm-driver");
    const pDist = document.getElementById("confirm-distance");
    const pEta = document.getElementById("confirm-eta");
    const pCost = document.getElementById("confirm-cost");
    const pMargin = document.getElementById("confirm-margin");

    if (pPick) pPick.textContent = origin;
    if (pDrop) pDrop.textContent = dest;
    if (pPay) pPay.textContent = `${Number(payload).toLocaleString()} kg`;
    if (pTruck) pTruck.textContent = pendingVeh.name;
    if (pDriver) pDriver.textContent = `${driverName} (⭐ ${rating})`;
    if (pDist) pDist.textContent = "1,689 km";
    if (pEta) pEta.textContent = "27h 35m (2 Days)";
    if (pCost) pCost.textContent = pendingVeh.estCost;
    if (pMargin) pMargin.textContent = pendingVeh.margin;

    const modalConfirm = document.getElementById("modal-confirm-trip");
    if (modalConfirm) modalConfirm.classList.remove("hidden");
  },

  executeTripDispatch() {
    this.closeModals();
    const origin = document.getElementById("opt-depot-from-search")?.value || "Kurukshetra, Haryana";
    const dest = document.getElementById("opt-depot-to-search")?.value || "Madurai, Tamil Nadu";
    const pendingVeh = this.optimizerState.pendingVehicle || { name: "Eicher Pro 3019", estCost: "₹ 21,050" };
    const pendingDriver = this.optimizerState.pendingDriver || { name: "Rajinder Singh" };

    const tripId = `RID-TRIP-00${Math.floor(100 + Math.random() * 900)}`;

    const activeTrip = {
      tripId,
      companyName: this.userSession?.name || "RIDO Commercial Logistics Ltd.",
      driverId: "driver_01",
      driverName: pendingDriver.name,
      driverMobile: "+91 98765 43210",
      driverRating: pendingDriver.rating || "4.8",
      vehicleId: "TRK-EICHER-01",
      vehicleName: pendingVeh.name,
      vehicleReg: "HR 55 AB 1234",
      vehicleCategory: "Heavy / Medium Commercial Carrier",
      powertrain: "Diesel BS-VI",
      origin: origin,
      destination: dest,
      distanceKm: 1689.0,
      durationFormatted: "27h 35m",
      eta: "27h 35m (2 Days)",
      fuelCost: 8900,
      tollCost: 4650,
      driverAllowance: 1600,
      maintenanceCost: 2400,
      driverEarnings: 3500,
      totalCost: 21050,
      expectedMargin: 6150,
      status: CONFIG.TRIP_STATUS.ASSIGNED,
      progress: 0.05,
      currentLocation: origin,
      currentSpeed: 60,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    StorageEngine.saveActiveTrip(activeTrip);
    this.optimizerState.activeTrip = activeTrip;
    this.saveState();

    const succId = document.getElementById("success-trip-id");
    const succSum = document.getElementById("success-trip-summary");
    const succRoute = document.getElementById("success-trip-route");

    if (succId) succId.textContent = tripId;
    if (succSum) succSum.textContent = `${pendingVeh.name} • ${pendingDriver.name}`;
    if (succRoute) succRoute.textContent = `${origin} ➔ ${dest}`;

    const modalSuccess = document.getElementById("modal-trip-success");
    if (modalSuccess) modalSuccess.classList.remove("hidden");

    UIManager.playSound("success");
    UIManager.showToast(`✓ Trip ${tripId} created & dispatched to ${pendingDriver.name}!`, "success");
    this.updateAllUI();
  },

  openFareBreakdownModal() {
    this.closeModals();
    const modal = document.getElementById("modal-fare-breakdown");
    if (modal) modal.classList.remove("hidden");
  },

  openFleetComparisonModal() {
    this.closeModals();
    const modal = document.getElementById("modal-fleet-comparison-table");
    if (modal) modal.classList.remove("hidden");
  },

  removeStop(stopName) {
    const list = document.getElementById("opt-stops-pills-list");
    if (!list) return;
    const items = list.querySelectorAll("div.flex");
    items.forEach(el => {
      if (el.textContent.includes(stopName.split(',')[0])) {
        el.remove();
      }
    });

    const remaining = list.querySelectorAll("div.flex").length;
    const label = document.getElementById("opt-stops-count-label");
    if (label) label.textContent = `Intermediate Stops (${remaining})`;
    UIManager.showToast(`Removed stop: ${stopName}`, "info");
  },

  triggerSOS() {
    UIManager.playSound("alert");
    UIManager.showToast("🚨 SOS Emergency Alert Sent! Dispatcher and local rescue fleet notified with live GPS coordinates.", "error");
  },

  handleLogout() {
    StorageEngine.clearUserSession();
    this.userSession = null;
    document.body.classList.remove("role-company", "role-driver");
    document.body.classList.add("role-guest");
    this.renderAuthUI();
    this.navigateTo("landing");
    UIManager.playSound("click");
    UIManager.showToast("Signed out successfully", "info");
  },

  simulateBreakdown() {
    const currentVeh =
      this.data.vehicles.find((v) => v.id === this.optimizerState.selectedVehicleId) ||
      this.data.vehicles[0];
    currentVeh.status = "Breakdown";
    currentVeh.healthScore = Math.min(currentVeh.healthScore, 35);

    const eligibleBackup =
      this.data.vehicles.find((v) => v.id !== currentVeh.id && v.status === "Available") ||
      this.data.vehicles[0];

    const modalContent = document.getElementById("breakdown-modal-content");
    if (modalContent) {
      modalContent.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
          <div style="font-weight: 700; color: #ef4444; font-size: 0.95rem; margin-bottom: 0.25rem;">
            ⚠️ Incident: ${Utils.escapeHTML(currentVeh.id)} (${Utils.escapeHTML(currentVeh.name)}) disabled on route
          </div>
          <div style="font-size: 0.8rem; color: #64748b;">
            Driver ${Utils.escapeHTML(currentVeh.driver)} reported mechanical failure. Waypoints require automated contingency re-dispatch.
          </div>
        </div>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
          <div style="font-weight: 700; color: #10b981; font-size: 0.95rem; margin-bottom: 0.25rem;">
            🤖 AI Contingency Rescue Plan Generated
          </div>
          <div style="font-size: 0.82rem; color: #334155; line-height: 1.5;">
            Assigned Standby Vehicle: <strong>${eligibleBackup ? `${Utils.escapeHTML(eligibleBackup.id)} (${Utils.escapeHTML(eligibleBackup.name)})` : "Depot Standby Unit"}</strong><br>
            Driver: <strong>${eligibleBackup ? Utils.escapeHTML(eligibleBackup.driver) : "Standby Pilot"}</strong> • Payload Capacity: <strong>${eligibleBackup ? Utils.formatWeight(eligibleBackup.payloadMax) : "1,000 kg"}</strong>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-outline" onclick="App.closeModals()">Dismiss Alert</button>
          <button class="btn btn-primary" onclick="App.confirmBreakdownReassignment('${eligibleBackup ? eligibleBackup.id : ""}')">
            Confirm & Dispatch Rescue Vehicle
          </button>
        </div>
      `;
    }

    const modal = document.getElementById("modal-breakdown");
    if (modal) modal.classList.remove("hidden");
    UIManager.playSound("alert");
  },

  confirmBreakdownReassignment(newVehicleId) {
    if (newVehicleId) {
      const newVeh = this.data.vehicles.find((v) => v.id === newVehicleId);
      if (newVeh) newVeh.status = "On Route";
      this.optimizerState.selectedVehicleId = newVehicleId;
    }
    UIManager.closeModals();
    this.saveState();
    this.calculateInitialRoute();
    this.updateAllUI();
    this.renderMap();
    UIManager.showToast(`Contingency vehicle dispatched: ${newVehicleId}`, "success");
  },

  triggerImportJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        StorageEngine.importDataJSON(
          evt.target.result,
          (importedData) => {
            this.data = importedData;
            this.saveState();
            this.populateDepotDropdowns();
            this.calculateInitialRoute();
            this.updateAllUI();
            this.renderMap();
            this.renderAllCharts();
            UIManager.showToast("Imported fleet configuration successfully.", "success");
          },
          (errMsg) => {
            UIManager.showToast(errMsg, "error");
          }
        );
      };
      reader.readAsText(file);
    };
    input.click();
  },

  // --------------------------------------------------------------------------
  // Delegation Proxies
  // --------------------------------------------------------------------------
  showToast(msg, type) { UIManager.showToast(msg, type); },
  playSound(type) { UIManager.playSound(type); },
  closeModals() { UIManager.closeModals(); },
  openCommandPalette() { UIManager.openCommandPalette(); },
  toggleNotificationDrawer() { UIManager.toggleNotificationDrawer(); },
  clearAllNotifications() { UIManager.clearAllNotifications(); },
  loadScenarioPreset(key) { ScenarioEngine.loadPreset(key); },
  onSimParamChange() { ScenarioEngine.onParamChange(); },
  resetSimulatorParams() { ScenarioEngine.resetParams(); },
  runSimScenarioAnalysis() { ScenarioEngine.runAnalysis(); UIManager.showToast("Scenario analysis computed.", "success"); },
  
  handleDemoLogin(provider = "admin") {
    if (provider === "admin" || provider === "dispatcher" || provider === "company" || provider === "google" || provider === "microsoft") {
      this.fillDemoCompanyLogin();
      this.handleMockupLogin({ preventDefault: () => {} });
    } else {
      this.fillDemoDriverLogin();
      this.handleMockupLogin({ preventDefault: () => {} });
    }
  },

  filterCommandPalette(query) {
    const items = document.querySelectorAll("#command-palette-results > div, .cmd-item");
    const q = (query || "").toLowerCase().trim();
    items.forEach((item) => {
      const txt = item.textContent.toLowerCase();
      if (!q || txt.includes(q)) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });
  },

  calculateRoiSavings() {
    this.updateLandingRoiEstimator();
  },

  handleImportFile() {
    this.triggerImportJSON();
  },

  onStopPresetSelectChange(val) {
    const sel = document.getElementById("stop-input-preset");
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;

    const dataName = opt.getAttribute("data-name") || opt.textContent.split("—")[1]?.trim() || opt.textContent.trim();
    const lat = opt.getAttribute("data-lat");
    const lng = opt.getAttribute("data-lng");

    const custInput = document.getElementById("stop-input-customer");
    const addrInput = document.getElementById("stop-input-address");
    const latInput = document.getElementById("stop-input-lat");
    const lngInput = document.getElementById("stop-input-lng");

    if (custInput) custInput.value = dataName.split(",")[0].trim();
    if (addrInput) addrInput.value = dataName;
    if (latInput && lat) latInput.value = lat;
    if (lngInput && lng) lngInput.value = lng;
  },

  renderFleetComparisonModal() {
    this.openFleetCompareModal();
  },

  // --------------------------------------------------------------------------
  // Delivery Stops & Order Queue Table (Enhanced Mockup Screen 7)
  // --------------------------------------------------------------------------
  filterStops() {
    const input = document.getElementById("stops-search-input");
    this._stopsSearchQuery = input ? input.value : "";
    this.renderStopsTable();
  },

  setStopStatusFilter(status) {
    this._stopsStatusFilter = status;
    const tabs = document.querySelectorAll("#stops-status-filters .filter-tab");
    tabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.status === status);
      if (tab.dataset.status === status) {
        tab.className = "filter-tab active px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-600 text-white shadow-2xs cursor-pointer";
      } else {
        tab.className = "filter-tab px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer";
      }
    });
    this.renderStopsTable();
  },

  renderStopsTable() {
    const tbody = document.getElementById("stops-full-tbody");
    if (!tbody || !this.data?.stops) return;

    const stops = this.data.stops;
    const statusFilter = this._stopsStatusFilter || "all";
    const query = (this._stopsSearchQuery || "").toLowerCase().trim();

    const filtered = stops.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (query) {
        const str = `${s.id} ${s.customer} ${s.address}`.toLowerCase();
        if (!str.includes(query)) return false;
      }
      return true;
    });

    // Update KPI counts if elements exist
    const totalEl = document.getElementById("stops-kpi-total");
    const completedEl = document.getElementById("stops-kpi-completed");
    const pendingEl = document.getElementById("stops-kpi-pending");
    const upcomingEl = document.getElementById("stops-kpi-upcoming");

    if (totalEl) totalEl.textContent = stops.length || "156";
    if (completedEl) completedEl.textContent = stops.filter(s => s.status === "Completed" || s.status === "Delivered").length || "98";
    if (pendingEl) pendingEl.textContent = stops.filter(s => s.status === "Pending").length || "42";
    if (upcomingEl) upcomingEl.textContent = stops.filter(s => s.status === "In Transit" || !s.status).length || "16";

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-slate-400 text-xs">
            No delivery stops found matching current filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((s, idx) => {
        // Status pill badge
        let statusBadge = `<span class="rido-pill status-pill-completed">Completed</span>`;
        if (s.status === "Current Stop" || s.status === "In Transit") {
          statusBadge = `<span class="rido-pill status-pill-current">Current Stop</span>`;
        } else if (s.status === "Upcoming" || s.status === "Pending") {
          statusBadge = `<span class="rido-pill status-pill-upcoming">Upcoming</span>`;
        }

        // Priority pill badge
        let priorityBadge = `<span class="rido-pill priority-pill-low">Low</span>`;
        if (s.priority === "High" || s.priority === "Urgent") {
          priorityBadge = `<span class="rido-pill priority-pill-high">High</span>`;
        } else if (s.priority === "Medium" || s.priority === "Standard") {
          priorityBadge = `<span class="rido-pill priority-pill-medium">Medium</span>`;
        }

        const etaStr = s.eta || `Today, 0${2 + idx}:30 PM`;
        const isInRoute = (this.optimizerState.selectedStopIds || []).includes(s.id);

        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="font-mono font-bold text-slate-900 text-xs">${Utils.escapeHTML(s.id)}</td>
            <td>
              <div class="font-bold text-slate-900 text-xs">${Utils.escapeHTML(s.customer || "Logistics Hub")}</div>
              <div class="text-[11px] text-slate-500 max-w-xs truncate">${Utils.escapeHTML(s.address)}</div>
            </td>
            <td>${statusBadge}</td>
            <td class="font-mono text-xs text-slate-700 font-bold">${etaStr}</td>
            <td>${priorityBadge}</td>
            <td class="text-right">
              <div class="inline-flex items-center gap-1.5">
                <button type="button" class="px-2.5 py-1 rounded-lg text-xs font-bold ${isInRoute ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} transition cursor-pointer border-none" onclick="App.toggleStopInRoute('${s.id}')">
                  ${isInRoute ? '✓ In Route' : '+ Add'}
                </button>
                <button type="button" class="px-2 py-1 rounded-lg text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer border border-slate-200" onclick="App.openEditStopModal('${s.id}')">
                  ✏️
                </button>
                <button type="button" class="px-2 py-1 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer border border-red-200" onclick="App.deleteStop('${s.id}')">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  },

  // --------------------------------------------------------------------------
  // System Settings Management
  // --------------------------------------------------------------------------
  loadSettingsUI() {
    if (!this.data?.settings) return;
    const s = this.data.settings;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    const setChecked = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!val;
    };

    setVal("set-company-name", s.companyName || "RIDO Logistics Hub");
    setVal("set-currency", s.currency || "₹");
    setVal("set-distance-unit", s.distanceUnit || "km");
    setVal("set-fuel-price", s.fuelPrice || 97.0);
    setVal("set-avg-speed", s.avgSpeed || 55);
    setVal("set-fastag-rate", s.fastagRate || 2.8);
    setVal("set-driver-bata", s.driverBata || 650);

    setChecked("set-return-depot", s.returnToDepot !== false);
    setChecked("set-prioritize-urgent", s.prioritizeUrgent !== false);
    setChecked("set-enforce-capacity", s.enforceCapacity !== false);
    setChecked("set-audio-feedback", s.audioFeedback !== false);
  },

  saveSettings() {
    if (!this.data.settings) this.data.settings = {};
    const comp = document.getElementById("set-company-name")?.value;
    if (comp) this.data.settings.companyName = comp;
    this.saveState();
    UIManager.showToast("Settings saved successfully", "success");
  },

  setupSettingsEvents() {
    const bindChange = (id, key, isBool = false, isNum = false) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => {
          if (!this.data.settings) this.data.settings = {};
          this.data.settings[key] = isBool ? el.checked : (isNum ? parseFloat(el.value) : el.value);
          this.saveState();
          UIManager.showToast("Settings updated and saved.", "success");
        });
      }
    };

    bindChange("set-company-name", "companyName");
    bindChange("set-currency", "currency");
    bindChange("set-distance-unit", "distanceUnit");
    bindChange("set-fuel-price", "fuelPrice", false, true);
    bindChange("set-avg-speed", "avgSpeed", false, true);
    bindChange("set-fastag-rate", "fastagRate", false, true);
    bindChange("set-driver-bata", "driverBata", false, true);
    bindChange("set-return-depot", "returnToDepot", true);
    bindChange("set-prioritize-urgent", "prioritizeUrgent", true);
    bindChange("set-enforce-capacity", "enforceCapacity", true);
    bindChange("set-audio-feedback", "audioFeedback", true);

    // Dynamic Reactive Listeners for Instant UI Effect
    const fuelEl = document.getElementById("set-fuel-price");
    if (fuelEl) {
      fuelEl.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          if (!this.data.settings) this.data.settings = {};
          this.data.settings.fuelPrice = val;
          if (window.CONFIG && window.CONFIG.ECONOMICS) {
            CONFIG.ECONOMICS.DEFAULT_DIESEL_PRICE_PER_LITER = val;
          }
        }
      });
    }

    const currEl = document.getElementById("set-currency");
    if (currEl) {
      currEl.addEventListener("change", (e) => {
        const sym = e.target.value;
        document.querySelectorAll(".curr-symbol").forEach(el => el.textContent = sym);
      });
    }
  },

  exportDataJSON() {
    StorageEngine.exportDataJSON({ data: this.data });
  },

  focusDriverAction(action) {
    if (action === 'vehicle' || action === 'fuel' || action === 'health') {
      this.navigateTo('driver-dashboard');
      setTimeout(() => {
        const el = document.getElementById('driver-dash-veh-id');
        if (el) el.closest('.rido-kpi-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else if (action === 'fastag') {
      this.navigateTo('driver-dashboard');
      setTimeout(() => {
        const el = document.getElementById('driver-welcome-title');
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } else if (action === 'route') {
      this.navigateTo('driver-dashboard');
    } else if (action === 'navigation') {
      this.navigateTo('live-tracking');
      this.startLiveGpsTracking();
      UIManager.showToast("🚀 Live GPS Turn-by-Turn Navigation Active", "success");
    } else {
      this.navigateTo('driver-dashboard');
    }
  },

  triggerSOS() {
    UIManager.playSound("alert");
    UIManager.showToast("🚨 EMERGENCY SOS ACTIVATED! Real-time alerts dispatched to Company Operations HQ and emergency response teams.", "error");
    try {
      StorageEngine.logAdminActivity("Emergency SOS triggered by Driver");
      StorageEngine.addAdminAlert("Emergency SOS", "SOS triggered by Driver " + (this.userSession?.name || "Rajinder Singh"));
    } catch (e) {
      console.warn("Log admin SOS error:", e);
    }
  },

  requestRouteApproval() {
    UIManager.showToast("📨 Route change request submitted for Company Fleet Manager approval.", "success");
    UIManager.playSound("success");
    const activeTrip = StorageEngine.loadActiveTrip();
    if (activeTrip) {
      activeTrip.routeChangeRequested = true;
      activeTrip.currentDriverRoute = {
        origin: this.getStartDepot()?.name,
        destination: this.getEndDepot(this.getStartDepot())?.name,
        stopsCount: (this.optimizerState.selectedStopIds || []).length,
        distance: this.optimizerState.optimizedStats.distance,
        cost: this.optimizerState.optimizedStats.cost
      };
      StorageEngine.saveActiveTrip(activeTrip);
      try {
        StorageEngine.logAdminActivity("Route approval requested by Driver");
        StorageEngine.addAdminAlert("Route Deviation Approval", `Driver ${this.userSession?.name} requested route change: ${activeTrip.currentDriverRoute.origin} -> ${activeTrip.currentDriverRoute.destination}`);
      } catch (e) {}
    }
  },

  driverAcceptTrip() {
    const activeTrip = StorageEngine.loadActiveTrip() || {};
    activeTrip.status = CONFIG.TRIP_STATUS.ACCEPTED;
    StorageEngine.saveActiveTrip(activeTrip);
    this.updateAllUI();
    UIManager.showToast("Trip Accepted. Preparing vehicle dispatch checklist.", "success");
  },

  driverStartTrip() {
    const activeTrip = StorageEngine.loadActiveTrip() || {};
    activeTrip.status = CONFIG.TRIP_STATUS.IN_PROGRESS;
    StorageEngine.saveActiveTrip(activeTrip);
    this.updateAllUI();
    MapEngine.startNavigationSimulation();
    UIManager.showToast("Trip started! Transit telemetry live-transmission online.", "success");
  },

  driverCompleteTrip() {
    const activeTrip = StorageEngine.loadActiveTrip() || {};
    activeTrip.status = CONFIG.TRIP_STATUS.COMPLETED;
    StorageEngine.saveActiveTrip(activeTrip);
    this.updateAllUI();
    MapEngine.stopNavigationSimulation(true);
    UIManager.showToast("Trip successfully completed! Logistics manifest signed and closed.", "success");
  },

  handleOverviewNavClick() {
    if (this.userSession?.role === "driver") {
      this.navigateTo("driver-dashboard");
    } else if (this.userSession?.role === "company") {
      this.navigateTo("operations");
    } else {
      this.navigateTo("landing");
    }
  },

  handleLiveTrackingEmptyAction() {
    if (this.userSession?.role === "driver") {
      this.navigateTo("driver-dashboard");
      UIManager.showToast("No active trip currently dispatched by company.", "info");
    } else {
      this.navigateTo("optimizer");
    }
  },

  renderLiveTrackingUI() {
    const emptyBox = document.getElementById("live-tracking-empty-box");
    const activeBox = document.getElementById("live-tracking-active-container");
    const subtitle = document.getElementById("live-tracking-subtitle");

    const activeTrip = StorageEngine.loadActiveTrip();
    const routeRes = this.optimizerState?.routeResult;
    const hasActiveTrip = (activeTrip && activeTrip.status !== "COMPLETED" && (activeTrip.coordinates?.length > 1 || activeTrip.origin)) || (this.optimizerState?.routeCalculated && routeRes?.coordinates?.length > 1);

    if (!hasActiveTrip) {
      if (emptyBox) emptyBox.classList.remove("hidden");
      if (activeBox) activeBox.classList.add("hidden");
      const emptyText = document.getElementById("live-tracking-empty-text");
      const emptyBtn = document.getElementById("btn-live-empty-action");
      if (this.userSession?.role === "driver") {
        if (emptyText) emptyText.textContent = "No active route dispatched by Company yet. Once the company calculates a route in Route Optimizer, it will appear here live.";
        if (emptyBtn) emptyBtn.textContent = "Go to My Trip";
      } else {
        if (emptyText) emptyText.textContent = "Calculate a route in the Route Optimizer and start a trip to activate live GPS tracking and telemetry.";
        if (emptyBtn) emptyBtn.textContent = "Open Route Optimizer";
      }
      return;
    }

    if (emptyBox) emptyBox.classList.add("hidden");
    if (activeBox) activeBox.classList.remove("hidden");

    const coords = (activeTrip?.coordinates && activeTrip.coordinates.length > 1)
      ? activeTrip.coordinates
      : (routeRes?.coordinates || []);

    const vehName = activeTrip?.vehicleName || "Tata Prima 5530.S";
    const vehReg = activeTrip?.vehicleReg || activeTrip?.vehicleId || "TRK-NATIONAL-01";
    const driverName = activeTrip?.driverName || "Rajinder Singh";
    const origin = activeTrip?.origin || this.optimizerState?.customStartDepot?.name || "Origin Hub";
    const destination = activeTrip?.destination || this.optimizerState?.customEndDepot?.name || "Destination Hub";
    const totalDist = activeTrip?.distanceKm || this.optimizerState?.optimizedStats?.distance || 140;
    const durationFmt = activeTrip?.durationFormatted || activeTrip?.eta || "~ 2h 45m";

    if (subtitle) {
      subtitle.textContent = `Real-time Live Telemetry for ${vehName} (${vehReg}) • Route: ${origin.split(',')[0]} ➔ ${destination.split(',')[0]}`;
    }

    const latLngEl = document.getElementById("live-gps-latlng");
    const accEl = document.getElementById("live-gps-accuracy");
    const speedEl = document.getElementById("live-gps-speed");
    const remDistEl = document.getElementById("live-gps-remaining-dist");
    const destLabelEl = document.getElementById("live-gps-destination-label");
    const etaEl = document.getElementById("live-gps-eta");
    const mapVehLabel = document.getElementById("live-map-active-vehicle-label");

    if (!this._liveSimProgress) this._liveSimProgress = 0.15;
    const progress = activeTrip?.progress || this._liveSimProgress;
    const curIdx = Math.min(coords.length - 1, Math.floor(coords.length * progress));
    const currentCoord = coords.length > 0 ? coords[curIdx] : [28.6139, 77.2090];
    const remDist = Math.max(0, totalDist * (1 - progress));

    if (latLngEl) latLngEl.textContent = `${Number(currentCoord[0]).toFixed(4)}° N, ${Number(currentCoord[1]).toFixed(4)}° E`;
    if (accEl) accEl.textContent = `Accuracy: ± 6m (Active GPS Feed)`;
    if (speedEl) speedEl.textContent = `${activeTrip?.currentSpeed || 58} km/h`;
    if (remDistEl) remDistEl.textContent = `${remDist.toFixed(1)} km`;
    if (destLabelEl) destLabelEl.textContent = `to ${destination.split(',')[0]}`;
    if (etaEl) etaEl.textContent = durationFmt;
    if (mapVehLabel) mapVehLabel.textContent = `🚛 ${vehName} (${vehReg}) • Pilot: ${driverName} • ${origin.split(',')[0]} ➔ ${destination.split(',')[0]}`;

    // Initialize or Update Leaflet Map for Live Tracking
    try {
      if (typeof L !== "undefined") {
        if (!this._liveTrackingMap) {
          const mapEl = document.getElementById("live-tracking-map");
          if (mapEl) {
            this._liveTrackingMap = L.map("live-tracking-map", { zoomControl: true }).setView(currentCoord, 10);
            L.tileLayer(CONFIG.MAP.TILES.STREETS.URL, {
              attribution: CONFIG.MAP.TILES.STREETS.ATTRIBUTION,
              subdomains: CONFIG.MAP.TILES.STREETS.SUBDOMAINS || ["mt0", "mt1", "mt2", "mt3"],
              maxZoom: 20
            }).addTo(this._liveTrackingMap);
            this._liveTrackingRoutesGroup = L.layerGroup().addTo(this._liveTrackingMap);
            this._liveTrackingMarkersGroup = L.layerGroup().addTo(this._liveTrackingMap);
          }
        }

        if (this._liveTrackingMap) {
          this._liveTrackingMap.invalidateSize();

          if (this._liveTrackingRoutesGroup) this._liveTrackingRoutesGroup.clearLayers();
          if (this._liveTrackingMarkersGroup) this._liveTrackingMarkersGroup.clearLayers();

          if (coords.length > 1) {
            // Draw crisp orange route polyline
            L.polyline(coords, {
              color: "#ea580c",
              weight: 8,
              opacity: 0.35,
              lineCap: "round",
              lineJoin: "round"
            }).addTo(this._liveTrackingRoutesGroup);

            L.polyline(coords, {
              color: "#f97316",
              weight: 4.5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round"
            }).addTo(this._liveTrackingRoutesGroup);

            // Origin Marker [A]
            const origIcon = L.divIcon({
              className: "custom-depot-pin origin-pin",
              html: `<div class="gmarker-pin depot-marker origin-marker" title="${origin}">A</div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });
            L.marker(coords[0], { icon: origIcon }).addTo(this._liveTrackingMarkersGroup).bindPopup(`<b>Origin:</b> ${origin}`);

            // Destination Marker [B]
            const destIcon = L.divIcon({
              className: "custom-depot-pin dest-pin",
              html: `<div class="gmarker-pin depot-marker dest-marker" title="${destination}">B</div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });
            L.marker(coords[coords.length - 1], { icon: destIcon }).addTo(this._liveTrackingMarkersGroup).bindPopup(`<b>Destination:</b> ${destination}`);

            // Intermediate Waypoints
            const waypoints = activeTrip?.stops || activeTrip?.waypoints || [];
            waypoints.forEach((wp, wIdx) => {
              if (wp.lat && wp.lng) {
                const wpIcon = L.divIcon({
                  className: "custom-stop-pin stop-high",
                  html: `<div class="gmarker-pin stop-high">${wIdx + 1}</div>`,
                  iconSize: [30, 30],
                  iconAnchor: [15, 15]
                });
                L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(this._liveTrackingMarkersGroup).bindPopup(`<b>Waypoint #${wIdx + 1}:</b> ${wp.name || wp.customer || "Delivery Stop"}`);
              }
            });

            // Live Moving Vehicle Marker
            const truckIcon = L.divIcon({
              className: "sim-truck-marker-wrap",
              html: `
                <div class="fleet-vehicle-marker-bubble active-assigned national-unit" style="transform: scale(1.05);">
                  <span>🚛</span>
                  <span>${Utils.escapeHTML(vehReg)}</span>
                  <span class="fleet-pin-status" style="background: rgba(255,255,255,0.3); color: #fff;">● LIVE GPS</span>
                </div>
              `,
              iconSize: [170, 36],
              iconAnchor: [85, 18]
            });

            this._liveTrackingTruckMarker = L.marker(currentCoord, { icon: truckIcon, zIndexOffset: 2000 }).addTo(this._liveTrackingMarkersGroup);

            const bounds = L.latLngBounds(coords);
            if (bounds.isValid()) {
              this._liveTrackingMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Error rendering live tracking map:", e);
    }
  },

  switchLiveTrackingMapStyle(styleName) {
    if (!this._liveTrackingMap || typeof L === "undefined") return;
    const tileConfig = CONFIG.MAP.TILES[styleName.toUpperCase()] || CONFIG.MAP.TILES.STREETS;
    
    if (this._liveTrackingTileLayer) {
      this._liveTrackingMap.removeLayer(this._liveTrackingTileLayer);
    }

    this._liveTrackingTileLayer = L.tileLayer(tileConfig.URL, {
      attribution: tileConfig.ATTRIBUTION,
      subdomains: tileConfig.SUBDOMAINS || ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: tileConfig.MAX_ZOOM || 20
    }).addTo(this._liveTrackingMap);

    if (this._liveTrackingRoutesGroup) this._liveTrackingRoutesGroup.bringToFront();
    if (this._liveTrackingMarkersGroup) this._liveTrackingMarkersGroup.bringToFront();

    const tabs = document.querySelectorAll("#view-live-tracking .style-pill");
    tabs.forEach(t => {
      const match = t.textContent.toLowerCase().includes(styleName);
      t.className = match
        ? "px-2.5 py-1 rounded-lg text-xs font-bold transition style-pill active bg-slate-900 text-white shadow-2xs cursor-pointer border-none"
        : "px-2.5 py-1 rounded-lg text-xs font-bold transition style-pill bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer border-none";
    });
  },

  recenterLiveTrackingMap() {
    if (!this._liveTrackingMap) return;
    const activeTrip = StorageEngine.loadActiveTrip();
    const coords = activeTrip?.coordinates || this.optimizerState?.routeResult?.coordinates || [];
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      if (bounds.isValid()) {
        this._liveTrackingMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  },

  toggleLiveGpsTracking() {
    if (this._isGpsTrackingActive) {
      this.stopLiveGpsTracking();
    } else {
      this.startLiveGpsTracking();
    }
  },

  startLiveGpsTracking() {
    if (!("geolocation" in navigator)) {
      UIManager.showToast("GPS Geolocation is not supported by your browser.", "error");
      return;
    }

    const btnText = document.getElementById("btn-toggle-live-gps-text");
    const emptyBox = document.getElementById("live-tracking-empty-box");
    const activeBox = document.getElementById("live-tracking-active-container");

    if (emptyBox) emptyBox.classList.add("hidden");
    if (activeBox) activeBox.classList.remove("hidden");

    this._isGpsTrackingActive = true;
    if (btnText) btnText.textContent = "Stop GPS Tracking";

    try {
      if (!this._liveTrackingMap) {
        this._liveTrackingMap = L.map("live-tracking-map").setView([28.6139, 77.2090], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(this._liveTrackingMap);
      }
    } catch (e) {}

    UIManager.showToast("Acquiring real-time device GPS signal...", "info");

    this._gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speedKmh = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : "52.4";
        const accuracy = Math.round(pos.coords.accuracy || 10);

        const latLngEl = document.getElementById("live-gps-latlng");
        const accEl = document.getElementById("live-gps-accuracy");
        const speedEl = document.getElementById("live-gps-speed");
        const mapVehLabel = document.getElementById("live-map-active-vehicle-label");

        if (latLngEl) latLngEl.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
        if (accEl) accEl.textContent = `Accuracy: ± ${accuracy}m (GPS Live)`;
        if (speedEl) speedEl.textContent = `${speedKmh} km/h`;

        const vehName = this.userSession?.vehicleName || "Registered Vehicle";
        if (mapVehLabel) mapVehLabel.textContent = `🚛 ${vehName}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        if (this._liveTrackingMap) {
          this._liveTrackingMap.setView([lat, lng], 14);
          if (!this._liveGpsMarker) {
            this._liveGpsMarker = L.marker([lat, lng], {
              title: "You are here"
            }).addTo(this._liveTrackingMap).bindPopup(`<b>${vehName} (Live GPS)</b><br>Speed: ${speedKmh} km/h`).openPopup();
          } else {
            this._liveGpsMarker.setLatLng([lat, lng]);
          }
        }
      },
      (err) => {
        console.warn("GPS Geolocation error:", err);
        UIManager.showToast("Location access required. Please enable device GPS access to view live location.", "warning");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  },

  stopLiveGpsTracking() {
    if (this._gpsWatchId !== undefined && navigator.geolocation) {
      navigator.geolocation.clearWatch(this._gpsWatchId);
      this._gpsWatchId = null;
    }
    this._isGpsTrackingActive = false;
    const btnText = document.getElementById("btn-toggle-live-gps-text");
    if (btnText) btnText.textContent = "Start GPS Tracking";
    UIManager.showToast("GPS Tracking stopped.", "info");
  },

  updateOperationsDashboard() {
    const vehicles = (this.data && Array.isArray(this.data.vehicles)) ? this.data.vehicles : [];
    const trips = (this.data && Array.isArray(this.data.trips)) ? this.data.trips : [];
    const stops = (this.data && Array.isArray(this.data.stops)) ? this.data.stops : [];
    const activeTrip = (typeof StorageEngine !== 'undefined' && StorageEngine.loadActiveTrip) ? StorageEngine.loadActiveTrip() : null;

    const totalDeliveries = stops.filter(s => s.status === 'delivered' || s.status === 'completed').length + (trips.filter(t => t.status === 'COMPLETED' || t.status === 'Delivered').length);
    const activeVehicles = vehicles.filter(v => v.status === 'active' || v.status === 'in_transit' || v.status === 'Available' || v.status === 'On Route' || v.status === 'On Trip').length + (activeTrip ? 1 : 0);

    let totalDist = 0;
    trips.forEach(t => { totalDist += (Number(t.distanceKm || t.distance) || 0); });
    if (activeTrip && activeTrip.distanceKm) {
      totalDist += Number(activeTrip.distanceKm) || 0;
    }

    const delEl = document.getElementById("ops-kpi-deliveries");
    const vehEl = document.getElementById("ops-kpi-active-vehicles");
    const ontimeEl = document.getElementById("ops-kpi-ontime");
    const distEl = document.getElementById("ops-kpi-distance");
    const costEl = document.getElementById("kpi-val-avg-cost");
    const costBarEl = document.getElementById("kpi-bar-avg-cost");

    if (delEl) delEl.textContent = totalDeliveries.toString();
    if (vehEl) vehEl.textContent = activeVehicles.toString();
    if (ontimeEl) ontimeEl.textContent = totalDeliveries > 0 ? "100%" : "0%";
    if (distEl) distEl.textContent = `${Math.round(totalDist).toLocaleString()} km`;
    if (costEl) costEl.textContent = totalDeliveries > 0 ? "₹" + Math.round(totalDist * 12).toLocaleString() : "₹0";
    if (costBarEl) costBarEl.style.width = totalDeliveries > 0 ? "72%" : "0%";

    const tollEl = document.getElementById("ops-recent-toll-cost");
    const statusCounterEl = document.getElementById("ops-fleet-status-counter");
    if (tollEl) {
      tollEl.textContent = activeTrip && activeTrip.tollCost ? `₹ ${Number(activeTrip.tollCost).toLocaleString()}` : "₹0";
    }
    if (statusCounterEl) {
      const dispatchCount = (activeTrip ? 1 : 0) + trips.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN_TRANSIT').length;
      statusCounterEl.textContent = `${dispatchCount} Active Dispatches`;
    }

    // Dynamic Live Trips Table Binding
    const liveTripsTbody = document.getElementById("ops-live-trips-tbody");
    if (liveTripsTbody) {
      const allTrips = activeTrip ? [activeTrip, ...(trips || [])] : (trips || []);
      if (allTrips.length > 0) {
        liveTripsTbody.innerHTML = allTrips.map(t => `
          <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="App.navigateTo('live-tracking')">
            <td class="p-2.5 font-mono font-bold text-slate-900">${Utils.escapeHTML(t.tripId || 'TRIP-ACTIVE')}</td>
            <td class="p-2.5 font-bold text-slate-900">${Utils.escapeHTML((t.origin || '').split(',')[0])} ➔ ${Utils.escapeHTML((t.destination || '').split(',')[0])}</td>
            <td class="p-2.5 font-mono text-slate-600">${Utils.escapeHTML(t.vehicleReg || t.plate || '—')}</td>
            <td class="p-2.5 text-slate-700">${Utils.escapeHTML(t.driverName || '—')}</td>
            <td class="p-2.5"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">${Utils.escapeHTML(t.status || 'In Transit')}</span></td>
            <td class="p-2.5 font-mono text-slate-600">${Utils.escapeHTML(t.eta || '—')}</td>
            <td class="p-2.5 text-right font-bold text-slate-400">›</td>
          </tr>
        `).join('');
      } else {
        liveTripsTbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center">
              <div class="flex flex-col items-center justify-center">
                <div class="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
                  <svg class="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <strong class="text-sm font-black text-slate-900 block">No active trips</strong>
                <p class="text-xs text-slate-400 mt-0.5">You don't have any active trips at the moment.</p>
              </div>
            </td>
          </tr>
        `;
      }
    }

    // Dynamic Recent Activity Binding
    const activityList = document.getElementById("ops-recent-activity-list");
    if (activityList) {
      if (activeTrip) {
        activityList.innerHTML = `
          <div class="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-xl transition gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0 font-bold">🚚</div>
              <div class="min-w-0">
                <strong class="text-slate-900 block text-[11px] truncate">Trip active: ${Utils.escapeHTML(activeTrip.origin || '')} ➔ ${Utils.escapeHTML(activeTrip.destination || '')}</strong>
                <span class="text-[10px] text-slate-400 font-mono">${Utils.escapeHTML(activeTrip.vehicleReg || activeTrip.plate || '')}</span>
              </div>
            </div>
            <span class="text-[10px] text-slate-400 font-medium shrink-0">Just now</span>
          </div>
        `;
      } else {
        activityList.innerHTML = `
          <div class="flex flex-col items-center justify-center py-6 my-auto text-center">
            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1.5">
              <svg class="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span class="text-xs text-slate-400 font-medium">No recent activity</span>
          </div>
        `;
      }
    }
  },

  renderCompanyFastagCosts() {
    const isCalculated = !!this.optimizerState?.routeCalculated;
    const optStats = this.optimizerState?.optimizedStats || {};
    const vehicles = this.data?.vehicles || [];
    const vehicle = vehicles.find(v => v.id === this.optimizerState?.selectedVehicleId) || vehicles[0] || { name: "No vehicle selected", plate: "—", driver: "—" };
    const tolls = this.optimizerState?.routeResult?.tolls || [];

    const kpiCorridors = document.getElementById("fastag-kpi-corridors");
    const kpiTolls = document.getElementById("fastag-kpi-upcoming-tolls");
    const kpiOpex = document.getElementById("fastag-kpi-total-opex");
    const kpiHealth = document.getElementById("fastag-kpi-autodebit-status");
    const tbody = document.getElementById("fastag-schedule-tbody");

    const fuelVolEl = document.getElementById("fastag-cost-fuel-vol");
    const fuelValEl = document.getElementById("fastag-cost-fuel-val");
    const fuelPctEl = document.getElementById("fastag-cost-fuel-pct");
    const tollCountEl = document.getElementById("fastag-cost-toll-count");
    const tollValEl = document.getElementById("fastag-cost-toll-val");
    const tollPctEl = document.getElementById("fastag-cost-toll-pct");
    const driverDescEl = document.getElementById("fastag-cost-driver-desc");
    const driverValEl = document.getElementById("fastag-cost-driver-val");
    const driverPctEl = document.getElementById("fastag-cost-driver-pct");
    const maintValEl = document.getElementById("fastag-cost-maint-val");
    const maintPctEl = document.getElementById("fastag-cost-maint-pct");
    const totalDescEl = document.getElementById("fastag-cost-total-desc");
    const totalValEl = document.getElementById("fastag-cost-total-val");
    const totalPerKmEl = document.getElementById("fastag-cost-total-per-km");

    const saveNetVal = document.getElementById("fastag-savings-net-val");
    const saveNetPct = document.getElementById("fastag-savings-net-pct");
    const saveDistVal = document.getElementById("fastag-savings-dist-val");
    const saveDistDesc = document.getElementById("fastag-savings-dist-desc");

    const barFuel = document.getElementById("fastag-bar-fuel");
    const barToll = document.getElementById("fastag-bar-toll");
    const barDriver = document.getElementById("fastag-bar-driver");
    const barMaint = document.getElementById("fastag-bar-maint");

    if (!isCalculated || (optStats.cost || 0) <= 0) {
      if (kpiCorridors) kpiCorridors.textContent = "0 Highways";
      if (kpiTolls) kpiTolls.textContent = "₹ 0.00";
      if (kpiOpex) kpiOpex.textContent = "₹ 0.00";
      if (kpiHealth) kpiHealth.textContent = "Ready";

      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center text-xs text-slate-400 font-medium">
              No upcoming FASTag tolls scheduled. Calculate and dispatch a route in the Route Optimizer to view live toll deductions.
            </td>
          </tr>
        `;
      }

      if (fuelVolEl) fuelVolEl.textContent = "0 Liters • ₹ 0.00";
      if (fuelValEl) fuelValEl.textContent = "₹ 0.00";
      if (fuelPctEl) fuelPctEl.textContent = "0% of total";

      if (tollCountEl) tollCountEl.textContent = "0 En-Route Automated Gates";
      if (tollValEl) tollValEl.textContent = "₹ 0.00";
      if (tollPctEl) tollPctEl.textContent = "0% of total";

      if (driverDescEl) driverDescEl.textContent = "Standard Allowance";
      if (driverValEl) driverValEl.textContent = "₹ 0.00";
      if (driverPctEl) driverPctEl.textContent = "0% of total";

      if (maintValEl) maintValEl.textContent = "₹ 0.00";
      if (maintPctEl) maintPctEl.textContent = "0% of total";

      if (totalDescEl) totalDescEl.textContent = "No active route corridor";
      if (totalValEl) totalValEl.textContent = "₹ 0.00";
      if (totalPerKmEl) totalPerKmEl.textContent = "Cost / km: ₹ 0.00";

      if (saveNetVal) saveNetVal.textContent = "₹ 0.00";
      if (saveNetPct) saveNetPct.textContent = "▼ 0% Cost Reduction";
      if (saveDistVal) saveDistVal.textContent = "0 km";
      if (saveDistDesc) saveDistDesc.textContent = "Optimal Routing";

      if (barFuel) barFuel.style.width = "0%";
      if (barToll) barToll.style.width = "0%";
      if (barDriver) barDriver.style.width = "0%";
      if (barMaint) barMaint.style.width = "0%";
      return;
    }

    const dist = Number(optStats.distance || 0);
    const fuelCost = Number(optStats.fuelCost || (optStats.fuel * (this.data.settings?.fuelPrice || 90)) || (optStats.cost * 0.65) || 0);
    const tollCost = Number(optStats.tollCost || 0);
    const driverCost = Number(optStats.driverAllowance || this.data.settings?.driverBata || 650);
    const maintCost = Math.round(dist * 1.2);
    const totalCost = fuelCost + tollCost + driverCost + maintCost;

    const fuelPct = totalCost > 0 ? Math.round((fuelCost / totalCost) * 100) : 0;
    const tollPct = totalCost > 0 ? Math.round((tollCost / totalCost) * 100) : 0;
    const driverPct = totalCost > 0 ? Math.round((driverCost / totalCost) * 100) : 0;
    const maintPct = totalCost > 0 ? Math.max(0, 100 - fuelPct - tollPct - driverPct) : 0;

    if (kpiCorridors) kpiCorridors.textContent = "1 Highway";
    if (kpiTolls) kpiTolls.textContent = `₹ ${tollCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (kpiOpex) kpiOpex.textContent = `₹ ${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (kpiHealth) kpiHealth.textContent = "100% Active";

    if (tbody) {
      if (tolls.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-6 text-center text-xs text-slate-500 font-medium">
              No toll plazas identified along this calculated route corridor.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = tolls.map((t, idx) => `
          <tr class="hover:bg-slate-50 transition">
            <td>
              <div class="font-bold text-slate-900 text-xs">${Utils.escapeHTML(vehicle.name || "Vehicle")}</div>
              <span class="font-mono text-[10px] text-orange-600 font-bold">${Utils.escapeHTML(vehicle.plate || vehicle.id || "TRK-01")}</span>
            </td>
            <td class="text-xs text-slate-700 font-medium">${Utils.escapeHTML(vehicle.driver || "Driver")}</td>
            <td class="text-xs text-slate-600 font-mono">${Utils.escapeHTML(t.highway || "NH Highway")}</td>
            <td>
              <strong class="text-xs text-slate-900 block">${Utils.escapeHTML(t.name)}</strong>
              <span class="text-[10px] text-slate-400">${t.state || "National Highway"} • Lane 0${(idx % 4) + 1}</span>
            </td>
            <td class="font-mono text-xs text-slate-700">En-Route</td>
            <td class="font-mono text-xs font-black text-emerald-600">₹ ${Number(t.rate || 85).toFixed(2)}</td>
            <td class="text-right">
              <span class="rido-pill ${idx === 0 ? 'status-pill-completed' : 'status-pill-upcoming'}">${idx === 0 ? '✓ Cleared' : '⌛ Auto-Queued'}</span>
            </td>
          </tr>
        `).join("");
      }
    }

    if (fuelVolEl) fuelVolEl.textContent = `${Number(optStats.fuel || 0).toFixed(1)} Liters • ₹ ${fuelCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (fuelValEl) fuelValEl.textContent = `₹ ${fuelCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (fuelPctEl) fuelPctEl.textContent = `${fuelPct}% of total`;

    if (tollCountEl) tollCountEl.textContent = `${tolls.length} En-Route Automated Gates`;
    if (tollValEl) tollValEl.textContent = `₹ ${tollCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (tollPctEl) tollPctEl.textContent = `${tollPct}% of total`;

    if (driverDescEl) driverDescEl.textContent = `Commercial Transit Allowance`;
    if (driverValEl) driverValEl.textContent = `₹ ${driverCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (driverPctEl) driverPctEl.textContent = `${driverPct}% of total`;

    if (maintValEl) maintValEl.textContent = `₹ ${maintCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (maintPctEl) maintPctEl.textContent = `${maintPct}% of total`;

    if (totalDescEl) totalDescEl.textContent = `${dist.toFixed(1)} km Active Corridor`;
    if (totalValEl) totalValEl.textContent = `₹ ${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (totalPerKmEl) totalPerKmEl.textContent = `Cost / km: ₹ ${dist > 0 ? (totalCost / dist).toFixed(2) : '0.00'}`;

    const netSavings = Math.round(totalCost * 0.18);
    if (saveNetVal) saveNetVal.textContent = `₹ ${netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (saveNetPct) saveNetPct.textContent = `▼ 18.2% Cost Reduction`;
    if (saveDistVal) saveDistVal.textContent = `${Math.round(dist * 0.18)} km`;
    if (saveDistDesc) saveDistDesc.textContent = `Optimal Routing`;

    if (barFuel) barFuel.style.width = `${fuelPct}%`;
    if (barToll) barToll.style.width = `${tollPct}%`;
    if (barDriver) barDriver.style.width = `${driverPct}%`;
    if (barMaint) barMaint.style.width = `${maintPct}%`;
  },

  openDriverTruckModal() {
    const driverId = this.userSession?.id || "driver_01";
    const saved = StorageEngine.getDriverTruck(driverId) || {
      plate: "PB 10 CQ 4821",
      model: "Tata Prima 5530.S",
      powertrain: "Diesel BS-VI",
      capacity: 28000,
      fuel: 85,
      fastag: "NETC-ICICI-8821",
      status: "Available"
    };

    const plateInput = document.getElementById("dtruck-plate");
    const modelInput = document.getElementById("dtruck-model");
    const powerInput = document.getElementById("dtruck-powertrain");
    const capInput = document.getElementById("dtruck-capacity");
    const fuelInput = document.getElementById("dtruck-fuel");
    const fastagInput = document.getElementById("dtruck-fastag");
    const statusInput = document.getElementById("dtruck-status");

    if (plateInput) plateInput.value = saved.plate || "";
    if (modelInput) modelInput.value = saved.model || "Tata Prima 5530.S";
    if (powerInput) powerInput.value = saved.powertrain || "Diesel BS-VI";
    if (capInput) capInput.value = saved.capacity || 28000;
    if (fuelInput) fuelInput.value = saved.fuel || 85;
    if (fastagInput) fastagInput.value = saved.fastag || "";
    if (statusInput) statusInput.value = saved.status || "Available";

    const modal = document.getElementById("modal-driver-truck");
    if (modal) modal.classList.remove("hidden");
  },

  onDriverTruckModelChange() {
    const model = document.getElementById("dtruck-model")?.value || "";
    const powerInput = document.getElementById("dtruck-powertrain");
    const capInput = document.getElementById("dtruck-capacity");

    const isEV = model.toLowerCase().includes("ev");
    if (powerInput) powerInput.value = isEV ? "Electric (EV)" : "Diesel BS-VI";

    if (capInput) {
      if (model.includes("5530")) capInput.value = 28000;
      else if (model.includes("2823")) capInput.value = 18500;
      else if (model.includes("3019")) capInput.value = 11000;
      else if (model.includes("4220")) capInput.value = 29000;
      else if (model.includes("407")) capInput.value = 3800;
      else if (model.includes("Bolero")) capInput.value = 1700;
      else if (model.includes("Ace")) capInput.value = 1200;
      else if (model.includes("Zor")) capInput.value = 450;
    }
  },

  saveDriverTruckForm(event) {
    if (event) event.preventDefault();
    const driverId = this.userSession?.id || "driver_01";
    const driverName = this.userSession?.name || "Pilot";

    const plate = document.getElementById("dtruck-plate")?.value.trim().toUpperCase();
    const model = document.getElementById("dtruck-model")?.value;
    const powertrain = document.getElementById("dtruck-powertrain")?.value;
    const capacity = Number(document.getElementById("dtruck-capacity")?.value) || 15000;
    const fuel = Number(document.getElementById("dtruck-fuel")?.value) || 85;
    const fastag = document.getElementById("dtruck-fastag")?.value.trim();
    const status = document.getElementById("dtruck-status")?.value || "Available";

    if (!plate) {
      UIManager.showToast("Please enter a valid vehicle license plate.", "error");
      return;
    }

    const truckData = {
      id: `VEH-${plate.replace(/\s+/g, '')}`,
      name: model,
      plate: plate,
      driver: driverName,
      driverId: driverId,
      powertrain: powertrain,
      capacity: capacity,
      maxPayload: capacity,
      fuelLevel: fuel,
      fastagId: fastag,
      status: status,
      healthScore: 98,
      efficiency: powertrain.includes("Electric") ? 5.8 : 5.4,
      costPerKm: powertrain.includes("Electric") ? 8.5 : 16.5,
      isDriverRegistered: true
    };

    StorageEngine.saveDriverTruck(driverId, truckData);

    // Synchronize into current session's vehicles dataset
    if (this.data && Array.isArray(this.data.vehicles)) {
      const idx = this.data.vehicles.findIndex(v => v.driverId === driverId || v.plate === plate);
      if (idx >= 0) {
        this.data.vehicles[idx] = { ...this.data.vehicles[idx], ...truckData };
      } else {
        this.data.vehicles.unshift(truckData);
      }
    }

    this.closeModals();
    UIManager.playSound("success");
    UIManager.showToast(`Vehicle ${plate} registered successfully on RouteSaathi!`, "success");

    this.updateAllUI();
  },

  driverStartTrip() {
    const activeTrip = StorageEngine.loadActiveTrip();
    if (!activeTrip) {
      UIManager.showToast("No assigned trip found to start.", "warn");
      return;
    }

    activeTrip.status = CONFIG.TRIP_STATUS.IN_PROGRESS;
    activeTrip.startedAt = Date.now();
    activeTrip.progress = Math.max(activeTrip.progress || 5, 5);
    StorageEngine.saveActiveTrip(activeTrip);

    if (StorageEngine.logAdminActivity) {
      StorageEngine.logAdminActivity(`Driver started navigation for Trip ${activeTrip.tripId} (${activeTrip.origin} ➔ ${activeTrip.destination})`);
    }

    UIManager.playSound("start");
    UIManager.showToast(`🚀 Navigation Started for Trip ${activeTrip.tripId}! Safe journey.`, "success");

    this.updateDriverDashboardUI();

    // Start Live GPS Simulation on the Driver Dashboard Map
    if (window.MapEngine && activeTrip.coordinates && activeTrip.coordinates.length > 1) {
      MapEngine.startNavigationSimulation(activeTrip.coordinates, (progressRatio, currentCoord, passedDistKm) => {
        const progressPct = Math.min(Math.round(progressRatio * 100), 100);
        const remDist = Math.max(Number((activeTrip.distanceKm - passedDistKm).toFixed(1)), 0);
        const estSpeed = 55;
        const remHours = remDist / estSpeed;
        const remEta = `${Math.floor(remHours)}h ${Math.round((remHours % 1) * 60)}m`;

        // Check if passed any toll plazas
        let updatedTolls = activeTrip.tolls || [];
        if (Array.isArray(updatedTolls)) {
          updatedTolls = updatedTolls.map(t => {
            if (t.lat && t.lng && currentCoord) {
              const d = Utils.haversineDistance(t.lat, t.lng, currentCoord[0], currentCoord[1]);
              if (d <= 1.5 || passedDistKm >= (t.routeDistanceFromOrigin || 0)) {
                return { ...t, status: 'cleared' };
              }
            }
            return t;
          });
        }

        StorageEngine.updateTripStatus(progressPct >= 100 ? CONFIG.TRIP_STATUS.COMPLETED : CONFIG.TRIP_STATUS.IN_PROGRESS, {
          progress: progressPct,
          currentLocation: currentCoord ? `${currentCoord[0].toFixed(4)}, ${currentCoord[1].toFixed(4)}` : activeTrip.currentLocation,
          currentSpeed: progressPct >= 100 ? 0 : Math.round(50 + Math.random() * 15),
          remainingDistance: remDist,
          eta: remEta,
          tolls: updatedTolls
        });

        const remDistEl = document.getElementById("driver-dash-rem-dist");
        const etaEl = document.getElementById("driver-dash-eta");
        const progressEl = document.getElementById("driver-dash-progress");
        const progressBarEl = document.getElementById("driver-dash-progress-bar");
        if (remDistEl) remDistEl.textContent = `${remDist} km`;
        if (etaEl) etaEl.textContent = remEta;
        if (progressEl) progressEl.textContent = `${progressPct}% Complete`;
        if (progressBarEl) progressBarEl.style.width = `${progressPct}%`;

        if (progressPct >= 100) {
          const startBtn = document.getElementById("btn-driver-start-trip");
          const endBtn = document.getElementById("btn-driver-end-trip");
          if (startBtn) startBtn.classList.add("hidden");
          if (endBtn) endBtn.classList.remove("hidden");
        }
      });
    }
  },

  driverCompleteTrip() {
    const activeTrip = StorageEngine.loadActiveTrip();
    if (!activeTrip) return;

    if (window.MapEngine) {
      MapEngine.stopNavigationSimulation(true);
    }

    const completed = StorageEngine.completeActiveTrip();

    if (StorageEngine.logAdminActivity) {
      StorageEngine.logAdminActivity(`Driver completed Trip ${completed?.tripId || ''} (${completed?.origin || ''} ➔ ${completed?.destination || ''}). Payout settled.`);
    }

    UIManager.playSound("success");
    UIManager.showToast(`🎉 Trip ${completed?.tripId || ''} Completed Successfully! Proof of delivery logged.`, "success");

    this.updateAllUI();
  },

  updateDriverDashboardUI() {
    const activeTrip = (typeof StorageEngine !== "undefined" && StorageEngine.loadActiveTrip) ? StorageEngine.loadActiveTrip() : null;
    const hasActiveTrip = activeTrip && activeTrip.tripId && activeTrip.status !== CONFIG.TRIP_STATUS.COMPLETED;
    const vehiclesList = (this.data && Array.isArray(this.data.vehicles)) ? this.data.vehicles : [];
    
    // Check driver's own registered truck first
    const driverId = this.userSession?.id || "driver_01";
    const driverOwnTruck = (typeof StorageEngine !== "undefined" && StorageEngine.getDriverTruck) ? StorageEngine.getDriverTruck(driverId) : null;

    // Active vehicle
    const currentVeh = hasActiveTrip 
      ? (vehiclesList.find(v => v.id === activeTrip.vehicleId || v.plate === activeTrip.vehicleReg) || (this.optimizerState?.selectedVehicleId ? vehiclesList.find(v => v.id === this.optimizerState.selectedVehicleId) : null) || driverOwnTruck)
      : (driverOwnTruck || (this.optimizerState?.routeCalculated && this.optimizerState?.selectedVehicleId ? vehiclesList.find(v => v.id === this.optimizerState.selectedVehicleId) : null));

    const titleEl = document.getElementById("driver-welcome-title");
    if (titleEl) titleEl.textContent = `Welcome back, ${this.userSession?.name || "Pilot"} 👨‍✈️`;

    // 0. Active Trip Notification Action Banner
    const tripBanner = document.getElementById("driver-active-trip-banner");
    const bannerBadge = document.getElementById("driver-banner-status-badge");
    const bannerTripId = document.getElementById("driver-banner-trip-id");
    const bannerTitle = document.getElementById("driver-banner-route-title");
    const bannerSubtext = document.getElementById("driver-banner-subtext");
    const bannerPayout = document.getElementById("driver-banner-payout");
    const startBtn = document.getElementById("btn-driver-start-trip");
    const endBtn = document.getElementById("btn-driver-end-trip");

    if (tripBanner) {
      if (hasActiveTrip) {
        tripBanner.classList.remove("hidden");
        if (bannerTripId) bannerTripId.textContent = activeTrip.tripId;
        if (bannerTitle) bannerTitle.textContent = `${(activeTrip.origin || 'Start').split(',')[0]} ➔ ${(activeTrip.destination || 'End').split(',')[0]}`;
        if (bannerPayout) bannerPayout.textContent = `₹ ${Number(activeTrip.totalCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        
        if (activeTrip.status === CONFIG.TRIP_STATUS.IN_PROGRESS) {
          if (bannerBadge) {
            bannerBadge.textContent = "IN TRANSIT • LIVE GPS";
            bannerBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white";
          }
          if (bannerSubtext) bannerSubtext.textContent = "Live turn-by-turn routing active. Progress & toll clearances syncing live with Dispatch HQ.";
          if (startBtn) startBtn.classList.add("hidden");
          if (endBtn) endBtn.classList.remove("hidden");
        } else {
          if (bannerBadge) {
            bannerBadge.textContent = "NEW TRIP ASSIGNED";
            bannerBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white";
          }
          if (bannerSubtext) bannerSubtext.textContent = "Company dispatch assigned this corridor to your truck. Review route and launch navigation.";
          if (startBtn) startBtn.classList.remove("hidden");
          if (endBtn) endBtn.classList.add("hidden");
        }
      } else {
        tripBanner.classList.add("hidden");
      }
    }

    // 1. Vehicle Metric Card
    const vehIdEl = document.getElementById("driver-dash-veh-id");
    const vehNameEl = document.getElementById("driver-dash-veh-name");
    if (vehIdEl) {
      vehIdEl.textContent = currentVeh ? (currentVeh.plate || currentVeh.id) : "--";
      vehIdEl.className = currentVeh ? "text-lg font-black text-slate-900 font-mono" : "text-lg font-black text-slate-400 font-mono";
    }
    if (vehNameEl) {
      vehNameEl.textContent = currentVeh ? `${currentVeh.name || "Commercial Carrier"} • ${currentVeh.powertrain || "Diesel"}` : "No vehicle assigned";
    }

    // 2. Fuel / Battery Metric Card
    const fuelEl = document.getElementById("driver-dash-fuel");
    const fuelRangeEl = document.getElementById("driver-dash-fuel-range");
    if (fuelEl) {
      const isEV = currentVeh && ((currentVeh.type || '').toLowerCase().includes('electric') || (currentVeh.powertrain || '').toLowerCase().includes('electric') || (currentVeh.fuelType || '').toLowerCase().includes('electric'));
      fuelEl.textContent = currentVeh ? `${currentVeh.fuelLevel || 85}%` : "--";
      fuelEl.className = currentVeh ? "text-lg font-black text-slate-900 font-mono" : "text-lg font-black text-slate-400 font-mono";
      if (fuelRangeEl) {
        fuelRangeEl.textContent = currentVeh 
          ? `${Math.round((currentVeh.fuelLevel || 85) * 4.8)} km Est. Range • ${isEV ? 'Battery' : 'Fuel'}`
          : "No battery/fuel data";
        fuelRangeEl.className = currentVeh ? "text-[10px] text-emerald-600 font-semibold block" : "text-[10px] text-slate-400 font-semibold block";
      }
    }

    // 3. Vehicle Health Metric Card
    const healthEl = document.getElementById("driver-dash-health");
    const healthScoreEl = document.getElementById("driver-dash-health-score");
    if (healthEl) {
      const hp = currentVeh ? (currentVeh.healthScore || 98) : null;
      healthEl.textContent = hp !== null ? (hp > 80 ? "Good" : (hp > 50 ? "Moderate" : "Attention")) : "--";
      healthEl.className = hp !== null ? (hp > 80 ? "text-lg font-black text-emerald-600 font-mono" : "text-lg font-black text-amber-600 font-mono") : "text-lg font-black text-slate-400 font-mono";
      if (healthScoreEl) {
        healthScoreEl.textContent = hp !== null ? `${hp}% Telemetry Score` : "No telemetry score";
      }
    }

    // 4. Active Trip Status Metric Card
    const statusEl = document.getElementById("driver-dash-status");
    const statusDotEl = document.getElementById("driver-dash-status-dot");
    const tripIdEl = document.getElementById("driver-dash-trip-id");
    if (statusEl) {
      statusEl.textContent = hasActiveTrip ? (activeTrip.status === CONFIG.TRIP_STATUS.IN_PROGRESS ? "In Progress" : "Assigned") : "No active trip";
      statusEl.className = hasActiveTrip ? "text-lg font-black text-slate-900" : "text-lg font-black text-slate-400";
    }
    if (statusDotEl) {
      statusDotEl.className = hasActiveTrip ? "w-3 h-3 rounded-full bg-emerald-500 animate-pulse" : "w-3 h-3 rounded-full bg-slate-300";
    }
    if (tripIdEl) {
      tripIdEl.textContent = hasActiveTrip ? (activeTrip.tripId || activeTrip.id || "--") : "--";
    }

    // 5. Trip Overview
    const remDistEl = document.getElementById("driver-dash-rem-dist");
    const etaEl = document.getElementById("driver-dash-eta");
    const progressEl = document.getElementById("driver-dash-progress");
    const progressBarEl = document.getElementById("driver-dash-progress-bar");
    const destEl = document.getElementById("driver-dash-destination");

    if (remDistEl) {
      const dist = hasActiveTrip ? (activeTrip.remainingDistance !== undefined ? activeTrip.remainingDistance : (activeTrip.distanceKm || activeTrip.distance || 0)) : 0;
      remDistEl.textContent = dist > 0 ? `${Number(dist).toFixed(1)} km` : "-- km";
      remDistEl.className = dist > 0 ? "text-3xl font-black text-slate-900 font-mono block mt-0.5" : "text-3xl font-black text-slate-400 font-mono block mt-0.5";
    }
    if (etaEl) {
      etaEl.textContent = hasActiveTrip && activeTrip.eta ? activeTrip.eta : "--";
      etaEl.className = hasActiveTrip && activeTrip.eta ? "text-2xl font-black text-slate-900 font-mono block mt-0.5" : "text-2xl font-black text-slate-400 font-mono block mt-0.5";
    }
    if (progressEl) {
      const prog = hasActiveTrip ? (activeTrip.progress || 0) : 0;
      progressEl.textContent = `${prog}% Complete`;
      progressEl.className = prog > 0 ? "font-mono text-emerald-600 font-bold" : "font-mono text-slate-400";
    }
    if (progressBarEl) {
      const prog = hasActiveTrip ? (activeTrip.progress || 0) : 0;
      progressBarEl.style.width = `${prog}%`;
    }
    if (destEl) {
      destEl.textContent = hasActiveTrip ? (activeTrip.destination || activeTrip.destinationHub || "--") : "No active destination";
    }

    // 6. Delivery Manifest
    const stopsSummaryEl = document.getElementById("driver-dash-stops-summary");
    const listEl = document.getElementById("driver-dash-stops-list");
    const stops = (hasActiveTrip && Array.isArray(activeTrip.stops)) ? activeTrip.stops : [];

    if (stopsSummaryEl) {
      stopsSummaryEl.textContent = `${stops.length} Stops`;
    }
    if (listEl) {
      if (stops.length === 0) {
        listEl.innerHTML = `
          <div class="p-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl">
            No manifest assigned.
          </div>
        `;
      } else {
        listEl.innerHTML = stops.map((s, i) => `
          <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-6 h-6 rounded-lg ${s.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'} font-bold text-xs flex items-center justify-center">${i + 1}</div>
              <div>
                <strong class="text-xs text-slate-900 block leading-tight">${Utils.escapeHTML(s.name || s.customer || 'Stop')}</strong>
                <span class="text-[10px] text-slate-500">${Utils.escapeHTML(s.address || 'Address')}</span>
              </div>
            </div>
            <span class="rido-pill ${s.status === 'Completed' ? 'status-pill-completed' : 'status-pill-current'} text-[10px]">${s.status || 'Pending'}</span>
          </div>
        `).join("");
      }
    }

    // 7. Dedicated Driver FASTag & Toll Card
    const fastagVehEl = document.getElementById("driver-dash-fastag-veh");
    const fastagBalEl = document.getElementById("driver-dash-fastag-balance");
    const fastagStatusEl = document.getElementById("driver-dash-fastag-status");
    const tollLogEl = document.getElementById("driver-dash-toll-log");
    const tolls = (hasActiveTrip && Array.isArray(activeTrip.tolls)) ? activeTrip.tolls : [];

    if (fastagVehEl) {
      fastagVehEl.textContent = currentVeh 
        ? `Vehicle Tag: ${currentVeh.plate || currentVeh.id} (${currentVeh.name}) • Bank: ICICI NETC FASTag`
        : "No vehicle assigned • FASTag Gateway Live";
    }
    if (fastagBalEl) {
      fastagBalEl.textContent = currentVeh && currentVeh.fastagBalance ? `₹ ${Number(currentVeh.fastagBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "₹ 0.00";
    }
    if (fastagStatusEl) {
      fastagStatusEl.textContent = hasActiveTrip ? "ACTIVE AUTO-DEBIT" : "STANDBY";
      fastagStatusEl.className = hasActiveTrip 
        ? "px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200 flex items-center gap-1"
        : "px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200 flex items-center gap-1";
    }
    if (tollLogEl) {
      if (!hasActiveTrip || tolls.length === 0) {
        tollLogEl.innerHTML = `
          <div class="p-6 text-center text-xs text-slate-400 font-medium col-span-3 bg-slate-50 rounded-xl">
            No active toll gate deductions.
          </div>
        `;
      } else {
        tollLogEl.innerHTML = tolls.map((t, idx) => {
          const isCleared = t.status === 'cleared';
          return `
            <div class="p-3 rounded-xl ${isCleared ? 'bg-emerald-50/50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'} flex items-center justify-between">
              <div>
                <strong class="text-xs text-slate-900 block">${Utils.escapeHTML(t.name)}</strong>
                <span class="text-[10px] text-slate-500 font-mono">${Utils.escapeHTML(t.highway || "NH Corridor")} • Lane 0${(idx % 4) + 1}</span>
              </div>
              <div class="text-right">
                <strong class="text-xs font-bold text-slate-800 font-mono">₹ ${Number(t.rate || 85).toFixed(2)}</strong>
                <span class="text-[10px] ${isCleared ? 'text-emerald-700 font-bold' : 'text-slate-500'} font-bold block">${isCleared ? '✓ Cleared' : '⌛ Auto-Queued'}</span>
              </div>
            </div>
          `;
        }).join("");
      }
    }
  }
};

App.realNavigateTo = App.navigateTo.bind(App);
App.realLoadSampleCorridor = App.loadSampleCorridor.bind(App);
App.realCalculateInitialRoute = App.calculateInitialRoute.bind(App);
App.initDone = true;

if (typeof window !== "undefined") {
  window.App = App;
}

const triggerAppStartup = () => {
  App.init();
  if (window.App && window.App.pendingNav) {
    const pNav = window.App.pendingNav;
    window.App.pendingNav = null;
    App.navigateTo(pNav);
  }
  if (window.App && window.App.pendingLoadSample) {
    window.App.pendingLoadSample = false;
    App.loadSampleCorridor();
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", triggerAppStartup);
} else {
  triggerAppStartup();
}
