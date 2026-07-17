import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import {
  API_URL,
  getPoliceCases,
  updatePoliceCaseStatus,
  getErrorMessage,
  getPoliceChartStats,
  getPoliceOverviewStats,
} from "../../services/api";
import {
  Users,
  Building2,
  TriangleAlert,
} from "lucide-react";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminModal from "../../components/admin/AdminModal";
import { formatDate, getStatusBadgeClasses } from "../../components/admin/admin.utils";
import toast from "react-hot-toast";
import EmergencyPopup from "../../components/notifications/EmergencyPopup";
import EvidenceImageViewer from "../../components/common/EvidenceImageViewer";
import LiveTrackingMap from "../../components/map/LiveTrackingMap";
import { Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AdminSurface from "../../components/admin/AdminSurface";

const getGoogleMapsUrl = (item, ambulanceLocations) => {
  if (!item) return "";
  const liveLoc = ambulanceLocations?.[item._id];
  const startLat = liveLoc?.lat || item.ambulance?.currentLocation?.latitude || item.ambulance?.latitude;
  const startLng = liveLoc?.lng || item.ambulance?.currentLocation?.longitude || item.ambulance?.longitude;
  const isAfterPickup = item.status === "IN_PROGRESS" || ["EN_ROUTE_TO_HOSPITAL", "COMPLETED"].includes(item.status);
  let dest = "";
  if (isAfterPickup) {
    if (item.hospital) {
      dest = encodeURIComponent(`${item.hospital.name || ""}, ${item.hospital.address || ""}, ${item.hospital.city || ""}`);
    } else if (item.dropoffLocation) {
      const lat = item.dropoffLocation.latitude;
      const lng = item.dropoffLocation.longitude;
      dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(item.dropoffLocation.address || "");
    }
  } else {
    const lat = item.pickupLocation?.latitude || item.location?.latitude || item.pickupLocation?.lat || item.location?.lat;
    const lng = item.pickupLocation?.longitude || item.location?.longitude || item.pickupLocation?.lng || item.location?.lng;
    dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(item.pickupLocation?.address || item.location?.address || "");
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${startLat || ""},${startLng || ""}&destination=${dest}&travelmode=driving`;
};
const STATUS_LABELS = {
  PENDING: "Pending",
  AMBULANCE_ACCEPTED: "In Progress",
  COMPLETED: "Resolved",
  CANCELLED: "Cancelled",
};

const STATUS_PILL = {
  PENDING:
    "bg-yellow-50 text-yellow-700 border border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-400/30",
  AMBULANCE_ACCEPTED:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/30",
  COMPLETED:
    "bg-green-50 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-400/30",
  CANCELLED:
    "bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-400/30",
};

const STAT_SEGMENTS = [
  { key: "ALL", label: "Total Cases", statKey: "total" },
  { key: "PENDING", label: "Pending", statKey: "pending" },
  { key: "AMBULANCE_ACCEPTED", label: "In Progress", statKey: "inProgress" },
  { key: "COMPLETED", label: "Resolved", statKey: "resolved" },
  { key: "CANCELLED", label: "Cancelled", statKey: "cancelled" },
];

const shortRef = (id) => (id ? String(id).slice(-6).toUpperCase() : "------");
const overviewItems = [
  { key: "users", title: "Users", accent: "from-indigo-500 to-violet-600", iconBg: "bg-indigo-100 dark:bg-indigo-900/40", iconColor: "text-indigo-600", helper: "Registered accounts", textColor: "text-slate-900", stroke: "#6366f1" },
  { key: "hospitals", title: "Hospitals", accent: "from-blue-500 to-cyan-500", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600", helper: "Hospital records", textColor: "text-slate-900", stroke: "#3b82f6" },
  { key: "emergencies", title: "Emergencies", accent: "from-red-500 to-rose-600", iconBg: "bg-red-100 dark:bg-red-900/40", iconColor: "text-red-600", helper: "Emergency requests", textColor: "text-slate-900", stroke: "#ef4444" },
];
const rangeOptions = ["1D", "1M", "3M", "6M", "1Y"];

const defaultStats = {
  users: 0,
  hospitals: 0,
  emergencies: 0,
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const extractOverviewStats = (p) => ({
  users: toNumber(p?.stats?.users ?? p?.users),
  hospitals: toNumber(p?.stats?.hospitals ?? p?.hospitals),
  emergencies: toNumber(p?.stats?.emergencies ?? p?.emergencies),
});

const normalizeChartData = (p) =>
  (Array.isArray(p?.data) ? p.data : [])
    .map((r) => ({
      label: r?.label || "",
      users: toNumber(r?.users),
      hospitals: toNumber(r?.hospitals),
      emergencies: toNumber(r?.emergencies),
    }))
    .filter((r) => r.label);



const tooltipStyle = {
  contentStyle: {
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 32px rgba(15, 23, 42, 0.08)",
    fontSize: "12px",
  },
};

const icons = {
  users: <Users className="h-4 w-4" />,
  hospitals: <Building2 className="h-4 w-4" />,
  emergencies: <TriangleAlert className="h-4 w-4" />,
};

function MetricChart({ title, data, dataKey, stroke, iconBg, iconColor }) {
  return (
    <AdminSurface className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-8 w-8 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icons[dataKey]}
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Trend over selected range</p>
        </div>
      </div>
      <div className="rounded-2xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 p-3">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={20} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey={dataKey} name={title} stroke={stroke} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: stroke }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AdminSurface>
  );
}

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

function FitBounds({ cases, ambulanceLocations }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    cases.filter(c => !["COMPLETED", "CANCELLED"].includes(c.status)).forEach(c => {
      const ambLoc = ambulanceLocations[c._id];
      const patLoc = c.location;
      const ambLat = ambLoc?.lat || c.ambulance?.currentLocation?.latitude;
      const ambLng = ambLoc?.lng || c.ambulance?.currentLocation?.longitude;
      const patLat = patLoc?.lat || patLoc?.latitude;
      const patLng = patLoc?.lng || patLoc?.longitude;

      if (ambLat && ambLng) points.push([ambLat, ambLng]);
      if (patLat && patLng) points.push([patLat, patLng]);
    });

    if (points.length >= 2) {
      map.fitBounds(points, { padding: [50, 50] });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [map, cases, ambulanceLocations]);
  return null;
}

export default function PoliceDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRange, setSelectedRange] = useState("1D");
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [popupNotifications, setPopupNotifications] = useState([]);

  // Sockets & Location states
  const [ambulanceLocations, setAmbulanceLocations] = useState({});
  const [trackingCase, setTrackingCase] = useState(null);
  const socketRef = useRef(null);

  const alarmRef = useRef(new Audio("/sounds/emergency-alert.mp3"));
  const alarmTimeoutRef = useRef(null);
  const dismissPopup = useCallback((id) => {
    setPopupNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    alarmRef.current.loop = false;
    alarmRef.current.volume = 1;
  }, []);

  const startPoliceAlert = async () => {
    try {
      if (alarmTimeoutRef.current) {
        clearTimeout(alarmTimeoutRef.current);
      }

      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;

      await alarmRef.current.play();

      alarmTimeoutRef.current = setTimeout(() => {
        stopPoliceAlert();
      }, 7000);

    } catch (err) {
      console.log(err);
    }
  };

  const stopPoliceAlert = () => {
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }

    alarmRef.current.pause();
    alarmRef.current.currentTime = 0;
  };

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      try {
        const res = await getPoliceCases();
        if (res.success) setCases(res.cases || []);
        setError("");
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load cases"));
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const socketUrl = API_URL || window.location.origin;
    const socket = io(socketUrl, { withCredentials: true });
    socketRef.current = socket;
    socket.emit("join_police", {});

    socket.on("police_new_case", (data) => {

      if (data.hospitalSelected) {
        // Hospital was selected by driver — informational update only, no siren
        const hospitalName = data.request?.hospital?.name || "a hospital";
        if (Notification.permission === "granted") {
          new Notification("🏥 Hospital Selected", {
            body: `🚑 Driver selected ${hospitalName}`,
            icon: "/logo.png",
            requireInteraction: false,
          });
        }
      } else {
        // Brand new emergency — play siren + full notification
        startPoliceAlert();
        if (Notification.permission === "granted") {
          new Notification("🚓 New Emergency", {
            body: "A new emergency requires police assistance.",
            icon: "/logo.png",
            requireInteraction: true,
          });
        }
      }

      setCases((prev) => {
        if (prev.some((c) => c._id === data.request._id)) {
          if (data.hospitalSelected) {
            return prev.map((c) => c._id === data.request._id ? { ...c, ...data.request } : c);
          }
          return prev;
        }
        return [data.request, ...prev];
      });
      setPopupNotifications((prev) => [
        ...prev,
        { id: `${data.request._id}-${Date.now()}`, type: "police", request: data.request, hospitalSelected: data.hospitalSelected }
      ]);
    });

    socket.on("police_alert", (data) => {
      setCases((prev) =>
        prev.map((c) =>
          c._id === data.request._id ? { ...c, ...data.request } : c
        )
      );
    });

    socket.on("ambulance_location", (data) => {
      setAmbulanceLocations((prev) => ({
        ...prev,
        [data.requestId]: { lat: data.lat || data.latitude, lng: data.lng || data.longitude },
      }));
    });

    return () => {
      stopPoliceAlert();
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || cases.length === 0) return;
    cases.forEach(c => {
      if (c.status !== "COMPLETED" && c.status !== "CANCELLED") {
        socketRef.current.emit("track_request", { requestId: c._id });
      }
    });
  }, [cases]);

  const handleLiveTrackClick = (c) => {
    setTrackingCase(c);
    if (socketRef.current) {
      socketRef.current.emit("track_request", { requestId: c._id });
    }
  };

  const handleCloseTracking = () => {
    setTrackingCase(null);
  };

  const handleStatusChange = async (caseId, newStatus) => {
    try {
      const res = await updatePoliceCaseStatus(caseId, newStatus);
      if (res.success) {
        stopPoliceAlert();
        setCases((prev) =>
          prev.map((c) => (c._id === caseId ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      console.error("Failed to update case status", err);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadGraphs = async () => {
      setGraphLoading(true);
      setGraphError("");

      try {
        const [overviewRes, chartRes] = await Promise.all([
          getPoliceOverviewStats(),
          getPoliceChartStats(selectedRange),
        ]);

        if (ignore) return;

        const nextChart = normalizeChartData(chartRes);
        const nextStats = extractOverviewStats(overviewRes);

        setChartData(nextChart);

        setStats(
          Object.values(nextStats).some(Boolean)
            ? nextStats
            : (nextChart[nextChart.length - 1] || defaultStats)
        );

        if (!nextChart.length) {
          setGraphError("No data available");
        }
      } catch (err) {
        if (ignore) return;

        setChartData([]);
        setGraphError(getErrorMessage(err, "Failed to load dashboard graphs."));
      } finally {
        if (!ignore) {
          setGraphLoading(false);
        }
      }
    };

    loadGraphs();

    return () => {
      ignore = true;
    };
  }, [selectedRange]);

  const hasData = chartData.length > 0;

  const filteredCases =
    statusFilter === "ALL"
      ? cases
      : cases.filter((c) => c.status === statusFilter);

  const caseStats = {
    total: cases.length,
    pending: cases.filter((c) => c.status === "PENDING").length,
    inProgress: cases.filter((c) => c.status === "AMBULANCE_ACCEPTED").length,
    resolved: cases.filter((c) => c.status === "COMPLETED").length,
    cancelled: cases.filter((c) => c.status === "CANCELLED").length,
  };

  const statValueByKey = {
    ALL: caseStats.total,
    PENDING: caseStats.pending,
    AMBULANCE_ACCEPTED: caseStats.inProgress,
    COMPLETED: caseStats.resolved,
    CANCELLED: caseStats.cancelled,
  };

  const getCaseDetails = (c) => ({
    Status: STATUS_LABELS[c.status] || c.status,
    "Emergency Type": c.requestType || "EMERGENCY",
    City: c.user?.city || "N/A",
    Coordinates: c.location
      ? `${c.location.latitude}, ${c.location.longitude}`
      : "N/A",
    "Ambulance Driver": c.ambulance?.name || "Not assigned",
    "Ambulance Contact": c.ambulance?.mobile || "N/A",
    "Vehicle Number": c.ambulance?.vehicleNumber || "N/A",
    "Assigned Hospital": c.hospital?.name || "Pending Acceptance",
    "Hospital Location": c.hospital?.location || "N/A",

    "Reported At": formatDate(c.createdAt),
    "AI Prediction": c.aiAnalysis?.predictedClass || "N/A",

    "Severity": c.aiAnalysis?.severity || "N/A",

    "AI Confidence": c.aiAnalysis
      ? `${(c.aiAnalysis.confidence * 100).toFixed(1)}%`
      : "N/A",

    "Recommended Ambulance":
      c.aiAnalysis?.recommendedAmbulance || "N/A",
  });

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Police Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Track ambulances, monitor emergency requests and manage cases.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STAT_SEGMENTS.map((seg) => {
            const isActive = statusFilter === seg.key;
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => setStatusFilter(seg.key)}
                aria-pressed={isActive}
                className={`flex flex-col gap-2 rounded-2xl border p-5 text-left transition ${isActive
                  ? "border-blue-100 bg-blue-50 dark:border-blue-400/20 dark:bg-blue-500/10"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20"
                  }`}
              >
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"
                    }`}
                >
                  {seg.label}
                </span>
                <span
                  className={`text-4xl font-bold ${isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-900 dark:text-white"
                    }`}
                >
                  {statValueByKey[seg.key]}
                </span>
              </button>
            );
          })}
        </div>
        {/* Combined Overview */}
        <AdminSurface className="mt-6 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Combined Overview
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Users, Hospitals and Emergency trends
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {rangeOptions.map((opt) => {
                const active = opt === selectedRange;

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedRange(opt)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-all duration-150 ${active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                      }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {graphLoading ? (
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 p-12 text-center">
              <div className="h-8 w-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading chart...</p>
            </div>
          ) : graphError && !hasData ? (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-12 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                {graphError}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 p-3">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" opacity={0.5} />

                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip {...tooltipStyle} />

                  <Legend />

                  {overviewItems.map((item) => (
                    <Line
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.title}
                      stroke={item.stroke}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminSurface>
        {/* Individual Graphs */}
        {hasData && (
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {overviewItems.map((item) => (
              <MetricChart
                key={item.key}
                title={item.title}
                data={chartData}
                dataKey={item.key}
                stroke={item.stroke}
                iconBg={item.iconBg}
                iconColor={item.iconColor}
              />
            ))}
          </div>
        )}
        {/* Live Map Panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">Live Operations Map</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Real-time status of active cases and ambulance locations</p>
            </div>
          </div>

          <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 relative z-0">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <FitBounds cases={cases} ambulanceLocations={ambulanceLocations} />
              {cases.filter(c => !["COMPLETED", "CANCELLED"].includes(c.status)).map(c => {
                const ambLoc = ambulanceLocations[c._id];
                const patLoc = c.location;
                const ambLat = ambLoc?.lat || c.ambulance?.currentLocation?.latitude;
                const ambLng = ambLoc?.lng || c.ambulance?.currentLocation?.longitude;
                const patLat = patLoc?.lat || patLoc?.latitude;
                const patLng = patLoc?.lng || patLoc?.longitude;

                return (
                  <div key={c._id}>
                    {patLat && patLng && (
                      <Marker position={[patLat, patLng]} icon={patientIcon}>
                        <Popup>
                          <div className="p-1">
                            <p className="font-bold text-xs">Patient: {c.user?.name || "Anonymous"}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Status: {c.status}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {ambLat && ambLng && (
                      <Marker position={[ambLat, ambLng]} icon={ambulanceIcon}>
                        <Popup>
                          <div className="p-1">
                            <p className="font-bold text-xs">Ambulance: {c.ambulance?.name || "Unit"}</p>
                            <p className="text-[10px] text-gray-550 mt-0.5">Vehicle: {c.ambulance?.vehicleNumber}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </div>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Cases</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
                Your latest emergency case activity.
              </p>
            </div>
            {statusFilter !== "ALL" && (
              <button
                onClick={() => setStatusFilter("ALL")}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-400"
              >
                {STATUS_LABELS[statusFilter]} ✕
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400 dark:border-white/10 dark:bg-slate-900/40">
              Syncing dispatch feed…
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400 dark:border-white/10 dark:bg-slate-900/40">
              No cases found{statusFilter !== "ALL" ? ` with status "${STATUS_LABELS[statusFilter]}"` : ""}.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCases.map((c) => (
                <div
                  key={c._id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 sm:flex-row sm:items-start sm:justify-between"
                >
                  {/* Left: icon + info */}
                  <div className="flex flex-1 items-start gap-4">
                    {/* Ambulance icon box */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 13l1.5-5A2 2 0 0 1 6.4 6.5h11.2a2 2 0 0 1 1.9 1.5L21 13" />
                        <rect x="2.5" y="13" width="19" height="5.5" rx="1.2" />
                        <circle cx="7" cy="18.5" r="1.6" />
                        <circle cx="17" cy="18.5" r="1.6" />
                      </svg>
                    </div>

                    {/* Text */}
                    <div className="min-w-0">
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {c.requestType || "Emergency"} Case
                      </p>
                      {c.aiAnalysis && (
                        <div className="mt-2 flex flex-wrap gap-2">

                          <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-bold">
                            {c.aiAnalysis.predictedClass?.toUpperCase()}
                          </span>

                          <span className="rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-xs font-bold">
                            {c.aiAnalysis.severity}
                          </span>

                          <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-bold">
                            {(c.aiAnalysis.confidence * 100).toFixed(1)}%
                          </span>

                        </div>
                      )}
                      <div className="mt-1 flex items-start gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                        <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="leading-snug">
                          {c.location
                            ? `${c.location.latitude?.toFixed(4)}, ${c.location.longitude?.toFixed(4)}`
                            : "Location unavailable"}
                          {c.user?.city ? ` · ${c.user.city}` : ""}
                        </span>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                        #{shortRef(c._id)} · {formatDate(c.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_PILL[c.status] || STATUS_PILL.PENDING}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedCase(c)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-white/15 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-white/10"
                      >
                        Details
                      </button>
                      {c.ambulance && c.status !== "COMPLETED" && c.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleLiveTrackClick(c)}
                          className="rounded-lg border border-blue-200 bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-100 transition dark:border-blue-800/40 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          Live Track
                        </button>
                      )}
                      {c.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleStatusChange(c._id, "COMPLETED")}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <AdminModal
          title="Case Details"
          subtitle="Full emergency case information"
          onClose={() => setSelectedCase(null)}
        >
          <div className="mb-6">
            <EvidenceImageViewer
              mainImage={selectedCase.imageUrl}
              evidence={selectedCase.evidence || []}
            />
          </div>
          <AdminDetailGrid data={getCaseDetails(selectedCase)} />
          {selectedCase.ambulance && (
            <div className="mt-6 flex justify-end gap-3">
              <a
                href={getGoogleMapsUrl(selectedCase, ambulanceLocations)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                <Navigation className="h-4 w-4" />
                Google Maps Navigation
              </a>
            </div>
          )}
        </AdminModal>
      )}

      {/* Live tracking modal for police */}
      {trackingCase && (
        <AdminModal
          title="Dispatch Mission Control"
          subtitle={`Route tracking for ${trackingCase.user?.name || "Patient Incident"}`}
          onClose={handleCloseTracking}
        >
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 h-[400px] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative z-0">
                <LiveTrackingMap
                  userLocation={trackingCase.location ? { lat: trackingCase.location.latitude, lng: trackingCase.location.longitude } : null}
                  driverLocation={
                    ambulanceLocations[trackingCase._id]
                      ? { lat: ambulanceLocations[trackingCase._id].lat, lng: ambulanceLocations[trackingCase._id].lng }
                      : trackingCase.ambulance?.currentLocation
                        ? { lat: trackingCase.ambulance.currentLocation.latitude, lng: trackingCase.ambulance.currentLocation.longitude }
                        : null
                  }
                  height="100%"
                />
              </div>

              <div className="flex flex-col justify-between bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.25em] text-gray-405">Incident Details</h4>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400">PATIENT NAME</p>
                      <p className="text-sm font-extrabold text-gray-800 dark:text-gray-100">{trackingCase.user?.name || "Anonymous Patient"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-450">AMBULANCE FLEET</p>
                      <p className="text-sm font-extrabold text-gray-800 dark:text-gray-105">{trackingCase.ambulance?.name || "Awaiting dispatch name"}</p>
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{trackingCase.ambulance?.vehicleNumber || "License Tag"}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-405">CURRENT POSITION</p>
                      {ambulanceLocations[trackingCase._id] ? (
                        <p className="text-xs font-extrabold text-blue-500 animate-pulse">
                          {ambulanceLocations[trackingCase._id].lat.toFixed(5)}, {ambulanceLocations[trackingCase._id].lng.toFixed(5)}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-gray-400">Awaiting initial GPS ping</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-650 text-[10px] font-black uppercase tracking-widest border border-blue-505/20">
                    Live Signal Connecting
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-808/85 pt-4">
              <div className="rounded-xl border border-gray-105 bg-gray-50/60 p-4 dark:border-gray-805 dark:bg-gray-900/60">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-405">Incident Type</p>
                <p className="mt-1 text-sm font-extrabold text-gray-800 dark:text-gray-205">{trackingCase.requestType || "Emergency"}</p>
              </div>
              <div className="rounded-xl border border-gray-105 bg-gray-55/60 p-4 dark:border-gray-805 dark:bg-gray-900/60">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-405">Ambulance Team</p>
                <p className="mt-1 text-sm font-extrabold text-gray-800 dark:text-gray-205">{trackingCase.ambulance?.name || "Dispatch team"}</p>
              </div>
              <div className="rounded-xl border border-gray-105 bg-gray-55/60 p-4 dark:border-gray-805 dark:bg-gray-900/60">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-405">Destination</p>
                <p className="mt-1 text-sm font-extrabold text-gray-800 dark:text-gray-250">{trackingCase.hospital?.name || "Awaiting Assignment"}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-105 dark:border-gray-808/80">
              <a
                href={getGoogleMapsUrl(trackingCase, ambulanceLocations)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                <Navigation className="h-4 w-4" />
                Google Maps Navigation
              </a>
              <button
                type="button"
                onClick={handleCloseTracking}
                className="rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-200 dark:hover:bg-white px-5 py-2.5 text-sm font-bold text-white dark:text-slate-950 transition-colors shadow-sm"
              >
                Close Tracking Dashboard
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Emergency Popup Notifications */}
      <EmergencyPopup notifications={popupNotifications} onDismiss={dismissPopup} />
    </>
  );
}