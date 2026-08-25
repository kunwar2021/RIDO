/**
 * ==============================================================================
 * RIDO — External API Client Layer (`api.js`)
 * ==============================================================================
 * Centralizes all external HTTP networking for OSRM Road Geometry routing,
 * India Post PIN code resolution, and Nominatim OpenStreetMap geocoding.
 */

const ApiClient = {
  geocodeCache: new Map(),

  /**
   * Fetches Real-World Highway Geometry & Mileage from OSRM Routing Engine
   * @param {Array<{lat: number, lng: number, label?: string, name?: string}>} waypoints
   * @param {AbortSignal} [externalSignal]
   * @returns {Promise<Object>} Rich Route Result Object
   */
  async fetchOSRMRoute(waypoints, externalSignal = null) {
    if (!waypoints || waypoints.length < 2) {
      return this.buildEmptyRouteResult();
    }

    const validPoints = waypoints.filter(
      (wp) => wp && Number.isFinite(Number(wp.lat)) && Number.isFinite(Number(wp.lng))
    );
    if (validPoints.length < 2) {
      return this.buildEmptyRouteResult();
    }

    const coordinateQuery = validPoints
      .map((wp) => `${Number(wp.lng).toFixed(5)},${Number(wp.lat).toFixed(5)}`)
      .join(";");

    const cacheKey = `osrm_full_${coordinateQuery}`;
    if (this.geocodeCache.has(cacheKey)) {
      console.log("[RIDO ROUTE] Returning cached OSRM route result for:", coordinateQuery);
      return this.geocodeCache.get(cacheKey);
    }

    const endpointUrl = `${CONFIG.API.OSRM_ROUTING_BASE}/${coordinateQuery}?overview=full&geometries=geojson&steps=true&annotations=true`;

    console.log("[RIDO ROUTE] Request started -> OSRM API call for coordinates:", coordinateQuery);

    try {
      const controller = new AbortController();
      const timeoutMs = CONFIG.API.REQUEST_TIMEOUT_MS || 10000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Listen to external signal if provided (for destination switch cancellation)
      if (externalSignal) {
        externalSignal.addEventListener("abort", () => controller.abort());
      }

      const response = await fetch(endpointUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const payload = await response.json();
        if (payload.code === "Ok" && payload.routes && payload.routes[0]) {
          const route = payload.routes[0];
          const coords = (route.geometry?.coordinates || []).map((c) => [c[1], c[0]]);
          const distKm = Number((route.distance / 1000).toFixed(1));
          const durMins = Math.round((route.duration || 0) / 60);

          const legs = (route.legs || []).map((leg, idx) => {
            const pFrom = validPoints[idx];
            const pTo = validPoints[idx + 1];
            return {
              from: pFrom?.label || pFrom?.customer || pFrom?.name || `Stop ${idx + 1}`,
              to: pTo?.label || pTo?.customer || pTo?.name || `Stop ${idx + 2}`,
              distanceKm: Number(((leg.distance || 0) / 1000).toFixed(1)),
              durationMinutes: Math.round((leg.duration || 0) / 60),
              steps: leg.steps || []
            };
          });

          const routeResult = {
            status: "success",
            provider: "OSRM",
            isRealRoadRoute: true,
            coordinates: coords,
            distanceMeters: route.distance,
            distanceKm: distKm,
            durationSeconds: route.duration,
            durationMinutes: durMins,
            legs: legs,
            steps: route.legs ? route.legs.flatMap((l) => l.steps || []) : [],
            annotations: route.legs ? route.legs.map((l) => l.annotation).filter(Boolean) : null,
            calculatedAt: Date.now()
          };

          console.log(`[RIDO ROUTE] Route loaded successfully from OSRM: ${distKm} km, ${durMins} mins, ${coords.length} points`);
          this.geocodeCache.set(cacheKey, routeResult);
          return routeResult;
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn("[RIDO ROUTE] OSRM route request aborted/cancelled.");
        throw error;
      }
      console.warn("[RIDO ROUTE] OSRM route request timed out or failed. Falling back to Haversine trajectory:", error);
    }

    // High-Density Haversine Fallback Result
    return this.buildHaversineFallbackResult(validPoints);
  },

  buildEmptyRouteResult() {
    return {
      status: "idle",
      provider: "None",
      isRealRoadRoute: false,
      coordinates: [],
      distanceMeters: 0,
      distanceKm: 0,
      durationSeconds: 0,
      durationMinutes: 0,
      legs: [],
      steps: [],
      annotations: null,
      calculatedAt: Date.now()
    };
  },

  buildHaversineFallbackResult(validPoints) {
    const coords = this.generateInterpolatedHaversineRoute(validPoints);
    let totalHavKm = 0;
    const legs = [];

    for (let i = 0; i < validPoints.length - 1; i++) {
      const p1 = validPoints[i];
      const p2 = validPoints[i + 1];
      const dist = Utils.haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      totalHavKm += dist;

      legs.push({
        from: p1.label || p1.customer || p1.name || `Stop ${i + 1}`,
        to: p2.label || p2.customer || p2.name || `Stop ${i + 2}`,
        distanceKm: Number(dist.toFixed(1)),
        durationMinutes: Math.round((dist / 50.0) * 60),
        steps: []
      });
    }

    const distKm = Number(totalHavKm.toFixed(1));
    const durMins = Math.round((distKm / 50.0) * 60);

    console.warn(`[RIDO ROUTE] Using Haversine Fallback Route: ${distKm} km, ${durMins} mins`);

    return {
      status: "fallback",
      provider: "Haversine Fallback",
      isRealRoadRoute: false,
      coordinates: coords,
      distanceMeters: Math.round(distKm * 1000),
      distanceKm: distKm,
      durationSeconds: durMins * 60,
      durationMinutes: durMins,
      legs: legs,
      steps: [],
      annotations: null,
      calculatedAt: Date.now()
    };
  },

  generateInterpolatedHaversineRoute(points) {
    const polyline = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const distance = Utils.haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      const stepCount = Math.max(6, Math.min(60, Math.floor(distance * 1.5)));

      for (let s = 0; s <= stepCount; s++) {
        const ratio = s / stepCount;
        const lat = p1.lat + (p2.lat - p1.lat) * ratio;
        const lng = p1.lng + (p2.lng - p1.lng) * ratio;
        polyline.push([lat, lng]);
      }
    }
    return polyline;
  },

  /**
   * Fetches nearby fuel stations around the route corridor
   * @param {Array<[number, number]>} routeCoordinates
   * @param {AbortSignal} [signal]
   * @returns {Promise<Array<Object>>} Array of fuel station objects
   */
  async fetchNearbyFuelStations(routeCoordinates, signal = null) {
    if (!routeCoordinates || routeCoordinates.length < 2) return [];

    // Calculate Bounding Box
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    routeCoordinates.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    // Add 0.05 degree margin (~5 km buffer)
    minLat -= 0.05; maxLat += 0.05;
    minLng -= 0.05; maxLng += 0.05;

    const cacheKey = `fuel_${minLat.toFixed(2)}_${maxLat.toFixed(2)}_${minLng.toFixed(2)}_${maxLng.toFixed(2)}`;
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey);
    }

    try {
      const overpassQuery = `[out:json][timeout:4];node["amenity"="fuel"](${minLat.toFixed(4)},${minLng.toFixed(4)},${maxLat.toFixed(4)},${maxLng.toFixed(4)});out body 35;`;
      const url = `${CONFIG.API.OVERPASS_FUEL_BASE}?data=${encodeURIComponent(overpassQuery)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      if (signal) signal.addEventListener("abort", () => controller.abort());

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.elements && data.elements.length > 0) {
          const stations = data.elements.map((el) => {
            const tags = el.tags || {};
            const name = tags.name || tags.brand || tags["operator"] || "Highway Fuel Station";
            const brand = tags.brand || tags["operator"] || (name.includes("Indian") ? "IndianOil" : name.includes("Bharat") ? "Bharat Petroleum" : name.includes("HP") ? "HPCL" : "Petrol/Diesel Station");
            return {
              id: `fuel_osm_${el.id}`,
              name: name,
              brand: brand,
              lat: el.lat,
              lng: el.lon,
              type: tags.fuel_cng === "yes" ? "Multi-Fuel & CNG" : "Diesel & EV Express",
              operator: brand
            };
          });

          // Filter stations that are within 4 km of the route polyline
          const matched = this.filterPointsNearPolyline(stations, routeCoordinates, 4.0);
          console.log(`[RIDO FUEL] Overpass returned ${matched.length} verified OSM fuel stations near corridor.`);
          this.geocodeCache.set(cacheKey, matched);
          return matched;
        }
      }
    } catch (err) {
      console.warn("[RIDO FUEL] Overpass API fuel station query skipped or timed out. Falling back to highway fuel database:", err);
    }

    // Fallback: Filter from verified All-India Highway Fuel Database
    const fallbackStations = this.filterPointsNearPolyline(PAN_INDIA_HIGHWAY_FUEL_STATIONS, routeCoordinates, 4.5);
    console.log(`[RIDO FUEL] Matched ${fallbackStations.length} highway fuel stations from verified corridor database.`);
    this.geocodeCache.set(cacheKey, fallbackStations);
    return fallbackStations;
  },

  /**
   * Helper: Filter points within maxDistKm of a route polyline
   */
  filterPointsNearPolyline(points, polyline, maxDistKm = 4.0) {
    if (!points || !polyline || polyline.length === 0) return [];
    const stepSize = Math.max(1, Math.floor(polyline.length / 100)); // Sample polyline for performance

    const matched = [];
    const seenNames = new Set();

    points.forEach((pt) => {
      let minDist = Infinity;
      let minIdx = 0;

      for (let i = 0; i < polyline.length; i += stepSize) {
        const [pLat, pLng] = polyline[i];
        const dist = Utils.haversineDistance(pt.lat, pt.lng, pLat, pLng);
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }

      if (minDist <= maxDistKm) {
        const cleanName = (pt.name || pt.id).toLowerCase();
        if (!seenNames.has(cleanName)) {
          seenNames.add(cleanName);
          matched.push({
            ...pt,
            distFromRouteKm: Number(minDist.toFixed(1)),
            routeProgressRatio: minIdx / polyline.length
          });
        }
      }
    });

    // Sort by position along the route
    matched.sort((a, b) => a.routeProgressRatio - b.routeProgressRatio);
    return matched;
  },

  /**
   * Resolves official Indian 6-Digit Postal PIN Code via India Post API
   * @param {string} pincode
   */
  async fetchPostalPinCode(pincode) {
    const cleanPin = (pincode || "").trim();
    if (!/^\d{6}$/.test(cleanPin)) return [];

    if (this.geocodeCache.has(cleanPin)) {
      return this.geocodeCache.get(cleanPin);
    }

    // 1. Local Database Exact PIN Match
    const localDbMatches = (window.ALL_INDIA_CITIES_DATABASE || []).filter(
      (c) => c.pincode === cleanPin
    );
    if (localDbMatches.length > 0) {
      this.geocodeCache.set(cleanPin, localDbMatches);
      return localDbMatches;
    }

    // 2. Smart Regional PIN Prefix Fallback Coords
    let approxCoords = { lat: 28.6139, lng: 77.2090 };
    const p3 = cleanPin.slice(0, 3);
    if (p3 === "141" || p3 === "142") approxCoords = { lat: 30.8875, lng: 75.8340 };
    else if (p3 === "140" || p3 === "147") approxCoords = { lat: 30.4839, lng: 76.5939 };
    else if (p3 === "160") approxCoords = { lat: 30.7333, lng: 76.7794 };
    else if (p3 === "143") approxCoords = { lat: 31.6340, lng: 74.8723 };
    else if (p3 === "144") approxCoords = { lat: 31.3260, lng: 75.5762 };
    else if (p3 === "122") approxCoords = { lat: 28.4595, lng: 77.0266 };
    else if (p3 === "201") approxCoords = { lat: 28.5355, lng: 77.3910 };
    else if (p3 === "400") approxCoords = { lat: 19.0760, lng: 72.8777 };
    else if (p3 === "302") approxCoords = { lat: 26.9124, lng: 75.7873 };
    else if (p3 === "380") approxCoords = { lat: 23.0225, lng: 72.5714 };
    else if (p3 === "600") approxCoords = { lat: 13.0827, lng: 80.2707 };
    else if (p3 === "700") approxCoords = { lat: 22.5726, lng: 88.3639 };
    else if (p3 === "560") approxCoords = { lat: 12.9716, lng: 77.5946 };
    else if (p3 === "500") approxCoords = { lat: 17.3850, lng: 78.4867 };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.REQUEST_TIMEOUT_MS);

      const [postResp, nomResp] = await Promise.allSettled([
        fetch(`${CONFIG.API.INDIA_POST_BASE}/${cleanPin}`, { signal: controller.signal }),
        fetch(
          `${CONFIG.API.NOMINATIM_GEOCODING_BASE}?format=json&postalcode=${cleanPin}&countrycodes=in&limit=1`,
          { headers: { "Accept-Language": "en" }, signal: controller.signal }
        )
      ]);
      clearTimeout(timeoutId);

      if (nomResp.status === "fulfilled" && nomResp.value.ok) {
        const nomData = await nomResp.value.json();
        if (nomData && nomData[0] && nomData[0].lat && nomData[0].lon) {
          const nomLat = parseFloat(nomData[0].lat);
          const nomLng = parseFloat(nomData[0].lon);

          let isRegionMatch = true;
          const p2 = cleanPin.slice(0, 2);
          if ((p2 === "14" || p2 === "16") && (nomLat < 29.0 || nomLat > 33.0)) {
            isRegionMatch = false;
          } else if (p2 === "11" && (nomLat < 28.0 || nomLat > 29.2)) {
            isRegionMatch = false;
          } else if ((p2 === "40" || p2 === "41") && (nomLat < 18.0 || nomLat > 21.0)) {
            isRegionMatch = false;
          }

          if (Utils.isIndianCoordinate(nomLat, nomLng) && isRegionMatch) {
            approxCoords = { lat: nomLat, lng: nomLng };
          }
        }
      }

      const results = [];
      if (postResp.status === "fulfilled" && postResp.value.ok) {
        const postData = await postResp.value.json();
        if (postData && postData[0] && postData[0].Status === "Success" && postData[0].PostOffice) {
          postData[0].PostOffice.slice(0, 6).forEach((po, idx) => {
            results.push({
              id: `pin_${cleanPin}_${idx}`,
              name: `${po.Name} (${po.Pincode})`,
              address: `${po.Name}, ${po.District}, ${po.State} - ${po.Pincode}`,
              pincode: po.Pincode,
              district: po.District,
              state: po.State,
              lat: approxCoords.lat + idx * 0.002,
              lng: approxCoords.lng + idx * 0.002,
              badge: `📮 PIN ${po.Pincode}`,
              isPinCode: true
            });
          });
        }
      }

      this.geocodeCache.set(cleanPin, results);
      return results;
    } catch (err) {
      console.warn("[RIDO API] Postal PIN geocode failed:", err);
      return [];
    }
  },

  /**
   * Queries OpenStreetMap Nominatim for Locality or City
   * @param {string} query
   */
  async fetchNominatimGeocode(query) {
    const cleanQuery = (query || "").trim();
    if (cleanQuery.length < 2) return [];

    const cacheKey = `geo_${cleanQuery.toLowerCase()}`;
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.REQUEST_TIMEOUT_MS);

      const url = `${CONFIG.API.NOMINATIM_GEOCODING_BASE}?format=json&q=${encodeURIComponent(
        cleanQuery
      )}&countrycodes=in&limit=7&addressdetails=1`;

      const response = await fetch(url, {
        headers: { "Accept-Language": "en" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const results = [];
      if (response.ok) {
        const data = await response.json();
        data.forEach((item) => {
          const addr = item.address || {};
          const locality =
            addr.suburb ||
            addr.neighbourhood ||
            addr.city_district ||
            addr.town ||
            addr.village ||
            item.display_name.split(",")[0];
          const city = addr.city || addr.state_district || addr.county || "";
          const state = addr.state || "India";
          const postcode = addr.postcode || "";

          results.push({
            id: `geo_${item.place_id}`,
            name: `${locality}${city ? ", " + city : ""}`,
            address: item.display_name,
            pincode: postcode,
            district: city,
            state: state,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            badge: postcode ? `📮 ${postcode}` : `📍 ${state}`,
            isGeocoded: true
          });
        });
      }

      this.geocodeCache.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn("[RIDO API] Nominatim geocode request failed:", err);
      return [];
    }
  }
};

window.ApiClient = ApiClient;
