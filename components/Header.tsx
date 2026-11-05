"use client";

import React from "react";
import { UserRole, AuthUser } from "@/lib/auth";
import { Patient, Doctor } from "@/lib/types";
import {
  Shield,
  RefreshCw,
  CalendarPlus,
  UserPlus,
  ClipboardCheck,
  ChevronDown,
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  currentRole: UserRole;
  currentUserName?: string;
  currentUser?: AuthUser | null;
  patients?: Patient[];
  doctors?: Doctor[];
  onSwitchPersona: (personaKey: string, patientId?: number, doctorId?: number) => void;
  waitingCount: number;
  isRealtimeConnected?: boolean;
  onRefresh: () => void;
  onOpenBooking: () => void;
  onOpenCheckIn: () => void;
  onOpenRegister: () => void;
}

export default function Header({
  activeTab,
  currentRole,
  currentUserName,
  currentUser,
  patients = [],
  doctors = [],
  onSwitchPersona,
  waitingCount,
  isRealtimeConnected = true,
  onRefresh,
  onOpenBooking,
  onOpenCheckIn,
  onOpenRegister,
}: HeaderProps) {
  // Determine current select value
  const getCurrentSelectValue = () => {
    if (currentRole === "Administrator") {
      if (currentUserName?.toLowerCase().includes("pramath")) {
        return "admin_pramath";
      }
      return "admin_dhruva";
    }
    if (currentRole === "Doctor") {
      return `doctor:${currentUser?.linkedDoctorId || 1}`;
    }
    if (currentRole === "Receptionist") return "receptionist";
    if (currentRole === "Patient") {
      return `patient:${currentUser?.linkedPatientId || 1}`;
    }
    return "admin_dhruva";
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val.startsWith("patient:")) {
      const pid = parseInt(val.split(":")[1], 10);
      onSwitchPersona("patient", pid);
    } else if (val.startsWith("doctor:")) {
      const did = parseInt(val.split(":")[1], 10);
      onSwitchPersona("doctor", undefined, did);
    } else {
      onSwitchPersona(val);
    }
  };

  const getRoleBadgeClasses = () => {
    switch (currentRole) {
      case "Administrator":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Doctor":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "Receptionist":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Patient":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "QC";
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-3.5 backdrop-blur-md lg:px-10 shadow-xs">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>QueueCare</span>
          <span>/</span>
          <span className="text-teal-600 font-bold">{activeTab}</span>
        </div>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{activeTab}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Real-time SSE Live Sync indicator */}
        <div
          title={isRealtimeConnected ? "Real-time SSE data sync active across sessions" : "Reconnecting to real-time stream..."}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-xs transition ${
            isRealtimeConnected
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span className="relative flex h-2 w-2">
            {isRealtimeConnected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isRealtimeConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              }`}
            ></span>
          </span>
          <span className="text-[11px]">{isRealtimeConnected ? "Live Sync Active" : "Reconnecting..."}</span>
        </div>

        {/* Live waiting pill */}
        <div className="flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-medium text-teal-800 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
          </span>
          <span className="font-semibold">{waitingCount} waiting in queue</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          title="Refresh database records"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-xs"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        {/* Role-based action buttons */}
        <div className="hidden sm:flex items-center gap-2">
          {(currentRole === "Administrator" || currentRole === "Receptionist") && (
            <>
              <button
                onClick={onOpenCheckIn}
                className="flex items-center gap-1.5 rounded-xl border border-teal-600 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition shadow-xs"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span>Check-In</span>
              </button>
              <button
                onClick={onOpenRegister}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>+ Register</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenBooking}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>+ Book Appointment</span>
          </button>
        </div>

        {/* Persona & RBAC Switcher Dropdown */}
        <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border font-bold text-xs shadow-xs ${getRoleBadgeClasses()}`}
          >
            {getInitials(currentUserName)}
          </div>
          <div className="text-left relative">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-teal-600" />
              <label htmlFor="persona-select" className="sr-only">
                Switch Active Persona
              </label>
              <select
                id="persona-select"
                value={getCurrentSelectValue()}
                onChange={handleSelectChange}
                className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer hover:text-teal-700 pr-5 appearance-none"
                title="Switch Active Persona & Access Permissions"
              >
                <optgroup label="System Administrators (Project Evaluation)">
                  <option value="admin_dhruva">Dhruva G Hegde (Administrator · Project Lead)</option>
                  <option value="admin_pramath">Pramath G Hegde (Administrator · Co-Lead)</option>
                </optgroup>
                <optgroup label="Physicians (Multi-Doctor Portal)">
                  {doctors.length > 0 ? (
                    doctors.map((doc) => (
                      <option key={doc.doctor_id} value={`doctor:${doc.doctor_id}`}>
                        {doc.doctor_name} ({doc.specialization || "Physician"} · Room {doc.room_number || "OPD"})
                      </option>
                    ))
                  ) : (
                    <option value="doctor:1">Dr. Rajesh Sharma (Cardiology · Room 101)</option>
                  )}
                </optgroup>
                <optgroup label="Front Desk & Intake Desk">
                  <option value="receptionist">Kavya Raman (Receptionist · Front Desk)</option>
                </optgroup>
                <optgroup label="Patient Portal (Self-Service)">
                  {patients.length > 0 ? (
                    patients.slice(0, 10).map((p) => (
                      <option key={p.patient_id} value={`patient:${p.patient_id}`}>
                        {p.first_name} {p.last_name} (Patient #{p.patient_id})
                      </option>
                    ))
                  ) : (
                    <option value="patient:1">Patient Portal (Self-Service)</option>
                  )}
                </optgroup>
              </select>
              <ChevronDown className="h-3 w-3 text-slate-400 absolute right-0 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[190px]">
              {currentRole === "Patient" ? "Patient Self-Service Portal" : `${currentRole} · Full Access`}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
