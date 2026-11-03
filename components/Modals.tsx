"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  Calendar,
  Clock,
  Stethoscope,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Patient, Doctor, Department, Appointment, QueueEntry, PriorityLevel } from "@/lib/types";
import { evaluateTriage, calculateAge } from "@/lib/prioritization";

// -----------------------------------------------------------------------------
// 1. BOOKING MODAL
// -----------------------------------------------------------------------------
interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  doctors: Doctor[];
  departments?: unknown[];
  initialDoctorId?: number | null;
  initialPatientId?: number | null;
  onBookSuccess: () => void;
}

export function BookingModal({
  isOpen,
  onClose,
  patients,
  doctors,
  initialDoctorId,
  initialPatientId,
  onBookSuccess,
}: BookingModalProps) {
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState("OPD");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const sync = async () => {
      await Promise.resolve();
      if (!ignore && isOpen) {
        if (initialDoctorId) {
          setDoctorId(String(initialDoctorId));
        }
        if (initialPatientId) {
          setPatientId(String(initialPatientId));
        }
      }
    };
    sync();
    return () => {
      ignore = true;
    };
  }, [isOpen, initialDoctorId, initialPatientId]);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find((d) => d.doctor_id === Number(doctorId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: Number(patientId),
          doctor_id: Number(doctorId),
          appointment_date: date,
          appointment_time: time + ":00",
          appointment_type: type,
          reason_for_visit: reason,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to book appointment.");
      }

      onBookSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-900">Schedule Appointment</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
            <select
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">-- Choose registered patient --</option>
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.first_name} {p.last_name} ({p.phone || "No phone"}) · Age: {calculateAge(p.date_of_birth) || "N/A"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor & Specialty *</label>
            <select
              required
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">-- Choose specialist --</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.doctor_name} ({d.department_name}) · INR {d.consultation_fee} [{d.availability_status}]
                </option>
              ))}
            </select>
            {selectedDoctor && (
              <p className="mt-1 text-xs text-teal-700">
                Department: <strong>{selectedDoctor.department_name}</strong> · Fee: <strong>INR {selectedDoctor.consultation_fee}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot *</label>
              <select
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
              >
                {["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="OPD">OPD (Outpatient Routine)</option>
              <option value="Consultation">Specialist Consultation</option>
              <option value="Follow-up">Follow-up Visit</option>
              <option value="Emergency">Emergency Evaluation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Symptoms / Reason</label>
            <input
              type="text"
              placeholder="e.g. Recurrent fever, chest discomfort, post-operative checkup"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Remarks</label>
            <input
              type="text"
              placeholder="e.g. Wheelchair assistance, previous reports to be reviewed"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Validating & Booking..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. CHECK-IN & TRIAGE MODAL
// -----------------------------------------------------------------------------
interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  onCheckInSuccess: () => void;
}

export function CheckInModal({
  isOpen,
  onClose,
  appointments,
  onCheckInSuccess,
}: CheckInModalProps) {
  const [appointmentId, setAppointmentId] = useState("");
  const [customPriority, setCustomPriority] = useState<PriorityLevel>("Normal");
  const [customReason, setCustomReason] = useState("");
  const [isOverride, setIsOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const eligibleAppointments = appointments.filter(
    (a) => a.appointment_status === "Scheduled" || a.appointment_status === "Rescheduled"
  );

  const selectedApp = eligibleAppointments.find((a) => a.appointment_id === Number(appointmentId));
  const autoTriage = selectedApp
    ? evaluateTriage({
        dateOfBirth: selectedApp.patient_dob,
        reasonForVisit: selectedApp.reason_for_visit || undefined,
        appointmentType: selectedApp.appointment_type,
      })
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: Number(appointmentId),
          explicit_priority: isOverride ? customPriority : autoTriage?.priorityLevel,
          explicit_reason: isOverride ? customReason : autoTriage?.priorityReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to check in patient.");
      }

      onCheckInSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-900">Patient Intake & Queue Check-In</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Scheduled Appointment *
            </label>
            <select
              required
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">-- Choose scheduled patient --</option>
              {eligibleAppointments.map((a) => (
                <option key={a.appointment_id} value={a.appointment_id}>
                  {a.appointment_time} · {a.patient_name} → Dr. {a.doctor_name} ({a.department_name})
                </option>
              ))}
            </select>
            {eligibleAppointments.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No scheduled appointments pending check-in for today. Book a new appointment first.
              </p>
            )}
          </div>

          {selectedApp && autoTriage && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Assessed Priority Tier:</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    autoTriage.priorityLevel === "Emergency"
                      ? "bg-rose-100 text-rose-700"
                      : autoTriage.priorityLevel === "Urgent"
                      ? "bg-amber-100 text-amber-700"
                      : autoTriage.priorityLevel === "Senior Citizen"
                      ? "bg-purple-100 text-purple-700"
                      : autoTriage.priorityLevel === "Child/Infant"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {autoTriage.priorityLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                <strong>Reasoning:</strong> {autoTriage.priorityReason}
              </p>
              <p className="text-xs text-slate-500">
                <strong>Chief complaint:</strong> {selectedApp.reason_for_visit || "None stated"}
              </p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isOverride}
                onChange={(e) => setIsOverride(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Clinical Staff Manual Triage Override
            </label>

            {isOverride && (
              <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Override Level</label>
                  <select
                    value={customPriority}
                    onChange={(e) => setCustomPriority(e.target.value as PriorityLevel)}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Emergency">Emergency (Immediate Escalation)</option>
                    <option value="Urgent">Urgent (Severe Symptoms / High Pain)</option>
                    <option value="Senior Citizen">Senior Citizen (Geriatric Priority)</option>
                    <option value="Child/Infant">Child / Infant (Pediatric Priority)</option>
                    <option value="Normal">Normal (Standard OPD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Clinical Override Justification *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diaphoresis observed, acute distress noted by triage nurse"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !appointmentId}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Assigning Token..." : "Issue Queue Token"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 3. PATIENT REGISTRATION MODAL
// -----------------------------------------------------------------------------
interface PatientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: () => void;
}

export function PatientRegistrationModal({
  isOpen,
  onClose,
  onRegisterSuccess,
}: PatientRegistrationModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Female");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
          gender,
          phone,
          email,
          address,
          emergency_contact: emergencyContact,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register patient.");
      }

      onRegisterSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-900">Register New Patient</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ramesh"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Kulkarni"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="+91 98765 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="patient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
            <input
              type="text"
              placeholder="House/Street, Area, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Number</label>
            <input
              type="tel"
              placeholder="+91 98765 99999"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Save Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4. CLINICAL CONSULTATION & VISIT RECORD MODAL
// -----------------------------------------------------------------------------
interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  queueEntry: QueueEntry | null;
  onVisitSuccess: () => void;
}

export function VisitModal({
  isOpen,
  onClose,
  queueEntry,
  onVisitSuccess,
}: VisitModalProps) {
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [billedAmount, setBilledAmount] = useState("500.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !queueEntry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: queueEntry.appointment_id,
          diagnosis,
          prescription,
          doctor_notes: notes,
          billed_amount: parseFloat(billedAmount) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete visit.");
      }

      onVisitSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Clinical Consultation Notes</h3>
              <p className="text-xs text-slate-500">
                Patient: <strong>{queueEntry.patient_name}</strong> · Token #{queueEntry.token_number}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Diagnosis *</label>
            <input
              type="text"
              required
              placeholder="e.g. Acute Bronchitis / Essential Hypertension"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prescription & Dosage *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Tab. Azithromycin 500mg 1-0-0 (3 days), Syp. Ambroxol 10ml TID"
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Advice / Treatment Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Rest for 3 days, drink warm fluids, review in 1 week if fever persists."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Fee / Bill (INR)</label>
            <input
              type="number"
              step="50"
              required
              value={billedAmount}
              onChange={(e) => setBilledAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Recording Visit..." : "Save & Complete Visit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 5. PATIENT HISTORY & DETAIL MODAL
// -----------------------------------------------------------------------------
interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export function PatientHistoryModal({
  isOpen,
  onClose,
  patient,
}: PatientHistoryModalProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !patient) return;
    let isMounted = true;
    fetch(`/api/patients/${patient.patient_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setAppointments(data.appointments || []);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-800 font-bold">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {patient.first_name} {patient.last_name}
              </h3>
              <p className="text-xs text-slate-500">
                Patient ID: #QC-{patient.patient_id} · DOB: {patient.date_of_birth} (Age: {calculateAge(patient.date_of_birth)})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Demographics Card */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400">Gender</span>
            <p className="font-semibold text-slate-800">{patient.gender || "N/A"}</p>
          </div>
          <div>
            <span className="text-slate-400">Phone</span>
            <p className="font-semibold text-slate-800">{patient.phone || "N/A"}</p>
          </div>
          <div>
            <span className="text-slate-400">Emergency</span>
            <p className="font-semibold text-slate-800">{patient.emergency_contact || "N/A"}</p>
          </div>
          <div>
            <span className="text-slate-400">Registered</span>
            <p className="font-semibold text-slate-800">{patient.registration_date}</p>
          </div>
        </div>

        {/* Appointment & Clinical Encounter History */}
        <div className="mt-6">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600" />
            Appointment & Clinical Encounter History
          </h4>

          {loading ? (
            <p className="text-xs text-slate-400 py-4">Loading patient history...</p>
          ) : appointments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No appointment history found for this patient.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.appointment_id} className="rounded-xl border border-slate-200 p-3.5 text-xs hover:bg-slate-50/60 transition">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900">
                      {a.appointment_date} at {a.appointment_time} · Dr. {a.doctor_name}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${
                      a.appointment_status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                      a.appointment_status === "Checked-In" ? "bg-teal-100 text-teal-800" :
                      a.appointment_status === "Cancelled" ? "bg-rose-100 text-rose-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {a.appointment_status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    <strong>Department:</strong> {a.department_name} · <strong>Reason:</strong> {a.reason_for_visit || "Routine"}
                  </p>
                  {a.token_number && (
                    <p className="mt-1 text-teal-700">
                      <strong>Queue Token:</strong> #{a.token_number} · <strong>Priority:</strong> {a.priority_level}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 6. DOCTOR REGISTRATION & PROFILE EDIT MODAL
// -----------------------------------------------------------------------------
interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor?: Doctor | null;
  departments: Department[];
  onSaveSuccess: () => void;
}

export function DoctorModal({
  isOpen,
  onClose,
  doctor,
  departments,
  onSaveSuccess,
}: DoctorModalProps) {
  const isEdit = Boolean(doctor && doctor.doctor_id);

  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consultationFee, setConsultationFee] = useState("500");
  const [availabilityStatus, setAvailabilityStatus] = useState("Available");
  const [status, setStatus] = useState("Active");
  const [workingDays, setWorkingDays] = useState("Mon,Tue,Wed,Thu,Fri");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState("15");
  const [roomNumber, setRoomNumber] = useState("Room 101");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      if (doctor) {
        setName(doctor.doctor_name || "");
        setDepartmentId(String(doctor.department_id || departments[0]?.department_id || "1"));
        setSpecialization(doctor.specialization || "");
        setQualification(doctor.qualification || "");
        setPhone(doctor.phone || "");
        setEmail(doctor.email || "");
        setConsultationFee(String(doctor.consultation_fee || 500));
        setAvailabilityStatus(doctor.availability_status || "Available");
        setStatus(doctor.status || "Active");
        setWorkingDays(doctor.working_days || "Mon,Tue,Wed,Thu,Fri");
        setStartTime(doctor.working_hours_start || "09:00");
        setEndTime(doctor.working_hours_end || "17:00");
        setSlotDuration(String(doctor.slot_duration_minutes || 15));
        setRoomNumber(doctor.room_number || "Room 101");
      } else {
        setName("");
        setDepartmentId(String(departments[0]?.department_id || "1"));
        setSpecialization("");
        setQualification("");
        setPhone("");
        setEmail("");
        setConsultationFee("500");
        setAvailabilityStatus("Available");
        setStatus("Active");
        setWorkingDays("Mon,Tue,Wed,Thu,Fri");
        setStartTime("09:00");
        setEndTime("17:00");
        setSlotDuration("15");
        setRoomNumber("Room 101");
      }
      setError(null);
    });
    return () => {
      ignore = true;
    };
  }, [doctor, departments, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Doctor name is required");
      return;
    }
    if (!specialization.trim()) {
      setError("Specialization is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        doctor_id: doctor?.doctor_id,
        doctor_name: name.trim(),
        department_id: Number(departmentId),
        specialization: specialization.trim(),
        qualification: qualification.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        consultation_fee: Number(consultationFee),
        availability_status: availabilityStatus,
        status,
        working_days: workingDays,
        working_hours_start: startTime,
        working_hours_end: endTime,
        slot_duration_minutes: Number(slotDuration),
        room_number: roomNumber.trim(),
      };

      const res = await fetch("/api/doctors", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save doctor");
      }

      onSaveSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isEdit ? `Edit Physician · Dr. ${doctor?.doctor_name}` : "Register New Physician / Specialist"}
            </h3>
            <p className="text-xs text-slate-500">
              Configure medical credentials, department alignment, and OPD consultation hours.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Doctor Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Department *</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              >
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_name} ({dept.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Specialization *</label>
              <input
                type="text"
                required
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Interventional Cardiology"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Medical Qualification</label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. MBBS, MD, DM"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@queuecare.hospital"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Consultation Fee (₹)</label>
              <input
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              OPD Clinic Schedule &amp; Room Assignment
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Working Days</label>
                <input
                  type="text"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  placeholder="Mon,Tue,Wed,Thu,Fri"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600">Hours (Start - End)</label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  />
                  <span className="text-xs text-slate-400">-</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600">Slot &amp; OPD Room</label>
                <div className="mt-1 flex items-center gap-1.5">
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                    className="w-1/2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value="15">15 min</option>
                    <option value="20">20 min</option>
                    <option value="30">30 min</option>
                  </select>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Room 101"
                    className="w-1/2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status & Availability Controls */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Duty / Availability Status</label>
              <select
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              >
                <option value="Available">Available (Accepting Walk-ins &amp; Appointments)</option>
                <option value="In-Consultation">In Consultation</option>
                <option value="On Break">On Break (Temporary Hold)</option>
                <option value="Off Duty">Off Duty</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Hospital System Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              >
                <option value="Active">Active (Rostered in Hospital)</option>
                <option value="Inactive">Inactive (Deactivated / On Leave)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : isEdit ? "Save Profile Changes" : "+ Register Doctor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 7. PATIENT PROFILE EDIT MODAL
// -----------------------------------------------------------------------------
interface PatientEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSaveSuccess: () => void;
}

export function PatientEditModal({
  isOpen,
  onClose,
  patient,
  onSaveSuccess,
}: PatientEditModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [status, setStatus] = useState("Active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      if (patient) {
        setFirstName(patient.first_name || "");
        setLastName(patient.last_name || "");
        setPhone(patient.phone || "");
        setEmail(patient.email || "");
        setAddress(patient.address || "");
        setEmergencyContact(patient.emergency_contact || "");
        setStatus(patient.status || "Active");
      }
      setError(null);
    });
    return () => {
      ignore = true;
    };
  }, [patient, isOpen]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/patients/${patient.patient_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          emergency_contact: emergencyContact.trim() || null,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update patient");
      }

      onSaveSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 font-bold">
            QC
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Edit Patient Record · #{patient.patient_id}
            </h3>
            <p className="text-xs text-slate-500">
              Update contact info, address, and emergency details.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Address / City</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Bangalore, Karnataka"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Emergency Contact</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Relative / Guardian phone"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Record Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-teal-500 focus:outline-none"
              >
                <option value="Active">Active Patient</option>
                <option value="Inactive">Archived / Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Patient Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
