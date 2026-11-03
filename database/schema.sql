-- =============================================================================
-- QueueCare: Hospital/Clinic Queue & Appointment Prioritization System
-- Course: Database Management Systems (UE24CS352B / UE23CS351A) | Semester V
-- Institution: PES University, Bangalore
-- Authors: Pramath Ganesh Hegde (PES2UG24CS648) & Dhruva Ganesh Hegde (PES2UG24CS671)
-- Database Creation & Authoritative MySQL 8.0 DDL Statements
-- =============================================================================

CREATE DATABASE IF NOT EXISTS queuecare;
USE queuecare;

-- Disable foreign key checks during teardown to avoid dependency deadlocks
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS visit;
DROP TABLE IF EXISTS queue_entry;
DROP TABLE IF EXISTS appointment;
DROP TABLE IF EXISTS doctor;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS department;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- CORE RELATIONAL TABLES (8 MANDATORY SYLLABUS ENTITIES)
-- =============================================================================

-- 1. DEPARTMENT TABLE
CREATE TABLE department (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(100) DEFAULT NULL,
    contact_number VARCHAR(15) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. STAFF TABLE
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

-- 3. PATIENT TABLE
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

-- 4. DOCTOR TABLE
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
    room_number VARCHAR(50) DEFAULT 'Room 101',
    CONSTRAINT fk_doctor_department FOREIGN KEY (department_id) 
        REFERENCES department (department_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_doctor_availability CHECK (availability_status IN ('Available', 'In-Consultation', 'On Break', 'Off Duty')),
    CONSTRAINT chk_doctor_status CHECK (status IN ('Active', 'Inactive'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. APPOINTMENT TABLE
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
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_app_status CHECK (appointment_status IN ('Scheduled', 'Checked-In', 'In-Progress', 'Completed', 'Cancelled', 'Rescheduled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. QUEUE_ENTRY TABLE
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
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_queue_priority CHECK (priority_level IN ('Emergency', 'Urgent', 'Senior Citizen', 'Child/Infant', 'Normal')),
    CONSTRAINT chk_queue_status CHECK (queue_status IN ('Waiting', 'Called', 'In-Consultation', 'Completed', 'Skipped', 'No-Show', 'Cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. VISIT TABLE
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
    visit_status VARCHAR(20) DEFAULT 'In Progress',
    doctor_notes VARCHAR(500) DEFAULT NULL,
    billed_amount DECIMAL(10,2) DEFAULT 0.00,
    CONSTRAINT fk_visit_appointment FOREIGN KEY (appointment_id) 
        REFERENCES appointment (appointment_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_visit_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctor (doctor_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_visit_staff FOREIGN KEY (staff_id) 
        REFERENCES staff (staff_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_visit_status CHECK (visit_status IN ('In Progress', 'Completed', 'Cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. NOTIFICATION TABLE
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
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_notif_status CHECK (notification_status IN ('Sent', 'Delivered', 'Read', 'Failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- JUSTIFIED SUPPORTING TABLES (AUTHENTICATION & AUDIT TRAIL)
-- =============================================================================

-- 9. USERS & RBAC AUTHENTICATION TABLE
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    linked_patient_id INT DEFAULT NULL,
    linked_doctor_id INT DEFAULT NULL,
    linked_staff_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (role IN ('Patient', 'Doctor', 'Receptionist', 'Administrator')),
    CONSTRAINT fk_user_patient FOREIGN KEY (linked_patient_id) 
        REFERENCES patient (patient_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_doctor FOREIGN KEY (linked_doctor_id) 
        REFERENCES doctor (doctor_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_staff FOREIGN KEY (linked_staff_id) 
        REFERENCES staff (staff_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. CLINICAL AUDIT LOG TABLE
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INT DEFAULT NULL,
    details TEXT DEFAULT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- INDEXES FOR HIGH-FREQUENCY OPERATIONAL QUERIES
-- =============================================================================
CREATE INDEX idx_queue_date_status ON queue_entry(queue_date, queue_status);
CREATE INDEX idx_app_date ON appointment(appointment_date, appointment_status);
CREATE INDEX idx_doctor_dept ON doctor(department_id);
CREATE INDEX idx_patient_phone ON patient(phone);
CREATE INDEX idx_user_email ON users(email);
