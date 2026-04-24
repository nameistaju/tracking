import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export const buildApiUrl = (path = "") =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

export const authConfig = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export default api;
export { API_BASE };
