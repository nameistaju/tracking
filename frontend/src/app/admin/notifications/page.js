"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { ArrowLeft, Bell, Check, CheckCheck, Filter, RefreshCw, Search, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import api, { authConfig } from "@/lib/api";

const severityStyles = {
  critical: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  info: "bg-blue-50 border-blue-200 text-blue-700"
};

const severityIcons = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [readFilter, setReadFilter] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (severity) params.set("severity", severity);
      if (readFilter) params.set("isRead", readFilter);

      const response = await api.get(`/api/admin/alerts?${params.toString()}`, authConfig(user.token));
      setAlerts(response.data.alerts || []);
      setPages(response.data.pages || 1);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }, [user, page, severity, readFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = alerts.filter((alert) => {
    if (!search) return true;

    const haystack = [
      alert.message,
      alert.userId?.name,
      alert.userId?.email,
      alert.type,
      alert.severity
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.toLowerCase());
  });

  const markOneRead = async (alertId) => {
    try {
      await api.patch(`/api/admin/alerts/${alertId}/read`, {}, authConfig(user.token));
      setAlerts((previous) =>
        previous.map((alert) =>
          alert._id === alertId
            ? { ...alert, isRead: true, resolvedAt: new Date().toISOString() }
            : alert
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const markAllRead = async () => {
    if (!user) return;

    setMarkingAll(true);
    try {
      await api.patch("/api/admin/alerts/read-all", {}, authConfig(user.token));
      setAlerts((previous) => previous.map((alert) => ({ ...alert, isRead: true })));
    } catch (error) {
      console.error(error);
    }
    setMarkingAll(false);
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-[260px] flex flex-col overflow-hidden">
        <header className="flex flex-col gap-3 items-start justify-between px-4 py-4 pt-16 md:px-7 md:pt-4 bg-white/70 backdrop-blur-xl border-b border-border sticky top-0 z-40 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 pr-10 md:pr-0">
            <Link href="/admin" className="w-8 h-8 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Notification Center
              </h1>
              <p className="text-text-muted text-[11px] mt-0.5">All tracking alerts in one place</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchAlerts}
              className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/20 hover:shadow-sm transition-colors"
              title="Refresh alerts"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search alerts, intern name, or email..."
                className="input-sharpkode pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <select value={severity} onChange={(event) => { setPage(1); setSeverity(event.target.value); }} className="input-sharpkode pl-10">
                <option value="">All severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <select value={readFilter} onChange={(event) => { setPage(1); setReadFilter(event.target.value); }} className="input-sharpkode">
              <option value="">All alerts</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-text-primary">{filteredAlerts.length} alerts on this page</p>
                <p className="text-[11px] text-text-muted">Tracking and location health alerts</p>
              </div>
              <div className="text-[11px] text-text-muted">Page {page} of {pages}</div>
            </div>

            <div className="p-4 space-y-3">
              {loading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-sm">No alerts found for these filters.</div>
              ) : (
                filteredAlerts.map((alert) => {
                  const Icon = severityIcons[alert.severity] || AlertTriangle;

                  return (
                    <div
                      key={alert._id}
                      className={`rounded-2xl border p-4 ${severityStyles[alert.severity] || severityStyles.warning} ${alert.isRead ? "opacity-70" : ""}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{alert.message}</p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-80">
                              <span>{alert.userId?.name || "Unknown intern"}</span>
                              <span>{alert.userId?.email || ""}</span>
                              <span>{new Date(alert.createdAt).toLocaleString()}</span>
                              <span className="uppercase">{alert.type?.replaceAll("_", " ")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${alert.isRead ? "bg-white/70 text-slate-600" : "bg-white text-primary"}`}>
                            {alert.isRead ? "Read" : "Unread"}
                          </span>
                          {!alert.isRead && (
                            <button
                              onClick={() => markOneRead(alert._id)}
                              className="w-9 h-9 rounded-xl bg-white border border-white/70 flex items-center justify-center hover:bg-slate-50 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-border bg-white text-xs font-semibold text-text-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((value) => Math.min(value + 1, pages))}
                disabled={page >= pages}
                className="px-4 py-2 rounded-xl border border-border bg-white text-xs font-semibold text-text-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
