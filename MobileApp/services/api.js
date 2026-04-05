import axios from "axios";
import { getToken } from "../utils/tokenStorage";

import { Platform } from "react-native";

const BASE_URL = Platform.OS === "web"
  ? "http://localhost:5000/api"
  : "http://172.100.141.24:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Unwrap response data and normalize errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      (error.code === "ECONNABORTED" ? "Request timed out" : "Network error");
    return Promise.reject(new Error(message));
  }
);

export const loginUser = (data) => api.post("/auth/login", data);

export const registerUser = (data) => api.post("/auth/register", data);

export const checkIn = (data) => api.post("/attendance/checkin", data);

export const checkOut = () => api.post("/attendance/checkout");

export const syncAttendance = (data) => api.post("/attendance/sync", { records: data });

export const getAssignments = (params) => api.get("/assignments/user", { params });
export const getTodayAttendance = () => api.get("/attendance/today");

export const getUserInsights  = (params) => api.get("/insights/user", { params });
export const getAllInsights   = (params) => api.get("/insights/all",  { params });
export const getWorkers       = ()       => api.get("/users?role=worker");
export const createAssignment = (data)   => api.post("/assignments", data);
export const getLocations     = ()       => api.get("/locations");

export default api;
