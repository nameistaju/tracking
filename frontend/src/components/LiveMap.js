"use client";
import React, { useEffect, useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

const ANIMATION_DURATION = 1200;

// Inject light-theme map styles
const injectStyles = () => {
  if (typeof document === 'undefined') return;
  const id = 'live-map-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.innerHTML = `
    .agent-marker { cursor: pointer; }
    .agent-pulse-ring {
      width: 20px; height: 20px;
      border-radius: 50%;
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    @keyframes pulse-ring {
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
    }
    /* Cluster icon styling */
    .custom-cluster-icon {
      background: linear-gradient(135deg, #2570eb 0%, #3b8ff6 100%);
      border: 3px solid white;
      border-radius: 50%;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      font-family: 'Inter', system-ui, sans-serif;
      box-shadow: 0 3px 12px rgba(37, 112, 235, 0.35), 0 0 0 4px rgba(37, 112, 235, 0.12);
      transition: all 0.2s ease;
    }
    .custom-cluster-icon:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 16px rgba(37, 112, 235, 0.5), 0 0 0 6px rgba(37, 112, 235, 0.15);
    }
    .custom-cluster-icon .cluster-ring {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px solid rgba(37, 112, 235, 0.2);
      animation: cluster-breathe 3s ease-in-out infinite;
    }
    @keyframes cluster-breathe {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.15); opacity: 0; }
    }
    /* Override leaflet cluster defaults */
    .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
      background: transparent !important;
    }
    .marker-cluster div {
      background: transparent !important;
    }
    /* Spider leg styling */
    .leaflet-cluster-spider-leg {
      stroke: #2570eb;
      stroke-opacity: 0.4;
      stroke-width: 2;
    }
  `;
  document.head.appendChild(style);
};

const createAgentIcon = (name, isOnline) => {
  const accentColor = isOnline ? "#2570eb" : "#94a3b8";
  const glowColor = isOnline ? "rgba(37, 112, 235, 0.4)" : "transparent";
  const initial = name.charAt(0).toUpperCase();

  return L.divIcon({
    html: `
      <div class="agent-marker" style="position: relative; width: 58px; height: 58px;">
        ${isOnline ? `<div class="agent-pulse-ring" style="background: ${glowColor}; width: 30px; height: 30px;"></div>` : ""}
        <div style="
          position: relative;
          width: 58px; height: 58px;
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 2;
        ">
          <img
            src="/bike.png"
            alt="${initial}"
            style="
              width: 58px;
              height: 58px;
              object-fit: contain;
              filter: drop-shadow(0 6px 10px rgba(0,0,0,0.18));
            "
          />
          <div style="
            position: absolute;
            top: 5px;
            right: 4px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${accentColor};
            color: white;
            border: 2px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 12px;
            font-family: 'Inter', system-ui, sans-serif;
          ">${initial}</div>
        </div>
        <div style="
          position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
          font-size: 9px; font-weight: 700; white-space: nowrap;
          background: ${isOnline ? '#10b981' : '#94a3b8'}; color: white;
          padding: 1px 6px; border-radius: 6px;
          font-family: 'Inter', system-ui, sans-serif;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          z-index: 3;
        ">${isOnline ? 'LIVE' : 'AWAY'}</div>
      </div>
    `,
    className: "",
    iconSize: [58, 64],
    iconAnchor: [29, 30],
    popupAnchor: [0, -30],
  });
};

// Custom cluster icon creator
const createClusterCustomIcon = (cluster) => {
  const count = cluster.getChildCount();
  let size = 44;
  if (count > 5) size = 52;
  if (count > 10) size = 60;

  return L.divIcon({
    html: `
      <div class="custom-cluster-icon" style="width: ${size}px; height: ${size}px; font-size: ${count > 9 ? 12 : 14}px;">
        <div class="cluster-ring"></div>
        ${count}
      </div>
    `,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function FitBounds({ agents, focusedAgentId }) {
  const map = useMap();
  useEffect(() => {
    // Don't auto-fit if an agent is focused
    if (focusedAgentId) return;
    if (agents.length === 0) return;
    const validAgents = agents.filter(a => a.lastSeen?.lat);
    if (validAgents.length === 0) return;
    if (validAgents.length === 1) {
      map.setView([validAgents[0].lastSeen.lat, validAgents[0].lastSeen.lng], 10, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(validAgents.map(a => [a.lastSeen.lat, a.lastSeen.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10, animate: true });
  }, [agents.length, focusedAgentId]);
  return null;
}

function FocusAgent({ agents, focusedAgentId, markerRefs }) {
  const map = useMap();
  useEffect(() => {
    if (!focusedAgentId) return;
    const agent = agents.find(a => a._id === focusedAgentId);
    if (!agent || !agent.lastSeen?.lat) return;
    map.flyTo([agent.lastSeen.lat, agent.lastSeen.lng], 15, { duration: 1.2 });
    // Open the popup after fly animation
    setTimeout(() => {
      const marker = markerRefs.current?.[focusedAgentId];
      if (marker) marker.openPopup();
    }, 1300);
  }, [focusedAgentId, agents, map, markerRefs]);
  return null;
}

// Cache for reverse geocoded location names
const locationCache = {};

function useReverseGeocode(lat, lng) {
  const [locationName, setLocationName] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lat || !lng) return;

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    // Return cached result
    if (locationCache[key]) {
      setLocationName(locationCache[key]);
      return;
    }

    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
      .then(res => res.json())
      .then(data => {
        const addr = data.address || {};
        // Build a meaningful area name from the response
        const area = addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.hamlet || addr.county || '';
        const city = addr.city || addr.state_district || addr.state || '';
        let label = '';
        if (area && city && area !== city) {
          label = `${area}, ${city}`;
        } else if (area) {
          label = area;
        } else if (city) {
          label = city;
        } else if (data.display_name) {
          // Fallback: take first 2 parts of display_name
          const parts = data.display_name.split(',').map(s => s.trim());
          label = parts.slice(0, 2).join(', ');
        }
        locationCache[key] = label || null;
        setLocationName(label || null);
      })
      .catch(() => {
        setLocationName(null);
      })
      .finally(() => setLoading(false));
  }, [lat, lng]);

  return { locationName, loading };
}

// Individual agent popup component that uses reverse geocoding
function AgentPopupContent({ agent }) {
  const { locationName, loading } = useReverseGeocode(
    agent.lastSeen?.lat,
    agent.lastSeen?.lng
  );

  const statusColor = agent.isOnline ? "#10b981" : "#94a3b8";
  const statusBg = agent.isOnline ? "#ecfdf5" : "#f8fafc";

  return (
    <div style={{ minWidth: "240px", padding: "6px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "14px",
          background: agent.isOnline ? "linear-gradient(135deg, #2570eb, #3b8ff6)" : "#e2e8f0",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: "800", fontSize: "18px", color: "white",
          boxShadow: agent.isOnline ? "0 4px 12px rgba(37, 112, 235, 0.3)" : "none"
        }}>
          {agent.name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a", marginBottom: "2px" }}>{agent.name}</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            fontSize: "10px", fontWeight: "700",
            padding: "2px 8px", borderRadius: "8px",
            background: statusBg, color: statusColor,
            border: `1px solid ${agent.isOnline ? '#d1fae5' : '#e2e8f0'}`
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor, display: "inline-block" }} />
            {agent.isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Area Name */}
      <div style={{
        background: "#f0f7ff", borderRadius: "12px", padding: "10px 12px",
        border: "1px solid #dbeefe", marginBottom: "8px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2570eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontSize: "10px", color: "#2570eb", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Location</span>
        </div>
        <div style={{ fontSize: "12px", color: "#1e4baf", fontWeight: "600" }}>
          {loading ? "Locating..." : locationName || "Unknown area"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "8px 10px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginBottom: "2px" }}>Coordinates</div>
          <div style={{ fontSize: "11px", color: "#475569", fontWeight: "600", fontFamily: "monospace" }}>
            {agent.lastSeen.lat.toFixed(4)}, {agent.lastSeen.lng.toFixed(4)}
          </div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "8px 10px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginBottom: "2px" }}>Last Ping</div>
          <div style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>
            {agent.minutesAgo === null ? "Never" : agent.minutesAgo === 0 ? "Just now" : `${agent.minutesAgo}m ago`}
          </div>
        </div>
      </div>

      {/* Battery & tracking status */}
      {(agent.lastBattery || agent.trackingStatus) && (
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "center" }}>
          {agent.lastBattery && (
            <span style={{
              fontSize: "10px", fontWeight: "600", color: agent.lastBattery < 20 ? "#ef4444" : "#64748b",
              background: agent.lastBattery < 20 ? "#fef2f2" : "#f8fafc",
              padding: "3px 8px", borderRadius: "6px", border: "1px solid #e2e8f0"
            }}>
              🔋 {agent.lastBattery}%
            </span>
          )}
          {agent.trackingStatus && (
            <span style={{
              fontSize: "10px", fontWeight: "600",
              color: agent.trackingStatus === 'active' ? '#10b981' : '#94a3b8',
              background: agent.trackingStatus === 'active' ? '#ecfdf5' : '#f8fafc',
              padding: "3px 8px", borderRadius: "6px", border: "1px solid #e2e8f0"
            }}>
              📡 {agent.trackingStatus === 'active' ? 'Tracking' : 'Idle'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function LiveMap({ agents = [], focusedAgentId = null }) {
  const [mounted, setMounted] = useState(false);
  const [animatedAgents, setAnimatedAgents] = useState([]);
  const markerRefs = useRef({});
  const animationFrameRef = useRef(null);
  const previousPositionsRef = useRef({});

  useEffect(() => {
    injectStyles();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!agents.length) {
      setAnimatedAgents([]);
      previousPositionsRef.current = {};
      return undefined;
    }

    const nextPositions = {};
    const animationTargets = agents.map((agent) => {
      const latest = agent.lastSeen?.lat ? {
        lat: agent.lastSeen.lat,
        lng: agent.lastSeen.lng,
      } : null;

      if (latest) {
        nextPositions[agent._id] = latest;
      }

      return {
        ...agent,
        startPosition: previousPositionsRef.current[agent._id] || latest,
        endPosition: latest,
      };
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / ANIMATION_DURATION, 1);

      setAnimatedAgents(
        animationTargets.map((agent) => {
          if (!agent.startPosition || !agent.endPosition) {
            return agent;
          }

          const lat = agent.startPosition.lat + (agent.endPosition.lat - agent.startPosition.lat) * progress;
          const lng = agent.startPosition.lng + (agent.endPosition.lng - agent.startPosition.lng) * progress;

          return {
            ...agent,
            lastSeen: {
              ...agent.lastSeen,
              lat,
              lng,
            },
          };
        })
      );

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        previousPositionsRef.current = nextPositions;
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [agents]);

  if (!mounted) {
    return (
      <div className="h-full w-full bg-surface-alt flex items-center justify-center rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-text-muted text-xs font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  const agentsWithLocation = animatedAgents.filter(a => a.lastSeen?.lat);
  const center = agentsWithLocation.length > 0
    ? [agentsWithLocation[0].lastSeen.lat, agentsWithLocation[0].lastSeen.lng]
    : [20.5937, 78.9629];

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: "100%", width: "100%", borderRadius: "16px" }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
      />
      <FitBounds agents={agentsWithLocation} focusedAgentId={focusedAgentId} />
      <FocusAgent agents={agentsWithLocation} focusedAgentId={focusedAgentId} markerRefs={markerRefs} />
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        maxClusterRadius={40}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        zoomToBoundsOnClick={true}
        spiderfyDistanceMultiplier={2}
        disableClusteringAtZoom={16}
        animate={true}
      >
        {agentsWithLocation.map((agent) => (
          <Marker
            key={agent._id}
            position={[agent.lastSeen.lat, agent.lastSeen.lng]}
            icon={createAgentIcon(agent.name, agent.isOnline)}
            ref={(ref) => { if (ref) markerRefs.current[agent._id] = ref; }}
          >
            <Popup>
              <AgentPopupContent agent={agent} />
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
