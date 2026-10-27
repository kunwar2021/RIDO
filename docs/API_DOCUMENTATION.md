# 📡 RIDO Logistics — REST API Specification
**Version**: 8.0.0 (MVC Architecture)  
**Base URL**: `http://localhost:5000` (Local) / `https://rido-90qc.onrender.com` (Cloud Deployed)

---

## 📋 Endpoint Matrix (14 Endpoints Tested 100% PASS)

| Method | Endpoint | Access | Purpose | Success Code |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | Public | System status, MVC confirmation, MongoDB connection status | `200 OK` |
| **POST** | `/api/auth/register` | Public | Creates new user account with bcrypt salted hash & JWT | `201 Created` |
| **POST** | `/api/auth/login` | Public | Verifies credentials (email/mobile + password) and issues JWT | `200 OK` |
| **GET** | `/api/auth/me` | Protected | Returns profile of the authenticated JWT bearer | `200 OK` |
| **POST** | `/api/auth/google` | Public | OAuth 2.0 Google authentication handshake endpoint | `200 OK` |
| **GET** | `/api/fleet` | Public | Lists all fleet vehicles with filter by status/powertrain | `200 OK` |
| **POST** | `/api/fleet` | Protected | Adds a new logistics vehicle to the database | `201 Created` |
| **GET** | `/api/fleet/:id` | Public | Retrieves detailed specifications of a single vehicle | `200 OK` |
| **POST** | `/api/trips` | Protected | Dispatches a new freight trip referencing vehicle & driver | `201 Created` |
| **GET** | `/api/trips` | Public | Queries all dispatched trips with Mongoose vehicle population | `200 OK` |
| **GET** | `/api/trips/export/csv` | Protected | Streams trip manifest data as CSV file download | `200 OK` |
| **POST** | `/api/trips/optimize` | Public | Computes route optimization using 2-Opt algorithm | `200 OK` |
| **GET** | `/api/analytics/kpis` | Public | Real-time MongoDB document aggregation pipeline metrics | `200 OK` |
| **GET** | `/api/curriculum/v8-diagnostics`| Public | Reports Node.js V8 heap allocation, memory, and uptime | `200 OK` |

---

## 🔒 Authentication Header Format
```http
Authorization: Bearer <your_jwt_token_here>
Content-Type: application/json
```
