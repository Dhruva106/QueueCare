"use client";

import React, { useEffect, useState } from "react";

export default function ReportsTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.reports);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading database analytics...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Relational Database Reports & Analytical Queries
        </h2>
        <p className="text-xs text-slate-500">
          Demonstrates execution of required DBMS syllabus queries: Aggregates, GROUP BY, Correlated Subqueries, and Complex Joins.
        </p>
      </div>

      {/* Query 1: Group By & Aggregate on Priority Tiers */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="rounded bg-teal-50 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-700">
              Query 7.1 · GROUP BY & AGGREGATE
            </span>
            <h3 className="mt-1 font-bold text-slate-900 text-sm">
              Waiting Queue Distribution & Latency by Priority Level
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">COUNT(), AVG(), MIN(), MAX()</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Priority Level</th>
                <th className="py-2.5 px-3">Patient Count</th>
                <th className="py-2.5 px-3">Min Wait (min)</th>
                <th className="py-2.5 px-3">Avg Wait (min)</th>
                <th className="py-2.5 px-3">Max Wait (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data?.priorityStats?.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{row.priority_level}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-teal-700">{row.patient_count}</td>
                  <td className="py-2.5 px-3 font-mono">{row.min_wait_time}m</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-amber-700">{row.avg_wait_time}m</td>
                  <td className="py-2.5 px-3 font-mono">{row.max_wait_time}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Query 2: Department Consultation & Revenue Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700">
              Query 7.1.2 · MULTI-TABLE AGGREGATION
            </span>
            <h3 className="mt-1 font-bold text-slate-900 text-sm">
              Department Performance & Consultation Revenue
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">JOIN department, doctor, visit</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Doctors</th>
                <th className="py-2.5 px-3">Completed Visits</th>
                <th className="py-2.5 px-3">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data?.departmentStats?.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{row.department_name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{row.location}</td>
                  <td className="py-2.5 px-3 font-mono">{row.total_doctors}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{row.completed_visits}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">INR {row.total_revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Query 3: Correlated Subquery */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="rounded bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700">
              Query 7.4 · CORRELATED SUBQUERY
            </span>
            <h3 className="mt-1 font-bold text-slate-900 text-sm">
              Doctors Earning Above Department Average Consultation Fee
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">WHERE fee &gt; (SELECT AVG() ... WHERE dept_id)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Doctor</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Specialization</th>
                <th className="py-2.5 px-3">Consultation Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data?.doctorsAboveDeptAvg?.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{row.doctor_name}</td>
                  <td className="py-2.5 px-3 text-teal-700 font-semibold">{row.department_name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{row.specialization}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">INR {row.consultation_fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
