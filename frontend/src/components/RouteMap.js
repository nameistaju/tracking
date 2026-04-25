"use client";
import React, { useEffect, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { fetchMapboxRoute } from "@/lib/mapboxRoute";

const injectStyles = () => {
  if (typeof document === 'undefined') return;
  const id = 'route-map-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.innerHTML = `
    .dwell-label {
      background: white;
      color: #6366f1;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
  `;
  document.head.appendChild(style);
};

const createEndpointIcon = (type) => {
  const isStart = type === 'start';
  const color = isStart ? '#2570eb' : '#ec4899';
  const label = isStart ? 'S' : 'E';
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:white;box-shadow:0 2px 8px ${color}44;border:3px solid white;">${label}</div>`,
    className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -18]
  });
};

const createDwellIcon = (duration, address) => {
  return L.divIcon({
    html: `<div class="dwell-label">⏱ ${duration}m${address ? ' · ' + address : ''}</div>`,
    className: '', iconSize: [120, 24], iconAnchor: [60, 12]
  });
};

function FitRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView(points[0], 15, { animate: true }); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16, animate: true });
  }, [points, map]);
  return null;
}

const createClientIcon = () => L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 2px 10px rgba(16,185,129,0.35);"></div>`,
  className: '', iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12]
});

const createBreakIcon = (type) => {
  const isStart = type === "break_start";
  const color = isStart ? "#f59e0b" : "#8b5cf6";
  const label = isStart ? "B" : "R";

  return L.divIcon({
    html: `<div style="width:24px;height:24px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 4px 12px ${color}55;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:800;">${label}</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16]
  });
};

const toLatLng = (log) => [log.location.lat, log.location.lng];

export default function RouteMap({ logs = [], visitedClients = [], breakEvents = [], dwellZones = [], showDwell = true }) {
  const [mounted, setMounted] = useState(false);
  const [routePositions, setRoutePositions] = useState([]);

  useEffect(() => { injectStyles(); setMounted(true); }, []);

  const positions = useMemo(() => logs.map(toLatLng), [logs]);

  useEffect(() => {
    let isCancelled = false;

    const loadRoute = async () => {
      if (positions.length < 2) {
        setRoutePositions(positions);
        return;
      }

      try {
        if (!isCancelled) {
          setRoutePositions(await fetchMapboxRoute(positions));
        }
      } catch (_error) {
        if (!isCancelled) {
          setRoutePositions(positions);
        }
      }
    };

    loadRoute();

    return () => {
      isCancelled = true;
    };
  }, [positions]);

  if (!mounted) {
    return (
      <div className="h-full w-full bg-surface-alt flex items-center justify-center rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-text-muted text-xs font-medium">Loading Route...</p>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="h-full w-full bg-surface-alt flex items-center justify-center rounded-2xl">
        <div className="text-center">
          <p className="text-text-secondary text-sm font-semibold">No route data</p>
          <p className="text-text-muted text-xs mt-1">Select a user and date</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <MapContainer center={positions[0]} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OSM &copy; CARTO' />
        <FitRoute points={positions} />
        <Polyline positions={routePositions.length > 1 ? routePositions : positions} pathOptions={{ color: '#2570eb', weight: 4, opacity: 0.82, lineCap: 'round', lineJoin: 'round' }} />
        <Marker position={positions[0]} icon={createEndpointIcon('start')}>
          <Popup><div style={{padding:"4px",minWidth:"140px",fontFamily:"'Inter',sans-serif"}}><div style={{fontSize:"10px",color:"#2570eb",fontWeight:"800",textTransform:"uppercase",letterSpacing:"1px"}}>Start</div><div style={{fontSize:"12px",color:"#475569",marginTop:"4px"}}>{logs[0]?.address?.formatted||`${logs[0]?.location.lat.toFixed(4)}, ${logs[0]?.location.lng.toFixed(4)}`}</div><div style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>{new Date(logs[0]?.timestamp).toLocaleTimeString()}</div></div></Popup>
        </Marker>
        {positions.length > 1 && (
          <Marker position={positions[positions.length-1]} icon={createEndpointIcon('end')}>
            <Popup><div style={{padding:"4px",minWidth:"140px",fontFamily:"'Inter',sans-serif"}}><div style={{fontSize:"10px",color:"#ec4899",fontWeight:"800",textTransform:"uppercase",letterSpacing:"1px"}}>End</div><div style={{fontSize:"12px",color:"#475569",marginTop:"4px"}}>{logs[logs.length-1]?.address?.formatted||`${logs[logs.length-1]?.location.lat.toFixed(4)}, ${logs[logs.length-1]?.location.lng.toFixed(4)}`}</div><div style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>{new Date(logs[logs.length-1]?.timestamp).toLocaleTimeString()}</div></div></Popup>
          </Marker>
        )}
        {positions.slice(1, -1).map((pos, i) => (
          <CircleMarker key={i} center={pos} radius={2.5} pathOptions={{ color: '#2570eb', fillColor: '#2570eb', fillOpacity: 0.5, weight: 0 }} />
        ))}
        {visitedClients.map((client) => (
          <Marker key={client._id} position={[client.location.lat, client.location.lng]} icon={createClientIcon()}>
            <Popup>
              <div style={{ padding: "4px", minWidth: "160px", fontFamily: "'Inter',sans-serif" }}>
                <div style={{ fontSize: "10px", color: "#10b981", fontWeight: "800", textTransform: "uppercase" }}>Client Visit</div>
                <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: "700", marginTop: "4px" }}>{client.clientName}</div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{client.businessName || client.clientPhone}</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{client.addressText || client.address?.formatted || "Unknown address"}</div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}><strong>Outcome:</strong> {client.visitOutcome || "visited"}</div>
                {client.notes && <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}><strong>Notes:</strong> {client.notes}</div>}
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "6px" }}>{new Date(client.createdAt || client.timestamp).toLocaleString()}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        {breakEvents.map((event) => (
          <Marker
            key={event._id}
            position={[event.lat, event.lng]}
            icon={createBreakIcon(event.type)}
          >
            <Popup>
              <div style={{ padding: "4px", minWidth: "170px", fontFamily: "'Inter',sans-serif" }}>
                <div style={{ fontSize: "10px", color: event.type === "break_start" ? "#f59e0b" : "#8b5cf6", fontWeight: "800", textTransform: "uppercase" }}>
                  {event.type === "break_start" ? "Break Started" : "Break Ended"}
                </div>
                <div style={{ fontSize: "12px", color: "#475569", marginTop: "6px" }}>
                  {event.address?.formatted || `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "6px" }}>
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        {showDwell && dwellZones.map((zone, i) => (
          <React.Fragment key={`dwell-${i}`}>
            <CircleMarker center={[zone.location.lat, zone.location.lng]} radius={14} pathOptions={{ color: '#6366F1', fillColor: '#6366F1', fillOpacity: 0.1, weight: 2, dashArray: '4 4' }}>
              <Popup><div style={{padding:"4px",minWidth:"160px",fontFamily:"'Inter',sans-serif"}}><div style={{fontSize:"10px",color:"#6366f1",fontWeight:"800",textTransform:"uppercase"}}>Dwell Zone</div><div style={{fontSize:"14px",fontWeight:"800",color:"#0f172a",marginTop:"4px"}}>{zone.durationMinutes} min</div><div style={{fontSize:"12px",color:"#475569",marginTop:"2px"}}>{zone.address?.formatted||'Unknown'}</div></div></Popup>
            </CircleMarker>
            <Marker position={[zone.location.lat, zone.location.lng]} icon={createDwellIcon(zone.durationMinutes, zone.address?.area||zone.address?.city)} />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
