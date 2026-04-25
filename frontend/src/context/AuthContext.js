"use client";
import React, { createContext, useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const AuthContext = createContext();
const USER_STORAGE_KEY = "user";

const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
};

const persistAuth = (data) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
};

const clearAuth = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auto-logout on 401 (stale/invalid token)
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setUser(null);
          clearAuth();
          router.push("/login");
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [router]);

  const login = async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    setUser(data);
    persistAuth(data);
    if (data.role === "Admin") router.push("/admin");
    else router.push("/intern");
  };

  const loginWithGoogle = async (firebaseToken) => {
    const { data } = await api.post("/api/auth/google", { token: firebaseToken });
    setUser(data);
    persistAuth(data);
    if (data.role === "Admin") router.push("/admin");
    else router.push("/intern");
  };

  const logout = () => {
    setUser(null);
    clearAuth();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
