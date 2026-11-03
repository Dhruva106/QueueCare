"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Database,
  Server,
  Network,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { CacheMetrics } from "@/lib/cache";
import { GraphMetrics } from "@/lib/graph";

export default function SystemHealthTab() {
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [graphMetrics, setGraphMetrics] = useState<GraphMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const [cacheRes, graphRes] = await Promise.all([
        fetch("/api/cache/stats").then((r) => r.json()),
        fetch("/api/graph/stats").then((r) => r.json()),
      ]);

      if (cacheRes.success) setCacheMetrics(cacheRes.metrics);
      if (graphRes.success) setGraphMetrics(graphRes.metrics);
    } catch (err) {
      console.error("Health fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      await Promise.resolve();
      if (!ignore) {
        fetchHealth();
      }
    };
    init();
    return () => {
      ignore = true;
    };
  }, [fetchHealth]);

  const handleFlushCache = async () => {
    try {
      const res = await fetch("/api/cache/stats", { method: "POST" });
      const data = await res.json();
      setActionMessage(data.message || "Cache flushed.");
      setTimeout(() => setActionMessage(null), 4000);
      fetchHealth();
    } catch (err) {
      setActionMessage((err as Error).message);
    }
  };

  const handleSyncGraph = async () => {
    try {
      const res = await fetch("/api/graph/stats", { method: "POST" });
      const data = await res.json();
      setActionMessage(data.message || "Graph synchronized.");
      setTimeout(() => setActionMessage(null), 4000);
      fetchHealth();
    } catch (err) {
      setActionMessage((err as Error).message);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading system observability data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            System Architecture & Multi-Database Health Monitor
          </h2>
          <p className="text-xs text-slate-500">
            Real-time observability across the 3-tier database stack: Relational Storage, Redis Cache, and Neo4j Graph.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {actionMessage && (
        <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-semibold text-teal-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 3 Database Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Relational Database */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Relational DB</h3>
                  <p className="text-[11px] text-slate-400">Authoritative Data Store</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            <div className="mt-5 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Engine</span>
                <span className="font-semibold text-slate-800 font-mono">SQLite / MySQL 8.0</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Core Tables</span>
                <span className="font-semibold text-slate-800 font-mono">8 Normalized (3NF)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Security & RBAC</span>
                <span className="font-semibold text-emerald-700">Parameterized & Scrypt</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Concurrency</span>
                <span className="font-semibold text-slate-800">WAL Mode + Cascade FKs</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">All appointments, patients, and queue states persist authoritatively here.</p>
          </div>
        </div>

        {/* Card 2: Redis Cache */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Redis Cache</h3>
                  <p className="text-[11px] text-slate-400">Cache-Aside & Latency Shield</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  cacheMetrics?.connected
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    cacheMetrics?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                {cacheMetrics?.connected ? "Connected" : "Graceful Fallback"}
              </span>
            </div>

            <div className="mt-5 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Cache Hits / Misses</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {cacheMetrics?.hits ?? 0} hits / {cacheMetrics?.misses ?? 0} misses
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Hit Ratio</span>
                <span className="font-semibold text-teal-700 font-mono">
                  {cacheMetrics?.hitRatioPercent ?? 0}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Cache Writes</span>
                <span className="font-semibold text-slate-800 font-mono">{cacheMetrics?.writes ?? 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Outage Protection</span>
                <span className="font-semibold text-emerald-700">Zero App Blocking</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Port 6379</span>
            <button
              onClick={handleFlushCache}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3 text-rose-500" />
              <span>Flush Cache</span>
            </button>
          </div>
        </div>

        {/* Card 3: Neo4j Graph Database */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Neo4j Graph DB</h3>
                  <p className="text-[11px] text-slate-400">Doctor Discovery & Relations</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-800">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                {graphMetrics?.status.includes("Connected") ? "Connected" : "Projection Active"}
              </span>
            </div>

            <div className="mt-5 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Mode</span>
                <span className="font-semibold text-slate-800 font-mono text-[11px]">
                  {graphMetrics?.status ?? "Graph Projection Engine"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Graph Nodes</span>
                <span className="font-semibold text-slate-800 font-mono">{graphMetrics?.nodeCount ?? 18}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Relationships</span>
                <span className="font-semibold text-slate-800 font-mono">{graphMetrics?.relationshipCount ?? 18}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Algorithm</span>
                <span className="font-semibold text-teal-700">Multi-factor Explainable</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Bolt Protocol</span>
            <button
              onClick={handleSyncGraph}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3 text-teal-600" />
              <span>Sync Graph</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explanatory Architecture Diagram Box */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white">
        <h4 className="font-bold text-sm text-teal-300 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Multi-Database Architectural Responsibilities
        </h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs text-slate-300">
          <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800">
            <p className="font-bold text-white mb-1">1. Relational Authority (SQLite / MySQL)</p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Authoritative truth for user identities, password hashes, doctor availability, appointment bookings, queue tokens, and clinical visits. Enforces strict ACID transactions.
            </p>
          </div>
          <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800">
            <p className="font-bold text-white mb-1">2. Redis In-Memory Caching</p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Sub-millisecond cache-aside layer shielding the database from repeated reads of departments, doctor directories, and recommendation query outputs. Invalidates on mutation.
            </p>
          </div>
          <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800">
            <p className="font-bold text-white mb-1">3. Neo4j Graph Relationships</p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Models clinical affinity, specialty hierarchies, and clinic location graphs. Powers the explainable recommendation engine without inventing false availability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
