"use client";

import React from "react";
import {
  LayoutDashboard,
  Users2,
  CalendarDays,
  UserRound,
  Stethoscope,
  FileSpreadsheet,
  BarChart3,
  Bell,
  HeartPulse,
  Database,
  Sparkles,
  Server,
  UserCheck,
} from "lucide-react";
import { UserRole } from "@/lib/auth";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  waitingCount: number;
  unreadNotifsCount: number;
  currentRole: UserRole;
  currentUserName?: string;
  onResetDb: () => void;
}

interface NavItemConfig {
  name: string;
  label?: Record<UserRole, string>;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles: UserRole[];
  tag?: string;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  waitingCount,
  unreadNotifsCount,
  currentRole,
  currentUserName,
  onResetDb,
}: SidebarProps) {
  const allNavItems: NavItemConfig[] = [
    {
      name: "Overview",
      label: {
        Administrator: "Executive Overview",
        Doctor: "Doctor Workspace",
        Receptionist: "Front Desk Overview",
        Patient: "Patient Portal",
      },
      icon: LayoutDashboard,
      roles: ["Administrator", "Doctor", "Receptionist", "Patient"],
    },
    {
      name: "Queue Management",
      label: {
        Administrator: "Queue Management",
        Doctor: "My Patient Queue",
        Receptionist: "Live Waiting Queue",
        Patient: "Queue Status",
      },
      icon: Users2,
      badge: waitingCount > 0 ? waitingCount : undefined,
      roles: ["Administrator", "Doctor", "Receptionist"],
    },
    {
      name: "Appointments",
      label: {
        Administrator: "All Appointments",
        Doctor: "Assigned Consultations",
        Receptionist: "Bookings Desk",
        Patient: "My Appointments",
      },
      icon: CalendarDays,
      roles: ["Administrator", "Doctor", "Receptionist", "Patient"],
    },
    {
      name: "Patients",
      label: {
        Administrator: "Patient Records",
        Doctor: "Patients",
        Receptionist: "Patient Directory",
        Patient: "My Profile",
      },
      icon: UserRound,
      roles: ["Administrator", "Receptionist"],
    },
    {
      name: "Doctors",
      label: {
        Administrator: "Physician Roster",
        Doctor: "Colleagues",
        Receptionist: "Doctor Directory",
        Patient: "Specialists",
      },
      icon: Stethoscope,
      roles: ["Administrator", "Doctor", "Receptionist"],
    },
    {
      name: "Doctor Discovery",
      label: {
        Administrator: "Doctor Discovery",
        Doctor: "Referral Network",
        Receptionist: "Specialist Finder",
        Patient: "Find Doctors (AI)",
      },
      icon: Sparkles,
      roles: ["Administrator", "Patient", "Receptionist"],
      tag: "Neo4j",
    },
    {
      name: "Clinical Visits",
      label: {
        Administrator: "Clinical Visits & Rx",
        Doctor: "Clinical Visits & Rx",
        Receptionist: "Visits History",
        Patient: "My Medical Visits",
      },
      icon: FileSpreadsheet,
      roles: ["Administrator", "Doctor", "Patient"],
    },
    {
      name: "Reports & Analytics",
      label: {
        Administrator: "Reports & Analytics",
        Doctor: "Department Metrics",
        Receptionist: "Intake Reports",
        Patient: "Reports",
      },
      icon: BarChart3,
      roles: ["Administrator", "Receptionist"],
      tag: "SQL",
    },
    {
      name: "System Health & DBs",
      label: {
        Administrator: "System Health & DBs",
        Doctor: "System Health",
        Receptionist: "System Health",
        Patient: "System Health",
      },
      icon: Server,
      roles: ["Administrator"],
      tag: "Redis+Graph",
    },
    {
      name: "Notifications",
      label: {
        Administrator: "Notifications & SMS",
        Doctor: "Clinical Alerts",
        Receptionist: "Desk Notifications",
        Patient: "My Notifications",
      },
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
      roles: ["Administrator", "Doctor", "Receptionist", "Patient"],
    },
  ];

  // Filter items visible to current role
  const navItems = allNavItems.filter((item) => item.roles.includes(currentRole));

  const roleColors: Record<UserRole, { badge: string; text: string }> = {
    Administrator: { badge: "bg-purple-900/60 text-purple-300 border-purple-700/50", text: "text-purple-300" },
    Doctor: { badge: "bg-sky-900/60 text-sky-300 border-sky-700/50", text: "text-sky-300" },
    Receptionist: { badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50", text: "text-emerald-300" },
    Patient: { badge: "bg-amber-900/60 text-amber-300 border-amber-700/50", text: "text-amber-300" },
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
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-950 p-5 text-white md:flex z-30 border-r border-slate-900">
      {/* Brand logo */}
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-xl font-bold text-slate-950 shadow-md">
          <HeartPulse className="h-6 w-6 text-slate-950" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            QueueCare
          </h1>
          <p className="text-[11px] font-medium text-teal-300">Hospital Queue &amp; Triage</p>
        </div>
      </div>

      {/* User Persona Card in Sidebar */}
      <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-inner">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 font-bold text-slate-950 text-xs shadow-sm">
            {getInitials(currentUserName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white leading-tight">
              {currentUserName || currentRole}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <UserCheck className="h-3 w-3 text-slate-400" />
              <span className={`text-[10px] font-medium ${roleColors[currentRole]?.text}`}>
                {currentRole}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Clinical Modules
      </p>

      {/* Navigation items */}
      <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;
          const label = item.label?.[currentRole] || item.name;

          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                isActive
                  ? "bg-teal-500 font-semibold text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                <span className="truncate">{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.tag && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-slate-900 text-teal-300"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {item.tag}
                  </span>
                )}
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isActive
                        ? "bg-slate-950 text-teal-300"
                        : "bg-teal-900/60 text-teal-300 border border-teal-700/50"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Database status & Quick Reset */}
      <div className="mt-auto space-y-3 pt-4 border-t border-slate-900">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Relational DB
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            MySQL 8.0 schema with 8 normalized tables.
          </p>
          {currentRole === "Administrator" && (
            <button
              onClick={onResetDb}
              className="mt-2.5 w-full rounded-lg border border-slate-700 bg-slate-800/80 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Reset Seed Data
            </button>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-500">
          QueueCare v1.0 · PES University
        </p>
      </div>
    </aside>
  );
}
