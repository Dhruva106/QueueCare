"use client";

import React, { useState } from "react";
import { Search, Pill } from "lucide-react";
import { Visit } from "@/lib/types";

interface VisitsTabProps {
  visits: Visit[];
}

export default function VisitsTab({ visits }: VisitsTabProps) {
  const [search, setSearch] = useState("");

  const filtered = visits.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.patient_name?.toLowerCase().includes(q) ||
      v.doctor_name?.toLowerCase().includes(q) ||
      v.diagnosis?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Clinical Encounters & Medical Records
          </h2>
          <p className="text-xs text-slate-500">
            Completed consultations, electronic prescriptions, physician notes, and billing history.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient, physician, or clinical diagnosis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((v) => (
          <div
            key={v.visit_id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  #VISIT-{v.visit_id}
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{v.patient_name}</h4>
                <p className="text-xs text-slate-500">Physician: {v.doctor_name}</p>
              </div>

              <div className="text-right">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    v.visit_status === "Completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {v.visit_status}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  {v.visit_date} {v.start_time ? `· ${v.start_time}` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Diagnosis:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {v.diagnosis || "No diagnosis logged"}
                </p>
              </div>

              {v.prescription && (
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-teal-800 font-semibold text-[11px]">
                    <Pill className="h-3.5 w-3.5" />
                    <span>Rx Prescription:</span>
                  </div>
                  <p className="text-slate-700 mt-1 font-mono text-[11px] leading-relaxed">
                    {v.prescription}
                  </p>
                </div>
              )}

              {v.doctor_notes && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Doctor Advice:</span>
                  <p className="text-slate-600 mt-0.5">{v.doctor_notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                <span className="text-slate-500">Consultation Billed:</span>
                <span className="font-bold text-slate-900">INR {v.billed_amount}</span>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            No clinical records found.
          </div>
        )}
      </div>
    </div>
  );
}
