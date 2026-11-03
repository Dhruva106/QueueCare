"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  MapPin,
  CheckCircle,
  Network,
  Stethoscope,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { DoctorRecommendation } from "@/lib/graph";

interface DoctorRecommendationsViewProps {
  onSelectDoctorToBook: (doctorId: number) => void;
}

export default function DoctorRecommendationsView({
  onSelectDoctorToBook,
}: DoctorRecommendationsViewProps) {
  const [recommendations, setRecommendations] = useState<DoctorRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialtyQuery, setSpecialtyQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [maxFee, setMaxFee] = useState<string>("");
  const [graphEngine, setGraphEngine] = useState<string>("Neo4j Graph Engine");
  const [showGraphPathFor, setShowGraphPathFor] = useState<number | null>(null);

  const fetchRecommendations = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (specialtyQuery) params.set("specialty", specialtyQuery);
      if (locationQuery) params.set("location", locationQuery);
      if (maxFee) params.set("maxFee", maxFee);

      const res = await fetch(`/api/recommendations?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.recommendations || []);
        if (data.graphEngine) setGraphEngine(data.graphEngine);
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
    }
  }, [specialtyQuery, locationQuery, maxFee]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchRecommendations]);

  return (
    <div className="space-y-6">
      {/* Search & Preference Filter Header */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-900 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-slate-950">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Graph-Powered Doctor Discovery & Recommendations
              </h3>
              <p className="text-xs text-teal-200">
                Traverses specialty taxonomy, clinic locations, and current availability to find your best clinical match.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-950/60 px-3.5 py-1 text-[11px] font-mono text-teal-300">
            <Network className="h-3.5 w-3.5" />
            <span>{graphEngine}</span>
          </div>
        </div>

        {/* Input filters */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Symptom or specialty (e.g. Heart, Bone, Child, Skin)..."
              value={specialtyQuery}
              onChange={(e) => setSpecialtyQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Preferred Location (e.g. Block A, Block B)..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={maxFee}
              onChange={(e) => setMaxFee(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
            >
              <option value="">Any Consultation Fee</option>
              <option value="600">Budget: Up to INR 600</option>
              <option value="800">Standard: Up to INR 800</option>
              <option value="1000">Specialist: Up to INR 1000</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          Analyzing graph nodes and computing multi-factor recommendations...
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {recommendations.map((rec) => {
            const isTopMatch = rec.matchScore >= 80;

            return (
              <div
                key={rec.doctor_id}
                className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                  isTopMatch
                    ? "border-teal-300 bg-white ring-1 ring-teal-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div>
                  {/* Card Header: Doctor info & Match Score badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-bold text-base">
                        <Stethoscope className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{rec.doctor_name}</h4>
                          {isTopMatch && (
                            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-bold text-teal-800 uppercase">
                              Best Match
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-teal-700">{rec.department_name}</p>
                        <p className="text-[11px] text-slate-500">{rec.specialization}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-bold text-teal-300 font-mono">
                        <TrendingUp className="h-3 w-3" />
                        <span>{rec.matchScore}% Match</span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 font-medium">Graph Score</p>
                    </div>
                  </div>

                  {/* Doctor Details Bar */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Clinic Wing</span>
                      <span className="font-semibold text-slate-800 truncate block">{rec.location}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Consultation Fee</span>
                      <span className="font-semibold text-slate-800 block">INR {rec.consultation_fee}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Queue Backlog</span>
                      <span className="font-semibold text-slate-800 block">
                        {rec.activeWaitingPatients === 0 ? "Immediate" : `~${rec.estimatedWaitMinutes}m (${rec.activeWaitingPatients} waiting)`}
                      </span>
                    </div>
                  </div>

                  {/* Explainable Reasons */}
                  <div className="mt-4 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Why this recommendation:
                    </p>
                    {rec.reasons.map((reason, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                        <CheckCircle className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Graph Traversal Path Toggle */}
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowGraphPathFor(showGraphPathFor === rec.doctor_id ? null : rec.doctor_id)}
                      className="text-[11px] font-mono text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <Network className="h-3 w-3" />
                      <span>{showGraphPathFor === rec.doctor_id ? "Hide Graph Cypher Path" : "View Graph Relationship Path"}</span>
                    </button>
                    {showGraphPathFor === rec.doctor_id && (
                      <div className="mt-2 rounded-lg bg-slate-900 p-2.5 font-mono text-[10px] text-teal-300 leading-relaxed break-all">
                        {rec.graphPath}
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Action */}
                <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Status: <strong className="text-slate-800">{rec.availability_status}</strong>
                  </span>
                  <button
                    onClick={() => onSelectDoctorToBook(rec.doctor_id)}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition flex items-center gap-1"
                  >
                    <span>Book with {rec.doctor_name.split(" ")[1]}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {recommendations.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              No matching doctors found for current preferences. Try adjusting your search or budget.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
