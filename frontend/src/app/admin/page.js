"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import {
  Users,
  Target,
  Activity,
  Radio,
  Bell,
  RefreshCw,
  MapPin,
  Clock,
  TrendingUp,
  ArrowUpRight,
  WifiOff,
  Circle,
  AlertTriangle,
  Check,
  Route,
  BarChart3,
  Search,
  Maximize2,
  Minimize2,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import api, { authConfig } from "@/lib/api";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

const POLL_INTERVAL = 15000;

function AgentCard({ agent, index, isSelected, onClick }) {
  const isOnline = agent.isOnline;
  const lastSeenText = agent.minutesAgo === null
    ? "Never seen"
    : agent.minutesAgo === 0
    ? "Just now"
    : `${agent.minutesAgo}m ago`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all group cursor-pointer ${
        isSelected
          ? "bg-primary/[0.04] border-primary/30 shadow-md shadow-primary/8 ring-2 ring-primary/8"
          : "bg-white border-border hover:border-primary/15 hover:shadow-sm hover:bg-surface-alt/50"
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
          isOnline
            ? isSelected ? "bg-primary text-white" : "bg-brand-100 text-primary"
            : "bg-slate-100 text-text-muted"
        }`}>
          {agent.name.charAt(0)}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
          isOnline ? "bg-success pulse-dot" : "bg-slate-300"
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary truncate">{agent.name}</p>
        <p className="text-[11px] text-text-muted truncate">
          {agent.lastSeen?.address || agent.email}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-[10px] font-bold ${isOnline ? "text-success" : "text-text-muted"}`}>
          {isOnline ? "● LIVE" : "○ AWAY"}
        </p>
        <p className="text-[10px] text-text-muted flex items-center gap-1 justify-end">
          <Clock className="w-2.5 h-2.5" />{lastSeenText}
        </p>
      </div>

      {/* View on map indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0"
        >
          <Eye className="w-3.5 h-3.5 text-primary" />
        </motion.div>
      )}
    </motion.div>
  );
}

function AlertBanner({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  const severityStyles = {
    critical: 'bg-red-50 border-red-200 text-red-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-600'
  };

  return (
    <div className="space-y-2">
      {alerts.slice(0, 3).map((alert, i) => (
        <motion.div
          key={alert._id}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 p-3 rounded-xl border ${severityStyles[alert.severity] || severityStyles.warning}`}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{alert.message}</p>
            <p className="text-[10px] opacity-60">{new Date(alert.createdAt).toLocaleTimeString()}</p>
          </div>
          <button
            onClick={() => onDismiss(alert._id)}
            className="p-1.5 rounded-lg bg-white/60 hover:bg-white transition-colors flex-shrink-0"
          >
            <Check className="w-3 h-3" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isPolling, setIsPolling] = useState(true);
  const [focusedAgentId, setFocusedAgentId] = useState(null);
  const [agentSearch, setAgentSearch] = useState("");
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const pollingRef = useRef(null);

  const fetchAgents = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get("/api/admin/live-agents", authConfig(user.token));
      setAgents(res.data);
      setLastRefresh(new Date());
    } catch (err) { console.error(err); }
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [leadsRes, summaryRes, alertsRes] = await Promise.all([
        api.get("/api/admin/leads", authConfig(user.token)),
        api.get("/api/admin/dashboard", authConfig(user.token)),
        api.get("/api/admin/alerts/unread", authConfig(user.token)).catch(() => ({ data: [] })),
      ]);
      setLeads(leadsRes.data);
      setSummary(summaryRes.data);
      setAlerts(alertsRes.data);
    } catch (err) { console.error(err); }
  }, [user]);

  useEffect(() => {
    if (user) { fetchAgents(); fetchAll(); }
  }, [user]);

  useEffect(() => {
    if (isPolling) {
      pollingRef.current = setInterval(fetchAgents, POLL_INTERVAL);
    } else {
      clearInterval(pollingRef.current);
    }
    return () => clearInterval(pollingRef.current);
  }, [isPolling, fetchAgents]);

  const dismissAlert = async (alertId) => {
    try {
      await api.patch(`/api/admin/alerts/${alertId}/read`, {}, authConfig(user.token));
      setAlerts(prev => prev.filter(a => a._id !== alertId));
    } catch (err) { console.error(err); }
  };

  if (!user) return null;

  const onlineCount = agents.filter(a => a.isOnline).length;
  const agentsWithLocation = agents.filter(a => a.lastSeen?.lat);

  // Filter agents by search
  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.email.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const stats = [
    { label: "Total Agents", value: agents.length, icon: Users, color: "text-primary", bg: "bg-brand-100", borderColor: "border-primary/10" },
    { label: "Live Now", value: onlineCount, icon: Radio, color: "text-success", bg: "bg-emerald-50", pulse: true, borderColor: "border-emerald-100" },
    { label: "Leads Today", value: summary.leadsTodayCount || 0, icon: Target, color: "text-violet-500", bg: "bg-violet-50", borderColor: "border-violet-100" },
    { label: "Total Leads", value: summary.totalLeads || 0, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50", borderColor: "border-amber-100" },
    { label: "Check-ins", value: summary.activeToday || 0, icon: Activity, color: "text-rose-500", bg: "bg-rose-50", borderColor: "border-rose-100" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-[260px] flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex justify-between items-center px-7 py-4 bg-white/70 backdrop-blur-xl border-b border-border sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight">Dashboard</h1>
            <p className="text-text-muted text-[11px] flex items-center gap-1.5 mt-0.5">
              <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`} style={isPolling ? { animationDuration: '3s' } : {}} />
              {isPolling ? 'Auto-refresh' : 'Paused'} · {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/clients"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-border text-text-secondary hover:text-primary hover:border-primary/20 hover:shadow-sm transition-all"
            >
              <Target className="w-3.5 h-3.5" /> Clients
            </Link>
            <Link
              href="/admin/routes"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-border text-text-secondary hover:text-primary hover:border-primary/20 hover:shadow-sm transition-all"
            >
              <Route className="w-3.5 h-3.5" /> Routes
            </Link>
            <Link
              href="/admin/analytics"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-border text-text-secondary hover:text-violet-500 hover:border-violet-200 hover:shadow-sm transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </Link>

            {/* Alert Bell */}
            <div className="relative">
              <button className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center text-text-muted hover:text-warning hover:border-warning/20 transition-colors">
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                    {alerts.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setIsPolling(p => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                isPolling
                  ? "bg-emerald-50 text-success border-emerald-200 hover:bg-emerald-100"
                  : "bg-red-50 text-error border-red-200 hover:bg-red-100"
              }`}
            >
              {isPolling ? <><Radio className="w-3 h-3 animate-pulse" /> Live</> : <><WifiOff className="w-3 h-3" /> Paused</>}
            </button>
            <button
              onClick={() => { fetchAgents(); fetchAll(); }}
              className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/20 hover:shadow-sm transition-colors"
              title="Refresh all data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden">
            {/* Alerts */}
            {alerts.length > 0 && <AlertBanner alerts={alerts} onDismiss={dismissAlert} />}

            {/* Stats Row */}
            <div className="grid grid-cols-5 gap-3">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`stat-card flex items-center gap-3 ${stat.borderColor}`}
                >
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`w-[18px] h-[18px] ${stat.color} ${stat.pulse ? "animate-pulse" : ""}`} />
                  </div>
                  <div>
                    <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-xl font-extrabold text-text-primary">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Live Map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className={`bg-white rounded-2xl border border-border overflow-hidden flex flex-col min-h-0 ${
                isMapExpanded ? "fixed inset-4 z-[100]" : "flex-1"
              }`}
            >
              <div className="flex justify-between items-center px-5 py-3 border-b border-border-light">
                <div className="flex items-center gap-2.5">
                  <MapPin className="text-primary w-4 h-4" />
                  <span className="font-semibold text-[13px] text-text-primary">Live Map</span>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    onlineCount > 0 ? "bg-emerald-50 text-success" : "bg-slate-100 text-text-muted"
                  }`}>
                    <Circle className={`w-2 h-2 fill-current ${onlineCount > 0 ? "animate-pulse" : ""}`} />
                    {onlineCount} online
                  </span>
                  {focusedAgentId && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setFocusedAgentId(null)}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
                    >
                      ✕ Reset view
                    </motion.button>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex gap-2 text-[10px]">
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg text-success font-medium">
                      <span className="w-2 h-2 rounded-full bg-success inline-block"></span>Live
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg text-text-muted font-medium">
                      <span className="w-2 h-2 rounded-full bg-slate-300 inline-block"></span>Away
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMapExpanded(prev => !prev)}
                    className="w-7 h-7 rounded-lg bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title={isMapExpanded ? "Exit fullscreen" : "Fullscreen map"}
                  >
                    {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <LiveMap agents={agentsWithLocation} focusedAgentId={focusedAgentId} />
              </div>
            </motion.div>

            {/* Fullscreen overlay backdrop */}
            <AnimatePresence>
              {isMapExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99]"
                  onClick={() => setIsMapExpanded(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar */}
          <div className="w-[300px] flex flex-col border-l border-border bg-white/60 backdrop-blur-sm">
            <div className="px-4 py-3.5 border-b border-border">
              <h2 className="font-semibold text-[13px] text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Field Agents
              </h2>
              <p className="text-[10px] text-text-muted mt-0.5">
                {onlineCount}/{agents.length} active · Click to locate on map
              </p>
            </div>

            {/* Agent Search */}
            <div className="px-3 pt-3 pb-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={agentSearch}
                  onChange={e => setAgentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/8 outline-none transition-all placeholder:text-text-muted"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredAgents.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-xs">
                  {agentSearch ? "No agents match your search" : "No agents registered"}
                </div>
              ) : (
                filteredAgents
                  .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                  .map((agent, i) => (
                    <AgentCard
                      key={agent._id}
                      agent={agent}
                      index={i}
                      isSelected={focusedAgentId === agent._id}
                      onClick={() => setFocusedAgentId(prev => prev === agent._id ? null : agent._id)}
                    />
                  ))
              )}
            </div>

            {/* Recent Leads */}
            <div className="border-t border-border">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  <span className="text-[13px] font-semibold text-text-primary">Recent Leads</span>
                </div>
                <span className="text-[10px] text-text-muted font-semibold bg-violet-50 px-2 py-0.5 rounded-full">{leads.length} total</span>
              </div>
              <div className="px-3 pb-3 space-y-2 max-h-60 overflow-y-auto">
                {leads.slice(0, 5).map((lead, i) => (
                  <motion.div
                    key={lead._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 bg-white rounded-xl border border-border hover:border-violet-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold text-text-primary">{lead.clientName}</p>
                      <ArrowUpRight className="w-3 h-3 text-violet-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">{lead.businessName || "Direct visit"} by {lead.userId?.name}</p>
                    {lead.address?.formatted && (
                      <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {lead.address.formatted}
                      </p>
                    )}
                    <p className="text-[10px] text-text-muted mt-0.5">GPS {lead.gps?.quality || "unknown"}</p>
                  </motion.div>
                ))}
                {leads.length === 0 && (
                  <p className="text-center py-4 text-text-muted text-xs">No leads yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
