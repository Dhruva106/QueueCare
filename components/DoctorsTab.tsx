"use client";

import React, { useState } from "react";
import {
  Stethoscope,
  Phone,
  Mail,
  Award,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Edit2,
  Power,
  Search,
  CalendarPlus,
} from "lucide-react";
import { Doctor, Department } from "@/lib/types";
import { UserRole } from "@/lib/auth";

interface DoctorsTabProps {
  doctors: Doctor[];
  departments: Department[];
  currentRole?: UserRole;
  onUpdateAvailability: (doctorId: number, newStatus: string) => void;
  onOpenAddDoctor?: () => void;
  onEditDoctor?: (doctor: Doctor) => void;
  onToggleStatus?: (doctorId: number, currentStatus: string) => void;
  onBookForDoctor?: (doctorId: number) => void;
}

export default function DoctorsTab({
  doctors,
  departments,
  currentRole = "Administrator",
  onUpdateAvailability,
  onOpenAddDoctor,
  onEditDoctor,
  onToggleStatus,
  onBookForDoctor,
}: DoctorsTabProps) {
  const [selectedDept, setSelectedDept] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = doctors.filter((d) => {
    if (selectedDept && d.department_name !== selectedDept) return false;
    if (statusFilter === "Active" && d.status !== "Active") return false;
    if (statusFilter === "Inactive" && d.status === "Active") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = d.doctor_name?.toLowerCase().includes(q);
      const matchSpec = d.specialization?.toLowerCase().includes(q);
      const matchDept = d.department_name?.toLowerCase().includes(q);
      if (!matchName && !matchSpec && !matchDept) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            Medical Staff &amp; Doctor Roster
          </h2>
          <p className="text-xs text-slate-500">
            Specialist registry, departmental alignment, OPD schedules, and real-time duty status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by physician or specialty..."
              className="w-56 rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs focus:border-teal-500 focus:outline-none shadow-xs"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.department_id} value={dept.department_name}>
                {dept.department_name} ({dept.location})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs focus:border-teal-500 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>

          {/* Add Doctor Button for Admins */}
          {currentRole === "Administrator" && onOpenAddDoctor && (
            <button
              onClick={onOpenAddDoctor}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Register Doctor</span>
            </button>
          )}
        </div>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => {
          const isAvailable = doc.availability_status === "Available";
          const isOnBreak = doc.availability_status === "On Break";
          const isInConsultation = doc.availability_status === "In-Consultation";
          const isActive = doc.status === "Active";

          return (
            <div
              key={doc.doctor_id}
              className={`rounded-2xl border bg-white p-5 shadow-xs transition flex flex-col justify-between ${
                isActive ? "border-slate-200 hover:border-teal-300" : "border-slate-300/80 bg-slate-50/50 opacity-80"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 font-bold shadow-xs">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm">{doc.doctor_name}</h3>
                        {!isActive && (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-teal-700 font-semibold">{doc.department_name}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      isAvailable
                        ? "bg-emerald-100 text-emerald-800"
                        : isOnBreak
                        ? "bg-amber-100 text-amber-800"
                        : isInConsultation
                        ? "bg-purple-100 text-purple-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isAvailable
                          ? "bg-emerald-500"
                          : isOnBreak
                          ? "bg-amber-500"
                          : isInConsultation
                          ? "bg-purple-500 animate-pulse"
                          : "bg-slate-400"
                      }`}
                    />
                    {doc.availability_status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <p className="text-slate-800 font-medium">{doc.specialization}</p>

                  {doc.qualification && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{doc.qualification}</span>
                    </div>
                  )}

                  {/* Schedule & Location */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {doc.working_days || "Mon-Fri"}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {doc.working_hours_start || "09:00"} - {doc.working_hours_end || "17:00"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {doc.room_number || "OPD Room 101"}
                      </span>
                      <span className="font-semibold text-slate-900">
                        ₹{doc.consultation_fee} / visit
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {doc.phone || "N/A"}
                    </span>
                    {doc.email && (
                      <span className="flex items-center gap-1.5 truncate max-w-[140px]">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{doc.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons & duty status */}
              <div className="mt-4 border-t border-slate-100 pt-3 space-y-2.5">
                {/* Duty Switcher */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                    Duty Status:
                  </label>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {["Available", "On Break", "Off Duty"].map((status) => (
                      <button
                        key={status}
                        onClick={() => onUpdateAvailability(doc.doctor_id, status)}
                        className={`rounded-lg py-1 px-1.5 font-medium transition ${
                          doc.availability_status === status
                            ? "bg-slate-900 text-white font-semibold shadow-xs"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Administrative & Booking Controls */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {onBookForDoctor && (
                    <button
                      onClick={() => onBookForDoctor(doc.doctor_id)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      <span>Book Slot</span>
                    </button>
                  )}

                  {currentRole === "Administrator" && onEditDoctor && (
                    <button
                      onClick={() => onEditDoctor(doc)}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                      title="Edit Profile & Schedule"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  )}

                  {currentRole === "Administrator" && onToggleStatus && (
                    <button
                      onClick={() => onToggleStatus(doc.doctor_id, doc.status)}
                      className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
                          : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                      title={isActive ? "Deactivate Doctor" : "Activate Doctor"}
                    >
                      <Power className="h-3 w-3" />
                      <span>{isActive ? "Deactivate" : "Activate"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Stethoscope className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-2 text-sm font-bold text-slate-800">No Specialists Found</h3>
          <p className="mt-1 text-xs text-slate-400">
            No doctors matched your selected department or search criteria.
          </p>
        </div>
      )}
    </div>
  );
}
