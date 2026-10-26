/**
 * ==============================================================================
 * RIDO — Algorithmic Route & Fleet Co-Optimizer Engine (`optimizer.js`)
 * ==============================================================================
 * Implements 2-Opt Iterative Edge-Swap TSP heuristics, thermodynamic OpEx
 * modeling, payload feasibility checks, and multi-factor vehicle co-optimization.
 */

const OptimizerEngine = {
  // --------------------------------------------------------------------------
  // Distance & Geometry Calculations
  // --------------------------------------------------------------------------
  haversineDistance(lat1, lon1, lat2, lon2) {
    return Utils.haversineDistance(lat1, lon1, lat2, lon2);
  },

  async fetchRealRoadGeometry(waypoints, signal = null) {
    return ApiClient.fetchOSRMRoute(waypoints, signal);
  },

  matchTollPlazasAlongRoute(routeCoordinates, maxDistKm = 3.5, vehicleType = "truck") {
    if (!routeCoordinates || !Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
      return {
        matchedTolls: [],
        totalIdentifiedCount: 0,
        totalWithRatesCount: 0,
        totalKnownTollCost: 0,
        vehicleClassMapped: "TRUCK",
        coverageText: "No route geometry available",
        coverageRatioText: "0 identified / 0 with rates"
      };
    }

    const allTolls = window.PAN_INDIA_FASTAG_TOLLS || [];
    if (!allTolls || allTolls.length === 0) {
      return {
        matchedTolls: [],
        totalIdentifiedCount: 0,
        totalWithRatesCount: 0,
        totalKnownTollCost: 0,
        vehicleClassMapped: "TRUCK",
        coverageText: "No toll database connected",
        coverageRatioText: "0 identified / 0 with rates"
      };
    }

    // 1. Precompute cumulative route progress distances along OSRM polyline
    const cumDist = [0];
    for (let i = 1; i < routeCoordinates.length; i++) {
      const p1 = routeCoordinates[i - 1];
      const p2 = routeCoordinates[i];
      const stepDist = Utils.haversineDistance(p1[0], p1[1], p2[0], p2[1]);
      cumDist.push(cumDist[i - 1] + stepDist);
    }

    // 2. Map vehicle type / category to toll rate key
    const mapVehicleClass = (v) => {
      if (!v) return "truck";
      const raw = typeof v === "object" ? (v.category || v.type || v.powertrain || "") : String(v);
      const lower = raw.toLowerCase();
      if (lower.includes("car") || lower.includes("van") || lower.includes("small")) return "lcv";
      if (lower.includes("lcv") || lower.includes("light") || lower.includes("ace") || lower.includes("pickup") || lower.includes("3 Wheeler")) return "lcv";
      if (lower.includes("bus")) return "bus";
      if (lower.includes("multi") || lower.includes("heavy") || lower.includes("trailer") || lower.includes("5530") || lower.includes("multi-axle")) return "multiAxle";
      return "truck";
    };

    const targetClass = mapVehicleClass(vehicleType);
    const matchedMap = new Map();

    // 3. Spatial corridor matching: Check every toll plaza against actual route polyline
    allTolls.forEach((toll) => {
      if (!toll || !Number.isFinite(Number(toll.lat)) || !Number.isFinite(Number(toll.lng))) return;

      let minDist = Infinity;
      let minIdx = 0;

      for (let i = 0; i < routeCoordinates.length; i++) {
        const [rLat, rLng] = routeCoordinates[i];
        const dist = Utils.haversineDistance(toll.lat, toll.lng, rLat, rLng);
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }

      if (minDist <= maxDistKm) {
        const key = toll.id || toll.name;
        if (!matchedMap.has(key)) {
          const routeProgressKm = cumDist[minIdx] || 0;
          const rateVal = (toll.vehicleRates && toll.vehicleRates[targetClass] !== undefined)
            ? toll.vehicleRates[targetClass]
            : (toll.commercialRate !== undefined ? toll.commercialRate : null);

          matchedMap.set(key, {
            id: key,
            name: toll.name,
            highway: toll.highway || "National Highway Corridor",
            state: toll.state || "India",
            lat: Number(toll.lat),
            lng: Number(toll.lng),
            direction: toll.direction || "Both Ways",
            distFromRouteKm: Number(minDist.toFixed(1)),
            routeDistanceFromOrigin: Math.round(routeProgressKm),
            vehicleClass: targetClass.toUpperCase(),
            rate: rateVal,
            source: toll.source || "NHAI / NETC Official Tariff",
            lastUpdated: toll.lastUpdated || "2026-04-01",
            lanes: toll.lanes || "NETC RFID Auto-Debit"
          });
        }
      }
    });

    // 4. Deduplicate & sort strictly by route progress order (from Origin -> Waypoints -> Destination)
    const matchedList = Array.from(matchedMap.values());
    matchedList.sort((a, b) => a.routeDistanceFromOrigin - b.routeDistanceFromOrigin);

    let totalKnownCost = 0;
    let ratesAvailableCount = 0;

    matchedList.forEach((t) => {
      if (t.rate !== null && Number.isFinite(Number(t.rate))) {
        totalKnownCost += Number(t.rate);
        ratesAvailableCount++;
      }
    });

    return {
      matchedTolls: matchedList,
      totalIdentifiedCount: matchedList.length,
      totalWithRatesCount: ratesAvailableCount,
      totalKnownTollCost: totalKnownCost,
      vehicleClassMapped: targetClass.toUpperCase(),
      coverageText: `Toll plazas identified from route-linked dataset: ${matchedList.length} identified / ${ratesAvailableCount} with available rates`,
      coverageRatioText: `${matchedList.length} identified / ${ratesAvailableCount} with rates`
    };
  },

  calculateSequenceDistance(sequence, startDepot, endDepot) {
    if (!sequence || sequence.length === 0) {
      if (startDepot && endDepot && (endDepot.lat !== startDepot.lat || endDepot.lng !== startDepot.lng)) {
        return this.haversineDistance(startDepot.lat, startDepot.lng, endDepot.lat, endDepot.lng);
      }
      return 0;
    }

    let totalDist = 0;
    // 1. Origin [A] to first stop
    if (startDepot && Number.isFinite(Number(startDepot.lat)) && Number.isFinite(Number(startDepot.lng))) {
      totalDist += this.haversineDistance(startDepot.lat, startDepot.lng, sequence[0].lat, sequence[0].lng);
    }

    // 2. Intermediate Waypoints
    for (let i = 0; i < sequence.length - 1; i++) {
      totalDist += this.haversineDistance(sequence[i].lat, sequence[i].lng, sequence[i + 1].lat, sequence[i + 1].lng);
    }

    // 3. Last Stop to Final Destination Hub [B]
    if (endDepot && Number.isFinite(Number(endDepot.lat)) && Number.isFinite(Number(endDepot.lng))) {
      totalDist += this.haversineDistance(
        sequence[sequence.length - 1].lat,
        sequence[sequence.length - 1].lng,
        endDepot.lat,
        endDepot.lng
      );
    }

    return totalDist;
  },

  // --------------------------------------------------------------------------
  // Algorithmic Heuristics: Nearest-Neighbor & 2-Opt Edge-Swap
  // --------------------------------------------------------------------------
  solveNearestNeighbor(stops, startDepot, prioritizeUrgent = true) {
    if (!stops || stops.length <= 1) return [...(stops || [])];
    const unvisited = [...stops];
    const tour = [];
    let currentPoint = startDepot;

    if (!currentPoint) {
      currentPoint = unvisited.shift();
      tour.push(currentPoint);
    }

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        let dist = this.haversineDistance(currentPoint.lat, currentPoint.lng, unvisited[i].lat, unvisited[i].lng);

        if (prioritizeUrgent) {
          if (unvisited[i].priority === "Urgent") dist *= CONFIG.SOLVER.URGENT_PRIORITY_WEIGHT_FACTOR;
          else if (unvisited[i].priority === "High") dist *= CONFIG.SOLVER.HIGH_PRIORITY_WEIGHT_FACTOR;
        }

        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const nextStop = unvisited.splice(nearestIdx, 1)[0];
      tour.push(nextStop);
      currentPoint = nextStop;
    }

    return tour;
  },

  solve2Opt(tour, startDepot, endDepot, maxIterations = CONFIG.SOLVER.MAX_2OPT_ITERATIONS) {
    if (!tour || tour.length < 4) return [...(tour || [])];
    let route = [...tour];
    let bestDist = this.calculateSequenceDistance(route, startDepot, endDepot);
    let improved = true;
    let iteration = 0;

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      for (let i = 0; i < route.length - 1; i++) {
        for (let k = i + 1; k < route.length; k++) {
          const newRoute = this.twoOptSwap(route, i, k);
          const newDist = this.calculateSequenceDistance(newRoute, startDepot, endDepot);

          if (newDist < bestDist - CONFIG.SOLVER.DISTANCE_TOLERANCE_KM) {
            route = newRoute;
            bestDist = newDist;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    return route;
  },

  twoOptSwap(route, i, k) {
    const newRoute = [];
    for (let c = 0; c < i; c++) newRoute.push(route[c]);
    for (let c = k; c >= i; c--) newRoute.push(route[c]);
    for (let c = k + 1; c < route.length; c++) newRoute.push(route[c]);
    return newRoute;
  },

  // --------------------------------------------------------------------------
  // Enterprise Multi-Factor Fleet & Route Co-Optimization Allocation
  // --------------------------------------------------------------------------
  coOptimizeVehicleAndRoute(selectedStops, vehicles, startDepot, endDepot, settings = {}) {
    const totalPayload = (selectedStops || []).reduce((sum, s) => sum + Number(s.weight || 0), 0);

    const nnTour = this.solveNearestNeighbor(selectedStops, startDepot, settings.prioritizeUrgent !== false);
    const optTour = this.solve2Opt(nnTour, startDepot, endDepot);
    const optDistance = this.calculateSequenceDistance(optTour, startDepot, endDepot);

    const scoredVehicles = (vehicles || []).map((veh) => {
      const isCapacityCompliant = Number(veh.payloadMax) >= totalPayload;
      const capacityUtilization = totalPayload > 0 ? (totalPayload / Number(veh.payloadMax)) * 100 : 0;

      const isEV = veh.powertrain === "Electric (EV)";
      const fuelPrice = isEV
        ? Number(settings.electricityPrice || CONFIG.ECONOMICS.DEFAULT_ELECTRICITY_PRICE_PER_KWH)
        : Number(settings.fuelPrice || CONFIG.ECONOMICS.DEFAULT_DIESEL_PRICE_PER_LITER);

      const fuelUsed = optDistance / (Number(veh.efficiency) || 12);
      const fuelCost = fuelUsed * fuelPrice;
      const operatingCost = optDistance * Number(veh.costPerKm || 10);
      const totalTripCost = fuelCost + operatingCost;

      const remainingRangeKm = (Number(veh.fuelLevel || 80) / 100) * (isEV ? 180 : 500);
      const isRangeSufficient = remainingRangeKm >= optDistance * CONFIG.SOLVER.RANGE_SAFETY_BUFFER_PERCENT;

      let score = totalTripCost;
      if (!isCapacityCompliant) score += 500000; // Hard disqualification penalty for payload violation
      if (!isRangeSufficient) score += 20000;
      if (veh.status === "Breakdown") score += 1000000;
      if (veh.status === "Maintenance") score += 400000;
      if (veh.status === "On Route") score += 5000;

      const healthPenalty = ((100 - Number(veh.healthScore || 90)) / 100) * 80;
      score += healthPenalty;

      if (isEV && isCapacityCompliant && isRangeSufficient) {
        score -= 50; // ESG Sustainability preference bonus
      }

      const driveHours = optDistance / (Number(settings.avgSpeed || CONFIG.ECONOMICS.DEFAULT_AVG_HIGHWAY_SPEED_KMH));
      const stopHours = (selectedStops.length * CONFIG.ECONOMICS.DEFAULT_STOP_SERVICE_MINUTES) / 60;
      const totalHours = driveHours + stopHours;
      const etaH = Math.floor(totalHours);
      const etaM = Math.round((totalHours - etaH) * 60);
      const etaFormatted = `${etaH} hr ${etaM.toString().padStart(2, "0")} min`;

      const bullets = [];
      if (isCapacityCompliant) bullets.push(`✓ Payload suitable (${Utils.formatWeight(totalPayload)} fit in ${Utils.formatWeight(veh.payloadMax)})`);
      else bullets.push(`✗ Infeasible: Payload exceeds vehicle limit (${Utils.formatWeight(veh.payloadMax)})`);

      if (isRangeSufficient) bullets.push(`✓ Route feasible (${optDistance.toFixed(0)} km highway range verified)`);
      else bullets.push(`✗ Warning: Low range buffer for ${optDistance.toFixed(0)} km run`);

      if (veh.status === "Available" || veh.status === "On Route") bullets.push(`✓ Vehicle available (${veh.status})`);
      else bullets.push(`✗ Vehicle status: ${veh.status}`);

      if (Number(veh.healthScore) >= 80) bullets.push(`✓ High health score (${veh.healthScore}% system HP)`);
      else bullets.push(`! Degraded health (${veh.healthScore}%)`);

      if (Number(veh.fuelLevel) >= 30) bullets.push(`✓ Sufficient ${isEV ? "battery" : "fuel"} state (${veh.fuelLevel}%)`);
      else bullets.push(`! Low energy state (${veh.fuelLevel}%)`);

      bullets.push(`✓ Strong operating balance (${Utils.formatCurrency(totalTripCost, settings.currency || "₹")})`);

      return {
        vehicle: veh,
        isCapacityCompliant,
        isRangeSufficient,
        capacityUtilization,
        totalTripCost,
        fuelUsed,
        etaFormatted,
        bullets,
        score,
        reason: this.generateRecommendationReason(
          veh,
          isCapacityCompliant,
          isRangeSufficient,
          capacityUtilization,
          totalTripCost,
          isEV,
          settings.currency || "₹"
        )
      };
    });

    scoredVehicles.sort((a, b) => a.score - b.score);

    return {
      bestMatch: scoredVehicles[0],
      allRankings: scoredVehicles,
      optimizedSequence: optTour,
      optimizedDistance: optDistance,
      totalPayload
    };
  },

  generateRecommendationReason(veh, compliant, rangeOk, util, cost, isEV, currency = "₹") {
    if (!compliant) return `Infeasible: Payload exceeds vehicle limit (${veh.payloadMax} kg).`;
    if (!rangeOk) return `Warning: Fuel/battery level too low for ${util.toFixed(0)}% payload run.`;
    if (veh.status === "Breakdown" || veh.status === "Maintenance") return `Unavailable: Vehicle is in ${veh.status}.`;
    if (isEV) {
      return `Optimal Green Pick: Zero direct emissions, lowest operating cost (${Utils.formatCurrency(cost, currency)}), ${util.toFixed(0)}% payload fit.`;
    }
    return `Strong Operating Balance: 100% capacity fit (${util.toFixed(0)}% utilized), health score ${veh.healthScore}%, trip cost ${Utils.formatCurrency(cost, currency)}.`;
  },

  // --------------------------------------------------------------------------
  // OpEx Economics & Thermodynamic Consumption Calculations
  // --------------------------------------------------------------------------
  calculateEconomics(distance, vehicle, stopCount, settings = {}) {
    if (!distance || distance <= 0) {
      return { distance: 0, fuel: 0, cost: 0, time: 0, co2: 0, tollCost: 0, driverAllowance: 0, maintenanceCost: 0 };
    }

    const isEV = vehicle && vehicle.powertrain === "Electric (EV)";
    const fuelPrice = isEV
      ? Number(settings.electricityPrice || CONFIG.ECONOMICS.DEFAULT_ELECTRICITY_PRICE_PER_KWH)
      : Number(settings.fuelPrice || CONFIG.ECONOMICS.DEFAULT_DIESEL_PRICE_PER_LITER);
    const efficiency = Number(vehicle?.efficiency) || 12;

    // 1. Fuel / Power Energy Burn
    const fuelUsed = distance / efficiency;
    const fuelCost = fuelUsed * fuelPrice;

    // 2. Driver Bata & Per-Diem Drop Allowance
    const driverAllowance =
      distance * CONFIG.ECONOMICS.DRIVER_ALLOWANCE_PER_KM +
      stopCount * CONFIG.ECONOMICS.DRIVER_ALLOWANCE_PER_STOP;

    // 3. Commercial FASTag Highway Tolls
    const tollCost =
      distance > 25
        ? Math.round((distance / 50) * CONFIG.ECONOMICS.FASTAG_TOLL_RATE_PER_50KM)
        : 0;

    // 4. Maintenance & Depreciation
    const maintenanceCost =
      distance *
      (isEV
        ? CONFIG.ECONOMICS.MAINTENANCE_COST_PER_KM_EV
        : CONFIG.ECONOMICS.MAINTENANCE_COST_PER_KM_ICE);

    // Total Trip Dispatch OpEx
    const totalCost = fuelCost + driverAllowance + tollCost + maintenanceCost;

    // Estimated Transit Duration at Average Speed + Service Drop Duration
    const avgSpeed = Number(settings.avgSpeed) || CONFIG.ECONOMICS.DEFAULT_AVG_HIGHWAY_SPEED_KMH;
    const driveMinutes = (distance / avgSpeed) * 60;
    const stopMinutes = stopCount * CONFIG.ECONOMICS.DEFAULT_STOP_SERVICE_MINUTES;
    const totalMinutes = Math.round(driveMinutes + stopMinutes);

    // Carbon Abatement: Diesel ~ 2.68 kg CO2/L; EV ~ 0 kg (direct tailpipe)
    const co2Kg = isEV ? 0 : fuelUsed * CONFIG.ECONOMICS.CO2_KG_PER_LITER_DIESEL;

    return {
      distance,
      fuel: fuelUsed,
      cost: totalCost,
      time: totalMinutes,
      co2: co2Kg,
      tollCost,
      driverAllowance,
      maintenanceCost
    };
  },

  // --------------------------------------------------------------------------
  // RIDO INTELLIGENCE ENGINE (CORE USP)
  // --------------------------------------------------------------------------
  STATE_FUEL_RATES: {
    "Punjab": { diesel: 89.25, petrol: 98.60, cng: 84.50, electric: 7.20 },
    "Haryana": { diesel: 90.15, petrol: 97.35, cng: 83.20, electric: 7.10 },
    "Delhi": { diesel: 87.62, petrol: 94.72, cng: 79.50, electric: 6.50 },
    "Maharashtra": { diesel: 92.50, petrol: 104.20, cng: 87.00, electric: 8.00 },
    "Gujarat": { diesel: 92.15, petrol: 96.40, cng: 81.50, electric: 7.50 },
    "Rajasthan": { diesel: 93.70, petrol: 104.85, cng: 86.20, electric: 7.80 },
    "Uttar Pradesh": { diesel: 89.75, petrol: 96.65, cng: 82.00, electric: 6.90 },
    "Karnataka": { diesel: 88.90, petrol: 102.85, cng: 85.50, electric: 7.40 },
    "Tamil Nadu": { diesel: 92.40, petrol: 100.80, cng: 86.00, electric: 7.60 },
    "Telangana": { diesel: 95.65, petrol: 107.40, cng: 89.00, electric: 7.90 },
    "Chandigarh": { diesel: 84.30, petrol: 96.20, cng: 82.00, electric: 6.80 },
    "National Average": { diesel: 90.50, petrol: 98.00, cng: 84.00, electric: 7.50 }
  },

  VEHICLE_CATALOG: {
    "Tata Prima 5530.S": { type: "Heavy Truck", category: "truck", powertrain: "Diesel", efficiency: 4.2, payloadMax: 28000, tollClass: "truck", unit: "L" },
    "BharatBenz 2823R": { type: "Heavy Truck", category: "truck", powertrain: "Diesel", efficiency: 5.4, payloadMax: 18500, tollClass: "truck", unit: "L" },
    "Eicher Pro 3019": { type: "Medium Truck", category: "truck", powertrain: "Diesel", efficiency: 6.8, payloadMax: 11000, tollClass: "truck", unit: "L" },
    "Ashok Leyland 4220": { type: "Heavy Truck", category: "truck", powertrain: "Diesel", efficiency: 4.0, payloadMax: 29000, tollClass: "multiAxle", unit: "L" },
    "Tata 407 LPT": { type: "Medium Truck", category: "truck", powertrain: "Diesel", efficiency: 7.8, payloadMax: 3800, tollClass: "lcv", unit: "L" },
    "Mahindra Bolero Maxi Truck": { type: "Small Pickup", category: "pickup", powertrain: "Diesel", efficiency: 14.2, payloadMax: 1700, tollClass: "lcv", unit: "L" },
    "Tata Ace Gold (Diesel)": { type: "Small Pickup", category: "pickup", powertrain: "Diesel", efficiency: 16.5, payloadMax: 850, tollClass: "lcv", unit: "L" },
    "Tata Ace Gold (CNG)": { type: "Small Pickup", category: "pickup", powertrain: "CNG", efficiency: 21.0, payloadMax: 750, tollClass: "lcv", unit: "kg" },
    "Ashok Leyland Dost+": { type: "Small Pickup", category: "pickup", powertrain: "Diesel", efficiency: 14.8, payloadMax: 1500, tollClass: "lcv", unit: "L" },
    "Tata Ace EV Ultra": { type: "Small Pickup", category: "pickup", powertrain: "Electric (EV)", efficiency: 5.8, payloadMax: 1200, tollClass: "lcv", unit: "kWh" },
    "Mahindra Zor Grand EV": { type: "Small Pickup", category: "pickup", powertrain: "Electric (EV)", efficiency: 8.5, payloadMax: 450, tollClass: "car", unit: "kWh" }
  },

  detectStatesOnRoute(originStr = "", destStr = "", routeCoords = []) {
    const text = (originStr + " " + destStr).toLowerCase();
    const states = [];

    const addIf = (cond, st) => {
      if (cond && !states.includes(st)) states.push(st);
    };

    if (text.includes("ludhiana") || text.includes("punjab") || text.includes("rajpura") || text.includes("amritsar") || text.includes("jalandhar")) {
      addIf(true, "Punjab");
    }
    if (text.includes("chandigarh") || text.includes("mohali")) {
      addIf(true, "Punjab");
      addIf(true, "Chandigarh");
    }
    if (text.includes("delhi") && (text.includes("ludhiana") || text.includes("punjab") || text.includes("ambala") || text.includes("chandigarh"))) {
      addIf(true, "Punjab");
      addIf(true, "Haryana");
      addIf(true, "Delhi");
    }
    if (text.includes("haryana") || text.includes("ambala") || text.includes("panipat") || text.includes("gurugram") || text.includes("sonipat")) {
      addIf(true, "Haryana");
    }
    if (text.includes("delhi")) {
      addIf(true, "Delhi");
    }
    if (text.includes("rajasthan") || text.includes("jaipur") || text.includes("udaipur") || text.includes("kishangarh")) {
      addIf(true, "Rajasthan");
    }
    if (text.includes("gujarat") || text.includes("ahmedabad") || text.includes("surat") || text.includes("vadodara")) {
      addIf(true, "Gujarat");
    }
    if (text.includes("maharashtra") || text.includes("mumbai") || text.includes("pune") || text.includes("thane") || text.includes("bhiwandi") || text.includes("nashik")) {
      addIf(true, "Maharashtra");
    }
    if (text.includes("karnataka") || text.includes("bengaluru") || text.includes("bangalore")) {
      addIf(true, "Karnataka");
    }
    if (text.includes("tamil nadu") || text.includes("chennai")) {
      addIf(true, "Tamil Nadu");
    }

    if (states.length === 0) {
      states.push("National Average");
    }
    return states;
  },

  calculateRidoTripIntelligence(params = {}) {
    const origin = params.origin || "Ludhiana Central Cargo Hub, Punjab";
    const destination = params.destination || "Delhi Central Hub (Okhla Phase-III), Delhi";
    const vehicleModelName = params.vehicleModel || "Tata Prima 5530.S";
    const cargoWeightKg = Number(params.cargoWeight || 8600);
    const waypoints = params.waypoints || [];
    const routeCoords = params.routeCoordinates || [];

    const vehSpec = this.VEHICLE_CATALOG[vehicleModelName] || {
      type: "Heavy Truck",
      category: "truck",
      powertrain: "Diesel",
      efficiency: 4.2,
      payloadMax: 28000,
      tollClass: "truck",
      unit: "L"
    };

    // 1. Detect Highway Distance
    let distanceKm = 0;
    if (params.distance && Number(params.distance) > 0) {
      distanceKm = Number(params.distance);
    } else {
      const lower = (origin + " " + destination).toLowerCase();
      if (lower.includes("ludhiana") && lower.includes("delhi")) distanceKm = 312.0;
      else if (lower.includes("pune") && lower.includes("mumbai")) distanceKm = 148.5;
      else if (lower.includes("delhi") && lower.includes("mumbai")) distanceKm = 1415.0;
      else if (lower.includes("bengaluru") && lower.includes("chennai")) distanceKm = 345.0;
      else distanceKm = 220.0;
    }

    // 2. States Crossed & State Fuel Rates
    const states = this.detectStatesOnRoute(origin, destination, routeCoords);
    const fuelTypeKey = vehSpec.powertrain.toLowerCase().includes("electric")
      ? "electric"
      : (vehSpec.powertrain.toLowerCase().includes("cng") ? "cng" : (vehSpec.powertrain.toLowerCase().includes("petrol") ? "petrol" : "diesel"));

    let sumRate = 0;
    const statePriceDetails = states.map((st) => {
      const rates = this.STATE_FUEL_RATES[st] || this.STATE_FUEL_RATES["National Average"];
      const rate = rates[fuelTypeKey] || 90.50;
      sumRate += rate;
      return {
        state: st,
        fuelPrice: rate,
        unit: vehSpec.unit === "kWh" ? "₹/kWh" : (vehSpec.unit === "kg" ? "₹/kg" : "₹/L")
      };
    });

    const avgFuelPrice = states.length > 0 ? (sumRate / states.length) : 90.50;

    // 3. Fuel Calculation (No User Input)
    const fuelRequired = Number((distanceKm / vehSpec.efficiency).toFixed(2));
    const fuelCost = Number((fuelRequired * avgFuelPrice).toFixed(2));

    // 4. Toll Detection (Major, Small & Local)
    let tollPlazas = [];
    if (routeCoords && routeCoords.length > 5) {
      const matched = this.matchTollPlazasAlongRoute(routeCoords, 4.0, vehSpec.tollClass);
      tollPlazas = matched.matchedTolls;
    }

    // Corridor Preset fallback if OSRM is offline
    if (!tollPlazas || tollPlazas.length === 0) {
      const lower = (origin + " " + destination).toLowerCase();
      if (lower.includes("ludhiana") && lower.includes("delhi")) {
        tollPlazas = [
          { name: "Ladowal Toll Plaza", highway: "NH-44 (Ludhiana GT Road)", state: "Punjab", category: "Major NHAI", rate: vehSpec.tollClass === 'truck' ? 200 : (vehSpec.tollClass === 'multiAxle' ? 305 : 95) },
          { name: "Shambhu Toll Plaza", highway: "NH-44 (Punjab-Haryana Border)", state: "Punjab / Haryana", category: "Interstate Gate", rate: vehSpec.tollClass === 'truck' ? 150 : (vehSpec.tollClass === 'multiAxle' ? 225 : 70) },
          { name: "Gharaunda Toll Plaza", highway: "NH-44 (Karnal GT Road)", state: "Haryana", category: "Highway Corridor", rate: vehSpec.tollClass === 'truck' ? 180 : (vehSpec.tollClass === 'multiAxle' ? 270 : 85) },
          { name: "Murthal Toll Plaza", highway: "NH-44 (Sonipat / Delhi Gateway)", state: "Haryana / Delhi", category: "NCR Entry Gate", rate: vehSpec.tollClass === 'truck' ? 140 : (vehSpec.tollClass === 'multiAxle' ? 210 : 65) }
        ];
      } else if (lower.includes("pune") && lower.includes("mumbai")) {
        tollPlazas = [
          { name: "Talegaon Toll Plaza", highway: "Mumbai-Pune Expressway", state: "Maharashtra", category: "Major Expressway", rate: vehSpec.tollClass === 'truck' ? 240 : (vehSpec.tollClass === 'multiAxle' ? 380 : 120) },
          { name: "Khalapur Toll Plaza", highway: "Mumbai-Pune Expressway", state: "Maharashtra", category: "Expressway Barrier", rate: vehSpec.tollClass === 'truck' ? 385 : (vehSpec.tollClass === 'multiAxle' ? 580 : 190) },
          { name: "Vashi Bridge / Gateway Plaza", highway: "Sion-Panvel Highway", state: "Maharashtra", category: "City Gateway", rate: vehSpec.tollClass === 'truck' ? 175 : (vehSpec.tollClass === 'multiAxle' ? 260 : 85) }
        ];
      } else {
        tollPlazas = [
          { name: "Kherki Daula Toll Plaza", highway: "NH-48", state: "Haryana", category: "Major NHAI", rate: vehSpec.tollClass === 'truck' ? 285 : (vehSpec.tollClass === 'multiAxle' ? 440 : 135) },
          { name: "Shahjahanpur Toll Plaza", highway: "NH-48", state: "Rajasthan", category: "State Border Gate", rate: vehSpec.tollClass === 'truck' ? 535 : (vehSpec.tollClass === 'multiAxle' ? 815 : 255) },
          { name: "Manoharpur Toll Plaza", highway: "NH-48", state: "Rajasthan", category: "Highway Corridor", rate: vehSpec.tollClass === 'truck' ? 325 : (vehSpec.tollClass === 'multiAxle' ? 495 : 155) }
        ];
      }
    }

    const totalTollCost = tollPlazas.reduce((sum, t) => sum + (Number(t.rate) || 0), 0);

    // 5. Driver Bata (Allowance) & Maintenance
    const driverAllowance = distanceKm > 100 ? 650.0 : 350.0;
    const maintenanceCost = Number((distanceKm * (vehSpec.unit === 'kWh' ? 0.8 : 2.1)).toFixed(2));

    // 6. TOTAL ROUTE COST
    const totalRouteCost = Number((fuelCost + totalTollCost + driverAllowance + maintenanceCost).toFixed(2));
    const costPerKm = Number((totalRouteCost / distanceKm).toFixed(2));

    // Duration calculation
    const avgSpeed = distanceKm > 300 ? 55 : 45;
    const driveHours = distanceKm / avgSpeed;
    const h = Math.floor(driveHours);
    const m = Math.round((driveHours - h) * 60);
    const durationFormatted = `${h}h ${m.toString().padStart(2, "0")}m`;

    return {
      origin,
      destination,
      vehicle: {
        name: vehicleModelName,
        type: vehSpec.type,
        category: vehSpec.category,
        powertrain: vehSpec.powertrain,
        efficiency: vehSpec.efficiency,
        payloadMax: vehSpec.payloadMax,
        unit: vehSpec.unit,
        tollClass: vehSpec.tollClass
      },
      cargoWeightKg,
      distanceKm,
      durationFormatted,
      statesCrossed: states,
      statePriceDetails,
      avgFuelPrice,
      fuelRequired,
      fuelCost,
      tollPlazas,
      totalTollCost,
      driverAllowance,
      maintenanceCost,
      totalRouteCost,
      costPerKm
    };
  },

  /**
   * Calculates CO2 footprint and ESG emission abatement for a given distance and fuel type.
   * @param {number} distanceKm
   * @param {string} powertrain - e.g. "Diesel", "Electric (EV)", "CNG"
   * @returns {{ co2Kg: number, savingsKg: number }}
   */
  calculateEmissionSavings(distanceKm = 0, powertrain = "Diesel") {
    const dist = Number(distanceKm) || 0;
    if (dist <= 0) return { co2Kg: 0, savingsKg: 0 };

    const baselineDieselCo2Kg = dist * 0.72; // ~0.72 kg CO2 per km for heavy diesel commercial truck
    let actualCo2Kg = baselineDieselCo2Kg;

    if (powertrain.includes("Electric") || powertrain.includes("EV")) {
      actualCo2Kg = dist * 0.12; // Grid factor equivalent
    } else if (powertrain.includes("CNG")) {
      actualCo2Kg = dist * 0.54;
    }

    const savingsKg = Math.max(0, +(baselineDieselCo2Kg - actualCo2Kg).toFixed(1));
    return {
      co2Kg: +actualCo2Kg.toFixed(1),
      savingsKg
    };
  }
};

window.OptimizerEngine = OptimizerEngine;

