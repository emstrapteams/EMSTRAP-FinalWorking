import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import {
  API_URL,
  getPoliceCases,
  updatePoliceCaseStatus,
  getErrorMessage,
} from "../../services/api";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminModal from "../../components/admin/AdminModal";
import { formatDate, getStatusBadgeClasses } from "../../components/admin/admin.utils";
import toast from "react-hot-toast";
import EmergencyPopup from "../../components/notifications/EmergencyPopup";

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
  { key: "ALL",                label: "Total Cases",   statKey: "total"      },
  { key: "PENDING",            label: "Pending",       statKey: "pending"    },
  { key: "AMBULANCE_ACCEPTED", label: "In Progress",   statKey: "inProgress" },
  { key: "COMPLETED",          label: "Resolved",      statKey: "resolved"   },
  { key: "CANCELLED",          label: "Cancelled",     statKey: "cancelled"  },
];

const shortRef = (id) => (id ? String(id).slice(-6).toUpperCase() : "------");

export default function PoliceDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [popupNotifications, setPopupNotifications] = useState([]);

  const dismissPopup = useCallback((id) => {
    setPopupNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

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

    const socketUrl = API_URL || window.location.origin;
    const socket = io(socketUrl, { withCredentials: true });
    socket.emit("join_police", {});

    socket.on("police_new_case", (data) => {
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

    return () => socket.close();
  }, []);

  const handleStatusChange = async (caseId, newStatus) => {
    try {
      const res = await updatePoliceCaseStatus(caseId, newStatus);
      if (res.success) {
        setCases((prev) =>
          prev.map((c) => (c._id === caseId ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      console.error("Failed to update case status", err);
    }
  };

  const filteredCases =
    statusFilter === "ALL"
      ? cases
      : cases.filter((c) => c.status === statusFilter);

  const stats = {
    total: cases.length,
    pending: cases.filter((c) => c.status === "PENDING").length,
    inProgress: cases.filter((c) => c.status === "AMBULANCE_ACCEPTED").length,
    resolved: cases.filter((c) => c.status === "COMPLETED").length,
    cancelled: cases.filter((c) => c.status === "CANCELLED").length,
  };

  const statValueByKey = {
    ALL: stats.total,
    PENDING: stats.pending,
    AMBULANCE_ACCEPTED: stats.inProgress,
    COMPLETED: stats.resolved,
    CANCELLED: stats.cancelled,
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
    Image: c.imageUrl || "N/A",
    "Reported At": formatDate(c.createdAt),
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
                className={`flex flex-col gap-2 rounded-2xl border p-5 text-left transition ${
                  isActive
                    ? "border-blue-100 bg-blue-50 dark:border-blue-400/20 dark:bg-blue-500/10"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20"
                }`}
              >
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {seg.label}
                </span>
                <span
                  className={`text-4xl font-bold ${
                    isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {statValueByKey[seg.key]}
                </span>
              </button>
            );
          })}
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
          <AdminDetailGrid data={getCaseDetails(selectedCase)} />
        </AdminModal>
      )}

      {/* Emergency Popup Notifications */}
      <EmergencyPopup notifications={popupNotifications} onDismiss={dismissPopup} />
    </>
  );
}