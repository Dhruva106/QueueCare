"use client";

import React, { useState } from "react";
import {
  Search,
  Phone,
  Mail,
  Calendar,
  UserCheck,
  Edit2,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Patient } from "@/lib/types";
import { calculateAge } from "@/lib/prioritization";

interface PatientsTabProps {
  patients: Patient[];
  onOpenRegister: () => void;
  onViewPatientHistory: (patient: Patient) => void;
  onBookForPatient: (patientId: number) => void;
  onEditPatient?: (patient: Patient) => void;
}

export default function PatientsTab({
  patients,
  onOpenRegister,
  onViewPatientHistory,
  onBookForPatient,
  onEditPatient,
}: PatientsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filtered = patients.filter((p) => {
    if (genderFilter !== "All" && p.gender !== genderFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const phone = p.phone?.toLowerCase() || "";
    const email = p.email?.toLowerCase() || "";
    const pid = String(p.patient_id);
    return fullName.includes(q) || phone.includes(q) || email.includes(q) || pid.includes(q);
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedPatients = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header & Register Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-teal-600" />
            Registered Patient Directory
          </h2>
          <p className="text-xs text-slate-500">
            Demographic profiles, contact details, priority categories, and longitudinal medical visits.
          </p>
        </div>
        <button
          onClick={onOpenRegister}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition"
        >
          + Register New Patient
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, phone, email, or #QC ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-slate-500">Gender:</label>
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filtered.length}</strong> patient{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedPatients.map((patient) => {
          const age = calculateAge(patient.date_of_birth);
          const isSenior = age !== null && age >= 60;
          const isPediatric = age !== null && age <= 12;

          return (
            <div
              key={patient.patient_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-teal-300 hover:shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-800 text-sm shadow-xs">
                      {patient.first_name[0]}{patient.last_name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">
                        {patient.first_name} {patient.last_name}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400">#QC-{patient.patient_id}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {isSenior && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                        Senior (60+)
                      </span>
                    )}
                    {isPediatric && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-bold text-sky-700">
                        Pediatric (&le;12)
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      DOB: {patient.date_of_birth} ({age !== null ? `${age} yrs` : "N/A"}) · {patient.gender || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700">{patient.phone || "No phone"}</span>
                  </div>

                  {patient.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}

                  {patient.address && (
                    <div className="flex items-center gap-2 truncate text-[11px] text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{patient.address}</span>
                    </div>
                  )}

                  {patient.emergency_contact && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-700 pt-1">
                      <ShieldAlert className="h-3 w-3 text-rose-500 shrink-0" />
                      <span className="font-medium">Emergency: {patient.emergency_contact}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                <button
                  onClick={() => onViewPatientHistory(patient)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  History
                </button>

                {onEditPatient && (
                  <button
                    onClick={() => onEditPatient(patient)}
                    className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition shadow-xs"
                    title="Edit Patient Contact & Details"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  onClick={() => onBookForPatient(patient.patient_id)}
                  className="flex items-center gap-1 rounded-xl bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                  title="Book an appointment for this patient"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span>Book</span>
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            No patients found matching &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs">
          <p className="text-slate-500">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filtered.length} total records)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
