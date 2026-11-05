-- =============================================================================
-- QueueCare: Realistic Sample Development Seed Data (DML)
-- Course: Database Management Systems (UE24CS352B / UE23CS351A) | Semester V
-- Institution: PES University, Bangalore
-- Authors: Pramath Ganesh Hegde (PES2UG24CS648) & Dhruva Ganesh Hegde (PES2UG24CS671)
-- =============================================================================

USE queuecare;

-- 1. Insert Departments
INSERT INTO department (department_id, department_name, location, contact_number, status) VALUES
(1, 'Cardiology', 'Block A, Floor 2', '+91 80 2345 0001', 'Active'),
(2, 'General Medicine', 'Block B, Ground Floor', '+91 80 2345 0002', 'Active'),
(3, 'Orthopedics', 'Block A, Floor 1', '+91 80 2345 0003', 'Active'),
(4, 'Pediatrics', 'Block C, Floor 1', '+91 80 2345 0004', 'Active'),
(5, 'Dermatology', 'Block B, Floor 2', '+91 80 2345 0005', 'Active'),
(6, 'Neurology', 'Block A, Floor 3', '+91 80 2345 0006', 'Active');

-- 2. Insert Staff (Both Project Leads seeded as Full Administrators)
INSERT INTO staff (staff_id, staff_name, username, email, phone, role, staff_status, date_joined) VALUES
(1, 'Dhruva G Hegde', 'dhruva_admin', 'dhruva.admin@queuecare.hospital', '+91 98450 11001', 'Administrator', 'Active', '2024-01-10'),
(2, 'Pramath G Hegde', 'pramath_admin', 'pramath.admin@queuecare.hospital', '+91 98450 11002', 'Administrator', 'Active', '2024-01-15'),
(3, 'Kavya Raman', 'kavya_front', 'kavya.r@queuecare.hospital', '+91 98450 11003', 'Receptionist', 'Active', '2024-02-01'),
(4, 'Suresh Babu', 'suresh_docasst', 'suresh.b@queuecare.hospital', '+91 98450 11004', 'Doctor Assistant', 'Active', '2024-02-10'),
(5, 'Deepa Rao', 'deepa_bill', 'deepa.rao@queuecare.hospital', '+91 98450 11005', 'Billing Staff', 'Active', '2024-03-01');

-- 3. Insert Patients (Demographics include Senior Citizens, Adults, and Pediatric)
INSERT INTO patient (patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact, registration_date, status) VALUES
(1, 'Aarav', 'Sharma', '1988-06-15', 'Male', '+91 98765 43210', 'aarav.sharma@example.com', '124 Indiranagar, Bangalore', '+91 98765 43219', '2024-05-10', 'Active'),
(2, 'Priya', 'Reddy', '1995-11-22', 'Female', '+91 98765 43211', 'priya.reddy@example.com', '45 Koramangala, Bangalore', '+91 98765 43218', '2024-05-12', 'Active'),
(3, 'Rahul', 'Kumar', '1958-03-08', 'Male', '+91 98765 43212', 'rahul.kumar58@example.com', '78 Jayanagar 4th Block, Bangalore', '+91 98765 43217', '2024-05-15', 'Active'), -- Senior Citizen (68 yrs)
(4, 'Ananya', 'Rao', '2018-09-14', 'Female', '+91 98765 43213', 'parent.ananya@example.com', '210 Malleshwaram, Bangalore', '+91 98765 43216', '2024-06-01', 'Active'), -- Pediatric (8 yrs)
(5, 'Vikram', 'Singh', '1975-01-30', 'Male', '+91 98765 43214', 'vikram.singh@example.com', '88 Whitefield, Bangalore', '+91 98765 43215', '2024-06-10', 'Active'),
(6, 'Meenakshi', 'Sundaram', '1952-12-04', 'Female', '+91 98765 43220', 'meenakshi.s@example.com', '15 Basavanagudi, Bangalore', '+91 98765 43221', '2024-06-15', 'Active'), -- Senior Citizen (74 yrs)
(7, 'Tanvi', 'Deshmukh', '2001-07-19', 'Female', '+91 98765 43222', 'tanvi.d@example.com', '99 HSR Layout Sector 2, Bangalore', '+91 98765 43223', '2024-07-01', 'Active'),
(8, 'Karthik', 'Venkatesh', '1984-04-25', 'Male', '+91 98765 43224', 'karthik.v@example.com', '34 Bannerghatta Road, Bangalore', '+91 98765 43225', '2024-07-10', 'Active');

-- 4. Insert Doctors with Full OPD Rosters and Schedule Details
INSERT INTO doctor (doctor_id, department_id, doctor_name, specialization, qualification, phone, email, availability_status, consultation_fee, status, working_days, working_hours_start, working_hours_end, slot_duration_minutes, room_number) VALUES
(1, 1, 'Dr. Rajesh Sharma', 'Interventional Cardiology', 'MBBS, MD, DM (Cardio)', '+91 91234 56701', 'dr.rajesh@queuecare.hospital', 'Available', 800.00, 'Active', 'Mon,Tue,Wed,Thu,Fri', '09:00:00', '17:00:00', 15, 'Room 101'),
(2, 2, 'Dr. Sunita Kulkarni', 'Internal Medicine & Diabetology', 'MBBS, MD (General Medicine)', '+91 91234 56702', 'dr.sunita@queuecare.hospital', 'Available', 500.00, 'Active', 'Mon,Tue,Wed,Thu,Fri', '09:00:00', '17:00:00', 15, 'Room 201'),
(3, 3, 'Dr. Vikram Adiga', 'Joint Replacement & Arthroscopy', 'MBBS, MS (Ortho), MCh', '+91 91234 56703', 'dr.vikram@queuecare.hospital', 'Available', 750.00, 'Active', 'Mon,Wed,Fri', '10:00:00', '16:00:00', 20, 'Room 103'),
(4, 4, 'Dr. Ananya Iyer', 'Pediatric Pulmonology', 'MBBS, MD (Pediatrics), DNB', '+91 91234 56704', 'dr.ananya@queuecare.hospital', 'Available', 600.00, 'Active', 'Mon,Tue,Thu,Sat', '09:00:00', '15:00:00', 15, 'Room 302'),
(5, 5, 'Dr. Rohan Nair', 'Clinical Dermatology & Aesthetics', 'MBBS, MD (DVL)', '+91 91234 56705', 'dr.rohan@queuecare.hospital', 'Available', 550.00, 'Active', 'Tue,Thu,Sat', '11:00:00', '18:00:00', 20, 'Room 205'),
(6, 6, 'Dr. Meera Patil', 'Cognitive Neurology & Epilepsy', 'MBBS, DM (Neurology)', '+91 91234 56706', 'dr.meera@queuecare.hospital', 'On Break', 900.00, 'Active', 'Mon,Wed,Fri', '10:00:00', '17:00:00', 30, 'Room 308');

-- 5. Insert Appointments (Using CURDATE() for realistic current date simulation)
INSERT INTO appointment (appointment_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, booking_date, reason_for_visit, appointment_type, appointment_status, remarks) VALUES
(1, 1, 1, 1, CURDATE(), '09:00:00', CURDATE(), 'Mild chest tightness on exertion', 'OPD', 'Completed', 'ECG review requested'),
(2, 2, 2, 2, CURDATE(), '09:30:00', CURDATE(), 'Routine health checkup & fasting blood glucose', 'OPD', 'In-Progress', 'Regular checkup'),
(3, 3, 3, 3, CURDATE(), '09:45:00', CURDATE(), 'Severe acute right knee swelling after fall', 'Emergency', 'Checked-In', 'Wheelchair assisted'),
(4, 4, 4, 4, CURDATE(), '10:00:00', CURDATE(), 'Recurrent nocturnal cough and wheezing', 'OPD', 'Checked-In', 'Accompanied by mother'),
(5, 5, 1, 1, CURDATE(), '10:15:00', CURDATE(), 'High blood pressure medication adjustment', 'Follow-up', 'Checked-In', 'Bring previous prescriptions'),
(6, 6, 2, 2, CURDATE(), '10:30:00', CURDATE(), 'Chronic joint pain and weakness', 'OPD', 'Checked-In', 'Senior citizen priority care'),
(7, 7, 5, 5, CURDATE(), '11:00:00', CURDATE(), 'Allergic rash with pruritus on forearms', 'OPD', 'Scheduled', 'First visit'),
(8, 8, 3, 3, CURDATE(), '11:30:00', CURDATE(), 'Follow-up post ligament reconstruction', 'Follow-up', 'Scheduled', 'X-ray reports ready');

-- 6. Insert Queue Entries for checked-in appointments
INSERT INTO queue_entry (queue_id, appointment_id, doctor_id, token_number, queue_date, check_in_time, estimated_wait_time, priority_level, priority_reason, queue_status) VALUES
(1, 1, 1, 101, CURDATE(), '08:50:00', 0, 'Normal', 'Scheduled OPD arrival', 'Completed'),
(2, 2, 2, 201, CURDATE(), '09:15:00', 0, 'Normal', 'Scheduled morning slot', 'In-Consultation'),
(3, 3, 3, 301, CURDATE(), '09:25:00', 5, 'Emergency', 'Acute traumatic knee effusion with severe pain', 'Waiting'),
(4, 4, 4, 401, CURDATE(), '09:30:00', 10, 'Child/Infant', 'Pediatric patient under 10 with respiratory wheeze', 'Waiting'),
(5, 5, 1, 102, CURDATE(), '09:40:00', 15, 'Urgent', 'Severe persistent hypertension (>170/100 mmHg)', 'Waiting'),
(6, 6, 2, 202, CURDATE(), '09:45:00', 25, 'Senior Citizen', 'Patient age 74 years with chronic mobility limitation', 'Waiting');

-- 7. Insert Visits
INSERT INTO visit (visit_id, appointment_id, doctor_id, staff_id, visit_date, start_time, end_time, diagnosis, prescription, doctor_notes, visit_status, billed_amount) VALUES
(1, 1, 1, 4, CURDATE(), '09:05:00', '09:25:00', 'Stable Angina Pectoris; Stage 1 HTN', 'Tab. Metoprolol 25mg 1-0-0, Tab. Aspirin 75mg 0-1-0', 'Advised 2D Echocardiogram and lipid profile re-check in 4 weeks. Low sodium diet.', 'Completed', 800.00),
(2, 2, 2, 4, CURDATE(), '09:35:00', NULL, 'Type 2 Diabetes Mellitus - evaluation', 'Tab. Metformin 500mg post meals', 'Consultation currently in progress. Blood sugar monitoring advised.', 'In Progress', 500.00);

-- 8. Insert Patient Notifications
INSERT INTO notification (notification_id, patient_id, appointment_id, notification_type, message, sent_time, notification_status) VALUES
(1, 1, 1, 'Appointment Confirmation', 'Your appointment with Dr. Rajesh Sharma is confirmed for today at 09:00 AM.', NOW() - INTERVAL 2 HOUR, 'Read'),
(2, 1, 1, 'Visit Summary', 'Your consultation with Dr. Rajesh Sharma has been completed. Prescription is available at the counter.', NOW() - INTERVAL 1 HOUR, 'Read'),
(3, 2, 2, 'Queue Update', 'Token #201: You have been called for consultation with Dr. Sunita Kulkarni in Room B-102.', NOW() - INTERVAL 30 MINUTE, 'Read'),
(4, 3, 3, 'Queue Update', 'Token #301: You are registered as EMERGENCY Priority. Doctor Vikram Adiga has been notified.', NOW() - INTERVAL 20 MINUTE, 'Sent'),
(5, 4, 4, 'Appointment Reminder', 'Token #401: Pediatric consultation with Dr. Ananya Iyer is estimated in 10 minutes.', NOW() - INTERVAL 15 MINUTE, 'Sent'),
(6, 6, 6, 'Queue Update', 'Token #202: Senior Citizen Priority assigned. Estimated wait time is approx 25 minutes.', NOW() - INTERVAL 10 MINUTE, 'Sent');

-- 9. Insert RBAC Authentication Users (Hashed with scrypt, password: 'admin123' / role defaults)
INSERT INTO users (user_id, email, password_hash, salt, name, role, linked_staff_id, linked_patient_id, linked_doctor_id) VALUES
(1, 'dhruva.admin@queuecare.hospital', '14841a5da9d748ee4c2bec4eeefb7315b7c4151d0e763a3bdcd2e2be047ab62ba9665455f032957548c039539f703f8d92bec5fe4f8a2bd106a7c8aa1f8d7a23', '1327a378b9c7dfc4944e19a09f8ab83a', 'Dhruva G Hegde', 'Administrator', 1, NULL, NULL),
(2, 'pramath.admin@queuecare.hospital', '14841a5da9d748ee4c2bec4eeefb7315b7c4151d0e763a3bdcd2e2be047ab62ba9665455f032957548c039539f703f8d92bec5fe4f8a2bd106a7c8aa1f8d7a23', '1327a378b9c7dfc4944e19a09f8ab83a', 'Pramath G Hegde', 'Administrator', 2, NULL, NULL),
(3, 'dr.rajesh@queuecare.hospital', '265a90496ac957d5a64b711422f1e5895c18d1009c5a2473535a49b7c8cc9d3250962a54c6b941ae2c74b19bab4a4ae0ded0ae47f3cbd9ce50562e63b9032b04', '1327a378b9c7dfc4944e19a09f8ab83a', 'Dr. Rajesh Sharma', 'Doctor', NULL, NULL, 1),
(4, 'kavya.r@queuecare.hospital', '14841a5da9d748ee4c2bec4eeefb7315b7c4151d0e763a3bdcd2e2be047ab62ba9665455f032957548c039539f703f8d92bec5fe4f8a2bd106a7c8aa1f8d7a23', '1327a378b9c7dfc4944e19a09f8ab83a', 'Kavya Raman', 'Receptionist', 3, NULL, NULL),
(5, 'patient@queuecare.hospital', '14841a5da9d748ee4c2bec4eeefb7315b7c4151d0e763a3bdcd2e2be047ab62ba9665455f032957548c039539f703f8d92bec5fe4f8a2bd106a7c8aa1f8d7a23', '1327a378b9c7dfc4944e19a09f8ab83a', 'Aarav Sharma', 'Patient', NULL, 1, NULL),
(6, 'dr.sunita@queuecare.hospital', '265a90496ac957d5a64b711422f1e5895c18d1009c5a2473535a49b7c8cc9d3250962a54c6b941ae2c74b19bab4a4ae0ded0ae47f3cbd9ce50562e63b9032b04', '1327a378b9c7dfc4944e19a09f8ab83a', 'Dr. Sunita Kulkarni', 'Doctor', NULL, NULL, 2),
(7, 'dr.vikram@queuecare.hospital', '265a90496ac957d5a64b711422f1e5895c18d1009c5a2473535a49b7c8cc9d3250962a54c6b941ae2c74b19bab4a4ae0ded0ae47f3cbd9ce50562e63b9032b04', '1327a378b9c7dfc4944e19a09f8ab83a', 'Dr. Vikram Adiga', 'Doctor', NULL, NULL, 3),
(8, 'dr.ananya@queuecare.hospital', '265a90496ac957d5a64b711422f1e5895c18d1009c5a2473535a49b7c8cc9d3250962a54c6b941ae2c74b19bab4a4ae0ded0ae47f3cbd9ce50562e63b9032b04', '1327a378b9c7dfc4944e19a09f8ab83a', 'Dr. Ananya Iyer', 'Doctor', NULL, NULL, 4),
(9, 'dr.rohan@queuecare.hospital', '265a90496ac957d5a64b711422f1e5895c18d1009c5a2473535a49b7c8cc9d3250962a54c6b941ae2c74b19bab4a4ae0ded0ae47f3cbd9ce50562e63b9032b04', '1327a378b9c7dfc4944e19a09f8ab83a', 'Dr. Rohan Nair', 'Doctor', NULL, NULL, 5),
(10, 'dr.meera@queuecare.hospital', '265a90496ac957d5a64b711422f1e5895c18d1009c5a2473535a49b7c8cc9d3250962a54c6b941ae2c74b19bab4a4ae0ded0ae47f3cbd9ce50562e63b9032b04', '1327a378b9c7dfc4944e19a09f8ab83a', 'Dr. Meera Patil', 'Doctor', NULL, NULL, 6);

-- 10. Insert Initial Clinical Audit Log Entries
INSERT INTO audit_log (log_id, action, performed_by, entity, entity_id, details) VALUES
(1, 'DATABASE_INITIALIZATION', 'System', 'Schema', NULL, 'QueueCare relational schema initialized with 8 normalized tables and RBAC.'),
(2, 'STAFF_PROVISIONING', 'System', 'Staff', 1, 'Administrator role assigned to Dhruva G Hegde.'),
(3, 'STAFF_PROVISIONING', 'System', 'Staff', 2, 'Administrator role assigned to Pramath G Hegde.'),
(4, 'TRIAGE_ADMISSION', 'Kavya Raman', 'QueueEntry', 3, 'Emergency triage tier allocated to Patient #3 (Severe trauma).');
