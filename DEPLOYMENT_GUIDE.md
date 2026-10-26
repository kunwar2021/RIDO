# 🚀 RIDO Logistics & Fleet Platform — Evaluation 2 Guide
## Continuous Evaluation & Backend Architecture Manual

This document provides a comprehensive presentation guide for your **Second Project Evaluation**, covering the 7 evaluation requirements:
1. **Backend Development** (Node.js & Express RESTful Server)
2. **MVC Architecture** (Models, Views, Controllers)
3. **Backend Deployment** (Render / Railway / Atlas Cloud Deployment)
4. **API Testing** (Postman & Thunder Client Collections with Automated Assertions)
5. **Frontend Integration** (Dynamic Cloud Backend Switcher with MongoDB Storage)
6. **GitHub Repository** (Clean, single-repository structure without changing repo URL)
7. **Project Structure** (Co-existing `frontend/` and `backend/` root folders)

---

## 🏛️ 1. MVC Architecture Breakdown

The project strictly follows standard enterprise **Model-View-Controller (MVC)** design patterns:

```
LogiRoute/
├── backend/
│   ├── config/             # DB & Environment Configuration
│   │   └── db.js           # Mongoose MongoDB Connection (Local + Atlas SRV)
│   ├── controllers/        # CONTROLLERS: Business Logic & Processing
│   │   ├── auth.controller.js        # Register, Login, Google OAuth, Profile
│   │   ├── fleet.controller.js       # Fleet CRUD operations & telemetry
│   │   ├── trip.controller.js        # Dispatch, Populate, CSV Stream, 2-Opt
│   │   ├── upload.controller.js      # Multer multipart/form-data POD upload
│   │   ├── analytics.controller.js   # Live document aggregations & health
│   │   └── curriculum.controller.js  # Node.js V8 & Event Loop diagnostics
│   ├── models/             # MODELS: MongoDB Mongoose Schemas & Validation
│   │   ├── User.js         # User schema, bcrypt hash hook, JWT signer
│   │   ├── Vehicle.js      # Vehicle telemetry schema & status indexing
│   │   └── Trip.js         # Trip schema with Mongoose ref to Vehicle/User
│   ├── routes/             # ROUTERS: REST Endpoints & Route Definitions
│   │   ├── auth.routes.js
│   │   ├── fleet.routes.js
│   │   ├── trip.routes.js
│   │   ├── upload.routes.js
│   │   ├── analytics.routes.js
│   │   └── demo.routes.js
│   ├── middleware/         # Express Middleware
│   │   ├── auth.js         # JWT Token Verification & Role-Based Access Control
│   │   ├── errorHandler.js # Centralized 500 & error serialization
│   │   └── upload.js       # Multer multipart storage engine
│   └── server.js           # Express App Initialization & Port Listener
│
├── frontend/               # VIEWS & CLIENT UI
│   ├── index.html          # Main Logistics Operations Portal
│   ├── js/
│   │   ├── api.js          # API Client with dynamic Deployed Cloud URL support
│   │   ├── config.js       # Platform configuration & endpoints
│   │   ├── cloud-api-modal.js # UI Modal to test & switch backend live
│   │   └── curriculum-lab.js # Interactive 41-lecture demonstration suite
│   └── ...
│
├── postman/                # Postman v2.1.0 Collections & Environment
│   ├── RIDO_API_Collection.postman_collection.json
│   └── RIDO_Environment.postman_environment.json
│
├── thunder-client/         # VS Code Thunder Client Collection
│   └── thunder-collection_rido.json
│
├── tests/                  # Verification & Automated Test Runners
│   ├── test_api_endpoints.js # 14/14 Endpoints Automated Test Runner
│   └── verify_curriculum.js  # 10/10 Lectures 1–41 Curriculum Test Suite
│
├── Procfile                # Heroku / Railway Deployment Procfile
└── render.yaml             # Render 1-Click Infrastructure as Code
```

---

## ⚡ 2. Two-Minute Backend Deployment Guide (Render.com - 100% Free)

Deploy your backend in 4 simple steps:

### Step 1: Create a Free MongoDB Atlas Database
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free Shared M0 cluster.
2. In **Database Access**, create a database user (e.g., `rido_admin` with a password).
3. In **Network Access**, click **Add IP Address** -> select **Allow Access from Anywhere (`0.0.0.0/0`)**.
4. Click **Connect** -> **Connect your application (Drivers)** -> copy the connection string:
   ```
   mongodb+srv://rido_admin:<password>@cluster0.mongodb.net/rido_logistics?retryWrites=true&w=majority
   ```

### Step 2: Deploy Backend to Render
1. Push your latest code to your existing GitHub repository.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `logiroute-api` (or your preferred name)
   - **Root Directory**: leave blank (or `backend`)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node backend/server.js`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = `mongodb+srv://rido_admin:<password>@cluster0.mongodb.net/rido_logistics?retryWrites=true&w=majority`
   - `JWT_SECRET` = `rido_super_secret_jwt_key_2026_evaluation`
6. Click **Deploy Web Service**.
7. Once deployed, Render will give you your live URL, e.g.:
   `https://logiroute-api.onrender.com`

---

## 🌐 3. Connecting Frontend to the Deployed Backend

You can switch the frontend to talk to your deployed backend using **either** of these two methods:

### Method A: Live In-Browser Toggle (Recommended for Demo)
1. Open `index.html` (or your hosted frontend).
2. Click the **"🌐 Cloud API"** button in the top navigation bar.
3. Paste your deployed Render/Railway URL (e.g. `https://logiroute-api.onrender.com`).
4. Click **"⚡ Ping Test"** — watch the green latency check verify:
   - Architecture: `MVC (Model-View-Controller)`
   - Database: `MongoDB Active`
5. Click **"Save & Apply Active Backend"**.
   - All subsequent logins, trips, fleet rosters, and route optimizations will instantly talk to your live cloud MongoDB backend!

### Method B: Code Configuration
Open `frontend/js/config.js` or `js/config.js` and set:
```javascript
BACKEND_BASE_URL: "https://your-deployed-service.onrender.com"
```

---

## 🧪 4. Live API Testing Demonstration (Postman & Thunder Client)

### Postman Testing (Recommended for Examiner)
1. Open **Postman**.
2. Click **Import** -> Select `postman/RIDO_API_Collection.postman_collection.json`.
3. Import `postman/RIDO_Environment.postman_environment.json`.
4. In the top right environment dropdown, select **RIDO Logistics Environment**.
5. Set `baseUrl` to `http://localhost:5000` (or your deployed URL).
6. Run the requests in order:
   - `00. Health & System Status`: Demonstrates MVC and active MongoDB.
   - `01. Register & Login`: Verifies bcrypt hashing, issues JWT token and automatically saves `authToken` to environment.
   - `01. Verify Profile (Me)`: Verifies JWT bearer authentication middleware.
   - `02. Create Vehicle`: Posts new vehicle record into MongoDB with schema validation.
   - `02. Get All Vehicles`: Retrieves vehicle documents from MongoDB collection.
   - `03. Dispatch Trip`: Demonstrates Mongoose cross-document references.
   - `03. Export CSV Stream`: Demonstrates zero-memory Node.js streaming response.
   - `03. Optimize Route`: Runs 2-Opt TSP optimization algorithm.
   - `05. Dashboard KPIs`: Demonstrates live MongoDB document aggregation pipelines.
   - `06. Event Loop & V8 Diagnostics`: Demonstrates Node.js runtime mechanics.

### Thunder Client Testing (Inside VS Code)
1. Open VS Code and install the **Thunder Client** extension.
2. Click Thunder Client on the sidebar -> **Collections** -> Click **...** (Options) -> **Import**.
3. Select `thunder-client/thunder-collection_rido.json`.
4. All test endpoints are organized into folders ready to execute with 1 click.

### Automated Console Verification Script
Run the automated test runner in terminal:
```bash
node tests/test_api_endpoints.js
```
Output:
```
=============================================================
🧪 RIDO Logistics - Comprehensive API Automated Verification
   Model-View-Controller (MVC) Backend & MongoDB Integration
=============================================================
  ✅ [PASS] GET /api/health - MVC Architecture & DB Status
  ✅ [PASS] POST /api/auth/register - User Registration with bcrypt & JWT
  ✅ [PASS] POST /api/auth/login - Credential Verification
  ✅ [PASS] GET /api/auth/me - Protected Route with JWT Middleware
  ✅ [PASS] POST /api/auth/google - OAuth 2.0 Handshake Endpoint
  ✅ [PASS] GET /api/fleet - Vehicle Listing
  ✅ [PASS] POST /api/fleet - Create Vehicle (Protected)
  ✅ [PASS] GET /api/fleet/:id - Fetch Single Vehicle
  ✅ [PASS] POST /api/trips - Trip Dispatch with Reference
  ✅ [PASS] GET /api/trips - Query Trips with Vehicle Population
  ✅ [PASS] GET /api/trips/export/csv - Streamed CSV Export (Protected)
  ✅ [PASS] POST /api/trips/optimize - 2-Opt Optimization Algorithm
  ✅ [PASS] GET /api/analytics/kpis - Live Aggregation Pipeline
  ✅ [PASS] GET /api/curriculum/v8-diagnostics - Heap & Garbage Collection Data
=============================================================
📊 Result: 14/14 Endpoints Tested Successfully (100%)
=============================================================
```

---

## 📋 5. Evaluation Checklist

| Requirement | Implementation Details | Status |
|---|---|:---:|
| **Backend Development** | Node.js, Express, MongoDB Mongoose, RESTful CRUD APIs | ✅ Complete |
| **MVC Architecture** | Clear separation: `models/`, `controllers/`, `routes/`, `middleware/` | ✅ Complete |
| **Backend Deployment** | `render.yaml`, `Procfile`, MongoDB Atlas URI support, auto-reconnect | ✅ Complete |
| **API Testing** | Postman Collection v2.1, Thunder Client JSON, Automated Test Suite | ✅ Complete |
| **Frontend Integration** | Dynamic URL switcher, Cloud API Modal, MongoDB persistence | ✅ Complete |
| **GitHub Repository** | Single repo, preserved git history, no URL changes | ✅ Complete |
| **Project Structure** | Co-existing root `frontend/` and `backend/` directories | ✅ Complete |
