# QueueCare — Requirements Specification & Implementation Mapping

**Course:** Database Management Systems (UE24CS352B / UE23CS351A)  
**Institution:** Department of Computer Science & Engineering, PES University, Bangalore  
**Semester & Section:** Semester V, Section 5K  
**Project Title:** QueueCare — Hospital/Clinic Queue & Appointment Prioritization System  
**Students:**
- **Pramath Ganesh Hegde** (SRN: `PES2UG24CS648`)
- **Dhruva Ganesh Hegde** (SRN: `PES2UG24CS671`)

---

## 1. Project Background and Objective

Modern outpatient hospital departments and clinics frequently struggle with manual check-in queues, unexpected clinical delays, unpredictable patient wait times, and arbitrary triage. **QueueCare** is an intelligent, full-stack Hospital/Clinic Queue and Appointment Prioritization System designed to solve these challenges with real-time relational data persistence, transparent clinical prioritization rules, dynamic wait-time estimation, and comprehensive doctor-patient-visit lifecycle tracking.

The application is built on top of a robust Next.js App Router, TypeScript, and Tailwind CSS architecture backed by a dual-engine relational database layer (MySQL 8.0 compliant with an automated embedded SQLite fallback for frictionless local execution).

---

## 2. Official Assignment Requirements & Relational Schema

Based on the primary project specification document and schema screenshots (ER & SR diagrams):

### 2.1 The Eight Primary Relational Entities
1. **`department`**: Represents hospital medical specialties and clinic locations.
   - Columns: `department_id` (PK, INT AUTO_INCREMENT), `department_name` (VARCHAR(100), UNIQUE, NOT NULL), `location` (VARCHAR(100)), `contact_number` (VARCHAR(15)), `status` (VARCHAR(20) DEFAULT 'Active').
2. **`staff`**: Hospital administrative, nursing, queue management, and billing personnel.
   - Columns: `staff_id` (PK, INT AUTO_INCREMENT), `staff_name` (VARCHAR(100), NOT NULL), `username` (VARCHAR(50), UNIQUE, NOT NULL), `email` (VARCHAR(100), UNIQUE, NOT NULL), `phone` (VARCHAR(15)), `role` (VARCHAR(30) CHECK IN ('Receptionist', 'Queue Manager', 'Administrator', 'Doctor Assistant', 'Billing Staff')), `staff_status` (VARCHAR(20) DEFAULT 'Active'), `date_joined` (DATE).
3. **`patient`**: Registered patients with demographic and emergency contact records.
   - Columns: `patient_id` (PK, INT AUTO_INCREMENT), `first_name` (VARCHAR(50), NOT NULL), `last_name` (VARCHAR(50), NOT NULL), `date_of_birth` (DATE, NOT NULL), `gender` (VARCHAR(10)), `phone` (VARCHAR(15), UNIQUE), `email` (VARCHAR(100), UNIQUE), `address` (VARCHAR(255)), `emergency_contact` (VARCHAR(15)), `registration_date` (DATE NOT NULL), `status` (VARCHAR(20) DEFAULT 'Active').
4. **`doctor`**: Medical consultants and specialists tied to specific departments.
   - Columns: `doctor_id` (PK, INT AUTO_INCREMENT), `department_id` (FK -> `department.department_id`, NOT NULL), `doctor_name` (VARCHAR(100), NOT NULL), `specialization` (VARCHAR(100)), `qualification` (VARCHAR(150)), `phone` (VARCHAR(15)), `email` (VARCHAR(100), UNIQUE), `availability_status` (VARCHAR(20) DEFAULT 'Available'), `consultation_fee` (DECIMAL(10,2)), `status` (VARCHAR(20) DEFAULT 'Active').
5. **`appointment`**: Scheduled patient consultations with assigned doctors.
   - Columns: `appointment_id` (PK, INT AUTO_INCREMENT), `patient_id` (FK -> `patient.patient_id`, NOT NULL), `doctor_id` (FK -> `doctor.doctor_id`, NOT NULL), `department_id` (FK -> `department.department_id`, NOT NULL), `appointment_date` (DATE, NOT NULL), `appointment_time` (TIME, NOT NULL), `booking_date` (DATE DEFAULT (CURDATE())), `reason_for_visit` (VARCHAR(255)), `appointment_type` (VARCHAR(30) DEFAULT 'OPD'), `appointment_status` (VARCHAR(20) DEFAULT 'Scheduled'), `remarks` (VARCHAR(255)).
6. **`queue_entry`**: Active daily triage tokens generated when patients check in.
   - Columns: `queue_id` (PK, INT AUTO_INCREMENT), `appointment_id` (FK -> `appointment.appointment_id`, UNIQUE, NOT NULL), `doctor_id` (FK -> `doctor.doctor_id`, NOT NULL), `token_number` (INT, NOT NULL), `queue_date` (DATE, NOT NULL), `check_in_time` (TIME), `estimated_wait_time` (INT DEFAULT 0), `priority_level` (VARCHAR(20) DEFAULT 'Normal'), `priority_reason` (VARCHAR(255)), `queue_status` (VARCHAR(30) DEFAULT 'Waiting').
7. **`visit`**: Documented clinical encounter, medical notes, prescription, and billing.
   - Columns: `visit_id` (PK, INT AUTO_INCREMENT), `appointment_id` (FK -> `appointment.appointment_id`, NOT NULL), `doctor_id` (FK -> `doctor.doctor_id`, NOT NULL), `staff_id` (FK -> `staff.staff_id`), `visit_date` (DATE, NOT NULL), `start_time` (TIME), `end_time` (TIME), `diagnosis` (VARCHAR(255)), `prescription` (VARCHAR(255)), `doctor_notes` (VARCHAR(500)), `visit_status` (VARCHAR(20) DEFAULT 'In Progress'), `billed_amount` (DECIMAL(10,2) DEFAULT 0.00).
8. **`notification`**: Automated SMS/system alerts dispatched to patients regarding appointment confirmations, queue position calls, and delays.
   - Columns: `notification_id` (PK, INT AUTO_INCREMENT), `patient_id` (FK -> `patient.patient_id`, NOT NULL), `appointment_id` (FK -> `appointment.appointment_id`), `notification_type` (VARCHAR(50), NOT NULL), `message` (VARCHAR(255), NOT NULL), `sent_time` (DATETIME DEFAULT CURRENT_TIMESTAMP), `notification_status` (VARCHAR(20) DEFAULT 'Sent'), `read_time` (DATETIME).

---

## 3. Prioritization & Wait Time Logic

1. **Prioritization Levels**:
   - **Emergency (Tier 1)**: Immediate clinical threat. Flags the queue with highest precedence. Red alert banner; instant bypass to doctor consultation with audit explanation.
   - **Urgent (Tier 2)**: Acute discomfort, high fever, post-trauma without immediate vital collapse. Positioned ahead of routine appointments.
   - **Senior Citizen (Tier 3)**: Patients aged 60+ (auto-detected via `date_of_birth` or selected triage). Reduced waiting tolerance.
   - **Child / Infant (Tier 4)**: Pediatric patients aged 12 and under.
   - **Normal (Tier 5)**: Standard scheduled outpatient appointments ordered primarily by appointment time and check-in sequence.

2. **Wait Time Estimation Algorithm**:
   $$\text{Estimated Wait Time (mins)} = \sum_{p \in \text{Waiting Ahead}} \text{Consultation Pace}(p)$$
   - Standard baseline consultation duration = 15 minutes per patient.
   - Urgent / Emergency consultations estimated at 20 minutes.
   - Re-computed dynamically whenever queue status changes (e.g. Call Patient, Start Consultation, Mark Completed, Skip, or Reorder).
   - Starvation prevention: Routine patients waiting over 45 minutes receive priority promotion to prevent indefinite postponement.

---

## 4. Requirement Verification & Implementation Matrix

| Requirement ID | Module / Feature | Implementation Location | Database Entities Involved | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | **Relational Schema & DDL** | `database/schema.sql`, `lib/db.ts` | All 8 tables: `department`, `staff`, `patient`, `doctor`, `appointment`, `queue_entry`, `visit`, `notification` | Automated table creation and constraint tests |
| **REQ-02** | **Seed Data (DML)** | `database/seed.sql`, `lib/db.ts` | All 8 tables with realistic clinic data | Verification via DB queries and automated count assertion |
| **REQ-03** | **Live Admin Dashboard** | `app/page.tsx`, `app/api/dashboard/stats/route.ts` | Aggregations over `patient`, `appointment`, `queue_entry`, `doctor`, `department` | Real-time counts, wait-time averages, and department distribution |
| **REQ-04** | **Patient Management** | `app/page.tsx`, `app/api/patients/route.ts` | `patient` | Form validation, CRUD operations, duplicate phone/email detection, patient history modal |
| **REQ-05** | **Doctor & Specialty Directory** | `app/page.tsx`, `app/api/doctors/route.ts` | `doctor`, `department` | Specialty filtering, doctor availability toggling, fee displays |
| **REQ-06** | **Appointment Scheduling & Rescheduling** | `app/page.tsx`, `app/api/appointments/route.ts` | `appointment`, `patient`, `doctor`, `department` | Time-slot collision checks, cancellation handling, status updates |
| **REQ-07** | **Live Queue & Prioritization** | `app/page.tsx`, `app/api/queue/route.ts` | `queue_entry`, `appointment`, `doctor` | Check-in token generation, priority rank sorting, ETA calculation, manual triage override |
| **REQ-08** | **Clinical Visit & Consultation** | `app/page.tsx`, `app/api/visits/route.ts` | `visit`, `appointment`, `queue_entry`, `doctor` | Medical notes entry, prescription generation, fee billing, auto-completion |
| **REQ-09** | **Patient Notification System** | `app/page.tsx`, `app/api/notifications/route.ts` | `notification`, `patient`, `appointment` | Automatic generation on booking, triage, and consultation status changes |
| **REQ-10** | **Analytical Queries & Reports** | `app/page.tsx`, `app/api/reports/route.ts`, `database/queries.sql` | `appointment`, `queue_entry`, `department`, `doctor` | Group By, Aggregates, Correlated subqueries, Nested subqueries |
| **REQ-11** | **Role-Based Access Control** | `app/page.tsx`, `lib/auth.ts` | `staff` | Staff switcher (Admin, Queue Manager, Receptionist, Doctor Assistant, Billing) |
| **REQ-12** | **Automated Testing Suite** | `tests/db.test.ts`, `tests/api.test.ts` | All tables | Unit & integration tests for queue ordering, double booking, and CRUD |
| **REQ-13** | **Academic Documentation** | `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `TESTING.md`, `DBMS_MINI_PROJECT_REPORT.md` | Entire repository | Rigorous documentation matching PES University DBMS Project rubric |

---

## 5. Constraints and Compliance

1. **Non-mock Data Guarantee**: The application reads from and writes to persistent relational storage on every user action.
2. **Dual-Engine Relational Support**:
   - `DB_TYPE=mysql`: Direct connection to MySQL 8.0 using `mysql2/promise`.
   - `DB_TYPE=sqlite` (default): Zero-config self-initializing SQLite file (`queuecare.db`) ensuring 100% portability.
3. **Emergency Safeguard**: Clear clinical triage warning that algorithm triage is assistive and emergency cases bypass waiting lists immediately.
4. **Zero Vulnerability Exposure**: Environment-based credentials, parameterized queries against SQL injection, strict TypeScript interfaces.

