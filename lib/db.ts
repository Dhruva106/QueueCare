// =============================================================================
// QueueCare: Unified Relational Database Access Layer
// Supports dual-mode:
// 1. MySQL 8.0 via `mysql2/promise` (when DB_TYPE=mysql)
// 2. Embedded persistent SQLite via `better-sqlite3` (default fallback)
// Both drivers share the identical normalized relational schema and constraints.
// =============================================================================

import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { hashPassword } from "./auth";

export type DBEngine = "mysql" | "sqlite";

let sqliteInstance: BetterSqliteDatabase | null = null;
let mysqlPool: unknown = null;

// Determine target database engine
export function getDatabaseType(): DBEngine {
  if (process.env.DB_TYPE === "mysql") {
    return "mysql";
  }
  return "sqlite";
}

/**
 * Initializes and returns SQLite connection with custom MySQL-compatible functions
 */
function getSqliteDb(): BetterSqliteDatabase {
  if (sqliteInstance) return sqliteInstance;

  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "queuecare.db");
  const db = new Database(dbPath);

  // Enable WAL mode for high concurrent performance and foreign keys
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Register MySQL compatibility functions
  db.function("CURDATE", () => new Date().toISOString().split("T")[0]);
  db.function("CURTIME", () => new Date().toTimeString().split(" ")[0]);
  db.function("NOW", () => new Date().toISOString().replace("T", " ").slice(0, 19));

  // Initialize schema if not present
  initializeTablesIfMissing(db);

  sqliteInstance = db;
  return sqliteInstance;
}

/**
 * Ensures all normalized tables and initial seed data exist in SQLite
 */
function initializeTablesIfMissing(db: BetterSqliteDatabase) {
  const tableCheck = db.prepare(
    "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='users'"
  ).get() as { count: number };

  if (tableCheck && tableCheck.count > 0) {
    // Ensure schedule columns exist on existing databases
    try { db.exec(`ALTER TABLE doctor ADD COLUMN working_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri'`); } catch {}
    try { db.exec(`ALTER TABLE doctor ADD COLUMN working_hours_start TEXT DEFAULT '09:00'`); } catch {}
    try { db.exec(`ALTER TABLE doctor ADD COLUMN working_hours_end TEXT DEFAULT '17:00'`); } catch {}
    try { db.exec(`ALTER TABLE doctor ADD COLUMN slot_duration_minutes INTEGER DEFAULT 15`); } catch {}
    try { db.exec(`ALTER TABLE doctor ADD COLUMN room_number TEXT DEFAULT 'Room 101'`); } catch {}
    return; // Already initialized
  }

  // Create tables in correct relational order
  db.exec(`
    CREATE TABLE IF NOT EXISTS department (
      department_id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_name TEXT NOT NULL UNIQUE,
      location TEXT,
      contact_number TEXT,
      status TEXT DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS staff (
      staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('Receptionist', 'Queue Manager', 'Administrator', 'Doctor Assistant', 'Billing Staff')),
      staff_status TEXT DEFAULT 'Active',
      date_joined TEXT
    );

    CREATE TABLE IF NOT EXISTS patient (
      patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      address TEXT,
      emergency_contact TEXT,
      registration_date TEXT NOT NULL,
      status TEXT DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS doctor (
      doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL REFERENCES department(department_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      doctor_name TEXT NOT NULL,
      specialization TEXT,
      qualification TEXT,
      phone TEXT,
      email TEXT UNIQUE,
      availability_status TEXT DEFAULT 'Available',
      consultation_fee REAL,
      status TEXT DEFAULT 'Active',
      working_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri',
      working_hours_start TEXT DEFAULT '09:00',
      working_hours_end TEXT DEFAULT '17:00',
      slot_duration_minutes INTEGER DEFAULT 15,
      room_number TEXT DEFAULT 'Room 101'
    );

    CREATE TABLE IF NOT EXISTS appointment (
      appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE ON UPDATE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES doctor(doctor_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      department_id INTEGER NOT NULL REFERENCES department(department_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      booking_date TEXT DEFAULT (DATE('now')),
      reason_for_visit TEXT,
      appointment_type TEXT DEFAULT 'OPD',
      appointment_status TEXT DEFAULT 'Scheduled',
      remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS queue_entry (
      queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointment(appointment_id) ON DELETE CASCADE ON UPDATE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES doctor(doctor_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      token_number INTEGER NOT NULL,
      queue_date TEXT NOT NULL,
      check_in_time TEXT,
      estimated_wait_time INTEGER DEFAULT 0,
      priority_level TEXT DEFAULT 'Normal',
      priority_reason TEXT,
      queue_status TEXT DEFAULT 'Waiting' CHECK(queue_status IN ('Waiting', 'Called', 'In-Consultation', 'Completed', 'Skipped', 'No-Show', 'Cancelled'))
    );

    CREATE TABLE IF NOT EXISTS visit (
      visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL REFERENCES appointment(appointment_id) ON DELETE CASCADE ON UPDATE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES doctor(doctor_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      staff_id INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL ON UPDATE CASCADE,
      visit_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      diagnosis TEXT,
      prescription TEXT,
      doctor_notes TEXT,
      visit_status TEXT DEFAULT 'In Progress',
      billed_amount REAL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS notification (
      notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE ON UPDATE CASCADE,
      appointment_id INTEGER REFERENCES appointment(appointment_id) ON DELETE SET NULL ON UPDATE CASCADE,
      notification_type TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_time TEXT DEFAULT (DATETIME('now', 'localtime')),
      notification_status TEXT DEFAULT 'Sent'
    );

    -- Users & Authentication Table
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Patient', 'Doctor', 'Receptionist', 'Administrator')),
      linked_patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
      linked_doctor_id INTEGER REFERENCES doctor(doctor_id) ON DELETE CASCADE,
      linked_staff_id INTEGER REFERENCES staff(staff_id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (DATETIME('now', 'localtime'))
    );

    -- Operational Audit Log Table
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT (DATETIME('now', 'localtime'))
    );
  `);

  // Seed baseline records and authentication accounts
  seedInitialData(db);
}

function seedInitialData(db: BetterSqliteDatabase) {
  const today = new Date().toISOString().split("T")[0];

  // 1. Departments
  const insertDept = db.prepare(
    "INSERT OR IGNORE INTO department (department_id, department_name, location, contact_number, status) VALUES (?, ?, ?, ?, ?)"
  );
  insertDept.run(1, "Cardiology", "Block A, Floor 2", "+91 80 2345 0001", "Active");
  insertDept.run(2, "General Medicine", "Block B, Ground Floor", "+91 80 2345 0002", "Active");
  insertDept.run(3, "Orthopedics", "Block A, Floor 1", "+91 80 2345 0003", "Active");
  insertDept.run(4, "Pediatrics", "Block C, Floor 1", "+91 80 2345 0004", "Active");
  insertDept.run(5, "Dermatology", "Block B, Floor 2", "+91 80 2345 0005", "Active");
  insertDept.run(6, "Neurology", "Block A, Floor 3", "+91 80 2345 0006", "Active");

  // 2. Staff
  const insertStaff = db.prepare(
    "INSERT OR REPLACE INTO staff (staff_id, staff_name, username, email, phone, role, staff_status, date_joined) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertStaff.run(1, "Dhruva G Hegde", "dhruva_admin", "dhruva.admin@queuecare.hospital", "+91 98450 11001", "Administrator", "Active", "2024-01-10");
  insertStaff.run(2, "Pramath G Hegde", "pramath_admin", "pramath.admin@queuecare.hospital", "+91 98450 11002", "Administrator", "Active", "2024-01-15");
  insertStaff.run(3, "Kavya Raman", "kavya_front", "kavya.r@queuecare.hospital", "+91 98450 11003", "Receptionist", "Active", "2024-02-01");
  insertStaff.run(4, "Suresh Babu", "suresh_docasst", "suresh.b@queuecare.hospital", "+91 98450 11004", "Doctor Assistant", "Active", "2024-02-10");
  insertStaff.run(5, "Deepa Rao", "deepa_bill", "deepa.rao@queuecare.hospital", "+91 98450 11005", "Billing Staff", "Active", "2024-03-01");

  // 3. Patients
  const insertPatient = db.prepare(
    "INSERT OR IGNORE INTO patient (patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact, registration_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertPatient.run(1, "Aarav", "Sharma", "1988-06-15", "Male", "+91 98765 43210", "aarav.sharma@example.com", "124 Indiranagar, Bangalore", "+91 98765 43219", "2024-05-10", "Active");
  insertPatient.run(2, "Priya", "Reddy", "1995-11-22", "Female", "+91 98765 43211", "priya.reddy@example.com", "45 Koramangala, Bangalore", "+91 98765 43218", "2024-05-12", "Active");
  insertPatient.run(3, "Rahul", "Kumar", "1958-03-08", "Male", "+91 98765 43212", "rahul.kumar58@example.com", "78 Jayanagar 4th Block, Bangalore", "+91 98765 43217", "2024-05-15", "Active");
  insertPatient.run(4, "Ananya", "Rao", "2018-09-14", "Female", "+91 98765 43213", "parent.ananya@example.com", "210 Malleshwaram, Bangalore", "+91 98765 43216", "2024-06-01", "Active");
  insertPatient.run(5, "Vikram", "Singh", "1975-01-30", "Male", "+91 98765 43214", "vikram.singh@example.com", "88 Whitefield, Bangalore", "+91 98765 43215", "2024-06-10", "Active");
  insertPatient.run(6, "Meenakshi", "Sundaram", "1952-12-04", "Female", "+91 98765 43220", "meenakshi.s@example.com", "15 Basavanagudi, Bangalore", "+91 98765 43221", "2024-06-15", "Active");
  insertPatient.run(7, "Tanvi", "Deshmukh", "2001-07-19", "Female", "+91 98765 43222", "tanvi.d@example.com", "99 HSR Layout Sector 2, Bangalore", "+91 98765 43223", "2024-07-01", "Active");
  insertPatient.run(8, "Karthik", "Venkatesh", "1984-04-25", "Male", "+91 98765 43224", "karthik.v@example.com", "34 Bannerghatta Road, Bangalore", "+91 98765 43225", "2024-07-10", "Active");

  // 4. Doctors
  const insertDoctor = db.prepare(
    "INSERT OR IGNORE INTO doctor (doctor_id, department_id, doctor_name, specialization, qualification, phone, email, availability_status, consultation_fee, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertDoctor.run(1, 1, "Dr. Rajesh Sharma", "Interventional Cardiology", "MBBS, MD, DM (Cardio)", "+91 91234 56701", "dr.rajesh@queuecare.hospital", "Available", 800.00, "Active");
  insertDoctor.run(2, 2, "Dr. Sunita Kulkarni", "Internal Medicine & Diabetology", "MBBS, MD (General Medicine)", "+91 91234 56702", "dr.sunita@queuecare.hospital", "Available", 500.00, "Active");
  insertDoctor.run(3, 3, "Dr. Vikram Adiga", "Joint Replacement & Arthroscopy", "MBBS, MS (Ortho), MCh", "+91 91234 56703", "dr.vikram@queuecare.hospital", "Available", 750.00, "Active");
  insertDoctor.run(4, 4, "Dr. Ananya Iyer", "Pediatric Pulmonology", "MBBS, MD (Pediatrics), DNB", "+91 91234 56704", "dr.ananya@queuecare.hospital", "Available", 600.00, "Active");
  insertDoctor.run(5, 5, "Dr. Rohan Nair", "Clinical Dermatology & Aesthetics", "MBBS, MD (DVL)", "+91 91234 56705", "dr.rohan@queuecare.hospital", "Available", 550.00, "Active");
  insertDoctor.run(6, 6, "Dr. Meera Patil", "Cognitive Neurology & Epilepsy", "MBBS, DM (Neurology)", "+91 91234 56706", "dr.meera@queuecare.hospital", "On Break", 900.00, "Active");

  // 5. Appointments
  const insertApp = db.prepare(
    "INSERT OR IGNORE INTO appointment (appointment_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, booking_date, reason_for_visit, appointment_type, appointment_status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertApp.run(1, 1, 1, 1, today, "09:00:00", today, "Mild chest tightness on exertion", "OPD", "Completed", "ECG review requested");
  insertApp.run(2, 2, 2, 2, today, "09:30:00", today, "Routine health checkup & blood glucose", "OPD", "In-Progress", "Regular checkup");
  insertApp.run(3, 3, 3, 3, today, "09:45:00", today, "Severe acute right knee swelling after fall", "Emergency", "Checked-In", "Wheelchair assisted");
  insertApp.run(4, 4, 4, 4, today, "10:00:00", today, "Recurrent nocturnal cough and wheezing", "OPD", "Checked-In", "Accompanied by mother");
  insertApp.run(5, 5, 1, 1, today, "10:15:00", today, "High blood pressure medication adjustment", "Follow-up", "Checked-In", "Bring previous prescriptions");
  insertApp.run(6, 6, 2, 2, today, "10:30:00", today, "Chronic joint pain and weakness", "OPD", "Checked-In", "Senior citizen priority care");
  insertApp.run(7, 7, 5, 5, today, "11:00:00", today, "Allergic rash with pruritus on forearms", "OPD", "Scheduled", "First visit");
  insertApp.run(8, 8, 3, 3, today, "11:30:00", today, "Follow-up post ligament reconstruction", "Follow-up", "Scheduled", "X-ray reports ready");

  // 6. Queue Entries
  const insertQueue = db.prepare(
    "INSERT OR IGNORE INTO queue_entry (queue_id, appointment_id, doctor_id, token_number, queue_date, check_in_time, estimated_wait_time, priority_level, priority_reason, queue_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertQueue.run(1, 1, 1, 101, today, "08:50:00", 0, "Normal", "Scheduled OPD arrival", "Completed");
  insertQueue.run(2, 2, 2, 201, today, "09:15:00", 0, "Normal", "Scheduled morning slot", "In-Consultation");
  insertQueue.run(3, 3, 3, 301, today, "09:25:00", 0, "Emergency", "Acute traumatic knee effusion with severe pain", "Waiting");
  insertQueue.run(4, 4, 4, 401, today, "09:30:00", 15, "Child/Infant", "Pediatric patient under 10 with respiratory wheeze", "Waiting");
  insertQueue.run(5, 5, 1, 102, today, "09:40:00", 20, "Urgent", "Severe persistent hypertension (>170/100 mmHg)", "Waiting");
  insertQueue.run(6, 6, 2, 202, today, "09:45:00", 25, "Senior Citizen", "Patient age 74 years with chronic mobility limitation", "Waiting");

  // 7. Visits
  const insertVisit = db.prepare(
    "INSERT OR IGNORE INTO visit (visit_id, appointment_id, doctor_id, staff_id, visit_date, start_time, end_time, diagnosis, prescription, doctor_notes, visit_status, billed_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertVisit.run(1, 1, 1, 4, today, "09:05:00", "09:25:00", "Stable Angina Pectoris; Stage 1 HTN", "Tab. Metoprolol 25mg 1-0-0, Tab. Aspirin 75mg 0-1-0", "Advised 2D Echocardiogram and lipid profile re-check in 4 weeks. Low sodium diet.", "Completed", 800.00);
  insertVisit.run(2, 2, 2, 4, today, "09:35:00", null, "Type 2 Diabetes Mellitus - evaluation", "Tab. Metformin 500mg post meals", "Consultation currently in progress. Fasting blood sugar monitoring advised.", "In Progress", 500.00);

  // 8. Notifications
  const insertNotif = db.prepare(
    "INSERT OR IGNORE INTO notification (notification_id, patient_id, appointment_id, notification_type, message, sent_time, notification_status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insertNotif.run(1, 1, 1, "Appointment Confirmation", "Your appointment with Dr. Rajesh Sharma is confirmed for today at 09:00 AM.", "2026-11-02 08:30:00", "Read");
  insertNotif.run(2, 1, 1, "Visit Summary", "Your consultation with Dr. Rajesh Sharma has been completed. Prescription is available at the counter.", "2026-11-02 09:25:00", "Read");
  insertNotif.run(3, 2, 2, "Queue Update", "Token #201: You have been called for consultation with Dr. Sunita Kulkarni in Room B-102.", "2026-11-02 09:35:00", "Read");
  insertNotif.run(4, 3, 3, "Queue Update", "Token #301: You are registered as EMERGENCY Priority. Doctor Vikram Adiga has been notified.", "2026-11-02 09:25:00", "Sent");
  insertNotif.run(5, 4, 4, "Appointment Reminder", "Token #401: Pediatric consultation with Dr. Ananya Iyer is estimated in 15 minutes.", "2026-11-02 09:30:00", "Sent");
  insertNotif.run(6, 6, 6, "Queue Update", "Token #202: Senior Citizen Priority assigned. Estimated wait time is approx 25 minutes.", "2026-11-02 09:45:00", "Sent");

  // 9. Users / Authentication Accounts
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (user_id, email, password_hash, salt, name, role, linked_patient_id, linked_doctor_id, linked_staff_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const dhruvaAuth = hashPassword("admin123");
  insertUser.run(1, "dhruva.admin@queuecare.hospital", dhruvaAuth.hash, dhruvaAuth.salt, "Dhruva G Hegde", "Administrator", null, null, 1);
  insertUser.run(2, "admin@queuecare.hospital", dhruvaAuth.hash, dhruvaAuth.salt, "Dhruva G Hegde", "Administrator", null, null, 1);

  const pramathAuth = hashPassword("admin123");
  insertUser.run(3, "pramath.admin@queuecare.hospital", pramathAuth.hash, pramathAuth.salt, "Pramath G Hegde", "Administrator", null, null, 2);

  const docAuth = hashPassword("doctor123");
  insertUser.run(4, "dr.rajesh@queuecare.hospital", docAuth.hash, docAuth.salt, "Dr. Rajesh Sharma", "Doctor", null, 1, null);

  const staffAuth = hashPassword("staff123");
  insertUser.run(5, "kavya.r@queuecare.hospital", staffAuth.hash, staffAuth.salt, "Kavya Raman", "Receptionist", null, null, 3);

  const patientAuth = hashPassword("patient123");
  insertUser.run(6, "aarav.sharma@example.com", patientAuth.hash, patientAuth.salt, "Aarav Sharma", "Patient", 1, null, null);
  insertUser.run(7, "patient@queuecare.hospital", patientAuth.hash, patientAuth.salt, "Aarav Sharma", "Patient", 1, null, null);

  const priyaAuth = hashPassword("patient123");
  insertUser.run(8, "priya.reddy@example.com", priyaAuth.hash, priyaAuth.salt, "Priya Reddy", "Patient", 2, null, null);

  // 10. Audit Log Seed
  const insertAudit = db.prepare(`
    INSERT OR IGNORE INTO audit_log (actor_role, action, entity, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAudit.run("Administrator", "SYSTEM_INIT", "DATABASE", 1, "QueueCare database initialized with 8 relational tables and demo accounts.");
}

/**
 * Logs an administrative audit event
 */
export async function logAuditEvent(
  actorRole: string,
  action: string,
  entity: string,
  entityId?: number | null,
  details?: string | null
): Promise<void> {
  await run(
    `INSERT INTO audit_log (actor_role, action, entity, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [actorRole, action, entity, entityId ?? null, details ?? null]
  );
}

/**
 * Executes a SELECT query and returns an array of records
 */
export async function query<T>(sqlText: string, params: unknown[] = []): Promise<T[]> {
  const engine = getDatabaseType();

  if (engine === "mysql") {
    const pool = await getMysqlPool();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows] = await (pool as any).query(sqlText, params);
    return rows as T[];
  }

  // SQLite execution
  const db = getSqliteDb();
  const stmt = db.prepare(sqlText);
  return stmt.all(...params) as T[];
}

/**
 * Executes a SELECT query that returns a single row
 */
export async function get<T>(sqlText: string, params: unknown[] = []): Promise<T | null> {
  const engine = getDatabaseType();

  if (engine === "mysql") {
    const pool = await getMysqlPool();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows] = await (pool as any).query(sqlText, params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = rows as any[];
    return arr.length > 0 ? (arr[0] as T) : null;
  }

  const db = getSqliteDb();
  const stmt = db.prepare(sqlText);
  const row = stmt.get(...params);
  return (row as T) ?? null;
}

/**
 * Executes an INSERT, UPDATE, or DELETE statement
 */
export async function run(
  sqlText: string,
  params: unknown[] = []
): Promise<{ lastInsertId: number; changes: number }> {
  const engine = getDatabaseType();

  if (engine === "mysql") {
    const pool = await getMysqlPool();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result] = await (pool as any).execute(sqlText, params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = result as any;
    return {
      lastInsertId: Number(res.insertId || 0),
      changes: Number(res.affectedRows || 0),
    };
  }

  const db = getSqliteDb();
  const stmt = db.prepare(sqlText);
  const result = stmt.run(...params);
  return {
    lastInsertId: Number(result.lastInsertRowid),
    changes: result.changes,
  };
}

/**
 * MySQL connection pool helper (lazy initialized if DB_TYPE=mysql)
 */
async function getMysqlPool() {
  if (mysqlPool) return mysqlPool;

  const mysql = await import("mysql2/promise");
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "queuecare",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return mysqlPool;
}

/**
 * Resets and re-seeds database (useful for testing or demonstration resets)
 */
export function resetDatabase() {
  const db = getSqliteDb();
  db.exec(`
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
  `);
  initializeTablesIfMissing(db);
}
