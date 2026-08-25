/**
 * ==============================================================================
 * RIDO — UI Modals, Audio Synthesizer, Toast & Command Palette (`ui.js`)
 * ==============================================================================
 * Centralizes UI interactions: Toast alerts, Web Audio synthesizer effects,
 * Modal dialog management, Notification drawer, and Command Palette (⌘K).
 */

const UIManager = {
  audioCtx: null,

  init() {
    this.setupKeyboardShortcuts();
  },

  // --------------------------------------------------------------------------
  // Keyboard Shortcuts (⌘K Command Palette, Escape Modals)
  // --------------------------------------------------------------------------
  setupKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.openCommandPalette();
      }
      if (e.key === "Escape") {
        this.closeModals();
      }
    });
  },

  // --------------------------------------------------------------------------
  // Web Audio Synthesizer Effects
  // --------------------------------------------------------------------------
  playSound(type = "click") {
    try {
      if (!window.App?.data?.settings?.audioFeedback) return;
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx || this.audioCtx.state === "suspended") {
        this.audioCtx?.resume();
      }
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === "success") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === "alert") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.setValueAtTime(180, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === "sweep") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {}
  },

  // --------------------------------------------------------------------------
  // Toast Alert Notification System
  // --------------------------------------------------------------------------
  showToast(message, type = "info", duration = 3500) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.setAttribute("aria-live", type === "error" ? "assertive" : "polite");

    let icon = "ℹ️";
    if (type === "success") icon = "✓";
    else if (type === "warn" || type === "warning") icon = "⚠️";
    else if (type === "error" || type === "danger") icon = "✕";

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-msg">${Utils.escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // --------------------------------------------------------------------------
  // Modal Dialog Lifecycle Management
  // --------------------------------------------------------------------------
  closeModals() {
    document.querySelectorAll(".modal-overlay").forEach((m) => {
      m.classList.add("hidden");
      m.setAttribute("aria-hidden", "true");
    });
    const notifDrawer = document.getElementById("modal-notifications");
    if (notifDrawer) {
      notifDrawer.classList.add("hidden");
      notifDrawer.setAttribute("aria-hidden", "true");
    }
  },

  // --------------------------------------------------------------------------
  // Command Palette (⌘K / Ctrl+K)
  // --------------------------------------------------------------------------
  openCommandPalette() {
    this.closeModals();
    const modal = document.getElementById("modal-command-palette");
    if (!modal) return;

    modal.classList.remove("hidden");
    const input = document.getElementById("cmd-palette-input");
    if (input) {
      input.value = "";
      input.focus();
    }
    this.renderCommandList("");
  },

  renderCommandList(query) {
    const list = document.getElementById("cmd-palette-results") || document.getElementById("cmd-palette-list");
    if (!list) return;

    const commands = [
      { title: "Product Overview", category: "Navigation", icon: "🏠", action: () => window.App?.navigateTo("landing") },
      { title: "Operations Dashboard", category: "Navigation", icon: "📊", action: () => window.App?.navigateTo("operations") },
      { title: "Route Optimizer", category: "Navigation", icon: "⚡", action: () => window.App?.navigateTo("optimizer") },
      { title: "Fleet Telemetry Roster", category: "Navigation", icon: "🚚", action: () => window.App?.navigateTo("fleet") },
      { title: "What-If Scenario Sandbox", category: "Navigation", icon: "🔮", action: () => window.App?.navigateTo("simulator") },
      { title: "Analytics & ESG Performance", category: "Navigation", icon: "📈", action: () => window.App?.navigateTo("analytics") },
      { title: "Add New Vehicle", category: "Actions", icon: "➕", action: () => window.App?.openAddVehicleModal() },
      { title: "Add New Stop Waypoint", category: "Actions", icon: "📍", action: () => window.App?.openAddStopModal() },
      { title: "Execute Co-Optimization", category: "Actions", icon: "🚀", action: () => window.App?.runFullCoOptimization() }
    ];

    const clean = (query || "").toLowerCase().trim();
    const filtered = clean
      ? commands.filter((c) => c.title.toLowerCase().includes(clean) || c.category.toLowerCase().includes(clean))
      : commands;

    list.innerHTML = filtered
      .map(
        (c, i) => `
      <div class="cmd-item ${i === 0 ? "active" : ""}" onclick="UIManager.runCommandByIndex(${i})">
        <span class="cmd-icon">${c.icon}</span>
        <div class="cmd-info">
          <div class="cmd-title">${Utils.escapeHTML(c.title)}</div>
          <div class="cmd-cat">${Utils.escapeHTML(c.category)}</div>
        </div>
      </div>
    `
      )
      .join("");

    this._activeCommands = filtered;
  },

  runCommandByIndex(index) {
    if (this._activeCommands && this._activeCommands[index]) {
      this.closeModals();
      this._activeCommands[index].action();
    }
  },

  // --------------------------------------------------------------------------
  // Notification Drawer
  // --------------------------------------------------------------------------
  toggleNotificationDrawer() {
    const modal = document.getElementById("modal-notifications");
    if (!modal) return;
    modal.classList.toggle("hidden");
    this.playSound("click");
  },

  clearAllNotifications() {
    const list = document.getElementById("notif-list");
    if (list) {
      list.innerHTML = `
        <div style="padding: 2.5rem 1rem; text-align: center; color: #94a3b8; font-size: 0.85rem;">
          <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">🔔</div>
          All dispatch notifications and operational alerts cleared.
        </div>
      `;
    }
    const badge = document.getElementById("notif-badge-count");
    if (badge) badge.style.display = "none";
    const dot = document.querySelector(".notif-pulse-dot");
    if (dot) dot.style.display = "none";
    this.showToast("All notifications cleared", "info");
  }
};

window.UIManager = UIManager;
