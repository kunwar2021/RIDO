/**
 * ==============================================================================
 * RIDO — Centralized Storage Engine & State Persistence (`storage.js`)
 * ==============================================================================
 * Handles loading, saving, migration, accounts management, and export/import in localStorage.
 */

const StorageEngine = {
  /**
   * Loads application state from localStorage. Returns clean empty state if not present.
   */
  loadState(defaultData) {
    try {
      const rawCurrent = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (rawCurrent) {
        const parsed = JSON.parse(rawCurrent);
        if (parsed && parsed.data) {
          if (!Array.isArray(parsed.data.vehicles)) parsed.data.vehicles = [];
          if (!Array.isArray(parsed.data.trips)) parsed.data.trips = [];
          if (!Array.isArray(parsed.data.stops)) parsed.data.stops = [];
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[RIDO Storage] Error reading from localStorage:", err);
    }

    const emptyState = {
      data: {
        user: null,
        vehicles: [],
        trips: [],
        routes: [],
        fastags: [],
        manifests: [],
        notifications: [],
        activeTrip: null,
        settings: {
          currency: "₹",
          distanceUnit: "km",
          fuelPrice: 0,
          avgSpeed: 0,
          fastagRate: 0,
          driverBata: 0,
          maintenanceCost: 0,
          companyMargin: 0,
          driverEarning: 0
        }
      },
      optimizerState: {
        origin: "",
        destination: "",
        waypoints: [],
        selectedVehicleId: "",
        payloadKg: 0,
        freightType: "General Cargo",
        calculatedTrip: null
      },
      simState: null
    };
    this.saveState(emptyState);
    return emptyState;
  },

  /**
   * Persists the complete active state into localStorage
   */
  saveState(state) {
    try {
      if (!state || !state.data) return;
      const payload = {
        version: CONFIG.APP_VERSION,
        timestamp: Date.now(),
        data: state.data,
        optimizerState: state.optimizerState || null,
        simState: state.simState || null
      };
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error("[RIDO Storage] Failed to write to localStorage:", err);
    }
  },

  /**
   * Driver Accounts Management (localStorage: rido_driver_accounts)
   */
  getDriverAccounts() {
    try {
      const raw = localStorage.getItem(CONFIG.DRIVER_ACCOUNTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  },

  saveDriverAccounts(accounts) {
    try {
      localStorage.setItem(CONFIG.DRIVER_ACCOUNTS_KEY, JSON.stringify(accounts || []));
    } catch (e) {
      console.error("[RIDO Storage] Failed to save driver accounts:", e);
    }
  },

  findDriverAccount(mobile) {
    const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);
    if (!cleanMobile) return null;
    const accounts = this.getDriverAccounts();
    return accounts.find((a) => (a.mobile || "").replace(/\D/g, "").slice(-10) === cleanMobile) || null;
  },

  addDriverAccount(account) {
    const accounts = this.getDriverAccounts();
    accounts.push(account);
    this.saveDriverAccounts(accounts);
    return account;
  },

  /**
   * Company Accounts Management (localStorage: rido_company_accounts)
   */
  getCompanyAccounts() {
    try {
      const raw = localStorage.getItem(CONFIG.COMPANY_ACCOUNTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  },

  saveCompanyAccounts(accounts) {
    try {
      localStorage.setItem(CONFIG.COMPANY_ACCOUNTS_KEY, JSON.stringify(accounts || []));
    } catch (e) {
      console.error("[RIDO Storage] Failed to save company accounts:", e);
    }
  },

  findCompanyAccount(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, "").slice(-10);
    const accounts = this.getCompanyAccounts();
    return (
      accounts.find((a) => {
        const accEmail = (a.email || "").trim().toLowerCase();
        const accMobile = (a.mobile || "").replace(/\D/g, "").slice(-10);
        return accEmail === clean || (cleanDigits && accMobile === cleanDigits);
      }) || null
    );
  },

  addCompanyAccount(account) {
    const accounts = this.getCompanyAccounts();
    accounts.push(account);
    this.saveCompanyAccounts(accounts);
    return account;
  },

  /**
   * Active User Session Management (localStorage / sessionStorage: rido_current_user)
   */
  loadUserSession() {
    try {
      let raw = null;
      try { raw = sessionStorage.getItem(CONFIG.SESSION_STORAGE_KEY); } catch (e) {}
      if (!raw) {
        try { raw = localStorage.getItem(CONFIG.SESSION_STORAGE_KEY); } catch (e) {}
      }
      if (!raw) return null;

      const session = JSON.parse(raw);
      // Validate session structure to prevent corrupted sessions
      if (
        !session ||
        typeof session !== "object" ||
        !session.id ||
        !session.name ||
        !session.role ||
        !["driver", "company"].includes(session.role)
      ) {
        console.warn("[RIDO Storage] Malformed session detected and cleared:", session);
        this.clearUserSession();
        return null;
      }
      return session;
    } catch (e) {
      this.clearUserSession();
      return null;
    }
  },

  saveUserSession(session, rememberMe = true) {
    try {
      if (!session) {
        this.clearUserSession();
        return;
      }
      const serialized = JSON.stringify(session);
      if (rememberMe) {
        try { localStorage.setItem(CONFIG.SESSION_STORAGE_KEY, serialized); } catch (e) {}
        try { sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEY); } catch (e) {}
      } else {
        try { sessionStorage.setItem(CONFIG.SESSION_STORAGE_KEY, serialized); } catch (e) {}
        try { localStorage.removeItem(CONFIG.SESSION_STORAGE_KEY); } catch (e) {}
      }
    } catch (e) {
      console.error("[RIDO Storage] Failed to save session:", e);
    }
  },

  clearUserSession() {
    try {
      try { localStorage.removeItem(CONFIG.SESSION_STORAGE_KEY); } catch (e) {}
      try { sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEY); } catch (e) {}
      try { localStorage.removeItem(CONFIG.DEMO_SESSION_KEY); } catch (e) {}
      try { sessionStorage.removeItem(CONFIG.DEMO_SESSION_KEY); } catch (e) {}
    } catch (e) {}
  },

  saveDemoSession(demoState) {
    try {
      if (demoState) {
        localStorage.setItem(CONFIG.DEMO_SESSION_KEY, JSON.stringify(demoState));
      } else {
        localStorage.removeItem(CONFIG.DEMO_SESSION_KEY);
      }
    } catch (e) {}
  },

  loadDemoSession() {
    try {
      const raw = localStorage.getItem(CONFIG.DEMO_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Driver Truck Registration & Management (localStorage: rido_driver_trucks)
   */
  getDriverTruck(driverId = "current") {
    try {
      const trucks = JSON.parse(localStorage.getItem("rido_driver_trucks") || "{}");
      return trucks[driverId] || null;
    } catch (e) {
      return null;
    }
  },

  saveDriverTruck(driverId, truckData) {
    try {
      const trucks = JSON.parse(localStorage.getItem("rido_driver_trucks") || "{}");
      trucks[driverId] = {
        ...truckData,
        driverId: driverId,
        updatedAt: Date.now()
      };
      localStorage.setItem("rido_driver_trucks", JSON.stringify(trucks));
      return trucks[driverId];
    } catch (e) {
      console.error("[RIDO Storage] Failed to save driver truck:", e);
      return null;
    }
  },

  getAllDriverTrucks() {
    try {
      return JSON.parse(localStorage.getItem("rido_driver_trucks") || "{}");
    } catch (e) {
      return {};
    }
  },

  /**
   * Active Shared Trip Management (localStorage: rido_active_trip)
   * Connects Company Dispatch <-> Driver Execution
   */
  getDefaultActiveTrip() {
    return null;
  },

  loadActiveTrip() {
    try {
      const raw = localStorage.getItem(CONFIG.ACTIVE_TRIP_KEY);
      if (raw) {
        const trip = JSON.parse(raw);
        if (trip && trip.tripId && trip.tripId !== "TRIP-DEL-MUM-402" && trip.origin && trip.destination) {
          return trip;
        } else if (trip && (trip.tripId === "TRIP-DEL-MUM-402" || !trip.origin || !trip.destination)) {
          localStorage.removeItem(CONFIG.ACTIVE_TRIP_KEY);
        }
      }
    } catch (e) {}
    return null;
  },

  saveActiveTrip(trip) {
    try {
      if (trip) {
        localStorage.setItem(CONFIG.ACTIVE_TRIP_KEY, JSON.stringify(trip));
        // Dispatch storage event for same-window reactive listeners
        window.dispatchEvent(new CustomEvent("rido:active_trip_updated", { detail: trip }));
      } else {
        localStorage.removeItem(CONFIG.ACTIVE_TRIP_KEY);
        window.dispatchEvent(new CustomEvent("rido:active_trip_updated", { detail: null }));
      }
    } catch (e) {
      console.error("[RIDO Storage] Failed to save active trip:", e);
    }
  },

  updateTripStatus(status, updateData = {}) {
    const active = this.loadActiveTrip();
    if (!active) return null;
    const updated = {
      ...active,
      ...updateData,
      status: status,
      updatedAt: Date.now()
    };
    this.saveActiveTrip(updated);
    return updated;
  },

  completeActiveTrip() {
    const active = this.loadActiveTrip();
    if (!active) return null;
    const completed = {
      ...active,
      status: CONFIG.TRIP_STATUS.COMPLETED,
      completedAt: Date.now(),
      progress: 100
    };
    
    // Save to history
    try {
      const history = JSON.parse(localStorage.getItem("rido_trips_history") || "[]");
      history.unshift(completed);
      localStorage.setItem("rido_trips_history", JSON.stringify(history.slice(0, 50)));
    } catch (e) {}

    this.saveActiveTrip(null);
    return completed;
  },

  getTripsHistory() {
    try {
      return JSON.parse(localStorage.getItem("rido_trips_history") || "[]");
    } catch (e) {
      return [];
    }
  },

  /**
   * Configuration Backup Export
   */
  exportDataJSON(state) {
    try {
      const exportBlob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", URL.createObjectURL(exportBlob));
      downloadAnchor.setAttribute(
        "download",
        `RIDO_Fleet_Backup_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("[RIDO Storage] Export failed:", e);
    }
  },

  /**
   * Driver Fleet Support Requests (localStorage: rido_fleet_requests)
   */
  loadFleetRequests() {
    try {
      const raw = localStorage.getItem("rido_fleet_requests");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("[RIDO Storage] Failed to load fleet requests:", e);
      return [];
    }
  },

  saveFleetRequest(request) {
    try {
      const list = this.loadFleetRequests();
      list.unshift(request);
      localStorage.setItem("rido_fleet_requests", JSON.stringify(list));
      return list;
    } catch (e) {
      console.error("[RIDO Storage] Failed to save fleet request:", e);
      return [];
    }
  },

  /**
   * Admin Bridge: Log Activity & Alerts
   */
  logAdminActivity(eventText, userOrRole = "System") {
    try {
      const raw = localStorage.getItem(CONFIG.ADMIN_ACTIVITY_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: "ACT-" + Date.now(),
        timestamp: Date.now(),
        event: eventText,
        user: userOrRole,
        status: "Info"
      });
      // Keep last 100
      if (list.length > 100) list.pop();
      localStorage.setItem(CONFIG.ADMIN_ACTIVITY_KEY, JSON.stringify(list));
    } catch (e) {}
  },

  addAdminAlert(title, severity = "Medium", description = "") {
    try {
      const raw = localStorage.getItem(CONFIG.ADMIN_ALERTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: "ALT-" + Date.now(),
        timestamp: Date.now(),
        title,
        severity,
        description,
        status: "Active"
      });
      localStorage.setItem(CONFIG.ADMIN_ALERTS_KEY, JSON.stringify(list));
    } catch (e) {}
  },

  /**
   * Returns approximate LocalStorage footprint in kilobytes.
   */
  getStorageUsageKB() {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalBytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
        }
      }
      return +(totalBytes / 1024).toFixed(2);
    } catch (e) {
      return 0;
    }
  }
};

window.StorageEngine = StorageEngine;

