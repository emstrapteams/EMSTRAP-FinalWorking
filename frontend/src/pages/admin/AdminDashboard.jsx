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
import { getAdminStats, getErrorMessage, getOverviewStats } from "../../services/api";

// ─── Config ───────────────────────────────────────────────────────────────────

const overviewItems = [
  { key: "users",       title: "Users",       accent: "from-indigo-500 to-violet-600",  iconBg: "bg-indigo-100 dark:bg-indigo-900/40", iconColor: "text-indigo-600", helper: "Registered accounts", textColor: "text-slate-900", stroke: "#6366f1" },
  { key: "bookings",    title: " Ambulance Bookings",    accent: "from-emerald-400 to-teal-500",   iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600", helper: "Ambulance bookings", textColor: "text-slate-900", stroke: "#10b981" },
  { key: "hospitals",   title: "Hospitals",   accent: "from-blue-500 to-cyan-500",      iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600", helper: "Hospital records", textColor: "text-slate-900", stroke: "#3b82f6" },
  { key: "emergencies", title: "Emergencies", accent: "from-red-500 to-rose-600",       iconBg: "bg-red-100 dark:bg-red-900/40", iconColor: "text-red-600", helper: "Emergency requests", textColor: "text-slate-900", stroke: "#ef4444" },
  { key: "police",      title: "Police",      accent: "from-violet-500 to-purple-700",  iconBg: "bg-violet-100 dark:bg-violet-900/40", iconColor: "text-purple-600", helper: "Police units", textColor: "text-slate-900", stroke: "#8b5cf6" },
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
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl ${item.iconBg} flex items-center justify-center ${item.iconColor}`}>
          {icons[item.key]}
        </div>
        <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${item.accent} px-2.5 py-0.5 text-[10px] font-black text-white uppercase tracking-wide`}>
          Live
        </span>
      </div>
      <div>
        <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">{item.helper}</p>
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

export default function AdminDashboard() {
  const [selectedRange, setSelectedRange] = useState("1D");
  const [chartData, setChartData]         = useState([]);
  const [stats, setStats]                 = useState(defaultStats);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [overviewRes, chartRes] = await Promise.all([
          getOverviewStats(),
          getAdminStats(selectedRange),
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