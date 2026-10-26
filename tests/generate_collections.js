// generate_collections.js - builds Postman v2.1 and Thunder Client collections for RIDO
const fs = require('fs');
const path = require('path');

const postmanCollection = {
  info: {
    name: "RIDO Logistics & Fleet Platform API (Evaluation 2)",
    _postman_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    description: "Complete API test collection for RIDO Logistics Platform covering Auth (JWT & Google), Fleet CRUD, Trips & Stream CSV, Multer Uploads, MongoDB Analytics, and Node.js Diagnostics.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:5000", type: "string" },
    { key: "authToken", value: "", type: "string" }
  ],
  item: [
    {
      name: "00. Platform Health & MVC Architecture",
      item: [
        {
          name: "Health & System Status",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/health", host: ["{{baseUrl}}"], path: ["api", "health"] },
            description: "Verifies MVC status, Node.js runtime, and MongoDB connection."
          },
          response: []
        }
      ]
    },
    {
      name: "01. Authentication & Security (JWT & Google OAuth)",
      item: [
        {
          name: "Register Manager / Driver",
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status is 201 Created or 200 OK', function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                  "});",
                  "var json = pm.response.json();",
                  "if (json.token) {",
                  "    pm.environment.set('authToken', json.token);",
                  "}"
                ]
              }
            }
          ],
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Evaluation Officer",
                email: "evaluator@logiroute.in",
                phone: "9876543210",
                password: "Password123!",
                role: "manager"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          response: []
        },
        {
          name: "Login with Credentials",
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "var json = pm.response.json();",
                  "pm.expect(json).to.have.property('token');",
                  "pm.environment.set('authToken', json.token);"
                ]
              }
            }
          ],
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "evaluator@logiroute.in",
                password: "Password123!"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          response: []
        },
        {
          name: "Verify Token & Get Profile (Me)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{authToken}}" }],
            url: { raw: "{{baseUrl}}/api/auth/me", host: ["{{baseUrl}}"], path: ["api", "auth", "me"] }
          },
          response: []
        },
        {
          name: "Google OAuth 2.0 Token Handshake",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Google Verified Evaluator",
                email: "google.evaluator@gmail.com",
                googleId: "google-oauth2-11823901928"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/google", host: ["{{baseUrl}}"], path: ["api", "auth", "google"] }
          },
          response: []
        },
        {
          name: "List Registered Users (Admin/Manager Protected)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{authToken}}" }],
            url: { raw: "{{baseUrl}}/api/auth/users", host: ["{{baseUrl}}"], path: ["api", "auth", "users"] }
          },
          response: []
        }
      ]
    },
    {
      name: "02. Fleet Management (MongoDB CRUD)",
      item: [
        {
          name: "Get All Vehicles",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/fleet", host: ["{{baseUrl}}"], path: ["api", "fleet"] }
          },
          response: []
        },
        {
          name: "Create Vehicle Record",
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "var json = pm.response.json();",
                  "if (json.data && json.data._id) {",
                  "    pm.environment.set('vehicleId', json.data._id);",
                  "}"
                ]
              }
            }
          ],
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                registrationNumber: "MH-12-EV-9999",
                type: "heavy-truck",
                capacityKg: 16000,
                fuelType: "electric",
                driverName: "Arjun Verma",
                driverPhone: "+91-9988776655",
                currentSpeed: 58,
                batteryLevel: 94
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/fleet", host: ["{{baseUrl}}"], path: ["api", "fleet"] }
          },
          response: []
        },
        {
          name: "Get Vehicle by ID",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/fleet/{{vehicleId}}", host: ["{{baseUrl}}"], path: ["api", "fleet", "{{vehicleId}}"] }
          },
          response: []
        },
        {
          name: "Update Vehicle Status / Telemetry",
          request: {
            method: "PUT",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                status: "in-transit",
                currentSpeed: 64,
                batteryLevel: 88
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/fleet/{{vehicleId}}", host: ["{{baseUrl}}"], path: ["api", "fleet", "{{vehicleId}}"] }
          },
          response: []
        }
      ]
    },
    {
      name: "03. Trip Dispatch & Route Engine (Mongoose Populate & Streams)",
      item: [
        {
          name: "Get All Trips (with Mongoose Populate)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/trips", host: ["{{baseUrl}}"], path: ["api", "trips"] }
          },
          response: []
        },
        {
          name: "Dispatch New Trip",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                vehicleId: "{{vehicleId}}",
                origin: "Mumbai Hub B",
                destination: "Pune Industrial Zone",
                cargoWeightKg: 8500,
                clientName: "Tata Motors Supply Chain",
                distanceKm: 148,
                estimatedDurationMin: 180,
                waypoints: ["Panvel", "Khopoli", "Lonavala Expressway"]
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/trips", host: ["{{baseUrl}}"], path: ["api", "trips"] }
          },
          response: []
        },
        {
          name: "Export Trip Logs Stream (CSV)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{authToken}}" }],
            url: { raw: "{{baseUrl}}/api/trips/export/csv", host: ["{{baseUrl}}"], path: ["api", "trips", "export", "csv"] }
          },
          response: []
        },
        {
          name: "Optimize Multi-Stop Route (2-Opt Alg)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                origin: "Delhi Central Depot",
                destination: "Jaipur Logistics Park",
                stops: ["Gurugram", "Manesar", "Neemrana Hub", "Shahpura"]
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/trips/optimize", host: ["{{baseUrl}}"], path: ["api", "trips", "optimize"] }
          },
          response: []
        }
      ]
    },
    {
      name: "04. File Uploads (Multer & Static Assets)",
      item: [
        {
          name: "Upload Proof of Delivery (POD)",
          request: {
            method: "POST",
            header: [{ key: "Authorization", value: "Bearer {{authToken}}" }],
            body: {
              mode: "formdata",
              formdata: [
                { key: "pod", type: "file", src: [] }
              ]
            },
            url: { raw: "{{baseUrl}}/api/upload/pod", host: ["{{baseUrl}}"], path: ["api", "upload", "pod"] }
          },
          response: []
        }
      ]
    },
    {
      name: "05. MongoDB Analytics & KPI Aggregations",
      item: [
        {
          name: "Get Dashboard KPIs Aggregation",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/analytics/kpis", host: ["{{baseUrl}}"], path: ["api", "analytics", "kpis"] }
          },
          response: []
        },
        {
          name: "Get Fleet Status Summary",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/analytics/summary", host: ["{{baseUrl}}"], path: ["api", "analytics", "summary"] }
          },
          response: []
        }
      ]
    },
    {
      name: "06. Node.js V8 & System Diagnostics",
      item: [
        {
          name: "Event Loop & Call Stack Metrics",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/curriculum/event-loop", host: ["{{baseUrl}}"], path: ["api", "curriculum", "event-loop"] }
          },
          response: []
        },
        {
          name: "V8 Heap & Memory Profile",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/curriculum/v8-diagnostics", host: ["{{baseUrl}}"], path: ["api", "curriculum", "v8-diagnostics"] }
          },
          response: []
        },
        {
          name: "Buffers & Binary Packet Stream",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/curriculum/buffer-demo", host: ["{{baseUrl}}"], path: ["api", "curriculum", "buffer-demo"] }
          },
          response: []
        },
        {
          name: "EventEmitter Live Telemetry Broadcast",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/curriculum/event-emitter-signal", host: ["{{baseUrl}}"], path: ["api", "curriculum", "event-emitter-signal"] }
          },
          response: []
        },
        {
          name: "MongoDB Connection & Collection Diagnostics",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/curriculum/db-status", host: ["{{baseUrl}}"], path: ["api", "curriculum", "db-status"] }
          },
          response: []
        }
      ]
    }
  ]
};

const postmanEnvironment = {
  id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  name: "RIDO Logistics Environment (Local & Cloud)",
  values: [
    { key: "baseUrl", value: "http://localhost:5000", enabled: true },
    { key: "authToken", value: "", enabled: true },
    { key: "vehicleId", value: "", enabled: true },
    { key: "deployedApiUrl", value: "https://logiroute-api.onrender.com", enabled: false }
  ],
  _postman_variable_scope: "environment"
};

// Thunder Client collection
const thunderClientCollection = {
  client: "Thunder Client",
  collectionName: "RIDO Logistics & Fleet Platform API",
  dateExported: new Date().toISOString(),
  version: "1.1",
  folders: [
    { _id: "f_health", name: "00. Health & MVC Architecture" },
    { _id: "f_auth", name: "01. Authentication & Security" },
    { _id: "f_fleet", name: "02. Fleet Management (MongoDB CRUD)" },
    { _id: "f_trips", name: "03. Trip Dispatch & Route Engine" },
    { _id: "f_analytics", name: "04. MongoDB Analytics & KPIs" },
    { _id: "f_curriculum", name: "05. Node.js V8 & Runtime Diagnostics" }
  ],
  requests: [
    {
      _id: "req_health",
      colId: "rido_thunder",
      containerId: "f_health",
      name: "Health & System Status",
      url: "{{baseUrl}}/api/health",
      method: "GET"
    },
    {
      _id: "req_register",
      colId: "rido_thunder",
      containerId: "f_auth",
      name: "Register Manager",
      url: "{{baseUrl}}/api/auth/register",
      method: "POST",
      body: {
        type: "json",
        raw: JSON.stringify({
          name: "Evaluation Officer",
          email: "evaluator@logiroute.in",
          phone: "9876543210",
          password: "Password123!",
          role: "manager"
        }, null, 2)
      }
    },
    {
      _id: "req_login",
      colId: "rido_thunder",
      containerId: "f_auth",
      name: "Login with Credentials",
      url: "{{baseUrl}}/api/auth/login",
      method: "POST",
      body: {
        type: "json",
        raw: JSON.stringify({
          email: "evaluator@logiroute.in",
          password: "Password123!"
        }, null, 2)
      }
    },
    {
      _id: "req_me",
      colId: "rido_thunder",
      containerId: "f_auth",
      name: "Get Current User Profile",
      url: "{{baseUrl}}/api/auth/me",
      method: "GET",
      headers: [{ name: "Authorization", value: "Bearer {{authToken}}" }]
    },
    {
      _id: "req_fleet_list",
      colId: "rido_thunder",
      containerId: "f_fleet",
      name: "Get All Vehicles",
      url: "{{baseUrl}}/api/fleet",
      method: "GET"
    },
    {
      _id: "req_fleet_create",
      colId: "rido_thunder",
      containerId: "f_fleet",
      name: "Create Vehicle Record",
      url: "{{baseUrl}}/api/fleet",
      method: "POST",
      headers: [{ name: "Authorization", value: "Bearer {{authToken}}" }],
      body: {
        type: "json",
        raw: JSON.stringify({
          registrationNumber: "MH-12-EV-9999",
          type: "heavy-truck",
          capacityKg: 16000,
          fuelType: "electric",
          driverName: "Arjun Verma",
          driverPhone: "+91-9988776655",
          currentSpeed: 58,
          batteryLevel: 94
        }, null, 2)
      }
    },
    {
      _id: "req_trips_list",
      colId: "rido_thunder",
      containerId: "f_trips",
      name: "Get All Trips (Populate)",
      url: "{{baseUrl}}/api/trips",
      method: "GET"
    },
    {
      _id: "req_analytics_kpi",
      colId: "rido_thunder",
      containerId: "f_analytics",
      name: "Dashboard KPIs Aggregation",
      url: "{{baseUrl}}/api/analytics/kpis",
      method: "GET"
    },
    {
      _id: "req_node_eventloop",
      colId: "rido_thunder",
      containerId: "f_curriculum",
      name: "Event Loop Metrics",
      url: "{{baseUrl}}/api/curriculum/event-loop",
      method: "GET"
    },
    {
      _id: "req_node_dbstatus",
      colId: "rido_thunder",
      containerId: "f_curriculum",
      name: "MongoDB Diagnostics",
      url: "{{baseUrl}}/api/curriculum/db-status",
      method: "GET"
    }
  ]
};

// Write files to postman/ and thunder-client/
const rootDir = path.join(__dirname, '..');
fs.writeFileSync(path.join(rootDir, 'postman', 'RIDO_API_Collection.postman_collection.json'), JSON.stringify(postmanCollection, null, 2));
fs.writeFileSync(path.join(rootDir, 'postman', 'RIDO_Environment.postman_environment.json'), JSON.stringify(postmanEnvironment, null, 2));
fs.writeFileSync(path.join(rootDir, 'thunder-client', 'thunder-collection_rido.json'), JSON.stringify(thunderClientCollection, null, 2));

console.log('✅ Generated Postman and Thunder Client collections successfully!');
