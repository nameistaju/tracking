"use client";
import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Premium custom marker icon
const customIcon = (color = "#22D3EE") => L.divIcon({
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
  className: "custom-div-icon",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function Map({ points, height = "100%" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="h-full w-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center border border-white/5">
      <div className="text-slate-500 text-sm font-bold tracking-widest uppercase">Initializing Radar...</div>
    </div>
  );

  const center = points.length > 0 && points[0].location 
    ? [points[0].location.lat, points[0].location.lng] 
    : [20.5937, 78.9629];

  return (
    <MapContainer 
      center={center} 
      zoom={points.length > 0 ? 10 : 5} 
      style={{ height: height, width: "100%", background: "#030712" }}
      zoomControl={false}
    >
      <TileLayer 
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />
      {points.map((p, idx) => (
        p.location && (
          <Marker 
            key={idx} 
            position={[p.location.lat, p.location.lng]} 
            icon={customIcon(p.role === 'Admin' ? '#6366F1' : (p.role === 'Intern' ? '#22D3EE' : '#F472B6'))}
          >
            <Popup className="premium-popup">
              <div className="p-2 min-w-[150px]">
                <h4 className="font-black text-slate-900 m-0 text-sm uppercase tracking-tight">{p.name || p.clientName}</h4>
                <p className="text-[10px] text-slate-500 m-0 font-bold uppercase">{p.role || 'New Prospect'}</p>
                {p.notes && <p className="text-xs text-slate-600 mt-2 italic border-t pt-2 border-slate-100">"{p.notes}"</p>}
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}
