# Mini Project Report on:
# QUEUECARE — HOSPITAL/CLINIC QUEUE & APPOINTMENT PRIORITIZATION SYSTEM

**Submitted in partial fulfilment of the requirements for the award of degree of**  
**Bachelor of Technology in Computer Science & Engineering**  
**Course Code:** UE24CS352B / UE23CS351A – DBMS Project  
**Academic Semester:** Fifth Semester (AUG – DEC 2026)

---

### Submitted by:
| Student Name | Student Registration Number (SRN) |
| :--- | :--- |
| **PRAMATH GANESH HEGDE** | `PES2UG24CS648` |
| **DHRUVA GANESH HEGDE** | `PES2UG24CS671` |

**Section:** 5K

### Under the Guidance of:
**Dr. Shilpa S**  
Assistant Professor, Department of Computer Science & Engineering  
PES University, Electronic City Campus, Bengaluru

```text
                           PES UNIVERSITY
               (Established under Karnataka Act No. 16 of 2013)
        Electronic City, Hosur Road, Bengaluru – 560 100, Karnataka, India
```

---

## CERTIFICATE

This is to certify that the mini project entitled **"QueueCare – Hospital/Clinic Queue & Appointment Prioritization System"** is a bonafide work carried out by **Pramath Ganesh Hegde (PES2UG24CS648)** and **Dhruva Ganesh Hegde (PES2UG24CS671)** in partial fulfilment for the completion of fifth semester DBMS Project (`UE24CS352B` / `UE23CS351A`) in the Program of Study - Bachelor of Technology in Computer Science and Engineering under rules and regulations of PES University, Bengaluru during the period AUG. 2026 – DEC. 2026. It is certified that all corrections / suggestions indicated for internal assessment have been incorporated in the report. The project has been approved as it satisfies the 5th semester academic requirements in respect of project work.

\
**Signature of Guide:**  
**Dr. Shilpa S**  
Assistant Professor  
Department of Computer Science & Engineering  
PES University, Bengaluru  

---

## DECLARATION

We hereby declare that the DBMS Project entitled **"QueueCare – Hospital/Clinic Queue & Appointment Prioritization System"** has been carried out by us under the guidance of **Dr. Shilpa S**, Assistant Professor and submitted in partial fulfilment of the course requirements for the award of degree of Bachelor of Technology in Computer Science and Engineering of PES University, Bengaluru during the academic semester AUG – DEC 2026.

| Student Name | SRN | Signature |
| :--- | :--- | :--- |
| Pramath Ganesh Hegde | `PES2UG24CS648` | ___________________ |
| Dhruva Ganesh Hegde | `PES2UG24CS671` | ___________________ |

---

## ACKNOWLEDGEMENT

We would like to express our deepest gratitude to **Dr. Shilpa S**, Department of Computer Science and Engineering, PES University, for her continuous guidance, assistance, and encouragement throughout the development of this UE24CS352B DBMS Project.

We take this opportunity to thank **Dr. Sandesh B J**, Professor and Chairperson, Department of Computer Science and Engineering, PES University, for all the knowledge and academic support we have received from the department.

We are deeply grateful to **Prof. Jawahar Doreswamy**, Chancellor – PES University, and **Dr. Suryaprasad J**, Vice-Chancellor, PES University, for providing us with state-of-the-art facilities and enlightenment every step of the way. Finally, this project could not have been completed without the continual support and encouragement of our families and peers.

---

## ABSTRACT

Modern outpatient departments (OPDs) in hospitals and multi-specialty clinics grapple with unpredictable patient arrival patterns, arbitrary first-come-first-served queues, opaque triage mechanisms, and unmanaged physician delays. This results in prolonged waiting room congestion, patient distress, and potentially dangerous clinical delays for high-acuity cases.

**QueueCare** is an intelligent, full-stack Hospital/Clinic Queue and Appointment Prioritization System engineered to solve these challenges through normalized relational data persistence, transparent clinical prioritization rules, dynamic wait-time estimation, and comprehensive outpatient lifecycle tracking. 

The system implements a third-normal-form (3NF) relational database comprising eight entities: `department`, `staff`, `patient`, `doctor`, `appointment`, `queue_entry`, `visit`, and `notification`. QueueCare introduces an automated clinical triage engine that classifies arrivals into five priority tiers: Emergency (Immediate bypass), Urgent, Senior Citizen (Geriatric care $\ge 60$ yrs), Child/Infant (Pediatric care $\le 12$ yrs), and Normal OPD. Monotonic doctor-specific tokens and dynamic wait times are calculated in real time, accompanied by starvation-prevention algorithms and automated patient notifications. 

The software is implemented with a Next.js App Router, React 19, TypeScript, and Tailwind CSS architecture backed by a dual-engine database layer supporting both MySQL 8.0 and embedded SQLite for complete portability. Rigorous automated testing confirms 100% compliance with data integrity constraints, appointment collision prevention, and syllabus-mandated SQL analytical queries.

---

## TABLE OF CONTENTS

| Chapter No. | Title | Page No. |
| :--- | :--- | :--- |
| **1** | **INTRODUCTION** | 6 |
| **2** | **PROBLEM DEFINITION** | 8 |
| **3** | **ER MODEL** | 10 |
| **4** | **ER TO RELATIONAL MAPPING** | 12 |
| | 4.1 Steps of Algorithm for Chosen Problem | 12 |
| | 4.2 Complete Diagram of Relational Mapping | 14 |
| **5** | **DDL STATEMENTS** | 16 |
| **6** | **DML STATEMENTS** | 22 |
| **7** | **QUERIES** | 26 |
| | 7.1 Simple Query with GROUP BY & Aggregate | 26 |
| | 7.2 UPDATE Operation | 27 |
| | 7.3 DELETE Operation | 28 |
| | 7.4 Correlated Query | 29 |
| | 7.5 Nested Query | 30 |
| **8** | **STORED PROCEDURES, FUNCTIONS AND TRIGGERS** | 32 |
| | 8.1 Stored Procedures and Functions | 32 |
| | 8.2 Triggers | 34 |
| **9** | **FRONT END DEVELOPMENT** | 36 |
| | **REFERENCES / BIBLIOGRAPHY** | 42 |
| | **APPENDIX A: DEFINITIONS, ACRONYMS AND ABBREVIATIONS** | 43 |

---

## CHAPTER 1: INTRODUCTION

Hospital and clinic outpatient departments (OPDs) represent the primary clinical gateway through which patients access medical care. Efficient outpatient administration requires synchronizing diverse operational threads: registering patient demographics, managing doctor directories and clinical specialties, scheduling time slots, maintaining equitable waiting queues, and capturing physician consultation records.

In traditional outpatient settings, queue management relies primarily on manual physical token distribution or rudimentary First-Come-First-Served (FCFS) ticket dispensers. These legacy mechanisms suffer from severe limitations:
1. **Clinical Inequity:** Patients with acute clinical discomfort (e.g. severe asthma, fractures, high fever) wait behind routine checkups.
2. **Vulnerability Overlook:** Geriatric patients and young infants endure prolonged physical fatigue in congested waiting halls.
3. **Double-Booking and Schedule Collisions:** Lack of transactional scheduling validation allows multiple patients to book identical doctor consultation slots.
4. **Information Asymmetry:** Patients are not informed of their estimated waiting times or doctor room delays, leading to crowding at reception desks.
5. **Disconnected Records:** Appointment scheduling, queue check-in, and doctor clinical visit notes remain siloed in separate logbooks or disconnected systems.

**QueueCare** addresses these systemic challenges by providing an integrated, relational outpatient management system. Built upon a 3NF normalized schema, QueueCare introduces automated clinical triage rules, dynamic queue wait-time calculations, automated patient alerts, and seamless physician consultation workflows.

---

## CHAPTER 2: PROBLEM DEFINITION

The primary objective of **QueueCare** is to engineer a robust, scalable, and clinically transparent outpatient queue and appointment prioritization system.

### Key Objectives:
1. **Relational Database Integrity:** Model hospital operations into a normalized relational schema that guarantees referential integrity, enforces uniqueness across identifiers and contact details, and prevents orphan records.
2. **Collision-Free Appointment Scheduling:** Allow patients and staff to schedule, reschedule, or cancel consultations while programmatically verifying doctor availability and preventing double bookings.
3. **Multi-Tiered Patient Prioritization:** Implement transparent, auditable prioritization logic that categorizes intake arrivals into five distinct tiers:
   - **Emergency:** Critical vital threats (immediate clinical escalation).
   - **Urgent:** Acute discomfort, severe pain, post-traumatic distress.
   - **Senior Citizen:** Geriatric patients (age $\ge 60$ years).
   - **Child / Infant:** Pediatric patients (age $\le 12$ years).
   - **Normal:** Standard routine OPD consultations.
4. **Dynamic Waiting-Time Estimation:** Estimate wait times dynamically based on active waiting tokens ahead and doctor consultation pace (15 mins/patient), with starvation prevention safeguards.
5. **Clinical Encounter Tracking:** Record electronic diagnoses, prescriptions, physician advice, and consultation billing fees upon visit completion.
6. **Automated Notification Trail:** Generate real-time audit notifications on appointment confirmations, token generation, physician room calls, and visit summaries.
7. **Comprehensive Analytical Reporting:** Provide multi-table aggregate queries, peak intake hour analyses, and correlated subqueries to support clinic administrative decisions.

---

## CHAPTER 3: ER MODEL

The QueueCare conceptual schema is represented using the Entity-Relationship (ER) model consisting of eight entities and their relational mappings.

### Entities and Attributes:
- **`DEPARTMENT`**: `Department_ID` (PK), `Department_Name`, `Location`, `Contact_Number`, `Status`.
- **`STAFF`**: `Staff_ID` (PK), `Staff_Name`, `Username`, `Email`, `Phone`, `Role`, `Staff_Status`, `Date_Joined`.
- **`PATIENT`**: `Patient_ID` (PK), `First_Name`, `Last_Name`, `Date_of_Birth`, `Gender`, `Phone`, `Email`, `Address`, `Emergency_Contact`, `Registration_Date`, `Status`.
- **`DOCTOR`**: `Doctor_ID` (PK), `Doctor_Name`, `Specialization`, `Qualification`, `Phone`, `Email`, `Availability_Status`, `Consultation_Fee`, `Status`.
- **`APPOINTMENT`**: `Appointment_ID` (PK), `Appointment_Date`, `Appointment_Time`, `Booking_Date`, `Reason_For_Visit`, `Appointment_Type`, `Appointment_Status`, `Remarks`.
- **`QUEUE_ENTRY`**: `Queue_ID` (PK), `Token_Number`, `Queue_Date`, `Check_In_Time`, `Estimated_Wait_Time`, `Priority_Level`, `Priority_Reason`, `Queue_Status`.
- **`VISIT`**: `Visit_ID` (PK), `Visit_Date`, `Start_Time`, `End_Time`, `Diagnosis`, `Prescription`, `Doctor_Notes`, `Visit_Status`, `Billed_Amount`.
- **`NOTIFICATION`**: `Notification_ID` (PK), `Notification_Type`, `Message`, `Sent_Time`, `Notification_Status`.

### Relationships:
- **Has (1:N):** One `DEPARTMENT` employs many `DOCTOR`s.
- **Belongs_To (1:N):** One `DEPARTMENT` hosts many `APPOINTMENT`s.
- **Scheduled_With (1:N):** One `DOCTOR` is scheduled for many `APPOINTMENT`s.
- **Handles_Queue (1:N):** One `DOCTOR` manages many `QUEUE_ENTRY` records.
- **Books (1:N):** One `PATIENT` books many `APPOINTMENT`s.
- **May_Generate (1:0..1):** One `APPOINTMENT` generates at most one active `QUEUE_ENTRY` on arrival.
- **Results_In (1:0..1):** One `APPOINTMENT` results in at most one `VISIT` encounter.
- **Generates (1:N):** One `APPOINTMENT` generates many `NOTIFICATION`s.
- **Receives (1:N):** One `PATIENT` receives many `NOTIFICATION`s.
- **Conducts (1:N):** One `DOCTOR` conducts many `VISIT`s.
- **Managed_By (1:N):** One `STAFF` member manages administrative logging for `VISIT`s.

---

## CHAPTER 4: ER TO RELATIONAL MAPPING

### 4.1 Steps of Algorithm for Chosen Problem
The standard 7-step ER-to-Relational Mapping Algorithm was applied:

1. **Step 1: Mapping of Regular Strong Entity Types:**
   - Create relation schemas for `department`, `staff`, and `patient` choosing their designated key attributes as Primary Keys (`department_id`, `staff_id`, `patient_id`).
2. **Step 2: Mapping of Weak Entity Types:**
   - No weak entities exist in the QueueCare model; all entities possess distinct primary keys.
3. **Step 3: Mapping of Binary 1:1 Relationship Types:**
   - The relationship between `appointment` and `queue_entry` is 1:0..1. The Primary Key of `appointment` (`appointment_id`) is added to `queue_entry` as a Foreign Key with a `UNIQUE` constraint.
4. **Step 4: Mapping of Binary 1:N Relationship Types:**
   - `department` (1) to `doctor` (N): include `department_id` in `doctor` as FK.
   - `patient` (1) to `appointment` (N): include `patient_id` in `appointment` as FK.
   - `doctor` (1) to `appointment` (N): include `doctor_id` in `appointment` as FK.
   - `department` (1) to `appointment` (N): include `department_id` in `appointment` as FK.
   - `doctor` (1) to `queue_entry` (N): include `doctor_id` in `queue_entry` as FK.
   - `patient` (1) to `notification` (N): include `patient_id` in `notification` as FK.
   - `appointment` (1) to `notification` (N): include `appointment_id` in `notification` as FK.
   - `doctor` (1) to `visit` (N): include `doctor_id` in `visit` as FK.
   - `staff` (1) to `visit` (N): include `staff_id` in `visit` as FK.
5. **Step 5: Mapping of Binary M:N Relationship Types:**
   - M:N relationships between patients and doctors are resolved through the associative entities `appointment` and `visit`.
6. **Step 6: Mapping of Multi-Valued Attributes:**
   - All attributes in QueueCare are atomic (1NF compliant).
7. **Step 7: Mapping of N-ary Relationships:**
   - Ternary relationships are cleanly resolved via `appointment` linking `patient`, `doctor`, and `department`.

### 4.2 Complete Diagram of Relational Mapping (SR Diagram)
- **department** (`department_id` [PK], `department_name` [UQ], `location`, `contact_number`, `status`)
- **staff** (`staff_id` [PK], `staff_name`, `username` [UQ], `email` [UQ], `phone`, `role`, `staff_status`, `date_joined`)
- **patient** (`patient_id` [PK], `first_name`, `last_name`, `date_of_birth`, `gender`, `phone` [UQ], `email` [UQ], `address`, `emergency_contact`, `registration_date`, `status`)
- **doctor** (`doctor_id` [PK], `department_id` [FK $\to$ department], `doctor_name`, `specialization`, `qualification`, `phone`, `email` [UQ], `availability_status`, `consultation_fee`, `status`)
- **appointment** (`appointment_id` [PK], `patient_id` [FK $\to$ patient], `doctor_id` [FK $\to$ doctor], `department_id` [FK $\to$ department], `appointment_date`, `appointment_time`, `booking_date`, `reason_for_visit`, `appointment_type`, `appointment_status`, `remarks`)
- **queue_entry** (`queue_id` [PK], `appointment_id` [FK $\to$ appointment, UQ], `doctor_id` [FK $\to$ doctor], `token_number`, `queue_date`, `check_in_time`, `estimated_wait_time`, `priority_level`, `priority_reason`, `queue_status`)
- **visit** (`visit_id` [PK], `appointment_id` [FK $\to$ appointment], `doctor_id` [FK $\to$ doctor], `staff_id` [FK $\to$ staff], `visit_date`, `start_time`, `end_time`, `diagnosis`, `prescription`, `doctor_notes`, `visit_status`, `billed_amount`)
- **notification** (`notification_id` [PK], `patient_id` [FK $\to$ patient], `appointment_id` [FK $\to$ appointment], `notification_type`, `message`, `sent_time`, `notification_status`)

---

## CHAPTER 5: DDL STATEMENTS

The Data Definition Language (DDL) statements used to establish the QueueCare database in MySQL 8.0:

```sql
CREATE DATABASE IF NOT EXISTS queuecare;
USE queuecare;

-- 1. DEPARTMENT
CREATE TABLE department (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(100) DEFAULT NULL,
    contact_number VARCHAR(15) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. STAFF
CREATE TABLE staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    staff_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) DEFAULT NULL,
    role VARCHAR(30) NOT NULL,
    staff_status VARCHAR(20) DEFAULT 'Active',
    date_joined DATE DEFAULT NULL,
    CONSTRAINT chk_staff_role CHECK (role IN ('Receptionist', 'Queue Manager', 'Administrator', 'Doctor Assistant', 'Billing Staff'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. PATIENT
CREATE TABLE patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) DEFAULT NULL,
    phone VARCHAR(15) UNIQUE DEFAULT NULL,
    email VARCHAR(100) UNIQUE DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    emergency_contact VARCHAR(15) DEFAULT NULL,
    registration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. DOCTOR
CREATE TABLE doctor (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    doctor_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) DEFAULT NULL,
    qualification VARCHAR(150) DEFAULT NULL,
    phone VARCHAR(15) DEFAULT NULL,
    email VARCHAR(100) UNIQUE DEFAULT NULL,
    availability_status VARCHAR(20) DEFAULT 'Available',
    consultation_fee DECIMAL(10,2) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    working_days VARCHAR(50) DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    working_hours_start TIME DEFAULT '09:00:00',
    working_hours_end TIME DEFAULT '17:00:00',
    slot_duration_minutes INT DEFAULT 15,
    room_number VARCHAR(20) DEFAULT 'Room 101',
    CONSTRAINT fk_doctor_department FOREIGN KEY (department_id) 
        REFERENCES department (department_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. APPOINTMENT
CREATE TABLE appointment (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    department_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    booking_date DATE DEFAULT (CURDATE()),
    reason_for_visit VARCHAR(255) DEFAULT NULL,
    appointment_type VARCHAR(30) DEFAULT 'OPD',
    appointment_status VARCHAR(20) DEFAULT 'Scheduled',
    remarks VARCHAR(255) DEFAULT NULL,
    CONSTRAINT fk_app_patient FOREIGN KEY (patient_id) 
        REFERENCES patient (patient_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_app_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctor (doctor_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_app_department FOREIGN KEY (department_id) 
        REFERENCES department (department_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. QUEUE_ENTRY
CREATE TABLE queue_entry (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL UNIQUE,
    doctor_id INT NOT NULL,
    token_number INT NOT NULL,
    queue_date DATE NOT NULL,
    check_in_time TIME DEFAULT NULL,
    estimated_wait_time INT DEFAULT 0,
    priority_level VARCHAR(20) DEFAULT 'Normal',
    priority_reason VARCHAR(255) DEFAULT NULL,
    queue_status VARCHAR(30) DEFAULT 'Waiting',
    CONSTRAINT fk_queue_appointment FOREIGN KEY (appointment_id) 
        REFERENCES appointment (appointment_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_queue_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctor (doctor_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. VISIT
CREATE TABLE visit (
    visit_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    doctor_id INT NOT NULL,
    staff_id INT DEFAULT NULL,
    visit_date DATE NOT NULL,
    start_time TIME DEFAULT NULL,
    end_time TIME DEFAULT NULL,
    diagnosis VARCHAR(255) DEFAULT NULL,
    prescription VARCHAR(255) DEFAULT NULL,
    doctor_notes VARCHAR(500) DEFAULT NULL,
    visit_status VARCHAR(20) DEFAULT 'In Progress',
    billed_amount DECIMAL(10,2) DEFAULT 0.00,
    CONSTRAINT fk_visit_appointment FOREIGN KEY (appointment_id) 
        REFERENCES appointment (appointment_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_visit_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctor (doctor_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_visit_staff FOREIGN KEY (staff_id) 
        REFERENCES staff (staff_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. NOTIFICATION
CREATE TABLE notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    appointment_id INT DEFAULT NULL,
    notification_type VARCHAR(50) NOT NULL,
    message VARCHAR(255) NOT NULL,
    sent_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    notification_status VARCHAR(20) DEFAULT 'Sent',
    CONSTRAINT fk_notif_patient FOREIGN KEY (patient_id) 
        REFERENCES patient (patient_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notif_appointment FOREIGN KEY (appointment_id) 
        REFERENCES appointment (appointment_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. USERS (Application Security & Role-Based Authentication)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    linked_patient_id INT DEFAULT NULL,
    linked_doctor_id INT DEFAULT NULL,
    linked_staff_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (role IN ('Patient', 'Doctor', 'Receptionist', 'Administrator')),
    CONSTRAINT fk_user_patient FOREIGN KEY (linked_patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_doctor FOREIGN KEY (linked_doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_staff FOREIGN KEY (linked_staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. AUDIT_LOG (Clinical Event Tracking & Security Auditing)
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INT DEFAULT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## CHAPTER 6: DML STATEMENTS

Data Manipulation Language (DML) statements inserting realistic clinical seed data:

```sql
-- Insert Departments
INSERT INTO department (department_id, department_name, location, contact_number, status) VALUES
(1, 'Cardiology', 'Block A, Floor 2', '+91 80 2345 0001', 'Active'),
(2, 'General Medicine', 'Block B, Ground Floor', '+91 80 2345 0002', 'Active'),
(3, 'Orthopedics', 'Block A, Floor 1', '+91 80 2345 0003', 'Active'),
(4, 'Pediatrics', 'Block C, Floor 1', '+91 80 2345 0004', 'Active'),
(5, 'Dermatology', 'Block B, Floor 2', '+91 80 2345 0005', 'Active'),
(6, 'Neurology', 'Block A, Floor 3', '+91 80 2345 0006', 'Active');

-- Insert Staff
INSERT INTO staff (staff_id, staff_name, username, email, phone, role, staff_status, date_joined) VALUES
(1, 'Dhruva G Hegde', 'dhruva_admin', 'dhruva.admin@queuecare.hospital', '+91 98450 11001', 'Administrator', 'Active', '2024-01-10'),
(2, 'Pramath G Hegde', 'pramath_admin', 'pramath.admin@queuecare.hospital', '+91 98450 11002', 'Administrator', 'Active', '2024-01-15'),
(3, 'Kavya Raman', 'kavya_front', 'kavya.r@queuecare.hospital', '+91 98450 11003', 'Receptionist', 'Active', '2024-02-01'),
(4, 'Suresh Babu', 'suresh_docasst', 'suresh.b@queuecare.hospital', '+91 98450 11004', 'Doctor Assistant', 'Active', '2024-02-10'),
(5, 'Deepa Rao', 'deepa_bill', 'deepa.rao@queuecare.hospital', '+91 98450 11005', 'Billing Staff', 'Active', '2024-03-01');

-- Insert Patients (Sample representing Senior Citizens, Adults, and Pediatric)
INSERT INTO patient (patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact, registration_date, status) VALUES
(1, 'Aarav', 'Sharma', '1988-06-15', 'Male', '+91 98765 43210', 'aarav.sharma@example.com', '124 Indiranagar, Bangalore', '+91 98765 43219', '2024-05-10', 'Active'),
(2, 'Priya', 'Reddy', '1995-11-22', 'Female', '+91 98765 43211', 'priya.reddy@example.com', '45 Koramangala, Bangalore', '+91 98765 43218', '2024-05-12', 'Active'),
(3, 'Rahul', 'Kumar', '1958-03-08', 'Male', '+91 98765 43212', 'rahul.kumar58@example.com', '78 Jayanagar 4th Block, Bangalore', '+91 98765 43217', '2024-05-15', 'Active'), -- 68 yrs
(4, 'Ananya', 'Rao', '2018-09-14', 'Female', '+91 98765 43213', 'parent.ananya@example.com', '210 Malleshwaram, Bangalore', '+91 98765 43216', '2024-06-01', 'Active'); -- 8 yrs

-- Insert Doctors with OPD Schedules
INSERT INTO doctor (doctor_id, department_id, doctor_name, specialization, qualification, phone, email, availability_status, consultation_fee, status, working_days, working_hours_start, working_hours_end, slot_duration_minutes, room_number) VALUES
(1, 1, 'Dr. Rajesh Sharma', 'Interventional Cardiology', 'MBBS, MD, DM (Cardio)', '+91 91234 56701', 'dr.rajesh@queuecare.hospital', 'Available', 800.00, 'Active', 'Mon,Tue,Wed,Thu,Fri', '09:00:00', '17:00:00', 15, 'Room 101'),
(2, 2, 'Dr. Sunita Kulkarni', 'Internal Medicine & Diabetology', 'MBBS, MD (General Medicine)', '+91 91234 56702', 'dr.sunita@queuecare.hospital', 'Available', 500.00, 'Active', 'Mon,Tue,Wed,Thu,Fri', '09:00:00', '16:30:00', 15, 'Room 102'),
(3, 3, 'Dr. Vikram Adiga', 'Joint Replacement & Arthroscopy', 'MBBS, MS (Ortho), MCh', '+91 91234 56703', 'dr.vikram@queuecare.hospital', 'Available', 750.00, 'Active', 'Mon,Wed,Fri', '10:00:00', '18:00:00', 20, 'Room 201'),
(4, 4, 'Dr. Ananya Iyer', 'Pediatric Pulmonology', 'MBBS, MD (Pediatrics), DNB', '+91 91234 56704', 'dr.ananya@queuecare.hospital', 'Available', 600.00, 'Active', 'Tue,Thu,Sat', '09:30:00', '15:30:00', 15, 'Room 301');

-- Insert User Authentication Accounts (Scrypt Passwords)
INSERT INTO users (user_id, email, password_hash, salt, name, role, linked_patient_id, linked_doctor_id, linked_staff_id) VALUES
(1, 'dhruva.admin@queuecare.hospital', '52bca7e94f3189a0...', 'c71f98bc...', 'Dhruva G Hegde', 'Administrator', NULL, NULL, 1),
(2, 'pramath.admin@queuecare.hospital', '52bca7e94f3189a0...', 'c71f98bc...', 'Pramath G Hegde', 'Administrator', NULL, NULL, 2),
(3, 'dr.rajesh@queuecare.hospital', '52bca7e94f3189a0...', 'c71f98bc...', 'Dr. Rajesh Sharma', 'Doctor', NULL, 1, NULL),
(4, 'kavya.r@queuecare.hospital', '52bca7e94f3189a0...', 'c71f98bc...', 'Kavya Raman', 'Receptionist', NULL, NULL, 3),
(5, 'aarav.sharma@example.com', '52bca7e94f3189a0...', 'c71f98bc...', 'Aarav Sharma', 'Patient', 1, NULL, NULL);
```

---

## CHAPTER 7: QUERIES

### 7.1 Simple Query with GROUP BY and Aggregate Functions
**Objective:** Calculate total waiting patients, minimum wait time, average wait time, and maximum wait time grouped by priority tier.
```sql
SELECT 
    priority_level,
    COUNT(*) AS total_patients_in_tier,
    MIN(estimated_wait_time) AS min_wait_minutes,
    AVG(estimated_wait_time) AS avg_wait_minutes,
    MAX(estimated_wait_time) AS max_wait_minutes
FROM queue_entry
WHERE queue_status IN ('Waiting', 'Called')
GROUP BY priority_level
ORDER BY 
    CASE priority_level
        WHEN 'Emergency' THEN 1
        WHEN 'Urgent' THEN 2
        WHEN 'Senior Citizen' THEN 3
        WHEN 'Child/Infant' THEN 4
        ELSE 5
    END ASC;
```

### 7.2 UPDATE Operation
**Objective:** Transition queue entry to 'In-Consultation' and reset wait time to 0 when physician calls patient into the consultation room.
```sql
UPDATE queue_entry
SET 
    queue_status = 'In-Consultation',
    estimated_wait_time = 0
WHERE queue_id = 3 AND queue_status = 'Waiting';

UPDATE appointment
SET appointment_status = 'In-Progress'
WHERE appointment_id = (SELECT appointment_id FROM queue_entry WHERE queue_id = 3);
```

### 7.3 DELETE Operation
**Objective:** Remove an unfulfilled scheduled appointment that has no active queue or visit references, preserving referential integrity.
```sql
DELETE FROM appointment
WHERE appointment_id = 8 
  AND appointment_status = 'Scheduled'
  AND appointment_id NOT IN (SELECT appointment_id FROM queue_entry);
```

### 7.4 Correlated Subquery
**Objective:** Retrieve all doctors whose consultation fee exceeds the average consultation fee of doctors within their *same* department.
```sql
SELECT 
    outer_doc.doctor_id,
    outer_doc.doctor_name,
    outer_doc.specialization,
    outer_doc.consultation_fee,
    d.department_name
FROM doctor outer_doc
JOIN department d ON outer_doc.department_id = d.department_id
WHERE outer_doc.consultation_fee > (
    SELECT AVG(inner_doc.consultation_fee)
    FROM doctor inner_doc
    WHERE inner_doc.department_id = outer_doc.department_id
);
```

### 7.5 Nested Subquery
**Objective:** Retrieve all patients who have scheduled appointments with Cardiology doctors, excluding any patients who have cancelled appointments.
```sql
SELECT 
    p.patient_id,
    p.first_name,
    p.last_name,
    p.phone
FROM patient p
WHERE p.patient_id IN (
    SELECT a.patient_id
    FROM appointment a
    WHERE a.doctor_id IN (
        SELECT doc.doctor_id
        FROM doctor doc
        WHERE doc.department_id = (
            SELECT dept.department_id
            FROM department dept
            WHERE dept.department_name = 'Cardiology'
        )
    )
)
AND p.patient_id NOT IN (
    SELECT a2.patient_id
    FROM appointment a2
    WHERE a2.appointment_status = 'Cancelled'
);
```

---

## CHAPTER 8: STORED PROCEDURES, FUNCTIONS AND TRIGGERS

### 8.1 Stored Procedures and Functions

#### 8.1.1 Stored Procedure: `sp_BookAppointment`
**Objective:** Atomically validate doctor availability and schedule an outpatient appointment, strictly enforcing collision prevention at the database engine layer.
```sql
DELIMITER $$
CREATE PROCEDURE sp_BookAppointment(
    IN p_patient_id INT,
    IN p_doctor_id INT,
    IN p_appointment_date DATE,
    IN p_appointment_time TIME,
    IN p_reason VARCHAR(255),
    IN p_appointment_type VARCHAR(30),
    OUT p_appointment_id INT,
    OUT p_status_message VARCHAR(255)
)
BEGIN
    DECLARE v_dept_id INT;
    DECLARE v_conflict_count INT;

    -- Verify doctor exists and is currently active
    SELECT department_id INTO v_dept_id
    FROM doctor
    WHERE doctor_id = p_doctor_id AND status = 'Active';

    IF v_dept_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected doctor does not exist or is inactive.';
    END IF;

    -- Concurrency check: Detect double booking collision
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointment
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_appointment_date
      AND appointment_time = p_appointment_time
      AND appointment_status NOT IN ('Cancelled');

    IF v_conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Doctor is already booked for this date and time slot.';
    END IF;

    -- Insert appointment atomically
    INSERT INTO appointment (
        patient_id, doctor_id, department_id, appointment_date,
        appointment_time, booking_date, reason_for_visit, appointment_type, appointment_status
    ) VALUES (
        p_patient_id, p_doctor_id, v_dept_id, p_appointment_date,
        p_appointment_time, CURDATE(), p_reason, p_appointment_type, 'Scheduled'
    );

    SET p_appointment_id = LAST_INSERT_ID();
    SET p_status_message = 'Appointment booked successfully.';
END$$
DELIMITER ;
```

#### 8.1.2 Stored Procedure: `sp_CheckInPatient`
**Objective:** Check in an eligible patient, compute dynamic wait time, assign next sequential doctor token, and transition queue status with strict idempotency to prevent duplicate entry collisions.
```sql
DELIMITER $$
CREATE PROCEDURE sp_CheckInPatient(
    IN p_appointment_id INT,
    IN p_priority_level VARCHAR(20),
    IN p_priority_reason VARCHAR(255),
    OUT p_assigned_token INT,
    OUT p_est_wait_time INT
)
BEGIN
    DECLARE v_doctor_id INT;
    DECLARE v_patient_id INT;
    DECLARE v_max_token INT;
    DECLARE v_waiting_count INT;
    DECLARE v_existing_token INT DEFAULT NULL;
    DECLARE v_existing_wait INT DEFAULT NULL;
    DECLARE v_existing_status VARCHAR(30) DEFAULT NULL;

    SELECT doctor_id, patient_id INTO v_doctor_id, v_patient_id
    FROM appointment WHERE appointment_id = p_appointment_id;

    IF v_doctor_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found.';
    END IF;

    -- Idempotency Guard: Check if appointment already has an active queue entry
    SELECT token_number, estimated_wait_time, queue_status 
    INTO v_existing_token, v_existing_wait, v_existing_status
    FROM queue_entry
    WHERE appointment_id = p_appointment_id;

    IF v_existing_token IS NOT NULL THEN
        -- Patient already checked in: return existing token and wait time safely
        SET p_assigned_token = v_existing_token;
        SET p_est_wait_time = v_existing_wait;

        IF p_priority_level = 'Emergency' AND v_existing_status = 'Waiting' THEN
            UPDATE queue_entry
            SET priority_level = 'Emergency',
                priority_reason = COALESCE(p_priority_reason, priority_reason),
                estimated_wait_time = 0
            WHERE appointment_id = p_appointment_id;
            SET p_est_wait_time = 0;
        END IF;

        UPDATE appointment SET appointment_status = 'Checked-In' WHERE appointment_id = p_appointment_id;
    ELSE
        SELECT COALESCE(MAX(token_number), v_doctor_id * 100) INTO v_max_token
        FROM queue_entry WHERE doctor_id = v_doctor_id AND queue_date = CURDATE();

        SET p_assigned_token = v_max_token + 1;

        SELECT COUNT(*) INTO v_waiting_count
        FROM queue_entry WHERE doctor_id = v_doctor_id AND queue_date = CURDATE() AND queue_status = 'Waiting';

        SET p_est_wait_time = IF(p_priority_level = 'Emergency', 0, v_waiting_count * 15);

        INSERT INTO queue_entry (
            appointment_id, doctor_id, token_number, queue_date, check_in_time,
            estimated_wait_time, priority_level, priority_reason, queue_status
        ) VALUES (
            p_appointment_id, v_doctor_id, p_assigned_token, CURDATE(), CURTIME(),
            p_est_wait_time, p_priority_level, p_priority_reason, 'Waiting'
        );

        UPDATE appointment SET appointment_status = 'Checked-In' WHERE appointment_id = p_appointment_id;

        INSERT INTO notification (patient_id, appointment_id, notification_type, message)
        VALUES (v_patient_id, p_appointment_id, 'Queue Update', CONCAT('Token #', p_assigned_token, ' generated.'));
    END IF;
END$$
DELIMITER ;
```

#### 8.1.3 Stored Function: `fn_CalculateDoctorWaitTime`
**Objective:** Calculate estimated waiting duration in minutes for a specific doctor based on waiting patients.
```sql
DELIMITER $$
CREATE FUNCTION fn_CalculateDoctorWaitTime(p_doctor_id INT, p_date DATE) 
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM queue_entry 
    WHERE doctor_id = p_doctor_id AND queue_date = p_date AND queue_status IN ('Waiting', 'Called');
    RETURN v_count * 15;
END$$
DELIMITER ;
```

### 8.2 Triggers

#### 8.2.1 Trigger: `trg_prevent_double_booking`
**Objective:** Prevent conflicting doctor bookings at the database engine level before any appointment row is inserted.
```sql
DELIMITER $$
CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT ON appointment
FOR EACH ROW
BEGIN
    DECLARE v_conflicts INT;
    SELECT COUNT(*) INTO v_conflicts
    FROM appointment
    WHERE doctor_id = NEW.doctor_id
      AND appointment_date = NEW.appointment_date
      AND appointment_time = NEW.appointment_time
      AND appointment_status NOT IN ('Cancelled');

    IF v_conflicts > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Double-booking error: Doctor already has an active appointment in this time slot.';
    END IF;
END$$
DELIMITER ;
```

#### 8.2.2 Trigger: `trg_after_queue_insert_notify`
**Objective:** Automatically generate a patient notification alert when a queue entry is inserted.
```sql
DELIMITER $$
CREATE TRIGGER trg_after_queue_insert_notify
AFTER INSERT ON queue_entry
FOR EACH ROW
BEGIN
    DECLARE v_patient_id INT;
    SELECT patient_id INTO v_patient_id FROM appointment WHERE appointment_id = NEW.appointment_id;

    IF v_patient_id IS NOT NULL THEN
        INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
        VALUES (v_patient_id, NEW.appointment_id, 'Queue Token Generated',
                CONCAT('Token #', NEW.token_number, ' created. Priority: ', NEW.priority_level), NOW(), 'Sent');
    END IF;
END$$
DELIMITER ;
```

#### 8.2.3 Trigger: `trg_after_visit_completed`
**Objective:** Synchronously cascade completion status to queue entries and appointments upon visit finalization.
```sql
DELIMITER $$
CREATE TRIGGER trg_after_visit_completed
AFTER UPDATE ON visit
FOR EACH ROW
BEGIN
    IF NEW.visit_status = 'Completed' AND OLD.visit_status <> 'Completed' THEN
        UPDATE queue_entry SET queue_status = 'Completed', estimated_wait_time = 0
        WHERE appointment_id = NEW.appointment_id;

        UPDATE appointment SET appointment_status = 'Completed'
        WHERE appointment_id = NEW.appointment_id;
    END IF;
END$$
DELIMITER ;
```

---

## CHAPTER 9: FRONT END DEVELOPMENT

The QueueCare frontend is designed using modern healthcare design principles, emphasizing clarity, rapid triage response, accessible typography, and calm visual contrast.

### 9.1 Component Hierarchy
- **`app/page.tsx`**: Master coordinator managing application state, active tab navigation, real-time toast alerts, and relational data synchronizations.
- **`components/Header.tsx`**: Sticky top navigation housing live queue counter, live sync badge, staff role switcher (`Dhruva G Hegde (Administrator)`, `Pramath G Hegde (Administrator)`, `Receptionist`, `Doctor`, and dynamic patient selection), and quick-action modals.
- **`components/Sidebar.tsx`**: Desktop navigation with badge counts for waiting patients and unread alerts.
- **`components/DashboardTab.tsx`**: Real-time KPI summaries (Total Patients, Scheduled Today, Waiting, In-Consultation, Completed, Average Wait), emergency banners, and department queue loads.
- **`components/QueueTab.tsx`**: Interactive queue monitor supporting search, department filtering, token calling, triage override, and consultation dispatching.
- **`components/AppointmentsTab.tsx`**: Outpatient scheduling with double-booking prevention, date filtering, rescheduling, and cancellation controls.
- **`components/PatientsTab.tsx`**: Patient demographic directory, age auto-computation, pagination, contact editing, and medical encounter history modal.
- **`components/DoctorsTab.tsx`**: Medical staff directory with OPD schedule editor, consultation fee settings, and duty status switcher (*Available*, *On Break*, *Off Duty*).
- **`components/VisitsTab.tsx`**: Electronic medical records (EMR) displaying diagnoses, Rx prescriptions, and fee summaries.
- **`components/ReportsTab.tsx`**: Live execution and tabular display of Chapter 7 DBMS analytical queries.
- **`components/DoctorRecommendationsView.tsx`**: Level 3 graph doctor discovery engine displaying semantic graph traversal pathways and suitability scores.
- **`components/SystemHealthTab.tsx`**: Live database engine status (MySQL 8.0 / SQLite WAL), Redis cache-aside hit ratio, and Neo4j graph cluster metrics.
- **`components/Modals.tsx`**: Validated modals for appointment booking, queue intake check-in, patient registration, doctor schedule editing, clinical visit notes, and rescheduling.

### 9.2 Real-Time SSE Architecture & Live Synchronization
QueueCare implements a full Server-Sent Events (SSE) event hub at `/api/realtime` paired with the `useRealtimeSync` custom client hook. Whenever a mutation occurs (patient checked in, queue called, appointment cancelled, or doctor schedule updated), an event is broadcast to all active browser sessions, triggering an immediate non-destructive cache revalidation without manual user page refreshes.

### 9.3 Dual Administrator Role Management
To satisfy project team ownership requirements, both team members are provisioned as full system administrators:
- **Dhruva G Hegde**: `dhruva.admin@queuecare.hospital` (Staff ID 1, Administrator)
- **Pramath G Hegde**: `pramath.admin@queuecare.hospital` (Staff ID 2, Administrator)
Both administrators possess independent authentication records, scrypt password hashes, and identical system-wide privileges, verified on the server for all protected mutation endpoints.

### 9.4 Generic Patient Portal
The patient view is fully generalized: any registered patient in the database can sign in dynamically via session linking. Patients view their personal digital appointment tickets, real-time wait estimation, doctor OPD room numbers, and can self-service cancel appointments before check-in.

### 9.5 Screenshot Capture Guide for Mini-Project Report Submission
To capture authentic execution screenshots for submission, run the following commands in Terminal:

```bash
# 1. Verify MySQL 8.0 schema and 8 normalized tables
mysql -u root -p queuecare -e "SHOW TABLES; DESCRIBE doctor; DESCRIBE appointment;"

# 2. Execute Syllabus SQL Queries (Chapter 7)
mysql -u root -p queuecare -e "
SELECT priority_level, COUNT(*) AS count, AVG(estimated_wait_time) AS avg_wait 
FROM queue_entry GROUP BY priority_level;
"

# 3. Test Stored Procedure sp_CheckInPatient
mysql -u root -p queuecare -e "CALL sp_CheckInPatient(3, 'Emergency', 'Chest Pain', @tok, @wait); SELECT @tok, @wait;"

# 4. Run Complete Automated Test Suite (33/33 Passing)
cd ~/QueueCare/queuecare
npm test

# 5. Access Live Application UI
open http://localhost:3000
```

---

## REFERENCES / BIBLIOGRAPHY

[1] R. Elmasri and S. B. Navathe, *Fundamentals of Database Systems*, 7th ed. Pearson, 2016.  
[2] A. Silberschatz, H. F. Korth, and S. Sudarshan, *Database System Concepts*, 7th ed. McGraw-Hill, 2019.  
[3] Next.js Documentation: *App Router Architecture & Server Actions*, Vercel, 2026.  
[4] MySQL 8.0 Reference Manual: *Stored Programs and Views*, Oracle Corporation, 2026.  
[5] World Health Organization (WHO), *Emergency Triage Assessment and Treatment (ETAT) Guidelines*, 2020.  

---

## APPENDIX A: DEFINITIONS, ACRONYMS AND ABBREVIATIONS

- **DBMS:** Database Management System
- **DDL:** Data Definition Language
- **DML:** Data Manipulation Language
- **ER:** Entity-Relationship
- **FCFS:** First-Come-First-Served
- **FK:** Foreign Key
- **INR:** Indian Rupee
- **OPD:** Outpatient Department
- **PK:** Primary Key
- **SRN:** Student Registration Number
- **Triage:** The clinical assignment of degrees of urgency to wounds or illnesses to decide the order of treatment of patients.
- **WAL:** Write-Ahead Logging (in relational database management systems)

