/**
 * ==============================================================================
 * RIDO — Centralized Application State Container (`state.js`)
 * ==============================================================================
 * Single-source of truth for application state, avoiding duplicate or
 * scattered state variables across modules.
 */

const AppState = {
  // Primary Business Datasets (Fleet, Depots, Stops, System Settings)
  data: {
    activeZone: "all_india",
    vehicles: [],
    depots: {},
    stops: [],
    trips: [],
    settings: {
      companyName: "RIDO Logistics & Delivery Fleet",
      currency: "₹",
      fuelPrice: 0,
      electricityPrice: 0,
      avgSpeed: 0,
      fastagRate: 0,
      driverBata: 0,
      returnToDepot: true,
      prioritizeUrgent: true,
      audioFeedback: true,
      theme: "light"
    }
  },

  // Active Route Optimizer Working State
  optimizer: {
    selectedVehicleId: "",
    selectedStartDepotId: "",
    selectedEndDepotId: "",
    customStartDepot: null,
    customEndDepot: null,
    routeCalculated: false,
    routeState: "EMPTY",
    routingScope: "intercity",
    selectedStopIds: [],
    originalSequence: [],
    optimizedSequence: [],
    originalStats: { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, tollCost: 0, driverAllowance: 0, maintenanceCost: 0 },
    optimizedStats: { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, tollCost: 0, driverAllowance: 0, maintenanceCost: 0 },
    savings: { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, percentage: 0 }
  },

  // What-If Scenario Sandbox Parameters
  simulator: {
    currentPreset: "fuel_spike",
    fuelPrice: 0,
    electricityPrice: 0,
    weightMultiplier: 1.0,
    availableFleetCount: 0
  },

  // Current User Session
  userSession: null,

  // Active View & Layer Flags
  activeView: "landing",

  // State Utilities & Predicates
  isRouteReady() {
    return !!(this.optimizer && this.optimizer.routeCalculated && this.optimizer.customStartDepot && this.optimizer.customEndDepot);
  },

  resetOptimizer() {
    this.optimizer.selectedVehicleId = "";
    this.optimizer.selectedStartDepotId = "";
    this.optimizer.selectedEndDepotId = "";
    this.optimizer.customStartDepot = null;
    this.optimizer.customEndDepot = null;
    this.optimizer.routeCalculated = false;
    this.optimizer.routeState = "EMPTY";
    this.optimizer.selectedStopIds = [];
    this.optimizer.originalSequence = [];
    this.optimizer.optimizedSequence = [];
    this.optimizer.savings = { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, percentage: 0 };
  }
};

window.AppState = AppState;

