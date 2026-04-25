"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import { Route, Calendar, MapPin, Navigation, Clock, Play, Eye, ArrowLeft, Download, Crosshair } from "lucide-react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import api, { authConfig } from "@/lib/api";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });
const RoutePlayback = dynamic(() => import("@/components/RoutePlayback"), { ssr: false });

export default function RoutesPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [routeData, setRouteData] = useState(null);
  const [dwellZones, setDwellZones] = useState([]);
  const [breakEvents, setBreakEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("route");

  useEffect(() => {
    if (!user) return;

    const fetchAgents = async () => {
      try {
        const response = await api.get("/api/admin/interns", authConfig(user.token));
        setAgents(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchAgents();
  }, [user]);

  const fetchRoute = useCallback(async () => {
    if (!user || !selectedAgent) return;

    setLoading(true);
    try {
      const [routeRes, dwellRes] = await Promise.all([
        api.get(`/api/admin/route-history/${selectedAgent._id}?date=${selectedDate}`, authConfig(user.token)),
        api.get(`/api/admin/dwell-zones/${selectedAgent._id}?date=${selectedDate}`, authConfig(user.token))
      ]);
      setRouteData(routeRes.data);
      setBreakEvents(routeRes.data.breakEvents || []);
      setDwellZones(dwellRes.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }, [user, selectedAgent, selectedDate]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const downloadDailyReport = async () => {
    if (!user) return;

    try {
      const response = await api.get(`/api/admin/reports/daily/export?date=${selectedDate}`, {
        ...authConfig(user.token),
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `daily-intern-report-${selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-[260px] flex flex-col overflow-hidden">
        <header className="flex flex-col gap-3 px-4 py-4 pt-16 md:px-7 md:pt-4 bg-white/60 backdrop-blur-lg border-b border-border sticky top-0 z-40 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 pr-10 md:pr-0">
            <Link href="/admin" className="w-8 h-8 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
                <Route className="w-5 h-5 text-primary" /> Routes
              </h1>
              <p className="text-text-muted text-[11px] mt-0.5">Visualize routes, client stops, and GPS quality</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={downloadDailyReport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border bg-white text-text-secondary border-border hover:text-primary hover:border-primary/20 transition-all">
              <Download className="w-3.5 h-3.5" /> Day Report
            </button>
            <button onClick={() => setViewMode("route")} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${viewMode === "route" ? "bg-primary/8 text-primary border-primary/15" : "bg-white text-text-secondary border-border"}`}>
              <Eye className="w-3.5 h-3.5" /> Route
            </button>
            <button onClick={() => setViewMode("playback")} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${viewMode === "playback" ? "bg-violet-50 text-violet-500 border-violet-200" : "bg-white text-text-secondary border-border"}`}>
              <Play className="w-3.5 h-3.5" /> Playback
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col xl:flex-row overflow-hidden">
          <div className="w-full xl:w-[300px] flex flex-col border-b xl:border-b-0 xl:border-r border-border bg-white max-h-[60vh] xl:max-h-none overflow-hidden">
            <div className="p-5 border-b border-border">
              <label className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-2 block">Select Agent</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {agents.map((agent) => (
                  <button
                    key={agent._id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedAgent?._id === agent._id ? "bg-primary/6 border-primary/15 text-primary" : "bg-white border-border text-text-secondary hover:bg-surface-hover"}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${selectedAgent?._id === agent._id ? "bg-brand-100 text-primary" : "bg-slate-100 text-text-muted"}`}>
                      {agent.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{agent.name}</p>
                      <p className="text-[10px] text-text-muted truncate">{agent.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 border-b border-border">
              <label className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date
              </label>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} max={new Date().toISOString().split("T")[0]} className="input-sharpkode text-sm" />
            </div>

            {routeData && !loading && (
              <div className="p-4 md:p-5 space-y-3 overflow-y-auto">
                <h3 className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Summary</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="stat-card p-3">
                    <div className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5"><MapPin className="w-3 h-3" />Points</div>
                    <p className="text-lg font-extrabold text-text-primary">{routeData.totalPoints}</p>
                  </div>
                  <div className="stat-card p-3">
                    <div className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5"><Navigation className="w-3 h-3" />Distance</div>
                    <p className="text-lg font-extrabold text-text-primary">{routeData.totalDistanceKm} km</p>
                  </div>
                  <div className="stat-card p-3">
                    <div className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5"><Crosshair className="w-3 h-3" />Avg GPS</div>
                    <p className="text-lg font-extrabold text-text-primary">{routeData.averageAccuracyMeters ? `${routeData.averageAccuracyMeters} m` : "--"}</p>
                  </div>
                  <div className="stat-card p-3">
                    <div className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5"><MapPin className="w-3 h-3" />Clients</div>
                    <p className="text-lg font-extrabold text-text-primary">{routeData.visitedClients?.length || 0}</p>
                  </div>
                </div>

                {routeData.timeRange && (
                  <div className="stat-card p-3">
                    <div className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5"><Clock className="w-3 h-3" />Active Time</div>
                    <p className="text-xs font-semibold text-text-secondary">
                      {new Date(routeData.timeRange.start).toLocaleTimeString()} - {new Date(routeData.timeRange.end).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                {routeData.gpsSummary && (
                  <div className="stat-card p-3">
                    <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider font-semibold">GPS Quality</div>
                    <p className="text-xs text-text-secondary">High: {routeData.gpsSummary.high} | Medium: {routeData.gpsSummary.medium} | Low: {routeData.gpsSummary.low}</p>
                  </div>
                )}

                {routeData.visitedClients?.length > 0 && (
                  <div>
                    <h3 className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-2">Client Stops ({routeData.visitedClients.length})</h3>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {routeData.visitedClients.map((client, index) => (
                        <motion.div key={client._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="p-3 bg-brand-50 border border-brand-100 rounded-xl">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="text-xs font-bold text-primary">{client.clientName}</p>
                              <p className="text-[10px] text-text-muted">{client.businessName || client.clientPhone}</p>
                            </div>
                            <span className="text-[9px] text-text-muted">{new Date(client.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-1 truncate">{client.addressText || client.address?.formatted || "Unknown address"}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {breakEvents.length > 0 && (
                  <div>
                    <h3 className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-2">Break Events ({breakEvents.length})</h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {breakEvents.map((event, index) => (
                        <motion.div key={event._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className={`p-3 rounded-xl border ${event.type === "break_start" ? "bg-amber-50 border-amber-100" : "bg-violet-50 border-violet-100"}`}>
                          <div className="flex justify-between items-start gap-2">
                            <p className={`text-xs font-bold ${event.type === "break_start" ? "text-amber-700" : "text-violet-600"}`}>
                              {event.type === "break_start" ? "Break Started" : "Break Ended"}
                            </p>
                            <span className="text-[9px] text-text-muted">{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-1 truncate">{event.address?.formatted || `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {dwellZones.length > 0 && (
                  <div>
                    <h3 className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-2">Dwell Zones ({dwellZones.length})</h3>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {dwellZones.map((zone, index) => (
                        <motion.div key={index} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-violet-600">Stay {zone.durationMinutes} min</p>
                            <span className="text-[9px] text-text-muted">{new Date(zone.enteredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-1 truncate">{zone.address?.formatted || "Unknown"}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading && <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}
            {!selectedAgent && !loading && <div className="flex-1 flex items-center justify-center p-8"><p className="text-text-muted text-xs text-center">Select an agent to view their route</p></div>}
          </div>

          <div className="flex-1 min-h-[420px] xl:min-h-0">
            {viewMode === "route" ? (
              <RouteMap logs={routeData?.logs || []} visitedClients={routeData?.visitedClients || []} breakEvents={breakEvents} dwellZones={dwellZones} showDwell={true} />
            ) : (
              <RoutePlayback logs={routeData?.logs || []} userName={selectedAgent?.name || ""} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
