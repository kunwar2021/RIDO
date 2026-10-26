/**
 * ==============================================================================
 * RIDO — Location Intelligence & Pan-India Database (`locations.js`)
 * ==============================================================================
 * Centralizes all nationwide logistics hubs, transport nagars, industrial
 * focal points, and express freight corridor presets.
 */

class IndiaLocationEngine {
  constructor(options = {}) {
    this.debounceMs = options.debounceMs || CONFIG.API.GEOCODE_DEBOUNCE_MS;
    this.debounceTimer = null;
    this.searchCache = new Map();
  }

  isPostalPinCode(query) {
    return /^\d{6}$/.test((query || "").trim());
  }

  findLocalCity(name) {
    if (!name || typeof name !== "string") return null;
    const lower = name.toLowerCase().trim();
    return (window.ALL_INDIA_CITIES_DATABASE || []).find(c =>
      c.name.toLowerCase().includes(lower) || c.district.toLowerCase().includes(lower)
    ) || null;
  }

  search(query, callback) {
    clearTimeout(this.debounceTimer);
    const cleanQuery = (query || "").trim();

    if (cleanQuery.length < 2) {
      callback([]);
      return;
    }

    if (this.searchCache.has(cleanQuery.toLowerCase())) {
      callback(this.searchCache.get(cleanQuery.toLowerCase()));
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      let results = [];
      try {
        if (this.isPostalPinCode(cleanQuery)) {
          results = await ApiClient.fetchPostalPinCode(cleanQuery);
        } else {
          results = await ApiClient.fetchNominatimGeocode(cleanQuery);
        }
      } catch (err) {
        console.warn("[IndiaLocationEngine] Search error:", err);
      }
      if (results && results.length > 0) {
        this.searchCache.set(cleanQuery.toLowerCase(), results);
      }
      callback(results);
    }, this.debounceMs);
  }
}


// ------------------------------------------------------------------------------
// Comprehensive All-India Cities, Focal Points & Transport Nagars Directory
// ------------------------------------------------------------------------------
const ALL_INDIA_CITIES_DATABASE = [
  // ─── PUNJAB & CHANDIGARH TRICITY ───
  { id: "city_rajpura", name: "Rajpura Focal Point Logistics Hub", district: "Patiala", state: "Punjab", pincode: "140401", lat: 30.4839, lng: 76.5939, address: "Focal Point Industrial Area, GT Road, Rajpura, Punjab - 140401" },
  { id: "city_rajpura_tn", name: "Rajpura Transport Nagar Depot", district: "Patiala", state: "Punjab", pincode: "140401", lat: 30.4912, lng: 76.6021, address: "Old GT Road, Rajpura, Punjab - 140401" },
  { id: "city_ludhiana", name: "Ludhiana Central Cargo Hub (Industrial Area-A)", district: "Ludhiana", state: "Punjab", pincode: "141001", lat: 30.9010, lng: 75.8573, address: "Industrial Area-A, GT Road, Ludhiana, Punjab - 141001" },
  { id: "city_ludhiana_basant", name: "Basant Avenue Freight Hub (Ludhiana)", district: "Ludhiana", state: "Punjab", pincode: "141013", lat: 30.8875, lng: 75.8340, address: "Basant Avenue, Urban Estate Phase-2, Ludhiana, Punjab - 141013" },
  { id: "city_ludhiana_fp", name: "Ludhiana Focal Point Logistics Terminal", district: "Ludhiana", state: "Punjab", pincode: "141010", lat: 30.8780, lng: 75.9120, address: "Focal Point Phase-V, Ludhiana, Punjab - 141010" },
  { id: "city_ludhiana_tn", name: "Ludhiana Transport Nagar Hub", district: "Ludhiana", state: "Punjab", pincode: "141008", lat: 30.9120, lng: 75.8820, address: "Samrala Chowk, Transport Nagar, Ludhiana, Punjab - 141008" },
  { id: "city_amritsar", name: "Amritsar GT Road Freight Terminal", district: "Amritsar", state: "Punjab", pincode: "143001", lat: 31.6340, lng: 74.8723, address: "GT Road Cargo Complex, Amritsar, Punjab - 143001" },
  { id: "city_jalandhar", name: "Jalandhar Transport Nagar Hub", district: "Jalandhar", state: "Punjab", pincode: "144001", lat: 31.3260, lng: 75.5762, address: "Transport Nagar, GT Road, Jalandhar, Punjab - 144001" },
  { id: "city_patiala", name: "Patiala Industrial Estate Terminal", district: "Patiala", state: "Punjab", pincode: "147001", lat: 30.3398, lng: 76.3869, address: "Focal Point Industrial Area, Patiala, Punjab - 147001" },
  { id: "city_bathinda", name: "Bathinda Multimodal Freight Base", district: "Bathinda", state: "Punjab", pincode: "151001", lat: 30.2110, lng: 74.9455, address: "Growth Center Industrial Area, Bathinda, Punjab - 151001" },
  { id: "city_chd_17", name: "Chandigarh Central Depot (Sector 17)", district: "Chandigarh", state: "Chandigarh", pincode: "160017", lat: 30.7415, lng: 76.7684, address: "Sector 17 City Center, Chandigarh - 160017" },
  { id: "city_chd_ind", name: "Chandigarh Industrial Area Phase-1", district: "Chandigarh", state: "Chandigarh", pincode: "160002", lat: 30.7060, lng: 76.8020, address: "Industrial Area Phase 1, Chandigarh - 160002" },
  { id: "city_mohali", name: "Mohali Phase-8 Industrial Area", district: "SAS Nagar", state: "Punjab", pincode: "160071", lat: 30.7046, lng: 76.7179, address: "Phase 8 Industrial Area, Mohali, Punjab - 160071" },
  { id: "city_panchkula", name: "Panchkula Sector 5 Logistics Depot", district: "Panchkula", state: "Haryana", pincode: "134109", lat: 30.6942, lng: 76.8606, address: "Sector 5 City Center, Panchkula, Haryana - 134109" },
  { id: "city_zirakpur", name: "Zirakpur VIP Road Logistics Terminal", district: "SAS Nagar", state: "Punjab", pincode: "140603", lat: 30.6425, lng: 76.8173, address: "VIP Road Express Logistics, Zirakpur, Punjab - 140603" },
  { id: "city_derabassi", name: "Dera Bassi Industrial Corridor", district: "SAS Nagar", state: "Punjab", pincode: "140507", lat: 30.5840, lng: 76.8440, address: "Barwala Road Industrial Area, Dera Bassi, Punjab - 140507" },
  { id: "city_mandi_gobindgarh", name: "Mandi Gobindgarh Steel City Hub", district: "Fatehgarh Sahib", state: "Punjab", pincode: "147301", lat: 30.6650, lng: 76.2990, address: "GT Road Steel Cluster, Mandi Gobindgarh, Punjab - 147301" },

  // ─── DELHI NCR & HARYANA ───
  { id: "city_delhi_okhla", name: "Delhi Central Hub (Okhla Industrial Phase-III)", district: "South Delhi", state: "Delhi", pincode: "110020", lat: 28.5355, lng: 77.2631, address: "Okhla Phase-III Industrial Area, New Delhi - 110020" },
  { id: "city_delhi_cp", name: "Connaught Place Commercial Hub", district: "Central Delhi", state: "Delhi", pincode: "110001", lat: 28.6315, lng: 77.2167, address: "Connaught Place Inner Circle, New Delhi - 110001" },
  { id: "city_delhi_dwarka", name: "Dwarka Cargo Express Terminal", district: "South West Delhi", state: "Delhi", pincode: "110075", lat: 28.5921, lng: 77.0460, address: "Dwarka Sector 21 Freight Hub, New Delhi - 110075" },
  { id: "city_gurugram", name: "Gurugram DLF Cyber City Logistics", district: "Gurugram", state: "Haryana", pincode: "122002", lat: 28.4950, lng: 77.0895, address: "DLF Cyber City, DLF Phase 2, Gurugram, Haryana - 122002" },
  { id: "city_manesar", name: "Manesar IMT Industrial Express Hub", district: "Gurugram", state: "Haryana", pincode: "122050", lat: 28.3540, lng: 76.9380, address: "IMT Manesar Auto Cluster, Gurugram, Haryana - 122050" },
  { id: "city_noida", name: "Noida Sector 62 Tech & Freight Hub", district: "Gautam Buddha Nagar", state: "Uttar Pradesh", pincode: "201301", lat: 28.6280, lng: 77.3649, address: "Sector 62 Institutional Area, Noida, UP - 201301" },
  { id: "city_gr_noida", name: "Greater Noida Ecotech Industrial Zone", district: "Gautam Buddha Nagar", state: "Uttar Pradesh", pincode: "201308", lat: 28.4744, lng: 77.5040, address: "Ecotech Industrial Area, Greater Noida, UP - 201308" },
  { id: "city_faridabad", name: "Faridabad Industrial Corridor", district: "Faridabad", state: "Haryana", pincode: "121001", lat: 28.4089, lng: 77.3178, address: "Bata Chowk Industrial Area, Faridabad, Haryana - 121001" },
  { id: "city_ghaziabad", name: "Ghaziabad Mohan Nagar Logistics Hub", district: "Ghaziabad", state: "Uttar Pradesh", pincode: "201007", lat: 28.6720, lng: 77.3880, address: "Mohan Nagar Industrial Zone, Ghaziabad, UP - 201007" },
  { id: "city_panipat", name: "Panipat Textile & Cargo Terminal", district: "Panipat", state: "Haryana", pincode: "132103", lat: 29.3909, lng: 76.9635, address: "GT Road Industrial Estate, Panipat, Haryana - 132103" },
  { id: "city_sonipat", name: "Sonipat Kundli Industrial Hub (KMP)", district: "Sonipat", state: "Haryana", pincode: "131028", lat: 28.8740, lng: 77.1260, address: "Kundli Industrial Area, Sonipat, Haryana - 131028" },
  { id: "city_ambala", name: "Ambala Cantt Multi-modal Rail-Road Depot", district: "Ambala", state: "Haryana", pincode: "133001", lat: 30.3610, lng: 76.8400, address: "GT Road Junction Depot, Ambala Cantt, Haryana - 133001" },

  // ─── RAJASTHAN ───
  { id: "city_jaipur_sitapura", name: "Jaipur Sitapura Industrial Logistics Terminal", district: "Jaipur", state: "Rajasthan", pincode: "302022", lat: 26.7824, lng: 75.8284, address: "Sitapura Industrial Area, Tonk Road, Jaipur, Rajasthan - 302022" },
  { id: "city_jaipur_vki", name: "Jaipur VKIA Transport Hub", district: "Jaipur", state: "Rajasthan", pincode: "302013", lat: 26.9850, lng: 75.7720, address: "Vishwakarma Industrial Area (VKIA), Jaipur, Rajasthan - 302013" },
  { id: "city_jodhpur", name: "Jodhpur Boranada Industrial Park", district: "Jodhpur", state: "Rajasthan", pincode: "342012", lat: 26.2389, lng: 73.0243, address: "Boranada Industrial Estate, Jodhpur, Rajasthan - 342012" },
  { id: "city_udaipur", name: "Udaipur Sukher Industrial Terminal", district: "Udaipur", state: "Rajasthan", pincode: "313001", lat: 24.5854, lng: 73.7125, address: "Sukher Industrial Area, Udaipur, Rajasthan - 313001" },
  { id: "city_neemrana", name: "Neemrana Japanese Zone Terminal", district: "Kotputli-Behror", state: "Rajasthan", pincode: "301705", lat: 27.9880, lng: 76.3860, address: "Japanese Zone, RIICO Industrial Area, Neemrana - 301705" },

  // ─── MAHARASHTRA & GUJARAT ───
  { id: "city_mumbai_bhiwandi", name: "Mumbai Gateway Logistics Park (Bhiwandi)", district: "Thane", state: "Maharashtra", pincode: "421302", lat: 19.2812, lng: 73.0483, address: "Bhiwandi National Logistics Park, Mumbai Region - 421302" },
  { id: "city_mumbai_bkc", name: "Mumbai Bandra-Kurla Complex (BKC)", district: "Mumbai Suburban", state: "Maharashtra", pincode: "400051", lat: 19.0664, lng: 72.8677, address: "Bandra-Kurla Complex, Bandra East, Mumbai - 400051" },
  { id: "city_mumbai_jnpt", name: "JNPT Nhava Sheva Freight Port", district: "Raigad", state: "Maharashtra", pincode: "400707", lat: 18.9483, lng: 72.9467, address: "JNPT Port Freight Terminal, Navi Mumbai - 400707" },
  { id: "city_pune_chakan", name: "Pune Chakan MIDC Auto Hub", district: "Pune", state: "Maharashtra", pincode: "410501", lat: 18.7610, lng: 73.8560, address: "Chakan Industrial Corridor, Pune, Maharashtra - 410501" },
  { id: "city_nagpur_mihan", name: "Nagpur MIHAN Multimodal Central Hub", district: "Nagpur", state: "Maharashtra", pincode: "441108", lat: 21.0560, lng: 79.0558, address: "MIHAN SEZ Multi-Modal Cargo Hub, Nagpur, MH - 441108" },
  { id: "city_ahmedabad_sanand", name: "Ahmedabad Sanand GIDC Terminal", district: "Ahmedabad", state: "Gujarat", pincode: "382110", lat: 22.9868, lng: 72.3813, address: "Sanand GIDC Industrial Estate, Ahmedabad, Gujarat - 382110" },

  // ─── SOUTH & EAST INDIA ───
  { id: "city_blr_whitefield", name: "Bengaluru Whitefield EPIP Multimodal Hub", district: "Bengaluru Urban", state: "Karnataka", pincode: "560066", lat: 12.9698, lng: 77.7499, address: "Whitefield EPIP Industrial Zone, Bengaluru - 560066" },
  { id: "city_blr_ecity", name: "Bengaluru Electronic City Tech Terminal", district: "Bengaluru Urban", state: "Karnataka", pincode: "560100", lat: 12.8452, lng: 77.6602, address: "Electronic City Phase 1, Hosur Road, Bengaluru - 560100" },
  { id: "city_hyd_shamshabad", name: "Hyderabad Deccan Terminal (Shamshabad)", district: "Rangareddy", state: "Telangana", pincode: "500409", lat: 17.2403, lng: 78.4294, address: "GMR Aerospace & Logistics Park, Shamshabad, Hyderabad - 500409" },
  { id: "city_chennai_port", name: "Chennai Harbour Logistics Terminal", district: "Chennai", state: "Tamil Nadu", pincode: "600001", lat: 13.0827, lng: 80.2938, address: "Chennai Port Trust Freight Terminal, Chennai, TN - 600001" },
  { id: "city_chennai_sriperumbudur", name: "Chennai Sriperumbudur Auto Corridor", district: "Kanchipuram", state: "Tamil Nadu", pincode: "602105", lat: 12.9716, lng: 79.9432, address: "Sriperumbudur Industrial Park, Tamil Nadu - 602105" },
  { id: "city_kolkata_dankuni", name: "Kolkata Dankuni Inland Container Terminal", district: "Hooghly", state: "West Bengal", pincode: "712311", lat: 22.6845, lng: 88.2917, address: "Dankuni Multimodal Freight Terminal, Kolkata, WB - 712311" }
];

// ------------------------------------------------------------------------------
// Strategic Freight Corridor Presets
// ------------------------------------------------------------------------------
const STRATEGIC_FREIGHT_CORRIDORS = {
  ludhiana_rajpura_delhi: {
    name: "NH-44: Ludhiana ➔ Rajpura ➔ Delhi",
    zone: "all_india",
    start: { id: "corridor_ludhiana", name: "Ludhiana Logistics Park, GT Road", address: "GT Road, Ludhiana, Punjab 141010", lat: 30.9010, lng: 75.8573, isCustom: true },
    end: { id: "corridor_delhi", name: "Delhi National Fulfillment Terminal", address: "Dwarka Logistics Hub, New Delhi 110037", lat: 28.6139, lng: 77.2090, isCustom: true },
    stops: [
      { id: "STP-COR-1", customer: "Rajpura Inward Terminal", address: "NH-44, Rajpura, Punjab 140401", lat: 30.4840, lng: 76.5938, priority: "Urgent", weight: 450, status: "Pending" },
      { id: "STP-COR-2", customer: "Ambala Multimodal Hub", address: "GT Road, Ambala Cantt 133001", lat: 30.3782, lng: 76.7767, priority: "High", weight: 320, status: "Pending" },
      { id: "STP-COR-3", customer: "Panipat Industrial Distribution", address: "Sector 25, Panipat 132103", lat: 29.3909, lng: 76.9635, priority: "Standard", weight: 280, status: "Pending" }
    ]
  },
  mumbai_pune_express: {
    name: "Western: Mumbai ➔ Bhiwandi ➔ Pune",
    zone: "mumbai_pune",
    start: { id: "corridor_mumbai", name: "JNPT Freight Port, Navi Mumbai", address: "JNPT Terminal, Navi Mumbai 400707", lat: 18.9499, lng: 72.9511, isCustom: true },
    end: { id: "corridor_pune", name: "Chakan Industrial Zone, Pune", address: "Chakan MIDC Phase II, Pune 410501", lat: 18.7606, lng: 73.8636, isCustom: true },
    stops: [
      { id: "STP-COR-4", customer: "Bhiwandi E-Commerce Warehouses", address: "Mankoli Naka, Bhiwandi 421302", lat: 19.2967, lng: 73.0631, priority: "Urgent", weight: 520, status: "Pending" },
      { id: "STP-COR-5", customer: "Panvel Cold-Chain Hub", address: "Old Mumbai-Pune Highway, Panvel 410206", lat: 18.9894, lng: 73.1175, priority: "High", weight: 340, status: "Pending" }
    ]
  },
  blr_chennai_port: {
    name: "Southern: BLR ➔ Chennai Port",
    zone: "bengaluru_south",
    start: { id: "corridor_blr", name: "Electronic City Logistics Depot, Bengaluru", address: "Hosur Road, Bengaluru 560100", lat: 12.8452, lng: 77.6602, isCustom: true },
    end: { id: "corridor_chennai", name: "Chennai Sea Freight Port Terminal", address: "Rajaji Salai, Chennai 600001", lat: 13.0827, lng: 80.2707, isCustom: true },
    stops: [
      { id: "STP-COR-6", customer: "Hosur Automotive Distribution", address: "SIPCOT Industrial Complex, Hosur 635126", lat: 12.7409, lng: 77.8253, priority: "High", weight: 480, status: "Pending" },
      { id: "STP-COR-7", customer: "Sriperumbudur Electronics Cluster", address: "SIPCOT Industrial Park, Sriperumbudur 602105", lat: 12.9699, lng: 79.9405, priority: "Urgent", weight: 610, status: "Pending" }
    ]
  },
  jaipur_gurugram: {
    name: "DMIC: Jaipur ➔ Neemrana ➔ NCR",
    zone: "delhi_ncr",
    start: { id: "corridor_jaipur", name: "Sitapura Industrial Area, Jaipur", address: "Tonk Road, Jaipur 302022", lat: 26.7820, lng: 75.8285, isCustom: true },
    end: { id: "corridor_ncr", name: "Manesar Freight Terminal, Gurugram", address: "IMT Manesar Sector 8, Gurugram 122051", lat: 28.3548, lng: 76.9389, isCustom: true },
    stops: [
      { id: "STP-COR-8", customer: "Neemrana Japanese Zone", address: "RIICO Industrial Area, Neemrana 301705", lat: 27.9889, lng: 76.3889, priority: "Urgent", weight: 390, status: "Pending" },
      { id: "STP-COR-9", customer: "Bawal Auto-Component Hub", address: "Sector 3, Bawal, Haryana 123501", lat: 28.0833, lng: 76.5833, priority: "High", weight: 310, status: "Pending" }
    ]
  }
};

// ------------------------------------------------------------------------------
// Regional Pan-India Datasets & Demo Data
// ------------------------------------------------------------------------------
const PAN_INDIA_DATASETS = {
  all_india: {
    name: "Pan-India National Corridors",
    subtitle: "Interstate Freight & Golden Quadrilateral Expressways",
    depots: {
      delhi_ncr: { id: "delhi_ncr", name: "Delhi NCR National Central Hub (Okhla)", lat: 28.5355, lng: 77.2631, address: "Okhla Phase-III Industrial Cargo Terminal, New Delhi" },
      mumbai_hub: { id: "mumbai_hub", name: "Mumbai Western Gateway Hub (Bhiwandi / JNPT)", lat: 19.2812, lng: 73.0483, address: "Bhiwandi National Logistics Park, Mumbai Region" },
      bengaluru_hub: { id: "bengaluru_hub", name: "Bengaluru South Central Hub (Whitefield)", lat: 12.9698, lng: 77.7499, address: "Whitefield EPIP Multimodal Logistics Park, Bengaluru" },
      kolkata_hub: { id: "kolkata_hub", name: "Kolkata Eastern Gateway Hub (Dankuni Port)", lat: 22.6845, lng: 88.2917, address: "Dankuni Inland Container Terminal, Kolkata, WB" },
      hyderabad_hub: { id: "hyderabad_hub", name: "Hyderabad Deccan Terminal (Shamshabad)", lat: 17.2403, lng: 78.4294, address: "GMR Aerospace & Logistics Park, Shamshabad, Hyderabad" },
      chennai_hub: { id: "chennai_hub", name: "Chennai Southern Hub (Sriperumbudur)", lat: 12.9716, lng: 79.9432, address: "Sriperumbudur Auto & Freight Corridor, Tamil Nadu" }
    },
    vehicles: [
      { id: "TRK-NATIONAL-01", name: "Tata Prima 5530.S", category: "National Freight", type: "Heavy Truck", powertrain: "Diesel", driver: "Rajinder Singh", payloadMax: 28000, efficiency: 4.2, costPerKm: 28.0, fuelLevel: 88, healthScore: 96, status: "Available", icon: "🚛" },
      { id: "TRK-NATIONAL-02", name: "BharatBenz 2823R", category: "National Freight", type: "Heavy Truck", powertrain: "Diesel", driver: "Venkatesh Rao", payloadMax: 18500, efficiency: 5.4, costPerKm: 22.5, fuelLevel: 82, healthScore: 94, status: "Available", icon: "🚛" },
      { id: "TRK-INTERCITY-03", name: "Eicher Pro 3019", category: "Inter-City Fleet", type: "Delivery Van", powertrain: "Diesel", driver: "Manoj Yadav", payloadMax: 11000, efficiency: 6.8, costPerKm: 16.0, fuelLevel: 90, healthScore: 92, status: "Available", icon: "🚚" },
      { id: "EV-VAN-INTER-04", name: "Tata Ace EV Ultra", category: "EV Fleet", type: "Electric Van", powertrain: "Electric (EV)", driver: "Karthik Nair", payloadMax: 1200, efficiency: 5.8, costPerKm: 5.5, fuelLevel: 95, healthScore: 98, status: "Available", icon: "⚡" },
      { id: "TRK-EXPRESS-05", name: "Ashok Leyland 4220", category: "Express / Cargo Fleet", type: "Heavy Truck", powertrain: "Diesel", driver: "Jaswinder Brar", payloadMax: 26000, efficiency: 4.5, costPerKm: 26.0, fuelLevel: 18, healthScore: 78, status: "Low Fuel", icon: "🚛" },
      { id: "AUTO-CARGO-06", name: "Mahindra Zor Grand EV", category: "EV Fleet", type: "3-Wheeler", powertrain: "Electric (EV)", driver: "Pradeep Joshi", payloadMax: 450, efficiency: 8.5, costPerKm: 3.8, fuelLevel: 75, healthScore: 90, status: "Maintenance", icon: "🛺" }
    ],
    stops: [
      { id: "STP-001", customer: "Galaxy Tech Park", address: "Galaxy Tech Park, Pune", lat: 18.5913, lng: 73.7389, priority: "High", weight: 420, eta: "09:15 AM", status: "Completed", assignedVehicleId: "TRK-NATIONAL-01" },
      { id: "STP-002", customer: "Star Residency", address: "Star Residency, Pune", lat: 18.5074, lng: 73.8077, priority: "Medium", weight: 310, eta: "10:34 AM", status: "Completed", assignedVehicleId: "TRK-NATIONAL-01" },
      { id: "STP-003", customer: "Green Valley Society", address: "Green Valley Society, Pune", lat: 18.5314, lng: 73.8446, priority: "High", weight: 550, eta: "11:45 AM", status: "Current Stop", assignedVehicleId: "TRK-NATIONAL-01" },
      { id: "STP-004", customer: "Sunrise Plaza", address: "Sunrise Plaza, Pune", lat: 18.5018, lng: 73.8636, priority: "Medium", weight: 280, eta: "01:15 PM", status: "Upcoming", assignedVehicleId: "TRK-NATIONAL-01" },
      { id: "STP-005", customer: "Magic Tower", address: "Magic Tower, Pune", lat: 18.5679, lng: 73.9143, priority: "Low", weight: 190, eta: "02:03 PM", status: "Upcoming", assignedVehicleId: "TRK-NATIONAL-01" }
    ]
  },
  delhi_ncr: {
    name: "Delhi-NCR Mega Logistics Hub",
    subtitle: "Capital Territory & Satellite Industrial Hubs",
    depots: {
      delhi_okhla: { id: "delhi_okhla", name: "Delhi Central Hub (Okhla Industrial)", lat: 28.5355, lng: 77.2631, address: "Phase-III Okhla Industrial Area, New Delhi" },
      gurugram_hub: { id: "gurugram_hub", name: "Gurugram Logistics Base (Cyber City)", lat: 28.4950, lng: 77.0895, address: "DLF Cyber City Express Hub, Gurugram" },
      noida_hub: { id: "noida_hub", name: "Noida East Hub (Sector 62)", lat: 28.6280, lng: 77.3649, address: "Sector 62 Institutional & Logistics Center, Noida" }
    },
    vehicles: [
      { id: "NCR-VAN-101", name: "Tata Ace Gold CNG", type: "Mini Truck", powertrain: "CNG", driver: "Mohan Lal", payloadMax: 850, efficiency: 18.0, costPerKm: 6.5, fuelLevel: 88, healthScore: 95, status: "Available", icon: "🚚" },
      { id: "NCR-EV-201", name: "Euler HiLoad EV", type: "Electric Van", powertrain: "Electric (EV)", driver: "Ravi Kumar", payloadMax: 700, efficiency: 6.5, costPerKm: 3.9, fuelLevel: 94, healthScore: 98, status: "Available", icon: "⚡" },
      { id: "NCR-TRK-401", name: "Mahindra Bolero Maxi", type: "Delivery Van", powertrain: "Diesel", driver: "Suresh Malik", payloadMax: 1300, efficiency: 12.0, costPerKm: 10.5, fuelLevel: 75, healthScore: 89, status: "Available", icon: "🚐" }
    ],
    stops: [
      { id: "NCR-01", customer: "Connaught Place Retailers", address: "Inner Circle, Connaught Place, New Delhi", lat: 28.6315, lng: 77.2167, priority: "Urgent", weight: 140, status: "Pending", assignedVehicleId: "NCR-VAN-101" },
      { id: "NCR-02", customer: "DLF Cyber City Tech Hub", address: "Building 10, DLF Cyber City, Gurugram", lat: 28.4950, lng: 77.0895, priority: "High", weight: 210, status: "Pending", assignedVehicleId: "NCR-VAN-101" },
      { id: "NCR-03", customer: "Sector 18 Commercial Center", address: "Sector 18 Atta Market, Noida", lat: 28.5708, lng: 77.3271, priority: "High", weight: 180, status: "Pending", assignedVehicleId: "NCR-VAN-101" }
    ]
  },
  mumbai_pune: {
    name: "Mumbai-Pune-Gujarat Freight Corridor",
    subtitle: "Western Coastal Logistics & Auto Industrial Belt",
    depots: {
      mumbai_bhiwandi: { id: "mumbai_bhiwandi", name: "Bhiwandi Mega Logistics Park", lat: 19.2812, lng: 73.0483, address: "Bhiwandi National Warehouse Zone, Mumbai" },
      mumbai_bkc: { id: "mumbai_bkc", name: "BKC South Hub (Bandra-Kurla)", lat: 19.0664, lng: 72.8677, address: "G-Block, Bandra Kurla Complex, Mumbai" }
    },
    vehicles: [
      { id: "MUM-VAN-101", name: "Tata Ace Gold", type: "Mini Truck", powertrain: "CNG", driver: "Sunil Shinde", payloadMax: 850, efficiency: 16.5, costPerKm: 7.2, fuelLevel: 85, healthScore: 94, status: "Available", icon: "🚚" },
      { id: "MUM-TRK-301", name: "Tata 407 LPT", type: "Heavy Truck", powertrain: "Diesel", driver: "Datta Patil", payloadMax: 3800, efficiency: 7.8, costPerKm: 16.5, fuelLevel: 70, healthScore: 90, status: "Available", icon: "🚛" }
    ],
    stops: [
      { id: "MUM-01", customer: "Andheri MIDC Commercial Hub", address: "MIDC Central Road, Andheri East, Mumbai", lat: 19.1197, lng: 72.8697, priority: "High", weight: 260, status: "Pending", assignedVehicleId: "MUM-VAN-101" },
      { id: "MUM-02", customer: "Vashi APMC Wholesale Market", address: "Sector 19, Vashi, Navi Mumbai", lat: 19.0760, lng: 72.9980, priority: "Urgent", weight: 450, status: "Pending", assignedVehicleId: "MUM-VAN-101" }
    ]
  },
  bengaluru_south: {
    name: "Bengaluru-South Tech & Industrial Hub",
    subtitle: "Deccan Plateau E-Commerce & Precision Engineering",
    depots: {
      blr_whitefield: { id: "blr_whitefield", name: "Bengaluru East Hub (Whitefield)", lat: 12.9698, lng: 77.7499, address: "EPIP Zone, Whitefield, Bengaluru" },
      blr_ecity: { id: "blr_ecity", name: "Bengaluru South Hub (Electronic City)", lat: 12.8452, lng: 77.6602, address: "Phase-I Electronic City, Bengaluru" }
    },
    vehicles: [
      { id: "BLR-EV-101", name: "Tata Ace EV", type: "Electric Van", powertrain: "Electric (EV)", driver: "Raghavendra Hegde", payloadMax: 600, efficiency: 6.2, costPerKm: 4.2, fuelLevel: 96, healthScore: 99, status: "Available", icon: "⚡" },
      { id: "BLR-VAN-301", name: "Ashok Leyland Bada Dost", type: "Delivery Van", powertrain: "Diesel", driver: "Praveen Gowda", payloadMax: 1400, efficiency: 11.8, costPerKm: 11.2, fuelLevel: 78, healthScore: 91, status: "Available", icon: "🚐" }
    ],
    stops: [
      { id: "BLR-01", customer: "Koramangala E-Commerce Hub", address: "80 Feet Road, Koramangala 4th Block, Bengaluru", lat: 12.9352, lng: 77.6245, priority: "Urgent", weight: 120, status: "Pending", assignedVehicleId: "BLR-EV-101" },
      { id: "BLR-02", customer: "Indiranagar Retail Quarter", address: "100 Feet Road, Indiranagar, Bengaluru", lat: 12.9719, lng: 77.6412, priority: "High", weight: 95, status: "Pending", assignedVehicleId: "BLR-EV-101" }
    ]
  },
  chandigarh_tricity: {
    name: "Chandigarh Tricity & Punjab Region",
    subtitle: "Chandigarh, Mohali, Panchkula & GT Road Logistics",
    depots: {
      chandigarh_sec17: { id: "chandigarh_sec17", name: "Chandigarh Central Hub (Sector 17)", lat: 30.7415, lng: 76.7684, address: "SCO 10-12, Sector 17-C, Chandigarh" },
      mohali_hub: { id: "mohali_hub", name: "Mohali Logistics Hub (Phase 8)", lat: 30.7046, lng: 76.7179, address: "Phase 8 Industrial Area, Mohali" }
    },
    vehicles: [
      { id: "TRK-101", name: "Tata Ace Gold", type: "Mini Truck", powertrain: "Diesel", driver: "Gurpreet Singh", payloadMax: 850, efficiency: 14.5, costPerKm: 8.5, fuelLevel: 85, healthScore: 95, status: "Available", icon: "🚚" },
      { id: "EV-VAN-201", name: "Tata Ace EV", type: "Electric Van", powertrain: "Electric (EV)", driver: "Aman Sharma", payloadMax: 600, efficiency: 6.2, costPerKm: 4.2, fuelLevel: 92, healthScore: 98, status: "Available", icon: "⚡" }
    ],
    stops: [
      { id: "STP-101", customer: "Apex Retail Mart", address: "Sector 35-B Inner Market, Chandigarh", lat: 30.7225, lng: 76.7612, priority: "High", weight: 110, status: "Pending", assignedVehicleId: "TRK-101" },
      { id: "STP-102", customer: "MedPharma Lifecare", address: "Phase 7 Market, Mohali", lat: 30.7104, lng: 76.7118, priority: "Urgent", weight: 45, status: "Pending", assignedVehicleId: "TRK-101" }
    ]
  }
};

const DEFAULT_DEMO_DATA = {
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
};

// ------------------------------------------------------------------------------
// National Electronic Toll Collection (NETC FASTag) Plazas Directory
// ------------------------------------------------------------------------------
// National Electronic Toll Collection (NETC FASTag) Plazas Directory
// ------------------------------------------------------------------------------
const PAN_INDIA_FASTAG_TOLLS = [
  // NH-48 Corridor (Delhi -> Gurugram -> Jaipur -> Udaipur -> Ahmedabad -> Vadodara -> Surat -> Mumbai)
  {
    id: "toll_kherki_daula",
    name: "Kherki Daula Toll Plaza",
    highway: "NH-48 (Delhi-Gurugram Expy)",
    state: "Haryana",
    lat: 28.3995,
    lng: 76.9734,
    direction: "Both Ways",
    vehicleRates: { car: 85, lcv: 135, bus: 275, truck: 285, multiAxle: 440 },
    commercialRate: 285,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "FASTag Lane 1-8 Dedicated"
  },
  {
    id: "toll_shahjahanpur",
    name: "Shahjahanpur Toll Plaza",
    highway: "NH-48 (Haryana-Rajasthan Border)",
    state: "Rajasthan",
    lat: 27.9942,
    lng: 76.4012,
    direction: "Both Ways",
    vehicleRates: { car: 160, lcv: 255, bus: 510, truck: 535, multiAxle: 815 },
    commercialRate: 535,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "High-Speed Tag Gantry"
  },
  {
    id: "toll_manoharpur",
    name: "Manoharpur Toll Plaza",
    highway: "NH-48 (Jaipur Highway)",
    state: "Rajasthan",
    lat: 27.2915,
    lng: 75.9520,
    direction: "Both Ways",
    vehicleRates: { car: 95, lcv: 155, bus: 310, truck: 325, multiAxle: 495 },
    commercialRate: 325,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "RFID Multi-Lane Auto-Debit"
  },
  {
    id: "toll_kishangarh",
    name: "Kishangarh Toll Plaza",
    highway: "NH-48 (Ajmer Express Corridor)",
    state: "Rajasthan",
    lat: 26.5810,
    lng: 74.8820,
    direction: "Both Ways",
    vehicleRates: { car: 110, lcv: 175, bus: 350, truck: 370, multiAxle: 560 },
    commercialRate: 370,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "HCV Express Tag"
  },
  {
    id: "toll_bhayandar",
    name: "Bhilwara Bypass Toll Plaza",
    highway: "NH-48 (Chittorgarh Corridor)",
    state: "Rajasthan",
    lat: 25.3410,
    lng: 74.6210,
    direction: "Both Ways",
    vehicleRates: { car: 80, lcv: 130, bus: 260, truck: 275, multiAxle: 420 },
    commercialRate: 275,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "FASTag Lane 1-4"
  },
  {
    id: "toll_ratanpur",
    name: "Ratanpur Border Toll Plaza",
    highway: "NH-48 (Rajasthan-Gujarat Border)",
    state: "Gujarat",
    lat: 23.9510,
    lng: 73.4810,
    direction: "Both Ways",
    vehicleRates: { car: 120, lcv: 195, bus: 390, truck: 410, multiAxle: 620 },
    commercialRate: 410,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "State Border FastPass"
  },
  {
    id: "toll_samarkha",
    name: "Samarkha Anand Toll Plaza",
    highway: "NE-1 (Ahmedabad-Vadodara Expy)",
    state: "Gujarat",
    lat: 22.5610,
    lng: 72.9610,
    direction: "Both Ways",
    vehicleRates: { car: 105, lcv: 165, bus: 330, truck: 350, multiAxle: 530 },
    commercialRate: 350,
    source: "GSRDC / Expressways Tariff",
    lastUpdated: "2026-04-01",
    lanes: "NE-1 RFID Gantry"
  },
  {
    id: "toll_vadodara",
    name: "Vadodara-Bharuch Toll Plaza",
    highway: "NE-1 / NH-48 Express Highway",
    state: "Gujarat",
    lat: 22.1240,
    lng: 73.1810,
    direction: "Both Ways",
    vehicleRates: { car: 145, lcv: 230, bus: 460, truck: 485, multiAxle: 740 },
    commercialRate: 485,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "Automated Barrier Gantry"
  },
  {
    id: "toll_surat_kamrej",
    name: "Kamrej Surat Toll Plaza",
    highway: "NH-48 (Surat Corridor)",
    state: "Gujarat",
    lat: 21.2710,
    lng: 72.9610,
    direction: "Both Ways",
    vehicleRates: { car: 90, lcv: 145, bus: 290, truck: 305, multiAxle: 465 },
    commercialRate: 305,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "FASTag Dedicated ETC"
  },
  {
    id: "toll_vapi_bhilad",
    name: "Bhilad Checkpost Toll Plaza",
    highway: "NH-48 (Gujarat-Maharashtra Entry)",
    state: "Gujarat",
    lat: 20.2810,
    lng: 72.8810,
    direction: "Both Ways",
    vehicleRates: { car: 100, lcv: 160, bus: 320, truck: 335, multiAxle: 510 },
    commercialRate: 335,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "Interstate RFID Gate"
  },
  {
    id: "toll_charoti",
    name: "Charoti Toll Plaza",
    highway: "NH-48 (Palghar Dahanu Sector)",
    state: "Maharashtra",
    lat: 19.9820,
    lng: 72.8810,
    direction: "Both Ways",
    vehicleRates: { car: 115, lcv: 185, bus: 370, truck: 390, multiAxle: 590 },
    commercialRate: 390,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "NETC RFID Express"
  },
  {
    id: "toll_bhiwandi_khadavali",
    name: "Bhiwandi Gateway Toll Plaza",
    highway: "NH-48 (Mumbai North Logistics Gateway)",
    state: "Maharashtra",
    lat: 19.3210,
    lng: 73.0820,
    direction: "Both Ways",
    vehicleRates: { car: 75, lcv: 120, bus: 240, truck: 255, multiAxle: 380 },
    commercialRate: 255,
    source: "MSRDC / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "City Freight ETC"
  },

  // NH-44 (Ludhiana -> Rajpura -> Ambala -> Panipat -> Delhi -> Agra -> Jhansi)
  {
    id: "toll_ladowal",
    name: "Ladowal Toll Plaza",
    highway: "NH-44 (Ludhiana GT Road)",
    state: "Punjab",
    lat: 30.9850,
    lng: 75.8120,
    direction: "Both Ways",
    vehicleRates: { car: 60, lcv: 95, bus: 190, truck: 200, multiAxle: 305 },
    commercialRate: 200,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "NETC FASTag Priority"
  },
  {
    id: "toll_shambhu",
    name: "Shambhu Toll Plaza",
    highway: "NH-44 (Punjab-Haryana Border / Rajpura)",
    state: "Punjab",
    lat: 30.4120,
    lng: 76.7110,
    direction: "Both Ways",
    vehicleRates: { car: 45, lcv: 70, bus: 140, truck: 150, multiAxle: 225 },
    commercialRate: 150,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "Dedicated Commercial Tag"
  },
  {
    id: "toll_gharaunda",
    name: "Gharaunda Toll Plaza",
    highway: "NH-44 (Karnal GT Road)",
    state: "Haryana",
    lat: 29.5320,
    lng: 76.9710,
    direction: "Both Ways",
    vehicleRates: { car: 55, lcv: 85, bus: 170, truck: 180, multiAxle: 270 },
    commercialRate: 180,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "Multi-Lane Auto-Debit"
  },
  {
    id: "toll_murthal",
    name: "Murthal Toll Plaza",
    highway: "NH-44 (Sonipat/Delhi Gateway)",
    state: "Haryana",
    lat: 28.9810,
    lng: 77.1020,
    direction: "Both Ways",
    vehicleRates: { car: 40, lcv: 65, bus: 130, truck: 140, multiAxle: 210 },
    commercialRate: 140,
    source: "NHAI / NETC Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "Delhi NCR Entry ETC"
  },
  {
    id: "toll_palwal",
    name: "Palwal KMP Interchange Toll",
    highway: "KMP Expressway / NH-44",
    state: "Haryana",
    lat: 28.1410,
    lng: 77.3310,
    direction: "Both Ways",
    vehicleRates: { car: 70, lcv: 110, bus: 220, truck: 235, multiAxle: 350 },
    commercialRate: 235,
    source: "HSIIDC / FASTag Gantry",
    lastUpdated: "2026-04-01",
    lanes: "Expressway FASTag"
  },
  {
    id: "toll_mathura",
    name: "Mathura Vrindavan Toll Plaza",
    highway: "Yamuna Expressway / NH-19",
    state: "Uttar Pradesh",
    lat: 27.5310,
    lng: 77.6810,
    direction: "Both Ways",
    vehicleRates: { car: 165, lcv: 260, bus: 520, truck: 550, multiAxle: 840 },
    commercialRate: 550,
    source: "YEIDA Official Tariff",
    lastUpdated: "2026-04-01",
    lanes: "Yamuna Expy RFID Gantry"
  }
];

// ------------------------------------------------------------------------------
// Pan-India Verified Highway Petrol & EV Charging Stations Directory
// ------------------------------------------------------------------------------
const PAN_INDIA_HIGHWAY_FUEL_STATIONS = [
  // NH-48 (Delhi -> Gurugram -> Jaipur -> Ahmedabad -> Mumbai)
  { id: "fuel_ioc_manesar", name: "IndianOil COCO Highway Hub", brand: "IndianOil", lat: 28.3610, lng: 76.9280, type: "Diesel, Petrol & EV Fast Charge", operator: "IOCL COCO" },
  { id: "fuel_hp_shahjahanpur", name: "HP Fuel Care Shahjahanpur", brand: "HPCL", lat: 27.9890, lng: 76.4110, type: "HCV High-Speed Diesel + AdBlue", operator: "HPCL" },
  { id: "fuel_bp_behror", name: "Bharat Petroleum Highway Oasis (Behror)", brand: "Bharat Petroleum", lat: 27.8920, lng: 76.2810, type: "24x7 Multi-Fuel & Food Plaza", operator: "BPCL" },
  { id: "fuel_ioc_manoharpur", name: "IndianOil Swagat Highway Hub", brand: "IndianOil", lat: 27.3010, lng: 75.9410, type: "Swagat Fleet Lounge & Diesel", operator: "IOCL Swagat" },
  { id: "fuel_rel_jaipur", name: "Jio-bp Mobility Station (Jaipur Bypass)", brand: "Reliance Jio-bp", lat: 26.9920, lng: 75.7610, type: "EV Supercharger & Diesel", operator: "Reliance Jio-bp" },
  { id: "fuel_hp_kishangarh", name: "HPCL Mega Fleet Station (Kishangarh)", brand: "HPCL", lat: 26.5720, lng: 74.8910, type: "Fleet Diesel & Driver Rest Stop", operator: "HPCL" },
  { id: "fuel_bp_bhilwara", name: "Ghar BPCL Express Hub (Bhilwara Bypass)", brand: "Bharat Petroleum", lat: 25.3420, lng: 74.6310, type: "Ghar Fleet Station + Diesel", operator: "BPCL Ghar" },
  { id: "fuel_ioc_udaipur", name: "IndianOil Swagat Hub (Udaipur Bypass)", brand: "IndianOil", lat: 24.5910, lng: 73.7210, type: "Multi-Fuel & Truck Wash", operator: "IOCL" },
  { id: "fuel_hp_himmatnagar", name: "HP Fuel Station (Himmatnagar)", brand: "HPCL", lat: 23.5920, lng: 72.9610, type: "Commercial Fleet Diesel", operator: "HPCL" },
  { id: "fuel_rel_ahmedabad", name: "Jio-bp Express Hub (Ahmedabad NE-1)", brand: "Reliance Jio-bp", lat: 23.0110, lng: 72.5820, type: "EV Fast Charging & Diesel", operator: "Reliance Jio-bp" },
  { id: "fuel_ioc_vadodara", name: "IndianOil COCO Station (Vadodara)", brand: "IndianOil", lat: 22.3110, lng: 73.1910, type: "Swagat Fleet Hub", operator: "IOCL" },
  { id: "fuel_bp_bharuch", name: "BPCL Ghar Oasis (Bharuch Bypass)", brand: "Bharat Petroleum", lat: 21.7110, lng: 73.0110, type: "Diesel & CNG Multi-Fuel", operator: "BPCL" },
  { id: "fuel_hp_surat", name: "HPCL Highway Care (Surat NH-48)", brand: "HPCL", lat: 21.1820, lng: 72.8310, type: "Commercial Fleet Fueling", operator: "HPCL" },
  { id: "fuel_rel_vapi", name: "Jio-bp Station (Vapi Border)", brand: "Reliance Jio-bp", lat: 20.3710, lng: 72.9110, type: "Diesel & EV Express", operator: "Reliance Jio-bp" },
  { id: "fuel_ioc_manor", name: "IndianOil Swagat Plaza (Manor NH-48)", brand: "IndianOil", lat: 19.7410, lng: 72.9110, type: "Fleet Rest Area & High-Flow Diesel", operator: "IOCL" },

  // NH-44 (Ludhiana -> Rajpura -> Ambala -> Delhi)
  { id: "fuel_ioc_ludhiana", name: "IndianOil COCO GT Road (Ludhiana)", brand: "IndianOil", lat: 30.9120, lng: 75.8610, type: "Swagat Cargo Hub & Diesel", operator: "IOCL" },
  { id: "fuel_bp_khanna", name: "BPCL Ghar Fleet Station (Khanna)", brand: "Bharat Petroleum", lat: 30.7020, lng: 76.2210, type: "Grain-Belt Fleet Fueling", operator: "BPCL" },
  { id: "fuel_hp_rajpura", name: "HPCL Highway Care (Rajpura Bypass)", brand: "HPCL", lat: 30.4890, lng: 76.5980, type: "Diesel & AdBlue Pump", operator: "HPCL" },
  { id: "fuel_rel_ambala", name: "Jio-bp Mobility Hub (Ambala Cantt)", brand: "Reliance Jio-bp", lat: 30.3510, lng: 76.8310, type: "EV Charger & Diesel", operator: "Reliance Jio-bp" },
  { id: "fuel_ioc_kurukshetra", name: "IndianOil Swagat Hub (Kurukshetra)", brand: "IndianOil", lat: 29.9610, lng: 76.8410, type: "Swagat Fleet Lounge", operator: "IOCL" },
  { id: "fuel_bp_karnal", name: "BPCL Ghar Oasis (Karnal Lake)", brand: "Bharat Petroleum", lat: 29.6910, lng: 76.9810, type: "24x7 Multi-Fuel & Food Plaza", operator: "BPCL" },
  { id: "fuel_hp_panipat", name: "HPCL Commercial Pump (Panipat GT Road)", brand: "HPCL", lat: 29.3820, lng: 76.9710, type: "High-Speed Diesel", operator: "HPCL" },
  { id: "fuel_rel_murthal", name: "Jio-bp Express Hub (Murthal)", brand: "Reliance Jio-bp", lat: 28.9910, lng: 77.0910, type: "EV Fast Charge & Diesel", operator: "Reliance Jio-bp" }
];

window.IndiaLocationEngine = IndiaLocationEngine;
window.ALL_INDIA_CITIES_DATABASE = ALL_INDIA_CITIES_DATABASE;
window.STRATEGIC_FREIGHT_CORRIDORS = STRATEGIC_FREIGHT_CORRIDORS;
window.PAN_INDIA_DATASETS = PAN_INDIA_DATASETS;
window.PAN_INDIA_FASTAG_TOLLS = PAN_INDIA_FASTAG_TOLLS;
window.PAN_INDIA_HIGHWAY_FUEL_STATIONS = PAN_INDIA_HIGHWAY_FUEL_STATIONS;
window.DEFAULT_DEMO_DATA = DEFAULT_DEMO_DATA;
