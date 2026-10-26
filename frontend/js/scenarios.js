/**
 * ==============================================================================
 * RIDO — "What-If" Scenario Sandbox & ROI Simulator (`scenarios.js`)
 * ==============================================================================
 * Stress-tests dispatch operations across fuel price spikes, vehicle
 * breakdowns, cargo demand surges, and full EV fleet transition ROI.
 */

const ScenarioEngine = {
  state: {
    currentPreset: "fuel_spike",
    fuelPrice: 97.0,
    electricityPrice: 8.5,
    weightMultiplier: 1.0,
    availableFleetCount: 6
  },

  presets: {
    fuel_spike: {
      name: "Fuel Price Surge (+25%)",
      fuelPrice: 121.25,
      electricityPrice: 8.5,
      weightMultiplier: 1.0,
      availableFleetCount: 6,
      desc: "Simulate ₹120/L diesel crisis and assess route cost escalation."
    },
    vehicle_breakdown: {
      name: "Major Vehicle Breakdown",
      fuelPrice: 97.0,
      electricityPrice: 8.5,
      weightMultiplier: 1.0,
      availableFleetCount: 4,
      desc: "Simulate loss of primary mini-truck and test fleet load redistributions."
    },
    demand_surge: {
      name: "Cargo Volume Surge (+50%)",
      fuelPrice: 97.0,
      electricityPrice: 8.5,
      weightMultiplier: 1.5,
      availableFleetCount: 6,
      desc: "Test payload limits and vehicle overloading warning thresholds."
    },
    ev_transition: {
      name: "100% EV Transition Study",
      fuelPrice: 97.0,
      electricityPrice: 8.5,
      weightMultiplier: 1.0,
      availableFleetCount: 6,
      isAllEV: true,
      desc: "Project economic and CO2 reduction of converting diesel fleet to EVs."
    }
  },

  init() {
    this.updateSliderDisplays();
    this.runAnalysis();
  },

  loadPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return;

    this.state.currentPreset = presetKey;
    this.state.fuelPrice = preset.fuelPrice;
    this.state.electricityPrice = preset.electricityPrice;
    this.state.weightMultiplier = preset.weightMultiplier;
    this.state.availableFleetCount = preset.availableFleetCount;

    const fuelInp = document.getElementById("sim-param-fuel");
    const elecInp = document.getElementById("sim-param-electricity");
    const weightInp = document.getElementById("sim-param-weight-mult");
    const fleetInp = document.getElementById("sim-param-fleet-avail");

    if (fuelInp) fuelInp.value = this.state.fuelPrice;
    if (elecInp) elecInp.value = this.state.electricityPrice;
    if (weightInp) weightInp.value = this.state.weightMultiplier;
    if (fleetInp) fleetInp.value = this.state.availableFleetCount;

    document.querySelectorAll(".scenario-preset-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.scenario === presetKey);
    });

    this.updateSliderDisplays();
    this.runAnalysis();
  },

  onParamChange() {
    const fuelInp = document.getElementById("sim-param-fuel");
    const elecInp = document.getElementById("sim-param-electricity");
    const weightInp = document.getElementById("sim-param-weight-mult");
    const fleetInp = document.getElementById("sim-param-fleet-avail");

    if (fuelInp) this.state.fuelPrice = parseFloat(fuelInp.value) || 97.0;
    if (elecInp) this.state.electricityPrice = parseFloat(elecInp.value) || 8.5;
    if (weightInp) this.state.weightMultiplier = parseFloat(weightInp.value) || 1.0;
    if (fleetInp) this.state.availableFleetCount = parseInt(fleetInp.value, 10) || 6;

    this.updateSliderDisplays();
    this.runAnalysis();
  },

  updateSliderDisplays() {
    const dispFuel = document.getElementById("sim-disp-fuel");
    const dispElec = document.getElementById("sim-disp-elec");
    const dispWeight = document.getElementById("sim-disp-weight");
    const dispFleet = document.getElementById("sim-disp-fleet");

    const totalFleet = window.App?.data?.vehicles?.length || 6;

    if (dispFuel) dispFuel.textContent = `₹${this.state.fuelPrice.toFixed(1)} / L`;
    if (dispElec) dispElec.textContent = `₹${this.state.electricityPrice.toFixed(1)} / kWh`;
    if (dispWeight) {
      dispWeight.textContent = `${this.state.weightMultiplier.toFixed(1)}x (${
        this.state.weightMultiplier > 1
          ? "+" + Math.round((this.state.weightMultiplier - 1) * 100) + "%"
          : "Normal"
      })`;
    }
    if (dispFleet) dispFleet.textContent = `${this.state.availableFleetCount} / ${totalFleet} Vehicles Active`;
  },

  resetParams() {
    const defaultFuel = window.App?.data?.settings?.fuelPrice || 97.0;
    const defaultElec = window.App?.data?.settings?.electricityPrice || 8.5;
    const totalFleet = window.App?.data?.vehicles?.length || 6;

    this.state.fuelPrice = defaultFuel;
    this.state.electricityPrice = defaultElec;
    this.state.weightMultiplier = 1.0;
    this.state.availableFleetCount = totalFleet;

    const fuelInp = document.getElementById("sim-param-fuel");
    const elecInp = document.getElementById("sim-param-electricity");
    const weightInp = document.getElementById("sim-param-weight-mult");
    const fleetInp = document.getElementById("sim-param-fleet-avail");

    if (fuelInp) fuelInp.value = defaultFuel;
    if (elecInp) elecInp.value = defaultElec;
    if (weightInp) weightInp.value = 1.0;
    if (fleetInp) fleetInp.value = totalFleet;

    document.querySelectorAll(".scenario-preset-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.scenario === "fuel_spike");
    });

    this.updateSliderDisplays();
    this.runAnalysis();
  },

  runAnalysis() {
    const baseDistance = window.App?.optimizerState?.optimizedStats?.distance || 1284;
    const baseVehicle = (window.App?.data?.vehicles || [])[0] || { efficiency: 4.5, costPerKm: 12.5, powertrain: "Diesel" };
    const isBaseEV = baseVehicle.powertrain === "Electric (EV)";

    // Baseline OpEx
    const baseFuelPrice = isBaseEV ? 8.5 : 95.0;
    const baseFuelUsed = baseDistance / Number(baseVehicle.efficiency || 4.5);
    const baseCost = baseFuelUsed * baseFuelPrice + (baseDistance * 2.0) + 1420;

    // Simulated OpEx
    const isScenarioAllEV = this.state.currentPreset === "ev_transition";
    const simFuelPrice = isScenarioAllEV ? this.state.electricityPrice : (isBaseEV ? this.state.electricityPrice : this.state.fuelPrice);
    const simEfficiency = isScenarioAllEV ? 12.0 : Number(baseVehicle.efficiency || 4.5);
    const simDistance = baseDistance * (this.state.availableFleetCount < 4 ? 1.08 : 1.0);
    const simFuelUsed = simDistance / simEfficiency;
    const simCost = simFuelUsed * simFuelPrice + (simDistance * 2.0) + 1420;

    const deltaCost = simCost - baseCost;
    const deltaCostPct = baseCost > 0 ? (deltaCost / baseCost) * 100 : 0;

    // Carbon emissions
    const baseCO2 = isBaseEV ? 0 : baseFuelUsed * 2.68;
    const simCO2 = isScenarioAllEV ? 0 : (isBaseEV ? 0 : simFuelUsed * 2.68);
    const deltaCO2 = simCO2 - baseCO2;

    // Payload risk
    const overloadRisk = Math.max(0, Math.round((this.state.weightMultiplier - 1.0) * 100));

    // Update UI elements in index.html
    const setElem = (id, text, color) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = text;
        if (color) el.style.color = color;
      }
    };

    setElem("sim-res-cost", `₹${Math.round(simCost).toLocaleString()}`);
    setElem("sim-delta-cost", `${deltaCost >= 0 ? "+" : ""}${deltaCostPct.toFixed(1)}%`, deltaCost > 0 ? "#ef4444" : "#10b981");

    setElem("sim-res-fuel", `${simFuelUsed.toFixed(1)} ${isScenarioAllEV || isBaseEV ? "kWh" : "L"}`);
    const fuelDeltaPct = ((simFuelUsed - baseFuelUsed) / baseFuelUsed) * 100;
    setElem("sim-delta-fuel", `${fuelDeltaPct >= 0 ? "+" : ""}${fuelDeltaPct.toFixed(1)}%`, fuelDeltaPct > 0 ? "#ef4444" : "#10b981");

    setElem("sim-res-co2", `${simCO2.toFixed(1)} kg`);
    setElem("sim-delta-co2", `${deltaCO2 >= 0 ? "+" : ""}${deltaCO2.toFixed(1)} kg`, deltaCO2 > 0 ? "#ef4444" : "#10b981");

    if (overloadRisk > 40 || this.state.availableFleetCount < 3) {
      setElem("sim-res-risk", `${overloadRisk}% (Critical Overload)`, "#ef4444");
      setElem("sim-delta-risk", "⚠️ High Risk", "#ef4444");
    } else if (overloadRisk > 10 || this.state.availableFleetCount < 5) {
      setElem("sim-res-risk", `${overloadRisk}% (Moderate Load)`, "#f59e0b");
      setElem("sim-delta-risk", "⚡ Caution", "#f59e0b");
    } else {
      setElem("sim-res-risk", "0% (Safe)", "#10b981");
      setElem("sim-delta-risk", "✓ Compliant", "#10b981");
    }

    this.renderScenarioChart(baseCost, simCost, baseFuelUsed, simFuelUsed, baseCO2, simCO2);
  },

  renderScenarioChart(baseCost, simCost, baseFuel, simFuel, baseCO2, simCO2) {
    const canvas = document.getElementById("sim-scenario-canvas");
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

    const categories = ["Trip OpEx (₹)", "Fuel/Energy", "CO2 Emitted (kg)"];
    const baseVals = [baseCost, baseFuel * 50, baseCO2 * 10];
    const simVals = [simCost, simFuel * 50, simCO2 * 10];

    const padding = { top: 25, right: 20, bottom: 35, left: 35 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...baseVals, ...simVals) * 1.2;

    const groupW = chartW / categories.length;
    const barW = groupW * 0.28;

    categories.forEach((cat, i) => {
      const gx = padding.left + i * groupW;

      // Base bar (slate)
      const bh = (baseVals[i] / maxVal) * chartH;
      const by = padding.top + chartH - bh;
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(gx + groupW * 0.15, by, barW, bh);

      // Sim bar (orange/emerald)
      const sh = (simVals[i] / maxVal) * chartH;
      const sy = padding.top + chartH - sh;
      ctx.fillStyle = simVals[i] <= baseVals[i] ? "#10b981" : "#ea580c";
      ctx.fillRect(gx + groupW * 0.52, sy, barW, sh);

      // Label
      ctx.fillStyle = "#475569";
      ctx.textAlign = "center";
      ctx.font = "11px sans-serif";
      ctx.fillText(cat, gx + groupW * 0.48, h - 10);
    });
  }
};

window.ScenarioEngine = ScenarioEngine;
