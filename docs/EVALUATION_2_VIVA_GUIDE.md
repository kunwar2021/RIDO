# 🎓 RIDO Logistics — Evaluation 2 Viva Defense & Architecture Manual
**Contributors**: Kunwar Bansal, Parineeta, Kartik Sukhija  
**Project**: RIDO Intelligent Logistics & Fleet Management System (MVC Backend & MongoDB Atlas)  
**Academic Curriculum**: Full-Stack Node.js, Express.js REST APIs, MongoDB Mongoose (Lectures 1–41)

---

## 🏛️ 1. Backend MVC Architecture Diagram

```
                              [ Client (Browser / Mobile / Postman) ]
                                                │
                                                ▼  HTTP REST (JSON)
                                 [ Express.js Routing Engine ]
                                                │
                     ┌──────────────────────────┼──────────────────────────┐
                     ▼                          ▼                          ▼
              /api/auth                  /api/fleet                 /api/trips
                     │                          │                          │
                     ▼                          ▼                          ▼
        [ Auth Middleware (JWT) ]      [ Auth Middleware ]        [ Auth Middleware ]
                     │                          │                          │
                     ▼                          ▼                          ▼
           [ auth.controller.js ]     [ fleet.controller.js ]     [ trip.controller.js ]
                     │                          │                          │
                     ▼                          ▼                          ▼
               [ User Model ]            [ Vehicle Model ]          [ Trip Model ]
                     │                          │                          │
                     └──────────────────────────┼──────────────────────────┘
                                                ▼
                                   [ Mongoose ODM Connection ]
                                                │
                                                ▼ (SSL / TLS)
                                  [ MongoDB Atlas Cloud Cluster ]
```

---

## ⚡ 2. Core Curriculum Technical Highlights (Lectures 31–41)

### 1. Node.js Event Loop & V8 Architecture (Lectures 31–32)
- **Single-Threaded Non-Blocking**: Main execution runs on V8 single thread; heavy I/O and network operations are delegated to C++ **libuv thread pool**.
- **Diagnostic Endpoint**: `GET /api/curriculum/v8-diagnostics` exposes real-time V8 heap allocation, external memory, and Node.js process uptime.

### 2. File System, Streams & Buffers (Lectures 33–36)
- **Memory Optimization**: Rather than loading large data sets entirely into RAM, `GET /api/trips/export/csv` pipes streamed CSV row chunks directly to the response socket.
- **EventEmitter**: Core modules emit and listen to lifecycle dispatch events (`dispatchEvents.emit('trip_dispatched')`).

### 3. RESTful Routing, Middleware & MVC (Lectures 37–38)
- Clean separation between routers (`backend/routes/`) and business controllers (`backend/controllers/`).
- Standardized HTTP status codes: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`.

### 4. Authentication, bcrypt & JWT Security (Lecture 39)
- **Password Salting**: `bcryptjs` with 10 salt rounds automatically hashes credentials before database persistence.
- **Stateless Tokens**: Signed JWTs encode `userId` and `role` with 7-day expiration (`jwt.sign()`).

### 5. Multer Multipart Uploads (Lecture 40)
- Configured storage engine sanitizing uploaded Proof-of-Delivery (POD) slips, receipts, and consignment documents into `/uploads`.

### 6. MongoDB Atlas Cloud Integration (Lecture 41)
- **Cloud Database**: Connected to multi-region cloud cluster via Mongoose with auto-reconnect fallback.
- **Document Schemas & Relations**: Relational modeling using `ObjectId` references (`ref: 'Vehicle'`) and live querying via `.populate()`.

---

## 🎯 3. Standard Evaluator Q&A Reference

1. **How is the project deployed?**
   - Live on **Render** (`https://rido-90qc.onrender.com`) with automated Git continuous deployment and connected to cloud **MongoDB Atlas**.
2. **How are credentials secured?**
   - Passwords use one-way salted SHA/bcrypt hashes; all protected routes enforce Bearer JWT verification.
3. **What is the database structure?**
   - Three core collections: `users`, `vehicles`, and `trips`, populated with relational Mongoose schemas.
