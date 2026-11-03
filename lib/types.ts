// =============================================================================
// QueueCare: Core TypeScript Interfaces & Domain Models
// =============================================================================

export type PriorityLevel = 
  | "Emergency" 
  | "Urgent" 
  | "Senior Citizen" 
  | "Child/Infant" 
  | "Normal";

export type QueueStatus = 
  | "Waiting" 
  | "Called" 
  | "In-Consultation" 
  | "Completed" 
  | "Skipped" 
  | "Cancelled";

export type AppointmentStatus = 
  | "Scheduled" 
  | "Checked-In" 
  | "In-Progress" 
  | "Completed" 
  | "Cancelled" 
  | "Rescheduled";

export type AppointmentType = 
  | "OPD" 
  | "Follow-up" 
  | "Emergency" 
  | "Consultation";

export type StaffRole = 
  | "Administrator" 
  | "Queue Manager" 
  | "Receptionist" 
  | "Doctor Assistant" 
  | "Billing Staff";

export interface Department {
  department_id: number;
  department_name: string;
  location: string | null;
  contact_number: string | null;
  status: string;
}

export interface Staff {
  staff_id: number;
  staff_name: string;
  username: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  staff_status: string;
  date_joined: string | null;
}

export interface Patient {
  patient_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact: string | null;
  registration_date: string;
  status: string;
}

export interface Doctor {
  doctor_id: number;
  department_id: number;
  doctor_name: string;
  specialization: string | null;
  qualification: string | null;
  phone: string | null;
  email: string | null;
  availability_status: string;
  consultation_fee: number;
  status: string;
  working_days?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  slot_duration_minutes?: number;
  room_number?: string;
  department_name?: string;
  location?: string;
}

export interface Appointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  department_id: number;
  appointment_date: string;
  appointment_time: string;
  booking_date: string;
  reason_for_visit: string | null;
  appointment_type: AppointmentType;
  appointment_status: AppointmentStatus;
  remarks: string | null;
  // Joined fields
  patient_name?: string;
  patient_phone?: string;
  patient_dob?: string;
  doctor_name?: string;
  department_name?: string;
  token_number?: number;
  queue_status?: QueueStatus;
  priority_level?: PriorityLevel;
}

export interface QueueEntry {
  queue_id: number;
  appointment_id: number;
  doctor_id: number;
  token_number: number;
  queue_date: string;
  check_in_time: string | null;
  estimated_wait_time: number;
  priority_level: PriorityLevel;
  priority_reason: string | null;
  queue_status: QueueStatus;
  // Joined fields
  patient_id?: number;
  patient_name?: string;
  patient_phone?: string;
  patient_dob?: string;
  patient_gender?: string;
  doctor_name?: string;
  department_name?: string;
  reason_for_visit?: string;
  appointment_time?: string;
}

export interface Visit {
  visit_id: number;
  appointment_id: number;
  doctor_id: number;
  staff_id: number | null;
  visit_date: string;
  start_time: string | null;
  end_time: string | null;
  diagnosis: string | null;
  prescription: string | null;
  doctor_notes: string | null;
  visit_status: string;
  billed_amount: number;
  // Joined fields
  patient_name?: string;
  doctor_name?: string;
}

export interface Notification {
  notification_id: number;
  patient_id: number;
  appointment_id: number | null;
  notification_type: string;
  message: string;
  sent_time: string;
  notification_status: string;
  patient_name?: string;
}

export interface DashboardStats {
  totalPatients: number;
  appointmentsToday: number;
  waitingPatients: number;
  inConsultation: number;
  completedToday: number;
  averageWaitTimeMinutes: number;
  departmentQueueCounts: {
    name: string;
    count: number;
    color: string;
    widthPercent: number;
  }[];
  recentActivity: {
    time: string;
    description: string;
    type: "queue" | "appointment" | "visit" | "alert";
  }[];
}

