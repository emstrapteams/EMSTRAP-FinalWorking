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
import AdminLayout from "../../components/admin/AdminLayout";
import AdminStatCard from "../../components/admin/AdminStatCard";
import AdminSurface from "../../components/admin/AdminSurface";
import { getAdminStats, getErrorMessage, getOverviewStats } from "../../services/api";

const overviewItems = [
  {
    key: "users",
    title: "Users",
    accent: "bg-blue-500",
    helper: "Registered accounts",
    stroke: "#3b82f6",
  },
  {
    key: "bookings",
    title: "Bookings",
    accent: "bg-emerald-500",
    helper: "Ambulance bookings",
    stroke: "#10b981",
  },
  {
    key: "hospitals",
    title: "Hospitals",
    accent: "bg-cyan-500",
    helper: "Hospital records",
    stroke: "#06b6d4",
  },
  {
    key: "emergencies",
    title: "Emergencies",
    accent: "bg-red-500",
    helper: "Emergency requests",
    stroke: "#ef4444",
  },
  {
    key: "police",
    title: "Police",
    accent: "bg-purple-500",
    helper: "Police units",
    stroke: "#a855f7",
  },
];

const rangeOptions = [
  { label: "1D", value: "1D" },
  { label: "3D", value: "3D" },
  { label: "5D", value: "5D" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
];

const defaultStats = {
  users: 0,
  bookings: 0,
  hospitals: 0,
  emergencies: 0,
  police: 0,
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractOverviewStats = (payload) => ({
  users: toNumber(payload?.stats?.users ?? payload?.users),
  bookings: toNumber(payload?.stats?.bookings ?? payload?.bookings),
  hospitals: toNumber(payload?.stats?.hospitals ?? payload?.hospitals),
  emergencies: toNumber(payload?.stats?.emergencies ?? payload?.emergencies),
  police: toNumber(payload?.stats?.police ?? payload?.police),
});

const normalizeChartData = (payload) => {
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  return rows
    .map((row) => ({
      label: row?.label || "",
      users: toNumber(row?.users),
      bookings: toNumber(row?.bookings),
      hospitals: toNumber(row?.hospitals),
      emergencies: toNumber(row?.emergencies),
      police: toNumber(row?.police),
    }))
    .filter((row) => row.label);
};

const getLatestDataPoint = (rows) => rows[rows.length - 1] || defaultStats;

const chartShellClassName =
  "rounded-3xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-200/70 dark:from-slate-900 dark:to-slate-950 dark:ring-slate-800/80";

function MetricChart({ title, data, dataKey, stroke }) {
  return (
    <AdminSurface className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Trend for {title.toLowerCase()} across the selected range.
        </p>
      </div>

      <div className={chartShellClassName}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" opacity={0.35} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.10)",
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={title}
              stroke={stroke}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AdminSurface>
  );
}

export default function AdminDashboard() {
  const [selectedRange, setSelectedRange] = useState("1D");
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [overviewResponse, chartResponse] = await Promise.all([
          getOverviewStats(),
          getAdminStats(selectedRange),
        ]);

        if (ignore) {
          return;
        }

        const nextChartData = normalizeChartData(chartResponse);
        const nextStats = extractOverviewStats(overviewResponse);

        setChartData(nextChartData);
        setStats(
          Object.values(nextStats).some(Boolean) ? nextStats : getLatestDataPoint(nextChartData)
        );

        if (!nextChartData.length) {
          setError("No data");
        }
      } catch (requestError) {
        if (ignore) {
          return;
        }

        setChartData([]);
        setError(getErrorMessage(requestError, "Failed to load dashboard stats."));
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [selectedRange]);

  const hasData = chartData.length > 0;

  return (
    <AdminLayout
      title="Overview"
      description="Track users, bookings, hospitals, and emergencies with live backend analytics."
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {overviewItems.map((item) => (
          <AdminStatCard
            key={item.key}
            title={item.title}
            value={stats[item.key] || 0}
            accent={item.accent}
            helper={item.helper}
          />
        ))}
      </div>

      <AdminSurface className="mt-8 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Combined Overview</h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              One graph showing all admin metrics from the backend API.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => {
              const isActive = option.value === selectedRange;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedRange(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-900"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                  aria-pressed={isActive}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Loading...
            </div>
          ) : error && !hasData ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-sm font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : !hasData ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No data
            </div>
          ) : (
            <div className={chartShellClassName}>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" opacity={0.35} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "18px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 18px 40px rgba(15, 23, 42, 0.10)",
                    }}
                  />
                  <Legend />
                  {overviewItems.map((item) => (
                    <Line
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.title}
                      stroke={item.stroke}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {error && hasData ? (
            <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">{error}</p>
          ) : null}
        </div>
      </AdminSurface>

      {hasData ? (
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {overviewItems.map((item) => (
            <MetricChart
              key={item.key}
              title={item.title}
              data={chartData}
              dataKey={item.key}
              stroke={item.stroke}
            />
          ))}
        </div>
      ) : null}
    </AdminLayout>
  );
}
