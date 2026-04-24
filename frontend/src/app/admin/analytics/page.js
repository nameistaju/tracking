"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { BarChart3, TrendingUp, Users, Target, Activity, ArrowLeft, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import api, { authConfig } from "@/lib/api";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/api/admin/analytics/summary", authConfig(user.token));
        setAnalytics(res.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchAnalytics();
  }, [user]);

  if (!user) return null;

  const statusColors = {
    new: { bg: 'bg-blue-50', text: 'text-blue-500', label: 'New' },
    contacted: { bg: 'bg-amber-50', text: 'text-amber-500', label: 'Contacted' },
    qualified: { bg: 'bg-emerald-50', text: 'text-emerald-500', label: 'Qualified' },
    converted: { bg: 'bg-green-50', text: 'text-green-600', label: 'Converted' },
    lost: { bg: 'bg-red-50', text: 'text-red-500', label: 'Lost' }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] flex flex-col overflow-y-auto">
        <header className="flex items-center gap-3 px-7 py-4 bg-white/60 backdrop-blur-lg border-b border-border sticky top-0 z-40">
          <Link href="/admin" className="w-8 h-8 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Analytics
            </h1>
            <p className="text-text-muted text-[11px] mt-0.5">Team performance & insights</p>
          </div>
        </header>

        <div className="p-7 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : analytics && (
            <>
              {/* Leaderboard */}
              <section>
                <h2 className="text-[15px] font-bold text-text-primary flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-500" /> Lead Leaderboard
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.leadsPerUser.map((item, i) => (
                    <motion.div key={item._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="stat-card flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${
                        i === 0 ? 'bg-amber-50 text-amber-500' : i === 1 ? 'bg-slate-100 text-slate-500' : i === 2 ? 'bg-orange-50 text-orange-500' : 'bg-surface-alt text-text-muted'
                      }`}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i+1}`}</div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-text-primary">{item.name}</p>
                        <p className="text-[10px] text-text-muted">{item.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-primary">{item.count}</p>
                        <p className="text-[10px] text-text-muted">leads</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Activity */}
              <section>
                <h2 className="text-[15px] font-bold text-text-primary flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-success" /> Today's Activity
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.activityToday.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-text-muted text-sm">No activity today</div>
                  ) : analytics.activityToday.map((item, i) => (
                    <motion.div key={item._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="stat-card">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[13px] font-semibold text-text-primary">{item.name}</p>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-success text-[10px] font-semibold border border-emerald-100">Active</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] text-text-muted uppercase tracking-wider">Pings</p>
                          <p className="text-xl font-extrabold text-primary">{item.pings}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-muted uppercase tracking-wider">Last Ping</p>
                          <p className="text-xs font-semibold text-text-secondary">{new Date(item.lastPing).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((item.pings / Math.max(...analytics.activityToday.map(a => a.pings))) * 100, 100)}%` }}
                          transition={{ delay: 0.3, duration: 0.6 }}
                          className="h-full bg-gradient-to-r from-primary/40 to-primary rounded-full" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Pipeline */}
              <section>
                <h2 className="text-[15px] font-bold text-text-primary flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-violet-500" /> Lead Pipeline
                </h2>
                <div className="flex gap-3 flex-wrap">
                  {analytics.leadsByStatus.map((item, i) => {
                    const style = statusColors[item._id] || statusColors.new;
                    return (
                      <motion.div key={item._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                        className="stat-card min-w-[130px]">
                        <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center mb-3`}>
                          <Target className={`w-4 h-4 ${style.text}`} />
                        </div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">{style.label}</p>
                        <p className="text-xl font-extrabold text-text-primary">{item.count}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* Weekly Trend */}
              <section>
                <h2 className="text-[15px] font-bold text-text-primary flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" /> Weekly Trend
                </h2>
                <div className="bg-white rounded-2xl border border-border p-6">
                  {analytics.weeklyLeads.length === 0 ? (
                    <p className="text-center py-8 text-text-muted text-sm">No data this week</p>
                  ) : (
                    <div className="flex items-end gap-3 h-36">
                      {analytics.weeklyLeads.map((day, i) => {
                        const maxCount = Math.max(...analytics.weeklyLeads.map(d => d.count));
                        const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                        return (
                          <div key={day._id} className="flex-1 flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-primary">{day.count}</span>
                            <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(height, 5)}%` }}
                              transition={{ delay: i * 0.08, duration: 0.5 }}
                              className="w-full bg-gradient-to-t from-primary/10 to-primary/40 rounded-xl border border-primary/15" style={{ minHeight: '4px' }} />
                            <span className="text-[10px] text-text-muted">{new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
