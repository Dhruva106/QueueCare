import { query, get } from "../lib/db.ts";

async function test() {
  console.log("Testing QueueCare Database Connectivity...");
  const depts = await query("SELECT * FROM department");
  console.log(`Departments loaded: ${depts.length}`);

  const patients = await query("SELECT * FROM patient");
  console.log(`Patients loaded: ${patients.length}`);

  const queue = await query("SELECT * FROM queue_entry");
  console.log(`Queue entries loaded: ${queue.length}`);

  const doctors = await query("SELECT * FROM doctor");
  console.log(`Doctors loaded: ${doctors.length}`);

  const stats = await get("SELECT count(*) as total FROM appointment");
  console.log(`Appointments count:`, stats);

  console.log("Database connectivity test PASSED!");
}

test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

