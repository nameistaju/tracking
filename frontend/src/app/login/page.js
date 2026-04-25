"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/lib/firebase";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
    <path
      d="M21.805 10.023H12.24v3.955h5.481c-.236 1.272-.956 2.35-2.012 3.07v2.55h3.256c1.906-1.756 3-4.343 3-7.41 0-.72-.064-1.412-.18-2.065Z"
      fill="#4285F4"
    />
    <path
      d="M12.24 22c2.735 0 5.029-.906 6.706-2.453l-3.256-2.55c-.905.607-2.061.965-3.45.965-2.648 0-4.891-1.788-5.694-4.193H3.18v2.631A10.126 10.126 0 0 0 12.24 22Z"
      fill="#34A853"
    />
    <path
      d="M6.546 13.77a6.092 6.092 0 0 1 0-3.54V7.6H3.18a10.125 10.125 0 0 0 0 9.03l3.366-2.86Z"
      fill="#FBBC04"
    />
    <path
      d="M12.24 6.038c1.489 0 2.826.512 3.879 1.516l2.91-2.91C17.264 2.999 14.97 2 12.24 2A10.126 10.126 0 0 0 3.18 7.6l3.366 2.63c.803-2.406 3.046-4.192 5.694-4.192Z"
      fill="#EA4335"
    />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginType, setLoginType] = useState(null); // null = chooser, 'admin', 'intern'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError("Invalid credentials. Please check your email and password.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseToken = await result.user.getIdToken();
      await loginWithGoogle(firebaseToken);
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  // ─── Role Chooser Screen ───
  if (!loginType) {
    return (
      <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden">
        {/* Floating blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center mb-10"
          >
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <Image src="/sharpkode.png" alt="SHARPKODE" width={80} height={80} className="object-contain" priority />
            </div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">SHARPKODE</h1>
            <p className="text-text-muted text-sm mt-1">Field Tracking Platform</p>
          </motion.div>

          {/* Role Cards */}
          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLoginType("intern")}
              className="w-full glass p-5 rounded-2xl flex items-center gap-4 group cursor-pointer text-left transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                <UserIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-text-primary text-[15px]">Field Intern</p>
                <p className="text-text-muted text-xs mt-0.5">Track location & submit leads</p>
              </div>
              <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLoginType("admin")}
              className="w-full glass p-5 rounded-2xl flex items-center gap-4 group cursor-pointer text-left transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-text-primary text-[15px]">Administrator</p>
                <p className="text-text-muted text-xs mt-0.5">Monitor team & view analytics</p>
              </div>
              <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </motion.button>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-text-muted text-[11px] mt-8"
          >
            © 2026 SHARPKODE. All Rights Reserved.
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ─── Login Form ───
  const isAdmin = loginType === "admin";

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden">
      {/* Floating blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => { setLoginType(null); setError(""); setEmail(""); setPassword(""); }}
          className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-primary transition-colors group"
        >
          <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          Back
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            <Image src="/sharpkode.png" alt="SHARPKODE" width={56} height={56} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">
            {isAdmin ? "Admin Login" : "Intern Login"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {isAdmin ? "Access the management dashboard" : "Sign in to start tracking"}
          </p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="text-[13px] font-semibold text-text-secondary mb-1.5 block">Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                <Mail className="w-[18px] h-[18px]" />
              </div>
              <input
                type="email"
                placeholder={isAdmin ? "admin@sharpkode.com" : "intern@sharpkode.com"}
                className="input-sharpkode input-with-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                suppressHydrationWarning
                autoComplete="email"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label className="text-[13px] font-semibold text-text-secondary mb-1.5 block">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                <Lock className="w-[18px] h-[18px]" />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="input-sharpkode input-with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                suppressHydrationWarning
                autoComplete="current-password"
              />
            </div>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-error text-sm bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.985 }}
            disabled={loading}
            className="btn-primary w-full text-[15px] mt-2"
            type="submit"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <motion.button
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-text-muted text-[11px] mt-8"
        >
          © 2026 SHARPKODE. All Rights Reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}
