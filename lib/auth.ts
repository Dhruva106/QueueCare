// =============================================================================
// QueueCare: Secure Authentication & Role-Based Access Control (RBAC)
// Supports Patient, Doctor, Receptionist, and Administrator roles with
// PBKDF2/scrypt password hashing, session tokens, and route permission guards.
// =============================================================================

import crypto from "crypto";

export type UserRole = "Patient" | "Doctor" | "Receptionist" | "Administrator";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  linkedPatientId?: number | null;
  linkedDoctorId?: number | null;
  linkedStaffId?: number | null;
}

const JWT_SECRET = process.env.AUTH_SECRET || "queuecare_secure_jwt_session_secret_key_2026";

/**
 * Hashes a plaintext password using cryptographically secure scrypt
 */
export function hashPassword(password: string, providedSalt?: string): { hash: string; salt: string } {
  const salt = providedSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

/**
 * Verifies a plaintext password against a stored scrypt hash and salt
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

/**
 * Encodes an authenticated session token
 */
export function createSessionToken(user: AuthUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days expiration
  });
  const base64 = Buffer.from(payload).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(base64).digest("base64url");
  return `${base64}.${signature}`;
}

/**
 * Decodes and verifies a session token
 */
export function verifySessionToken(token?: string | null): AuthUser | null {
  if (!token || !token.includes(".")) return null;
  const [base64, signature] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(base64).digest("base64url");

  if (signature !== expectedSig) {
    return null;
  }

  try {
    const json = Buffer.from(base64, "base64url").toString("utf-8");
    const data = JSON.parse(json);
    if (data.exp && Date.now() > data.exp) {
      return null; // Expired
    }
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      linkedPatientId: data.linkedPatientId,
      linkedDoctorId: data.linkedDoctorId,
      linkedStaffId: data.linkedStaffId,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from a Next.js request
 */
export function getAuthenticatedUser(request: {
  cookies: { get: (name: string) => { value?: string } | undefined };
  headers: { get: (name: string) => string | null };
}): AuthUser | null {
  const cookieToken = request.cookies.get("queuecare_session")?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = cookieToken || bearerToken;
  return verifySessionToken(token);
}

/**
 * RBAC Permission Checks
 */
export const Permissions = {
  canManageClinic: (role: UserRole) => role === "Administrator",
  canManageDoctors: (role: UserRole) => role === "Administrator",
  canOperateQueue: (role: UserRole) => role === "Receptionist" || role === "Administrator",
  canConductConsultation: (role: UserRole) => role === "Doctor" || role === "Administrator",
  canBookAppointments: () => true, // Everyone can book
  canViewReports: (role: UserRole) => role === "Administrator" || role === "Receptionist",
};

export interface DemoPersona {
  key: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  initials: string;
  linkedDoctorId?: number;
  linkedPatientId?: number;
}

/**
 * Seed Demo Personas for Evaluation (including both team administrators and doctors)
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    key: "admin_dhruva",
    email: "dhruva.admin@queuecare.hospital",
    name: "Dhruva G Hegde",
    role: "Administrator",
    title: "Project Lead & System Admin",
    initials: "DH",
  },
  {
    key: "admin_pramath",
    email: "pramath.admin@queuecare.hospital",
    name: "Pramath G Hegde",
    role: "Administrator",
    title: "Co-Lead & System Admin",
    initials: "PH",
  },
  {
    key: "doctor",
    email: "dr.rajesh@queuecare.hospital",
    name: "Dr. Rajesh Sharma",
    role: "Doctor",
    title: "Interventional Cardiology · Room 101",
    initials: "RS",
    linkedDoctorId: 1,
  },
  {
    key: "doctor_sunita",
    email: "dr.sunita@queuecare.hospital",
    name: "Dr. Sunita Kulkarni",
    role: "Doctor",
    title: "Internal Medicine & Diabetology · Room 102",
    initials: "SK",
    linkedDoctorId: 2,
  },
  {
    key: "doctor_vikram",
    email: "dr.vikram@queuecare.hospital",
    name: "Dr. Vikram Adiga",
    role: "Doctor",
    title: "Joint Replacement & Orthopedics · Room 103",
    initials: "VA",
    linkedDoctorId: 3,
  },
  {
    key: "receptionist",
    email: "kavya.r@queuecare.hospital",
    name: "Kavya Raman",
    role: "Receptionist",
    title: "Queue & Intake Desk",
    initials: "KR",
  },
  {
    key: "patient",
    email: "patient@queuecare.hospital",
    name: "Aarav Sharma",
    role: "Patient",
    title: "Patient Self-Service Portal",
    initials: "PT",
    linkedPatientId: 1,
  },
];

export const DEMO_USERS: Record<string, { email: string; name: string; role: UserRole }> = {
  Administrator: DEMO_PERSONAS[0],
  Doctor: DEMO_PERSONAS[2],
  Receptionist: DEMO_PERSONAS[3],
  Patient: DEMO_PERSONAS[4],
};
