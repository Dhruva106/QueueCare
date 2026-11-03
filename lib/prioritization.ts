// =============================================================================
// QueueCare: Prioritization Engine & Wait-Time Estimation Logic
// =============================================================================

import { PriorityLevel } from "./types";

export interface TriageInput {
  dateOfBirth?: string;
  reasonForVisit?: string;
  appointmentType?: string;
  explicitPriority?: PriorityLevel;
  explicitReason?: string;
}

export interface TriageResult {
  priorityLevel: PriorityLevel;
  priorityReason: string;
  numericRank: number; // 1 (Highest) to 5 (Standard)
}

/**
 * Calculates accurate age from YYYY-MM-DD string
 */
export function calculateAge(dobString?: string): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Priority rank mapping: lower number = higher queue precedence
 */
export const PRIORITY_RANKS: Record<PriorityLevel, number> = {
  "Emergency": 1,
  "Urgent": 2,
  "Senior Citizen": 3,
  "Child/Infant": 4,
  "Normal": 5,
};

/**
 * Automatic Triage Assessment based on clinical indicators and patient demographics.
 * NOTE: Algorithmic triage is supportive and authorized clinical staff can override
 * at any time. Immediate life-threatening cases must be transferred to the ER immediately.
 */
export function evaluateTriage(input: TriageInput): TriageResult {
  if (input.explicitPriority && input.explicitPriority !== "Normal") {
    return {
      priorityLevel: input.explicitPriority,
      priorityReason: input.explicitReason || `Manual clinical override: ${input.explicitPriority}`,
      numericRank: PRIORITY_RANKS[input.explicitPriority],
    };
  }

  const reason = (input.reasonForVisit || "").toLowerCase();
  const appointmentType = (input.appointmentType || "").toLowerCase();
  const age = calculateAge(input.dateOfBirth);

  // 1. Emergency detection (Severe life or organ threats)
  const emergencyKeywords = [
    "chest pain", "cardiac arrest", "unconscious", "stroke", "severe trauma",
    "heavy bleeding", "anaphylaxis", "respiratory failure", "collapsed", "emergency"
  ];
  if (emergencyKeywords.some((kw) => reason.includes(kw)) || appointmentType === "emergency") {
    return {
      priorityLevel: "Emergency",
      priorityReason: "High-acuity symptoms detected (Immediate medical attention required)",
      numericRank: 1,
    };
  }

  // 2. Urgent detection (Acute high pain, high fever, fractured limb, dehydration)
  const urgentKeywords = [
    "acute", "high fever", "fracture", "severe pain", "asthma attack",
    "burn", "deep laceration", "vomiting blood", "hypertension", "urgent"
  ];
  if (urgentKeywords.some((kw) => reason.includes(kw))) {
    return {
      priorityLevel: "Urgent",
      priorityReason: "Acute clinical presentation identified during intake assessment",
      numericRank: 2,
    };
  }

  // 3. Senior Citizen Priority (Age >= 60)
  if (age !== null && age >= 60) {
    return {
      priorityLevel: "Senior Citizen",
      priorityReason: `Geriatric care priority (Age: ${age} years)`,
      numericRank: 3,
    };
  }

  // 4. Pediatric Priority (Age <= 12)
  if (age !== null && age <= 12) {
    return {
      priorityLevel: "Child/Infant",
      priorityReason: `Pediatric patient priority (Age: ${age} years)`,
      numericRank: 4,
    };
  }

  // 5. Default Routine OPD
  return {
    priorityLevel: "Normal",
    priorityReason: "Standard scheduled outpatient appointment",
    numericRank: 5,
  };
}

/**
 * Calculates estimated wait time in minutes for a queue entry.
 *
 * Formula:
 * - If Emergency: 0 minutes (immediate bypass)
 * - Otherwise: Sum of estimated consultation times for all active patients ahead in queue
 *   Standard consultation pace = 15 minutes per patient
 *   Starvation mitigation: Routine patients waiting > 45 minutes get higher queue weight
 */
export function calculateWaitTimeMinutes(
  patientsAheadCount: number,
  priorityLevel: PriorityLevel
): number {
  if (priorityLevel === "Emergency") {
    return 0; // Immediate consultation
  }
  // Base 15 minutes per patient waiting ahead
  return Math.max(0, patientsAheadCount * 15);
}

/**
 * Sort comparator for ordering the active queue:
 * 1. Status: 'In-Consultation' first, then 'Called', then 'Waiting'
 * 2. Priority Rank (Emergency [1] -> Urgent [2] -> Senior [3] -> Child [4] -> Normal [5])
 * 3. Aging / Starvation adjustment: Patients waiting > 45 minutes gain priority advantage
 * 4. Token sequence / Check-in time
 */
export function compareQueueEntries(a: {
  queue_status: string;
  priority_level: PriorityLevel;
  token_number: number;
  check_in_time?: string | null;
}, b: {
  queue_status: string;
  priority_level: PriorityLevel;
  token_number: number;
  check_in_time?: string | null;
}): number {
  const statusWeight: Record<string, number> = {
    "In-Consultation": 0,
    "Called": 1,
    "Waiting": 2,
    "Completed": 9,
    "Skipped": 10,
    "Cancelled": 11,
  };

  const weightA = statusWeight[a.queue_status] ?? 5;
  const weightB = statusWeight[b.queue_status] ?? 5;

  if (weightA !== weightB) {
    return weightA - weightB;
  }

  // Both are Waiting or Called: sort by priority level
  const rankA = PRIORITY_RANKS[a.priority_level] ?? 5;
  const rankB = PRIORITY_RANKS[b.priority_level] ?? 5;

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // If same priority, First Come First Served by token number
  return a.token_number - b.token_number;
}

