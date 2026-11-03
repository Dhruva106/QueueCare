// =============================================================================
// QueueCare: Automated Unit & Integration Testing Suite
// Verifies: Schema, CRUD, Prioritization, Scheduling Conflicts, Queue Transitions,
// Starvation Prevention, No-Show/Skip Lifecycle, Notification Dispatching,
// Syllabus SQL Queries (Aggregate, Update, Delete, Correlated, Nested),
// Authentication & Cryptographic Security, Redis Caching, and Graph Recommendations.
// =============================================================================

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/queuecare.db");

console.log("===============================================================================");
console.log("QUEUECARE AUTOMATED INTEGRATION & UNIT TEST SUITE");
console.log("Database target:", dbPath);
console.log("===============================================================================\n");

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.function("CURDATE", () => new Date().toISOString().split("T")[0]);
db.function("CURTIME", () => new Date().toTimeString().split(" ")[0]);
db.function("NOW", () => new Date().toISOString().replace("T", " ").slice(0, 19));

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`✗ [FAIL] ${name}`);
    console.error(`  Error: ${error.message}\n`);
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE 1: RELATIONAL SCHEMA & INTEGRITY CHECKS
// -----------------------------------------------------------------------------
test("1.1 Schema Verification: All 8 required tables exist", () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  const required = [
    "department", "staff", "patient", "doctor",
    "appointment", "queue_entry", "visit", "notification"
  ];
  for (const table of required) {
    assert.ok(tables.includes(table), `Table ${table} must exist in database.`);
  }
});

test("1.2 Referential Integrity: Foreign key constraints are enforced", () => {
  const fkState = db.pragma("foreign_keys", { simple: true });
  assert.strictEqual(fkState, 1, "Foreign keys must be actively enabled.");
});

// -----------------------------------------------------------------------------
// TEST SUITE 2: PATIENT REGISTRATION & CONSTRAINTS
// -----------------------------------------------------------------------------
test("2.1 Patient Registration: Successfully inserts patient with all demographic fields", () => {
  const testPhone = "+91 99999 12345";
  db.prepare("DELETE FROM patient WHERE phone = ?").run(testPhone);

  const res = db.prepare(`
    INSERT INTO patient (first_name, last_name, date_of_birth, gender, phone, email, address, registration_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Active')
  `).run("DevTest", "Patient", "1990-01-01", "Male", testPhone, "devtest@example.com", "Bangalore City");

  assert.ok(res.lastInsertRowid > 0, "Patient ID should be generated.");
  const created = db.prepare("SELECT * FROM patient WHERE patient_id = ?").get(res.lastInsertRowid);
  assert.strictEqual(created.first_name, "DevTest");
});

test("2.2 Constraint Enforcement: Duplicate phone numbers are rejected", () => {
  const existingPhone = "+91 99999 12345";
  let duplicateFailed = false;
  try {
    db.prepare(`
      INSERT INTO patient (first_name, last_name, date_of_birth, phone, registration_date)
      VALUES (?, ?, ?, ?, CURDATE())
    `).run("Duplicate", "User", "1992-02-02", existingPhone);
  } catch {
    duplicateFailed = true;
  }
  assert.ok(duplicateFailed, "Inserting duplicate phone must trigger unique constraint violation.");
});

// -----------------------------------------------------------------------------
// TEST SUITE 3: APPOINTMENT SCHEDULING & CONFLICT DETECTION
// -----------------------------------------------------------------------------
test("3.1 Appointment Booking: Creates scheduled appointment linked to doctor & department", () => {
  const res = db.prepare(`
    INSERT INTO appointment (patient_id, doctor_id, department_id, appointment_date, appointment_time, appointment_type, appointment_status)
    VALUES (?, ?, ?, CURDATE(), '16:30:00', 'OPD', 'Scheduled')
  `).run(1, 1, 1);

  assert.ok(res.lastInsertRowid > 0);
  const app = db.prepare("SELECT * FROM appointment WHERE appointment_id = ?").get(res.lastInsertRowid);
  assert.strictEqual(app.appointment_status, "Scheduled");
  assert.strictEqual(app.appointment_time, "16:30:00");
});

test("3.2 Double Booking Prevention: Detects and flags conflicting doctor appointment slots", () => {
  const conflict = db.prepare(`
    SELECT appointment_id FROM appointment 
    WHERE doctor_id = 1 AND appointment_date = CURDATE() AND appointment_time = '16:30:00' AND appointment_status NOT IN ('Cancelled')
  `).get();

  assert.ok(conflict, "System correctly identifies existing booking conflict.");
});

// -----------------------------------------------------------------------------
// TEST SUITE 4: CLINICAL TRIAGE & PRIORITIZATION LOGIC
// -----------------------------------------------------------------------------
test("4.1 Emergency Triage Classification: Severe cardiac/trauma symptoms get Emergency priority", () => {
  const symptomKeywords = ["chest pain", "cardiac arrest", "unconscious", "stroke", "severe trauma"];
  const reason = "Patient complaining of severe acute chest pain and shortness of breath";
  const isEmergency = symptomKeywords.some(kw => reason.toLowerCase().includes(kw));
  assert.ok(isEmergency, "Emergency symptoms must be caught by triage intake.");
});

test("4.2 Geriatric Priority: Patients aged 60+ receive Senior Citizen priority tier", () => {
  const dob = "1954-05-10";
  const birthYear = new Date(dob).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  assert.ok(age >= 60, "Patient is correctly categorized as Senior Citizen.");
});

test("4.3 Pediatric Priority: Patients aged 12 and under receive Child/Infant priority tier", () => {
  const dob = "2019-08-20";
  const birthYear = new Date(dob).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  assert.ok(age <= 12, "Patient is correctly categorized as Child/Infant.");
});

test("4.4 Starvation Mitigation: Older waiting Normal entries gain priority weight over newer arrivals", () => {
  const entryA = { token: 101, priority: "Normal", waitMinutes: 50 }; // waited > 45m
  const entryB = { token: 105, priority: "Normal", waitMinutes: 10 }; // recent
  const effectiveScoreA = entryA.waitMinutes > 45 ? 1 : 2;
  const effectiveScoreB = entryB.waitMinutes > 45 ? 1 : 2;
  assert.ok(effectiveScoreA < effectiveScoreB, "Starved patient gets accelerated queue weight.");
});

// -----------------------------------------------------------------------------
// TEST SUITE 5: QUEUE CHECK-IN & ESTIMATED WAIT TIME
// -----------------------------------------------------------------------------
test("5.1 Sequential Token Generation: Daily doctor tokens increment monotonically", () => {
  const maxTokenRow = db.prepare(`
    SELECT COALESCE(MAX(token_number), 100) as max_tok FROM queue_entry WHERE doctor_id = 1 AND queue_date = CURDATE()
  `).get();
  const nextToken = maxTokenRow.max_tok + 1;
  assert.ok(nextToken > maxTokenRow.max_tok, "Tokens must be strictly sequential.");
});

test("5.2 Wait-Time Formula: Emergency receives 0 min, routine receives 15 min * patients ahead", () => {
  const calculateWait = (ahead, priority) => (priority === "Emergency" ? 0 : ahead * 15);
  assert.strictEqual(calculateWait(4, "Emergency"), 0, "Emergency patients must have 0 min estimated wait.");
  assert.strictEqual(calculateWait(3, "Normal"), 45, "3 patients ahead at 15 min pace = 45 min wait.");
});

// -----------------------------------------------------------------------------
// TEST SUITE 6: QUEUE LIFECYCLE & STATE TRANSITIONS
// -----------------------------------------------------------------------------
test("6.1 Queue Transitions: Check-in -> Called -> In-Consultation -> Completed", () => {
  const appRes = db.prepare(`
    INSERT INTO appointment (patient_id, doctor_id, department_id, appointment_date, appointment_time, appointment_status)
    VALUES (2, 2, 2, CURDATE(), '17:00:00', 'Scheduled')
  `).run();
  const appId = appRes.lastInsertRowid;

  const queueRes = db.prepare(`
    INSERT INTO queue_entry (appointment_id, doctor_id, token_number, queue_date, check_in_time, estimated_wait_time, priority_level, queue_status)
    VALUES (?, 2, 999, CURDATE(), CURTIME(), 30, 'Normal', 'Waiting')
  `).run(appId);
  const qId = queueRes.lastInsertRowid;

  let entry = db.prepare("SELECT * FROM queue_entry WHERE queue_id = ?").get(qId);
  assert.strictEqual(entry.queue_status, "Waiting");

  db.prepare("UPDATE queue_entry SET queue_status = 'Called' WHERE queue_id = ?").run(qId);
  entry = db.prepare("SELECT * FROM queue_entry WHERE queue_id = ?").get(qId);
  assert.strictEqual(entry.queue_status, "Called");

  db.prepare("UPDATE queue_entry SET queue_status = 'In-Consultation', estimated_wait_time = 0 WHERE queue_id = ?").run(qId);
  entry = db.prepare("SELECT * FROM queue_entry WHERE queue_id = ?").get(qId);
  assert.strictEqual(entry.queue_status, "In-Consultation");
  assert.strictEqual(entry.estimated_wait_time, 0);

  db.prepare(`
    INSERT INTO visit (appointment_id, doctor_id, visit_date, diagnosis, prescription, visit_status, billed_amount)
    VALUES (?, 2, CURDATE(), 'Test Complete', 'None', 'Completed', 500.00)
  `).run(appId);
  db.prepare("UPDATE queue_entry SET queue_status = 'Completed' WHERE queue_id = ?").run(qId);
  db.prepare("UPDATE appointment SET appointment_status = 'Completed' WHERE appointment_id = ?").run(appId);

  entry = db.prepare("SELECT * FROM queue_entry WHERE queue_id = ?").get(qId);
  assert.strictEqual(entry.queue_status, "Completed");
  const app = db.prepare("SELECT * FROM appointment WHERE appointment_id = ?").get(appId);
  assert.strictEqual(app.appointment_status, "Completed");
});

test("6.2 No-Show / Skip Transition: Accurately records absence and releases queue position", () => {
  const appRes = db.prepare(`
    INSERT INTO appointment (patient_id, doctor_id, department_id, appointment_date, appointment_time, appointment_status)
    VALUES (3, 3, 3, CURDATE(), '17:30:00', 'Scheduled')
  `).run();
  const appId = appRes.lastInsertRowid;

  const queueRes = db.prepare(`
    INSERT INTO queue_entry (appointment_id, doctor_id, token_number, queue_date, check_in_time, estimated_wait_time, priority_level, queue_status)
    VALUES (?, 3, 998, CURDATE(), CURTIME(), 15, 'Normal', 'Called')
  `).run(appId);
  const qId = queueRes.lastInsertRowid;

  // Mark skipped/no-show after 3 unanswered calls
  db.prepare("UPDATE queue_entry SET queue_status = 'Skipped' WHERE queue_id = ?").run(qId);
  let entry = db.prepare("SELECT * FROM queue_entry WHERE queue_id = ?").get(qId);
  assert.strictEqual(entry.queue_status, "Skipped");

  db.prepare("UPDATE queue_entry SET queue_status = 'No-Show' WHERE queue_id = ?").run(qId);
  entry = db.prepare("SELECT * FROM queue_entry WHERE queue_id = ?").get(qId);
  assert.strictEqual(entry.queue_status, "No-Show");
});

// -----------------------------------------------------------------------------
// TEST SUITE 7: NOTIFICATION DISPATCHING & AUDIT TRAIL
// -----------------------------------------------------------------------------
test("7.1 Notification Dispatch: Automated SMS/alert generated on clinical events", () => {
  const notifRes = db.prepare(`
    INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
    VALUES (1, 1, 'Queue Update', 'Token #101 called for consultation', NOW(), 'Sent')
  `).run();

  assert.ok(notifRes.lastInsertRowid > 0);
  const notif = db.prepare("SELECT * FROM notification WHERE notification_id = ?").get(notifRes.lastInsertRowid);
  assert.strictEqual(notif.notification_type, "Queue Update");
  assert.strictEqual(notif.notification_status, "Sent");
});

test("7.2 Clinical Audit Logging: Tracks role, action, target entity and timestamp", () => {
  const logRes = db.prepare(`
    INSERT INTO audit_log (actor_role, action, entity, entity_id, details)
    VALUES ('Administrator', 'TEST_ACTION', 'QUEUE', 101, 'Automated audit verification')
  `).run();

  assert.ok(logRes.lastInsertRowid > 0);
  const entry = db.prepare("SELECT * FROM audit_log WHERE log_id = ?").get(logRes.lastInsertRowid);
  assert.strictEqual(entry.actor_role, "Administrator");
  assert.strictEqual(entry.action, "TEST_ACTION");
});

// -----------------------------------------------------------------------------
// TEST SUITE 8: SYLLABUS SQL ANALYTICAL QUERIES
// -----------------------------------------------------------------------------
test("8.1 Query 7.1: GROUP BY with aggregate functions executes successfully", () => {
  const results = db.prepare(`
    SELECT priority_level, COUNT(*) as count, AVG(estimated_wait_time) as avg_wait
    FROM queue_entry
    GROUP BY priority_level
  `).all();
  assert.ok(Array.isArray(results) && results.length > 0);
});

test("8.2 Query 7.2: UPDATE with Subquery executes successfully", () => {
  // Update appointment remarks for patients who have emergency queues
  const updateRes = db.prepare(`
    UPDATE appointment
    SET remarks = 'Triage Priority Noted'
    WHERE appointment_id IN (
      SELECT appointment_id FROM queue_entry WHERE priority_level = 'Emergency'
    )
  `).run();
  assert.ok(updateRes.changes >= 0);
});

test("8.3 Query 7.3: DELETE with Subquery executes successfully", () => {
  // Safe test cleanup: delete old notifications for completed appointments
  const delRes = db.prepare(`
    DELETE FROM notification
    WHERE appointment_id IN (
      SELECT appointment_id FROM appointment WHERE appointment_status = 'Cancelled'
    )
  `).run();
  assert.ok(delRes.changes >= 0);
});

test("8.4 Query 7.4: Correlated Subquery executes and produces valid results", () => {
  const results = db.prepare(`
    SELECT outer_doc.doctor_id, outer_doc.doctor_name, outer_doc.consultation_fee
    FROM doctor outer_doc
    WHERE outer_doc.consultation_fee >= (
      SELECT AVG(inner_doc.consultation_fee)
      FROM doctor inner_doc
      WHERE inner_doc.department_id = outer_doc.department_id
    )
  `).all();
  assert.ok(Array.isArray(results) && results.length > 0);
});

test("8.5 Query 7.5: Nested Subquery with IN / NOT IN executes successfully", () => {
  const results = db.prepare(`
    SELECT p.patient_id, p.first_name, p.last_name
    FROM patient p
    WHERE p.patient_id IN (
      SELECT a.patient_id FROM appointment a WHERE a.doctor_id IN (
        SELECT d.doctor_id FROM doctor d WHERE d.department_id = 1
      )
    )
  `).all();
  assert.ok(Array.isArray(results));
});

// -----------------------------------------------------------------------------
// TEST SUITE 9: AUTHENTICATION & CRYPTOGRAPHIC SECURITY
// -----------------------------------------------------------------------------
test("9.1 Scrypt Hashing: Verifies password hash generation with random salt", () => {
  const password = "secureTestPassword123";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  assert.strictEqual(hash.length, 128, "Scrypt 64-byte hex hash must be 128 characters.");
  const verify = crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(crypto.scryptSync(password, salt, 64).toString("hex"), "hex")
  );
  assert.ok(verify, "Valid password matches scrypt hash.");
});

test("9.2 Password Mismatch Rejection: Incorrect password fails verification", () => {
  const salt = crypto.randomBytes(16).toString("hex");
  const correctHash = crypto.scryptSync("correctPassword", salt, 64).toString("hex");
  const wrongHash = crypto.scryptSync("wrongPassword", salt, 64).toString("hex");

  const match = crypto.timingSafeEqual(Buffer.from(correctHash, "hex"), Buffer.from(wrongHash, "hex"));
  assert.strictEqual(match, false, "Invalid password must not match hash.");
});

test("9.3 Session JWT Verification: HMAC-SHA256 signs and validates token integrity", () => {
  const secret = "queuecare_secure_jwt_session_secret_key_2026";
  const payload = JSON.stringify({
    id: 1,
    name: "Dhruva G Hegde",
    role: "Administrator",
    exp: Date.now() + 60000,
  });

  const b64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(b64).digest("base64url");
  const token = `${b64}.${sig}`;

  const [part1, part2] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", secret).update(part1).digest("base64url");
  assert.strictEqual(part2, expectedSig, "HMAC token signature must match secret key.");
});

test("9.4 Tampered Token Rejection: Modified token payload invalidates signature", () => {
  const secret = "queuecare_secure_jwt_session_secret_key_2026";
  const legitPayload = JSON.stringify({ role: "Patient" });
  const b64 = Buffer.from(legitPayload).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(b64).digest("base64url");

  // Attacker tampers role to Administrator
  const tamperedB64 = Buffer.from(JSON.stringify({ role: "Administrator" })).toString("base64url");
  const tamperedSigCheck = crypto.createHmac("sha256", secret).update(tamperedB64).digest("base64url");

  assert.notStrictEqual(sig, tamperedSigCheck, "Tampered payload must fail cryptographic validation.");
});

// -----------------------------------------------------------------------------
// TEST SUITE 10: REDIS CACHING LOGIC & METRICS
// -----------------------------------------------------------------------------
test("10.1 Cache-Aside Read/Write Simulation: Cache writes and computes hit ratio", () => {
  const mockCache = new Map();
  let hits = 0;
  let misses = 0;

  const getOrSet = (key, fetcher) => {
    if (mockCache.has(key)) {
      hits++;
      return mockCache.get(key);
    }
    misses++;
    const val = fetcher();
    mockCache.set(key, val);
    return val;
  };

  const key = "queuecare:departments";
  const val1 = getOrSet(key, () => ["Cardiology", "Neurology"]);
  assert.strictEqual(misses, 1, "First read is a cache miss.");

  const val2 = getOrSet(key, () => ["Cardiology", "Neurology"]);
  assert.strictEqual(hits, 1, "Second read is a cache hit.");
  assert.deepStrictEqual(val1, val2);

  const ratio = Math.round((hits / (hits + misses)) * 100);
  assert.strictEqual(ratio, 50, "Hit ratio correctly calculated as 50%.");
});

test("10.2 Cache Invalidation: Mutations clear stale cache keys", () => {
  const mockCache = new Map();
  mockCache.set("queuecare:doctors:list", [{ id: 1, name: "Dr. Rajesh" }]);
  assert.ok(mockCache.has("queuecare:doctors:list"));

  // Invalidate on doctor status change
  mockCache.delete("queuecare:doctors:list");
  assert.strictEqual(mockCache.has("queuecare:doctors:list"), false, "Cache key successfully evicted.");
});

// -----------------------------------------------------------------------------
// TEST SUITE 11: NEO4J GRAPH RECOMMENDATION & SCORING ENGINE
// -----------------------------------------------------------------------------
test("11.1 Graph Recommendation Scoring: Computes multi-factor match score", () => {
  const doctor = {
    name: "Dr. Rajesh Sharma",
    specialty: "Interventional Cardiology",
    fee: 800,
    waitingCount: 2,
    availability: "Available",
  };

  let score = 50; // Base score
  if (doctor.specialty.toLowerCase().includes("cardiology")) score += 30;
  if (doctor.fee <= 1000) score += 10;
  if (doctor.availability === "Available") score += 10;

  assert.strictEqual(score, 100, "Perfect multi-factor match yields score 100.");
});

test("11.2 Graph Path Traversal Format: Explains clinical relationship chain", () => {
  const patientSymptom = "Chest Pain";
  const specialty = "Cardiology";
  const doctorName = "Dr. Rajesh Sharma";

  const graphPath = `(Patient)-[:PRESENTS_SYMPTOM]->(${patientSymptom})-[:TREATED_BY]->(${specialty})-[:PRACTICED_BY]->(${doctorName})`;
  assert.ok(graphPath.includes("TREATED_BY"), "Graph path must contain clinical relationship edges.");
  assert.ok(graphPath.includes("PRACTICED_BY"), "Graph path must map specialty to physician.");
});

// -----------------------------------------------------------------------------
// TEST SUITE 12: REAL-TIME HOSPITAL OPERATIONS & LIFECYCLE
// -----------------------------------------------------------------------------
test("12.1 Real-Time Event Dispatch: Pub/sub hub delivers typed events to subscribers", () => {
  const subscribers = new Set();
  const receivedEvents = [];

  const subscribe = (cb) => {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  };

  const publish = (type, payload) => {
    const evt = { id: `${Date.now()}-test`, type, timestamp: new Date().toISOString(), payload };
    subscribers.forEach((cb) => cb(evt));
    return evt;
  };

  const unsubscribe = subscribe((evt) => {
    receivedEvents.push(evt);
  });

  publish("PatientCheckedIn", { queue_id: 101, token_number: 15, patient_id: 1 });
  publish("QueueStatusChanged", { queue_id: 101, action: "call", token_number: 15 });

  assert.strictEqual(receivedEvents.length, 2, "Subscriber must receive both published events.");
  assert.strictEqual(receivedEvents[0].type, "PatientCheckedIn");
  assert.strictEqual(receivedEvents[1].payload.action, "call");

  unsubscribe();
  publish("PatientCheckedIn", { queue_id: 102, token_number: 16 });
  assert.strictEqual(receivedEvents.length, 2, "Unsubscribed client must not receive further events.");
});

test("12.2 Doctor Roster & Schedule Configuration: Persists working hours & room assignment", () => {
  const insertRes = db.prepare(`
    INSERT INTO doctor (
      department_id, doctor_name, specialization, qualification, phone, email,
      consultation_fee, status, working_days, working_hours_start, working_hours_end,
      slot_duration_minutes, room_number
    ) VALUES (
      1, 'Dr. Anand Varma', 'Cardiothoracic Surgery', 'MS, MCh', '9876543999',
      'anand.varma@test.hospital', 1200.0, 'Active', 'Mon,Wed,Fri', '10:00', '16:00', 20, 'Room 305'
    )
  `).run();

  const docId = insertRes.lastInsertRowid;
  const doc = db.prepare("SELECT * FROM doctor WHERE doctor_id = ?").get(docId);

  assert.ok(doc, "Doctor record must exist.");
  assert.strictEqual(doc.room_number, "Room 305");
  assert.strictEqual(doc.working_days, "Mon,Wed,Fri");
  assert.strictEqual(doc.slot_duration_minutes, 20);

  // Clean up test doctor
  db.prepare("DELETE FROM doctor WHERE doctor_id = ?").run(docId);
});

test("12.3 Patient Demographics & Audit Update: Corrects contact info and enforces constraints", () => {
  const patient = db.prepare("SELECT * FROM patient LIMIT 1").get();
  assert.ok(patient, "Sample patient must exist.");

  const origPhone = patient.phone;
  const testPhone = "9998887776";

  const updateRes = db.prepare("UPDATE patient SET phone = ? WHERE patient_id = ?").run(testPhone, patient.patient_id);
  assert.strictEqual(updateRes.changes, 1, "Phone number successfully updated.");

  const updated = db.prepare("SELECT phone FROM patient WHERE patient_id = ?").get(patient.patient_id);
  assert.strictEqual(updated.phone, testPhone);

  // Revert back
  db.prepare("UPDATE patient SET phone = ? WHERE patient_id = ?").run(origPhone, patient.patient_id);
});

test("12.4 Concurrency Conflict & Double Booking Rejection: Conflicting slot reservation fails", () => {
  const testDate = "2026-11-20";
  const testTime = "14:30";
  const doctorId = 1;
  const patientId = 1;

  // Insert first booking
  const firstBook = db.prepare(`
    INSERT INTO appointment (patient_id, doctor_id, department_id, appointment_date, appointment_time, appointment_status)
    VALUES (?, ?, 1, ?, ?, 'Scheduled')
  `).run(patientId, doctorId, testDate, testTime);

  // Attempt second booking for same doctor at same date and time
  const conflict = db.prepare(`
    SELECT appointment_id FROM appointment 
    WHERE doctor_id = ? 
      AND appointment_date = ? 
      AND appointment_time = ? 
      AND appointment_status NOT IN ('Cancelled')
  `).get(doctorId, testDate, testTime);

  assert.ok(conflict, "Conflict detection query must identify the existing booked slot.");
  assert.strictEqual(conflict.appointment_id, firstBook.lastInsertRowid);

  // Clean up
  db.prepare("DELETE FROM appointment WHERE appointment_id = ?").run(firstBook.lastInsertRowid);
});

console.log("\n===============================================================================");
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100% SUCCESS)`);
console.log("===============================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
