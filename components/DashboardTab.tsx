"use client";

import React from "react";
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  Sparkles,
  UserCheck,
  CalendarPlus,
  ClipboardList,
  MapPin,
  CalendarX2,
} from "lucide-react";
import { DashboardStats, QueueEntry, Appointment, Patient, Doctor } from "@/lib/types";
import { UserRole, AuthUser } from "@/lib/auth";

interface DashboardTabProps {
  stats: DashboardStats;
  queue: QueueEntry[];
  appointments?: Appointment[];
  patients?: Patient[];
  doctors?: Doctor[];
  currentRole?: UserRole;
  currentUserName?: string;
  currentUser?: AuthUser | null;
  onNavigateTab: (tab: string) => void;
  onCallPatient: (queueId: number) => void;
  onStartConsultation: (queueId: number) => void;
  onOpenCheckIn: () => void;
  onOpenCheckInForApp?: (appointmentId: number) => void;
  onOpenBooking: () => void;
  onOpenVisitModal?: (entry: QueueEntry) => void;
  onCancelAppointment?: (appointmentId: number) => void;
}

export default function DashboardTab({
  stats,
  queue,
  appointments = [],
  doctors = [],
  currentRole = "Administrator",
  currentUserName,
  currentUser,
  onNavigateTab,
  onCallPatient,
  onStartConsultation,
  onOpenCheckIn,
  onOpenCheckInForApp,
  onOpenBooking,
  onOpenVisitModal,
  onCancelAppointment,
}: DashboardTabProps) {
  const waitingPatients = queue.filter(
    (q) => q.queue_status === "Waiting" || q.queue_status === "Called"
  );
  const emergencyCount = queue.filter(
    (q) => q.priority_level === "Emergency" && q.queue_status === "Waiting"
  ).length;

  // Generic Patient Portal: Key dynamically on the logged-in patient's ID
  const activePatientId = currentUser?.linkedPatientId || (currentRole === "Patient" ? 1 : undefined);

  const patientActiveQueue = queue.find(
    (q) =>
      activePatientId !== undefined &&
      q.patient_id === activePatientId &&
      ["Waiting", "Called", "In-Consultation"].includes(q.queue_status)
  ) || queue.find(
    (q) => activePatientId !== undefined && q.patient_id === activePatientId
  );

  const myAppointments = appointments.filter(
    (app) => activePatientId !== undefined && app.patient_id === activePatientId
  );

  // Dynamic Multi-Doctor Workspace logic
  const assignedDoctorId = currentUser?.linkedDoctorId;
  const currentDoctor = doctors.find((d) => d.doctor_id === assignedDoctorId) || doctors[0];
  const doctorQueue = assignedDoctorId
    ? queue.filter((q) => q.doctor_id === assignedDoctorId)
    : queue;
  const doctorAppointments = appointments.filter(
    (a) => !assignedDoctorId || a.doctor_id === assignedDoctorId
  );
  const doctorScheduledApps = doctorAppointments.filter(
    (a) => a.appointment_status === "Scheduled" || a.appointment_status === "Rescheduled"
  );

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* 1. PATIENT PORTAL BANNER (Dynamic & Generic)                     */}
      {/* ----------------------------------------------------------------- */}
      {currentRole === "Patient" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 p-6 md:p-8 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-800/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-400 font-bold text-slate-950 shadow-md">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-800/80 px-2.5 py-0.5 text-[11px] font-bold text-teal-200 border border-teal-600/40">
                    Patient Self-Service Portal
                  </span>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                    Welcome, {currentUserName || "Valued Patient"}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab("Doctor Discovery")}
                  className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-teal-400 transition"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Find Specialists (Neo4j)</span>
                </button>
                <button
                  onClick={onOpenBooking}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span>Book Appointment</span>
                </button>
              </div>
            </div>

            {patientActiveQueue ? (
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {/* Active Token Card */}
                <div className="rounded-2xl border border-teal-700/50 bg-slate-900/80 p-5 shadow-inner">
                  <p className="text-xs font-medium text-teal-300">Your Clinic Queue Token</p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="font-mono text-4xl font-extrabold text-teal-300">
                      #{patientActiveQueue.token_number}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        patientActiveQueue.queue_status === "Called"
                          ? "bg-purple-900/80 text-purple-200 border border-purple-600 animate-pulse"
                          : patientActiveQueue.queue_status === "In-Consultation"
                          ? "bg-teal-900/80 text-teal-200 border border-teal-600"
                          : "bg-amber-900/80 text-amber-200 border border-amber-600"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current animate-ping" />
                      {patientActiveQueue.queue_status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                    {patientActiveQueue.queue_status === "Called"
                      ? "Your token has been called! Please proceed immediately to the consultation room."
                      : patientActiveQueue.queue_status === "In-Consultation"
                      ? "Consultation currently in progress with your physician."
                      : "You are checked in and waiting in the triage queue."}
                  </p>
                </div>

                {/* Doctor & Location */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
                  <p className="text-xs font-medium text-slate-400">Assigned Physician</p>
                  <p className="mt-2 text-base font-bold text-white flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-teal-400" />
                    {patientActiveQueue.doctor_name || "Specialist Doctor"}
                  </p>
                  <p className="text-xs text-teal-300 mt-0.5">
                    {patientActiveQueue.department_name || "Outpatient Clinic"}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>OPD Consultation Room · Main Hospital Block</span>
                  </div>
                </div>

                {/* Estimated Wait Time */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
                  <p className="text-xs font-medium text-slate-400">Estimated Waiting Time</p>
                  <p className="mt-2 text-2xl font-bold text-amber-300 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-400" />
                    {patientActiveQueue.queue_status === "Called"
                      ? "Now Entering"
                      : `~${patientActiveQueue.estimated_wait_time} min`}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>Priority Level:</span>
                    <span className="font-semibold text-white">
                      {patientActiveQueue.priority_level}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-teal-800/80 bg-slate-900/60 p-6 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-teal-400" />
                <h3 className="mt-2 font-bold text-white">No Active Queue Token Today</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  You do not currently have a waiting queue ticket. You can search our medical specialists using AI graph matching or schedule an appointment below.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => onNavigateTab("Doctor Discovery")}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 transition shadow-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    Find Specialists
                  </button>
                  <button
                    onClick={onOpenBooking}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Book New Slot
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Patient's My Appointments Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-teal-600" />
                  My Scheduled Appointments
                </h3>
                <p className="text-xs text-slate-500">
                  View and manage your upcoming hospital visits
                </p>
              </div>
              <button
                onClick={onOpenBooking}
                className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition shadow-xs"
              >
                + Book Another
              </button>
            </div>

            {myAppointments.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myAppointments.map((app) => (
                  <div
                    key={app.appointment_id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-teal-300 transition"
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          app.appointment_status === "Scheduled"
                            ? "bg-teal-100 text-teal-800"
                            : app.appointment_status === "Checked-In"
                            ? "bg-purple-100 text-purple-800"
                            : app.appointment_status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {app.appointment_status}
                      </span>
                      {app.appointment_status === "Scheduled" && onCancelAppointment && (
                        <button
                          onClick={() => onCancelAppointment(app.appointment_id)}
                          className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 hover:underline font-semibold"
                          title="Cancel this appointment"
                        >
                          <CalendarX2 className="h-3 w-3" />
                          Cancel
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {app.doctor_name || "Specialist"}
                    </p>
                    <p className="text-xs text-slate-500">{app.department_name}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2 text-xs text-slate-600">
                      <span className="font-semibold">{app.appointment_date}</span>
                      <span className="font-mono text-teal-700 font-bold">{app.appointment_time?.slice(0, 5)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                You have no scheduled appointments. Click &ldquo;+ Book Another&rdquo; to reserve a consultation slot.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. DOCTOR ROSTER BANNER (When viewing as Doctor persona)           */}
      {/* ----------------------------------------------------------------- */}
      {currentRole === "Doctor" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 p-6 md:p-8 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-800/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400 font-bold text-slate-950 shadow-md">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-900/80 px-2.5 py-0.5 text-[11px] font-bold text-sky-200 border border-sky-700/50">
                    Doctor Clinical Workspace
                  </span>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                    {currentDoctor?.doctor_name || currentUserName || "Attending Physician"}
                  </h2>
                  <p className="text-xs text-sky-300 font-medium mt-0.5">
                    {currentDoctor?.specialization || "Clinical Specialist"} · {currentDoctor?.department_name || "Outpatient Clinic"} · Room {currentDoctor?.room_number || "101"} ({currentDoctor?.working_hours_start || "09:00"} – {currentDoctor?.working_hours_end || "17:00"})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigateTab("Appointments")}
                  className="rounded-xl border border-sky-700 bg-sky-900/50 px-3.5 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-800 transition"
                >
                  View All Consultations
                </button>
                <button
                  onClick={() => onNavigateTab("Clinical Visits")}
                  className="rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 transition"
                >
                  View Past Visits
                </button>
              </div>
            </div>

            {/* Doctor KPI Metrics */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-200">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Consultations</span>
                <p className="text-2xl font-extrabold text-white mt-1">{doctorAppointments.length}</p>
                <p className="text-[10px] text-sky-300 mt-0.5">{doctorScheduledApps.length} pending arrivals</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">In Waiting Queue</span>
                <p className="text-2xl font-extrabold text-amber-400 mt-1">
                  {doctorQueue.filter((q) => q.queue_status === "Waiting").length}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Checked-in &amp; triage ranked</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">In Consultation</span>
                <p className="text-2xl font-extrabold text-teal-400 mt-1">
                  {doctorQueue.filter((q) => q.queue_status === "In-Consultation").length}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Currently inside room</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed Visits</span>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                  {doctorAppointments.filter((a) => a.appointment_status === "Completed").length}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Prescriptions filed</p>
              </div>
            </div>

            {/* Sub-section A: Active Patients in Queue */}
            <div className="mt-7">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-3 flex items-center justify-between">
                <span>Active Patient Queue for Examination (Checked-In)</span>
                <span className="text-[11px] text-slate-400 normal-case">
                  {doctorQueue.filter((q) => q.queue_status === "Waiting" || q.queue_status === "Called").length} active
                </span>
              </h3>
              {doctorQueue.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {doctorQueue.map((entry) => (
                    <div
                      key={entry.queue_id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-xs font-bold text-sky-300">
                          #{entry.token_number}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            entry.priority_level === "Emergency"
                              ? "bg-rose-900/80 text-rose-300 border border-rose-700 animate-pulse"
                              : entry.priority_level === "Urgent"
                              ? "bg-amber-900/80 text-amber-300 border border-amber-700"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {entry.priority_level}
                        </span>
                      </div>

                      <p className="mt-2 font-bold text-white text-sm">{entry.patient_name}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {entry.priority_reason || "Scheduled OPD Consultation"}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                        <span className="text-xs font-medium text-slate-400">
                          Status: <strong className="text-white">{entry.queue_status}</strong>
                        </span>
                        <div className="flex gap-1.5">
                          {entry.queue_status === "Waiting" && (
                            <button
                              onClick={() => onCallPatient(entry.queue_id)}
                              className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-500"
                            >
                              Call
                            </button>
                          )}
                          {(entry.queue_status === "Called" || entry.queue_status === "Waiting") && (
                            <button
                              onClick={() => onStartConsultation(entry.queue_id)}
                              className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-500"
                            >
                              Start
                            </button>
                          )}
                          {entry.queue_status === "In-Consultation" && onOpenVisitModal && (
                            <button
                              onClick={() => onOpenVisitModal(entry)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                            >
                              Complete Visit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-400">
                  No checked-in patients currently waiting in your queue.
                </div>
              )}
            </div>

            {/* Sub-section B: Assigned Scheduled Consultations (Upcoming Arrivals) */}
            <div className="mt-7 border-t border-slate-800/80 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                  Upcoming Assigned Consultations ({doctorScheduledApps.length} Scheduled)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Scheduled bookings enter the active queue upon patient check-in
                </span>
              </div>

              {doctorScheduledApps.length > 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3.5">Appt ID</th>
                        <th className="py-2.5 px-3.5">Date &amp; Time</th>
                        <th className="py-2.5 px-3.5">Patient Name</th>
                        <th className="py-2.5 px-3.5">Reason / Type</th>
                        <th className="py-2.5 px-3.5">Status</th>
                        <th className="py-2.5 px-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {doctorScheduledApps.map((app) => (
                        <tr key={app.appointment_id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3.5 font-mono text-sky-300 font-bold">
                            #APT-{app.appointment_id}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="font-semibold text-white">{app.appointment_date}</span>
                            <span className="ml-2 font-mono text-teal-400 font-bold">{app.appointment_time?.slice(0, 5)}</span>
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-white">
                            {app.patient_name}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-400">
                            {app.reason_for_visit || "General consultation"} ({app.appointment_type})
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="rounded-full bg-teal-900/60 border border-teal-700 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                              {app.appointment_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            {app.appointment_status === "Scheduled" && onOpenCheckInForApp && (
                              <button
                                onClick={() => onOpenCheckInForApp(app.appointment_id)}
                                className="rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-500 shadow-xs"
                              >
                                Check In
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-400">
                  No scheduled consultations currently booked for this doctor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. WELCOME & QUICK ACTION BAR (ADMIN / RECEPTIONIST)              */}
      {/* ----------------------------------------------------------------- */}
      {currentRole !== "Patient" && currentRole !== "Doctor" && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Hospital Queue &amp; Triage Center
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Real-time patient intake monitoring, priority-ranked queue scheduling, and clinic status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCheckIn}
              className="rounded-xl border border-teal-600 bg-white px-4 py-2.5 text-xs font-semibold text-teal-700 shadow-sm hover:bg-teal-50 transition"
            >
              Check-In Patient
            </button>
            <button
              onClick={onOpenBooking}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              + New Appointment
            </button>
          </div>
        </div>
      )}

      {/* Emergency Alert Banner if Emergency patients waiting */}
      {emergencyCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white font-bold">
              !
            </span>
            <div>
              <p className="font-bold text-sm">
                CRITICAL TRIAGE ALERT: {emergencyCount} Emergency Patient{emergencyCount > 1 ? "s" : ""} in Queue
              </p>
              <p className="text-xs text-rose-700">
                Patients classified as Emergency bypass standard wait times. Please notify consulting physicians immediately.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("Queue Management")}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
          >
            Open Queue →
          </button>
        </div>
      )}

      {/* 4 Spacious Key Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
            <span className="rounded-xl bg-teal-50 p-2 text-teal-600">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {stats.totalPatients}
          </p>
          <p className="mt-1 text-xs text-slate-400">Registered records in hospital DB</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Appointments</p>
            <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Calendar className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {stats.appointmentsToday}
          </p>
          <p className="mt-1 text-xs text-slate-400">Scheduled consultations today</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Waiting in Queue</p>
            <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-amber-600">
            {stats.waitingPatients}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {stats.inConsultation} in consultation room
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Today</p>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-700">
            {stats.completedToday}
          </p>
          <p className="mt-1 text-xs text-slate-400">Finished consultations</p>
        </div>
      </div>

      {/* Main Grid: Live Queue & Department Workload */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Live Patient Queue List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Priority Ranked Patient Queue</h3>
              <p className="text-xs text-slate-500">
                Sorted strictly by triage priority tier, wait time, and arrival sequence.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("Queue Management")}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1"
            >
              Full Queue Table <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-3 pr-3 font-semibold">Token</th>
                  <th className="pb-3 pr-3 font-semibold">Patient</th>
                  <th className="pb-3 pr-3 font-semibold">Doctor / Dept</th>
                  <th className="pb-3 pr-3 font-semibold">Priority Tier</th>
                  <th className="pb-3 pr-3 font-semibold">Est. Wait</th>
                  <th className="pb-3 pr-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waitingPatients.slice(0, 6).map((patient) => (
                  <tr key={patient.queue_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 pr-3">
                      <span className="inline-flex h-7 w-12 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-bold text-teal-300">
                        #{patient.token_number}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-bold text-slate-900">{patient.patient_name}</p>
                      <p className="text-[10px] text-slate-400">
                        In: {patient.check_in_time || "N/A"} · {patient.patient_gender || "N/A"}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-slate-800">{patient.doctor_name}</p>
                      <p className="text-[10px] text-slate-400">{patient.department_name}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          patient.priority_level === "Emergency"
                            ? "bg-rose-100 text-rose-700 animate-pulse"
                            : patient.priority_level === "Urgent"
                            ? "bg-amber-100 text-amber-800"
                            : patient.priority_level === "Senior Citizen"
                            ? "bg-purple-100 text-purple-800"
                            : patient.priority_level === "Child/Infant"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {patient.priority_level}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-medium text-slate-700">
                      {patient.priority_level === "Emergency" ? (
                        <span className="font-bold text-rose-600">Immediate</span>
                      ) : (
                        <span>~{patient.estimated_wait_time} min</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold text-[11px] ${
                          patient.queue_status === "In-Consultation"
                            ? "text-teal-700"
                            : patient.queue_status === "Called"
                            ? "text-purple-700"
                            : "text-amber-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            patient.queue_status === "In-Consultation"
                              ? "bg-teal-600"
                              : patient.queue_status === "Called"
                              ? "bg-purple-600 animate-ping"
                              : "bg-amber-500"
                          }`}
                        />
                        {patient.queue_status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {patient.queue_status === "Waiting" && (
                        <button
                          onClick={() => onCallPatient(patient.queue_id)}
                          className="rounded-lg bg-teal-50 px-2.5 py-1 font-semibold text-teal-700 hover:bg-teal-100 transition"
                        >
                          Call
                        </button>
                      )}
                      {patient.queue_status === "Called" && (
                        <button
                          onClick={() => onStartConsultation(patient.queue_id)}
                          className="rounded-lg bg-teal-600 px-2.5 py-1 font-semibold text-white hover:bg-teal-700 transition"
                        >
                          Consult
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {waitingPatients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No patients currently waiting in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Department Load & Clinical Rules */}
        <div className="space-y-6">
          {/* Department Queue Counts */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900">Queue by Department</h3>
            <p className="mt-0.5 text-xs text-slate-500">Active patients waiting per clinic</p>

            <div className="mt-5 space-y-4">
              {stats.departmentQueueCounts.map((dept) => (
                <div key={dept.name}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{dept.name}</span>
                    <span className="font-bold text-slate-900">{dept.count} waiting</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${dept.color}`}
                      style={{ width: `${Math.max(8, dept.widthPercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Prioritization Hierarchy Box */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
              <HeartPulse className="h-4 w-4 text-teal-600" />
              <span>Prioritization Hierarchy &amp; Rules</span>
            </div>
            <p className="mt-2 text-xs text-teal-900 leading-relaxed">
              1. <strong>Emergency (Immediate):</strong> Critical vital threats.<br />
              2. <strong>Urgent:</strong> High pain, severe acute distress.<br />
              3. <strong>Senior Citizen (60+ yrs):</strong> Geriatric care.<br />
              4. <strong>Child/Infant (&le; 12 yrs):</strong> Pediatric priority.<br />
              5. <strong>Normal:</strong> Standard outpatient OPD sequence.
            </p>
            <p className="mt-2 text-[10px] text-teal-800 italic">
              Estimated wait times are approximations (15m/patient pace). Emergency cases bypass queue immediately.
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 5. OUTPATIENT SCHEDULE & INTAKE ARRIVALS (ADMIN & RECEPTIONIST)   */}
      {/* ----------------------------------------------------------------- */}
      {currentRole !== "Patient" && currentRole !== "Doctor" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-600" />
                Scheduled Outpatient Consultations &amp; Intake Desk
              </h3>
              <p className="text-xs text-slate-500">
                Booked patients awaiting hospital arrival and queue check-in.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("Appointments")}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1"
            >
              All Appointments Schedule <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Appt ID</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Doctor &amp; Department</th>
                  <th className="py-2.5 px-3">Reason / Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Intake Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appointments.slice(0, 10).map((app) => (
                  <tr key={app.appointment_id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                      #APT-{app.appointment_id}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      <span className="font-bold text-slate-900">{app.appointment_date}</span>
                      <span className="ml-2 font-mono text-teal-700 font-bold">{app.appointment_time?.slice(0, 5)}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">{app.patient_name}</p>
                      <p className="text-[10px] text-slate-400">{app.patient_phone || "No phone"}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-800">{app.doctor_name}</p>
                      <p className="text-[10px] text-slate-400">{app.department_name}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {app.appointment_type}
                      </span>
                      {app.reason_for_visit && (
                        <p className="text-[10px] text-slate-500 truncate max-w-xs italic">{app.reason_for_visit}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          app.appointment_status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : app.appointment_status === "Checked-In"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {app.appointment_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {app.appointment_status === "Scheduled" && onOpenCheckInForApp && (
                        <button
                          onClick={() => onOpenCheckInForApp(app.appointment_id)}
                          className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700 transition shadow-xs"
                        >
                          Check In
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-xs text-slate-400">
                      No scheduled appointments currently booked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
