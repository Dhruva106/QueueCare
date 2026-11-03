import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "queuecare.db"));
db.pragma("foreign_keys = ON");
db.function("CURDATE", () => new Date().toISOString().split("T")[0]);
db.function("CURTIME", () => new Date().toTimeString().split(" ")[0]);
db.function("NOW", () => new Date().toISOString().replace("T", " ").slice(0, 19));

console.log("Checking QueueCare SQLite tables...");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log("Existing tables:", tables.map(t => t.name));

const deptCount = db.prepare("SELECT count(*) as count FROM department").get();
console.log("Department rows:", deptCount.count);

const patientCount = db.prepare("SELECT count(*) as count FROM patient").get();
console.log("Patient rows:", patientCount.count);

const doctorCount = db.prepare("SELECT count(*) as count FROM doctor").get();
console.log("Doctor rows:", doctorCount.count);

const queueCount = db.prepare("SELECT count(*) as count FROM queue_entry").get();
console.log("Queue rows:", queueCount.count);

console.log("SUCCESS: Database schema, tables, and rows confirmed!");

