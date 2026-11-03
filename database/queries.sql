-- =============================================================================
-- QueueCare: Analytical & Relational Queries Suite
-- Course: Database Management Systems (UE24CS352B) | Semester V
-- Institution: PES University, Bangalore
-- Matches Chapter 7 requirements: Simple/Aggregate, Update, Delete, Correlated, Nested
-- =============================================================================

USE queuecare;

-- -----------------------------------------------------------------------------
-- 7.1 SIMPLE QUERY WITH GROUP BY AND AGGREGATE FUNCTIONS
-- Purpose: Summarize hospital queue workload, average wait times, and total patients
-- by Priority Level across all active waiting rooms.
-- -----------------------------------------------------------------------------
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

-- Additional Aggregate: Revenue and Consultation Summary by Department
SELECT 
    d.department_name,
    COUNT(DISTINCT doc.doctor_id) AS total_doctors,
    COUNT(v.visit_id) AS completed_consultations,
    COALESCE(SUM(v.billed_amount), 0.00) AS total_revenue_inr
FROM department d
JOIN doctor doc ON d.department_id = doc.department_id
LEFT JOIN visit v ON doc.doctor_id = v.doctor_id AND v.visit_status = 'Completed'
GROUP BY d.department_id, d.department_name
ORDER BY total_revenue_inr DESC;


-- -----------------------------------------------------------------------------
-- 7.2 UPDATE OPERATION
-- Purpose: Transition patient queue status from 'Waiting' to 'In-Consultation'
-- when called by doctor, setting the active consultation start timestamp.
-- -----------------------------------------------------------------------------
UPDATE queue_entry
SET 
    queue_status = 'In-Consultation',
    estimated_wait_time = 0
WHERE queue_id = 3 AND queue_status = 'Waiting';

-- Update Appointment Status in tandem
UPDATE appointment
SET appointment_status = 'In-Progress'
WHERE appointment_id = (
    SELECT appointment_id FROM queue_entry WHERE queue_id = 3
);


-- -----------------------------------------------------------------------------
-- 7.3 DELETE OPERATION
-- Purpose: Cancel and remove an invalid or unfulfilled scheduled appointment
-- that has no linked active queue entry or visit record (referential integrity safe).
-- -----------------------------------------------------------------------------
DELETE FROM appointment
WHERE appointment_id = 8 
  AND appointment_status = 'Scheduled'
  AND appointment_id NOT IN (SELECT appointment_id FROM queue_entry);


-- -----------------------------------------------------------------------------
-- 7.4 CORRELATED SUBQUERY
-- Purpose: Identify doctors whose average consultation fee is higher than the
-- average consultation fee of doctors within their SAME department.
-- (Correlated via outer table alias 'outer_doc' and inner alias 'inner_doc')
-- -----------------------------------------------------------------------------
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

-- Correlated Subquery 2: Find patients whose estimated wait time is higher than
-- the average wait time for their specific priority level.
SELECT 
    qe1.queue_id,
    qe1.token_number,
    qe1.priority_level,
    qe1.estimated_wait_time,
    p.first_name,
    p.last_name
FROM queue_entry qe1
JOIN appointment a ON qe1.appointment_id = a.appointment_id
JOIN patient p ON a.patient_id = p.patient_id
WHERE qe1.queue_status = 'Waiting'
  AND qe1.estimated_wait_time > (
      SELECT AVG(qe2.estimated_wait_time)
      FROM queue_entry qe2
      WHERE qe2.priority_level = qe1.priority_level
        AND qe2.queue_status = 'Waiting'
  );


-- -----------------------------------------------------------------------------
-- 7.5 NESTED SUBQUERY
-- Purpose: Find all patients who have NEVER missed an appointment and have
-- active appointments scheduled with doctors specialized in 'Cardiology'.
-- Uses IN / NOT IN nested subqueries.
-- -----------------------------------------------------------------------------
SELECT 
    p.patient_id,
    p.first_name,
    p.last_name,
    p.phone,
    p.email
FROM patient p
WHERE p.patient_id IN (
    -- Appointments for Cardiology
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
    -- Filter out patients with any cancelled appointments
    SELECT a2.patient_id
    FROM appointment a2
    WHERE a2.appointment_status = 'Cancelled'
);

