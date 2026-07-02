import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Container from "../../components/layout/Container";
import { API_URL, getAlerts, getErrorMessage, getStats, updateHospitalAlertStatus } from "../../services/api";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminModal from "../../components/admin/AdminModal";
import { formatDate, getStatusBadgeClasses } from "../../components/admin/admin.utils";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import EmergencyPopup from "../../components/notifications/EmergencyPopup";
import { useAuth } from "../../context/AuthContext";
import { NavLink } from "react-router-dom";
import {
  Search as SearchIcon,
  X as ClearIcon,
  AlertTriangle as AlertIcon,
  ClipboardList as ClipboardIcon,
  Satellite as SatelliteIcon,
  CheckCircle2 as CheckCircleIcon,
  Building2 as HospitalIcon,
  User as UserIcon,
  LayoutDashboard,
  Zap,
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  getHospitalById,
  updateEmergencyBeds,
} from "../../services/hospitalApi";
import EvidenceImageViewer from "../../components/common/EvidenceImageViewer";

// Standard Leaflet markers with enhanced animation styles
const ambulanceIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center">
    <span class="absolute inline-flex h-full w-full rounded-full bg-red-405 opacity-75 animate-ping"></span>
    <div class="relative bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg border-2 border-red-500 flex items-center justify-center text-red-600">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">
        <path d="M3 16V8a1 1 0 0 1 1-1h9l4 4h3a1 1 0 0 1 1 1v4"></path>
        <path d="M3 16h17"></path>
        <circle cx="7" cy="18" r="1.5"></circle>
        <circle cx="17" cy="18" r="1.5"></circle>
        <path d="M9 9.5v3M7.5 11h3"></path>
      </svg>
    </div>
  </div>`,
  className: "custom-leaflet-icon",
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const patientIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center">
    <span class="absolute inline-flex h-full w-full rounded-full bg-blue-450 opacity-75 animate-ping"></span>
    <div class="relative bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg border-2 border-blue-500 flex items-center justify-center text-blue-600">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">
        <circle cx="12" cy="8" r="3.5"></circle>
        <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"></path>
      </svg>
    </div>
  </div>`,
  className: "custom-leaflet-icon",
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    activeAlerts: 0,
    totalHospitals: 0,
    totalBookings: 0,
  });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [trackingAlert, setTrackingAlert] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [ambulanceLocations, setAmbulanceLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [popupNotifications, setPopupNotifications] = useState([]);

  // Search bar query state
  const [searchQuery, setSearchQuery] = useState("");
  const [emergencyBeds, setEmergencyBeds] = useState(0);
  const [updatingBeds, setUpdatingBeds] = useState(false);
  const dismissPopup = useCallback((id) => {
    setPopupNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [alertsRes, statsRes] = await Promise.all([getAlerts(), getStats()]);
      if (alertsRes.success) setAlerts(alertsRes.alerts || []);
      if (statsRes.success) setStats(statsRes.stats || {});
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to load hospital dashboard data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socketUrl = API_URL || window.location.origin;
    const newSocket = io(socketUrl, { withCredentials: true });

    if (user?._id) {
      newSocket.emit("join_hospital", { hospitalId: user._id });
    } else {
      newSocket.emit("join_hospital", {});
    }

    newSocket.on("hospital_alert", (data) => {
      setAlerts((prev) => {
        const exists = prev.find((a) => a._id === data.request._id);
        if (exists) {
          if (!data.isLite) {
            return prev.map((a) => (a._id === data.request._id ? data.request : a));
          }
          return prev.map((a) => (a._id === data.request._id ? { ...a, ...data.request } : a));
        }
        return [data.request, ...prev];
      });
      setPopupNotifications((prev) => [
        ...prev,
        { id: `${data.request._id}-${Date.now()}`, type: "hospital", request: data.request, hospitalSelected: data.hospitalSelected },
      ]);
    });

    newSocket.on("ambulance_location", (data) => {
      setAmbulanceLocations((prev) => ({
        ...prev,
        [data.requestId]: { lat: data.lat || data.latitude, lng: data.lng || data.longitude },
      }));
    });

    return () => newSocket.close();
  }, [user?._id]);
  useEffect(() => {
    const fetchHospitalBeds = async () => {
      try {
        if (!user?._id) return;

        const res = await getHospitalById(user._id);

        if (res.success) {
          setEmergencyBeds(res.hospital.emergencyBeds || 0);
        }
      } catch (err) {
        console.error("Failed to load emergency beds", err);
      }
    };

    fetchHospitalBeds();
  }, [user]);

  const handleUpdateBeds = async () => {
    try {
      setUpdatingBeds(true);

      const res = await updateEmergencyBeds(emergencyBeds);

      if (res.success) {
        alert("Emergency beds updated successfully.");
      }

    } catch (err) {
      console.error(err);
      alert("Failed to update emergency beds.");
    } finally {
      setUpdatingBeds(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await updateHospitalAlertStatus(id, status);
      if (res.success) {
        setAlerts((prev) => prev.map((a) => (a._id === id ? res.emergency : a)));
        if (selectedAlert?._id === id) setSelectedAlert(res.emergency);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Status counters
  const activeAlertsCount = alerts.filter((alert) => !["COMPLETED", "CANCELLED"].includes(alert.status)).length;
  const pendingAlertsCount = alerts.filter((alert) => ["PENDING", "AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION"].includes(alert.status)).length;
  const completedAlertsCount = alerts.filter((alert) => alert.status === "COMPLETED").length;

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedFilter === "active") return !["COMPLETED", "CANCELLED"].includes(alert.status);
    if (selectedFilter === "pending") return ["PENDING", "AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION"].includes(alert.status);
    if (selectedFilter === "completed") return alert.status === "COMPLETED";
    if (selectedFilter === "cancelled") return alert.status === "CANCELLED";
    return true;
  });

  // Client-side search implementation matching columns
  const searchedAlerts = filteredAlerts.filter((alert) => {
    const name = alert.user?.name || "Anonymous Patient";
    const ambName = alert.ambulance?.name || "";
    const ambVeh = alert.ambulance?.vehicleNumber || "";
    const status = alert.status || "PENDING";
    const phone = alert.user?.mobile || "";
    const query = searchQuery.toLowerCase();

    return (
      name.toLowerCase().includes(query) ||
      ambName.toLowerCase().includes(query) ||
      ambVeh.toLowerCase().includes(query) ||
      status.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query)
    );
  });

  const selectedFilterLabel =
    selectedFilter === "active"
      ? "Active"
      : selectedFilter === "pending"
        ? "Pending"
        : selectedFilter === "completed"
          ? "Completed"
          : selectedFilter === "cancelled"
            ? "Cancelled"
            : "All";

  // Beautiful custom color tokens for emergency severity levels
  const getPriorityInfo = (alert) => {
    const status = alert.status || "PENDING";
    if (["PENDING", "AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION"].includes(status)) {
      return { 
        label: "Critical", 
        colorClass: "bg-red-500/10 text-red-650 border border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
        pulse: true 
      };
    }
    if (["EN_ROUTE_TO_HOSPITAL", "IN_TRANSIT"].includes(status)) {
      return { 
        label: "High Priority", 
        colorClass: "bg-amber-500/10 text-amber-655 border border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
        pulse: false 
      };
    }
    return { 
      label: "Stable", 
      colorClass: "bg-emerald-500/10 text-emerald-655 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
      pulse: false 
    };
  };

  // Style badge wrapper based on system-wide status
  const getCustomBadgeStyle = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400";
      case "AMBULANCE_ACCEPTED":
      case "ARRIVED_AT_LOCATION":
        return "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400";
      case "EN_ROUTE_TO_HOSPITAL":
      case "IN_TRANSIT":
        return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
      case "CANCELLED":
        return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const getAlertDetails = (alert) => {
    const liveLoc = ambulanceLocations[alert._id];
    return {
      "Case Status": alert.status || "Pending review",
      "Patient Name": alert.user?.name || "Anonymous patient",
      "Contact Number": alert.user?.mobile || "Not provided",
      "Pickup Point Coordinates": alert.location ? `${alert.location.latitude}, ${alert.location.longitude}` : "Not available",
      "Assigned Hospital": alert.hospital?.name || "Awaiting assignment",
      "Ambulance Unit": alert.ambulance?.name || "Pending dispatch",
      "Live GPS Coordinates": liveLoc ? `${liveLoc.lat.toFixed(6)}, ${liveLoc.lng.toFixed(6)} • Live Signal` : "Awaiting signal",
      "Evidence Image": alert.imageUrl || "No image uploaded",
      "Reported Time": formatDate(alert.createdAt),
      "AI Prediction":
        alert.aiAnalysis?.predictedClass || "N/A",

      Severity:
        alert.aiAnalysis?.severity || "N/A",

      "AI Confidence":
        alert.aiAnalysis
          ? `${(alert.aiAnalysis.confidence * 100).toFixed(1)}%`
          : "N/A",

      "Recommended Ambulance":
        alert.aiAnalysis?.recommendedAmbulance || "N/A",
    };
  };

  return (
    <div className="space-y-4 w-full">
      {/* SIMPLE WELCOME HEADER */}
      <div className="flex justify-between items-start w-full mb-6">

        {/* Left Section */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Hospital Dashboard
          </h1>

          <p className="mt-2 text-gray-500">
            Manage bookings, track ambulances and monitor emergency requests.
          </p>
        </div>

        {/* Right Section */}
        <div className="flex-shrink-0 ml-8 -mt-16">

          <div className="w-48 rounded-xl border bg-white p-3 shadow-sm">

            <h3 className="text-base font-bold">
              Emergency Beds
            </h3>

            <p className="text-xs text-gray-500 mt-1 mb-2">
              Available Today
            </p>

            <input
              type="number"
              value={emergencyBeds}
              onChange={(e) => setEmergencyBeds(Number(e.target.value))}
              className="w-full rounded-md border px-2 py-1 text-sm mb-2"
            />

            <button
              disabled={updatingBeds}
              onClick={handleUpdateBeds}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-md py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              {updatingBeds ? "Updating..." : "Update"}
            </button>

          </div>

        </div>

      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm font-semibold text-red-755 dark:border-red-900/40 dark:bg-red-955/20 dark:text-red-300">
          <AlertIcon className="h-5 w-5 text-red-500 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {/* METRICS STATS CARDS SECTION */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            key: "all",
            label: "Total Bookings",
            value: alerts.length,
            selectedClass: "border-blue-400 bg-blue-100 dark:border-blue-500/60 dark:bg-blue-500/20",
            hoverClass: "hover:border-blue-400 hover:bg-blue-100/80 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/20",
            labelClass: "text-blue-700 dark:text-blue-300",
            valueClass: "text-blue-800 dark:text-blue-200",
          },
          {
            key: "active",
            label: "Active",
            value: activeAlertsCount,
            selectedClass: "border-red-400 bg-red-100 dark:border-red-500/60 dark:bg-red-500/20",
            hoverClass: "hover:border-red-400 hover:bg-red-100/80 dark:hover:border-red-500/50 dark:hover:bg-red-500/20",
            labelClass: "text-red-700 dark:text-red-300",
            valueClass: "text-red-800 dark:text-red-200",
          },
          {
            key: "pending",
            label: "Pending",
            value: pendingAlertsCount,
            selectedClass: "border-yellow-400 bg-yellow-100 dark:border-yellow-500/60 dark:bg-yellow-500/20",
            hoverClass: "hover:border-yellow-400 hover:bg-yellow-100/80 dark:hover:border-yellow-500/50 dark:hover:bg-yellow-500/20",
            labelClass: "text-yellow-700 dark:text-yellow-300",
            valueClass: "text-yellow-800 dark:text-yellow-200",
          },
          {
            key: "completed",
            label: "Completed",
            value: completedAlertsCount,
            selectedClass: "border-emerald-400 bg-emerald-100 dark:border-emerald-500/60 dark:bg-emerald-500/20",
            hoverClass: "hover:border-emerald-400 hover:bg-emerald-100/80 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/20",
            labelClass: "text-emerald-700 dark:text-emerald-300",
            valueClass: "text-emerald-800 dark:text-emerald-200",
          },
          {
            key: "cancelled",
            label: "Cancelled",
            value: alerts.filter((a) => a.status === "CANCELLED").length,
            selectedClass: "border-slate-600 bg-slate-300 dark:border-slate-400 dark:bg-slate-700/60",
            hoverClass: "hover:border-slate-600 hover:bg-slate-300/80 dark:hover:border-slate-400 dark:hover:bg-slate-700/60",
            labelClass: "text-slate-900 dark:text-slate-100",
            valueClass: "text-black dark:text-white",
          },
        ].map((item) => {
          const isSelected = selectedFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedFilter(item.key)}
              className={`rounded-2xl border p-4 text-left transition-colors focus:outline-none ${
                isSelected
                  ? item.selectedClass
                  : `border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${item.hoverClass}`
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${
                isSelected ? item.labelClass : "text-slate-500 dark:text-slate-400"
              }`}>
                {item.label}
              </p>
              <p className={`mt-2 text-2xl font-bold ${
                isSelected ? item.valueClass : "text-slate-900 dark:text-white"
              }`}>
                {item.value}
              </p>
            </button>
          );
        })}
      </div>

      {/* CASES LOG WORKSPACE */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Emergency Case Log
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {selectedFilterLabel.toLowerCase()} cases · {searchedAlerts.length} total
            </p>
          </div>

          {/* SEARCH CONTROL */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <SearchIcon className="h-4 w-4" strokeWidth={2} />
            </span>
            <input
              type="text"
              placeholder="Search patient, ambulance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <ClearIcon className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* LOADING SKELETON */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="animate-pulse rounded-2xl border border-slate-202 bg-white p-5 dark:border-slate-800 dark:bg-slate-905 flex justify-between items-center">
                <div className="space-y-2.5">
                  <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-56 rounded bg-slate-200 dark:bg-slate-805" />
                </div>
                <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-slate-805" />
              </div>
            ))}
          </div>
        ) : searchedAlerts.length > 0 ? (
          <>
            {/* DESKTOP CASE TABLE */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-202 bg-white shadow-sm dark:border-slate-850 dark:bg-slate-900/60">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-808/80">
                <thead className="bg-slate-50/80 dark:bg-slate-800/65">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-505">Patient / Mobile</th>
                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-505">Dispatch Status</th>
                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-550">Severity Tag</th>
                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-550">Ambulance Team</th>
                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-455 dark:text-slate-550">Reported Time</th>
                    <th scope="col" className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-wider text-slate-455 dark:text-slate-550">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-808/60 dark:bg-transparent">
                  {searchedAlerts.map((alert) => {
                    const priority = getPriorityInfo(alert);
                    return (
                      <tr key={alert._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-805/20 transition-colors">
                        {/* Patient Contact Info */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-105 dark:bg-blue-900/40 flex items-center justify-center text-blue-650 dark:text-blue-450">
                              <UserIcon className="h-4.5 w-4.5" strokeWidth={2} />
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-slate-905 dark:text-white">
                                {alert.user?.name || "Anonymous Patient"}
                              </div>
                              <div className="text-xs font-semibold text-slate-450 dark:text-slate-550">
                                {alert.user?.mobile || "No phone listed"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Case status badge */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getCustomBadgeStyle(alert.status)}`}>
                            {alert.status || "PENDING"}
                          </span>
                        </td>

                        {/* AI Analysis */}
                        <td className="whitespace-nowrap px-6 py-4">

                          {alert.aiAnalysis ? (

                            <div className="space-y-2">

                              {/* Emergency Type */}
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${alert.aiAnalysis.predictedClass === "fire"
                                    ? "bg-red-100 text-red-700"
                                    : alert.aiAnalysis.predictedClass === "accident"
                                      ? "bg-orange-100 text-orange-700"
                                      : alert.aiAnalysis.predictedClass === "medical"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-green-100 text-green-700"
                                  }`}
                              >
                                {alert.aiAnalysis.predictedClass.toUpperCase()}
                              </span>

                              {/* Severity */}
                              <br />

                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${alert.aiAnalysis.severity === "CRITICAL"
                                    ? "bg-red-600 text-white"
                                    : alert.aiAnalysis.severity === "HIGH"
                                      ? "bg-orange-500 text-white"
                                      : alert.aiAnalysis.severity === "MODERATE"
                                        ? "bg-yellow-500 text-white"
                                        : "bg-green-600 text-white"
                                  }`}
                              >
                                {alert.aiAnalysis.severity}
                              </span>

                              {/* Confidence */}
                              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">

                                🎯 {(alert.aiAnalysis.confidence * 100).toFixed(1)}%

                              </div>

                            </div>

                          ) : (

                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${priority.colorClass}`}
                            >
                              {priority.pulse && (
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                              )}
                              {priority.label}
                            </span>

                          )}

                        </td>

                        {/* Ambulance Team allocation */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-355">
                          {alert.ambulance?.name ? (
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-805 dark:text-slate-205">{alert.ambulance.name}</span>
                              <span className="text-xs text-slate-455 font-semibold uppercase tracking-wider">{alert.ambulance.vehicleNumber || "Fleet License"}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-amber-500/90 dark:text-amber-405 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Awaiting Dispatch
                            </span>
                          )}
                        </td>

                        {/* Relative reported date */}
                        <td className="whitespace-nowrap px-6 py-4 text-xs font-semibold text-slate-455 dark:text-slate-500">
                          {formatDate(alert.createdAt)}
                        </td>

                        {/* Operations trigger buttons */}
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {/* Details Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedAlert(alert)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-705 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-250 px-3.5 py-2.5 text-xs font-bold border border-slate-202 dark:border-slate-702 transition-all shadow-sm"
                            >
                              <ClipboardIcon className="h-3.5 w-3.5" strokeWidth={2} />
                              Details
                            </button>
                            
                            {/* Live Track Button */}
                            {alert.ambulance && alert.status !== "COMPLETED" && (
                              <button
                                type="button"
                                onClick={() => setTrackingAlert(alert)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-55/80 hover:bg-blue-100 text-blue-600 dark:bg-blue-955/40 dark:hover:bg-blue-900/40 dark:text-blue-400 px-3.5 py-2.5 text-xs font-bold border border-blue-202 dark:border-blue-802 transition-all shadow-sm"
                              >
                                <SatelliteIcon className="h-3.5 w-3.5" strokeWidth={2} />
                                Live Track
                              </button>
                            )}
                            
                            {/* Resolve Button */}
                            {alert.status !== "COMPLETED" && (
                              <button
                                type="button"
                                onClick={() => handleStatusUpdate(alert._id, "COMPLETED")}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-705 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3.5 py-2.5 text-xs font-bold transition-all shadow-sm shadow-emerald-505/10 active:scale-95"
                              >
                                <CheckCircleIcon className="h-3.5 w-3.5" strokeWidth={2} />
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE VIEW INCIDENT CARDS */}
            <div className="block md:hidden space-y-4">
              {searchedAlerts.map((alert) => {
                const priority = getPriorityInfo(alert);
                return (
                  <div
                    key={alert._id}
                    className="rounded-2xl border border-slate-202 bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getCustomBadgeStyle(alert.status)}`}>
                          {alert.status || "PENDING"}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-905 dark:text-white mt-1">
                          {alert.user?.name || "Anonymous Patient"}
                        </h3>
                        <p className="text-xs text-slate-455 font-semibold">{alert.user?.mobile || "No phone listed"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">

                        {alert.aiAnalysis ? (

                          <>

                            <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-1 text-[9px] font-black uppercase">

                              {alert.aiAnalysis.predictedClass}

                            </span>

                            <span className="rounded-full bg-orange-500 text-white px-2.5 py-1 text-[9px] font-black uppercase">

                              {alert.aiAnalysis.severity}

                            </span>

                            <span className="text-[10px] font-bold text-blue-600">

                               {(alert.aiAnalysis.confidence * 100).toFixed(1)}%

                            </span>

                          </>

                        ) : (

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${priority.colorClass}`}
                          >
                            {priority.label}
                          </span>

                        )}

                      </div>
                    </div>

                    <div className="border-t border-slate-105 dark:border-slate-850 pt-3 flex items-center justify-between text-xs">
                      <div className="text-slate-505 dark:text-slate-405">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-450">Assigned Ambulance</p>
                        {alert.ambulance?.name ? (
                          <span className="font-bold text-slate-705 dark:text-slate-200">{alert.ambulance.name} ({alert.ambulance.vehicleNumber})</span>
                        ) : (
                          <span className="font-semibold text-amber-505">Awaiting Dispatch</span>
                        )}
                      </div>
                      <span className="text-slate-455 font-semibold shrink-0">{formatDate(alert.createdAt)}</span>
                    </div>

                    {/* Action footer for mobile cards */}
                    <div className="flex gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-808/80">
                      <button
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-105/90 hover:bg-slate-200 text-slate-705 dark:bg-slate-850 dark:hover:bg-slate-705 dark:text-slate-250 py-3 text-xs font-bold transition-all"
                      >
                        <ClipboardIcon className="h-3.5 w-3.5" strokeWidth={2} />
                        Details
                      </button>
                      
                      {alert.ambulance && alert.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => setTrackingAlert(alert)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-650 dark:bg-blue-955/40 dark:hover:bg-blue-900/40 dark:text-blue-400 py-3 text-xs font-bold transition-all"
                        >
                          <SatelliteIcon className="h-3.5 w-3.5" strokeWidth={2} />
                          Live Track
                        </button>
                      )}
                      
                      {alert.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(alert._id, "COMPLETED")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-705 text-white dark:bg-emerald-650 dark:hover:bg-emerald-500 py-3 text-xs font-bold transition-all shadow-sm shadow-emerald-505/10 active:scale-95"
                        >
                          <CheckCircleIcon className="h-3.5 w-3.5" strokeWidth={2} />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-202 bg-white p-12 text-center shadow-sm dark:border-slate-805 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-55 text-blue-650 dark:bg-slate-800 dark:text-blue-400 mb-4 shadow-inner">
              <HospitalIcon className="h-7 w-7" strokeWidth={2} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-905 dark:text-white">No incidents logged</h3>
            <p className="mt-1.5 text-xs font-semibold text-slate-400 dark:text-slate-505 max-w-sm mx-auto">
              Currently there are no emergencies matching the filter "{selectedFilterLabel.toLowerCase()}". Live notifications will slide in once received.
            </p>
          </div>
        )}
      </div>

      {/* METADATA DETAILS MODAL */}
      {selectedAlert && (
        <AdminModal 
          title="Emergency Details" 
          subtitle="Full medical record summary compiled from dispatcher feed" 
          onClose={() => setSelectedAlert(null)}
        >
          <div className="space-y-6">

            <EvidenceImageViewer
              mainImage={selectedAlert.imageUrl}
              evidence={selectedAlert.evidence || []}
            />

            <div className="bg-slate-55 dark:bg-slate-905 p-1.5 rounded-xl border border-slate-105 dark:border-slate-900">
              <AdminDetailGrid
                data={getAlertDetails(selectedAlert)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-200 dark:hover:bg-white px-5 py-2.5 text-sm font-bold text-white dark:text-slate-900 transition-colors shadow-sm"
              >
                Close Records
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* LIVE ROUTE TRACKING PIPELINE MODAL */}
      {trackingAlert && (
        <AdminModal
          title="Dispatch Mission Control"
          subtitle={`Route tracking for ${trackingAlert.user?.name || "Patient Incident"}`}
          onClose={() => setTrackingAlert(null)}
        >
          <div className="flex flex-col gap-6">
            
            {/* SPLIT PANEL: MAP & META INFO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Leaflet Map Area */}
              <div className="lg:col-span-2 h-[400px] w-full overflow-hidden rounded-2xl border border-slate-205 dark:border-slate-800 shadow-sm relative z-0">
                <MapContainer
                  center={[trackingAlert.location?.latitude || 20.5937, trackingAlert.location?.longitude || 78.9629]}
                  zoom={14}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={true}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                  />

                  {trackingAlert.location && (
                    <Marker position={[trackingAlert.location.latitude, trackingAlert.location.longitude]} icon={patientIcon}>
                      <Popup>
                        <div className="p-1.5 font-sans">
                          <p className="font-extrabold text-slate-850">Starting Location</p>
                          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Patient dispatch call site</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {ambulanceLocations[trackingAlert._id] && (
                    <>
                      <Marker
                        position={[ambulanceLocations[trackingAlert._id].lat, ambulanceLocations[trackingAlert._id].lng]}
                        icon={ambulanceIcon}
                      >
                        <Popup>
                          <div className="text-center font-sans">
                            <p className="font-extrabold text-slate-855">Ambulance {trackingAlert.ambulance?.vehicleNumber}</p>
                            <p className="text-[10px] font-black uppercase text-red-505 animate-pulse mt-0.5">Live GPS Transmitting...</p>
                          </div>
                        </Popup>
                      </Marker>
                      <Polyline
                        positions={[
                          [trackingAlert.location.latitude, trackingAlert.location.longitude],
                          [ambulanceLocations[trackingAlert._id].lat, ambulanceLocations[trackingAlert._id].lng],
                        ]}
                        color="#3b82f6"
                        dashArray="10, 10"
                        weight={3}
                        opacity={0.7}
                      />
                    </>
                  )}
                </MapContainer>
              </div>

              {/* Status Sideboard Info */}
              <div className="flex flex-col justify-between bg-slate-55 dark:bg-slate-900 border border-slate-105 dark:border-slate-805 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-405">Incident Details</h4>
                  
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">PATIENT NAME</p>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{trackingAlert.user?.name || "Anonymous Patient"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-450">AMBULANCE FLEET</p>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-105">{trackingAlert.ambulance?.name || "Awaiting dispatch name"}</p>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{trackingAlert.ambulance?.vehicleNumber || "License Tag"}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-405">CURRENT POSITION</p>
                      {ambulanceLocations[trackingAlert._id] ? (
                        <p className="text-xs font-extrabold text-blue-500 animate-pulse">
                          {ambulanceLocations[trackingAlert._id].lat.toFixed(5)}, {ambulanceLocations[trackingAlert._id].lng.toFixed(5)}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400">Awaiting initial GPS ping</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/50 dark:border-slate-805/85">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-650 text-[10px] font-black uppercase tracking-widest border border-blue-505/20">
                    <SatelliteIcon className="h-3 w-3" strokeWidth={2} />
                    Live Signal Connecting
                  </div>
                </div>
              </div>

            </div>

            {/* MISSION CONTROL STATS */}
            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-808/85 pt-4">
              <div className="rounded-xl border border-slate-105 bg-slate-50/60 p-4 dark:border-slate-805 dark:bg-slate-900/60">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-405">Pickup Site</p>
                <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-205">Patient Residence</p>
              </div>
              <div className="rounded-xl border border-slate-105 bg-slate-55/60 p-4 dark:border-slate-805 dark:bg-slate-900/60">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-405">Ambulance Team</p>
                <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-205">{trackingAlert.ambulance?.name || "Dispatch team"}</p>
              </div>
              <div className="rounded-xl border border-slate-105 bg-slate-55/60 p-4 dark:border-slate-805 dark:bg-slate-900/60">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-405">Destination</p>
                <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-250">ER Main Ward</p>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-105 dark:border-slate-808/80">
              <button
                type="button"
                onClick={() => setTrackingAlert(null)}
                className="rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-200 dark:hover:bg-white px-5 py-2.5 text-sm font-bold text-white dark:text-slate-950 transition-colors shadow-sm"
              >
                Close Tracking Dashboard
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* FLOATING REAL-TIME SYSTEM NOTIFICATION POPUPS */}
      <EmergencyPopup notifications={popupNotifications} onDismiss={dismissPopup} />
    </div>
  );
}