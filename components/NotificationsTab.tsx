"use client";

import React from "react";
import { Bell } from "lucide-react";
import { Notification } from "@/lib/types";

interface NotificationsTabProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
}

export default function NotificationsTab({
  notifications,
  onMarkAllRead,
}: NotificationsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            System & Patient Notification Log
          </h2>
          <p className="text-xs text-slate-500">
            Audit feed of automated patient alerts, token dispatches, and appointment confirmations.
          </p>
        </div>
        <button
          onClick={onMarkAllRead}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          Mark All as Read
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {notifications.map((n) => {
          const isUnread = n.notification_status === "Sent";

          return (
            <div
              key={n.notification_id}
              className={`p-4 transition flex items-start justify-between gap-3 ${
                isUnread ? "bg-teal-50/40" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    n.notification_type.includes("Queue")
                      ? "bg-amber-100 text-amber-700"
                      : n.notification_type.includes("Visit")
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{n.notification_type}</span>
                    {n.patient_name && (
                      <span className="text-[11px] font-semibold text-teal-700">
                        · Patient: {n.patient_name}
                      </span>
                    )}
                    {isUnread && (
                      <span className="rounded-full bg-teal-500 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{n.message}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">{n.sent_time}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isUnread ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {n.notification_status}
              </span>
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-400">
            No notifications logged yet.
          </div>
        )}
      </div>
    </div>
  );
}
