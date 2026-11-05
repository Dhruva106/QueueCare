"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DashboardTab from "@/components/DashboardTab";
import QueueTab from "@/components/QueueTab";
import AppointmentsTab from "@/components/AppointmentsTab";
import PatientsTab from "@/components/PatientsTab";
import DoctorsTab from "@/components/DoctorsTab";
import VisitsTab from "@/components/VisitsTab";
import ReportsTab from "@/components/ReportsTab";
import NotificationsTab from "@/components/NotificationsTab";
import DoctorRecommendationsView from "@/components/DoctorRecommendationsView";
import SystemHealthTab from "@/components/SystemHealthTab";
import {
  BookingModal,
  CheckInModal,
  PatientRegistrationModal,
  VisitModal,
  PatientHistoryModal,
  DoctorModal,
  PatientEditModal,
} from "@/components/Modals";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  DashboardStats,
  QueueEntry,
  Appointment,
  Patient,
  Doctor,
  Department,
  Visit,
  Notification,
  PriorityLevel,
} from "@/lib/types";
import { UserRole, AuthUser } from "@/lib/auth";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [currentRole, setCurrentRole] = useState<UserRole>("Administrator");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>({
    id: 1,
    name: "Dhruva G Hegde",
    email: "admin@queuecare.hospital",
    role: "Administrator",
    linkedStaffId: 1,
  });
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [, startTransition] = useTransition();

  // Entities state
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    appointmentsToday: 0,
    waitingPatients: 0,
    inConsultation: 0,
    completedToday: 0,
    averageWaitTimeMinutes: 0,
    departmentQueueCounts: [],
    recentActivity: [],
  });
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<number | null>(null);
  const [selectedPatientForBooking, setSelectedPatientForBooking] = useState<number | null>(null);

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [visitModalEntry, setVisitModalEntry] = useState<QueueEntry | null>(null);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [checkInAppId, setCheckInAppId] = useState<number | null>(null);
  const [rescheduleApp, setRescheduleApp] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [selectedDoctorForEdit, setSelectedDoctorForEdit] = useState<Doctor | null>(null);
  const [isPatientEditOpen, setIsPatientEditOpen] = useState(false);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<Patient | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4500);
  }, []);

  // Master fetch function to synchronize all relational data
  const fetchData = useCallback(async () => {
    try {
      const [
        statsRes,
        queueRes,
        appRes,
        patientsRes,
        doctorsRes,
        deptsRes,
        visitsRes,
        notifsRes,
      ] = await Promise.all([
        fetch("/api/dashboard/stats").then((r) => r.json()),
        fetch("/api/queue").then((r) => r.json()),
        fetch("/api/appointments").then((r) => r.json()),
        fetch("/api/patients").then((r) => r.json()),
        fetch("/api/doctors").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
        fetch("/api/visits").then((r) => r.json()),
        fetch("/api/notifications").then((r) => r.json()),
      ]);

      startTransition(() => {
        if (statsRes.success) setStats(statsRes.stats);
        if (queueRes.success) setQueue(queueRes.queue);
        if (appRes.success) setAppointments(appRes.appointments);
        if (patientsRes.success) setPatients(patientsRes.patients);
        if (doctorsRes.success) setDoctors(doctorsRes.doctors);
        if (deptsRes.success) setDepartments(deptsRes.departments);
        if (visitsRes.success) setVisits(visitsRes.visits);
        if (notifsRes.success) setNotifications(notifsRes.notifications);
        setLoading(false);
      });
    } catch (err) {
      console.error("Failed to load data:", err);
      showToast("Error connecting to backend database.", "error");
      setLoading(false);
    }
  }, [showToast]);

  // Initial authentication and sync
  useEffect(() => {
    let ignore = false;
    const init = async () => {
      try {
        const meRes = await fetch("/api/auth/me").then((r) => r.json());
        if (!ignore && meRes.authenticated && meRes.user) {
          setCurrentUser(meRes.user);
          setCurrentRole(meRes.user.role);
        }
      } catch {
        // Fallback to default persona
      }
      if (!ignore) {
        fetchData();
      }
    };
    init();
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  // Real-time synchronization hook: automatically updates UI when mutations occur across sessions
  const { isConnected: isRealtimeConnected } = useRealtimeSync({
    onEvent: () => {
      fetchData();
    },
    onRefreshNeeded: () => {
      fetchData();
    },
  });

  const handleToggleDoctorStatus = async (doctorId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
      const res = await fetch("/api/doctors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast(`Doctor marked as ${newStatus}`);
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  // Role / Persona switching handler: Updates backend session cookie & audit log
  const handleSwitchPersona = async (personaKey: string, patientId?: number, doctorId?: number) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoKey: personaKey, patientId, doctorId }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentRole(data.user.role);
        setCurrentUser(data.user);
        showToast(`Switched active persona to ${data.user.name} (${data.user.role})`);

        // Adapt navigation view smoothly
        if (data.user.role === "Patient") {
          setActiveTab("Overview");
        } else if (data.user.role === "Doctor") {
          setActiveTab("Overview");
        } else if (data.user.role === "Receptionist") {
          setActiveTab("Queue Management");
        }
      }
    } catch (err) {
      console.error("Persona switch error:", err);
      showToast("Failed to switch persona", "error");
    }
  };


  // Queue Operations
  const handleCallPatient = async (queueId: number) => {
    try {
      const res = await fetch(`/api/queue/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "call" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast(data.message || "Patient called to examination room.");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleStartConsultation = async (queueId: number) => {
    try {
      const res = await fetch(`/api/queue/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast(data.message || "Consultation started.");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleSkipPatient = async (queueId: number) => {
    try {
      const res = await fetch(`/api/queue/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast(data.message || "Patient marked as skipped.");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleOverridePriority = async (
    queueId: number,
    newPriority: PriorityLevel,
    reason: string
  ) => {
    try {
      const res = await fetch(`/api/queue/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override_priority",
          priority_level: newPriority,
          priority_reason: reason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast(data.message || "Priority updated.");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleCancelQueue = async (queueId: number) => {
    if (!confirm("Are you sure you want to cancel this queue entry?")) return;
    try {
      const res = await fetch(`/api/queue/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast(data.message || "Queue entry cancelled.");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  // Appointment Operations
  const handleCancelAppointment = async (appId: number) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const res = await fetch(`/api/appointments/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", remarks: "Cancelled by staff" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast(data.message || "Appointment cancelled.");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApp) return;

    try {
      const res = await fetch(`/api/appointments/${rescheduleApp.appointment_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          appointment_date: rescheduleDate,
          appointment_time: rescheduleTime + ":00",
          remarks: "Rescheduled by staff",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast("Appointment rescheduled successfully.");
      setRescheduleApp(null);
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  // Doctor Operations
  const handleUpdateDoctorAvailability = async (doctorId: number, newStatus: string) => {
    try {
      const res = await fetch("/api/doctors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId, availability_status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast(`Doctor availability changed to ${newStatus}.`);
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  // Doctor Recommendations Booking
  const handleBookDoctorFromRecommendation = (docId: number) => {
    setSelectedDoctorForBooking(docId);
    if (currentRole === "Patient") {
      setSelectedPatientForBooking(currentUser?.linkedPatientId || 1);
    }
    setIsBookingOpen(true);
  };

  // Database Reset
  const handleResetDb = async () => {
    if (!confirm("Reset database to original demo seeds? Any new manual records will be restored.")) return;
    try {
      const res = await fetch("/api/db/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      showToast("Database restored with fresh test seed data.");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  // Mark all notifications read
  const handleMarkNotificationsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      showToast("Notifications marked as read.");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const unreadNotifsCount = notifications.filter((n) => n.notification_status === "Sent").length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl transition-all ${
            actionMessage.type === "error" ? "bg-rose-600" : "bg-teal-700"
          }`}
        >
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        waitingCount={stats.waitingPatients}
        unreadNotifsCount={unreadNotifsCount}
        currentRole={currentRole}
        currentUserName={currentUser?.name}
        onResetDb={handleResetDb}
      />

      {/* Main Workspace Section */}
      <div className="flex-1 flex flex-col md:ml-64">
        <Header
          activeTab={activeTab}
          currentRole={currentRole}
          currentUserName={currentUser?.name}
          currentUser={currentUser}
          patients={patients}
          doctors={doctors}
          onSwitchPersona={handleSwitchPersona}
          waitingCount={stats.waitingPatients}
          isRealtimeConnected={isRealtimeConnected}
          onRefresh={fetchData}
          onOpenBooking={() => {
            setSelectedDoctorForBooking(null);
            if (currentRole === "Patient") {
              setSelectedPatientForBooking(currentUser?.linkedPatientId || 1);
            }
            setIsBookingOpen(true);
          }}
          onOpenCheckIn={() => setIsCheckInOpen(true)}
          onOpenRegister={() => setIsRegisterOpen(true)}
        />

        <div className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              <span className="animate-pulse">Loading clinical workspace data...</span>
            </div>
          ) : (
            <>
              {activeTab === "Overview" && (
                <DashboardTab
                  stats={stats}
                  queue={queue}
                  appointments={appointments}
                  patients={patients}
                  doctors={doctors}
                  currentRole={currentRole}
                  currentUserName={currentUser?.name}
                  currentUser={currentUser}
                  onNavigateTab={setActiveTab}
                  onCallPatient={handleCallPatient}
                  onStartConsultation={handleStartConsultation}
                  onOpenCheckIn={() => setIsCheckInOpen(true)}
                  onOpenCheckInForApp={(appId) => {
                    setCheckInAppId(appId);
                    setIsCheckInOpen(true);
                  }}
                  onOpenBooking={() => {
                    setSelectedDoctorForBooking(null);
                    if (currentRole === "Patient") {
                      setSelectedPatientForBooking(currentUser?.linkedPatientId || 1);
                    }
                    setIsBookingOpen(true);
                  }}
                  onOpenVisitModal={(entry) => setVisitModalEntry(entry)}
                  onCancelAppointment={handleCancelAppointment}
                />
              )}

              {activeTab === "Queue Management" && (
                <QueueTab
                  queue={queue}
                  doctors={doctors}
                  departments={departments}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  onCallPatient={handleCallPatient}
                  onStartConsultation={handleStartConsultation}
                  onSkipPatient={handleSkipPatient}
                  onCancelQueue={handleCancelQueue}
                  onOpenCheckIn={() => setIsCheckInOpen(true)}
                  onOpenVisitModal={(entry) => setVisitModalEntry(entry)}
                  onOverridePriority={handleOverridePriority}
                />
              )}

              {activeTab === "Appointments" && (
                <AppointmentsTab
                  appointments={appointments}
                  doctors={doctors}
                  departments={departments}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  onOpenBooking={() => {
                    setSelectedDoctorForBooking(null);
                    if (currentRole === "Patient") {
                      setSelectedPatientForBooking(currentUser?.linkedPatientId || 1);
                    }
                    setIsBookingOpen(true);
                  }}
                  onOpenCheckInForApp={(appId) => {
                    setCheckInAppId(appId);
                    setIsCheckInOpen(true);
                  }}
                  onCancelAppointment={handleCancelAppointment}
                  onRescheduleAppointment={(app) => {
                    setRescheduleApp(app);
                    setRescheduleDate(app.appointment_date);
                    setRescheduleTime(app.appointment_time.slice(0, 5));
                  }}
                />
              )}

              {activeTab === "Patients" && (
                <PatientsTab
                  patients={patients}
                  onOpenRegister={() => setIsRegisterOpen(true)}
                  onViewPatientHistory={(p) => setHistoryPatient(p)}
                  onBookForPatient={(patientId) => {
                    setSelectedPatientForBooking(patientId);
                    setSelectedDoctorForBooking(null);
                    setIsBookingOpen(true);
                  }}
                  onEditPatient={(patient) => {
                    setSelectedPatientForEdit(patient);
                    setIsPatientEditOpen(true);
                  }}
                />
              )}

              {activeTab === "Doctors" && (
                <DoctorsTab
                  doctors={doctors}
                  departments={departments}
                  currentRole={currentRole}
                  onUpdateAvailability={handleUpdateDoctorAvailability}
                  onOpenAddDoctor={() => {
                    setSelectedDoctorForEdit(null);
                    setIsDoctorModalOpen(true);
                  }}
                  onEditDoctor={(doc) => {
                    setSelectedDoctorForEdit(doc);
                    setIsDoctorModalOpen(true);
                  }}
                  onToggleStatus={handleToggleDoctorStatus}
                  onBookForDoctor={(docId) => {
                    setSelectedDoctorForBooking(docId);
                    setSelectedPatientForBooking(null);
                    setIsBookingOpen(true);
                  }}
                />
              )}

              {activeTab === "Doctor Discovery" && (
                <DoctorRecommendationsView
                  onSelectDoctorToBook={handleBookDoctorFromRecommendation}
                />
              )}

              {activeTab === "Clinical Visits" && (
                <VisitsTab
                  visits={visits}
                  currentRole={currentRole}
                  currentUser={currentUser}
                />
              )}

              {activeTab === "Reports & Analytics" && <ReportsTab />}

              {activeTab === "System Health & DBs" && <SystemHealthTab />}

              {activeTab === "Notifications" && (
                <NotificationsTab
                  notifications={notifications}
                  onMarkAllRead={handleMarkNotificationsRead}
                />
              )}
            </>
          )}

          {/* Footer note */}
          <footer className="mt-16 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
            QueueCare · Hospital/Clinic Queue & Appointment Prioritization System · DBMS Mini Project (UE24CS352B) · PES University
          </footer>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setSelectedDoctorForBooking(null);
          setSelectedPatientForBooking(null);
        }}
        patients={patients}
        doctors={doctors}
        departments={departments}
        initialDoctorId={selectedDoctorForBooking}
        initialPatientId={selectedPatientForBooking}
        onBookSuccess={() => {
          showToast("Appointment scheduled successfully.");
          fetchData();
        }}
      />

      {/* Check-In Modal */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => {
          setIsCheckInOpen(false);
          setCheckInAppId(null);
        }}
        initialAppointmentId={checkInAppId}
        appointments={appointments}
        onCheckInSuccess={() => {
          showToast("Patient checked into queue and token issued.");
          fetchData();
        }}
      />

      {/* Patient Registration Modal */}
      <PatientRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegisterSuccess={() => {
          showToast("Patient registered successfully.");
          fetchData();
        }}
      />

      {/* Clinical Consultation / Visit Modal */}
      <VisitModal
        isOpen={!!visitModalEntry}
        onClose={() => setVisitModalEntry(null)}
        queueEntry={visitModalEntry}
        onVisitSuccess={() => {
          showToast("Clinical notes and prescription recorded successfully.");
          setVisitModalEntry(null);
          fetchData();
        }}
      />

      {/* Patient History Modal */}
      <PatientHistoryModal
        isOpen={!!historyPatient}
        onClose={() => setHistoryPatient(null)}
        patient={historyPatient}
      />

      {/* Doctor Registration & Profile Edit Modal */}
      <DoctorModal
        isOpen={isDoctorModalOpen}
        onClose={() => {
          setIsDoctorModalOpen(false);
          setSelectedDoctorForEdit(null);
        }}
        doctor={selectedDoctorForEdit}
        departments={departments}
        onSaveSuccess={() => {
          showToast(selectedDoctorForEdit ? "Doctor profile updated." : "New doctor registered.");
          fetchData();
        }}
      />

      {/* Patient Demographic & Contact Edit Modal */}
      <PatientEditModal
        isOpen={isPatientEditOpen}
        onClose={() => {
          setIsPatientEditOpen(false);
          setSelectedPatientForEdit(null);
        }}
        patient={selectedPatientForEdit}
        onSaveSuccess={() => {
          showToast("Patient record updated successfully.");
          fetchData();
        }}
      />

      {/* Reschedule Modal */}
      {rescheduleApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Reschedule Appointment</h3>
            <p className="mt-1 text-xs text-slate-500">
              Patient: <strong>{rescheduleApp.patient_name}</strong> · Current: {rescheduleApp.appointment_date} at {rescheduleApp.appointment_time}
            </p>

            <form onSubmit={handleConfirmReschedule} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Time *</label>
                <select
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  {["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setRescheduleApp(null)}
                  className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
