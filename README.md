# QueueCare — Hospital/Clinic Queue & Appointment Prioritization System
## Real-Time Hospital Operations Platform

**Course:** Database Management Systems (UE24CS352B / UE23CS351A)  
**Institution:** Department of Computer Science & Engineering, PES University, Bangalore  
**Semester & Section:** Semester V, Section 5K  
**Project Leads & Administrators:**
- **Dhruva Ganesh Hegde** — SRN: `PES2UG24CS671` (Project Lead & System Admin)
- **Pramath Ganesh Hegde** — SRN: `PES2UG24CS648` (Co-Lead & System Admin)

---

## 1. Project Overview

**QueueCare** is an intelligent, full-stack Hospital Operations and Outpatient Triage Management Platform designed to eliminate outpatient waiting room congestion, arbitrary triage, and unmonitored doctor delays. 

Built using **Next.js 16 App Router**, **React 19**, **TypeScript**, and **Tailwind CSS**, QueueCare is backed by:
- **Authoritative Relational Database:** Dual-engine layer supporting **MySQL 8.0** alongside a zero-configuration embedded **SQLite** fallback (with WAL mode, foreign key enforcement, and custom MySQL compatibility functions).
- **Real-Time Data Synchronization:** High-performance, connection-managed **Server-Sent Events (SSE)** hub (`/api/realtime`) delivering live mutation events across independent sessions without manual page reloads.
- **Cache-Aside Layer:** **Redis 7.x** (`ioredis`) for high-throughput caching with transactional invalidation.
- **Specialist Discovery:** **Neo4j 5.x** graph database for relationship-based doctor matching and explainable symptom-specialty traversals.

---

## 2. Core Functional Modules

### A. Real-Time Hospital Operations & SSE Broadcast
- Centralized, typed event hub (`lib/realtime.ts`) broadcasting `PatientCreated`, `PatientUpdated`, `DoctorCreated`, `DoctorUpdated`, `AppointmentBooked`, `AppointmentCancelled`, `AppointmentRescheduled`, `PatientCheckedIn`, `QueueStatusChanged`, and `PriorityOverridden`.
- Automatic client reconnection with heartbeat ping and reconciliation fallback.
- Scoped privacy protection ensuring patient data is never broadcast to unauthorized sessions.

### B. Complete Doctor Management & Scheduling
- Register new specialist doctors with departmental alignment, qualifications, and consultation rates.
- Profile and schedule configuration: working days (`Mon-Fri`), working hours (`09:00 - 17:00`), slot durations (15, 20, 30 min), and OPD room assignments.
- Real-time duty status switcher: *Available*, *In-Consultation*, *On Break*, *Off Duty*.
- Status toggling (*Active* / *Inactive*) preserving longitudinal clinical records without deletion.

### C. Complete Patient Management
- Paginated, searchable, and filterable patient directory.
- Contact and demographic editing with audit logging and unique constraint enforcement.
- Medical history drawer tracking past consultations, prescriptions, and queue tokens.

### D. Priority-Ranked Queue Board & Smart Triage
- **Emergency (Tier 1):** Immediate clinical bypass with vital alerts.
- **Urgent (Tier 2):** High pain and severe acute discomfort priority.
- **Senior Citizen (Tier 3):** Automated geriatric priority for patients aged 60+.
- **Child / Infant (Tier 4):** Pediatric priority for patients aged 12 and under.
- **Normal (Tier 5):** Standard outpatient schedule with starvation prevention.
- Sequential daily doctor tokens (`#101`, `#102`, etc.) generated monotonically.
- Dynamic wait-time formulas based on consulting pace (15 mins/patient) and active queue backlog.

### E. Appointment Lifecycle & Collision Prevention
- Prevents double booking doctor slots via atomic relational checks.
- Rescheduling workflow with conflict detection and automated notifications.
- One-click cancellations with audit reasons and queue release.

### F. Dual Administrator Access & Generic Patient Portal
- Independent accounts and sessions for both **Dhruva G Hegde** (`dhruva.admin@queuecare.hospital`) and **Pramath G Hegde** (`pramath.admin@queuecare.hospital`).
- Server-side RBAC enforced on all sensitive administrative endpoints (`/api/db/reset`, `/api/reports`, `/api/cache/stats`, `/api/graph/stats`).
- Generic, dynamic Patient Self-Service Portal dynamically bound to `currentUser.linkedPatientId`, displaying active queue tokens, scheduled bookings, and doctor discovery.

---

## 3. Three-Terminal Independent Execution Guide

QueueCare is designed to run in three independent terminal sessions for transparent full-stack evaluation:

### TERMINAL 1 — MySQL 8.0 Database Setup & Verification
Ensure MySQL 8.0 is running on port 3306, then execute the automated setup script to provision the database, dedicated user, schema, and stored routines:

```bash
cd ~/QueueCare/queuecare
bash database/setup_mysql.sh
```

To verify MySQL connection and table counts:
```bash
mysql -u queuecare_user -pqueuecare_pass queuecare -e "SHOW TABLES; SELECT COUNT(*) FROM patient;"
```

### TERMINAL 2 — Dedicated Backend API Server (Port 5001)
Launch the standalone Express & TypeScript backend API server:

```bash
cd ~/QueueCare/queuecare
npm run dev:backend
```
*The backend API server connects to the database, exposes REST endpoints at `http://localhost:5001/api`, runs Server-Sent Events (SSE), and logs all requests with response times.*

### TERMINAL 3 — Frontend Development Server (Port 3000)
Launch the Next.js frontend development server:

```bash
cd ~/QueueCare/queuecare
npm run dev:frontend
```
*The frontend starts on `http://localhost:3000`, communicates with the dedicated Backend API on port 5001, and provides real-time hospital triage operations.*

---

## 4. Multi-Session Real-Time Demonstration

To demonstrate real-time data propagation across independent client sessions:

1. Open **[http://localhost:3000](http://localhost:3000)** in your main browser window.
2. Open a second browser window (or Incognito window) to **[http://localhost:3000](http://localhost:3000)**.
3. In Window 1 (logged in as Administrator), navigate to **Queue Management** and click **Call** on an active waiting token.
4. In Window 2 (viewing as Doctor or Patient), observe the status instantly transition from *Waiting* to *Called* **without manually refreshing the page**.
5. In Window 1, register a new patient or book an appointment; observe Window 2's counters and tables update live via the Server-Sent Events stream.

---

## 5. Verification and Testing

Execute the automated test suites covering unit tests, integration tests, and full-stack end-to-end acceptance tests:

```bash
# 1. Run unit, integration, and real-time test suite (33 tests - 100% passing)
npm test

# 2. Run full-stack End-to-End acceptance test (all 7 critical workflows)
node scripts/test-e2e-backend.mjs

# 3. Run ESLint validation (0 errors, 0 warnings)
npm run lint

# 4. Run optimized production build (0 errors)
npm run build
```

---

## 6. Default Demonstration Accounts

| Role | Name | Email | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Dhruva G Hegde | `dhruva.admin@queuecare.hospital` | `admin123` | Full System Access |
| **Administrator** | Pramath G Hegde | `pramath.admin@queuecare.hospital` | `admin123` | Full System Access |
| **Doctor** | Dr. Rajesh Sharma | `dr.rajesh@queuecare.hospital` | `doctor123` | Cardiology OPD & Assigned Queue |
| **Receptionist** | Kavya Raman | `kavya.r@queuecare.hospital` | `reception123` | Intake Desk & Queue Operations |
| **Patient** | Dynamic Patient Portal | `patient@queuecare.hospital` | `patient123` | Self-Service Bookings & Tokens |

---

## 7. Submission Deliverables Included

- `REALTIME_IMPLEMENTATION_PLAN.md` — Real-time architecture specification and acceptance criteria.
- `PROJECT_REQUIREMENTS.md` — Complete mapping of assignment requirements to code.
- `ARCHITECTURE.md` — System architecture, module boundaries, and data flow.
- `DATABASE.md` — Relational schema, ER diagram, indexes, constraints, and migrations.
- `TESTING.md` — Test commands, coverage matrix, and test execution results.
- `DBMS_MINI_PROJECT_REPORT.md` — Academic mini project report formatted strictly per PES University syllabus.
- `database/schema.sql` — MySQL DDL table creation statements.
- `database/seed.sql` — Seed data.
- `database/queries.sql` — Syllabus SQL queries (Aggregate, Update, Delete, Correlated, Nested).
- `database/procedures_triggers.sql` — Stored procedures, functions, and triggers.
