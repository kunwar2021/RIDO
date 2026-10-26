/**
 * ==============================================================================
 * RIDO — Common Reusable Utility Functions (`utils.js`)
 * ==============================================================================
 * Pure helper functions for formatting, geospatial math, fuzzy matching,
 * and event debouncing across all modules.
 */

const Utils = {
  isIndianCoordinate(lat, lng) {
    const nLat = Number(lat);
    const nLng = Number(lng);
    return Number.isFinite(nLat) && Number.isFinite(nLng) && nLat >= 6.0 && nLat <= 37.0 && nLng >= 68.0 && nLng <= 98.0;
  },

  // --------------------------------------------------------------------------
  // Currency & Numerical Formatting
  // --------------------------------------------------------------------------
  formatCurrency(amount, currency = "₹") {
    const num = Number(amount) || 0;
    return `${currency}${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatDistance(km) {
    const num = Number(km) || 0;
    return `${num.toFixed(1)} km`;
  },

  formatDuration(minutes) {
    const totalMinutes = Math.round(Number(minutes) || 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, "0")}m`;
    }
    return `${mins} mins`;
  },

  formatWeight(kg) {
    const num = Number(kg) || 0;
    return `${num.toLocaleString("en-IN")} kg`;
  },

  formatPercentage(pct) {
    const num = Number(pct) || 0;
    return `${num.toFixed(1)}%`;
  },

  // --------------------------------------------------------------------------
  // Geospatial Haversine Mathematical Model
  // --------------------------------------------------------------------------
  haversineDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) return 0;
    const earthRadiusKm = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  },

  // --------------------------------------------------------------------------
  // String Sanitation & Fuzzy Search Matching
  // --------------------------------------------------------------------------
  escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  fuzzyMatch(item, query) {
    if (!item || !query) return false;
    const cleanQuery = query.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (!cleanQuery) return false;

    const nameText = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const districtText = (item.district || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const stateText = (item.state || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const pinText = String(item.pincode || "");
    const addressText = (item.address || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // 1. Direct Substring Check
    if (
      nameText.includes(cleanQuery) ||
      districtText.includes(cleanQuery) ||
      stateText.includes(cleanQuery) ||
      pinText.includes(cleanQuery) ||
      addressText.includes(cleanQuery)
    ) {
      return true;
    }

    if (cleanQuery.length < 3) return false;

    // 2. Tokenized Prefix & Minor Typo Check
    const searchTargets = [
      (item.name || "").toLowerCase(),
      (item.district || "").toLowerCase(),
      (item.state || "").toLowerCase()
    ];

    for (const target of searchTargets) {
      const tokens = target.split(/[\s,()/-]+/);
      for (const token of tokens) {
        if (token.length >= 3) {
          if (token.startsWith(cleanQuery) || cleanQuery.startsWith(token)) return true;
          if (Math.abs(token.length - cleanQuery.length) <= 2) {
            let diffs = 0;
            const minLen = Math.min(token.length, cleanQuery.length);
            for (let k = 0; k < minLen; k++) {
              if (token[k] !== cleanQuery[k]) diffs++;
            }
            diffs += Math.abs(token.length - cleanQuery.length);
            if (diffs <= 2) return true;
          }
        }
      }
    }

    return false;
  },

  // --------------------------------------------------------------------------
  // Functional Utilities (Debounce & Clamping)
  // --------------------------------------------------------------------------
  debounce(func, wait = 280) {
    let timeoutId;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeoutId);
        func(...args);
      };
      clearTimeout(timeoutId);
      timeoutId = setTimeout(later, wait);
    };
  },

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  // --------------------------------------------------------------------------
  // Authentication, Mobile & Credential Validation
  // --------------------------------------------------------------------------
  normalizeIndianMobile(raw) {
    if (!raw) return { valid: false, normalized: "", error: "Mobile number is required." };
    const clean = String(raw).replace(/\D/g, "");
    const last10 = clean.slice(-10);
    if (last10.length !== 10) {
      return { valid: false, normalized: "", error: "Please enter a valid 10-digit mobile number." };
    }
    if (!/^[6-9]\d{9}$/.test(last10)) {
      return { valid: false, normalized: "", error: "Mobile number must start with 6, 7, 8, or 9." };
    }
    return { valid: true, normalized: last10, error: null };
  },

  validateEmail(raw) {
    if (!raw) return { valid: false, normalized: "", error: "Email address is required." };
    const clean = String(raw).trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(clean)) {
      return { valid: false, normalized: "", error: "Please enter a valid work email address." };
    }
    return { valid: true, normalized: clean, error: null };
  },

  validatePassword(raw) {
    if (!raw) return { valid: false, error: "Password is required." };
    const pass = String(raw);
    if (pass.length < 8) {
      return { valid: false, error: "Password must be at least 8 characters long." };
    }
    if (!/[A-Z]/.test(pass)) {
      return { valid: false, error: "Password must contain at least one uppercase letter (A-Z)." };
    }
    if (!/[a-z]/.test(pass)) {
      return { valid: false, error: "Password must contain at least one lowercase letter (a-z)." };
    }
    if (!/[0-9]/.test(pass)) {
      return { valid: false, error: "Password must contain at least one number (0-9)." };
    }
    return { valid: true, error: null };
  },

  validateName(raw) {
    if (!raw) return { valid: false, normalized: "", error: "Full name is required." };
    const clean = String(raw).trim();
    if (clean.length < 2) {
      return { valid: false, normalized: "", error: "Name must be at least 2 characters long." };
    }
    if (!/[a-zA-Z]/.test(clean)) {
      return { valid: false, normalized: "", error: "Name must contain alphabetic characters." };
    }
    return { valid: true, normalized: clean, error: null };
  },

  validateCompanyName(raw) {
    if (!raw) return { valid: false, normalized: "", error: "Company name is required." };
    const clean = String(raw).trim();
    if (clean.length < 2) {
      return { valid: false, normalized: "", error: "Company name must be at least 2 characters long." };
    }
    return { valid: true, normalized: clean, error: null };
  },

  async hashPassword(password, salt = "rido_salt_2026") {
    if (!password) return "";
    try {
      if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder();
        const data = enc.encode(salt + password);
        const hashBuf = await window.crypto.subtle.digest("SHA-256", data);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        return "sha256$" + salt + "$" + hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    return "plain$" + password;
  },

  async verifyPassword(enteredPassword, storedPassword) {
    if (!enteredPassword || !storedPassword) return false;
    // 1. Plaintext fallback (legacy demo accounts)
    if (storedPassword === enteredPassword) return true;
    if (storedPassword.startsWith("plain$") && storedPassword.slice(6) === enteredPassword) return true;
    
    // 2. SHA-256 Hash check
    if (storedPassword.startsWith("sha256$")) {
      const parts = storedPassword.split("$");
      if (parts.length === 3) {
        const salt = parts[1];
        const hash = await this.hashPassword(enteredPassword, salt);
        return hash === storedPassword;
      }
    }
    return false;
  },
};

window.Utils = Utils;
