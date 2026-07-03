import axios from "axios";

// Prefer Vite proxy in dev (`/api`, `/auth`) and allow explicit override via .env
export const API_URL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const API = axios.create({
  baseURL: API_URL || "http://localhost:5000",
  withCredentials: true
});

API.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("authToken");

  
  
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const getErrorMessage = (error, fallbackMessage = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallbackMessage;

export const getApiTest = async () => {
  const res = await API.get("/api/test");
  return res.data;
};

// AUTH APIs
export const registerAPI = async (userData) => {
  const res = await API.post("/auth/register", userData);
  return res.data;
};

export const loginAPI = async (userData) => {
  const res = await API.post("/auth/login", userData);
  return res.data;
};

export const adminLoginAPI = async (userData) => {
  const res = await API.post("/auth/admin/login", userData);
  return res.data;
};

export const setupAdmin = async (userData) => {
  const res = await API.post("/auth/setup-admin", userData);
  return res.data;
};

export const logout = async () => {
  const res = await API.post("/auth/logout");
  return res.data;
};

export const verifyEmailAPI = async (token) => {
  const res = await API.get(`/auth/verify-email/${token}`);
  return res.data;
};

export const forgotPasswordAPI = async (email) => {
  const res = await API.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPasswordAPI = async (token, password) => {
  const res = await API.put(`/auth/reset-password/${token}`, { password });
  return res.data;
};

export const changePasswordAPI = async (currentPassword, newPassword) => {
  const res = await API.put("/auth/change-password", { currentPassword, newPassword });
  return res.data;
};

// EMERGENCY APIs
export const getDriverHistory = async (filter = "24h") => {
  const res = await API.get(`/api/emergency/driver/history?filter=${filter}`);
  return res.data;
};

export const acceptEmergency = async (id) => {
  const res = await API.put(`/api/emergency/${id}/accept`);
  return res.data;
};

export const declineEmergency = async (id) => {
  const res = await API.put(`/api/emergency/${id}/decline`);
  return res.data;
};

export const cancelEmergency = async (id) => {
  const res = await API.put(`/api/emergency/${id}/cancel`);
  return res.data;
};
export const cancelEmergencyByUser = async (id) => {
  const res = await API.put(
    `/api/emergency/${id}/user-cancel`
  );

  return res.data;
};

export const markArrivedAPI = async (id) => {
  const res = await API.put(`/api/emergency/${id}/mark-arrived`);
  return res.data;
};

export const completeEmergencyAPI = async (id) => {
  const res = await API.put(`/api/emergency/${id}/complete`);
  return res.data;
};

export const getEmergencyDetailsAPI = async (id) => {
  const res = await API.get(`/api/emergency/${id}`);
  return res.data;
};

export const getHospitals = async () => {
  const res = await API.get("/api/hospitals");
  return res.data;
};
export const getAvailableHospitals = async () => {
  const res = await API.get("/api/hospitals/available");
  return res.data;
};
export const assignHospital = async (emergencyId, hospitalId) => {
  const res = await API.put(`/api/emergency/${emergencyId}/assign-hospital`, { hospitalId });
  return res.data;
};

// ADMIN APIs
export const getAllUsers = async () => {
  const res = await API.get("/api/admin/users");
  return res.data;
};

export const updateUserRole = async (userId, role) => {
  const res = await API.put(`/api/admin/users/${userId}/role`, { role });
  return res.data;
};

export const getAllEmergencies = async () => {
  const res = await API.get("/api/admin/emergencies");
  return res.data;
};

export const getAdminStats = async (range = "1D") => {
  const res = await API.get("/api/admin/stats", {
    params: { range },
  });
  return res.data;
};

export const getAlerts = async () => {
  const res = await API.get("/api/alerts");
  return res.data;
};

export const updateHospitalAlertStatus = async (id, status) => {
  const res = await API.put(`/api/emergencies/${id}/status`, { status });
  return res.data;
};

export const getStats = async () => {
  const res = await API.get("/api/stats");
  return res.data;
};

export const getOverviewStats = async () => {
  const res = await API.get("/api/overview-stats");
  return res.data;
};

export const deleteUserById = async (userId) => {
  const res = await API.delete(`/api/admin/users/${userId}`);
  return res.data;
};

export const getAllAdminBookings = async () => {
  const res = await API.get("/api/admin/bookings");
  return res.data;
};

export const updateBookingStatus = async (bookingId, status) => {
  const res = await API.put(`/api/admin/bookings/${bookingId}/status`, { status });
  return res.data;
};

export const deleteBookingById = async (bookingId) => {
  const res = await API.delete(`/api/admin/bookings/${bookingId}`);
  return res.data;
};

export const cancelBookingAPI = async (id) => {
  const res = await API.put(`/api/bookings/${id}/cancel`);
  return res.data;
};

// BOOKING PAYMENT APIs — backs the existing pages/payment/PaymentPage.jsx
export const getBookingByIdAPI = async (id) => {
  const res = await API.get(`/api/bookings/${id}`);
  return res.data;
};

export const getPaymentStatusAPI = async (id) => {
  const res = await API.get(`/api/bookings/${id}/payment`);
  return res.data;
};

export const processPaymentAPI = async (id, paymentMethod) => {
  const res = await API.post(`/api/bookings/${id}/pay`, { paymentMethod });
  return res.data;
};

export const updateEmergencyStatus = async (emergencyId, status) => {
  const res = await API.put(`/api/admin/emergencies/${emergencyId}/status`, { status });
  return res.data;
};

export const deleteEmergencyById = async (emergencyId) => {
  const res = await API.delete(`/api/admin/emergencies/${emergencyId}`);
  return res.data;
};

// POLICE APIs
export const getPoliceEmergencies = async () => {
  const res = await API.get("/api/police/emergencies");
  return res.data;
};

export const getPoliceCases = async () => {
  const res = await API.get("/api/police/cases");
  return res.data;
};

export const updatePoliceCaseStatus = async (caseId, status) => {
  const res = await API.put(`/api/police/cases/${caseId}/status`, { status });
  return res.data;
};

export const getAIStats = async () => {
  const response = await API.get("/api/admin/ai-stats");
  return response.data;
};

export const precheckEmergency = async (data) => {
  const response = await API.post(
    "/api/emergency/precheck",
    data
  );

  return response.data;
};

export const uploadEvidence = async (requestId, imageUrl) => {
  const res = await API.post(
    `/api/emergency/${requestId}/evidence`,
    {
      imageUrl,
    }
  );

  return res.data;
};

export const declineBooking = async (id) => {
  const res = await API.put(`/api/bookings/${id}/decline`);
  return res.data;
};

export default API;

