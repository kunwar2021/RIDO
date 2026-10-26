/**
 * ==============================================================================
 * RIDO — Fleet Telemetry & Vehicle Roster Management (`fleet.js`)
 * ==============================================================================
 * Manages the interactive vehicle roster grid, specification modal forms,
 * status filters with dynamic badge counters, and substring search.
 */

const FleetManager = {
  currentFilter: "all",
  searchQuery: "",

  init() {
    this.setupFilterTabs();
    this.setupSearchInput();
    this.renderFleetCards();
  },

  setupFilterTabs() {
    const filterContainer = document.getElementById("fleet-status-filters");
    if (!filterContainer) return;

    filterContainer.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        filterContainer.querySelectorAll(".filter-tab").forEach((t) => {
          t.classList.remove("active", "bg-orange-50", "text-orange-600", "border-orange-200");
          t.classList.add("bg-white", "text-slate-600", "border-slate-200");
        });
        const activeTab = e.currentTarget;
        activeTab.classList.add("active", "bg-orange-50", "text-orange-600", "border-orange-200");
        activeTab.classList.remove("bg-white", "text-slate-600", "border-slate-200");
        this.currentFilter = activeTab.dataset.filter;
        this.renderFleetCards();
      });
    });
  },

  setupSearchInput() {
    const searchInput = document.getElementById("fleet-search-input");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderFleetCards();
    });
  },

  getFilteredVehicles(vehicles) {
    if (!vehicles) return [];
    return vehicles.filter((veh) => {
      // 1. Status Filter
      if (this.currentFilter !== "all" && veh.status !== this.currentFilter) {
        return false;
      }
      // 2. Substring Search
      if (this.searchQuery) {
        const idMatch = (veh.id || "").toLowerCase().includes(this.searchQuery);
        const nameMatch = (veh.name || "").toLowerCase().includes(this.searchQuery);
        const driverMatch = (veh.driver || "").toLowerCase().includes(this.searchQuery);
        const typeMatch = (veh.type || "").toLowerCase().includes(this.searchQuery);
        if (!idMatch && !nameMatch && !driverMatch && !typeMatch) {
          return false;
        }
      }
      return true;
    });
  },

  // --------------------------------------------------------------------------
  // Main Fleet Cards Grid Rendering
  renderFleetCards() {
    const container = document.getElementById("fleet-cards-container");
    if (!container) return;

    const vehicles = (window.App && window.App.data && Array.isArray(window.App.data.vehicles)) ? window.App.data.vehicles : [];
    const filtered = this.getFilteredVehicles(vehicles);

    this.updateFilterCounts(vehicles);

    if (vehicles.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div class="text-4xl mb-3">🚛</div>
          <h3 class="text-base font-black text-slate-900 mb-1">No vehicles added yet.</h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto mb-4">Add your first truck or delivery vehicle to manage routes, track vehicles, and monitor FASTags.</p>
          <button type="button" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs cursor-pointer border-none shadow-md" onclick="App.openAddVehicleModal()">
            + Add Vehicle
          </button>
        </div>
      `;
      return;
    }

    const cardsHTML = filtered
      .map((veh) => {
        const isEV = (veh.powertrain || "").includes("Electric") || veh.type === "Electric Van" || veh.type === "3-Wheeler";
        
        let statusBadgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
        let statusText = veh.status || "Available";
        if (veh.status === "On Route" || veh.status === "On Trip") {
          statusBadgeClass = "bg-blue-50 text-blue-700 border border-blue-200";
          statusText = "On Route";
        } else if (veh.status === "Low Fuel") {
          statusBadgeClass = "bg-amber-50 text-amber-800 border border-amber-200";
          statusText = "Low Fuel";
        } else if (veh.status === "Maintenance") {
          statusBadgeClass = "bg-purple-50 text-purple-700 border border-purple-200";
          statusText = "Maintenance";
        } else if (veh.status === "Breakdown") {
          statusBadgeClass = "bg-rose-50 text-rose-700 border border-rose-200";
          statusText = "Breakdown";
        }

        const payloadStr = veh.payloadMax ? `${Number(veh.payloadMax).toLocaleString()} kg` : (veh.payload || "10,000 kg");
        const efficiencyStr = veh.efficiency ? `${veh.efficiency} km/${isEV ? 'kWh' : 'L'}` : (isEV ? "5.8 km/kWh" : "4.8 km/L");
        
        let fuelLevelStr = `${veh.fuelLevel || 85}% 🔋`;
        let fuelColorClass = "text-slate-900";
        if (veh.status === "Low Fuel" || Number(veh.fuelLevel) < 25) {
          fuelLevelStr = `${veh.fuelLevel || 18}% 🪫`;
          fuelColorClass = "text-rose-600";
        } else if (isEV && Number(veh.fuelLevel) < 50) {
          fuelLevelStr = `${veh.fuelLevel || 42}% 🔋`;
          fuelColorClass = "text-amber-600";
        }

        let maintStr = "✓ Up to date";
        let maintColorClass = "text-emerald-700";
        if (veh.status === "Maintenance" || veh.id === "AUTO-CARGO-06") {
          maintStr = "⚠️ Due in 3 days";
          maintColorClass = "text-rose-600";
        }

        let vehicleIcon = "🚛";
        if (veh.name.includes("Eicher") || veh.type === "Delivery Van") vehicleIcon = "🚚";
        else if (isEV && veh.name.includes("Tata Ace")) vehicleIcon = "⚡";
        else if (isEV && veh.name.includes("Mahindra")) vehicleIcon = "🛺";

        return `
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between transition hover:shadow-md" id="card-${veh.id}">
          <div>
            <!-- Top Header -->
            <div class="flex items-start justify-between gap-2 pb-1">
              <div class="flex items-center gap-2.5">
                <span class="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl font-bold shrink-0">${vehicleIcon}</span>
                <div>
                  <h4 class="text-xs font-black text-slate-900 leading-tight">${Utils.escapeHTML(veh.name)}</h4>
                  <span class="font-mono text-[10px] font-bold text-slate-400 block mt-0.5">${Utils.escapeHTML(veh.plate || veh.id)}</span>
                </div>
              </div>
              <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusBadgeClass} shrink-0">${statusText}</span>
            </div>

            <!-- Company Owned Badge -->
            <div class="mt-2.5 mb-3.5">
              <span class="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-bold inline-flex items-center gap-1">
                <span>🏢</span> <span>COMPANY OWNED</span>
              </span>
            </div>

            <!-- 6-Metric 2-Column Grid -->
            <div class="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs mb-4">
              <div>
                <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">MAX PAYLOAD</span>
                <strong class="text-xs font-black text-slate-900 font-mono">${payloadStr}</strong>
              </div>
              <div>
                <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">FUEL / POWER</span>
                <strong class="text-xs font-black text-slate-900">${Utils.escapeHTML(veh.powertrain || 'Diesel')}</strong>
              </div>
              <div>
                <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">EFFICIENCY</span>
                <strong class="text-xs font-black text-slate-900 font-mono">${efficiencyStr}</strong>
              </div>
              <div>
                <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">${isEV ? 'BATTERY LEVEL' : 'FUEL LEVEL'}</span>
                <strong class="text-xs font-black ${fuelColorClass} font-mono">${fuelLevelStr}</strong>
              </div>
              <div>
                <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">HEALTH</span>
                <strong class="text-xs font-bold text-emerald-700 flex items-center gap-1"><span>🟢</span> <span>Good</span></strong>
              </div>
              <div>
                <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">MAINTENANCE</span>
                <strong class="text-xs font-bold ${maintColorClass} flex items-center gap-1">${maintStr}</strong>
              </div>
            </div>
          </div>

          <!-- Bottom 3 Action Buttons -->
          <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
            <button type="button" class="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs" onclick="App.openVehicleDetailsModal('${veh.id}')">
              <span>👁</span> <span>View</span>
            </button>
            <button type="button" class="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs" onclick="App.openEditVehicleModal('${veh.id}')">
              <span>✏️</span> <span>Edit</span>
            </button>
            <button type="button" class="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs border border-rose-200 transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs" onclick="App.deleteVehicle('${veh.id}')">
              <span>🗑</span> <span>Remove</span>
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    // Fleet Summary Card Widget
    const totalCount = vehicles.length;
    const availCount = vehicles.filter(v => v.status === "Available").length;
    const routeCount = vehicles.filter(v => v.status === "On Route" || v.status === "On Trip").length;
    const fuelCount = vehicles.filter(v => v.status === "Low Fuel").length;
    const maintCount = vehicles.filter(v => v.status === "Maintenance").length;
    const breakCount = vehicles.filter(v => v.status === "Breakdown").length;

    const summaryHTML = `
      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">Fleet Summary</h3>
          <div class="space-y-2.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-600 font-medium">Total Vehicles</span>
              <strong class="font-mono text-slate-900 font-black">${totalCount}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600 font-medium">Available</span>
              <strong class="font-mono text-emerald-600 font-black">${availCount}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600 font-medium">On Route</span>
              <strong class="font-mono text-blue-600 font-black">${routeCount}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600 font-medium">Low Fuel/Battery</span>
              <strong class="font-mono text-amber-600 font-black">${fuelCount}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600 font-medium">Maintenance</span>
              <strong class="font-mono text-purple-600 font-black">${maintCount}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600 font-medium">Breakdown</span>
              <strong class="font-mono text-rose-600 font-black">${breakCount}</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = cardsHTML + summaryHTML;
  },

  updateFilterCounts(vehicles) {
    const counts = { all: vehicles.length, Available: 0, "On Route": 0, "Low Fuel": 0, Maintenance: 0, Breakdown: 0 };
    vehicles.forEach((v) => {
      if (counts[v.status] !== undefined) counts[v.status]++;
    });

    const setVal = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };

    setVal("fleet-tab-all", counts.all);
    setVal("fleet-tab-avail", counts.Available);
    setVal("fleet-tab-route", counts["On Route"] || counts["On Trip"] || 0);
    setVal("fleet-tab-fuel", counts["Low Fuel"] || 0);
    setVal("fleet-tab-maint", counts.Maintenance || 0);
    setVal("fleet-tab-break", counts.Breakdown || counts.Inactive || 0);
  },

  // --------------------------------------------------------------------------
  // Mini Fleet Status Matrix (Operations Dashboard)
  // --------------------------------------------------------------------------
  renderMiniFleetMatrix() {
    const container = document.getElementById("dash-fleet-matrix");
    if (!container) return;

    const vehicles = (window.App && window.App.data && Array.isArray(window.App.data.vehicles)) ? window.App.data.vehicles : [];

    if (vehicles.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          Your fleet is empty. Add your first vehicle to monitor operations.
        </div>
      `;
      return;
    }

    container.innerHTML = vehicles
      .slice(0, 6)
      .map((veh) => {
        const isEV = veh.powertrain === "Electric (EV)";
        let dotColor = "#10b981";
        if (veh.status === "On Route" || veh.status === "On Trip") dotColor = "#3b82f6";
        else if (veh.status === "Low Fuel") dotColor = "#f59e0b";
        else if (veh.status === "Maintenance" || veh.status === "Breakdown" || veh.status === "Inactive") dotColor = "#ef4444";

        return `
        <div class="fleet-mini-row p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between gap-2 transition cursor-pointer mb-2" onclick="App.navigateTo('fleet')">
          <div class="flex items-center gap-2.5 truncate">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${dotColor};"></span>
            <div class="truncate">
              <div class="text-xs font-black text-slate-900 truncate">${Utils.escapeHTML(veh.name)} <span class="font-mono text-[10px] text-slate-500 font-bold">(${Utils.escapeHTML(veh.plate || veh.id)})</span></div>
              <div class="text-[10px] text-slate-500 truncate">Driver: ${Utils.escapeHTML(veh.driver || "No driver")} • ${Utils.formatWeight(veh.payloadMax)} Max</div>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200">${veh.status}</span>
          </div>
        </div>
      `;
      })
      .join("");
  },

  /**
   * Computes aggregate fleet statistics (total capacity, active count, utilization rate).
   * @returns {{ total: number, active: number, totalCapacityKg: number, utilizationPct: number }}
   */
  getFleetSummary() {
    const vehicles = (window.App && window.App.data && Array.isArray(window.App.data.vehicles)) ? window.App.data.vehicles : [];
    const total = vehicles.length;
    if (total === 0) return { total: 0, active: 0, totalCapacityKg: 0, utilizationPct: 0 };

    const active = vehicles.filter(v => v.status === "On Route" || v.status === "On Trip" || v.status === "In Transit").length;
    const totalCapacityKg = vehicles.reduce((acc, v) => acc + (Number(v.payloadMax) || 0), 0);
    const utilizationPct = total > 0 ? +((active / total) * 100).toFixed(1) : 0;

    return { total, active, totalCapacityKg, utilizationPct };
  }
};

window.FleetManager = FleetManager;

