"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { Appointment } from "@/lib/types";

interface AppointmentsTabProps {
  appointments: Appointment[];
  doctors?: unknown[];
  departments?: unknown[];
  onOpenBooking: () => void;
  onOpenCheckInForApp: (appId: number) => void;
  onCancelAppointment: (appId: number) => void;
  onRescheduleAppointment: (app: Appointment) => void;
}

export default function AppointmentsTab({
  appointments,
  onOpenBooking,
  onOpenCheckInForApp,
  onCancelAppointment,
  onRescheduleAppointment,
}: AppointmentsTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filtered = appointments.filter((a) => {
    if (selectedDate && a.appointment_date !== selectedDate) return false;
    if (selectedStatus && a.appointment_status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchP = a.patient_name?.toLowerCase().includes(q);
      const matchD = a.doctor_name?.toLowerCase().includes(q);
      const matchDept = a.department_name?.toLowerCase().includes(q);
      if (!matchP && !matchD && !matchDept) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Outpatient Appointment Schedule
          </h2>
          <p className="text-xs text-slate-500">
            Manage consultations, check in arrivals, and reschedule appointments.
          </p>
        </div>
        <button
          onClick={onOpenBooking}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
        >
          + Book New Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, doctor, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Checked-In">Checked-In</option>
            <option value="In-Progress">In-Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Rescheduled">Rescheduled</option>
          </select>
        </div>

        {selectedDate && (
          <button
            onClick={() => setSelectedDate("")}
            className="text-xs text-teal-600 hover:underline font-semibold"
          >
            Clear Date
          </button>
        )}
      </div>

      {/* Appointments Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">ID</th>
                <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                <th className="py-3.5 px-4 font-semibold">Patient</th>
                <th className="py-3.5 px-4 font-semibold">Doctor & Specialty</th>
                <th className="py-3.5 px-4 font-semibold">Type / Reason</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((app) => (
                <tr key={app.appointment_id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                    #APT-{app.appointment_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{app.appointment_date}</p>
                    <p className="text-[11px] text-teal-700 font-semibold">{app.appointment_time}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{app.patient_name}</p>
                    <p className="text-[11px] text-slate-400">{app.patient_phone || "No phone"}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{app.doctor_name}</p>
                    <p className="text-[11px] text-slate-400">{app.department_name}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      {app.appointment_type}
                    </span>
                    {app.reason_for_visit && (
                      <p className="mt-1 text-[11px] text-slate-500 italic max-w-xs truncate">
                        {app.reason_for_visit}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        app.appointment_status === "Completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : app.appointment_status === "Checked-In"
                          ? "bg-teal-100 text-teal-800"
                          : app.appointment_status === "In-Progress"
                          ? "bg-blue-100 text-blue-800"
                          : app.appointment_status === "Cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : app.appointment_status === "Rescheduled"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {app.appointment_status}
                    </span>
                    {app.token_number && (
                      <p className="mt-1 font-mono text-[10px] text-teal-700 font-bold">
                        Token #{app.token_number}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(app.appointment_status === "Scheduled" || app.appointment_status === "Rescheduled") && (
                        <>
                          <button
                            onClick={() => onOpenCheckInForApp(app.appointment_id)}
                            title="Check-in to Queue"
                            className="rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                          >
                            Check-In
                          </button>
                          <button
                            onClick={() => onRescheduleAppointment(app)}
                            title="Reschedule Date/Time"
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => onCancelAppointment(app.appointment_id)}
                            title="Cancel appointment"
                            className="rounded-lg border border-rose-200 px-2 py-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50 transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No matching appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
