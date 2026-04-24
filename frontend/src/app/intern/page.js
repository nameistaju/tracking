"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import {
  MapPin,
  PlusCircle,
  LogOut,
  User as UserIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  Battery,
  Wifi,
  WifiOff,
  Smartphone,
  Download,
  Signal,
  X,
  Phone,
  FileText,
  UserPlus,
  Play,
  Square,
  Building2,
  Mail,
  Crosshair,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api, { authConfig, buildApiUrl } from "@/lib/api";

const LOCATION_PUSH_INTERVAL = 7000;
const LOCATION_MIN_DISTANCE_METERS = 15;

const getGpsQuality = (accuracy) => {
  if (typeof accuracy !== "number") return "unknown";
  if (accuracy <= 20) return "high";
  if (accuracy <= 60) return "medium";
  return "low";
};

export default function InternPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ leadsCount: 0, recentAttendance: [], todayPings: 0 });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [isTracking, setIsTracking] = useState(false);
  const [lastPing, setLastPing] = useState(null);
  const [lastAddress, setLastAddress] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsQuality, setGpsQualityState] = useState("unknown");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const watchIdRef = useRef(null);
  const lastSentAtRef = useRef(0);
  const lastSentLocationRef = useRef(null);

  const [leadForm, setLeadForm] = useState({
    businessName: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    addressText: "",
    status: "new",
    visitOutcome: "visited",
    notes: ""
  });

  useEffect(() => {
    if (user) {
      fetchStats();
      startBackgroundTracking();
      monitorBattery();
    }
    return () => stopBackgroundTracking();
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") showStatus("success", "App installed!");
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const monitorBattery = async () => {
    try {
      if ("getBattery" in navigator) {
        const battery = await navigator.getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener("levelchange", () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }
    } catch (_error) {}
  };

  const openDB = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open("fieldtrack-offline", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("pending-locations", { keyPath: "id", autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const getDistanceInMeters = (start, end) => {
    if (!start || !end) return Number.POSITIVE_INFINITY;

    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const deltaLat = toRadians(end.lat - start.lat);
    const deltaLng = toRadians(end.lng - start.lng);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(start.lat)) * Math.cos(toRadians(end.lat)) * Math.sin(deltaLng / 2) ** 2;

    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const shouldSendLocation = (nextLocation) => {
    const now = Date.now();

    if (!lastSentLocationRef.current) {
      return true;
    }

    if (now - lastSentAtRef.current >= LOCATION_PUSH_INTERVAL) {
      return true;
    }

    return getDistanceInMeters(lastSentLocationRef.current, nextLocation) >= LOCATION_MIN_DISTANCE_METERS;
  };

  const sendLocation = async (coords) => {
    if (!user) return;

    const nextAccuracy = coords.accuracy ?? null;

    try {
      const payload = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: nextAccuracy,
        speed: coords.speed,
        heading: coords.heading,
        altitude: coords.altitude,
        altitudeAccuracy: coords.altitudeAccuracy,
        battery: batteryLevel
      };
      const { data } = await api.post("/api/intern/location", payload, authConfig(user.token));
      setLastPing(new Date());
      setLastAddress(data.address || null);
      setGpsAccuracy(nextAccuracy);
      setGpsQualityState(data.gpsQuality || getGpsQuality(nextAccuracy));
      lastSentAtRef.current = Date.now();
      lastSentLocationRef.current = { lat: coords.latitude, lng: coords.longitude };
    } catch (_err) {
      if (!navigator.onLine && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const db = await openDB();
          const tx = db.transaction("pending-locations", "readwrite");
          tx.objectStore("pending-locations").add({
            url: buildApiUrl("/api/intern/location"),
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
            body: { lat: coords.latitude, lng: coords.longitude, accuracy: nextAccuracy },
          });
          await reg.sync.register("sync-location");
        } catch (_e) {}
      }
    }
  };

  const startBackgroundTracking = () => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nextLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setGpsAccuracy(pos.coords.accuracy ?? null);
        setGpsQualityState(getGpsQuality(pos.coords.accuracy ?? null));

        if (shouldSendLocation(nextLocation)) {
          sendLocation(pos.coords);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    if (user) {
      api.post("/api/intern/tracking-status", { status: "active" }, authConfig(user.token)).catch(() => {});
    }
  };

  const stopBackgroundTracking = () => {
    setIsTracking(false);
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastSentAtRef.current = 0;
    lastSentLocationRef.current = null;
    if (user) {
      api.post("/api/intern/tracking-status", { status: "stopped" }, authConfig(user.token)).catch(() => {});
    }
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopBackgroundTracking();
      showStatus("info", "Tracking paused");
    } else {
      startBackgroundTracking();
      showStatus("success", "Tracking resumed");
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/api/intern/stats", authConfig(user.token));
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
  };

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy
        }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const loc = await getLocation();
      await api.post("/api/intern/checkin", loc, authConfig(user.token));
      showStatus("success", "Check-in successful!");
      fetchStats();
    } catch (err) {
      showStatus("error", err.message === "User denied Geolocation" ? "Enable GPS access" : err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loc = await getLocation();
      await api.post("/api/intern/lead", { ...leadForm, ...loc }, authConfig(user.token));
      showStatus("success", "Client details saved successfully!");
      setLeadForm({
        businessName: "",
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        addressText: "",
        status: "new",
        visitOutcome: "visited",
        notes: ""
      });
      setShowLeadForm(false);
      fetchStats();
    } catch (_err) {
      showStatus("error", "Failed to save client details.");
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-28 relative">
      <div className="blob blob-1 fixed" />
      <div className="blob blob-2 fixed" />

      <div className="max-w-lg mx-auto px-4 pt-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden">
              <Image src="/sharpkode.png" alt="SHARPKODE" width={44} height={44} className="object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-text-primary">Hi, {user.name.split(" ")[0]}</h1>
              <p className="text-[11px] text-primary font-semibold">SHARPKODE · Field Ops</p>
            </div>
          </div>
          <button onClick={logout} className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center text-text-muted hover:text-error hover:border-red-200 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </motion.div>

        <AnimatePresence>
          {showInstallPrompt && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-brand-50 border border-brand-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-brand-100"><Download className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">Install App</p>
                    <p className="text-[11px] text-text-muted">Better tracking experience</p>
                  </div>
                </div>
                <button onClick={handleInstall} className="btn-primary px-4 py-2 text-xs">Install</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`p-4 rounded-2xl mb-5 border-2 ${isTracking ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTracking ? "bg-emerald-100" : "bg-red-100"}`}>
                <Radio className={`w-5 h-5 ${isTracking ? "text-success animate-pulse" : "text-error"}`} />
              </div>
              <div>
                <p className={`text-[14px] font-bold ${isTracking ? "text-emerald-800" : "text-red-700"}`}>{isTracking ? "Tracking Active" : "Tracking Paused"}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {lastPing && <p className="text-[11px] text-text-muted flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {lastPing.toLocaleTimeString()}</p>}
                  {lastAddress && <p className="text-[11px] text-text-muted flex items-center gap-1 truncate max-w-[180px]"><MapPin className="w-2.5 h-2.5 flex-shrink-0" /> {lastAddress}</p>}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3 mb-6">
          <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} onClick={toggleTracking} className={`col-span-2 flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-base transition-all shadow-lg ${isTracking ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-200" : "bg-gradient-to-r from-primary to-primary-light text-white shadow-primary/25"}`}>
            {isTracking ? <><Square className="w-5 h-5" /> End Work</> : <><Play className="w-5 h-5" /> Start Work</>}
          </motion.button>

          <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} onClick={handleCheckIn} disabled={loading} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-border font-semibold text-sm text-text-primary hover:border-primary/20 hover:shadow-md transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <MapPin className="w-4 h-4 text-primary" />}
            Check In
          </motion.button>

          <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setShowLeadForm(true)} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-border font-semibold text-sm text-text-primary hover:border-violet-200 hover:shadow-md transition-all">
            <UserPlus className="w-4 h-4 text-violet-500" />
            Add Client
          </motion.button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-3 gap-3 mb-6">
          <div className="stat-card text-center p-4">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1.5" />
            <p className="text-xl font-extrabold text-text-primary">{stats.leadsCount}</p>
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Clients</p>
          </div>
          <div className="stat-card text-center p-4">
            <Signal className="w-5 h-5 text-success mx-auto mb-1.5" />
            <p className="text-xl font-extrabold text-text-primary">{stats.todayPings || 0}</p>
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Pings</p>
          </div>
          <div className="stat-card text-center p-4">
            <CheckCircle2 className="w-5 h-5 text-violet-500 mx-auto mb-1.5" />
            <p className="text-xl font-extrabold text-text-primary">{stats.recentAttendance.length}</p>
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Days</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex items-center justify-center gap-5 mb-6 text-[11px] text-text-muted flex-wrap">
          {batteryLevel !== null && <span className={`flex items-center gap-1 ${batteryLevel < 20 ? "text-error" : ""}`}><Battery className="w-3.5 h-3.5" /> {batteryLevel}%</span>}
          <span className={`flex items-center gap-1 ${gpsQuality === "low" ? "text-error" : gpsQuality === "medium" ? "text-amber-600" : "text-success"}`}>
            <Crosshair className="w-3.5 h-3.5" /> {gpsAccuracy ? `${Math.round(gpsAccuracy)}m` : "GPS waiting"}
          </span>
          <span className="flex items-center gap-1">
            {typeof navigator !== "undefined" && navigator.onLine ? <Wifi className="w-3.5 h-3.5 text-success" /> : <WifiOff className="w-3.5 h-3.5 text-error" />}
            {typeof navigator !== "undefined" && navigator.onLine ? "Online" : "Offline"}
          </span>
          <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> {gpsQuality} GPS</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-text-muted" />
            <h3 className="text-[13px] font-semibold text-text-primary">Attendance Log</h3>
          </div>
          <div className="space-y-2">
            {stats.recentAttendance.length === 0 ? (
              <p className="text-center py-4 text-text-muted text-xs">No attendance this week</p>
            ) : (
              stats.recentAttendance.map((a, i) => (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06 }} key={a._id} className="flex justify-between items-center p-3 bg-surface-alt rounded-xl border border-border-light">
                  <span className="text-xs font-medium text-text-secondary">{a.date}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-success text-[10px] font-semibold border border-emerald-100">Verified</span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowLeadForm(true)} className="fixed bottom-8 right-6 w-14 h-14 bg-gradient-to-br from-primary to-primary-light text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center z-50">
        <PlusCircle className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {showLeadForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4" onClick={() => setShowLeadForm(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl border border-border max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-text-primary">Client Details</h2>
                    <p className="text-[11px] text-text-muted">GPS location and accuracy auto-attached</p>
                  </div>
                </div>
                <button onClick={() => setShowLeadForm(false)} className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-3">
                <div>
                  <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" placeholder="Business / shop name" className="input-sharpkode" style={{ paddingLeft: "40px" }} value={leadForm.businessName} onChange={e => setLeadForm({ ...leadForm, businessName: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Client Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" placeholder="Full name" className="input-sharpkode" style={{ paddingLeft: "40px" }} value={leadForm.clientName} onChange={e => setLeadForm({ ...leadForm, clientName: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="tel" placeholder="Phone number" className="input-sharpkode" style={{ paddingLeft: "40px" }} value={leadForm.clientPhone} onChange={e => setLeadForm({ ...leadForm, clientPhone: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="email" placeholder="Email address" className="input-sharpkode" style={{ paddingLeft: "40px" }} value={leadForm.clientEmail} onChange={e => setLeadForm({ ...leadForm, clientEmail: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
                    <textarea placeholder="Street / locality details" className="input-sharpkode min-h-[72px] resize-none" style={{ paddingLeft: "40px" }} value={leadForm.addressText} onChange={e => setLeadForm({ ...leadForm, addressText: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Status</label>
                    <select className="input-sharpkode" value={leadForm.status} onChange={e => setLeadForm({ ...leadForm, status: e.target.value })}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="not-interested">Not Interested</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Visit Outcome</label>
                    <select className="input-sharpkode" value={leadForm.visitOutcome} onChange={e => setLeadForm({ ...leadForm, visitOutcome: e.target.value })}>
                      <option value="visited">Visited</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="revisit-needed">Revisit Needed</option>
                      <option value="not-available">Not Available</option>
                      <option value="converted">Converted</option>
                      <option value="not-interested">Not Interested</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Notes</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
                    <textarea placeholder="Any observations..." className="input-sharpkode min-h-[80px] resize-none" style={{ paddingLeft: "40px" }} value={leadForm.notes} onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })} />
                  </div>
                </div>

                <div className="rounded-2xl bg-surface-alt border border-border px-4 py-3">
                  <p className="text-[11px] font-semibold text-text-primary">GPS capture quality</p>
                  <p className="text-[11px] text-text-muted mt-1">Current accuracy: {gpsAccuracy ? `${Math.round(gpsAccuracy)} meters` : "Waiting for GPS"} | Quality: {gpsQuality}</p>
                </div>

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="btn-primary w-full text-[14px] mt-1" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Save Client Details</>}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {statusMsg.text && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className={`fixed bottom-20 left-4 right-4 p-4 rounded-2xl flex items-center gap-3 z-[110] max-w-lg mx-auto shadow-xl border ${statusMsg.type === "success" ? "bg-white border-emerald-200 text-success" : statusMsg.type === "info" ? "bg-white border-blue-200 text-primary" : "bg-white border-red-200 text-error"}`}>
            {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-semibold">{statusMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
