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

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  AMBULANCE_ACCEPTED: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

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

  // Fetch cases on mount + connect socket for live updates
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

    // Socket: join police room for real-time new cases
    const socketUrl = API_URL || window.location.origin;
    const socket = io(socketUrl, { withCredentials: true });
    socket.emit("join_police", {});

    socket.on("police_new_case", (data) => {
      setCases((prev) => {
        // Avoid duplicates
        if (prev.some((c) => c._id === data.request._id)) {
          // Update if hospital was selected
          if (data.hospitalSelected) {
            return prev.map((c) => c._id === data.request._id ? { ...c, ...data.request } : c);
          }
          return prev;
        }
        return [data.request, ...prev];
      });
      // Show rich in-app popup
      setPopupNotifications((prev) => [
        ...prev,
        { id: `${data.request._id}-${Date.now()}`, type: "police", request: data.request, hospitalSelected: data.hospitalSelected }
      ]);
    });

    // When ambulance accepts, update the case status in real-time
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
    "Created At": formatDate(c.createdAt),
  });

  return (
    <>
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col items-start gap-6 p-4">
      {/* Header */}<p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">
        Police Dashboard
      </p>


      {/* Stats Cards */}
      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Total Cases", stats.total, "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"],
          ["Pending", stats.pending, "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-300"],
          ["In Progress", stats.inProgress, "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300"],
          ["Resolved", stats.resolved, "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300"],
        ].map(([label, value, classes]) => (
          <div
            key={label}
            className={`rounded-2xl border p-5 shadow-sm ${classes}`}
          >
            <p className="text-sm font-semibold opacity-70">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {/* Cases Section */}
      <div className="w-full rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-6 shadow-xl shadow-gray-200 dark:shadow-black/20">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📋 Emergency Cases
          </h2>
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {["ALL", "PENDING", "AMBULANCE_ACCEPTED", "COMPLETED", "CANCELLED"].map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${statusFilter === filter
                    ? "bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950"
                    : "border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-500 dark:hover:border-slate-500 hover:text-gray-900 dark:hover:text-white"
                    }`}
                >
                  {filter === "ALL"
                    ? "All"
                    : filter === "AMBULANCE_ACCEPTED"
                      ? "In Progress"
                      : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-10 text-center text-gray-500 dark:text-slate-500">
            Loading cases...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-10 text-center text-gray-500 dark:text-slate-500">
            No cases found{statusFilter !== "ALL" ? ` with status "${STATUS_LABELS[statusFilter] || statusFilter}"` : ""}.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c) => (
              <div
                key={c._id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 p-4 transition hover:border-gray-300 dark:hover:border-slate-600 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Case Info */}
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-700"
                        }`}
                    >
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Anonymous Emergency
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    📍{" "}
                    {c.location
                      ? `${c.location.latitude?.toFixed(4)}, ${c.location.longitude?.toFixed(4)}`
                      : "Location unavailable"}
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setSelectedCase(c)}
                    className="rounded-xl border border-sky-500/50 bg-sky-50 dark:bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-600 dark:text-sky-300 transition hover:bg-sky-100 dark:hover:bg-sky-500/20"
                  >
                    Details
                  </button>
                  {c.status !== "COMPLETED" && (
                    <button
                      onClick={() => handleStatusChange(c._id, "COMPLETED")}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {c.status === "COMPLETED" && (
                    <span className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      ✓ Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
    </div>

    {/* Emergency Popup Notifications */}
    <EmergencyPopup notifications={popupNotifications} onDismiss={dismissPopup} />
    </>
  );
}
