"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  LayoutDashboard,
  Route,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/admin", description: "Overview & live map" },
    { name: "Clients", icon: Building2, path: "/admin/clients", description: "Client details & exports" },
    { name: "Routes", icon: Route, path: "/admin/routes", description: "Field movement tracking" },
    { name: "Analytics", icon: BarChart3, path: "/admin/analytics", description: "Performance insights" },
    { name: "Settings", icon: Settings, path: "/admin/settings", description: "Preferences & config" },
  ];

  const navContent = (
    <>
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/sharpkode.png" alt="SHARPKODE" width={40} height={40} className="object-contain" priority />
            </div>
            <div>
              <span className="text-[15px] font-extrabold text-text-primary block leading-tight tracking-tight">SHARPKODE</span>
              <span className="text-[10px] text-text-muted font-medium tracking-wide">Field Tracking</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden w-9 h-9 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-3 mb-2">Menu</p>
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-primary/8 text-primary font-semibold"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-primary/10" : "group-hover:bg-surface-alt"}`}>
                    <item.icon className={`w-[16px] h-[16px] ${isActive ? "text-primary" : ""}`} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[13px] block">{item.name}</span>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-[9px] text-primary/60 block mt-0.5"
                      >
                        {item.description}
                      </motion.span>
                    )}
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {!isActive && (
                    <ChevronRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-4 pb-5">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-surface-alt to-white border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-primary/15">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary truncate">{user?.name || "Admin"}</p>
              <p className="text-[10px] text-text-muted">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white border border-border text-text-muted hover:text-error hover:border-red-200 hover:bg-red-50 transition-all text-xs font-medium group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:animate-pulse" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-4 top-4 z-[60] w-10 h-10 rounded-xl bg-white/95 backdrop-blur border border-border shadow-sm flex items-center justify-center text-text-primary"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[55] bg-black/35 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      <motion.aside
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-border z-50 flex-col"
      >
        {navContent}
      </motion.aside>

      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: mobileOpen ? 0 : -280 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="md:hidden fixed left-0 top-0 h-screen w-[280px] bg-white border-r border-border z-[56] flex flex-col shadow-2xl"
      >
        {navContent}
      </motion.aside>
    </>
  );
}
