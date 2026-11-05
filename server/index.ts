// =============================================================================
// QueueCare Dedicated Standalone Backend API Server (TERMINAL 2)
// Built with Express, TypeScript, and MySQL 8.0 / Unified Database Adapter
// =============================================================================

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

// Load environment configuration from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { query, get, run, checkDatabaseHealth, getDatabaseType, resetDatabase } from "../lib/db";
import { 
  verifyPassword, 
  createSessionToken, 
  verifySessionToken, 
  hashPassword, 
  DEMO_PERSONAS,
  AuthUser 
} from "../lib/auth";
import { evaluateTriage, compareQueueEntries } from "../lib/prioritization";
import { publishRealtimeEvent, realtimeHub, RealtimeEvent } from "../lib/realtime";
import { invalidateCacheKey, CACHE_KEYS } from "../lib/cache";
import { getDoctorRecommendations } from "../lib/graph";
import type { 
  Patient, 
  Doctor, 
  Department, 
  Appointment, 
  QueueEntry, 
  Visit, 
  Notification 
} from "../lib/types";

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 5001);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url } = req;
  _res.on("finish", () => {
    const duration = Date.now() - start;
    if (!url.startsWith("/api/realtime")) {
      console.log(`[QueueCare API] ${method} ${url} -> ${_res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Authentication extraction helper
function getAuthUser(req: Request) {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/qc_session=([^;]+)/);
    if (match) token = match[1];
  }
  if (!token) return null;
  return verifySessionToken(token);
}

// -----------------------------------------------------------------------------
// 1. HEALTH CHECKS
// -----------------------------------------------------------------------------
app.get("/api/health", async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: dbHealth.connected ? "ok" : "degraded",
    service: "QueueCare Backend API",
    port: PORT,
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

app.get("/api/db/health", async (_req: Request, res: Response) => {
  const health = await checkDatabaseHealth();
  const statusCode = health.connected ? 200 : 503;
  res.status(statusCode).json(health);
});

// -----------------------------------------------------------------------------
// 2. AUTHENTICATION & SESSIONS
// -----------------------------------------------------------------------------
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password, demoKey, patientId, doctorId } = req.body;

    // A. Dynamic Patient Sign-In by Patient ID
    if (patientId) {
      const pid = Number(patientId);
      const patient = await get<Patient>("SELECT * FROM patient WHERE patient_id = ?", [pid]);
      if (!patient) {
        return res.status(404).json({ success: false, error: `Patient #${pid} not found in database.` });
      }
      const userPayload: AuthUser = {
        id: 1000 + pid,
        email: patient.email || `patient${pid}@example.com`,
        name: `${patient.first_name} ${patient.last_name}`,
        role: "Patient",
        linkedPatientId: pid,
      };
      const token = createSessionToken(userPayload);
      res.setHeader("Set-Cookie", `qc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
      return res.json({ success: true, user: userPayload, token });
    }

    // B. Dynamic Doctor Sign-In by Doctor ID or "doctor:ID" demo key
    const requestedDocId = doctorId || (typeof demoKey === "string" && demoKey.startsWith("doctor:") ? Number(demoKey.split(":")[1]) : undefined);
    if (requestedDocId) {
      const did = Number(requestedDocId);
      const doc = await get<Doctor>("SELECT * FROM doctor WHERE doctor_id = ?", [did]);
      if (!doc) {
        return res.status(404).json({ success: false, error: `Doctor #${did} not found in database.` });
      }
      const userRow = await get<{ user_id: number }>("SELECT user_id FROM users WHERE linked_doctor_id = ? OR email = ?", [did, doc.email]);
      const userPayload: AuthUser = {
        id: userRow?.user_id || (2000 + did),
        email: doc.email || `doctor${did}@queuecare.hospital`,
        name: doc.doctor_name,
        role: "Doctor",
        linkedDoctorId: did,
      };
      const token = createSessionToken(userPayload);
      res.setHeader("Set-Cookie", `qc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
      return res.json({ success: true, user: userPayload, token });
    }

    // C. Preset Demo User Switcher
    if (demoKey) {
      const demo = DEMO_PERSONAS.find(
        (p) => p.key === demoKey || p.role.toLowerCase() === String(demoKey).toLowerCase()
      );
      if (demo) {
        const demoUser: AuthUser = {
          id: demo.key === "admin_dhruva" ? 1 : demo.key === "admin_pramath" ? 2 : (demo.linkedDoctorId ? 2000 + demo.linkedDoctorId : 10),
          name: demo.name,
          email: demo.email,
          role: demo.role,
          linkedDoctorId: demo.linkedDoctorId,
          linkedPatientId: demo.linkedPatientId,
        };
        const token = createSessionToken(demoUser);
        res.setHeader("Set-Cookie", `qc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
        return res.json({ success: true, user: demoUser, token });
      }
    }

    // D. Standard Email/Password Authentication against Database
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRow = await get<any>("SELECT * FROM users WHERE email = ?", [email]);
    if (!userRow) {
      return res.status(401).json({ success: false, error: "Invalid credentials. User does not exist." });
    }

    const isValid = verifyPassword(password, userRow.password_hash, userRow.salt);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Invalid credentials. Password incorrect." });
    }

    const authenticatedUser: AuthUser = {
      id: userRow.user_id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      linkedPatientId: userRow.linked_patient_id,
      linkedDoctorId: userRow.linked_doctor_id,
      linkedStaffId: userRow.linked_staff_id,
    };

    const token = createSessionToken(authenticatedUser);
    res.setHeader("Set-Cookie", `qc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.json({ success: true, user: authenticatedUser, token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get("/api/auth/me", (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.json({ authenticated: false, user: null });
  }
  return res.json({ authenticated: true, user });
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.setHeader("Set-Cookie", "qc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.json({ success: true, message: "Logged out successfully" });
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = "Patient", phone } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: "Missing required registration fields." });
    }

    const existingUser = await get<{ user_id: number }>("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existingUser) {
      return res.status(409).json({ success: false, error: "A user with this email already exists." });
    }

    let linkedPatientId: number | null = null;
    if (role === "Patient") {
      const parts = name.trim().split(" ");
      const firstName = parts[0] || "Patient";
      const lastName = parts.slice(1).join(" ") || "User";
      const patResult = await run(
        `INSERT INTO patient (first_name, last_name, date_of_birth, gender, phone, email, registration_date, status)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'Active')`,
        [firstName, lastName, "1995-01-01", "Other", phone || null, email]
      );
      linkedPatientId = patResult.lastInsertId;
    }

    const { hash, salt } = hashPassword(password);
    const result = await run(
      `INSERT INTO users (email, password_hash, salt, name, role, linked_patient_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, hash, salt, name, role, linkedPatientId]
    );

    const newUser: AuthUser = {
      id: result.lastInsertId,
      email,
      name,
      role: role as AuthUser["role"],
      linkedPatientId: linkedPatientId || undefined,
    };
    const token = createSessionToken(newUser);
    res.setHeader("Set-Cookie", `qc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.status(201).json({ success: true, user: newUser, token });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 3. DASHBOARD STATISTICS (Calculated from MySQL)
// -----------------------------------------------------------------------------
app.get("/api/dashboard/stats", async (_req: Request, res: Response) => {
  try {
    const totalPatientsRow = await get<{ count: number }>("SELECT count(*) as count FROM patient WHERE status = 'Active'");
    const totalAppointmentsRow = await get<{ count: number }>("SELECT count(*) as count FROM appointment WHERE appointment_date = CURDATE()");
    const totalScheduledRow = await get<{ count: number }>("SELECT count(*) as count FROM appointment WHERE appointment_status = 'Scheduled'");
    const waitingRow = await get<{ count: number }>("SELECT count(*) as count FROM queue_entry WHERE queue_date = CURDATE() AND queue_status = 'Waiting'");
    const inConsultationRow = await get<{ count: number }>("SELECT count(*) as count FROM queue_entry WHERE queue_date = CURDATE() AND queue_status = 'In-Consultation'");
    const completedTodayRow = await get<{ count: number }>("SELECT count(*) as count FROM queue_entry WHERE queue_date = CURDATE() AND queue_status = 'Completed'");
    const avgWaitRow = await get<{ avg_wait: number }>("SELECT COALESCE(AVG(estimated_wait_time), 0) as avg_wait FROM queue_entry WHERE queue_date = CURDATE() AND queue_status IN ('Waiting', 'Called')");

    const deptDistribution = await query<{
      department_name: string;
      waiting_count: number;
    }>(`
      SELECT 
        d.department_name,
        COUNT(qe.queue_id) as waiting_count
      FROM department d
      LEFT JOIN doctor doc ON d.department_id = doc.department_id
      LEFT JOIN queue_entry qe ON doc.doctor_id = qe.doctor_id 
        AND qe.queue_date = CURDATE() 
        AND qe.queue_status IN ('Waiting', 'In-Consultation')
      GROUP BY d.department_id, d.department_name
      ORDER BY waiting_count DESC, d.department_name ASC
    `);

    const maxDeptCount = Math.max(1, ...deptDistribution.map((d) => d.waiting_count));
    const colors = ["bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-indigo-500"];
    const formattedDeptCounts = deptDistribution.map((d, index) => ({
      name: d.department_name,
      count: d.waiting_count,
      widthPercent: Math.round((d.waiting_count / maxDeptCount) * 100),
      color: colors[index % colors.length],
    }));

    const recentActivity = await query<{
      sent_time: string;
      message: string;
      notification_type: string;
    }>(`
      SELECT sent_time, message, notification_type
      FROM notification
      ORDER BY notification_id DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      stats: {
        totalPatients: totalPatientsRow?.count || 0,
        appointmentsToday: totalAppointmentsRow?.count || 0,
        totalScheduled: totalScheduledRow?.count || 0,
        waitingPatients: waitingRow?.count || 0,
        inConsultation: inConsultationRow?.count || 0,
        completedToday: completedTodayRow?.count || 0,
        averageWaitTimeMinutes: Math.round(avgWaitRow?.avg_wait || 0),
        departmentQueueCounts: formattedDeptCounts,
        recentActivity: recentActivity.map((a) => ({
          time: a.sent_time,
          description: a.message,
          type: a.notification_type.toLowerCase().includes("queue") ? "queue" : "appointment",
        })),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 4. DEPARTMENTS
// -----------------------------------------------------------------------------
app.get("/api/departments", async (_req: Request, res: Response) => {
  try {
    const departments = await query<Department>(`
      SELECT 
        d.department_id,
        d.department_name,
        d.location,
        d.contact_number,
        d.status,
        COUNT(doc.doctor_id) AS doctor_count
      FROM department d
      LEFT JOIN doctor doc ON d.department_id = doc.department_id AND doc.status = 'Active'
      GROUP BY d.department_id, d.department_name, d.location, d.contact_number, d.status
      ORDER BY d.department_name ASC
    `);
    res.json({ success: true, count: departments.length, departments });
  } catch (error) {
    console.error("Departments error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 5. DOCTORS & OPD SCHEDULES
// -----------------------------------------------------------------------------
app.get("/api/doctors", async (req: Request, res: Response) => {
  try {
    const deptId = req.query.department_id;
    let sql = `
      SELECT 
        doc.doctor_id,
        doc.department_id,
        doc.doctor_name,
        doc.specialization,
        doc.qualification,
        doc.phone,
        doc.email,
        doc.availability_status,
        doc.consultation_fee,
        doc.status,
        doc.working_days,
        doc.working_hours_start,
        doc.working_hours_end,
        doc.slot_duration_minutes,
        doc.room_number,
        d.department_name
      FROM doctor doc
      JOIN department d ON doc.department_id = d.department_id
    `;
    const params: unknown[] = [];
    if (deptId) {
      sql += " WHERE doc.department_id = ?";
      params.push(Number(deptId));
    }
    sql += " ORDER BY doc.doctor_name ASC";

    const doctors = await query<Doctor>(sql, params);
    res.json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    console.error("Doctors error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post("/api/doctors", async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (user && user.role !== "Administrator") {
      return res.status(403).json({ success: false, error: "Only Administrators can register new doctors." });
    }

    const {
      department_id,
      doctor_name,
      specialization,
      qualification,
      phone,
      email,
      consultation_fee = 500,
      working_days = "Mon,Tue,Wed,Thu,Fri",
      working_hours_start = "09:00:00",
      working_hours_end = "17:00:00",
      slot_duration_minutes = 15,
      room_number = "Room 101",
    } = req.body;

    if (!department_id || !doctor_name) {
      return res.status(400).json({ success: false, error: "Department and Doctor Name are required." });
    }

    const result = await run(
      `INSERT INTO doctor (
        department_id, doctor_name, specialization, qualification, phone, email,
        availability_status, consultation_fee, status,
        working_days, working_hours_start, working_hours_end, slot_duration_minutes, room_number
      ) VALUES (?, ?, ?, ?, ?, ?, 'Available', ?, 'Active', ?, ?, ?, ?, ?)`,
      [
        Number(department_id),
        doctor_name,
        specialization || null,
        qualification || null,
        phone || null,
        email || null,
        Number(consultation_fee),
        working_days,
        working_hours_start,
        working_hours_end,
        Number(slot_duration_minutes),
        room_number,
      ]
    );

    invalidateCacheKey(CACHE_KEYS.DOCTORS_LIST);
    publishRealtimeEvent("DoctorCreated", { doctor_id: result.lastInsertId, doctor_name });

    res.status(201).json({
      success: true,
      message: "Doctor registered successfully.",
      doctor_id: result.lastInsertId,
    });
  } catch (error) {
    console.error("Create doctor error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.patch("/api/doctors/:id", async (req: Request, res: Response) => {
  try {
    const doctorId = Number(req.params.id);
    const {
      availability_status,
      consultation_fee,
      working_days,
      working_hours_start,
      working_hours_end,
      slot_duration_minutes,
      room_number,
      phone,
      email,
    } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (availability_status) { updates.push("availability_status = ?"); params.push(availability_status); }
    if (consultation_fee !== undefined) { updates.push("consultation_fee = ?"); params.push(Number(consultation_fee)); }
    if (working_days) { updates.push("working_days = ?"); params.push(working_days); }
    if (working_hours_start) { updates.push("working_hours_start = ?"); params.push(working_hours_start); }
    if (working_hours_end) { updates.push("working_hours_end = ?"); params.push(working_hours_end); }
    if (slot_duration_minutes !== undefined) { updates.push("slot_duration_minutes = ?"); params.push(Number(slot_duration_minutes)); }
    if (room_number) { updates.push("room_number = ?"); params.push(room_number); }
    if (phone) { updates.push("phone = ?"); params.push(phone); }
    if (email) { updates.push("email = ?"); params.push(email); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields provided to update." });
    }

    params.push(doctorId);
    await run(`UPDATE doctor SET ${updates.join(", ")} WHERE doctor_id = ?`, params);

    invalidateCacheKey(CACHE_KEYS.DOCTORS_LIST);
    publishRealtimeEvent("DoctorUpdated", { doctor_id: doctorId, updates: req.body });

    res.json({ success: true, message: "Doctor profile and schedule updated successfully." });
  } catch (error) {
    console.error("Update doctor error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 6. PATIENTS
// -----------------------------------------------------------------------------
app.get("/api/patients", async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    let sql = `
      SELECT 
        p.*,
        ROUND((JULIANDAY('now') - JULIANDAY(p.date_of_birth)) / 365.25) AS age
      FROM patient p
    `;
    const params: unknown[] = [];
    if (search) {
      sql += " WHERE p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ?";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    sql += " ORDER BY p.patient_id DESC";

    // In MySQL, use TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) for age
    if (getDatabaseType() === "mysql") {
      sql = sql.replace(
        "ROUND((JULIANDAY('now') - JULIANDAY(p.date_of_birth)) / 365.25)",
        "TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE())"
      );
    }

    const patients = await query<Patient>(sql, params);
    res.json({ success: true, count: patients.length, patients });
  } catch (error) {
    console.error("Patients error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get("/api/patients/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const patient = await get<Patient>("SELECT * FROM patient WHERE patient_id = ?", [id]);
    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient record not found." });
    }

    const appointments = await query<Appointment>(
      `SELECT a.*, d.doctor_name, dept.department_name 
       FROM appointment a
       JOIN doctor d ON a.doctor_id = d.doctor_id
       JOIN department dept ON a.department_id = dept.department_id
       WHERE a.patient_id = ? ORDER BY a.appointment_date DESC`,
      [id]
    );

    const visits = await query<Visit>(
      `SELECT v.*, d.doctor_name 
       FROM visit v
       JOIN doctor d ON v.doctor_id = d.doctor_id
       WHERE v.appointment_id IN (SELECT appointment_id FROM appointment WHERE patient_id = ?)
       ORDER BY v.visit_date DESC`,
      [id]
    );

    res.json({ success: true, patient, appointments, visits });
  } catch (error) {
    console.error("Patient details error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post("/api/patients", async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact } = req.body;
    if (!first_name || !last_name || !date_of_birth) {
      return res.status(400).json({ success: false, error: "First Name, Last Name, and Date of Birth are mandatory." });
    }

    if (phone) {
      const existing = await get<{ patient_id: number }>("SELECT patient_id FROM patient WHERE phone = ?", [phone]);
      if (existing) {
        return res.status(409).json({ success: false, error: "A patient with this phone number already exists." });
      }
    }

    const result = await run(
      `INSERT INTO patient (first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact, registration_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Active')`,
      [first_name, last_name, date_of_birth, gender || null, phone || null, email || null, address || null, emergency_contact || null]
    );

    invalidateCacheKey(CACHE_KEYS.STATS_SUMMARY);
    publishRealtimeEvent("PatientCreated", { patient_id: result.lastInsertId, name: `${first_name} ${last_name}` });

    res.status(201).json({
      success: true,
      message: "Patient registered successfully.",
      patient_id: result.lastInsertId,
    });
  } catch (error) {
    console.error("Create patient error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.put("/api/patients/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { phone, email, address, emergency_contact, status } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
    if (email !== undefined) { updates.push("email = ?"); params.push(email); }
    if (address !== undefined) { updates.push("address = ?"); params.push(address); }
    if (emergency_contact !== undefined) { updates.push("emergency_contact = ?"); params.push(emergency_contact); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update." });
    }

    params.push(id);
    await run(`UPDATE patient SET ${updates.join(", ")} WHERE patient_id = ?`, params);

    publishRealtimeEvent("PatientUpdated", { patient_id: id, updates: req.body });
    res.json({ success: true, message: "Patient information updated successfully." });
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 7. APPOINTMENTS (With Double-Booking Collision Prevention)
// -----------------------------------------------------------------------------
app.get("/api/appointments", async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;
    const docId = req.query.doctor_id as string;
    const patientId = req.query.patient_id as string;

    let sql = `
      SELECT 
        a.*,
        p.first_name,
        p.last_name,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.phone AS patient_phone,
        doc.doctor_name,
        doc.room_number,
        d.department_name,
        qe.token_number,
        qe.queue_status
      FROM appointment a
      JOIN patient p ON a.patient_id = p.patient_id
      JOIN doctor doc ON a.doctor_id = doc.doctor_id
      JOIN department d ON a.department_id = d.department_id
      LEFT JOIN queue_entry qe ON a.appointment_id = qe.appointment_id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (date) { conditions.push("a.appointment_date = ?"); params.push(date); }
    if (docId) { conditions.push("a.doctor_id = ?"); params.push(Number(docId)); }
    if (patientId) { conditions.push("a.patient_id = ?"); params.push(Number(patientId)); }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY a.appointment_date DESC, a.appointment_time ASC";

    const appointments = await query<Appointment>(sql, params);
    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    console.error("Appointments error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post("/api/appointments", async (req: Request, res: Response) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit, appointment_type = "OPD", remarks } = req.body;

    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ success: false, error: "Patient, Doctor, Date, and Time are mandatory." });
    }

    const pid = Number(patient_id);
    const did = Number(doctor_id);

    // Verify patient exists
    const patient = await get<{ patient_id: number }>("SELECT patient_id FROM patient WHERE patient_id = ?", [pid]);
    if (!patient) {
      return res.status(404).json({ success: false, error: "Selected patient does not exist." });
    }

    // Verify doctor exists and get department
    const doctor = await get<{ doctor_id: number; department_id: number; doctor_name: string }>(
      "SELECT doctor_id, department_id, doctor_name FROM doctor WHERE doctor_id = ? AND status = 'Active'",
      [did]
    );
    if (!doctor) {
      return res.status(404).json({ success: false, error: "Selected doctor does not exist or is inactive." });
    }

    // CONCURRENCY & COLLISION GUARD: Prevent Double Booking
    const conflict = await get<{ appointment_id: number }>(
      `SELECT appointment_id FROM appointment 
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND appointment_status NOT IN ('Cancelled')`,
      [did, appointment_date, appointment_time]
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: `Doctor ${doctor.doctor_name} already has an active appointment at ${appointment_time} on ${appointment_date}. Please choose another slot.`,
      });
    }

    // Insert appointment atomically
    const insertRes = await run(
      `INSERT INTO appointment (
        patient_id, doctor_id, department_id, appointment_date,
        appointment_time, booking_date, reason_for_visit, appointment_type, appointment_status, remarks
      ) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, 'Scheduled', ?)`,
      [pid, did, doctor.department_id, appointment_date, appointment_time, reason_for_visit || null, appointment_type, remarks || null]
    );

    const appointmentId = insertRes.lastInsertId;

    // Create notification record
    await run(
      `INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
       VALUES (?, ?, 'Appointment Confirmation', ?, CURTIME(), 'Sent')`,
      [pid, appointmentId, `Appointment confirmed with Dr. ${doctor.doctor_name} for ${appointment_date} at ${appointment_time}.`]
    );

    // Clinical audit log
    await run(
      `INSERT INTO audit_log (actor_role, performed_by, action, entity, entity_id, details)
       VALUES ('Receptionist', 'Receptionist', 'BOOK_APPOINTMENT', 'appointment', ?, ?)`,
      [appointmentId, `Booked for patient #${pid} with doctor #${did} on ${appointment_date} ${appointment_time}`]
    );

    invalidateCacheKey(CACHE_KEYS.STATS_SUMMARY);
    publishRealtimeEvent("AppointmentBooked", { appointment_id: appointmentId, doctor_id: did, patient_id: pid });

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      appointment_id: appointmentId,
    });
  } catch (error) {
    console.error("Book appointment error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.patch("/api/appointments/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { appointment_status, appointment_date, appointment_time, remarks, doctor_id, department_id } = req.body;

    const existing = await get<{
      appointment_id: number;
      doctor_id: number;
      department_id: number;
      patient_id: number;
      appointment_date: string;
      appointment_time: string;
      appointment_status: string;
    }>(
      "SELECT appointment_id, doctor_id, department_id, patient_id, appointment_date, appointment_time, appointment_status FROM appointment WHERE appointment_id = ?",
      [id]
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: "Appointment not found." });
    }

    const targetDocId = doctor_id ? Number(doctor_id) : existing.doctor_id;
    const newDate = appointment_date || existing.appointment_date;
    const newTime = appointment_time || existing.appointment_time;

    // Collision check if rescheduling doctor, date, or time
    if (appointment_date || appointment_time || doctor_id) {
      const conflict = await get<{ appointment_id: number }>(
        `SELECT appointment_id FROM appointment 
         WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND appointment_id != ? AND appointment_status NOT IN ('Cancelled')`,
        [targetDocId, newDate, newTime, id]
      );
      if (conflict) {
        return res.status(409).json({ success: false, error: "Conflicting appointment already exists for this doctor and time slot." });
      }
    }

    let targetDeptId = department_id ? Number(department_id) : existing.department_id;
    if (doctor_id && !department_id) {
      const docDept = await get<{ department_id: number }>("SELECT department_id FROM doctor WHERE doctor_id = ?", [targetDocId]);
      if (docDept) targetDeptId = docDept.department_id;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (appointment_status) { updates.push("appointment_status = ?"); params.push(appointment_status); }
    if (appointment_date) { updates.push("appointment_date = ?"); params.push(appointment_date); }
    if (appointment_time) { updates.push("appointment_time = ?"); params.push(appointment_time); }
    if (doctor_id) { updates.push("doctor_id = ?"); params.push(targetDocId); }
    if (targetDeptId !== existing.department_id) { updates.push("department_id = ?"); params.push(targetDeptId); }
    if (remarks !== undefined) { updates.push("remarks = ?"); params.push(remarks); }

    if (updates.length > 0) {
      params.push(id);
      await run(`UPDATE appointment SET ${updates.join(", ")} WHERE appointment_id = ?`, params);
    }

    // If cancelled, cascade cancellation to active queue entry and notify
    if (appointment_status === "Cancelled") {
      await run("UPDATE queue_entry SET queue_status = 'Cancelled' WHERE appointment_id = ?", [id]);
      await run(
        `INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
         VALUES (?, ?, 'Appointment Cancelled', ?, CURTIME(), 'Sent')`,
        [existing.patient_id, id, `Appointment #APT-${id} has been cancelled.`]
      );
      publishRealtimeEvent("AppointmentCancelled", { appointment_id: id });
    } else if (appointment_date || appointment_time || doctor_id) {
      const doc = await get<{ doctor_name: string }>("SELECT doctor_name FROM doctor WHERE doctor_id = ?", [targetDocId]);
      await run(
        `INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
         VALUES (?, ?, 'Appointment Rescheduled', ?, CURTIME(), 'Sent')`,
        [existing.patient_id, id, `Appointment rescheduled with ${doc?.doctor_name || "Doctor"} for ${newDate} at ${newTime}.`]
      );
      publishRealtimeEvent("AppointmentRescheduled", { appointment_id: id, doctor_id: targetDocId, date: newDate, time: newTime });
    } else {
      publishRealtimeEvent("AppointmentUpdated", { appointment_id: id, status: appointment_status });
    }

    invalidateCacheKey(CACHE_KEYS.STATS_SUMMARY);
    res.json({ success: true, message: `Appointment ${appointment_status || "updated"} successfully.` });
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 8. QUEUE MANAGEMENT (Strict Idempotency & Triage Prioritization)
// -----------------------------------------------------------------------------
app.get("/api/queue", async (req: Request, res: Response) => {
  try {
    const docId = req.query.doctor_id as string;
    const deptId = req.query.department_id as string;
    const status = req.query.status as string;

    let sql = `
      SELECT 
        qe.*,
        p.patient_id,
        p.first_name,
        p.last_name,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.date_of_birth,
        p.phone AS patient_phone,
        doc.doctor_name,
        doc.room_number,
        d.department_name,
        a.reason_for_visit,
        a.appointment_type,
        a.appointment_time
      FROM queue_entry qe
      JOIN appointment a ON qe.appointment_id = a.appointment_id
      JOIN patient p ON a.patient_id = p.patient_id
      JOIN doctor doc ON qe.doctor_id = doc.doctor_id
      JOIN department d ON doc.department_id = d.department_id
      WHERE qe.queue_date = CURDATE()
    `;
    const params: unknown[] = [];

    if (docId) { sql += " AND qe.doctor_id = ?"; params.push(Number(docId)); }
    if (deptId) { sql += " AND doc.department_id = ?"; params.push(Number(deptId)); }
    if (status) { sql += " AND qe.queue_status = ?"; params.push(status); }

    const rawQueue = await query<QueueEntry>(sql, params);
    const sortedQueue = [...rawQueue].sort(compareQueueEntries);

    res.json({ success: true, count: sortedQueue.length, queue: sortedQueue });
  } catch (error) {
    console.error("Queue fetch error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post("/api/queue", async (req: Request, res: Response) => {
  try {
    const { appointment_id, priority_level, priority_reason } = req.body;
    if (!appointment_id) {
      return res.status(400).json({ success: false, error: "appointment_id is required for check-in." });
    }

    const apptId = Number(appointment_id);

    // Retrieve appointment and patient
    const appt = await get<{
      appointment_id: number;
      doctor_id: number;
      patient_id: number;
      appointment_status: string;
      reason_for_visit: string;
      date_of_birth: string;
    }>(
      `SELECT a.appointment_id, a.doctor_id, a.patient_id, a.appointment_status, a.reason_for_visit, p.date_of_birth
       FROM appointment a
       JOIN patient p ON a.patient_id = p.patient_id
       WHERE a.appointment_id = ?`,
      [apptId]
    );

    if (!appt) {
      return res.status(404).json({ success: false, error: "Appointment not found." });
    }

    // STRICT IDEMPOTENCY GUARD: Check if already checked in!
    const existingQueue = await get<QueueEntry>(
      "SELECT * FROM queue_entry WHERE appointment_id = ?",
      [apptId]
    );

    if (existingQueue) {
      // Patient is already in queue! Return existing token safely without error 1062!
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        message: `Patient is already checked in with Token #${existingQueue.token_number}.`,
        queue: existingQueue,
        token_number: existingQueue.token_number,
        estimated_wait_time: existingQueue.estimated_wait_time,
      });
    }

    // Determine clinical priority if not manually assigned
    const triage = evaluateTriage({
      reasonForVisit: appt.reason_for_visit,
      dateOfBirth: appt.date_of_birth,
      explicitPriority: priority_level,
      explicitReason: priority_reason,
    });
    const finalPriority = triage.priorityLevel;
    const finalReason = triage.priorityReason;

    // Generate monotonic sequential doctor token for today
    const maxTokenRow = await get<{ max_token: number }>(
      "SELECT COALESCE(MAX(token_number), ? * 100) AS max_token FROM queue_entry WHERE doctor_id = ? AND queue_date = CURDATE()",
      [appt.doctor_id, appt.doctor_id]
    );
    const assignedToken = (maxTokenRow?.max_token || appt.doctor_id * 100) + 1;

    // Count patients waiting ahead for wait time computation
    const waitingRow = await get<{ count: number }>(
      "SELECT count(*) as count FROM queue_entry WHERE doctor_id = ? AND queue_date = CURDATE() AND queue_status IN ('Waiting', 'Called')",
      [appt.doctor_id]
    );
    const estWaitTime = finalPriority === "Emergency" ? 0 : (waitingRow?.count || 0) * 15;

    // Insert into queue_entry
    const insertRes = await run(
      `INSERT INTO queue_entry (
        appointment_id, doctor_id, token_number, queue_date,
        check_in_time, estimated_wait_time, priority_level, priority_reason, queue_status
      ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, 'Waiting')`,
      [apptId, appt.doctor_id, assignedToken, estWaitTime, finalPriority, finalReason]
    );

    // Update appointment status to Checked-In
    await run("UPDATE appointment SET appointment_status = 'Checked-In' WHERE appointment_id = ?", [apptId]);

    // Dispatch automated notification
    await run(
      `INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
       VALUES (?, ?, 'Queue Token Generated', ?, CURTIME(), 'Sent')`,
      [appt.patient_id, apptId, `Token #${assignedToken} issued. Priority: ${finalPriority}. Estimated wait: ${estWaitTime} mins.`]
    );

    invalidateCacheKey(CACHE_KEYS.STATS_SUMMARY);
    publishRealtimeEvent("PatientCheckedIn", {
      queue_id: insertRes.lastInsertId,
      token_number: assignedToken,
      doctor_id: appt.doctor_id,
      priority: finalPriority,
    });

    res.status(201).json({
      success: true,
      alreadyCheckedIn: false,
      message: `Patient checked in with Token #${assignedToken}.`,
      token_number: assignedToken,
      estimated_wait_time: estWaitTime,
      queue_id: insertRes.lastInsertId,
    });
  } catch (error) {
    console.error("Queue check-in error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.patch("/api/queue/:id", async (req: Request, res: Response) => {
  try {
    const queueId = Number(req.params.id);
    const { action, queue_status, priority_level, priority_reason } = req.body;

    const existing = await get<{ queue_id: number; appointment_id: number; token_number: number }>(
      "SELECT queue_id, appointment_id, token_number FROM queue_entry WHERE queue_id = ?",
      [queueId]
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: "Queue entry not found." });
    }

    let targetStatus = queue_status;
    if (action === "call") targetStatus = "Called";
    else if (action === "start") targetStatus = "In-Consultation";
    else if (action === "skip") targetStatus = "Skipped";
    else if (action === "complete") targetStatus = "Completed";

    const updates: string[] = [];
    const params: unknown[] = [];

    if (targetStatus) {
      updates.push("queue_status = ?");
      params.push(targetStatus);
      if (targetStatus === "In-Consultation" || targetStatus === "Completed") {
        updates.push("estimated_wait_time = 0");
      }
    }
    if (priority_level) { updates.push("priority_level = ?"); params.push(priority_level); }
    if (priority_reason) { updates.push("priority_reason = ?"); params.push(priority_reason); }

    if (updates.length > 0) {
      params.push(queueId);
      await run(`UPDATE queue_entry SET ${updates.join(", ")} WHERE queue_id = ?`, params);
    }

    // Sync appointment status and notifications complying strictly with chk_app_status
    if (targetStatus === "Called") {
      const apptInfo = await get<{ patient_id: number; doctor_name: string; room_number: string }>(
        `SELECT a.patient_id, d.doctor_name, d.room_number 
         FROM appointment a 
         JOIN doctor d ON a.doctor_id = d.doctor_id 
         WHERE a.appointment_id = ?`,
        [existing.appointment_id]
      );
      if (apptInfo) {
        await run(
          `INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
           VALUES (?, ?, 'Patient Called', ?, CURTIME(), 'Sent')`,
          [apptInfo.patient_id, existing.appointment_id, `Token #${existing.token_number}: Please proceed to ${apptInfo.room_number || "OPD"} for consultation with Dr. ${apptInfo.doctor_name}.`]
        );
      }
    } else if (targetStatus === "In-Consultation") {
      await run("UPDATE appointment SET appointment_status = 'In-Progress' WHERE appointment_id = ?", [existing.appointment_id]);
    } else if (targetStatus === "Completed") {
      await run("UPDATE appointment SET appointment_status = 'Completed' WHERE appointment_id = ?", [existing.appointment_id]);
    } else if (targetStatus === "Cancelled") {
      await run("UPDATE appointment SET appointment_status = 'Cancelled' WHERE appointment_id = ?", [existing.appointment_id]);
    }

    invalidateCacheKey(CACHE_KEYS.STATS_SUMMARY);
    publishRealtimeEvent("QueueStatusChanged", { queue_id: queueId, queue_status: targetStatus });

    res.json({ success: true, message: `Queue entry transitioned to ${targetStatus || "updated"}.` });
  } catch (error) {
    console.error("Update queue error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 9. CLINICAL VISITS & PRESCRIPTIONS
// -----------------------------------------------------------------------------
app.get("/api/visits", async (req: Request, res: Response) => {
  try {
    const apptId = req.query.appointment_id as string;
    let sql = `
      SELECT 
        v.*,
        p.first_name,
        p.last_name,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        doc.doctor_name,
        d.department_name
      FROM visit v
      JOIN appointment a ON v.appointment_id = a.appointment_id
      JOIN patient p ON a.patient_id = p.patient_id
      JOIN doctor doc ON v.doctor_id = doc.doctor_id
      JOIN department d ON doc.department_id = d.department_id
    `;
    const params: unknown[] = [];
    if (apptId) {
      sql += " WHERE v.appointment_id = ?";
      params.push(Number(apptId));
    }
    sql += " ORDER BY v.visit_date DESC, v.visit_id DESC";

    const visits = await query<Visit>(sql, params);
    res.json({ success: true, count: visits.length, visits });
  } catch (error) {
    console.error("Visits error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post("/api/visits", async (req: Request, res: Response) => {
  try {
    const { appointment_id, doctor_id, diagnosis, prescription, doctor_notes, billed_amount = 0 } = req.body;
    if (!appointment_id || !doctor_id || !diagnosis) {
      return res.status(400).json({ success: false, error: "Appointment ID, Doctor ID, and Diagnosis are required." });
    }

    const apptId = Number(appointment_id);
    const docId = Number(doctor_id);

    // Insert or update visit record
    const visitRes = await run(
      `INSERT INTO visit (
        appointment_id, doctor_id, visit_date, start_time, end_time,
        diagnosis, prescription, doctor_notes, visit_status, billed_amount
      ) VALUES (?, ?, CURDATE(), CURTIME(), CURTIME(), ?, ?, ?, 'Completed', ?)`,
      [apptId, docId, diagnosis, prescription || null, doctor_notes || null, Number(billed_amount)]
    );

    // Mark queue entry and appointment as Completed
    await run("UPDATE queue_entry SET queue_status = 'Completed', estimated_wait_time = 0 WHERE appointment_id = ?", [apptId]);
    await run("UPDATE appointment SET appointment_status = 'Completed' WHERE appointment_id = ?", [apptId]);

    const patientRow = await get<{ patient_id: number; doctor_name: string }>(
      `SELECT a.patient_id, d.doctor_name 
       FROM appointment a 
       JOIN doctor d ON a.doctor_id = d.doctor_id 
       WHERE a.appointment_id = ?`,
      [apptId]
    );
    if (patientRow) {
      await run(
        `INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
         VALUES (?, ?, 'Consultation Completed', ?, CURTIME(), 'Sent')`,
        [patientRow.patient_id, apptId, `Consultation with Dr. ${patientRow.doctor_name} completed. Diagnosis: ${diagnosis.slice(0, 60)}.`]
      );
    }

    invalidateCacheKey(CACHE_KEYS.STATS_SUMMARY);
    publishRealtimeEvent("ConsultationCompleted", { appointment_id: apptId, visit_id: visitRes.lastInsertId, doctor_id: docId });
    publishRealtimeEvent("QueueStatusChanged", { appointment_id: apptId, queue_status: "Completed", visit_id: visitRes.lastInsertId });

    res.status(201).json({
      success: true,
      message: "Consultation completed and visit record filed.",
      visit_id: visitRes.lastInsertId,
    });
  } catch (error) {
    console.error("Create visit error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 10. NOTIFICATIONS
// -----------------------------------------------------------------------------
app.get("/api/notifications", async (req: Request, res: Response) => {
  try {
    const patientId = req.query.patient_id as string;
    let sql = `
      SELECT n.*, p.first_name, p.last_name 
      FROM notification n
      JOIN patient p ON n.patient_id = p.patient_id
    `;
    const params: unknown[] = [];
    if (patientId) {
      sql += " WHERE n.patient_id = ?";
      params.push(Number(patientId));
    }
    sql += " ORDER BY n.notification_id DESC LIMIT 50";

    const notifications = await query<Notification>(sql, params);
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    console.error("Notifications error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.patch("/api/notifications/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await run("UPDATE notification SET notification_status = 'Read' WHERE notification_id = ?", [id]);
    res.json({ success: true, message: "Notification marked as read." });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 11. REPORTS (Academic Syllabus Queries)
// -----------------------------------------------------------------------------
app.get("/api/reports", async (req: Request, res: Response) => {
  try {
    const queryType = req.query.type as string;

    // Default or 'all': Return comprehensive bundle expected by ReportsTab frontend
    if (!queryType || queryType === "all") {
      const priorityStats = await query(`
        SELECT 
          priority_level,
          COUNT(*) as patient_count,
          ROUND(AVG(estimated_wait_time), 1) as avg_wait_time,
          MIN(estimated_wait_time) as min_wait_time,
          MAX(estimated_wait_time) as max_wait_time
        FROM queue_entry
        GROUP BY priority_level
        ORDER BY 
          CASE priority_level
            WHEN 'Emergency' THEN 1
            WHEN 'Urgent' THEN 2
            WHEN 'Senior Citizen' THEN 3
            WHEN 'Child/Infant' THEN 4
            ELSE 5
          END ASC
      `);

      const departmentStats = await query(`
        SELECT 
          d.department_name,
          d.location,
          COUNT(DISTINCT doc.doctor_id) as total_doctors,
          COUNT(v.visit_id) as completed_visits,
          COALESCE(SUM(v.billed_amount), 0.00) as total_revenue
        FROM department d
        JOIN doctor doc ON d.department_id = doc.department_id
        LEFT JOIN visit v ON doc.doctor_id = v.doctor_id AND v.visit_status = 'Completed'
        GROUP BY d.department_id, d.department_name, d.location
        ORDER BY total_revenue DESC
      `);

      const doctorWorkload = await query(`
        SELECT 
          doc.doctor_id,
          doc.doctor_name,
          doc.specialization,
          dep.department_name,
          doc.availability_status,
          COUNT(DISTINCT a.appointment_id) as total_appointments,
          SUM(CASE WHEN qe.queue_status = 'Waiting' THEN 1 ELSE 0 END) as active_waiting,
          SUM(CASE WHEN qe.queue_status = 'Completed' THEN 1 ELSE 0 END) as completed_today
        FROM doctor doc
        JOIN department dep ON doc.department_id = dep.department_id
        LEFT JOIN appointment a ON doc.doctor_id = a.doctor_id
        LEFT JOIN queue_entry qe ON a.appointment_id = qe.appointment_id
        GROUP BY doc.doctor_id, doc.doctor_name, doc.specialization, dep.department_name, doc.availability_status
        ORDER BY active_waiting DESC, total_appointments DESC
      `);

      const hourlyDistribution = await query(`
        SELECT 
          SUBSTR(check_in_time, 1, 2) as hour_of_day,
          COUNT(*) as checkins_count
        FROM queue_entry
        WHERE check_in_time IS NOT NULL
        GROUP BY SUBSTR(check_in_time, 1, 2)
        ORDER BY hour_of_day ASC
      `);

      const doctorsAboveDeptAvg = await query(`
        SELECT 
          outer_doc.doctor_name,
          outer_doc.specialization,
          outer_doc.consultation_fee,
          d.department_name
        FROM doctor outer_doc
        JOIN department d ON outer_doc.department_id = d.department_id
        WHERE outer_doc.consultation_fee >= (
          SELECT AVG(inner_doc.consultation_fee)
          FROM doctor inner_doc
          WHERE inner_doc.department_id = outer_doc.department_id
        )
      `);

      return res.json({
        success: true,
        reports: {
          priorityStats,
          departmentStats,
          doctorWorkload,
          hourlyDistribution,
          highValueDoctors: doctorsAboveDeptAvg,
        },
      });
    }

    if (queryType === "groupby") {
      const rows = await query(`
        SELECT 
          priority_level,
          COUNT(*) AS total_patients_in_tier,
          MIN(estimated_wait_time) AS min_wait_minutes,
          AVG(estimated_wait_time) AS avg_wait_minutes,
          MAX(estimated_wait_time) AS max_wait_minutes
        FROM queue_entry
        GROUP BY priority_level
        ORDER BY 
          CASE priority_level
            WHEN 'Emergency' THEN 1
            WHEN 'Urgent' THEN 2
            WHEN 'Senior Citizen' THEN 3
            WHEN 'Child/Infant' THEN 4
            ELSE 5
          END ASC
      `);
      return res.json({ success: true, type: "groupby", count: rows.length, rows });
    }

    if (queryType === "correlated") {
      const rows = await query(`
        SELECT 
          outer_doc.doctor_id,
          outer_doc.doctor_name,
          outer_doc.specialization,
          outer_doc.consultation_fee,
          d.department_name
        FROM doctor outer_doc
        JOIN department d ON outer_doc.department_id = d.department_id
        WHERE outer_doc.consultation_fee >= (
          SELECT AVG(inner_doc.consultation_fee)
          FROM doctor inner_doc
          WHERE inner_doc.department_id = outer_doc.department_id
        )
      `);
      return res.json({ success: true, type: "correlated", count: rows.length, rows });
    }

    if (queryType === "nested") {
      const rows = await query(`
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
            WHERE doc.department_id = 1
          )
        )
      `);
      return res.json({ success: true, type: "nested", count: rows.length, rows });
    }

    res.status(400).json({ success: false, error: "Invalid report query type requested." });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 12. RECOMMENDATIONS (Level 3 Graph Doctor Discovery)
// -----------------------------------------------------------------------------
app.get("/api/recommendations", async (req: Request, res: Response) => {
  try {
    const patientId = req.query.patient_id ? Number(req.query.patient_id) : 1;
    const recommendations = await getDoctorRecommendations({
      specialtyOrReason: (req.query.specialty as string) || undefined,
    });
    res.json({ success: true, patientId, recommendations });
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// 13. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
// -----------------------------------------------------------------------------
app.get("/api/realtime", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write("event: connected\ndata: {\"status\":\"connected\",\"timestamp\":" + Date.now() + "}\n\n");

  const unsubscribe = realtimeHub.subscribe((event: RealtimeEvent) => {
    try {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    } catch {
      // Stream disconnected
    }
  });

  // Keep-alive heartbeat every 20 seconds
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeatInterval);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
  });
});

// -----------------------------------------------------------------------------
// 14. DATABASE RE-SEED (Development & Review Reset)
// -----------------------------------------------------------------------------
app.post("/api/db/reset", async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (user && user.role !== "Administrator") {
      return res.status(403).json({ success: false, error: "Administrator privileges required to reset database." });
    }
    resetDatabase();
    res.json({ success: true, message: "Database re-seeded successfully." });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// SERVER INITIALIZATION & DATABASE HEALTH VERIFICATION
// -----------------------------------------------------------------------------
app.listen(PORT, "0.0.0.0", async () => {
  console.log("============================================================");
  console.log(`  QueueCare Dedicated Backend API Server Running on Port ${PORT}`);
  console.log(`  Local Endpoint: http://localhost:${PORT}`);
  console.log(`  Target Database Mode: ${getDatabaseType().toUpperCase()}`);
  console.log("============================================================");

  const health = await checkDatabaseHealth();
  if (health.connected) {
    console.log(`✓ [Database Connected] ${health.message}`);
  } else {
    console.warn(`⚠ [Database Warning] ${health.message}`);
  }
});
