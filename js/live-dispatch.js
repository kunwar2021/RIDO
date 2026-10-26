/**
 * ==============================================================================
 * RIDO — Ola/Uber-Style Live Dispatch Tracking Engine (`live-dispatch.js`)
 * ==============================================================================
 * Handles the full Ola/Uber-inspired post-assignment experience:
 * 1. Generates a 4-digit secure Pickup OTP/PIN on dispatch
 * 2. Renders the Driver Details Card on the LEFT side of the screen
 * 3. Shows the Live Tracking Leaflet Map on the RIGHT side of the screen
 * 4. Animates the truck marker smoothly along the route polyline with real-time speed & battery
 * 5. PIN verification flow for the Driver Dashboard
 */

const LiveDispatch = {
  // State
  _active: false,
  _tripPin: null,
  _tripData: null,
  _animInterval: null,
  _routePoints: [],
  _currentPointIndex: 0,
  _liveMap: null,
  _driverMarker: null,
  _destMarker: null,
  _routeLine: null,
  _travelledLine: null,
  _etaSeconds: 0,
  _distanceRemaining: 0,
  _totalDistance: 0,

  // ============================================================================
  // 1. DISPATCH: Called when user clicks "Assign" on a recommended truck
  // ============================================================================
  dispatchAndTrack(vehicleId, driverName, vehicleData) {
    // Generate secure 4-digit PIN
    this._tripPin = String(1000 + Math.floor(Math.random() * 9000));

    // Build trip data from active trip + vehicle info
    const activeTrip = StorageEngine.loadActiveTrip() || {};
    const veh = vehicleData || (window.App?.data?.vehicles || []).find(v => v.id === vehicleId) || {};

    this._tripData = {
      tripId: activeTrip.tripId || `TRIP-${Date.now().toString().slice(-6)}`,
      tripPin: this._tripPin,
      vehicleId: veh.id || vehicleId,
      vehicleName: veh.name || 'Tata Ace EV Ultra',
      vehiclePlate: veh.regNo || veh.registrationNumber || veh.plate || (typeof FLEET_REGISTRATIONS !== 'undefined' && FLEET_REGISTRATIONS[vehicleId]?.regNo) || 'DL 1EV 9901',
      vehicleCategory: veh.category || veh.type || 'LCV (Electric)',
      vehicleIcon: veh.icon || (veh.powertrain === 'Electric (EV)' ? '⚡' : '🚚'),
      isEV: (veh.powertrain || '').includes('Electric'),
      driverName: driverName || veh.driver || 'Karthik Nair',
      driverMobile: (typeof FLEET_REGISTRATIONS !== 'undefined' && FLEET_REGISTRATIONS[vehicleId]?.mobile) || veh.driverMobile || '+91 98765 43210',
      driverRating: veh.rating || '4.8',
      driverInitials: (driverName || veh.driver || 'KN').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      origin: activeTrip.origin || 'Okhla Industrial Area, Delhi',
      destination: activeTrip.destination || 'Cyber City, Gurugram',
      originShort: (activeTrip.origin || 'Okhla Depot').split(',')[0].trim(),
      destinationShort: (activeTrip.destination || 'Gurugram Hub').split(',')[0].trim(),
      distanceKm: Number(activeTrip.distanceKm) || 28.4,
      batteryLevel: Number(veh.fuelLevel || veh.batteryLevel || 92),
      status: 'DRIVER_ON_WAY',
      dispatchedAt: Date.now()
    };

    // Save PIN to active trip in localStorage
    activeTrip.tripPin = this._tripPin;
    activeTrip.dispatchStatus = 'DRIVER_ON_WAY';
    StorageEngine.saveActiveTrip(activeTrip);

    this._active = true;

    // Build simulated route points
    this._buildRoutePoints();

    // Navigate to live tracking view
    window.App?.navigateTo('live-tracking');

    // Short delay for DOM view transition, then render left panel and right map
    setTimeout(() => {
      this._showDispatchUI();
      this._initLiveMap();
      this._startAnimation();
    }, 300);

    UIManager.playSound('success');
    UIManager.showToast(`✅ Trip Dispatched! Driver ${this._tripData.driverName} assigned. Pickup PIN: ${this._tripPin}`, 'success', 5000);
  },

  // ============================================================================
  // 2. BUILD SIMULATED ROUTE WAYPOINTS
  // ============================================================================
  _buildRoutePoints() {
    // If corridor points exist in MapEngine/REGIONAL_FLEET_CORRIDORS
    const corridor = (typeof REGIONAL_FLEET_CORRIDORS !== 'undefined') && REGIONAL_FLEET_CORRIDORS[this._tripData.vehicleId];
    if (corridor && corridor.points && corridor.points.length >= 2) {
      this._routePoints = corridor.points.map(p => ({ lat: p[0], lng: p[1] }));
    } else {
      // Default Delhi-NCR corridor simulation
      this._routePoints = [
        { lat: 28.5355, lng: 77.2631 },  // Okhla Industrial
        { lat: 28.5520, lng: 77.2480 },  // Kalkaji
        { lat: 28.5708, lng: 77.2300 },  // AIIMS
        { lat: 28.5860, lng: 77.2100 },  // India Gate
        { lat: 28.5750, lng: 77.1850 },  // Dhaula Kuan
        { lat: 28.5580, lng: 77.1500 },  // Mahipalpur
        { lat: 28.5300, lng: 77.1200 },  // NH-48 Junction
        { lat: 28.4950, lng: 77.0895 }   // DLF Cyber City, Gurugram
      ];
    }
    this._currentPointIndex = 0;
    this._totalDistance = this._tripData.distanceKm;
    this._distanceRemaining = this._totalDistance;
    this._etaSeconds = Math.round((this._totalDistance / 45) * 3600); // ~45 km/h avg
  },

  // ============================================================================
  // 3. RENDER DRIVER DETAILS CARD ON THE LEFT SIDE PANEL
  // ============================================================================
  _showDispatchUI() {
    // Hide empty state, show active tracking container
    const emptyBox = document.getElementById('live-tracking-empty-box');
    const activeBox = document.getElementById('live-tracking-active-container');
    if (emptyBox) emptyBox.classList.add('hidden');
    if (activeBox) activeBox.classList.remove('hidden');

    // Remove legacy bottom sheet if it exists
    const oldSheet = document.getElementById('dispatch-bottom-sheet');
    if (oldSheet) oldSheet.remove();

    // Target the LEFT column panel
    let panel = document.getElementById('dispatch-left-panel');
    if (!panel) {
      console.warn('dispatch-left-panel not found in DOM, falling back to prepending');
      panel = document.createElement('div');
      panel.id = 'dispatch-left-panel';
      const container = document.getElementById('live-tracking-active-container');
      if (container) container.prepend(panel);
    }

    const d = this._tripData;
    const gradientColors = d.isEV 
      ? 'from-emerald-500 to-teal-500' 
      : 'from-orange-500 to-amber-500';

    panel.innerHTML = `
      <!-- Ola/Uber Style Driver Details Card (LEFT SIDE) -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col justify-between h-full text-left">
        
        <!-- Status Header Bar with Pickup PIN -->
        <div class="px-5 py-4 bg-gradient-to-r ${d.isEV ? 'from-emerald-700 to-teal-700' : 'from-slate-900 to-slate-800'} text-white">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span class="text-xs font-extrabold uppercase tracking-wider text-emerald-300" id="dispatch-status-label">Driver On The Way</span>
              </div>
              <h3 class="text-base sm:text-lg font-black tracking-tight">
                Arriving in <span class="text-amber-300" id="dispatch-eta-header">calculating...</span>
              </h3>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest block font-mono">PICKUP PIN</span>
              <div class="text-2xl font-black tracking-[0.25em] font-mono bg-white/20 backdrop-blur px-3 py-1 rounded-xl border border-white/25 text-white" id="dispatch-pin-display">
                ${this._tripPin}
              </div>
              <span class="text-[9px] text-slate-300 mt-0.5 block">Share at pickup</span>
            </div>
          </div>
        </div>

        <!-- Driver Card Content Body -->
        <div class="p-5 space-y-4 flex-1 flex flex-col justify-between">

          <!-- Driver Profile Row -->
          <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <!-- Driver Avatar Circle -->
              <div class="relative shrink-0">
                <div class="w-13 h-13 rounded-full bg-gradient-to-tr ${gradientColors} flex items-center justify-center text-white font-black text-base shadow-sm">
                  ${d.driverInitials}
                </div>
                <div class="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-white text-[9px] font-black">
                  ✓
                </div>
              </div>
              <div class="truncate">
                <div class="flex items-center gap-2 flex-wrap">
                  <strong class="text-sm font-extrabold text-slate-900 truncate">${Utils.escapeHTML(d.driverName)}</strong>
                  <span class="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded flex items-center gap-0.5 shrink-0">
                    ★ ${d.driverRating}
                  </span>
                </div>
                <p class="text-xs text-slate-500 font-medium truncate mt-0.5">${Utils.escapeHTML(d.vehicleName)}</p>
                <p class="text-[11px] text-slate-400 font-mono">${Utils.escapeHTML(d.driverMobile)}</p>
              </div>
            </div>

            <!-- Vehicle License Plate -->
            <div class="text-right shrink-0">
              <div class="text-xs font-black font-mono bg-white border border-slate-300 px-2.5 py-1 rounded-xl text-slate-900 shadow-2xs tracking-wide">
                ${Utils.escapeHTML(d.vehiclePlate)}
              </div>
              <span class="text-[10px] font-bold ${d.isEV ? 'text-emerald-600' : 'text-slate-500'} block mt-1">
                ${d.isEV ? '⚡ Green EV Fleet' : '🚛 Diesel Fleet'}
              </span>
            </div>
          </div>

          <!-- Live Telemetry Gauges Grid (2x2 on narrow, 4-col on wider) -->
          <div>
            <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Live CAN Bus & Telemetry Feed</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Speed</span>
                <strong class="text-sm sm:text-base font-black text-slate-900 font-mono block" id="dispatch-live-speed">0 km/h</strong>
              </div>
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">${d.isEV ? 'Battery' : 'Fuel'}</span>
                <strong class="text-sm sm:text-base font-black ${d.isEV ? 'text-emerald-600' : 'text-amber-600'} font-mono block" id="dispatch-live-battery">${d.batteryLevel}%</strong>
              </div>
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Distance</span>
                <strong class="text-sm sm:text-base font-black text-orange-600 font-mono block" id="dispatch-live-distance">${d.distanceKm.toFixed(1)} km</strong>
              </div>
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">ETA</span>
                <strong class="text-sm sm:text-base font-black text-emerald-600 font-mono block" id="dispatch-live-eta">--:--</strong>
              </div>
            </div>
          </div>

          <!-- Quick Communication Buttons -->
          <div>
            <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Driver Contact & Safety</span>
            <div class="grid grid-cols-4 gap-2">
              <button type="button" class="py-2.5 px-1 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer border-none shadow-2xs" onclick="UIManager.showToast('Calling driver ${Utils.escapeHTML(d.driverName)}: ${Utils.escapeHTML(d.driverMobile)}', 'info')">
                <span class="text-base">📞</span>
                <span class="text-[10px] font-bold text-slate-700">Call</span>
              </button>
              <button type="button" class="py-2.5 px-1 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer border-none shadow-2xs" onclick="UIManager.showToast('Opening instant message with ${Utils.escapeHTML(d.driverName)}...', 'info')">
                <span class="text-base">💬</span>
                <span class="text-[10px] font-bold text-slate-700">Message</span>
              </button>
              <button type="button" class="py-2.5 px-1 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer border-none shadow-2xs" onclick="LiveDispatch.shareTrackingLink()">
                <span class="text-base">🔗</span>
                <span class="text-[10px] font-bold text-slate-700">Share</span>
              </button>
              <button type="button" class="py-2.5 px-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer shadow-2xs" onclick="UIManager.showToast('🛡️ Emergency SOS signal transmitted to Control Room.', 'error')">
                <span class="text-base">🛡️</span>
                <span class="text-[10px] font-bold text-rose-700">SOS</span>
              </button>
            </div>
          </div>

          <!-- Corridor Progress Timeline (Origin → Destination) -->
          <div class="pt-3 border-t border-slate-100">
            <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Transit Progress</span>
            <div class="flex items-center justify-between text-xs text-slate-600 gap-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-3.5 h-3.5 rounded-full bg-slate-900 text-white text-[8px] font-black flex items-center justify-center shrink-0">A</span>
                <span class="font-bold text-slate-800 text-[11px] truncate">${Utils.escapeHTML(d.originShort)}</span>
              </div>
              <div class="flex-1 mx-2 relative">
                <div class="border-t-2 border-dashed border-slate-300 w-full"></div>
                <div class="border-t-2 border-emerald-500 absolute top-0 left-0 transition-all duration-500" id="dispatch-progress-bar" style="width: 0%"></div>
                <div class="absolute -top-2.5 transition-all duration-500" id="dispatch-progress-truck" style="left: 0%">
                  <span class="text-xs">${d.vehicleIcon}</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] font-black flex items-center justify-center shrink-0">B</span>
                <span class="font-bold text-slate-800 text-[11px] truncate">${Utils.escapeHTML(d.destinationShort)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    // Update top KPI labels
    this._updateTopKPIs();
  },

  // ============================================================================
  // 4. INITIALIZE LIVE LEAFLET MAP WITH MARKERS + POLYLINE
  // ============================================================================
  _initLiveMap() {
    if (typeof L === 'undefined' || !L.map) return;

    const mapEl = document.getElementById('live-tracking-map');
    if (!mapEl) return;

    // Destroy existing map if any
    if (window.App?._liveTrackingMap) {
      try { window.App._liveTrackingMap.remove(); } catch(e) {}
      window.App._liveTrackingMap = null;
      window.App._liveGpsMarker = null;
    }

    // Create fresh map
    this._liveMap = L.map('live-tracking-map', { zoomControl: false }).setView(
      [this._routePoints[0].lat, this._routePoints[0].lng], 12
    );

    L.tileLayer(CONFIG.MAP.TILES.STREETS.URL, {
      subdomains: CONFIG.MAP.TILES.STREETS.SUBDOMAINS,
      attribution: CONFIG.MAP.TILES.STREETS.ATTRIBUTION,
      maxZoom: CONFIG.MAP.TILES.STREETS.MAX_ZOOM
    }).addTo(this._liveMap);

    L.control.zoom({ position: 'bottomright' }).addTo(this._liveMap);

    // Store reference for App compatibility
    window.App._liveTrackingMap = this._liveMap;

    // Draw the full route polyline
    const routeLatLngs = this._routePoints.map(p => [p.lat, p.lng]);
    this._routeLine = L.polyline(routeLatLngs, {
      color: '#94a3b8',
      weight: 5,
      opacity: 0.5,
      dashArray: '10 8'
    }).addTo(this._liveMap);

    // Travelled route (emerald glow)
    this._travelledLine = L.polyline([], {
      color: '#10b981',
      weight: 6,
      opacity: 0.9
    }).addTo(this._liveMap);

    // Destination marker (red pin)
    const lastPt = this._routePoints[this._routePoints.length - 1];
    this._destMarker = L.marker([lastPt.lat, lastPt.lng], {
      icon: L.divIcon({
        className: 'dispatch-dest-marker',
        html: `<div style="background:#ef4444;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.3);">B</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(this._liveMap)
      .bindPopup(`<b>📍 ${Utils.escapeHTML(this._tripData.destinationShort)}</b><br>Destination`);

    // Origin marker (dark pin)
    const firstPt = this._routePoints[0];
    L.marker([firstPt.lat, firstPt.lng], {
      icon: L.divIcon({
        className: 'dispatch-origin-marker',
        html: `<div style="background:#1e293b;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.2);">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).addTo(this._liveMap)
      .bindPopup(`<b>📦 ${Utils.escapeHTML(this._tripData.originShort)}</b><br>Pickup Point`);

    // Driver marker (animated truck with pulse)
    this._driverMarker = L.marker([firstPt.lat, firstPt.lng], {
      icon: L.divIcon({
        className: 'dispatch-driver-marker',
        html: `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(16,185,129,0.3);animation:dispatch-pulse 2s ease-out infinite;"></div>
            <div style="background:#0f172a;color:#fff;width:40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid #10b981;box-shadow:0 6px 20px rgba(0,0,0,0.35);position:relative;z-index:2;">
              ${this._tripData.vehicleIcon}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      }),
      zIndexOffset: 1000
    }).addTo(this._liveMap);

    // Add pulse animation CSS
    if (!document.getElementById('dispatch-pulse-css')) {
      const style = document.createElement('style');
      style.id = 'dispatch-pulse-css';
      style.textContent = `
        @keyframes dispatch-pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Fit map to show entire route with comfortable padding
    this._liveMap.fitBounds(routeLatLngs, { padding: [50, 50] });

    // Recalibrate leaflet size after DOM layout settles
    setTimeout(() => {
      if (this._liveMap) {
        this._liveMap.invalidateSize();
      }
    }, 250);

    // Update floating vehicle label
    const vehLabel = document.getElementById('live-map-active-vehicle-label');
    if (vehLabel) vehLabel.textContent = `${this._tripData.vehicleIcon} ${this._tripData.vehicleName} (${this._tripData.vehiclePlate}) • Live Dispatch`;
  },

  // ============================================================================
  // 5. ANIMATE DRIVER MOVEMENT ALONG ROUTE
  // ============================================================================
  _startAnimation() {
    if (this._animInterval) clearInterval(this._animInterval);

    const totalSteps = (this._routePoints.length - 1) * 40; // 40 sub-steps per segment
    let currentStep = 0;

    this._animInterval = setInterval(() => {
      if (!this._active || currentStep >= totalSteps) {
        this._onArrival();
        return;
      }

      const segmentIndex = Math.floor(currentStep / 40);
      const subStep = (currentStep % 40) / 40;

      if (segmentIndex >= this._routePoints.length - 1) {
        this._onArrival();
        return;
      }

      const from = this._routePoints[segmentIndex];
      const to = this._routePoints[segmentIndex + 1];

      // Interpolate position
      const lat = from.lat + (to.lat - from.lat) * subStep;
      const lng = from.lng + (to.lng - from.lng) * subStep;

      // Update marker position
      if (this._driverMarker) {
        this._driverMarker.setLatLng([lat, lng]);
      }

      // Update travelled line
      const travelledPoints = [];
      for (let i = 0; i <= segmentIndex; i++) {
        travelledPoints.push([this._routePoints[i].lat, this._routePoints[i].lng]);
      }
      travelledPoints.push([lat, lng]);
      if (this._travelledLine) {
        this._travelledLine.setLatLngs(travelledPoints);
      }

      // Calculate progress
      const progress = currentStep / totalSteps;
      this._distanceRemaining = this._totalDistance * (1 - progress);
      this._etaSeconds = Math.round((this._distanceRemaining / 45) * 3600);

      // Simulate realistic speed variation (40-65 km/h range)
      const baseSpeed = 48 + Math.sin(currentStep * 0.15) * 14;
      const speed = Math.round(baseSpeed + (Math.random() * 4 - 2));

      // Battery/Fuel drain simulation
      const batteryDrain = progress * 8; // ~8% drain over full route
      const currentBattery = Math.max(0, Math.round(this._tripData.batteryLevel - batteryDrain));

      // Update telemetry gauges
      this._updateTelemetry(speed, currentBattery, this._distanceRemaining, this._etaSeconds, progress);

      currentStep++;
    }, 600);
  },

  // ============================================================================
  // 6. UPDATE TELEMETRY UI (Speed, Battery, Distance, ETA, Progress)
  // ============================================================================
  _updateTelemetry(speed, battery, distKm, etaSec, progress) {
    const speedEl = document.getElementById('dispatch-live-speed');
    const batteryEl = document.getElementById('dispatch-live-battery');
    const distEl = document.getElementById('dispatch-live-distance');
    const etaEl = document.getElementById('dispatch-live-eta');
    const etaHeaderEl = document.getElementById('dispatch-eta-header');
    const progressBar = document.getElementById('dispatch-progress-bar');
    const progressTruck = document.getElementById('dispatch-progress-truck');

    const etaMin = Math.ceil(etaSec / 60);
    const etaFormatted = etaMin > 60 
      ? `${Math.floor(etaMin/60)}h ${etaMin%60}m`
      : `${etaMin} min`;

    if (speedEl) speedEl.textContent = `${speed} km/h`;
    if (batteryEl) batteryEl.textContent = `${battery}%`;
    if (distEl) distEl.textContent = `${distKm.toFixed(1)} km`;
    if (etaEl) etaEl.textContent = etaFormatted;
    if (etaHeaderEl) etaHeaderEl.textContent = etaFormatted;

    // Progress bar
    const pct = Math.min(100, Math.round(progress * 100));
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressTruck) progressTruck.style.left = pct + '%';

    // Top KPI cards
    const kpiSpeed = document.getElementById('live-gps-speed');
    const kpiDist = document.getElementById('live-gps-remaining-dist');
    const kpiEta = document.getElementById('live-gps-eta');
    const kpiLatLng = document.getElementById('live-gps-latlng');

    if (kpiSpeed) kpiSpeed.textContent = `${speed} km/h`;
    if (kpiDist) kpiDist.textContent = `${distKm.toFixed(1)} km`;
    if (kpiEta) kpiEta.textContent = `~ ${etaFormatted}`;

    if (kpiLatLng && this._driverMarker) {
      const ll = this._driverMarker.getLatLng();
      kpiLatLng.textContent = `${ll.lat.toFixed(4)}° N, ${ll.lng.toFixed(4)}° E`;
    }

    // Status label updates
    const statusLabel = document.getElementById('dispatch-status-label');
    if (statusLabel) {
      if (distKm < 0.5) {
        statusLabel.textContent = '🎉 Driver Has Arrived!';
      } else if (distKm < 2) {
        statusLabel.textContent = 'Almost There!';
      } else {
        statusLabel.textContent = 'Driver On The Way';
      }
    }
  },

  _updateTopKPIs() {
    const destLabel = document.getElementById('live-gps-destination-label');
    if (destLabel) destLabel.textContent = `to ${this._tripData.destinationShort}`;

    const accEl = document.getElementById('live-gps-accuracy');
    if (accEl) accEl.textContent = 'Live Dispatch Simulation • GPS Active';
  },

  // ============================================================================
  // 7. ON ARRIVAL (End of Route Animation)
  // ============================================================================
  _onArrival() {
    if (this._animInterval) {
      clearInterval(this._animInterval);
      this._animInterval = null;
    }

    const statusLabel = document.getElementById('dispatch-status-label');
    const etaHeader = document.getElementById('dispatch-eta-header');
    const progressBar = document.getElementById('dispatch-progress-bar');
    const progressTruck = document.getElementById('dispatch-progress-truck');

    if (statusLabel) statusLabel.textContent = '🎉 Driver Has Arrived!';
    if (etaHeader) etaHeader.textContent = 'Arrived!';
    if (progressBar) progressBar.style.width = '100%';
    if (progressTruck) progressTruck.style.left = '100%';

    this._updateTelemetry(0, Math.round(this._tripData.batteryLevel - 8), 0, 0, 1);

    const lastPt = this._routePoints[this._routePoints.length - 1];
    if (this._driverMarker) {
      this._driverMarker.setLatLng([lastPt.lat, lastPt.lng]);
    }

    const activeTrip = StorageEngine.loadActiveTrip();
    if (activeTrip) {
      activeTrip.dispatchStatus = 'ARRIVED';
      StorageEngine.saveActiveTrip(activeTrip);
    }

    UIManager.playSound('success');
    UIManager.showToast(`🎉 Driver ${this._tripData.driverName} has arrived at ${this._tripData.destinationShort}! Share PIN ${this._tripPin} to start trip.`, 'success', 6000);
  },

  // ============================================================================
  // 8. SHARE TRACKING LINK
  // ============================================================================
  shareTrackingLink() {
    const url = `${window.location.origin}?trip=${this._tripData?.tripId || 'ACTIVE'}&pin=${this._tripPin || '----'}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        UIManager.showToast('📋 Live tracking link copied to clipboard! Share it with the customer.', 'success');
      });
    } else {
      UIManager.showToast(`Share this link: ${url}`, 'info');
    }
  },

  // ============================================================================
  // 9. PIN VERIFICATION
  // ============================================================================
  verifyPin(enteredPin) {
    const activeTrip = StorageEngine.loadActiveTrip();
    if (!activeTrip || !activeTrip.tripPin) {
      UIManager.showToast('No active dispatch found to verify.', 'error');
      return false;
    }

    if (String(enteredPin).trim() === String(activeTrip.tripPin).trim()) {
      activeTrip.status = CONFIG.TRIP_STATUS.IN_PROGRESS;
      activeTrip.dispatchStatus = 'TRIP_STARTED';
      activeTrip.pinVerifiedAt = Date.now();
      StorageEngine.saveActiveTrip(activeTrip);

      UIManager.playSound('success');
      UIManager.showToast('✅ Pickup PIN Verified! Cargo loading confirmed. Trip Started!', 'success');
      
      if (window.MapEngine?.startNavigationSimulation) {
        window.MapEngine.startNavigationSimulation();
      }
      if (window.App) {
        window.App.updateAllUI();
      }
      return true;
    } else {
      UIManager.playSound('alert');
      UIManager.showToast('❌ Incorrect PIN. Please ask the dispatcher for the correct 4-digit code.', 'error');
      return false;
    }
  },

  getCurrentPin() {
    const activeTrip = StorageEngine.loadActiveTrip();
    return activeTrip?.tripPin || this._tripPin || null;
  },

  cleanup() {
    if (this._animInterval) {
      clearInterval(this._animInterval);
      this._animInterval = null;
    }
    this._active = false;
    this._tripData = null;
    this._tripPin = null;

    const panel = document.getElementById('dispatch-left-panel');
    if (panel) panel.innerHTML = '';
  }
};

window.LiveDispatch = LiveDispatch;
