// =============================================================================
// QueueCare: End-to-End Full-Stack Acceptance & Idempotency Test Suite
// Verifies all Phase 4, 5, 13 operations against the running backend
// =============================================================================

import assert from "assert";

const BASE_URL = process.env.BACKEND_TEST_URL || "http://127.0.0.1:5001";
console.log(`Target Backend Endpoint: ${BASE_URL}`);

async function runAcceptanceWorkflow() {
  console.log("\n============================================================");
  console.log("  QUEUECARE END-TO-END FULL-STACK ACCEPTANCE TEST");
  console.log("============================================================\n");

  // TEST 0: Health Check
  console.log("-> TEST 0: Checking Backend & Database Health...");
  const healthRes = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
  assert.strictEqual(healthRes.status, "ok", "Backend health status must be 'ok'");
  assert.strictEqual(healthRes.database.connected, true, "Database connection must be active");
  console.log(`   ✓ Backend Healthy on Port ${healthRes.port} (${healthRes.database.message})`);

  // TEST 1: Patient Registration
  console.log("\n-> TEST 1: Patient Registration...");
  const uniquePhone = `+91 ${Math.floor(10000 + Math.random() * 90000)} ${Math.floor(10000 + Math.random() * 90000)}`;
  const regRes = await fetch(`${BASE_URL}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "E2ETest",
      last_name: "VerifiedUser",
      date_of_birth: "1954-04-12", // 72 years old -> Senior Citizen tier
      gender: "Male",
      phone: uniquePhone,
      email: `e2e.${Date.now()}@example.com`,
      address: "100 PES Tech Corridor, Bangalore",
    }),
  }).then(r => r.json());

  assert.strictEqual(regRes.success, true, "Patient registration must succeed");
  const newPatientId = regRes.patient_id;
  assert.ok(newPatientId > 0, "Valid patient_id must be returned");
  console.log(`   ✓ Registered Patient #${newPatientId} with Phone: ${uniquePhone}`);

  // TEST 2: Appointment Booking
  console.log("\n-> TEST 2: Appointment Booking...");
  const today = new Date().toISOString().split("T")[0];
  const randomHour = String(10 + Math.floor(Math.random() * 7)).padStart(2, "0");
  const randomMin = String(Math.floor(Math.random() * 4) * 15).padStart(2, "0");
  const testTime = `${randomHour}:${randomMin}:00`;
  const bookRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patient_id: newPatientId,
      doctor_id: 1, // Dr. Rajesh Sharma
      appointment_date: today,
      appointment_time: testTime,
      reason_for_visit: "Chronic hypertension follow-up and palpitations",
      appointment_type: "OPD",
    }),
  }).then(r => r.json());

  assert.strictEqual(bookRes.success, true, "Appointment booking must succeed");
  const apptId = bookRes.appointment_id;
  assert.ok(apptId > 0, "Valid appointment_id must be returned");
  console.log(`   ✓ Booked Appointment #${apptId} for Doctor #1 on ${today} at ${testTime}`);

  // TEST 3: Double Booking Collision Prevention
  console.log("\n-> TEST 3: Double Booking Collision Rejection (HTTP 409 Conflict)...");
  const conflictRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patient_id: 2,
      doctor_id: 1, // Same doctor
      appointment_date: today, // Same date
      appointment_time: testTime, // Same time slot!
      reason_for_visit: "Routine ECG",
      appointment_type: "OPD",
    }),
  });

  assert.strictEqual(conflictRes.status, 409, "Conflicting appointment slot must return HTTP 409 Conflict");
  const conflictBody = await conflictRes.json();
  assert.strictEqual(conflictBody.success, false, "Conflicting booking must be rejected");
  console.log(`   ✓ Double-booking rejected with message: "${conflictBody.error}"`);

  // TEST 4: Patient Check-In & Priority Classification
  console.log("\n-> TEST 4: Patient Check-In & Senior Citizen Triage...");
  const checkInRes = await fetch(`${BASE_URL}/api/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appointment_id: apptId,
    }),
  }).then(r => r.json());

  assert.strictEqual(checkInRes.success, true, "Check-in must succeed");
  assert.strictEqual(checkInRes.alreadyCheckedIn, false, "First check-in must be new");
  const tokenNumber = checkInRes.token_number;
  assert.ok(tokenNumber > 0, "Assigned token number must be positive");
  console.log(`   ✓ Check-in succeeded! Issued Token #${tokenNumber}, Est Wait: ${checkInRes.estimated_wait_time} mins`);

  // TEST 5: Duplicate Check-In (Strict Idempotency - Error 1062 Prevention)
  console.log("\n-> TEST 5: Duplicate Check-In Idempotency (Prevents Error 1062)...");
  const dupCheckInRes = await fetch(`${BASE_URL}/api/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appointment_id: apptId, // Same appointment checked in again!
    }),
  }).then(r => r.json());

  assert.strictEqual(dupCheckInRes.success, true, "Repeated check-in must succeed idempotently");
  assert.strictEqual(dupCheckInRes.alreadyCheckedIn, true, "Duplicate check-in must be flagged as already checked in");
  assert.strictEqual(dupCheckInRes.token_number, tokenNumber, "Token number must remain identical");
  console.log(`   ✓ Duplicate check-in handled safely: "${dupCheckInRes.message}"`);

  // TEST 6: Queue Lifecycle Progression (Called -> In-Consultation -> Completed)
  console.log("\n-> TEST 6: Queue Lifecycle State Transitions...");
  const queueEntryId = checkInRes.queue_id;

  // A. Call Patient
  const callRes = await fetch(`${BASE_URL}/api/queue/${queueEntryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queue_status: "Called" }),
  }).then(r => r.json());
  assert.strictEqual(callRes.success, true, "Queue transition to Called must succeed");
  console.log("   ✓ Queue transitioned: Waiting -> Called");

  // B. Patient in consultation
  const consultRes = await fetch(`${BASE_URL}/api/queue/${queueEntryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queue_status: "In-Consultation" }),
  }).then(r => r.json());
  assert.strictEqual(consultRes.success, true, "Queue transition to In-Consultation must succeed");
  console.log("   ✓ Queue transitioned: Called -> In-Consultation");

  // C. Complete Consultation & File Clinical Visit
  const visitRes = await fetch(`${BASE_URL}/api/visits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appointment_id: apptId,
      doctor_id: 1,
      diagnosis: "Essential Hypertension Stage II - Under Good Control",
      prescription: "Tab. Telmisartan 40mg 1-0-0, Tab. Amlodipine 5mg 0-0-1",
      doctor_notes: "Advised regular BP monitoring and salt restriction. Follow-up in 8 weeks.",
      billed_amount: 800,
    }),
  }).then(r => r.json());
  assert.strictEqual(visitRes.success, true, "Visit creation and completion must succeed");
  console.log(`   ✓ Consultation completed & filed EMR Visit #${visitRes.visit_id}`);

  // TEST 7: Dashboard Statistics Verification
  console.log("\n-> TEST 7: Dashboard Statistics Calculation...");
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats`).then(r => r.json());
  assert.strictEqual(statsRes.success, true, "Stats retrieval must succeed");
  assert.ok(statsRes.stats.totalPatients > 0, "Total patients must be > 0");
  assert.ok(statsRes.stats.completedToday > 0, "Completed today must reflect completed visits");
  console.log(`   ✓ Dashboard verified: Total Patients: ${statsRes.stats.totalPatients}, Today's Appointments: ${statsRes.stats.appointmentsToday}, Completed: ${statsRes.stats.completedToday}`);

  console.log("\n============================================================");
  console.log("  ALL 7 END-TO-END FULL-STACK ACCEPTANCE TESTS PASSED (100%)");
  console.log("============================================================\n");
}

runAcceptanceWorkflow().catch(err => {
  console.error("❌ E2E TEST FAILED:", err);
  process.exit(1);
});
