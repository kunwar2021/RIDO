// Safe Leaflet Fallback if Leaflet CDN is delayed or blocked
if (typeof window !== "undefined" && typeof window.L === "undefined") {
  window.L = {
    map: () => ({ setView: function() { return this; }, addTo: function() { return this; }, removeLayer: function() {}, invalidateSize: function() {}, fitBounds: function() {}, remove: function() {} }),
    tileLayer: () => ({ addTo: function() { return this; } }),
    layerGroup: () => ({ addTo: function() { return this; }, clearLayers: function() {} }),
    polyline: () => ({ addTo: function() { return this; } }),
    marker: () => ({ addTo: function() { return this; }, setLatLng: function() { return this; }, bindPopup: function() { return this; } }),
    divIcon: () => ({}),
    latLngBounds: () => ({ extend: function() {}, isValid: function() { return false; } })
  };
}

// Regional Indian Freight Fleet Metadata
const FLEET_REGISTRATIONS = {
  "TRK-NATIONAL-01": { regNo: "RJ 14 GA 1234", driver: "Rajinder Singh", mobile: "+91 98765 43210", category: "National Freight" },
  "TRK-NATIONAL-02": { regNo: "MH 04 AZ 5678", driver: "Venkatesh Rao", mobile: "+91 98765 00002", category: "National Freight" },
  "TRK-INTERCITY-03": { regNo: "RJ 14 EB 3412", driver: "Manoj Yadav", mobile: "+91 98765 00003", category: "Inter-City Fleet" },
  "EV-VAN-INTER-04": { regNo: "DL 1E C 8890", driver: "Karthik Nair", mobile: "+91 98765 00004", category: "EV Green Fleet" },
  "TRK-EXPRESS-05": { regNo: "PB 10 XX 7821", driver: "Jaswinder Brar", mobile: "+91 98765 00005", category: "Express Cargo" },
  "AUTO-CARGO-06": { regNo: "GJ 01 EV 4521", driver: "Pradeep Joshi", mobile: "+91 98765 00006", category: "Urban EV 3W" }
};

// Regional Indian Freight Corridors for Multi-Fleet Simulation
const REGIONAL_FLEET_CORRIDORS = {
  "TRK-NATIONAL-02": {
    name: "Western Freight Corridor (Mumbai ➔ Ahmedabad)",
    driver: "Venkatesh Rao",
    status: "🟢 ON ROUTE",
    speedBase: 64,
    points: [
      [19.2812, 73.0483], // Bhiwandi / Mumbai
      [19.9820, 72.8810], // Charoti Border
      [21.1702, 72.8311], // Surat Highway Hub
      [21.7051, 72.9959], // Ankleshwar / Bharuch
      [22.3072, 73.1812], // Vadodara Bypass
      [22.9868, 72.3813]  // Sanand / Ahmedabad
    ],
    phaseOffset: 0.38,
    speedRatio: 0.92,
    checkpoints: ["Bhiwandi Gateway", "Surat Logistics Hub", "Vadodara Terminal", "Sanand GIDC Base"]
  },
  "TRK-INTERCITY-03": {
    name: "Rajasthan-NCR Intercity Corridor (Jaipur ➔ Delhi)",
    driver: "Manoj Yadav",
    status: "🟢 ON ROUTE",
    speedBase: 61,
    points: [
      [26.7824, 75.8284], // Jaipur Sitapura
      [27.2915, 75.9520], // Manoharpur Plaza
      [27.9880, 76.3860], // Neemrana Japanese Zone
      [28.3540, 76.9380], // Manesar Auto Hub
      [28.5355, 77.2631]  // Delhi Okhla Depot
    ],
    phaseOffset: 0.65,
    speedRatio: 1.05,
    checkpoints: ["Jaipur Sitapura", "Neemrana Hub", "IMT Manesar", "Delhi Central Hub"]
  },
  "EV-VAN-INTER-04": {
    name: "Delhi-NCR Green Logistics Ring",
    driver: "Karthik Nair",
    status: "⚡ ON ROUTE (EV)",
    speedBase: 52,
    points: [
      [28.5355, 77.2631], // Okhla Industrial
      [28.5708, 77.3271], // Noida Sector 18
      [28.6280, 77.3649], // Noida Sector 62
      [28.6315, 77.2167], // Connaught Place
      [28.5921, 77.0460], // Dwarka Express Terminal
      [28.4950, 77.0895], // DLF Cyber City
      [28.5355, 77.2631]  // Return to Okhla
    ],
    phaseOffset: 0.15,
    speedRatio: 0.85,
    checkpoints: ["Okhla Phase-III", "Noida Sec 62", "Connaught Place", "Dwarka Hub"]
  },
  "TRK-EXPRESS-05": {
    name: "GT Road Northern Corridor (Delhi ➔ Ludhiana)",
    driver: "Jaswinder Brar",
    status: "🟠 ON ROUTE (Low Fuel Refill)",
    speedBase: 58,
    points: [
      [28.8740, 77.1260], // Sonipat Kundli
      [29.3909, 76.9635], // Panipat Textile Hub
      [29.6857, 76.9905], // Karnal GT Road
      [30.3610, 76.8400], // Ambala Cantt
      [30.4839, 76.5939], // Rajpura Focal Point
      [30.9010, 75.8573]  // Ludhiana Central Hub
    ],
    phaseOffset: 0.52,
    speedRatio: 0.78,
    checkpoints: ["Kundli KMP", "Panipat Cargo Base", "Ambala Junction", "Ludhiana Central"]
  },
  "AUTO-CARGO-06": {
    name: "Ahmedabad-Gandhinagar EV Corridor",
    driver: "Pradeep Joshi",
    status: "⚡ ON ROUTE (EV)",
    speedBase: 38,
    points: [
      [22.9868, 72.3813], // Sanand GIDC
      [23.0225, 72.5714], // Ahmedabad Central
      [23.0750, 72.5250], // SG Highway Hub
      [23.2156, 72.6369], // Gandhinagar InfoCity
      [22.9868, 72.3813]  // Return Sanand
    ],
    phaseOffset: 0.82,
    speedRatio: 0.70,
    checkpoints: ["Sanand GIDC Base", "Ahmedabad Central", "SG Highway", "Gandhinagar InfoCity"]
  }
};

const MapEngine = {
  state: {
    leafletMap: null,
    tileLayers: {},
    currentStyle: "streets",
    trafficActive: false,
    multiFleetActive: false,
    markersGroup: null,
    routesGroup: null,
    fleetGroup: null,
    tollGroup: null,
    trafficGroup: null,
    simMarker: null,
    roadCoordinates: [],
    roadWaypoints: [],
    cumDist: [],
    totalDistKm: 0,
    animating: false,
    paused: false,
    simProgress: 0, // 0.0 to 1.0
    simSpeedMultiplier: 1,
    animFrameId: null,
    lastTimestamp: null,
    fleetMarkers: {},
    fleetData: {},
    checkpoints: []
  },

  /**
   * Initializes the Leaflet map instance and configures tile layers.
   */
  init(containerId = "interactive-fleet-map") {
    if (typeof L === "undefined") {
      console.warn("[MapEngine] Leaflet library (L) not loaded yet. Skipping map init.");
      return;
    }
    let mapContainer = document.getElementById(containerId);
    if ((!mapContainer || mapContainer.offsetWidth === 0) && document.getElementById("ops-center-map")) {
      const opsContainer = document.getElementById("ops-center-map");
      if (opsContainer && opsContainer.offsetWidth > 0) {
        containerId = "ops-center-map";
        mapContainer = opsContainer;
      }
    }
    if (!mapContainer || this.state.leafletMap) return;

    try {
      this.state.leafletMap = L.map(containerId, {
        zoomControl: true,
        attributionControl: true
      }).setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);

      // Google Maps Tile Layer Definitions
      const streetsLayer = L.tileLayer(CONFIG.MAP.TILES.STREETS.URL, {
        attribution: CONFIG.MAP.TILES.STREETS.ATTRIBUTION,
        subdomains: CONFIG.MAP.TILES.STREETS.SUBDOMAINS || ["mt0", "mt1", "mt2", "mt3"],
        maxZoom: 20
      });

      const satelliteLayer = L.tileLayer(CONFIG.MAP.TILES.SATELLITE.URL, {
        attribution: CONFIG.MAP.TILES.SATELLITE.ATTRIBUTION,
        subdomains: CONFIG.MAP.TILES.SATELLITE.SUBDOMAINS || ["mt0", "mt1", "mt2", "mt3"],
        maxZoom: 20
      });

      const terrainLayer = L.tileLayer(CONFIG.MAP.TILES.TERRAIN ? CONFIG.MAP.TILES.TERRAIN.URL : "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", {
        attribution: CONFIG.MAP.TILES.TERRAIN ? CONFIG.MAP.TILES.TERRAIN.ATTRIBUTION : '&copy; Google Maps Terrain',
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        maxZoom: 20
      });

      const darkLayer = L.tileLayer(CONFIG.MAP.TILES.DARK.URL, {
        attribution: CONFIG.MAP.TILES.DARK.ATTRIBUTION,
        subdomains: CONFIG.MAP.TILES.DARK.SUBDOMAINS || ["a", "b", "c", "d"],
        maxZoom: 19
      });

      this.state.tileLayers = {
        streets: streetsLayer,
        satellite: satelliteLayer,
        terrain: terrainLayer,
        dark: darkLayer
      };

      streetsLayer.addTo(this.state.leafletMap);

      // Layer Groups for clean redraws
      this.state.routesGroup = L.layerGroup().addTo(this.state.leafletMap);
      this.state.trafficGroup = L.layerGroup().addTo(this.state.leafletMap);
      this.state.tollGroup = L.layerGroup().addTo(this.state.leafletMap);
      this.state.fuelGroup = L.layerGroup().addTo(this.state.leafletMap);
      this.state.fleetGroup = L.layerGroup().addTo(this.state.leafletMap);
      this.state.markersGroup = L.layerGroup().addTo(this.state.leafletMap);

      this.bindMapControls();

      setTimeout(() => {
        this.state.leafletMap?.invalidateSize();
      }, 100);
    } catch (e) {
      console.error("[RIDO Map] Failed to initialize Leaflet map:", e);
    }
  },

  /**
   * Initializes dedicated Leaflet map in the Operations View (#ops-center-map)
   */
  initOpsCenterMap() { if (typeof L === 'undefined') return;
    const container = document.getElementById("ops-center-map");
    if (!container) return;

    if (this.state.opsMap) {
      setTimeout(() => {
        try {
          this.state.opsMap.invalidateSize();
        } catch (e) {}
      }, 150);
      return;
    }

    try {
      const opsMap = L.map("ops-center-map", {
        zoomControl: false,
        attributionControl: false
      }).setView([30.1000, 76.5000], 8);

      L.tileLayer(CONFIG.MAP.TILES.STREETS.URL, {
        maxZoom: 18,
        subdomains: "abc"
      }).addTo(opsMap);

      this.state.opsMap = opsMap;

      // No demo route — clean map on initial load
      setTimeout(() => {
        try {
          opsMap.invalidateSize();
        } catch (err) {}
      }, 250);

    } catch (e) {
      console.error("[RIDO Map] Ops map initialization error:", e);
    }
  },

  /**
   * Initializes mini route map in Driver Dashboard (#driver-dash-map)
   */
  initDriverDashMap() {
    if (typeof L === 'undefined') return;
    const container = document.getElementById("driver-dash-map");
    if (!container) return;

    if (this.state.driverDashMap) {
      setTimeout(() => {
        try {
          this.state.driverDashMap.invalidateSize();
          const activeTrip = (typeof StorageEngine !== 'undefined' && StorageEngine.loadActiveTrip) ? StorageEngine.loadActiveTrip() : null;
          if (activeTrip && activeTrip.coordinates && Array.isArray(activeTrip.coordinates) && activeTrip.coordinates.length > 1) {
            if (this._driverDashRouteGroup) this._driverDashRouteGroup.clearLayers();
            else this._driverDashRouteGroup = L.layerGroup().addTo(this.state.driverDashMap);

            const coords = activeTrip.coordinates;
            const poly = L.polyline(coords, {
              color: "#ea580c",
              weight: 4,
              opacity: 0.9,
              lineCap: "round"
            }).addTo(this._driverDashRouteGroup);

            const createPin = (bg, text) => L.divIcon({
              className: "custom-corridor-pin",
              html: `<div style="background:${bg}; width:20px; height:20px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:10px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${text}</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });

            L.marker(coords[0], { icon: createPin("#0f9d58", "A") }).addTo(this._driverDashRouteGroup);
            L.marker(coords[coords.length - 1], { icon: createPin("#ea4335", "B") }).addTo(this._driverDashRouteGroup);

            this.state.driverDashMap.fitBounds(poly.getBounds(), { padding: [25, 25] });
          }
        } catch (e) {}
      }, 150);
      return;
    }

    try {
      const dMap = L.map("driver-dash-map", {
        zoomControl: false,
        attributionControl: false
      }).setView([20.5937, 78.9629], 5);

      L.tileLayer(CONFIG.MAP.TILES.STREETS.URL, {
        maxZoom: 20,
        subdomains: CONFIG.MAP.TILES.STREETS.SUBDOMAINS || ["mt0", "mt1", "mt2", "mt3"]
      }).addTo(dMap);

      this.state.driverDashMap = dMap;
      this._driverDashRouteGroup = L.layerGroup().addTo(dMap);

      const activeTrip = (typeof StorageEngine !== 'undefined' && StorageEngine.loadActiveTrip) ? StorageEngine.loadActiveTrip() : null;
      if (activeTrip && activeTrip.coordinates && Array.isArray(activeTrip.coordinates) && activeTrip.coordinates.length > 1) {
        const coords = activeTrip.coordinates;
        const poly = L.polyline(coords, {
          color: "#ea580c",
          weight: 4,
          opacity: 0.9,
          lineCap: "round"
        }).addTo(this._driverDashRouteGroup);

        const createPin = (bg, text) => L.divIcon({
          className: "custom-corridor-pin",
          html: `<div style="background:${bg}; width:20px; height:20px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:10px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${text}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        L.marker(coords[0], { icon: createPin("#0f9d58", "A") }).addTo(this._driverDashRouteGroup);
        L.marker(coords[coords.length - 1], { icon: createPin("#ea4335", "B") }).addTo(this._driverDashRouteGroup);

        try {
          dMap.fitBounds(poly.getBounds(), { padding: [25, 25] });
        } catch (err) {}
      }

      setTimeout(() => {
        try { dMap.invalidateSize(); } catch (err) {}
      }, 250);
    } catch (e) {
      console.error("[RIDO Map] Driver dash map initialization error:", e);
    }
  },

  // --------------------------------------------------------------------------
  // Map Controls & Layer Switcher
  // --------------------------------------------------------------------------
  bindMapControls() {
    // Tile Style Switcher
    document.querySelectorAll(".style-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const style = btn.dataset.style;
        this.switchStyle(style);
      });
    });

    // Traffic Toggle
    document.getElementById("map-btn-traffic")?.addEventListener("click", () => this.toggleTraffic());

    // Multi-Fleet Toggle
    document.getElementById("map-btn-multi-fleet")?.addEventListener("click", () => this.toggleMultiFleet());

    // Recalculate
    document.getElementById("map-btn-recalc")?.addEventListener("click", () => {
      window.App?.runFullCoOptimization?.();
    });

    // Reset View / Fit Bounds
    document.getElementById("map-btn-fit")?.addEventListener("click", () => this.fitBounds());

    // Simulator Triggers
    document.getElementById("btn-start-navigation")?.addEventListener("click", () => this.startNavigationSimulation());
    document.getElementById("btn-simulate-trip")?.addEventListener("click", () => {
      if (this.state.animating && this.state.paused) {
        this.resumeNavigationSimulation();
      } else if (this.state.animating) {
        this.pauseNavigationSimulation();
      } else {
        this.startNavigationSimulation();
      }
    });
    document.getElementById("btn-pause-sim")?.addEventListener("click", () => this.togglePauseSimulation());
    document.getElementById("btn-stop-sim")?.addEventListener("click", () => this.stopNavigationSimulation());

    // Speed multiplier buttons
    document.querySelectorAll(".btn-spd").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".btn-spd").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.state.simSpeedMultiplier = Number(e.currentTarget.dataset.spd) || 1;
      });
    });
  },

  setStyle(styleName) { this.switchStyle(styleName); },
  switchStyle(styleName) { if (typeof L === 'undefined') return;
    if (!this.state.tileLayers[styleName] || styleName === this.state.currentStyle) return;

    this.state.leafletMap.removeLayer(this.state.tileLayers[this.state.currentStyle]);
    this.state.tileLayers[styleName].addTo(this.state.leafletMap);
    this.state.currentStyle = styleName;

    document.querySelectorAll(".style-pill").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.style === styleName);
    });
  },

  toggleTraffic() { if (typeof L === 'undefined') return;
    this.state.trafficActive = !this.state.trafficActive;
    const btn = document.getElementById("map-btn-traffic");
    const badge = document.getElementById("traffic-overlay-badge");
    if (btn) btn.classList.toggle("active", this.state.trafficActive);
    if (badge) badge.classList.toggle("hidden", !this.state.trafficActive);

    this.renderTrafficSegments();
    window.App?.showToast(
      this.state.trafficActive ? "Real-Time Traffic Layer Activated" : "Traffic Layer Disabled",
      "info"
    );
  },

  toggleMultiFleet() { if (typeof L === 'undefined') return;
    this.state.multiFleetActive = !this.state.multiFleetActive;
    const btn = document.getElementById("map-btn-multi-fleet");
    if (btn) btn.classList.toggle("active", this.state.multiFleetActive);
    
    if (this.state.multiFleetActive) {
      const startDepot = window.App?.getStartDepot?.();
      const endDepot = window.App?.getEndDepot?.(startDepot);
      const optStops = window.App?.optimizerState?.optimizedSequence;
      const vehicle = window.App?.data?.vehicles?.find((v) => v.id === window.App?.optimizerState?.selectedVehicleId);
      this.renderMultiFleetOnRoute(startDepot, endDepot, optStops, vehicle);
    } else {
      if (this.state.fleetGroup) this.state.fleetGroup.clearLayers();
    }

    window.App?.showToast(
      this.state.multiFleetActive ? "Multi-Fleet Live Corridor Deployment Active" : "Multi-Fleet Map Layer Hidden",
      "info"
    );
  },

  renderTrafficSegments() { if (typeof L === 'undefined') return;
    this.state.trafficGroup.clearLayers();
    if (!this.state.trafficActive || !this.state.roadCoordinates || this.state.roadCoordinates.length < 10) return;

    const coords = this.state.roadCoordinates;
    const chunk = Math.floor(coords.length / 3);

    // Green -> Smooth Traffic
    L.polyline(coords.slice(0, chunk + 1), { color: "#10b981", weight: 6, opacity: 0.8 }).addTo(this.state.trafficGroup);
    // Orange -> Moderate Congestion
    L.polyline(coords.slice(chunk, chunk * 2 + 1), { color: "#f59e0b", weight: 6, opacity: 0.85 }).addTo(this.state.trafficGroup);
    // Red -> Heavy Congestion
    L.polyline(coords.slice(chunk * 2), { color: "#ef4444", weight: 6, opacity: 0.9 }).addTo(this.state.trafficGroup);
  },



  // --------------------------------------------------------------------------
  // Distance Precomputation & Continuous Path Interpolation
  // --------------------------------------------------------------------------
  precomputePathDistances(coords) {
    if (!coords || coords.length < 2) return { cumDist: [0], totalDist: 0 };
    const cumDist = [0];
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const d = Utils.haversineDistance(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1]);
      total += d;
      cumDist.push(total);
    }
    return { cumDist, totalDist: total };
  },

  getInterpolatedPosition(coords, cumDist, totalDist, progress) {
    if (!coords || coords.length === 0) return [28.6139, 77.2090];
    if (coords.length === 1 || progress <= 0) return coords[0];
    if (progress >= 1) return coords[coords.length - 1];

    const targetD = progress * totalDist;
    let i = 0;
    for (let k = 0; k < cumDist.length - 1; k++) {
      if (cumDist[k] <= targetD && targetD <= cumDist[k + 1]) {
        i = k;
        break;
      }
    }
    const segLen = cumDist[i + 1] - cumDist[i];
    const t = segLen > 0 ? (targetD - cumDist[i]) / segLen : 0;
    const lat = coords[i][0] + t * (coords[i + 1][0] - coords[i][0]);
    const lng = coords[i][1] + t * (coords[i + 1][1] - coords[i][1]);
    return [lat, lng];
  },

  // --------------------------------------------------------------------------
  // Live Multi-Fleet Vehicle Deployment: Active Corridor + Regional Network Nodes
  // --------------------------------------------------------------------------
  renderMultiFleetOnRoute(startDepot, endDepot, optStops, assignedVehicle) {
    if (typeof L === 'undefined') return;
    if (!this.state.fleetGroup) return;
    this.state.fleetGroup.clearLayers();
    this.state.fleetMarkers = {};

    if (!this.state.multiFleetActive || !startDepot) return;

    const vehicles = window.App?.data?.vehicles || PAN_INDIA_DATASETS?.all_india?.vehicles || [];
    if (!vehicles.length) return;

    const selectedVehId = assignedVehicle?.id || window.App?.optimizerState?.selectedVehicleId || "TRK-NATIONAL-01";
    const isDriver = window.App?.userSession?.role === "driver";

    vehicles.forEach((veh, idx) => {
      if (veh.id === selectedVehId) return; // Lead vehicle is animated cleanly via simMarker
      if (isDriver) return; // Driver only sees their own assigned vehicle

      const corridor = REGIONAL_FLEET_CORRIDORS[veh.id];
      if (!corridor || !corridor.points || corridor.points.length === 0) return;

      const isEV = veh.powertrain === "Electric (EV)";
      const meta = FLEET_REGISTRATIONS[veh.id] || { regNo: "IND " + veh.id, driver: veh.driver || "Rajinder Singh" };

      const cDist = this.precomputePathDistances(corridor.points);
      const initialP = (corridor.phaseOffset + (this.state.simProgress * (corridor.speedRatio || 1))) % 1.0;
      const pos = this.getInterpolatedPosition(corridor.points, cDist.cumDist, cDist.totalDist, initialP);

      let nodeClass = isEV ? "ev-node" : ((veh.category || "").includes("Express") ? "express-node" : "");

      const pinIcon = L.divIcon({
        className: "custom-fleet-node-pin",
        html: `
          <div class="fleet-network-node-pin ${nodeClass}" id="fleet-bubble-${veh.id}" title="${Utils.escapeHTML(veh.name)} (${meta.regNo})">
            <span>${veh.icon || (isEV ? "⚡" : "🚚")}</span>
            <span class="fleet-node-badge-label">${Utils.escapeHTML(meta.regNo.split(" ")[0] + " " + meta.regNo.split(" ")[1])}</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker(pos, { 
        icon: pinIcon,
        zIndexOffset: 200 + idx * 30
      }).addTo(this.state.fleetGroup);

      this.state.fleetMarkers[veh.id] = marker;
      this.attachVehiclePopup(marker, veh, meta, false);
    });
  },

  /**
   * Attaches rich compact telemetry popup to vehicle markers
   */
  attachVehiclePopup(marker, veh, meta, isSelected) {
    const isEV = veh.powertrain === "Electric (EV)";
    const corridor = REGIONAL_FLEET_CORRIDORS[veh.id];
    const curSpeed = isSelected ? Math.round(62 + Math.sin((this.state.simProgress || 0) * 35) * 4) : (corridor ? corridor.speedBase : 58);
    const curFuel = isSelected ? Math.max(20, Math.round(88 - ((this.state.simProgress || 0) * 22))) : (veh.fuelLevel || 84);
    const curLocation = isSelected 
      ? (this.state.checkpoints[0]?.name || "Delhi NCR Logistics Hub")
      : (corridor ? corridor.checkpoints[0] : "Regional Freight Hub");
    const nextStop = isSelected
      ? (this.state.checkpoints[1]?.name || "Jaipur Distribution Hub")
      : (corridor ? corridor.checkpoints[1] || "Destination Terminal" : "En-route Corridor");
    const remDist = isSelected
      ? Math.max(0, Math.round((this.state.totalDistKm || 1191) * (1 - (this.state.simProgress || 0))))
      : (corridor ? Math.round(corridor.speedBase * 4.5) : 320);

    const etaDate = new Date(Date.now() + (remDist / Math.max(30, curSpeed)) * 3600 * 1000);
    const etaFormatted = etaDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    marker.bindPopup(`
      <div class="gmap-popup-card" style="min-width: 240px; padding: 10px 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
          <span class="gmap-popup-badge" style="background: rgba(234, 88, 12, 0.15); color: #ea580c; font-weight: 800; font-size: 10px;">VEHICLE TELEMETRY</span>
          <span style="font-family: var(--font-mono, monospace); font-size: 10px; font-weight: 800; color: #10b981;">🟢 ON ROUTE</span>
        </div>
        
        <h4 style="margin: 0 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">${Utils.escapeHTML(veh.name)}</h4>
        <div style="font-size: 11px; font-weight: 800; color: #ea580c; font-family: var(--font-mono, monospace); margin-bottom: 6px;">
          ${Utils.escapeHTML(meta.regNo)} <span style="color: #64748b; font-weight: 600;">(${Utils.escapeHTML(veh.id)})</span>
        </div>

        <div class="gmap-popup-row" style="font-size: 11px; margin-bottom: 3px;">
          <span style="color: #64748b;">Assigned Driver:</span>
          <strong style="color: #0f172a;">${Utils.escapeHTML(veh.driver || meta.driver || "Rajinder Singh")}</strong>
        </div>
        <div class="gmap-popup-row" style="font-size: 11px; margin-bottom: 3px;">
          <span style="color: #64748b;">Current Location:</span>
          <strong style="color: #0f172a;">${Utils.escapeHTML(curLocation)}</strong>
        </div>
        <div class="gmap-popup-row" style="font-size: 11px; margin-bottom: 3px;">
          <span style="color: #64748b;">Next Stop:</span>
          <strong style="color: #2563eb;">${Utils.escapeHTML(nextStop)}</strong>
        </div>
        <div class="gmap-popup-row" style="font-size: 11px; margin-bottom: 3px;">
          <span style="color: #64748b;">Cruising Speed:</span>
          <strong style="color: #0f172a;">${curSpeed} km/h</strong>
        </div>
        <div class="gmap-popup-row" style="font-size: 11px; margin-bottom: 3px;">
          <span style="color: #64748b;">${isEV ? "Battery Charge" : "Fuel Level"}:</span>
          <strong style="color: ${curFuel < 30 ? '#ef4444' : '#10b981'};">${curFuel}%</strong>
        </div>
        <div class="gmap-popup-row" style="font-size: 11px; margin-bottom: 3px;">
          <span style="color: #64748b;">Health Score:</span>
          <strong style="color: #10b981;">${veh.healthScore || 96}% HP</strong>
        </div>
        <div class="gmap-popup-row" style="font-size: 11px; margin-bottom: 3px;">
          <span style="color: #64748b;">Dynamic ETA:</span>
          <strong style="color: #059669;">${etaFormatted}</strong>
        </div>
        <div class="gmap-popup-row" style="font-size: 11px; margin-bottom: 6px;">
          <span style="color: #64748b;">Remaining Distance:</span>
          <strong style="color: #0f172a;">${remDist} km</strong>
        </div>

        ${!isSelected ? `
        <div style="margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
          <button type="button" class="btn btn-xs bg-orange-600 hover:bg-orange-700 text-white font-bold w-full py-1.5 rounded-lg cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1" onclick="App.assignVehicleAndDriver('${veh.id}', '${veh.driver || meta.driver || 'Rajinder Singh'}')">
            <span>Assign to Active Route</span>
            <span>➔</span>
          </button>
        </div>
        ` : `
        <div style="margin-top: 6px; padding: 4px 8px; background: #fff7ed; border-radius: 6px; border: 1px solid #ffedd5; text-align: center;">
          <span style="font-size: 10px; font-weight: 800; color: #c2410c;">★ Active Lead Vehicle for Current Route</span>
        </div>
        `}
      </div>
    `);
  },
  clearRoute() {
    this.stopNavigationSimulation(true);
    if (this.state.markersGroup) this.state.markersGroup.clearLayers();
    if (this.state.routesGroup) this.state.routesGroup.clearLayers();
    if (this.state.trafficGroup) this.state.trafficGroup.clearLayers();
    if (this.state.fleetGroup) this.state.fleetGroup.clearLayers();
    if (this.state.tollGroup) this.state.tollGroup.clearLayers();
    if (this.state.fuelGroup) this.state.fuelGroup.clearLayers();
    this.state.roadCoordinates = [];
    this.state.roadWaypoints = [];
    this.state.cumDist = [0];
    if (this.state.leafletMap) {
      this.state.leafletMap.setView([22.5937, 78.9629], 5);
      this.state.leafletMap.invalidateSize();
    }
  },
  renderRoute(routeResult, startDepot, endDepot, optStops, vehicle) {
    if (window.App && window.App.optimizerState) {
      window.App.optimizerState.routeResult = routeResult;
    }
    return this.renderMap(startDepot, endDepot, optStops, vehicle);
  },
  async renderMap(startDepot, endDepot, optStops, vehicle) { if (typeof L === 'undefined') return;
    if (!this.state.leafletMap) return;

    this.state.leafletMap.invalidateSize();

    startDepot = startDepot || window.App?.getStartDepot();
    endDepot = endDepot || window.App?.getEndDepot(startDepot);
    optStops = optStops || (window.App?.optimizerState?.selectedStopIds || []).map((id) => (window.App?.data?.stops || []).find((s) => s.id === id)).filter(Boolean);
    vehicle = vehicle || (window.App?.data?.vehicles || []).find((v) => v.id === window.App?.optimizerState?.selectedVehicleId) || window.App?.data?.vehicles[0];

    this.state.markersGroup.clearLayers();
    this.state.routesGroup.clearLayers();
    this.state.trafficGroup.clearLayers();
    if (this.state.fleetGroup) this.state.fleetGroup.clearLayers();
    if (this.state.tollGroup) this.state.tollGroup.clearLayers();
    if (this.state.fuelGroup) this.state.fuelGroup.clearLayers();

    const routeResult = window.App?.optimizerState?.routeResult;
    const routeCalculated = !!(routeResult && routeResult.coordinates && routeResult.coordinates.length > 1);
    const hasOrigin = !!(startDepot && Number.isFinite(Number(startDepot.lat)) && Number.isFinite(Number(startDepot.lng)));
    const hasDest = !!(endDepot && Number.isFinite(Number(endDepot.lat)) && Number.isFinite(Number(endDepot.lng)));

    const placeholder = document.getElementById("map-placeholder-overlay");
    const simHud = document.getElementById("sim-hud");

    if (!hasOrigin || !hasDest || !routeCalculated) {
      this.stopNavigationSimulation(true);
      this.state.roadCoordinates = [];
      this.state.roadWaypoints = [];
      this.state.cumDist = [0];
      if (placeholder) placeholder.classList.remove("hidden");
      if (simHud) simHud.classList.add("hidden");
      this.fitBounds();
      return;
    }

    if (placeholder) placeholder.classList.add("hidden");
    if (simHud) simHud.classList.remove("hidden");

    // 1. Collect Valid Route Waypoints
    const routeWaypoints = [];
    if (startDepot && Number.isFinite(Number(startDepot.lat)) && Number.isFinite(Number(startDepot.lng))) {
      routeWaypoints.push({ ...startDepot, lat: Number(startDepot.lat), lng: Number(startDepot.lng), label: startDepot.name });
    }
    (optStops || []).forEach((s, idx) => {
      if (s && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng))) {
        const lbl = s.name || s.customer || `Stop ${idx + 1}`;
        routeWaypoints.push({ ...s, lat: Number(s.lat), lng: Number(s.lng), label: lbl, customer: lbl });
      }
    });
    if (endDepot && Number.isFinite(Number(endDepot.lat)) && Number.isFinite(Number(endDepot.lng))) {
      const distFromStart = startDepot
        ? Math.hypot(
            Number(endDepot.lat) - Number(startDepot.lat),
            Number(endDepot.lng) - Number(startDepot.lng)
          )
        : 999;
      if ((optStops && optStops.length > 0) || distFromStart > 0.001) {
        routeWaypoints.push({ ...endDepot, lat: Number(endDepot.lat), lng: Number(endDepot.lng), label: endDepot.name });
      }
    }

    this.state.roadWaypoints = routeWaypoints;
    this.state.checkpoints = routeWaypoints.map((wp) => ({
      name: wp.label || wp.customer || wp.name || "Waypoint",
      lat: wp.lat,
      lng: wp.lng
    }));

    // 2. Determine Coordinates (from routeResult if calculated, otherwise instant Haversine corridor)
    let coords = (routeResult && routeResult.coordinates && routeResult.coordinates.length > 1)
      ? routeResult.coordinates
      : ApiClient.generateInterpolatedHaversineRoute(routeWaypoints);

    this.state.roadCoordinates = coords;
    this.drawRoutePolyline(coords);

    const { cumDist, totalDist } = this.precomputePathDistances(coords);
    this.state.cumDist = cumDist;
    this.state.totalDistKm = (routeResult && routeResult.distanceKm > 0) ? routeResult.distanceKm : totalDist;

    // 3. Render FASTag Toll Plazas
    if (routeResult && routeResult.tolls && routeResult.tolls.length > 0) {
      this.renderTollPlazaMarkers(routeResult.tolls);
    }

    // 4. Render Fuel Stations
    if (routeResult && routeResult.fuelStations && routeResult.fuelStations.length > 0) {
      this.renderFuelStationMarkers(routeResult.fuelStations);
    }

    // 5. Render Traffic Segments (if Traffic toggle is ON)
    if (this.state.showTrafficLayer) {
      this.renderTrafficLayerSegments(coords);
    }

    // 4. Place Origin Marker [A]
    if (startDepot && Number.isFinite(Number(startDepot.lat)) && Number.isFinite(Number(startDepot.lng))) {
      const originIcon = L.divIcon({
        className: "custom-depot-pin origin-pin",
        html: `<div class="gmarker-pin depot-marker origin-marker" title="Origin Hub [A]">A</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const origMarker = L.marker([startDepot.lat, startDepot.lng], { icon: originIcon }).addTo(
        this.state.markersGroup
      );
      origMarker.bindPopup(`
        <div class="gmap-popup-card">
          <span class="gmap-popup-badge" style="background: rgba(234, 88, 12, 0.15); color: #ea580c;">ORIGIN FREIGHT HUB [A]</span>
          <h4>${Utils.escapeHTML(startDepot.name)}</h4>
          <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem;">${Utils.escapeHTML(startDepot.address || '')}</p>
          <div class="gmap-popup-row"><span>GPS:</span> <strong>${Number(startDepot.lat).toFixed(4)}° N, ${Number(startDepot.lng).toFixed(4)}° E</strong></div>
          <div class="gmap-popup-row"><span>Assigned Vehicle:</span> <strong>${vehicle ? Utils.escapeHTML(vehicle.name) : "Primary Fleet Unit"}</strong></div>
        </div>
      `);
    }

    // 5. Place Destination Marker [B]
    if (
      endDepot &&
      Number.isFinite(Number(endDepot.lat)) &&
      Number.isFinite(Number(endDepot.lng)) &&
      (!startDepot || endDepot.lat !== startDepot.lat || endDepot.lng !== startDepot.lng)
    ) {
      const destIcon = L.divIcon({
        className: "custom-depot-pin dest-pin",
        html: `<div class="gmarker-pin depot-marker dest-marker" title="Destination Hub [B]">B</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const destMarker = L.marker([endDepot.lat, endDepot.lng], { icon: destIcon }).addTo(
        this.state.markersGroup
      );
      destMarker.bindPopup(`
        <div class="gmap-popup-card">
          <span class="gmap-popup-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">DESTINATION DROP-OFF HUB [B]</span>
          <h4>${Utils.escapeHTML(endDepot.name)}</h4>
          <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem;">${Utils.escapeHTML(endDepot.address || '')}</p>
          <div class="gmap-popup-row"><span>GPS:</span> <strong>${Number(endDepot.lat).toFixed(4)}° N, ${Number(endDepot.lng).toFixed(4)}° E</strong></div>
        </div>
      `);
    }

    // 6. Place Intermediate Delivery Stop Pins
    (optStops || []).forEach((stop, index) => {
      if (!stop || !Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lng))) return;
      const prio = stop.priority || "Standard";
      let pinClass = "stop-normal";
      let prioColor = "#f97316";
      if (prio === "Urgent") {
        pinClass = "stop-urgent";
        prioColor = "#ef4444";
      } else if (prio === "High") {
        pinClass = "stop-high";
        prioColor = "#f59e0b";
      }

      const stopIcon = L.divIcon({
        className: `custom-stop-pin ${pinClass}`,
        html: `<div class="gmarker-pin ${pinClass}">${index + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(this.state.markersGroup);
      marker.bindPopup(`
        <div class="gmap-popup-card">
          <span class="gmap-popup-badge" style="background: rgba(249, 115, 22, 0.15); color: #ea580c;">INTERMEDIATE STOP #${index + 1}</span>
          <h4>${Utils.escapeHTML(stop.name || stop.customer || `Waypoint #${index + 1}`)}</h4>
          <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem;">${Utils.escapeHTML(stop.address || '')}</p>
          <div class="gmap-popup-row"><span>GPS:</span> <strong>${Number(stop.lat).toFixed(4)}° N, ${Number(stop.lng).toFixed(4)}° E</strong></div>
          <div class="gmap-popup-row"><span>Payload Weight:</span> <strong>${stop.weight || 150} kg</strong></div>
        </div>
      `);
    });

    // 7. Place Multi-Fleet Vehicle Pins Along Specific Route (if enabled)
    if (this.state.multiFleetActive) {
      this.renderMultiFleetOnRoute(startDepot, endDepot, optStops, vehicle);
    }

    // 8. Place FASTag Toll Plaza Pins Along Specific Route
    if (!routeResult || !routeResult.tolls || routeResult.tolls.length === 0) {
      this.renderFastagTolls(startDepot, endDepot, optStops);
    }

    if (this.state.trafficActive) {
      this.renderTrafficSegments();
    }

    this.fitBounds();

    const hud = document.getElementById("sim-hud");
    if (hud) hud.classList.remove("hidden");
    this.updateLeadTelemetry(this.state.simProgress || 0);

    if (!this.state.animating) {
      this.startNavigationSimulation();
    }
  },

  // --------------------------------------------------------------------------
  // FASTag Toll Plazas Along Active Corridor
  // --------------------------------------------------------------------------
  renderFastagTolls(startDepot, endDepot, optStops) {
    if (!this.state.tollGroup) return;
    this.state.tollGroup.clearLayers();

    const tolls = window.PAN_INDIA_FASTAG_TOLLS || [];
    if (!tolls.length) return;

    const waypoints = this.state.roadWaypoints || [];
    const roadCoords = this.state.roadCoordinates || [];
    if (!waypoints.length) return;

    const activeTolls = tolls.filter((t) => {
      if (roadCoords.length > 0) {
        for (let i = 0; i < roadCoords.length; i += 8) {
          const d = Utils.haversineDistance(t.lat, t.lng, roadCoords[i][0], roadCoords[i][1]);
          if (d <= 25) return true;
        }
      } else {
        for (const wp of waypoints) {
          const d = Utils.haversineDistance(t.lat, t.lng, wp.lat, wp.lng);
          if (d <= 65) return true;
        }
      }
      return false;
    });

    activeTolls.forEach((toll, idx) => {
      const tollIcon = L.divIcon({
        className: "custom-fastag-toll-pin",
        html: `
          <div class="fastag-toll-marker-pin" title="${Utils.escapeHTML(toll.name)} (FASTag Commercial Rate: ₹${toll.commercialRate})">
            <span>🎫</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([toll.lat, toll.lng], {
        icon: tollIcon,
        zIndexOffset: 650 + idx * 10
      }).addTo(this.state.tollGroup);

      marker.bindPopup(`
        <div class="gmap-popup-card">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
            <span class="gmap-popup-badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 800;">NHAI FASTag ETC GATE</span>
            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #10b981;">₹${toll.commercialRate}</span>
          </div>
          <h4 style="margin: 2px 0 4px 0; font-size: 13px; font-weight: 800; color: #0f172a;">${Utils.escapeHTML(toll.name)}</h4>
          <p style="font-size: 0.72rem; color: #64748b; margin-bottom: 0.4rem;">${Utils.escapeHTML(toll.highway)} (${Utils.escapeHTML(toll.state)})</p>
          <div class="gmap-popup-row"><span>Commercial HCV Rate:</span> <strong>₹${toll.commercialRate}</strong></div>
          <div class="gmap-popup-row"><span>FASTag Auto-Debit:</span> <strong style="color: #10b981;">✓ Enabled (${Utils.escapeHTML(toll.lanes || "Lane 1-8")})</strong></div>
          <div class="gmap-popup-row"><span>Gate Clearance:</span> <strong style="color: #059669;">Non-Stop (< 45s)</strong></div>
        </div>
      `);
    });
  },

  drawRoutePolyline(coords) {
    if (!this.state.routesGroup) return;
    this.state.routesGroup.clearLayers();
    if (coords && coords.length > 1) {
      L.polyline(coords, {
        color: "#ea580c",
        weight: 9,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(this.state.routesGroup);

      L.polyline(coords, {
        color: "#f97316",
        weight: 4.5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(this.state.routesGroup);
    }
  },

  renderFuelStationMarkers(stations) {
    if (!this.state.fuelGroup) return;
    this.state.fuelGroup.clearLayers();

    (stations || []).forEach((st) => {
      const fuelIcon = L.divIcon({
        className: "custom-fuel-pin",
        html: `<div class="gmarker-pin fuel-marker" style="background: #0284c7; color: #fff; font-size: 13px; font-weight: 800; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid #fff;" title="${Utils.escapeHTML(st.name)}">⛽</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([st.lat, st.lng], { icon: fuelIcon }).addTo(this.state.fuelGroup);
      marker.bindPopup(`
        <div style="padding: 6px 8px; min-width: 180px;">
          <div style="font-size: 10px; font-weight: 800; color: #0284c7; margin-bottom: 2px;">⛽ HIGHWAY FUEL & CHARGING</div>
          <div style="font-weight: 800; font-size: 12px; color: #0f172a;">${Utils.escapeHTML(st.name)}</div>
          <div style="font-size: 11px; color: #64748b;">Brand: ${Utils.escapeHTML(st.brand || st.operator || "Independent")}</div>
          <div style="font-size: 11px; color: #059669; font-weight: 700; margin-top: 3px;">Type: ${Utils.escapeHTML(st.type || "Multi-Fuel")}</div>
          ${st.distFromRouteKm ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">Corridor Offset: ${st.distFromRouteKm} km</div>` : ""}
        </div>
      `);
    });
  },

  renderTrafficLayerSegments(coords) {
    if (!this.state.trafficGroup || !coords || coords.length < 10) return;
    this.state.trafficGroup.clearLayers();

    const segLen = Math.floor(coords.length / 5);
    const colors = ["#22c55e", "#22c55e", "#eab308", "#22c55e", "#ef4444"]; // Green free flow, Yellow moderate, Red heavy delay

    for (let i = 0; i < 5; i++) {
      const slice = coords.slice(i * segLen, Math.min(coords.length, (i + 1) * segLen + 1));
      if (slice.length > 1) {
        L.polyline(slice, {
          color: colors[i],
          weight: 6,
          opacity: 0.75,
          dashArray: i === 4 ? "8, 6" : null
        }).addTo(this.state.trafficGroup);
      }
    }
  },

  fitBounds() { if (typeof L === 'undefined') return;
    if (!this.state.leafletMap) return;

    this.state.leafletMap.invalidateSize();

    if (this.state.roadCoordinates && this.state.roadCoordinates.length > 0) {
      const validCoords = this.state.roadCoordinates.filter((pt) =>
        Array.isArray(pt) && pt.length >= 2 && Utils.isIndianCoordinate(pt[0], pt[1])
      );
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        if (bounds.isValid()) {
          this.state.leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
          return;
        }
      }
    }

    if (this.state.roadWaypoints && this.state.roadWaypoints.length > 0) {
      const validLatLngs = this.state.roadWaypoints
        .filter((wp) => Utils.isIndianCoordinate(wp.lat, wp.lng))
        .map((wp) => [Number(wp.lat), Number(wp.lng)]);

      if (validLatLngs.length > 0) {
        const bounds = L.latLngBounds(validLatLngs);
        if (bounds.isValid()) {
          this.state.leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
          return;
        }
      }
    }

    this.state.leafletMap.setView(CONFIG.MAP.DEFAULT_CENTER, 10);
  },

  // --------------------------------------------------------------------------
  // Upgraded Continuous Traversal Simulation with requestAnimationFrame
  // --------------------------------------------------------------------------
  startNavigationSimulation() { if (typeof L === 'undefined') return;
    if (!window.App?.optimizerState?.routeCalculated || !this.state.roadCoordinates || this.state.roadCoordinates.length < 2) {
      window.App?.showToast("Set your origin and destination to view live route tracking.", "warn");
      return;
    }

    // If restarting or starting fresh
    if (!this.state.animating || this.state.simProgress >= 1.0) {
      this.stopNavigationSimulation(false);
      this.state.simProgress = 0;
    }

    this.state.animating = true;
    this.state.paused = false;
    this.state.lastTimestamp = performance.now();

    const hud = document.getElementById("sim-hud");
    if (hud) hud.classList.remove("hidden");

    const btnPause = document.getElementById("btn-pause-sim");
    if (btnPause) {
      btnPause.textContent = "⏸ Pause";
      btnPause.classList.remove("btn-primary");
      btnPause.classList.add("btn-outline");
    }

    // Ensure simMarker exists on the Leaflet map
    if (!this.state.simMarker) {
      const selectedVehId = window.App?.optimizerState?.selectedVehicleId || "TRK-NATIONAL-01";
      const meta = FLEET_REGISTRATIONS[selectedVehId] || { regNo: "RJ 14 GA 1234" };
      const currentVeh = window.App?.data?.vehicles?.find((v) => v.id === selectedVehId);
      const isEV = currentVeh?.powertrain === "Electric (EV)";

      const truckIcon = L.divIcon({
        className: "sim-truck-marker-wrap",
        html: `
          <div class="fleet-vehicle-marker-bubble active-assigned ${isEV ? 'ev-unit' : 'national-unit'}" style="transform: scale(1.08);">
            <span>${isEV ? "⚡" : "🚛"}</span>
            <span>${Utils.escapeHTML(meta.regNo)}</span>
            <span class="fleet-pin-status" style="background: rgba(255,255,255,0.3); color: #fff;">● LIVE</span>
          </div>
        `,
        iconSize: [160, 36],
        iconAnchor: [80, 18]
      });

      const startPos = this.state.roadCoordinates[0];
      this.state.simMarker = L.marker(startPos, { 
        icon: truckIcon,
        zIndexOffset: 2000 
      }).addTo(this.state.leafletMap);
    }

    // Set trip in progress in shared state
    if (typeof StorageEngine !== "undefined") {
      const trip = StorageEngine.loadActiveTrip();
      if (trip) {
        trip.status = CONFIG.TRIP_STATUS.IN_PROGRESS;
        trip.updatedAt = Date.now();
        StorageEngine.saveActiveTrip(trip);
      }
    }

    // Start requestAnimationFrame loop
    if (this.state.animFrameId) cancelAnimationFrame(this.state.animFrameId);
    this.state.animFrameId = requestAnimationFrame((ts) => this.simulationStep(ts));

    window.App?.showToast("📡 Live Fleet Telemetry stream active for " + (FLEET_REGISTRATIONS[window.App?.optimizerState?.selectedVehicleId]?.regNo || "TRK-NATIONAL-01"), "info");
  },

  pauseNavigationSimulation() {
    this.state.paused = true;
    if (this.state.animFrameId) {
      cancelAnimationFrame(this.state.animFrameId);
      this.state.animFrameId = null;
    }
    const btnPause = document.getElementById("btn-pause-sim");
    if (btnPause) {
      btnPause.textContent = "▶ Resume";
      btnPause.classList.add("btn-primary");
      btnPause.classList.remove("btn-outline");
    }
    const speedGauge = document.getElementById("hud-speed-gauge");
    if (speedGauge) speedGauge.textContent = "0 km/h • ⏸ PAUSED";
  },

  resumeNavigationSimulation() {
    if (!this.state.animating) {
      this.startNavigationSimulation();
      return;
    }
    this.state.paused = false;
    this.state.lastTimestamp = performance.now();
    const btnPause = document.getElementById("btn-pause-sim");
    if (btnPause) {
      btnPause.textContent = "⏸ Pause";
      btnPause.classList.remove("btn-primary");
      btnPause.classList.add("btn-outline");
    }
    this.state.animFrameId = requestAnimationFrame((ts) => this.simulationStep(ts));
  },

  togglePauseSimulation() {
    if (this.state.simProgress >= 1.0) {
      this.startNavigationSimulation();
      return;
    }
    if (this.state.paused) {
      this.resumeNavigationSimulation();
    } else if (this.state.animating) {
      this.pauseNavigationSimulation();
    } else {
      this.startNavigationSimulation();
    }
  },

  simulationStep(timestamp) {
    if (!this.state.animating || this.state.paused) return;

    if (!this.state.lastTimestamp) this.state.lastTimestamp = timestamp;
    let dt = (timestamp - this.state.lastTimestamp) / 1000;
    this.state.lastTimestamp = timestamp;

    if (dt > 0.1) dt = 0.05; // clamp after tab switch or pause

    // Duration for full route traversal: ~32s at 1x, ~10.6s at 3x, ~4s at 8x, ~2s at 16x
    const progressRate = (1 / 32) * (this.state.simSpeedMultiplier || 1);
    this.state.simProgress += progressRate * dt;

    if (this.state.simProgress >= 1.0) {
      this.state.simProgress = 1.0;
      this.updateLeadTelemetry(1.0);
      this.completeNavigationSimulation();
      return;
    }

    // 1. Move lead vehicle marker continuously
    const coords = this.state.roadCoordinates;
    if (coords && coords.length > 0) {
      const pos = this.getInterpolatedPosition(coords, this.state.cumDist, this.state.totalDistKm, this.state.simProgress);
      if (this.state.simMarker) {
        this.state.simMarker.setLatLng(pos);
      }
    }

    // 2. Update dynamic telemetry for Lead Vehicle & HUD
    this.updateLeadTelemetry(this.state.simProgress);

    // 3. Move secondary multi-fleet vehicles along their respective regional corridors
    if (this.state.multiFleetActive) {
      this.updateSecondaryFleetUnits(this.state.simProgress);
    }

    // Request next animation frame
    this.state.animFrameId = requestAnimationFrame((ts) => this.simulationStep(ts));
  },

  updateLeadTelemetry(progress) {
    const totalDist = this.state.totalDistKm || 1191;
    const remDist = Math.max(0, Math.round(totalDist * (1 - progress)));
    const pct = Math.min(100, Math.round(progress * 100));

    // Speed fluctuation: 58-67 km/h highway cruising with smooth micro-variations
    const dynamicSpeed = progress >= 1.0 ? 0 : Math.round(62 + Math.sin(progress * 35) * 4 + Math.cos(progress * 90) * 2);

    // Fuel depletion: from 88% down proportionally
    const dynamicFuel = Math.max(18, Math.round(88 - (progress * 22)));

    // Dynamic Checkpoints (Origin -> Stops -> Destination)
    const cps = this.state.checkpoints || [];
    let currentLoc = "Departing Terminal";
    let nextStop = "Next Logistics Hub";

    if (cps.length > 0) {
      const numSegments = Math.max(1, cps.length - 1);
      const segIndex = Math.min(numSegments - 1, Math.floor(progress * numSegments));
      currentLoc = cps[segIndex]?.name || "Freight Terminal";
      nextStop = cps[Math.min(cps.length - 1, segIndex + 1)]?.name || "Final Destination";
      if (progress >= 0.98) {
        currentLoc = "Approaching " + nextStop;
      }
    }

    // Dynamic ETA calculation from remaining distance and current speed
    const remHours = remDist / Math.max(30, dynamicSpeed || 60);
    const etaDate = new Date(Date.now() + remHours * 3600 * 1000);
    const etaFormatted = progress >= 1.0 ? "Arrived" : etaDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Update HUD Elements
    const progFill = document.getElementById("hud-sim-progress-bar");
    const progVal = document.getElementById("hud-progress-val");
    const speedGauge = document.getElementById("hud-speed-gauge");
    const remDistVal = document.getElementById("hud-rem-dist");
    const curStopVal = document.getElementById("hud-current-stop");
    const etaVal = document.getElementById("hud-eta-val");
    const vehName = document.getElementById("hud-vehicle-name");

    const selectedVehId = window.App?.optimizerState?.selectedVehicleId || "TRK-NATIONAL-01";
    const meta = FLEET_REGISTRATIONS[selectedVehId] || { regNo: "RJ 14 GA 1234", driver: "Rajinder Singh" };
    const veh = window.App?.data?.vehicles?.find((v) => v.id === selectedVehId);

    if (vehName) vehName.textContent = `${meta.regNo} • ${veh?.name || "Tata Prima"} (${selectedVehId})`;
    if (progFill) progFill.style.width = `${pct}%`;
    if (progVal) progVal.textContent = `${pct}%`;
    if (remDistVal) remDistVal.textContent = `${remDist} km`;
    if (speedGauge) speedGauge.textContent = `${dynamicSpeed} km/h • ${currentLoc.slice(0, 20)}`;
    if (curStopVal) curStopVal.innerHTML = `<span style="color: #2563eb;">Next:</span> ${Utils.escapeHTML(nextStop.slice(0, 24))}`;
    if (etaVal) etaVal.textContent = etaFormatted;

    // Update Driver Dashboard Cockpit (if open)
    const driverFuel = document.getElementById("driver-cockpit-fuel");
    const driverDist = document.getElementById("driver-cockpit-dist");
    const driverEta = document.getElementById("driver-cockpit-next-eta");
    const driverStatus = document.getElementById("driver-cockpit-status");
    if (driverFuel) driverFuel.textContent = `${dynamicFuel}% Fuel`;
    if (driverDist) driverDist.textContent = `${remDist} km`;
    if (driverEta) driverEta.textContent = etaFormatted;
    if (driverStatus) driverStatus.textContent = progress >= 1.0 ? "● Completed" : "● En Route (Active)";

    // Update Driver Action Banner
    const bannerStatus = document.getElementById("driver-banner-status-badge");
    if (bannerStatus && progress < 1.0) {
      bannerStatus.textContent = "IN_PROGRESS";
      bannerStatus.className = "status-badge badge-fuel";
    }

    // Update Map Title Subtext
    const mapStatus = document.getElementById("map-route-status");
    if (mapStatus) {
      mapStatus.textContent = progress >= 1.0 
        ? "🏁 Trip Completed • Delivered at Destination Hub" 
        : `● LIVE Fleet Telemetry — ${meta.regNo} @ ${dynamicSpeed} km/h | ETA: ${etaFormatted}`;
    }
  },

  updateSecondaryFleetUnits(leadProgress) {
    const vehicles = window.App?.data?.vehicles || [];
    const selectedVehId = window.App?.optimizerState?.selectedVehicleId || "TRK-NATIONAL-01";

    vehicles.forEach((veh) => {
      if (veh.id === selectedVehId) return;
      const marker = this.state.fleetMarkers[veh.id];
      const corridor = REGIONAL_FLEET_CORRIDORS[veh.id];
      if (!marker || !corridor || !corridor.points || corridor.points.length < 2) return;

      const cDist = this.precomputePathDistances(corridor.points);
      const subProgress = (corridor.phaseOffset + (leadProgress * corridor.speedRatio)) % 1.0;
      const pos = this.getInterpolatedPosition(corridor.points, cDist.cumDist, cDist.totalDist, subProgress);
      marker.setLatLng(pos);
    });
  },

  completeNavigationSimulation() {
    this.state.animating = false;
    this.state.paused = false;
    if (this.state.animFrameId) {
      cancelAnimationFrame(this.state.animFrameId);
      this.state.animFrameId = null;
    }

    const btnPause = document.getElementById("btn-pause-sim");
    if (btnPause) {
      btnPause.textContent = "↺ Restart";
      btnPause.classList.add("btn-primary");
      btnPause.classList.remove("btn-outline");
    }

    const speedGauge = document.getElementById("hud-speed-gauge");
    if (speedGauge) speedGauge.textContent = "0 km/h • 🏁 TRIP COMPLETED";

    // Mark trip as COMPLETED in shared state
    if (typeof StorageEngine !== "undefined") {
      const trip = StorageEngine.loadActiveTrip();
      trip.status = CONFIG.TRIP_STATUS.COMPLETED;
      trip.fuelLevel = 68;
      trip.updatedAt = Date.now();
      StorageEngine.saveActiveTrip(trip);
      if (window.App) {
        window.App.renderDriverTripActionBanner();
        window.App.renderDriverSidebarCockpit();
      }
    }

    const destName = this.state.checkpoints[this.state.checkpoints.length - 1]?.name || "Mumbai Western Gateway Hub";
    window.App?.showToast(`🏁 Vehicle reached ${destName} successfully! Trip completed.`, "success");
  },

  stopNavigationSimulation(hideHud = true) {
    this.state.animating = false;
    this.state.paused = false;
    if (this.state.animFrameId) {
      cancelAnimationFrame(this.state.animFrameId);
      this.state.animFrameId = null;
    }
    if (this.state.simMarker && this.state.leafletMap) {
      this.state.leafletMap.removeLayer(this.state.simMarker);
      this.state.simMarker = null;
    }
    this.state.simProgress = 0;

    const hud = document.getElementById("sim-hud");
    if (hud && hideHud) hud.classList.add("hidden");

    const btnPause = document.getElementById("btn-pause-sim");
    if (btnPause) {
      btnPause.textContent = "⏸ Pause";
      btnPause.classList.remove("btn-primary");
      btnPause.classList.add("btn-outline");
    }

    const mapStatus = document.getElementById("map-route-status");
    if (mapStatus) mapStatus.textContent = "Real-Time Highway Routing & FASTag Feeds";
  },

  /**
   * Resets map view to Pan-India national geographic center.
   */
  resetView() {
    if (this.state.leafletMap) {
      this.state.leafletMap.setView([22.5937, 78.9629], 5);
      this.state.leafletMap.invalidateSize();
    }
  }
};

window.MapEngine = MapEngine;

