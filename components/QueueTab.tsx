"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { QueueEntry, Doctor, Department, PriorityLevel } from "@/lib/types";
import { UserRole, AuthUser } from "@/lib/auth";

interface QueueTabProps {
  queue: QueueEntry[];
  doctors: Doctor[];
  departments: Department[];
  currentRole?: UserRole;
  currentUser?: AuthUser | null;
  onCallPatient: (queueId: number) => void;
  onStartConsultation: (queueId: number) => void;
  onSkipPatient: (queueId: number) => void;
  onCancelQueue?: (queueId: number) => void;
  onOpenCheckIn: () => void;
  onOpenVisitModal: (entry: QueueEntry) => void;
  onOverridePriority: (queueId: number, newPriority: PriorityLevel, reason: string) => void;
}

export default function QueueTab({
  queue,
  doctors,
  departments,
  currentRole = "Administrator",
  currentUser,
  onCallPatient,
  onStartConsultation,
  onSkipPatient,
  onOpenCheckIn,
  onOpenVisitModal,
  onOverridePriority,
}: QueueTabProps) {
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<string>(
    currentRole === "Doctor" && currentUser?.linkedDoctorId ? String(currentUser.linkedDoctorId) : ""
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("Active");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Priority override modal state
  const [overrideEntry, setOverrideEntry] = useState<QueueEntry | null>(null);
  const [newPriority, setNewPriority] = useState<PriorityLevel>("Urgent");
  const [overrideReason, setOverrideReason] = useState("");

  const filteredQueue = queue.filter((entry) => {
    // If Doctor persona, restrict to their patient queue
    if (currentRole === "Doctor" && currentUser?.linkedDoctorId) {
      if (entry.doctor_id !== currentUser.linkedDoctorId) return false;
    } else if (selectedDoc && entry.doctor_id !== Number(selectedDoc)) {
      return false;
    }

    if (selectedDept && entry.department_name !== selectedDept) return false;

    if (selectedStatus === "Active") {
      if (entry.queue_status === "Completed" || entry.queue_status === "Cancelled") return false;
    } else if (selectedStatus !== "All" && entry.queue_status !== selectedStatus) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = entry.patient_name?.toLowerCase().includes(q);
      const matchToken = String(entry.token_number).includes(q);
      const matchDoctor = entry.doctor_name?.toLowerCase().includes(q);
      if (!matchName && !matchToken && !matchDoctor) return false;
    }

    return true;
  });

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideEntry) return;
    onOverridePriority(overrideEntry.queue_id, newPriority, overrideReason);
    setOverrideEntry(null);
    setOverrideReason("");
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Filters, and Check-in Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {currentRole === "Doctor"
              ? `My Patient Queue — ${currentUser?.name || "Doctor"}`
              : "Live Outpatient Queue Monitor"}
          </h2>
          <p className="text-xs text-slate-500">
            {currentRole === "Doctor"
              ? "Checked-in patients ranked by priority tier and wait times waiting for your consultation."
              : "Dynamic triage and consultation dispatching for outpatient clinics."}
          </p>
        </div>
        <button
          onClick={onOpenCheckIn}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
        >
          + Check-In Patient to Queue
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by token #, patient name, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_name}>
                {d.department_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.doctor_id} value={d.doctor_id}>
                {d.doctor_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            <option value="Active">Active Queue (Waiting/Called/In-Consult)</option>
            <option value="Waiting">Waiting Only</option>
            <option value="Called">Called Only</option>
            <option value="In-Consultation">In Consultation</option>
            <option value="Completed">Completed</option>
            <option value="All">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Token</th>
                <th className="py-3.5 px-4 font-semibold">Patient Information</th>
                <th className="py-3.5 px-4 font-semibold">Physician & Specialty</th>
                <th className="py-3.5 px-4 font-semibold">Triage Priority</th>
                <th className="py-3.5 px-4 font-semibold">Check-In</th>
                <th className="py-3.5 px-4 font-semibold">Est. Wait (min)</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Queue Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.map((entry) => (
                <tr
                  key={entry.queue_id}
                  className={`hover:bg-slate-50/80 transition ${
                    entry.priority_level === "Emergency" ? "bg-rose-50/30" : ""
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <span className="inline-flex h-8 w-14 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-bold text-teal-300 shadow-sm">
                      #{entry.token_number}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900 text-sm">{entry.patient_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {entry.patient_phone || "No phone"} · {entry.patient_gender || "Other"}
                    </p>
                    {entry.reason_for_visit && (
                      <p className="mt-0.5 text-[11px] text-slate-500 italic max-w-xs truncate">
                        &quot;{entry.reason_for_visit}&quot;
                      </p>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{entry.doctor_name}</p>
                    <p className="text-[11px] text-slate-400">{entry.department_name}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          entry.priority_level === "Emergency"
                            ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                            : entry.priority_level === "Urgent"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : entry.priority_level === "Senior Citizen"
                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                            : entry.priority_level === "Child/Infant"
                            ? "bg-sky-100 text-sky-800 border border-sky-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {entry.priority_level}
                      </span>
                      {entry.priority_reason && (
                        <p className="mt-1 text-[10px] text-slate-400 max-w-[180px] leading-tight">
                          {entry.priority_reason}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {entry.check_in_time || "N/A"}
                  </td>

                  <td className="py-3.5 px-4">
                    {entry.priority_level === "Emergency" ? (
                      <span className="font-bold text-rose-600">Immediate (0m)</span>
                    ) : entry.queue_status === "In-Consultation" ? (
                      <span className="font-semibold text-teal-700">In Room</span>
                    ) : entry.queue_status === "Completed" ? (
                      <span className="text-slate-400">Completed</span>
                    ) : (
                      <span className="font-semibold text-slate-800">
                        ~{entry.estimated_wait_time} min
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 font-bold text-xs ${
                        entry.queue_status === "In-Consultation"
                          ? "text-teal-700"
                          : entry.queue_status === "Called"
                          ? "text-purple-700"
                          : entry.queue_status === "Completed"
                          ? "text-emerald-700"
                          : entry.queue_status === "Skipped"
                          ? "text-slate-400"
                          : "text-amber-700"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          entry.queue_status === "In-Consultation"
                            ? "bg-teal-600"
                            : entry.queue_status === "Called"
                            ? "bg-purple-600 animate-ping"
                            : entry.queue_status === "Completed"
                            ? "bg-emerald-600"
                            : entry.queue_status === "Skipped"
                            ? "bg-slate-400"
                            : "bg-amber-500"
                        }`}
                      />
                      {entry.queue_status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {entry.queue_status === "Waiting" && (
                        <button
                          onClick={() => onCallPatient(entry.queue_id)}
                          title="Call patient to examination room"
                          className="rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                        >
                          Call
                        </button>
                      )}

                      {entry.queue_status === "Called" && (
                        <button
                          onClick={() => onStartConsultation(entry.queue_id)}
                          title="Start physician consultation"
                          className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                        >
                          Start Visit
                        </button>
                      )}

                      {entry.queue_status === "In-Consultation" && (
                        <button
                          onClick={() => onOpenVisitModal(entry)}
                          title="Record clinical notes & complete consultation"
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Record Notes
                        </button>
                      )}

                      {entry.queue_status !== "Completed" && entry.queue_status !== "Cancelled" && (
                        <>
                          <button
                            onClick={() => {
                              setOverrideEntry(entry);
                              setNewPriority(entry.priority_level);
                            }}
                            title="Override clinical priority"
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition"
                          >
                            Triage
                          </button>
                          <button
                            onClick={() => onSkipPatient(entry.queue_id)}
                            title="Skip patient"
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No matching queue entries found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Priority Override Modal */}
      {overrideEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Clinical Triage Priority Override
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Patient: <strong>{overrideEntry.patient_name}</strong> · Token #{overrideEntry.token_number}
            </p>

            <form onSubmit={handleSaveOverride} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Priority Level</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="Emergency">Emergency (Immediate Escalation)</option>
                  <option value="Urgent">Urgent (Acute Pain / High Fever)</option>
                  <option value="Senior Citizen">Senior Citizen (Geriatric Care)</option>
                  <option value="Child/Infant">Child / Infant (Pediatric Care)</option>
                  <option value="Normal">Normal (Standard OPD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Override Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diaphoresis, acute pain spike, elevated BP"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setOverrideEntry(null)}
                  className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
                >
                  Apply Priority Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
