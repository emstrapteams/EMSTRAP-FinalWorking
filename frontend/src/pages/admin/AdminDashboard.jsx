import { useEffect, useState } from "react";
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
import AdminAccidentHeatmap from "../../components/admin/AdminAccidentHeatmap";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminStatCard from "../../components/admin/AdminStatCard";
import AdminSurface from "../../components/admin/AdminSurface";
import EvidenceImageViewer from "../../components/common/EvidenceImageViewer";
import {
  getAdminStats,
  getOverviewStats,
  getAIStats,
  getErrorMessage,
  getAllEmergencies,
  getAllAdminBookings,
  API_URL,
} from "../../services/api";
import AIEmergencyPanel from "../../components/admin/AIEmergencyPanel";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { io } from "socket.io-client";
// ─── Config ───────────────────────────────────────────────────────────────────

const overviewItems = [
  { key: "users",       title: "Users",       accent: "from-indigo-500 to-violet-600",  iconBg: "bg-indigo-100 dark:bg-indigo-900/40", iconColor: "text-indigo-600", helper: "Registered accounts", textColor: "text-slate-900", stroke: "#6366f1" },
  { key: "bookings",    title: " Ambulance Bookings",    accent: "from-emerald-400 to-teal-500",   iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600", helper: "Ambulance bookings", textColor: "text-slate-900", stroke: "#10b981" },
  { key: "hospitals",   title: "Hospitals",   accent: "from-blue-500 to-cyan-500",      iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600", helper: "Hospital records", textColor: "text-slate-900", stroke: "#3b82f6" },
  { key: "emergencies", title: "Emergencies", accent: "from-red-500 to-rose-600",       iconBg: "bg-red-100 dark:bg-red-900/40", iconColor: "text-red-600", helper: "Emergency requests", textColor: "text-slate-900", stroke: "#ef4444" },
  { key: "police",      title: "Police",      accent: "from-violet-500 to-purple-700",  iconBg: "bg-violet-100 dark:bg-violet-900/40", iconColor: "text-purple-600", helper: "Police units", textColor: "text-slate-900", stroke: "#8b5cf6" },
];
const aiItems = [
  {
    key: "fires",
    title: "Fires",
    accent: "from-red-500 to-red-700",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    iconColor: "text-red-600",
    helper: "Fire emergencies",
  },
  {
    key: "accidents",
    title: "Accidents",
    accent: "from-orange-500 to-orange-700",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    iconColor: "text-orange-600",
    helper: "Road accidents",
  },
  {
    key: "nonEmergency",
    title: "Non Emergency",
    accent: "from-green-500 to-green-700",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    iconColor: "text-green-600",
    helper: "Low priority cases",
  },
  {
    key: "critical",
    title: "Critical",
    accent: "from-rose-500 to-red-600",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    iconColor: "text-rose-600",
    helper: "Critical emergencies",
  },
  {
    key: "averageConfidence",
    title: "AI Confidence",
    accent: "from-indigo-500 to-violet-600",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    iconColor: "text-indigo-600",
    helper: "Average prediction confidence",
  },
];
const rangeOptions = ["1D", "1M", "3M", "6M", "1Y"];

const defaultStats = { users: 0, bookings: 0, hospitals: 0, emergencies: 0, police: 0 };

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const extractOverviewStats = (p) => ({
  users:       toNumber(p?.stats?.users       ?? p?.users),
  bookings:    toNumber(p?.stats?.bookings    ?? p?.bookings),
  hospitals:   toNumber(p?.stats?.hospitals   ?? p?.hospitals),
  emergencies: toNumber(p?.stats?.emergencies ?? p?.emergencies),
  police:      toNumber(p?.stats?.police      ?? p?.police),
});

const normalizeChartData = (p) =>
  (Array.isArray(p?.data) ? p.data : [])
    .map((r) => ({ label: r?.label || "", users: toNumber(r?.users), bookings: toNumber(r?.bookings), hospitals: toNumber(r?.hospitals), emergencies: toNumber(r?.emergencies), police: toNumber(r?.police) }))
    .filter((r) => r.label);

// ─── Icons ────────────────────────────────────────────────────────────────────
// Clean single-color line icons (thin stroke, minimal geometry) — matches the
// "Apple SF Regular" line-icon style: simple shapes, no fills, rounded joins.

const icons = {
  users: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8.5" cy="7.5" r="3" strokeLinecap="round" />
      <path d="M2.5 19c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="9" r="2.4" strokeLinecap="round" />
      <path d="M15.5 13.3c2.6.5 4.5 2.3 5 4.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bookings: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2.5 15.5V9.8a1 1 0 0 1 1-1h8.7v6.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.2 11h4.6l2.7 2.9v1.6h-7.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 15.5h1.3" strokeLinecap="round" />
      <path d="M19.5 15.5h1v-2.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="16.3" r="1.6" />
      <circle cx="16.3" cy="16.3" r="1.6" />
      <path d="M6.4 6.6h2.6M7.7 5.3v2.6" strokeLinecap="round" />
    </svg>
  ),
  hospitals: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4.5" y="3.5" width="15" height="17" rx="1.4" />
      <path d="M12 8v6M9 11h6" strokeLinecap="round" />
      <path d="M9 20.5v-3.2h6v3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  emergencies: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M11.3 4.2a1 1 0 0 1 1.4 0l7.7 12.8a1 1 0 0 1-.86 1.5H3.46a1 1 0 0 1-.86-1.5Z" strokeLinejoin="round" />
      <path d="M12 9.8v3.6" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  ),
  police: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3.2l6.5 2.6v4.6c0 4.6-3.1 7.9-6.5 9.4-3.4-1.5-6.5-4.8-6.5-9.4V5.8Z" strokeLinejoin="round" />
      <path d="M9.3 12.3l1.9 1.9 3.6-3.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ item, value }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-3 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-100/80 dark:hover:shadow-black/20">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center text-black dark:text-white shrink-0">
          {icons[item.key]}
        </div>

        <div>
          <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
            {value.toLocaleString()}
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {item.title}
          </p>
        </div>
      </div>
    </div>
  );
}
// ─── Chart Shell ──────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 32px rgba(15, 23, 42, 0.08)",
    fontSize: "12px",
  },
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

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

function FitBounds({ activeEmergencies, activeBookings, ambulanceLocations, patientLocations }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    
    activeEmergencies.forEach(e => {
      const ambLoc = ambulanceLocations[e._id];
      const patLoc = patientLocations[e._id] || e.location;
      const ambLat = ambLoc?.lat || e.ambulance?.currentLocation?.latitude;
      const ambLng = ambLoc?.lng || e.ambulance?.currentLocation?.longitude;
      const patLat = patLoc?.lat || patLoc?.latitude;
      const patLng = patLoc?.lng || patLoc?.longitude;
      
      if (ambLat && ambLng) points.push([ambLat, ambLng]);
      if (patLat && patLng) points.push([patLat, patLng]);
    });

    activeBookings.forEach(b => {
      const ambLoc = ambulanceLocations[b._id];
      const patLoc = patientLocations[b._id] || b.pickupLocation;
      const ambLat = ambLoc?.lat || b.ambulance?.currentLocation?.latitude;
      const ambLng = ambLoc?.lng || b.ambulance?.currentLocation?.longitude;
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
  }, [map, activeEmergencies, activeBookings, ambulanceLocations, patientLocations]);
  return null;
}

export default function AdminDashboard() {
  const [selectedRange, setSelectedRange] = useState("1D");
  const [chartData, setChartData]         = useState([]);
  const [stats, setStats]                 = useState(defaultStats);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [ambulanceLocations, setAmbulanceLocations] = useState({});
  const [patientLocations, setPatientLocations] = useState({});

  useEffect(() => {
    const socketUrl = API_URL || window.location.origin;
    const socket = io(socketUrl, { withCredentials: true });

    socket.on("ambulance_location", (data) => {
      setAmbulanceLocations((prev) => ({
        ...prev,
        [data.requestId]: { lat: data.lat || data.latitude, lng: data.lng || data.longitude },
      }));
    });

    socket.on("user_location", (data) => {
      setPatientLocations((prev) => ({
        ...prev,
        [data.requestId]: { lat: data.lat || data.latitude, lng: data.lng || data.longitude },
      }));
    });

    socket.emit("join_police", {});
    
    socket.on("police_new_case", (data) => {
      if (data.request) {
        setActiveEmergencies((prev) => {
          if (prev.some(e => e._id === data.request._id)) {
            // Update existing entry (e.g. hospital now assigned)
            return prev.map(e => e._id === data.request._id ? { ...e, ...data.request } : e);
          }
          return [data.request, ...prev];
        });
        socket.emit("track_request", { requestId: data.request._id });
      }
    });

    socket.on("police_alert", (data) => {
      if (data.request) {
        setActiveEmergencies((prev) =>
          prev.map(e => e._id === data.request._id ? { ...e, ...data.request } : e)
        );
      }
    });

    const fetchActiveData = async () => {
      try {
        const emRes = await getAllEmergencies();
        const bkRes = await getAllAdminBookings();
        
        const activeEms = (emRes?.emergencies || []).filter(e => !["COMPLETED", "CANCELLED"].includes(e.status));
        const activeBks = (bkRes?.bookings || bkRes?.data || []).filter(b => !["COMPLETED", "CANCELLED"].includes(b.status));
        
        setActiveEmergencies(activeEms);
        setActiveBookings(activeBks);
        
        activeEms.forEach(e => socket.emit("track_request", { requestId: e._id }));
        activeBks.forEach(b => socket.emit("track_request", { requestId: b._id }));
      } catch (err) {
        console.error("Failed to load active cases for admin map", err);
      }
    };
    
    fetchActiveData();

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [overviewRes, chartRes, aiRes] = await Promise.all([
          getOverviewStats(),
          getAdminStats(selectedRange),
          getAIStats(),
        ]);
        if (ignore) return;

        const nextChart = normalizeChartData(chartRes);
        const nextStats = extractOverviewStats(overviewRes);
        setChartData(nextChart);
        setStats(Object.values(nextStats).some(Boolean) ? nextStats : (nextChart[nextChart.length - 1] || defaultStats));

        if (!nextChart.length) setError("No data");
      } catch (err) {
        if (ignore) return;
        setChartData([]);
        setError(getErrorMessage(err, "Failed to load dashboard stats."));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => { ignore = true; };
  }, [selectedRange]);

  const hasData = chartData.length > 0;

  return (
    <AdminLayout
      title="Overview"
      description="Track users, bookings, hospitals, and emergencies with live analytics."
    >
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {overviewItems.map((item) => (
          <StatCard key={item.key} item={item} value={stats[item.key] || 0} />
        ))}
      </div>
      <AIEmergencyPanel />

      {/* Live Map Panel */}
      <AdminSurface className="mt-6 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white">Live Operations Map</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Real-time GPS tracking for active emergencies and booking routes</p>
          </div>
        </div>

        <div className="h-[400px] rounded-xl overflow-hidden border border-gray-150 dark:border-gray-800 relative z-0">
          <MapContainer 
            center={[20.5937, 78.9629]} 
            zoom={5} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <FitBounds 
              activeEmergencies={activeEmergencies} 
              activeBookings={activeBookings} 
              ambulanceLocations={ambulanceLocations} 
              patientLocations={patientLocations} 
            />
            
            {activeEmergencies.map(e => {
              const ambLoc = ambulanceLocations[e._id];
              const patLoc = patientLocations[e._id] || e.location;
              const ambLat = ambLoc?.lat || e.ambulance?.currentLocation?.latitude;
              const ambLng = ambLoc?.lng || e.ambulance?.currentLocation?.longitude;
              const patLat = patLoc?.lat || patLoc?.latitude;
              const patLng = patLoc?.lng || patLoc?.longitude;

              return (
                <div key={e._id}>
                  {patLat && patLng && (
                    <Marker position={[patLat, patLng]} icon={patientIcon}>
                      <Popup>
                        <div className="p-1">
                          <p className="font-bold text-xs">Emergency Patient: {e.user?.name || "Anonymous"}</p>
                          <p className="text-[10px] text-gray-550 mt-0.5">Severity: {e.aiAnalysis?.severity || "N/A"}</p>
                          <p className="text-[10px] text-gray-500">Status: {e.status}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {ambLat && ambLng && (
                    <Marker position={[ambLat, ambLng]} icon={ambulanceIcon}>
                      <Popup>
                        <div className="p-1">
                          <p className="font-bold text-xs">Emergency Ambulance: {e.ambulance?.name || "Unit"}</p>
                          <p className="text-[10px] text-gray-550 mt-0.5">Vehicle: {e.ambulance?.vehicleNumber}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </div>
              );
            })}

            {activeBookings.map(b => {
              const ambLoc = ambulanceLocations[b._id];
              const patLoc = patientLocations[b._id] || b.pickupLocation;
              const ambLat = ambLoc?.lat || b.ambulance?.currentLocation?.latitude;
              const ambLng = ambLoc?.lng || b.ambulance?.currentLocation?.longitude;
              const patLat = patLoc?.lat || patLoc?.latitude;
              const patLng = patLoc?.lng || patLoc?.longitude;

              return (
                <div key={b._id}>
                  {patLat && patLng && (
                    <Marker position={[patLat, patLng]} icon={patientIcon}>
                      <Popup>
                        <div className="p-1">
                          <p className="font-bold text-xs">Booking Pickup: {b.user?.name || "User"}</p>
                          <p className="text-[10px] text-gray-550 mt-0.5">Address: {b.pickupLocation?.address}</p>
                          <p className="text-[10px] text-gray-500">Status: {b.status}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {ambLat && ambLng && (
                    <Marker position={[ambLat, ambLng]} icon={ambulanceIcon}>
                      <Popup>
                        <div className="p-1">
                          <p className="font-bold text-xs">Booking Ambulance: {b.ambulance?.name || "Unit"}</p>
                          <p className="text-[10px] text-gray-550 mt-0.5">Vehicle: {b.ambulance?.vehicleNumber}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </div>
              );
            })}
          </MapContainer>
        </div>
      </AdminSurface>

      {/* Combined chart */}
      <AdminSurface className="mt-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white">Combined Overview</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">All admin metrics in one view</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {rangeOptions.map((opt) => {
              const active = opt === selectedRange;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedRange(opt)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-all duration-150 ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 dark:shadow-indigo-900/40"
                      : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300"
                  }`}
                  aria-pressed={active}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 p-12 text-center">
            <div className="h-8 w-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading chart data…</p>
          </div>
        ) : error && !hasData ? (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-12 text-center">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : !hasData ? (
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 p-12 text-center">
            <p className="text-sm text-gray-400">No data available for this range.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 p-3">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                {overviewItems.map((item) => (
                  <Line key={item.key} type="monotone" dataKey={item.key} name={item.title} stroke={item.stroke} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {error && hasData && (
          <p className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400">{error}</p>
        )}
      </AdminSurface>

      {/* Individual metric charts */}
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
          {/* Fills the empty slot left by the odd number of metric charts above */}
          <AdminAccidentHeatmap />
        </div>
      )}
    </AdminLayout>
  );
}