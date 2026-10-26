/**
 * ==============================================================================
 * RIDO — Dynamic JSON Vehicle Database & Registration Engine (`script.js`)
 * ==============================================================================
 * Loads vehicle master catalog dynamically from ./vehicles.json as single source
 * of truth, provides 4-tier searchable selection (Manufacturer -> Category ->
 * Model -> Variant), auto-populates technical specifications, and persists
 * custom vehicles & registered trucks in localStorage.
 * 
 * STRICT COMPLIANCE:
 * - Pure Vanilla JavaScript (No React, Vue, Node, Backend, or npm packages)
 * - JSON master catalog loaded via fetch("./vehicles.json")
 * - localStorage for custom vehicles and registered vehicles
 * ==============================================================================
 */

// Global Master Vehicle Database
let vehicleDatabase = [];
let customVehicleDatabase = [];
let registeredVehiclesList = [];

// Active Selection State
const VehicleSelectorState = {
  selectedManufacturer: "Tata Motors",
  selectedCategory: "Heavy Truck",
  selectedModel: "Prima 5530.S",
  selectedVariant: "Heavy Trailer • 28T",
  selectedVehicle: null,
  
  // Search Filters
  searchManufacturer: "",
  searchCategory: "",
  searchModel: "",
  searchVariant: ""
};

// Storage Keys
const VEHICLE_STORAGE_KEYS = {
  CUSTOM_VEHICLES: "customVehicles",
  REGISTERED_VEHICLES: "registeredVehicles"
};

/**
 * Fallback Embedded Catalog (used only if fetch fails when run directly via file://)
 */
const EMBEDDED_FALLBACK_CATALOG = [
  {
    id: "tata-prima-5530s-trailer",
    manufacturer: "Tata Motors",
    model: "Prima 5530.S",
    variant: "Heavy Trailer • 28T",
    category: "Heavy Truck",
    gvw: "55T",
    payload: "28T",
    payloadKg: 28000,
    fuelType: "Diesel",
    powertrain: "Diesel BS-VI",
    engine: "Cummins ISBe 6.7L",
    horsepower: "280 HP",
    axles: 4,
    transmission: "Manual (9 Speed)",
    wheelbase: "5300 mm",
    efficiency: 4.2,
    costPerKm: 28.0,
    icon: "🚛"
  },
  {
    id: "bharatbenz-2823r",
    manufacturer: "BharatBenz",
    model: "BharatBenz 2823R",
    variant: "Multi-Axle • 18.5T",
    category: "Heavy Truck",
    gvw: "28T",
    payload: "18.5T",
    payloadKg: 18500,
    fuelType: "Diesel",
    powertrain: "Diesel BS-VI",
    engine: "OM926 7.2L Turbo",
    horsepower: "241 HP",
    axles: 3,
    transmission: "Manual (6 Speed)",
    wheelbase: "5175 mm",
    efficiency: 5.4,
    costPerKm: 22.5,
    icon: "🚛"
  },
  {
    id: "eicher-pro-3019",
    manufacturer: "Eicher",
    model: "Eicher Pro 3019",
    variant: "Heavy Carrier • 11T",
    category: "Medium Truck",
    gvw: "18.5T",
    payload: "11T",
    payloadKg: 11000,
    fuelType: "Diesel",
    powertrain: "Diesel BS-VI",
    engine: "E494 4-Cylinder 3.8L CRS",
    horsepower: "180 HP",
    axles: 2,
    transmission: "Manual (6 Speed)",
    wheelbase: "4490 mm",
    efficiency: 6.8,
    costPerKm: 16.0,
    icon: "🚚"
  },
  {
    id: "tata-407-lpt",
    manufacturer: "Tata Motors",
    model: "Tata 407 LPT",
    variant: "Medium Truck • 3.8T",
    category: "Medium Truck",
    gvw: "4.9T",
    payload: "3.8T",
    payloadKg: 3800,
    fuelType: "Diesel",
    powertrain: "Diesel BS-VI",
    engine: "4SPCR 2.95L Turbo",
    horsepower: "100 HP",
    axles: 2,
    transmission: "Manual (5 Speed)",
    wheelbase: "3100 mm",
    efficiency: 7.8,
    costPerKm: 14.5,
    icon: "🚚"
  }
];

/**
 * Initialize and Load Vehicle Database from ./vehicles.json
 */
function loadVehicleCatalog() {
  fetch("./vehicles.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data && Array.isArray(data.vehicles)) {
        vehicleDatabase = data.vehicles;
      } else if (Array.isArray(data)) {
        vehicleDatabase = data;
      } else {
        vehicleDatabase = [];
      }
      console.log(`[RIDO Vehicle Engine] Loaded ${vehicleDatabase.length} master vehicles from vehicles.json`);
      loadCustomVehicles();
      loadRegisteredVehicles();
      initializeVehicleSelector();
    })
    .catch((error) => {
      console.warn("Unable to load vehicle database via fetch (likely opened directly via file:// protocol). Using embedded dataset:", error);
      vehicleDatabase = EMBEDDED_FALLBACK_CATALOG;
      loadCustomVehicles();
      loadRegisteredVehicles();
      initializeVehicleSelector();
    });
}

/**
 * Load Custom Vehicles from localStorage
 */
function loadCustomVehicles() {
  try {
    const raw = localStorage.getItem(VEHICLE_STORAGE_KEYS.CUSTOM_VEHICLES);
    customVehicleDatabase = raw ? JSON.parse(raw) : [];
  } catch (e) {
    customVehicleDatabase = [];
  }
}

/**
 * Save Custom Vehicle to localStorage
 */
function saveCustomVehicle(vehicleObj) {
  try {
    loadCustomVehicles();
    customVehicleDatabase.push(vehicleObj);
    localStorage.setItem(VEHICLE_STORAGE_KEYS.CUSTOM_VEHICLES, JSON.stringify(customVehicleDatabase));
    return true;
  } catch (e) {
    console.error("Error saving custom vehicle:", e);
    return false;
  }
}

/**
 * Load Registered Vehicles from localStorage
 */
function loadRegisteredVehicles() {
  try {
    const raw = localStorage.getItem(VEHICLE_STORAGE_KEYS.REGISTERED_VEHICLES);
    if (raw) {
      registeredVehiclesList = JSON.parse(raw);
    } else {
      // Default initial registered trucks matching mockup
      registeredVehiclesList = [
        {
          id: "REG-01",
          plate: "PB 10 CQ 4821",
          manufacturer: "Tata Motors",
          model: "Prima 5530.S",
          variant: "Heavy Trailer • 28T",
          category: "Heavy Truck",
          powertrain: "Diesel BS-VI",
          fuelLevel: 85,
          status: "Available",
          registeredAt: Date.now() - 86400000 * 3
        },
        {
          id: "REG-02",
          plate: "HR 55 AB 1234",
          manufacturer: "BharatBenz",
          model: "BharatBenz 2823R",
          variant: "Multi-Axle • 18.5T",
          category: "Heavy Truck",
          powertrain: "Diesel BS-VI",
          fuelLevel: 92,
          status: "Available",
          registeredAt: Date.now() - 86400000 * 2
        },
        {
          id: "REG-03",
          plate: "UP 16 ET 7788",
          manufacturer: "Eicher",
          model: "Eicher Pro 3019",
          variant: "Heavy Carrier • 11T",
          category: "Medium Truck",
          powertrain: "Diesel BS-VI",
          fuelLevel: 78,
          status: "Available",
          registeredAt: Date.now() - 86400000
        },
        {
          id: "REG-04",
          plate: "RJ 14 GA 8899",
          manufacturer: "Tata Motors",
          model: "Tata 407 LPT",
          variant: "Medium Truck • 3.8T",
          category: "Medium Truck",
          powertrain: "Diesel BS-VI",
          fuelLevel: 88,
          status: "Available",
          registeredAt: Date.now()
        }
      ];
      localStorage.setItem(VEHICLE_STORAGE_KEYS.REGISTERED_VEHICLES, JSON.stringify(registeredVehiclesList));
    }
  } catch (e) {
    registeredVehiclesList = [];
  }
}

/**
 * Save Registered Vehicle to localStorage
 */
function saveRegisteredVehicle(truckObj) {
  try {
    loadRegisteredVehicles();
    // Check if plate already registered, if so update
    const existingIdx = registeredVehiclesList.findIndex(v => v.plate.replace(/\s/g, '').toUpperCase() === truckObj.plate.replace(/\s/g, '').toUpperCase());
    if (existingIdx >= 0) {
      registeredVehiclesList[existingIdx] = { ...registeredVehiclesList[existingIdx], ...truckObj };
    } else {
      registeredVehiclesList.unshift(truckObj);
    }
    localStorage.setItem(VEHICLE_STORAGE_KEYS.REGISTERED_VEHICLES, JSON.stringify(registeredVehiclesList));
    return true;
  } catch (e) {
    console.error("Error saving registered vehicle:", e);
    return false;
  }
}

/**
 * Get Combined Catalog (Master JSON + Custom Vehicles)
 */
function getAllAvailableVehicles() {
  return [...vehicleDatabase, ...customVehicleDatabase];
}

/**
 * Initialize 4-Stage Searchable Vehicle Selector
 */
function initializeVehicleSelector() {
  renderManufacturersList();
  renderCategoriesList();
  renderModelsList();
  renderVariantsList();
  updateVehicleDetailsPreview();
  renderRegisteredVehiclesList();
  bindVehicleSelectorEvents();
}

/**
 * Render Manufacturer List (Column 1)
 */
function renderManufacturersList() {
  const container = document.getElementById("vreg-manufacturers-list");
  if (!container) return;

  const allVehicles = getAllAvailableVehicles();
  const search = (VehicleSelectorState.searchManufacturer || "").toLowerCase().trim();
  
  // Extract unique manufacturers
  const manufacturers = Array.from(new Set(allVehicles.map(v => v.manufacturer).filter(Boolean))).sort();
  const filtered = manufacturers.filter(m => !search || m.toLowerCase().includes(search));

  const manufacturerLogos = {
    "Tata Motors": "🔴",
    "Ashok Leyland": "🔵",
    "Eicher": "🔴",
    "BharatBenz": "⚫",
    "Mahindra": "🔴",
    "Force Motors": "🔵",
    "SML Isuzu": "🔴",
    "Volvo Trucks": "⚪",
    "Scania": "🔵",
    "Isuzu": "🔴",
    "MAN": "⚪",
    "Hino": "🔴",
    "Foton": "🔵",
    "UD Trucks": "🔴"
  };

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        No manufacturer found.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(m => {
    const isSelected = m === VehicleSelectorState.selectedManufacturer;
    const logo = manufacturerLogos[m] || "🚚";
    return `
      <div class="vreg-select-item flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected ? 'active bg-orange-500 text-white shadow-xs' : 'text-slate-800 hover:bg-slate-100'}" data-manufacturer="${Utils.escapeHTML(m)}">
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}">${logo}</span>
        <span class="truncate">${Utils.escapeHTML(m)}</span>
      </div>
    `;
  }).join("");

  // Bind click handlers
  container.querySelectorAll(".vreg-select-item").forEach(item => {
    item.addEventListener("click", () => {
      const make = item.dataset.manufacturer;
      VehicleSelectorState.selectedManufacturer = make;
      
      // Auto-cascade to first available model & variant
      const matching = allVehicles.filter(v => v.manufacturer === make);
      if (matching.length > 0) {
        if (!matching.some(v => v.category === VehicleSelectorState.selectedCategory)) {
          VehicleSelectorState.selectedCategory = matching[0].category || "";
        }
        const modelMatch = matching.filter(v => !VehicleSelectorState.selectedCategory || v.category === VehicleSelectorState.selectedCategory);
        if (modelMatch.length > 0) {
          VehicleSelectorState.selectedModel = modelMatch[0].model;
          VehicleSelectorState.selectedVariant = modelMatch[0].variant;
          VehicleSelectorState.selectedVehicle = modelMatch[0];
        }
      }

      renderManufacturersList();
      renderCategoriesList();
      renderModelsList();
      renderVariantsList();
      updateVehicleDetailsPreview();
    });
  });
}

/**
 * Render Category List (Column 2)
 */
function renderCategoriesList() {
  const container = document.getElementById("vreg-categories-list");
  if (!container) return;

  const allVehicles = getAllAvailableVehicles();
  const search = (VehicleSelectorState.searchCategory || "").toLowerCase().trim();

  // Categories available for selected manufacturer (or all)
  const relevantVehicles = VehicleSelectorState.selectedManufacturer 
    ? allVehicles.filter(v => v.manufacturer === VehicleSelectorState.selectedManufacturer)
    : allVehicles;

  const allCategories = [
    "Heavy Truck",
    "Medium Truck",
    "Light Truck",
    "Mini Truck",
    "Pickup",
    "Tractor Head / Prime Mover",
    "Tipper",
    "Cargo Truck",
    "Multi-Axle Truck",
    "Trailer",
    "Electric Truck",
    "CNG Truck",
    "LNG Truck"
  ];

  const availableInDataset = Array.from(new Set(relevantVehicles.map(v => v.category).filter(Boolean)));
  const combinedCategories = Array.from(new Set([...availableInDataset, ...allCategories]));
  const filtered = combinedCategories.filter(c => !search || c.toLowerCase().includes(search));

  const categoryIcons = {
    "Heavy Truck": "🚛",
    "Medium Truck": "🚚",
    "Light Truck": "🛻",
    "Mini Truck": "🛻",
    "Pickup": "🛻",
    "Tractor Head / Prime Mover": "🚛",
    "Tipper": "🚜",
    "Cargo Truck": "🚚",
    "Multi-Axle Truck": "🚛",
    "Trailer": "🚛",
    "Electric Truck": "⚡",
    "CNG Truck": "🌱",
    "LNG Truck": "💧"
  };

  container.innerHTML = filtered.map(cat => {
    const isSelected = cat === VehicleSelectorState.selectedCategory;
    const isAvailable = availableInDataset.includes(cat);
    const icon = categoryIcons[cat] || "🚚";
    return `
      <div class="vreg-select-item flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected ? 'active bg-orange-500 text-white shadow-xs' : (isAvailable ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-50 opacity-60')}" data-category="${Utils.escapeHTML(cat)}">
        <div class="flex items-center gap-2.5 truncate">
          <span>${icon}</span>
          <span class="truncate">${Utils.escapeHTML(cat)}</span>
        </div>
        ${isAvailable ? `<span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}"></span>` : ''}
      </div>
    `;
  }).join("");

  container.querySelectorAll(".vreg-select-item").forEach(item => {
    item.addEventListener("click", () => {
      const cat = item.dataset.category;
      VehicleSelectorState.selectedCategory = cat;

      // Update matching model & variant
      const matching = allVehicles.filter(v => 
        (!VehicleSelectorState.selectedManufacturer || v.manufacturer === VehicleSelectorState.selectedManufacturer) &&
        v.category === cat
      );
      if (matching.length > 0) {
        VehicleSelectorState.selectedModel = matching[0].model;
        VehicleSelectorState.selectedVariant = matching[0].variant;
        VehicleSelectorState.selectedVehicle = matching[0];
      }

      renderCategoriesList();
      renderModelsList();
      renderVariantsList();
      updateVehicleDetailsPreview();
    });
  });
}

/**
 * Render Model List (Column 3)
 */
function renderModelsList() {
  const container = document.getElementById("vreg-models-list");
  if (!container) return;

  const allVehicles = getAllAvailableVehicles();
  const search = (VehicleSelectorState.searchModel || "").toLowerCase().trim();

  // Filter vehicles by manufacturer and/or category
  let matchingVehicles = allVehicles;
  if (VehicleSelectorState.selectedManufacturer) {
    matchingVehicles = matchingVehicles.filter(v => v.manufacturer === VehicleSelectorState.selectedManufacturer);
  }
  if (VehicleSelectorState.selectedCategory) {
    const catMatches = matchingVehicles.filter(v => v.category === VehicleSelectorState.selectedCategory);
    if (catMatches.length > 0) {
      matchingVehicles = catMatches;
    }
  }

  const models = Array.from(new Set(matchingVehicles.map(v => v.model).filter(Boolean))).sort();
  const filtered = models.filter(m => !search || m.toLowerCase().includes(search));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        No model found.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(model => {
    const isSelected = model === VehicleSelectorState.selectedModel;
    return `
      <div class="vreg-select-item flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected ? 'active bg-orange-500 text-white shadow-xs' : 'text-slate-800 hover:bg-slate-100'}" data-model="${Utils.escapeHTML(model)}">
        <span class="truncate">${Utils.escapeHTML(model)}</span>
        ${isSelected ? `<span class="text-white text-xs">✓</span>` : ''}
      </div>
    `;
  }).join("");

  container.querySelectorAll(".vreg-select-item").forEach(item => {
    item.addEventListener("click", () => {
      const m = item.dataset.model;
      VehicleSelectorState.selectedModel = m;

      const variants = allVehicles.filter(v => v.model === m);
      if (variants.length > 0) {
        VehicleSelectorState.selectedVariant = variants[0].variant;
        VehicleSelectorState.selectedVehicle = variants[0];
      }

      renderModelsList();
      renderVariantsList();
      updateVehicleDetailsPreview();
    });
  });
}

/**
 * Render Variant List (Column 4)
 */
function renderVariantsList() {
  const container = document.getElementById("vreg-variants-list");
  if (!container) return;

  const allVehicles = getAllAvailableVehicles();
  const search = (VehicleSelectorState.searchVariant || "").toLowerCase().trim();

  let matching = allVehicles;
  if (VehicleSelectorState.selectedModel) {
    matching = matching.filter(v => v.model === VehicleSelectorState.selectedModel);
  }

  const variants = matching.filter(v => !search || (v.variant || "").toLowerCase().includes(search) || (v.payload || "").toLowerCase().includes(search));

  if (variants.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        No variant found for selected model.
      </div>
    `;
    return;
  }

  container.innerHTML = variants.map(v => {
    const isSelected = v.variant === VehicleSelectorState.selectedVariant;
    return `
      <div class="vreg-select-item flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected ? 'active bg-orange-500 text-white shadow-xs' : 'text-slate-800 hover:bg-slate-100'}" data-variant="${Utils.escapeHTML(v.variant)}" data-id="${Utils.escapeHTML(v.id)}">
        <span class="truncate">${Utils.escapeHTML(v.variant)}</span>
        <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200'}">${v.payload || '28T'}</span>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".vreg-select-item").forEach(item => {
    item.addEventListener("click", () => {
      const varName = item.dataset.variant;
      const vehId = item.dataset.id;
      VehicleSelectorState.selectedVariant = varName;
      VehicleSelectorState.selectedVehicle = allVehicles.find(v => v.id === vehId) || allVehicles.find(v => v.variant === varName);

      renderVariantsList();
      updateVehicleDetailsPreview();
    });
  });
}

/**
 * Update Right Preview Card & Form Inputs
 */
function updateVehicleDetailsPreview() {
  const allVehicles = getAllAvailableVehicles();
  let vehicle = VehicleSelectorState.selectedVehicle;

  if (!vehicle) {
    vehicle = allVehicles.find(v => 
      v.manufacturer === VehicleSelectorState.selectedManufacturer &&
      v.model === VehicleSelectorState.selectedModel &&
      v.variant === VehicleSelectorState.selectedVariant
    ) || allVehicles[0];
    VehicleSelectorState.selectedVehicle = vehicle;
  }

  if (!vehicle) return;

  // Header and preview elements
  const titleEl = document.getElementById("vreg-preview-title");
  const badgeEl = document.getElementById("vreg-preview-badge");
  const catEl = document.getElementById("vreg-spec-category");
  const gvwEl = document.getElementById("vreg-spec-gvw");
  const payloadEl = document.getElementById("vreg-spec-payload");
  const fuelEl = document.getElementById("vreg-spec-fuel");
  const powerEl = document.getElementById("vreg-spec-powertrain");
  const engineEl = document.getElementById("vreg-spec-engine");
  const hpEl = document.getElementById("vreg-spec-hp");
  const axlesEl = document.getElementById("vreg-spec-axles");
  const transEl = document.getElementById("vreg-spec-trans");
  const wbEl = document.getElementById("vreg-spec-wheelbase");

  if (titleEl) titleEl.textContent = `${vehicle.manufacturer} ${vehicle.model}`;
  if (badgeEl) badgeEl.textContent = vehicle.variant || `${vehicle.payload || '28T'} Payload`;
  if (catEl) catEl.textContent = vehicle.category || "Commercial Carrier";
  if (gvwEl) gvwEl.textContent = vehicle.gvw || "55T";
  if (payloadEl) payloadEl.textContent = vehicle.payload || "28T";
  if (fuelEl) fuelEl.textContent = vehicle.fuelType || "Diesel";
  if (powerEl) powerEl.textContent = vehicle.powertrain || "Diesel BS-VI";
  if (engineEl) engineEl.textContent = vehicle.engine || "Cummins ISBe 6.7L Turbo";
  if (hpEl) hpEl.textContent = vehicle.horsepower || "280 HP";
  if (axlesEl) axlesEl.textContent = String(vehicle.axles || 4);
  if (transEl) transEl.textContent = vehicle.transmission || "Manual (9 Speed)";
  if (wbEl) wbEl.textContent = vehicle.wheelbase || "5300 mm";

  // Form elements synchronization
  const formPowertrain = document.getElementById("vreg-form-powertrain");
  if (formPowertrain && vehicle.powertrain) {
    formPowertrain.value = vehicle.powertrain;
  }
}

/**
 * Render Registered Vehicles List in Right Sidebar
 */
function renderRegisteredVehiclesList() {
  const container = document.getElementById("vreg-registered-list");
  const countBadge = document.getElementById("vreg-registered-count-badge");
  if (!container) return;

  loadRegisteredVehicles();
  if (countBadge) countBadge.textContent = String(registeredVehiclesList.length);

  if (registeredVehiclesList.length === 0) {
    container.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        No trucks registered yet. Fill out the details to register your first truck.
      </div>
    `;
    return;
  }

  container.innerHTML = registeredVehiclesList.map((truck) => `
    <div class="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-orange-300 transition-all flex items-center justify-between gap-3 text-left">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg font-bold shrink-0">
          🚛
        </div>
        <div class="min-w-0">
          <div class="font-black text-xs text-slate-900 font-mono tracking-tight truncate">${Utils.escapeHTML(truck.plate)}</div>
          <div class="text-[10px] text-slate-500 font-medium truncate">${Utils.escapeHTML(truck.model || truck.name || 'Tata Prima 5530.S')} • ${Utils.escapeHTML(truck.variant || 'Heavy Trailer')}</div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">Active</span>
        <button type="button" class="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs cursor-pointer border-none bg-transparent" title="Options" onclick="handleRegisteredTruckAction('${Utils.escapeHTML(truck.plate)}')">
          ⋮
        </button>
      </div>
    </div>
  `).join("");
}

/**
 * Handle Registered Truck Context Action
 */
function handleRegisteredTruckAction(plate) {
  const truck = registeredVehiclesList.find(t => t.plate === plate);
  if (!truck) return;
  const action = confirm(`Truck ${truck.plate} (${truck.model})\n\nClick OK to select this vehicle for current dispatch, or Cancel to keep.`);
  if (action && window.App) {
    window.App.userSession = window.App.userSession || {};
    window.App.userSession.vehicleReg = truck.plate;
    window.App.userSession.vehicleName = truck.model;
    StorageEngine.saveDriverTruck(window.App.userSession.id || "current", truck);
    UIManager.showToast(`Selected ${truck.plate} as active operating truck!`, "success");
    window.App.updateAllUI();
  }
}

/**
 * Bind Search Inputs and Form Submission
 */
function bindVehicleSelectorEvents() {
  // Manufacturer search input
  const makeSearch = document.getElementById("vreg-search-manufacturer");
  if (makeSearch) {
    makeSearch.addEventListener("input", (e) => {
      VehicleSelectorState.searchManufacturer = e.target.value;
      renderManufacturersList();
    });
  }

  // Category search input
  const catSearch = document.getElementById("vreg-search-category");
  if (catSearch) {
    catSearch.addEventListener("input", (e) => {
      VehicleSelectorState.searchCategory = e.target.value;
      renderCategoriesList();
    });
  }

  // Model search input
  const modelSearch = document.getElementById("vreg-search-model");
  if (modelSearch) {
    modelSearch.addEventListener("input", (e) => {
      VehicleSelectorState.searchModel = e.target.value;
      renderModelsList();
    });
  }

  // Variant search input
  const varSearch = document.getElementById("vreg-search-variant");
  if (varSearch) {
    varSearch.addEventListener("input", (e) => {
      VehicleSelectorState.searchVariant = e.target.value;
      renderVariantsList();
    });
  }

  // Save Truck Information Form Submission
  const form = document.getElementById("form-register-new-truck");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSaveTruckInformation();
    });
  }
}

/**
 * Handle Save Truck Information
 */
function handleSaveTruckInformation() {
  const plateInput = document.getElementById("vreg-form-plate");
  const powerSelect = document.getElementById("vreg-form-powertrain");
  const fuelInput = document.getElementById("vreg-form-fuel");
  const availSelect = document.getElementById("vreg-form-availability");
  const notesInput = document.getElementById("vreg-form-notes");

  const plate = (plateInput?.value || "").trim().toUpperCase();
  if (!plate) {
    UIManager.showToast("Please enter a vehicle registration number (e.g. PB 10 CQ 4821)", "warning");
    if (plateInput) plateInput.focus();
    return;
  }

  const selectedVeh = VehicleSelectorState.selectedVehicle || getAllAvailableVehicles()[0];
  const fuelVal = Number(fuelInput?.value) || 85;

  const newRegisteredTruck = {
    id: `REG-${Date.now().toString().slice(-6)}`,
    plate: plate,
    manufacturer: selectedVeh.manufacturer,
    model: selectedVeh.model,
    variant: selectedVeh.variant,
    category: selectedVeh.category,
    powertrain: powerSelect?.value || selectedVeh.powertrain,
    gvw: selectedVeh.gvw,
    payload: selectedVeh.payload,
    payloadKg: selectedVeh.payloadKg || 28000,
    fuelLevel: Math.min(100, Math.max(0, fuelVal)),
    status: availSelect?.value || "Available",
    notes: (notesInput?.value || "").trim(),
    engine: selectedVeh.engine,
    horsepower: selectedVeh.horsepower,
    registeredAt: Date.now()
  };

  saveRegisteredVehicle(newRegisteredTruck);
  renderRegisteredVehiclesList();

  // Update App and Driver Session
  if (window.App) {
    if (window.App.userSession) {
      window.App.userSession.vehicleId = newRegisteredTruck.id;
      window.App.userSession.vehicleReg = newRegisteredTruck.plate;
      window.App.userSession.vehicleName = `${newRegisteredTruck.manufacturer} ${newRegisteredTruck.model}`;
      StorageEngine.saveUserSession(window.App.userSession, true);
    }
    StorageEngine.saveDriverTruck(window.App.userSession?.id || "current", newRegisteredTruck);
    window.App.updateAllUI();
  }

  UIManager.playSound("success");
  UIManager.showToast(`🎉 Truck ${plate} (${selectedVeh.model}) registered successfully!`, "success");
}

/**
 * Open Custom Vehicle Modal
 */
function openAddCustomVehicleModal() {
  const modal = document.getElementById("modal-add-custom-vehicle");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

/**
 * Close Custom Vehicle Modal
 */
function closeAddCustomVehicleModal() {
  const modal = document.getElementById("modal-add-custom-vehicle");
  if (modal) {
    modal.classList.add("hidden");
  }
}

/**
 * Save Custom Vehicle from Modal Form
 */
function handleSaveCustomVehicleForm(e) {
  if (e && e.preventDefault) e.preventDefault();

  const makeInput = document.getElementById("cust-veh-make");
  const modelInput = document.getElementById("cust-veh-model");
  const variantInput = document.getElementById("cust-veh-variant");
  const catSelect = document.getElementById("cust-veh-category");
  const payloadInput = document.getElementById("cust-veh-payload");
  const powerSelect = document.getElementById("cust-veh-powertrain");
  const engineInput = document.getElementById("cust-veh-engine");
  const hpInput = document.getElementById("cust-veh-hp");
  const axlesInput = document.getElementById("cust-veh-axles");

  const make = (makeInput?.value || "").trim();
  const model = (modelInput?.value || "").trim();
  const variant = (variantInput?.value || "").trim();
  const category = (catSelect?.value || "Heavy Truck").trim();
  const payload = (payloadInput?.value || "20T").trim();
  const powertrain = (powerSelect?.value || "Diesel BS-VI").trim();

  if (!make || !model || !variant) {
    UIManager.showToast("Please fill in Manufacturer, Model, and Variant names.", "warning");
    return;
  }

  const customObj = {
    id: `custom-${Date.now()}`,
    manufacturer: make,
    model: model,
    variant: variant,
    category: category,
    gvw: `${Number(payload.replace(/\D/g, '') || 20) + 12}T`,
    payload: payload,
    payloadKg: (Number(payload.replace(/\D/g, '') || 20)) * 1000,
    fuelType: powertrain.includes("Electric") ? "Electric" : (powertrain.includes("CNG") ? "CNG" : "Diesel"),
    powertrain: powertrain,
    engine: (engineInput?.value || "Turbocharged Intercooled").trim(),
    horsepower: (hpInput?.value || "240 HP").trim(),
    axles: Number(axlesInput?.value) || 3,
    transmission: "Manual (6 Speed)",
    wheelbase: "4800 mm",
    efficiency: 5.0,
    costPerKm: 22.0,
    isCustom: true,
    icon: "🚛"
  };

  saveCustomVehicle(customObj);
  closeAddCustomVehicleModal();

  // Set active selection to newly added custom vehicle
  VehicleSelectorState.selectedManufacturer = make;
  VehicleSelectorState.selectedCategory = category;
  VehicleSelectorState.selectedModel = model;
  VehicleSelectorState.selectedVariant = variant;
  VehicleSelectorState.selectedVehicle = customObj;

  initializeVehicleSelector();
  UIManager.playSound("success");
  UIManager.showToast(`✨ Custom vehicle '${make} ${model}' added to catalog!`, "success");
}

// Auto-boot on DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
  loadVehicleCatalog();
});

// Export globally
window.loadVehicleCatalog = loadVehicleCatalog;
window.initializeVehicleSelector = initializeVehicleSelector;
window.openAddCustomVehicleModal = openAddCustomVehicleModal;
window.closeAddCustomVehicleModal = closeAddCustomVehicleModal;
window.handleSaveCustomVehicleForm = handleSaveCustomVehicleForm;
window.handleRegisteredTruckAction = handleRegisteredTruckAction;
