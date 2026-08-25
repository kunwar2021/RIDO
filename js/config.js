/**
 * ==============================================================================
 * RIDO — Centralized System Configuration (`config.js`)
 * ==============================================================================
 * Centralizes all magic numbers, API endpoints, economic parameters, map
 * provider settings, and default data structures into single-source constants.
 */

const CONFIG = {
  // Application Metadata
  APP_NAME: "RIDO",
  APP_VERSION: "7.0.0",
  STORAGE_KEY: "rido_state_v1",
  SESSION_STORAGE_KEY: "rido_current_user",
  DRIVER_ACCOUNTS_KEY: "rido_driver_accounts",
  COMPANY_ACCOUNTS_KEY: "rido_company_accounts",
  DEMO_SESSION_KEY: "rido_demo_session",
  ACTIVE_TRIP_KEY: "rido_active_trip",
  
  // Admin Storage Keys
  ADMIN_SESSION_KEY: "rido_admin_session",
  ADMIN_DATA_KEY: "rido_admin_data",
  ADMIN_ACTIVITY_KEY: "rido_admin_activity",
  ADMIN_ALERTS_KEY: "rido_admin_alerts",

  TRIP_STATUS: {
    CREATED: "CREATED",
    ASSIGNED: "ASSIGNED",
    ACCEPTED: "ACCEPTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED"
  },
  LEGACY_STORAGE_KEYS: ["rido_user_session", "routesaathi_state_v1", "optipath_data_v5", "optipath_data_v4", "optipath_data_v3"],

  // External APIs & Network Endpoints
  API: {
    OSRM_ROUTING_BASE: "https://router.project-osrm.org/route/v1/driving",
    INDIA_POST_BASE: "https://api.postalpincode.in/pincode",
    NOMINATIM_GEOCODING_BASE: "https://nominatim.openstreetmap.org/search",
    OVERPASS_FUEL_BASE: "https://overpass-api.de/api/interpreter",
    REQUEST_TIMEOUT_MS: 10000,
    GEOCODE_DEBOUNCE_MS: 280
  },

  // Traffic Provider Architecture (TomTom / HERE / Simulation)
  TRAFFIC: {
    enabled: false,
    provider: "tomtom",
    apiKey: ""
  },

  // Map Tile Providers & Layers (Google Maps Engine with CARTO/OSM Fallback)
  MAP: {
    DEFAULT_CENTER: [28.6139, 77.2090], // New Delhi Logistics Hub
    DEFAULT_ZOOM: 11,
    TILES: {
      STREETS: {
        URL: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        SUBDOMAINS: ["mt0", "mt1", "mt2", "mt3"],
        ATTRIBUTION: '&copy; Google Maps &bull; RIDO Logistics Corridor Data',
        MAX_ZOOM: 20
      },
      SATELLITE: {
        URL: "https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}",
        SUBDOMAINS: ["mt0", "mt1", "mt2", "mt3"],
        ATTRIBUTION: '&copy; Google Satellite Imagery &bull; RIDO Telemetry Engine',
        MAX_ZOOM: 20
      },
      TERRAIN: {
        URL: "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
        SUBDOMAINS: ["mt0", "mt1", "mt2", "mt3"],
        ATTRIBUTION: '&copy; Google Maps Terrain &bull; Elevation Matrix',
        MAX_ZOOM: 20
      },
      DARK: {
        URL: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        SUBDOMAINS: ["a", "b", "c", "d"],
        ATTRIBUTION: '&copy; CARTO Dark &bull; OpenStreetMap contributors',
        MAX_ZOOM: 19
      }
    }
  },

  // Economic Baseline Constants & Thermodynamics OpEx Model
  ECONOMICS: {
    DEFAULT_DIESEL_PRICE_PER_LITER: 0.0, // INR ₹/L
    DEFAULT_ELECTRICITY_PRICE_PER_KWH: 0.0, // INR ₹/kWh
    DEFAULT_AVG_HIGHWAY_SPEED_KMH: 0.0, // km/h
    DEFAULT_STOP_SERVICE_MINUTES: 0, // minutes per delivery drop
    CO2_KG_PER_LITER_DIESEL: 0.0, // kg CO2 per liter burned
    DRIVER_ALLOWANCE_PER_KM: 0.0, // INR ₹ per km
    DRIVER_ALLOWANCE_PER_STOP: 0.0, // INR ₹ per drop handling
    FASTAG_TOLL_RATE_PER_50KM: 0.0, // Average commercial FASTag toll rate
    MAINTENANCE_COST_PER_KM_ICE: 0.0, // INR ₹/km ICE maintenance
    MAINTENANCE_COST_PER_KM_EV: 0.0 // INR ₹/km EV maintenance
  },

  // Algorithmic Solver Constants
  SOLVER: {
    MAX_2OPT_ITERATIONS: 350,
    URGENT_PRIORITY_WEIGHT_FACTOR: 0.65,
    HIGH_PRIORITY_WEIGHT_FACTOR: 0.82,
    DISTANCE_TOLERANCE_KM: 0.001,
    RANGE_SAFETY_BUFFER_PERCENT: 1.15 // 15% battery/fuel reserve
  },

  // Vehicle Category Default Presets
  VEHICLE_PRESETS: {
    "Electric Van": { powertrain: "Electric (EV)", payloadMax: 750, efficiency: 6.2, costPerKm: 4.2, icon: "⚡" },
    "Mini Truck": { powertrain: "Diesel", payloadMax: 1200, efficiency: 14.5, costPerKm: 8.5, icon: "🚚" },
    "Delivery Van": { powertrain: "Diesel", payloadMax: 1400, efficiency: 12.0, costPerKm: 10.5, icon: "🚐" },
    "3-Wheeler": { powertrain: "Electric (EV)", payloadMax: 450, efficiency: 8.5, costPerKm: 3.8, icon: "🛺" },
    "Cargo Bike": { powertrain: "Electric (EV)", payloadMax: 50, efficiency: 30.0, costPerKm: 1.8, icon: "🏍️" },
    "Heavy Truck": { powertrain: "Diesel", payloadMax: 18000, efficiency: 5.2, costPerKm: 22.0, icon: "🚛" }
  },

  // Telemetry & Environment Metadata
  ENV: {
    IS_PRODUCTION: typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1",
    TELEMETRY_REFRESH_INTERVAL_MS: 3000,
    ANIMATION_SMOOTHING_FACTOR: 0.15,
    GEO_SEARCH_DEBOUNCE_MS: 300
  }
};

window.CONFIG = CONFIG;

