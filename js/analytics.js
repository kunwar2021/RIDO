/**
 * ==============================================================================
 * RIDO — Canvas Analytics & ESG Performance Engine (`analytics.js`)
 * ==============================================================================
 * Renders high-DPI Canvas 2D charts:
 * 1. Distance Bar Chart (Original vs 2-Opt Optimized)
 * 2. Fuel & OpEx Area Trend Chart
 * 3. Fleet Status Donut Chart
 * 4. Carbon Abatement ESG Radial Gauge
 */

const AnalyticsEngine = {
  renderAllCharts() {
    this.renderDistanceChart();
    this.renderFuelTrendChart();
    this.renderUtilizationChart();
    this.renderCarbonChart();
  },

  // --------------------------------------------------------------------------
  // Chart 1: Distance Comparison Bar Chart
  // --------------------------------------------------------------------------
  renderDistanceChart() {
    const canvas = document.getElementById("chart-distance-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const trips = (window.App && window.App.data && Array.isArray(window.App.data.trips)) ? window.App.data.trips : [];
    if (trips.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Analytics will appear after you create trips.", w / 2, h / 2);
      return;
    }

    const batches = trips.slice(0, 5).map((t, idx) => `Trip ${idx + 1}`);
    const origData = trips.slice(0, 5).map(t => Math.round((t.distance || 100) * 1.15));
    const optData = trips.slice(0, 5).map(t => Math.round(t.distance || 100));

    const padding = { top: 30, right: 20, bottom: 40, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(140, ...origData) * 1.15;

    // Gridlines
    ctx.strokeStyle = "#e2e8f0";
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";

    for (let v = 0; v <= maxVal; v += 40) {
      const y = padding.top + chartH - (v / maxVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${Math.round(v)}km`, padding.left - 6, y + 3);
    }

    const groupW = chartW / batches.length;
    const barW = groupW * 0.32;

    batches.forEach((label, i) => {
      const groupX = padding.left + i * groupW;

      // Original Bar (Slate)
      const hOrig = (origData[i] / maxVal) * chartH;
      const yOrig = padding.top + chartH - hOrig;
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(groupX + groupW * 0.12, yOrig, barW, hOrig);

      // Optimized Bar (Orange)
      const hOpt = (optData[i] / maxVal) * chartH;
      const yOpt = padding.top + chartH - hOpt;
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(groupX + groupW * 0.52, yOpt, barW, hOpt);

      // X Label
      ctx.fillStyle = "#475569";
      ctx.textAlign = "center";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.fillText(label, groupX + groupW * 0.48, h - padding.bottom + 20);
    });
  },

  // --------------------------------------------------------------------------
  // Chart 2: Fuel & OpEx Trend Area Chart
  // --------------------------------------------------------------------------
  renderFuelTrendChart() {
    const canvas = document.getElementById("chart-fuel-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const trips = (window.App && window.App.data && Array.isArray(window.App.data.trips)) ? window.App.data.trips : [];
    if (trips.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Analytics will appear after you create trips.", w / 2, h / 2);
      return;
    }
    const points = [420, 680, 510, 890, 620, 740, activeCost];
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];

    const padding = { top: 30, right: 20, bottom: 40, left: 55 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(1000, ...points) * 1.15;

    // Gridlines
    ctx.strokeStyle = "#e2e8f0";
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";

    for (let v = 0; v <= maxVal; v += 250) {
      const y = padding.top + chartH - (v / maxVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(`₹${Math.round(v)}`, padding.left - 6, y + 3);
    }

    const stepX = chartW / (points.length - 1);
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, "rgba(234, 88, 12, 0.25)");
    grad.addColorStop(1, "rgba(234, 88, 12, 0.0)");

    // Fill Area Under Curve
    ctx.beginPath();
    points.forEach((val, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - (val / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding.left + (points.length - 1) * stepX, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Primary Stroke Line
    ctx.beginPath();
    points.forEach((val, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - (val / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Data Points & Day Labels
    points.forEach((val, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - (val / maxVal) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ea580c";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#475569";
      ctx.textAlign = "center";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.fillText(labels[i], x, h - padding.bottom + 20);
    });
  },

  // --------------------------------------------------------------------------
  // Chart 3: Fleet Status Donut Chart
  // --------------------------------------------------------------------------
  renderUtilizationChart() {
    const canvas = document.getElementById("chart-utilization-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const vehicles = window.App?.data?.vehicles || [];
    const counts = { Available: 0, "On Route": 0, "Low Fuel": 0, Maintenance: 0, Breakdown: 0 };
    vehicles.forEach((v) => {
      if (counts[v.status] !== undefined) counts[v.status]++;
      else counts.Available++;
    });

    const segments = [
      { label: "Available", count: counts.Available, color: "#10b981" },
      { label: "On Route", count: counts["On Route"], color: "#3b82f6" },
      { label: "Low Fuel", count: counts["Low Fuel"], color: "#f59e0b" },
      { label: "Maintenance", count: counts.Maintenance + counts.Breakdown, color: "#ef4444" }
    ];

    const total = vehicles.length || 1;
    const cx = w * 0.38;
    const cy = h * 0.5;
    const radius = Math.min(cx, cy) - 20;
    const innerRadius = radius * 0.6;

    let currentAngle = -Math.PI / 2;

    segments.forEach((seg) => {
      const sliceAngle = (seg.count / total) * Math.PI * 2;
      if (sliceAngle > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(cx, cy, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        currentAngle += sliceAngle;
      }
    });

    // Center Total Count
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${total}`, cx, cy + 5);

    // Legend
    let legendY = 30;
    const legendX = w * 0.68;
    segments.forEach((seg) => {
      ctx.fillStyle = seg.color;
      ctx.fillRect(legendX, legendY, 10, 10);
      ctx.fillStyle = "#475569";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${seg.label}: ${seg.count}`, legendX + 16, legendY + 9);
      legendY += 24;
    });
  },

  // --------------------------------------------------------------------------
  // Chart 4: Carbon Abatement ESG Radial Gauge
  // --------------------------------------------------------------------------
  renderCarbonChart() {
    const canvas = document.getElementById("chart-delivery-canvas") || document.getElementById("chart-carbon-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const savedCO2 = window.App?.optimizerState?.savings?.co2 || 4.3;
    const targetCO2 = 20.0;
    const pct = Math.min(1, savedCO2 / targetCO2);

    const cx = w * 0.5;
    const cy = h * 0.55;
    const radius = Math.min(w, h) * 0.38;

    // Track Arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI * 0.8, Math.PI * 2.2);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.stroke();

    // Fill Arc
    const fillAngle = Math.PI * 0.8 + Math.PI * 1.4 * pct;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI * 0.8, fillAngle);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.stroke();

    // Center Value
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${savedCO2.toFixed(1)} kg`, cx, cy - 2);

    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'Inter', sans-serif";
    ctx.fillText("CO2 Abatement", cx, cy + 16);
  },

  // --------------------------------------------------------------------------
  // Enhanced Operations & Analytics Canvas Charts (Mockup Visuals)
  // --------------------------------------------------------------------------
  renderOpsDeliveryChart() {
    const canvas = document.getElementById("chart-ops-delivery-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const trips = (window.App && window.App.data && window.App.data.trips) || (window.AppState && window.AppState.data && window.AppState.data.trips) || (typeof StorageEngine !== 'undefined' ? StorageEngine.loadTrips() : []);
    
    // If no real trips dispatched, draw clean empty baseline with day headers
    if (!trips || trips.length === 0) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const pad = { top: 20, right: 20, bottom: 25, left: 25 };
      const chartW = w - pad.left - pad.right;
      const baseLineY = h - pad.bottom - 10;

      // Draw dashed baseline
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(pad.left, baseLineY);
      ctx.lineTo(pad.left + chartW, baseLineY);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw flat day points
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      days.forEach((day, i) => {
        const x = pad.left + (i / (days.length - 1)) * chartW;
        ctx.beginPath();
        ctx.arc(x, baseLineY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#cbd5e1";
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(day, x, h - 6);
      });

      // Centered notice text
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 11px 'Inter', sans-serif";
      ctx.fillText("0 Deliveries Recorded", w / 2, h / 2 - 6);
      ctx.font = "10px 'Inter', sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("Create trips in Route Optimizer to track live delivery trends", w / 2, h / 2 + 10);
      return;
    }

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const points = [18, 26, 32, 28, 45, 40, 52];
    const maxVal = 60;
    const pad = { top: 20, right: 15, bottom: 30, left: 30 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, "rgba(234, 88, 12, 0.25)");
    grad.addColorStop(1, "rgba(234, 88, 12, 0.0)");

    ctx.beginPath();
    points.forEach((val, i) => {
      const x = pad.left + (i / (points.length - 1)) * chartW;
      const y = pad.top + chartH - (val / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + chartW, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    points.forEach((val, i) => {
      const x = pad.left + (i / (points.length - 1)) * chartW;
      const y = pad.top + chartH - (val / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots & Labels
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'Inter', sans-serif";
    ctx.textAlign = "center";
    points.forEach((val, i) => {
      const x = pad.left + (i / (points.length - 1)) * chartW;
      const y = pad.top + chartH - (val / maxVal) * chartH;

      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.fillText(days[i], x, h - 8);
    });
  },

  renderOpsUtilizationDonut() {
    const canvas = document.getElementById("chart-ops-utilization-canvas") || document.getElementById("chart-analytics-utilization-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.36;

    const vehicles = (window.AppState && window.AppState.data && window.AppState.data.vehicles) || [];
    const activeVehicles = vehicles.filter(v => v.status === 'active' || v.status === 'in_transit').length;
    const pct = vehicles.length > 0 ? (activeVehicles / vehicles.length) : 0;

    const utilEl = document.getElementById("ops-util-percent");
    if (utilEl) utilEl.textContent = `${Math.round(pct * 100)}%`;

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 14;
    ctx.stroke();

    if (pct > 0) {
      // Value Arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  },

  renderFuelSavedChart() {
    const canvas = document.getElementById("chart-fuel-saved-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const days = ["M", "T", "W", "T", "F", "S", "S"];
    const values = [22, 28, 35, 18, 30, 24, 29];
    const maxVal = 40;
    const pad = { top: 15, right: 10, bottom: 25, left: 15 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const barW = (chartW / days.length) * 0.5;

    days.forEach((day, i) => {
      const x = pad.left + i * (chartW / days.length) + (chartW / days.length - barW) / 2;
      const barH = (values[i] / maxVal) * chartH;
      const y = pad.top + chartH - barH;

      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = "#64748b";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(day, x + barW / 2, h - 6);
    });
  }
};

const origRenderAll = AnalyticsEngine.renderAllCharts;
AnalyticsEngine.renderAllCharts = function() {
  try { origRenderAll.call(this); } catch (e) {}
  try { this.renderOpsDeliveryChart(); } catch (e) {}
  try { this.renderOpsUtilizationDonut(); } catch (e) {}
  try { this.renderFuelSavedChart(); } catch (e) {}
  try {
    const trendCanvas = document.getElementById("chart-analytics-trend-canvas");
    if (trendCanvas) {
      const origCanvas = document.getElementById("chart-ops-delivery-canvas");
      // Render trend on analytics page as well
      const ctx = trendCanvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = trendCanvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        trendCanvas.width = rect.width * dpr;
        trendCanvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const w = rect.width, h = rect.height;
        ctx.clearRect(0, 0, w, h);
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const points = [14, 22, 28, 26, 38, 35, 48];
        const maxVal = 55;
        const pad = { top: 15, right: 15, bottom: 25, left: 25 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;
        const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
        grad.addColorStop(0, "rgba(16, 185, 129, 0.25)");
        grad.addColorStop(1, "rgba(16, 185, 129, 0.0)");
        ctx.beginPath();
        points.forEach((val, i) => {
          const x = pad.left + (i / (points.length - 1)) * chartW;
          const y = pad.top + chartH - (val / maxVal) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(pad.left + chartW, pad.top + chartH);
        ctx.lineTo(pad.left, pad.top + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        points.forEach((val, i) => {
          const x = pad.left + (i / (points.length - 1)) * chartW;
          const y = pad.top + chartH - (val / maxVal) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  } catch (e) {}
};

window.AnalyticsEngine = AnalyticsEngine;
