"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { ArrowLeft, Building2, Download, Mail, MapPin, Phone, Search, User2 } from "lucide-react";
import api, { authConfig } from "@/lib/api";

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [interns, setInterns] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [internId, setInternId] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const config = authConfig(user.token);

    const fetchData = async () => {
      try {
        const [clientsRes, internsRes] = await Promise.all([
          api.get("/api/admin/clients", config),
          api.get("/api/admin/interns", config)
        ]);
        setClients(clientsRes.data);
        setInterns(internsRes.data);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = !search || [
        client.businessName,
        client.clientName,
        client.clientPhone,
        client.clientEmail,
        client.addressText,
        client.address?.formatted,
        client.userId?.name
      ].filter(Boolean).some((value) => value.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = !status || client.status === status;
      const matchesIntern = !internId || client.userId?._id === internId;
      const matchesDate = !date || new Date(client.createdAt).toISOString().split("T")[0] === date;

      return matchesSearch && matchesStatus && matchesIntern && matchesDate;
    });
  }, [clients, search, status, internId, date]);

  const downloadExport = async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (internId) params.set("internId", internId);
    if (date) params.set("date", date);

    try {
      const response = await api.get(`/api/admin/clients/export?${params.toString()}`, {
        ...authConfig(user.token),
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `client-details-${date || "all"}.csv`;
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
        <header className="flex flex-col gap-3 items-start justify-between px-4 py-4 pt-16 md:px-7 md:pt-4 bg-white/70 backdrop-blur-xl border-b border-border sticky top-0 z-40 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 pr-10 md:pr-0">
            <Link href="/admin" className="w-8 h-8 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Client Details
              </h1>
              <p className="text-text-muted text-[11px] mt-0.5">All submitted client visits with admin export</p>
            </div>
          </div>
          <button onClick={downloadExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download Excel CSV
          </button>
        </header>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search business, client, phone, email..."
                className="input-sharpkode pl-10"
              />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-sharpkode">
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
              <option value="follow-up">Follow-up</option>
              <option value="not-interested">Not Interested</option>
            </select>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="input-sharpkode" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4">
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-border">
                <div>
                  <p className="text-sm font-bold text-text-primary">{filteredClients.length} client records</p>
                  <p className="text-[11px] text-text-muted">Includes GPS quality and visit outcome</p>
                </div>
                <select value={internId} onChange={(event) => setInternId(event.target.value)} className="input-sharpkode w-full md:max-w-[220px]">
                  <option value="">All interns</option>
                  {interns.map((intern) => (
                    <option key={intern._id} value={intern._id}>{intern.name}</option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead className="bg-surface-alt text-text-muted">
                    <tr className="text-left">
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Intern</th>
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="px-4 py-10 text-center text-text-muted" colSpan={6}>Loading client details...</td></tr>
                    ) : filteredClients.length === 0 ? (
                      <tr><td className="px-4 py-10 text-center text-text-muted" colSpan={6}>No client records match these filters.</td></tr>
                    ) : filteredClients.map((client) => (
                      <tr key={client._id} className="border-t border-border-light align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-text-primary">{client.clientName}</p>
                          <p className="text-xs text-text-muted">{client.businessName || "No business name"}</p>
                          {client.notes && <p className="text-xs text-text-muted mt-1 max-w-[240px]">{client.notes}</p>}
                        </td>
                        <td className="px-4 py-4 text-xs text-text-secondary">
                          <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {client.clientPhone}</p>
                          <p className="flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5" /> {client.clientEmail || "No email"}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-text-secondary">
                          <p className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5" /> {client.addressText || client.address?.formatted || "No address"}</p>
                          <p className="mt-1 text-text-muted">GPS: {client.gps?.quality || "unknown"} {client.gps?.accuracy ? `(${Math.round(client.gps.accuracy)}m)` : ""}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex px-2.5 py-1 rounded-full bg-primary/8 text-primary text-xs font-semibold">{client.status}</span>
                          <p className="text-xs text-text-muted mt-1">{client.visitOutcome}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-text-secondary">
                          <p className="flex items-center gap-1.5"><User2 className="w-3.5 h-3.5" /> {client.userId?.name || "Unknown"}</p>
                          <p className="text-text-muted mt-1">{client.userId?.email || ""}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-text-secondary whitespace-nowrap">{new Date(client.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-[11px] text-text-muted uppercase tracking-wider">Total Visible Clients</p>
                <p className="text-3xl font-extrabold text-text-primary mt-1">{filteredClients.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-[11px] text-text-muted uppercase tracking-wider">High GPS Quality</p>
                <p className="text-3xl font-extrabold text-text-primary mt-1">
                  {filteredClients.filter((client) => client.gps?.quality === "high").length}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-[11px] text-text-muted uppercase tracking-wider">Converted</p>
                <p className="text-3xl font-extrabold text-text-primary mt-1">
                  {filteredClients.filter((client) => client.status === "converted").length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
