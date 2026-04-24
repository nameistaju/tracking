"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Play, Pause, SkipBack, SkipForward, Gauge } from "lucide-react";
import { fetchMapboxRoute } from "@/lib/mapboxRoute";

const SPEED_OPTIONS = [
  { label: "1x", value: 1000 },
  { label: "2x", value: 500 },
  { label: "5x", value: 200 },
  { label: "10x", value: 100 },
  { label: "25x", value: 40 },
];

const injectStyles = () => {
  if (typeof document === "undefined") return;
  const id = "playback-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.innerHTML = `
    .moving-marker {
      animation: marker-pulse 1.5s ease-in-out infinite;
    }
    @keyframes marker-pulse {
      0%, 100% { box-shadow: 0 0 8px #2570eb, 0 0 16px rgba(37, 112, 235, 0.3); }
      50% { box-shadow: 0 0 16px #2570eb, 0 0 32px rgba(37, 112, 235, 0.5); }
    }
  `;
  document.head.appendChild(style);
};

const createCurrentIcon = () =>
  L.divIcon({
    html: `<div class="moving-marker" style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#2570eb,#3b8ff6);border:3px solid white;box-shadow:0 2px 8px rgba(37,112,235,0.4);"></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

function FollowMarker({ position, shouldFollow }) {
  const map = useMap();

  useEffect(() => {
    if (shouldFollow && position) {
      map.panTo(position, { animate: true, duration: 0.3 });
    }
  }, [position, shouldFollow, map]);

  return null;
}

export default function RoutePlayback({ logs = [], userName = "" }) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [followMarker, setFollowMarker] = useState(true);
  const [routePositions, setRoutePositions] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    injectStyles();
    setMounted(true);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isPlaying && currentIndex < logs.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= logs.length - 1) {
            setIsPlaying(false);
            return prev;
          }

          return prev + 1;
        });
      }, SPEED_OPTIONS[speedIndex].value);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speedIndex, logs.length, currentIndex]);

  useEffect(() => {
    if (currentIndex >= logs.length - 1) {
      setIsPlaying(false);
    }
  }, [currentIndex, logs.length]);

  const positions = useMemo(() => logs.map((log) => [log.location.lat, log.location.lng]), [logs]);

  useEffect(() => {
    let cancelled = false;

    const loadRoute = async () => {
      if (positions.length < 2) {
        setRoutePositions(positions);
        return;
      }

      try {
        const nextRoute = await fetchMapboxRoute(positions);
        if (!cancelled) {
          setRoutePositions(nextRoute);
        }
      } catch (_error) {
        if (!cancelled) {
          setRoutePositions(positions);
        }
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [positions]);

  const currentLog = logs[currentIndex];
  const currentPosition = currentLog ? [currentLog.location.lat, currentLog.location.lng] : null;
  const progress = logs.length > 1 ? (currentIndex / (logs.length - 1)) * 100 : 0;
  const trailProgress = Math.max(progress, 0) / 100;
  const animatedTrailPositions = useMemo(() => {
    const baseRoute = routePositions.length > 1 ? routePositions : positions;

    if (baseRoute.length < 2) {
      return currentPosition ? [currentPosition] : [];
    }

    const steps = Math.max(Math.round((baseRoute.length - 1) * trailProgress), 1);
    return baseRoute.slice(0, steps + 1);
  }, [routePositions, positions, trailProgress, currentPosition]);

  const handlePlay = () => {
    if (currentIndex >= logs.length - 1) {
      setCurrentIndex(0);
    }

    setIsPlaying(true);
  };

  if (!mounted || logs.length === 0) {
    return (
      <div className="h-full w-full bg-surface-alt flex items-center justify-center rounded-2xl">
        <p className="text-text-muted text-sm font-medium">{!mounted ? "Loading..." : "No data for playback"}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 relative">
        <MapContainer center={positions[0]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OSM &copy; CARTO" />
          <FollowMarker position={currentPosition} shouldFollow={followMarker} />
          <Polyline positions={routePositions.length > 1 ? routePositions : positions} pathOptions={{ color: "#cbd5e1", weight: 2, opacity: 0.6, dashArray: "6 4" }} />
          {animatedTrailPositions.length > 1 && <Polyline positions={animatedTrailPositions} pathOptions={{ color: "#2570eb", weight: 3.5, opacity: 0.9 }} />}
          {currentPosition && <Marker position={currentPosition} icon={createCurrentIcon()} />}
          <CircleMarker center={positions[0]} radius={6} pathOptions={{ color: "#2570eb", fillColor: "#2570eb", fillOpacity: 1, weight: 2 }} />
          {positions.length > 1 && <CircleMarker center={positions[positions.length - 1]} radius={6} pathOptions={{ color: "#ec4899", fillColor: "#ec4899", fillOpacity: 1, weight: 2 }} />}
        </MapContainer>

        <div className="absolute left-3 right-3 top-3 z-[1000] sm:left-4 sm:right-auto sm:top-4">
          <div className="bg-white/90 backdrop-blur-md border border-border rounded-2xl p-3 sm:p-4 min-w-0 sm:min-w-[200px] shadow-lg">
            {userName && <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5">{userName}</p>}
            <p className="text-[13px] font-semibold text-text-primary">{currentLog?.address?.formatted || `${currentLog?.location.lat.toFixed(4)}, ${currentLog?.location.lng.toFixed(4)}`}</p>
            <p className="text-[11px] text-text-muted mt-1">{new Date(currentLog?.timestamp).toLocaleString()}</p>
            <div className="flex gap-3 mt-1.5 text-[11px] text-text-muted">
              <span>Point {currentIndex + 1}/{logs.length}</span>
              {currentLog?.speed && <span>{(currentLog.speed * 3.6).toFixed(1)} km/h</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-border px-3 py-3 sm:px-6 sm:py-4">
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={logs.length - 1}
            value={currentIndex}
            onChange={(event) => {
              setCurrentIndex(parseInt(event.target.value, 10));
              setIsPlaying(false);
            }}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(37,112,235,0.4)]
              [&::-webkit-slider-thumb]:cursor-pointer"
            style={{ background: `linear-gradient(to right, #2570eb 0%, #2570eb ${progress}%, #e2e8f0 ${progress}%, #e2e8f0 100%)` }}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { setCurrentIndex(0); setIsPlaying(false); }} className="w-9 h-9 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-all"><SkipBack className="w-4 h-4" /></button>
            <button onClick={isPlaying ? () => setIsPlaying(false) : handlePlay} className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/15 transition-all">{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}</button>
            <button onClick={() => { setCurrentIndex(logs.length - 1); setIsPlaying(false); }} className="w-9 h-9 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-all"><SkipForward className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button onClick={() => setSpeedIndex((prev) => (prev + 1) % SPEED_OPTIONS.length)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-alt border border-border text-xs font-semibold text-text-secondary hover:bg-surface-hover transition-all"><Gauge className="w-3.5 h-3.5 text-primary" />{SPEED_OPTIONS[speedIndex].label}</button>
            <button onClick={() => setFollowMarker((value) => !value)} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${followMarker ? "bg-primary/8 border-primary/15 text-primary" : "bg-surface-alt border-border text-text-muted"}`}>{followMarker ? "Following" : "Free pan"}</button>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-text-secondary">{currentLog ? new Date(currentLog.timestamp).toLocaleTimeString() : "--:--:--"}</p>
            <p className="text-[10px] text-text-muted">{Math.round(progress)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
