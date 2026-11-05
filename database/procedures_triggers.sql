-- =============================================================================
-- QueueCare: Stored Procedures, Functions & Triggers Suite
-- Course: Database Management Systems (UE24CS352B / UE23CS351A) | Semester V
-- Institution: PES University, Bangalore
-- Authors: Pramath Ganesh Hegde (PES2UG24CS648) & Dhruva Ganesh Hegde (PES2UG24CS671)
-- Matches Chapter 8 requirements: Stored Procedures / Functions & Triggers
-- =============================================================================

USE queuecare;

DELIMITER $$

-- =============================================================================
-- 8.1 STORED PROCEDURES & FUNCTIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 8.1.1 STORED PROCEDURE: sp_BookAppointment
-- Purpose: Atomically validate doctor availability and schedule an appointment
-- preventing double-booking race conditions at the database level.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_BookAppointment$$
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

    -- Verify doctor exists and get department
    SELECT department_id INTO v_dept_id
    FROM doctor
    WHERE doctor_id = p_doctor_id AND status = 'Active';

    IF v_dept_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected doctor does not exist or is inactive.';
    END IF;

    -- Concurrency check: Detect double booking
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointment
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_appointment_date
      AND appointment_time = p_appointment_time
      AND appointment_status NOT IN ('Cancelled');

    IF v_conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Doctor is already booked for this date and time slot.';
    END IF;

    -- Insert appointment
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


-- -----------------------------------------------------------------------------
-- 8.1.2 STORED PROCEDURE: sp_CheckInPatient
-- Purpose: Check in an eligible patient, compute dynamic wait time, assign next
-- sequential doctor token, and transition queue status.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CheckInPatient$$
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
    DECLARE v_current_date DATE;
    DECLARE v_max_token INT;
    DECLARE v_waiting_count INT;
    DECLARE v_existing_token INT DEFAULT NULL;
    DECLARE v_existing_wait INT DEFAULT NULL;
    DECLARE v_existing_status VARCHAR(30) DEFAULT NULL;

    SET v_current_date = CURDATE();

    -- Retrieve appointment details
    SELECT doctor_id, patient_id INTO v_doctor_id, v_patient_id
    FROM appointment
    WHERE appointment_id = p_appointment_id;

    IF v_doctor_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found.';
    END IF;

    -- Idempotency Guard: Check if appointment already has an active queue entry
    SELECT token_number, estimated_wait_time, queue_status 
    INTO v_existing_token, v_existing_wait, v_existing_status
    FROM queue_entry
    WHERE appointment_id = p_appointment_id;

    IF v_existing_token IS NOT NULL THEN
        -- Patient already checked in: return existing token and wait time safely without error 1062
        SET p_assigned_token = v_existing_token;
        SET p_est_wait_time = v_existing_wait;

        -- If priority is escalated (e.g. to Emergency), update existing entry
        IF p_priority_level = 'Emergency' AND v_existing_status = 'Waiting' THEN
            UPDATE queue_entry
            SET priority_level = 'Emergency',
                priority_reason = COALESCE(p_priority_reason, priority_reason),
                estimated_wait_time = 0
            WHERE appointment_id = p_appointment_id;
            SET p_est_wait_time = 0;
        END IF;

        UPDATE appointment
        SET appointment_status = 'Checked-In'
        WHERE appointment_id = p_appointment_id;
    ELSE
        -- Generate sequential token for this doctor on today's date
        SELECT COALESCE(MAX(token_number), v_doctor_id * 100) INTO v_max_token
        FROM queue_entry
        WHERE doctor_id = v_doctor_id AND queue_date = v_current_date;

        SET p_assigned_token = v_max_token + 1;

        -- Count existing patients waiting ahead for estimated wait time
        SELECT COUNT(*) INTO v_waiting_count
        FROM queue_entry
        WHERE doctor_id = v_doctor_id 
          AND queue_date = v_current_date 
          AND queue_status IN ('Waiting', 'Called');

        -- Emergency patients jump wait time; others receive 15 min per patient ahead
        IF p_priority_level = 'Emergency' THEN
            SET p_est_wait_time = 0;
        ELSE
            SET p_est_wait_time = v_waiting_count * 15;
        END IF;

        -- Insert into queue_entry (trg_after_queue_insert_notify will automatically emit notification)
        INSERT INTO queue_entry (
            appointment_id, doctor_id, token_number, queue_date,
            check_in_time, estimated_wait_time, priority_level, priority_reason, queue_status
        ) VALUES (
            p_appointment_id, v_doctor_id, p_assigned_token, v_current_date,
            CURTIME(), p_est_wait_time, p_priority_level, p_priority_reason, 'Waiting'
        );

        -- Update appointment status
        UPDATE appointment
        SET appointment_status = 'Checked-In'
        WHERE appointment_id = p_appointment_id;
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- 8.1.3 STORED FUNCTION: fn_CalculateDoctorWaitTime
-- Purpose: Deterministically compute cumulative estimated wait time in minutes
-- for a specific physician on a given date.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_CalculateDoctorWaitTime$$
CREATE FUNCTION fn_CalculateDoctorWaitTime(
    p_doctor_id INT,
    p_date DATE
) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_waiting_patients INT;
    DECLARE v_total_wait INT;

    SELECT COUNT(*) INTO v_waiting_patients
    FROM queue_entry
    WHERE doctor_id = p_doctor_id 
      AND queue_date = p_date 
      AND queue_status IN ('Waiting', 'Called');

    SET v_total_wait = v_waiting_patients * 15;
    RETURN v_total_wait;
END$$


-- =============================================================================
-- 8.2 DATABASE TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 8.2.1 TRIGGER: trg_prevent_double_booking
-- Purpose: Prevent conflicting doctor bookings at the database engine level
-- before any appointment row is inserted.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_double_booking$$
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


-- -----------------------------------------------------------------------------
-- 8.2.2 TRIGGER: trg_after_queue_insert_notify
-- Purpose: Automatically logs a patient notification alert when a queue entry
-- is generated, ensuring notification delivery is guaranteed by database state.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_queue_insert_notify$$
CREATE TRIGGER trg_after_queue_insert_notify
AFTER INSERT ON queue_entry
FOR EACH ROW
BEGIN
    DECLARE v_patient_id INT;

    SELECT patient_id INTO v_patient_id
    FROM appointment
    WHERE appointment_id = NEW.appointment_id;

    IF v_patient_id IS NOT NULL THEN
        INSERT INTO notification (
            patient_id, appointment_id, notification_type, message, sent_time, notification_status
        ) VALUES (
            v_patient_id, NEW.appointment_id, 'Queue Token Generated',
            CONCAT('Token #', NEW.token_number, ' created. Priority: ', NEW.priority_level, '. Est wait: ', NEW.estimated_wait_time, 'm.'),
            NOW(), 'Sent'
        );
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- 8.2.3 TRIGGER: trg_after_visit_completed
-- Purpose: Automatically synchronize appointment and queue status to 'Completed'
-- when a physician completes a clinical visit.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_visit_completed$$
CREATE TRIGGER trg_after_visit_completed
AFTER UPDATE ON visit
FOR EACH ROW
BEGIN
    IF NEW.visit_status = 'Completed' AND OLD.visit_status <> 'Completed' THEN
        -- Mark queue entry completed
        UPDATE queue_entry
        SET queue_status = 'Completed', estimated_wait_time = 0
        WHERE appointment_id = NEW.appointment_id;

        -- Mark appointment completed
        UPDATE appointment
        SET appointment_status = 'Completed'
        WHERE appointment_id = NEW.appointment_id;
    END IF;
END$$

DELIMITER ;
