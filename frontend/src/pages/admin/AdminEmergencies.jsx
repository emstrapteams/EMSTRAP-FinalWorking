import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminModal from "../../components/admin/AdminModal";
import AdminSurface from "../../components/admin/AdminSurface";
import { formatDate } from "../../components/admin/admin.utils";
import { deleteEmergencyById, getAllEmergencies, getErrorMessage } from "../../services/api";
import LiveTrackingMap from "../../components/map/LiveTrackingMap"; // adjust path if your component lives elsewhere
import EvidenceImageViewer from "../../components/common/EvidenceImageViewer";
// ─── Design tokens ────────────────────────────────────────────────────────────

const cls = {
  btnRefresh:
    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-violet-400 bg-violet-50 hover:bg-violet-100 active:scale-95 text-violet-700 dark:border-violet-500 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 text-sm font-bold transition-all duration-150 disabled:opacity-50",
  btnView:
    "inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-sm font-bold transition-all duration-150 dark:bg-slate-800 dark:hover:bg-indigo-950/50 dark:text-slate-300",
  btnTrack:
    "inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-600 hover:text-blue-700 text-sm font-bold transition-all duration-150 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 dark:text-blue-400",
  btnDel:
    "inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 hover:text-red-700 text-sm font-bold transition-all duration-150 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-400",
};

const statusBadge = (status) => {
  const s = (status || "").toUpperCase();
  if (["RESOLVED", "COMPLETED"].includes(s))
    return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/30";
  if (["AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION", "EN_ROUTE_TO_HOSPITAL"].includes(s))
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/30";
  if (["PENDING"].includes(s))
    return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/30";
  if (["CANCELLED"].includes(s))
    return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/30";
};

const urgencyRing = (status) => {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "ring-2 ring-yellow-400/50 dark:ring-yellow-500/30";
  if (["AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION", "EN_ROUTE_TO_HOSPITAL"].includes(s)) return "ring-2 ring-red-400/50 dark:ring-red-500/30";
  if (["RESOLVED", "COMPLETED"].includes(s)) return "ring-2 ring-emerald-400/50 dark:ring-emerald-500/30";
  return "";
};

// An emergency is trackable once a driver/ambulance has been assigned and the
// case is still open (not resolved/completed/cancelled).
const canTrack = (em) =>
  !!em.ambulance && !["RESOLVED", "COMPLETED", "CANCELLED"].includes((em.status || "").toUpperCase());

// Normalizes the ambulance's live coordinates regardless of which shape the
// backend sends them in (flat lat/lng vs nested location object).
const getDriverLocation = (em) => {
  const amb = em.ambulance;
  if (!amb) return null;
  if (amb.latitude != null && amb.longitude != null) {
    return { lat: amb.latitude, lng: amb.longitude };
  }
  if (amb.location?.latitude != null && amb.location?.longitude != null) {
    return { lat: amb.location.latitude, lng: amb.location.longitude };
  }
  return null;
};

const getPatientLocation = (em) =>
  em.location?.latitude != null && em.location?.longitude != null
    ? { lat: em.location.latitude, lng: em.location.longitude }
    : null;

// ─── Filter card config ───────────────────────────────────────────────────────
// "Active Alerts" = currently dispatched/in-progress cases (ASSIGNED or
// IN_PROGRESS) — i.e. emergencies that still need attention right now.

const filterCards = [
  { key: "ALL",       label: "Total Cases",   match: () => true },
  { key: "PENDING",   label: "Pending",       match: (e) => e.status === "PENDING" },
  { key: "ACTIVE",    label: "Active Alerts", match: (e) => ["AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION", "EN_ROUTE_TO_HOSPITAL"].includes(e.status) },
  { key: "RESOLVED",  label: "Resolved",      match: (e) => e.status === "COMPLETED" },
  { key: "CANCELLED", label: "Cancelled",     match: (e) => e.status === "CANCELLED" },
];

// Per-card accent colors (hover + active/selected state).
// Active Alerts = red, Pending = yellow, Resolved = green, Cancelled = black/gray.
// Classes are written out in full so Tailwind's JIT always detects them.
const CARD_STYLES = {
  ALL: {
    activeWrap: "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600",
    activeText: "text-indigo-600 dark:text-indigo-400",
    hoverWrap: "hover:border-indigo-200 hover:bg-indigo-50/40 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20",
    hoverText: "group-hover:text-indigo-500 dark:group-hover:text-indigo-400",
  },
  PENDING: {
    activeWrap: "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-600",
    activeText: "text-yellow-600 dark:text-yellow-400",
    hoverWrap: "hover:border-yellow-200 hover:bg-yellow-50/40 dark:hover:border-yellow-700 dark:hover:bg-yellow-950/20",
    hoverText: "group-hover:text-yellow-600 dark:group-hover:text-yellow-400",
  },
  ACTIVE: {
    activeWrap: "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-600",
    activeText: "text-red-600 dark:text-red-400",
    hoverWrap: "hover:border-red-200 hover:bg-red-50/40 dark:hover:border-red-700 dark:hover:bg-red-950/20",
    hoverText: "group-hover:text-red-600 dark:group-hover:text-red-400",
  },
  RESOLVED: {
    activeWrap: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600",
    activeText: "text-emerald-600 dark:text-emerald-400",
    hoverWrap: "hover:border-emerald-200 hover:bg-emerald-50/40 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20",
    hoverText: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  },
  CANCELLED: {
    activeWrap: "border-gray-400 bg-gray-100 dark:bg-gray-700 dark:border-gray-500",
    activeText: "text-gray-900 dark:text-gray-100",
    hoverWrap: "hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-800",
    hoverText: "group-hover:text-gray-900 dark:group-hover:text-white",
  },
};

export default function AdminEmergencies() {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [trackingEmergency, setTrackingEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const fetchEmergencies = async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getAllEmergencies();
      if (res.success) setEmergencies(res.emergencies);
      setError("");
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load emergencies");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchEmergencies(); }, []);

  // While a tracking modal is open, keep that emergency's data fresh so the
  // driver marker moves instead of staying frozen on a stale snapshot.
  useEffect(() => {
    if (!trackingEmergency) return;

    const poll = setInterval(async () => {
      try {
        const res = await getAllEmergencies();
        if (res.success) {
          setEmergencies(res.emergencies);
          const updated = res.emergencies.find((e) => e._id === trackingEmergency._id);
          if (updated) {
            setTrackingEmergency(updated);
          } else {
            // Case no longer exists (e.g. deleted elsewhere) — close the modal.
            setTrackingEmergency(null);
          }
        }
      } catch {
        // Silent — don't spam toasts during background polling.
      }
    }, 8000);

    return () => clearInterval(poll);
  }, [trackingEmergency?._id]);

  const handleDelete = async (emergencyId) => {
    const tid = toast.loading("Deleting emergency…");
    try {
      const res = await deleteEmergencyById(emergencyId);
      if (res.success) {
        setEmergencies((c) => c.filter((i) => i._id !== emergencyId));
        if (selectedEmergency?._id === emergencyId) setSelectedEmergency(null);
        if (trackingEmergency?._id === emergencyId) setTrackingEmergency(null);
        toast.success("Emergency deleted", { id: tid });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete emergency"), { id: tid });
    }
  };

  const getDetails = (em) => ({
    Status: em.status,
    Patient: em.user?.name || "Anonymous / System",
    "Patient Email": em.user?.email,
    "Patient Mobile": em.user?.mobile,
    "Patient City": em.user?.city,
    "Assigned Driver": em.ambulance?.driverName || em.ambulance?.name || "Awaiting response",
    "Driver Contact": em.ambulance?.contact || em.ambulance?.mobile,
    "Vehicle Number": em.ambulance?.vehicleNumber,
    Coordinates: em.location ? `${em.location.latitude}, ${em.location.longitude}` : "N/A",
    
    "Created Date": formatDate(em.createdAt),
  });

  const activeCard = filterCards.find((c) => c.key === activeFilter) || filterCards[0];
  const visibleEmergencies = emergencies.filter(activeCard.match);

  return (
    <AdminLayout
      title="Emergency Logs"
      description="Live dispatch records with status and assignment controls."
      actions={
        <button type="button" onClick={() => fetchEmergencies({ silent: true })} disabled={refreshing} className={cls.btnRefresh}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 15A8 8 0 1 0 5.07 8.965" />
          </svg>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/30 p-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/></svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Summary strip — clickable filters, color-coded per status on hover + when active */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {filterCards.map((card) => {
          const count = emergencies.filter(card.match).length;
          const isActive = activeFilter === card.key;
          const s = CARD_STYLES[card.key];
          return (
            <button
              type="button"
              key={card.key}
              onClick={() => setActiveFilter(card.key)}
              aria-pressed={isActive}
              className={`group rounded-2xl p-5 text-left border transition-all duration-150 ease-out focus:outline-none ${
                isActive
                  ? s.activeWrap
                  : `border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 ${s.hoverWrap}`
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-wide transition-colors ${
                isActive ? s.activeText : `text-gray-400 dark:text-gray-500 ${s.hoverText}`
              }`}>
                {card.label}
              </p>
              <p className={`text-3xl font-black mt-2 tabular-nums transition-colors ${
                isActive ? s.activeText : `text-gray-900 dark:text-white ${s.hoverText}`
              }`}>
                {count}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading && (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
            <div className="h-8 w-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading emergency records…</p>
          </div>
        )}

        {!loading && visibleEmergencies.length === 0 && (
          <AdminSurface className="p-12 text-center">
            <svg className="h-12 w-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
            <p className="text-sm text-gray-400">
              {emergencies.length === 0
                ? "No emergencies recorded yet."
                : `No ${activeCard.label.toLowerCase()} right now.`}
            </p>
            {activeFilter !== "ALL" && emergencies.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </AdminSurface>
        )}

        {!loading && visibleEmergencies.map((em) => (
          <AdminSurface
            key={em._id}
            className={`p-5 cursor-pointer transition-all duration-200 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 ${urgencyRing(em.status)}`}
            onClick={() => setSelectedEmergency(em)}
          >
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              {/* Left – meta */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${statusBadge(em.status)}`}>
                    {em.status}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{formatDate(em.createdAt)}</span>
                  <span className="text-xs font-mono text-gray-300 dark:text-gray-600 truncate">{em._id}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    <strong className="text-gray-700 dark:text-gray-200">Patient:</strong>{" "}
                    {em.user?.name || "Anonymous / System"}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    <strong className="text-gray-700 dark:text-gray-200">Location:</strong>{" "}
                    [{em.location?.latitude?.toFixed?.(4) || "0.0000"}, {em.location?.longitude?.toFixed?.(4) || "0.0000"}]
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    <strong className="text-gray-700 dark:text-gray-200">Driver:</strong>{" "}
                    {em.ambulance?.name || "Awaiting Response"}
                  </span>
                  {em.ambulance?.vehicleNumber && (
                    <span className="text-gray-500 dark:text-gray-400">
                      <strong className="text-gray-700 dark:text-gray-200">Vehicle:</strong>{" "}
                      {em.ambulance.vehicleNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Right – controls */}
              <div className="flex flex-wrap items-center gap-2 xl:shrink-0" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => setSelectedEmergency(em)} className={cls.btnView}>
                  View Details
                </button>
                {canTrack(em) && (
                  <button type="button" onClick={() => setTrackingEmergency(em)} className={cls.btnTrack}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="3" />
                      <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                    Track Live
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(em._id)} className={cls.btnDel}>
                  Delete
                </button>
              </div>
            </div>

            {/* Patient / Driver cards */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 p-3.5">
                <p className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Requester</p>
                {em.user ? (
                  <>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{em.user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{em.user.mobile || "No mobile"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{em.user.email || "No email"}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">Anonymous / System</p>
                )}
              </div>

              <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-3.5">
                <p className="text-[10px] font-extrabold text-red-400 dark:text-red-500/80 uppercase tracking-widest mb-2">Assigned Driver</p>
                {em.ambulance ? (
                  <>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{em.ambulance.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {em.ambulance.mobile || "No mobile"} · {em.ambulance.vehicleNumber || "No vehicle"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">Awaiting Response</p>
                )}
              </div>
            </div>
          </AdminSurface>
        ))}
      </div>

      {selectedEmergency && (
        <AdminModal
          title="Emergency Details"
          subtitle="Full alert details from the backend"
          onClose={() => setSelectedEmergency(null)}
        >
          <div className="space-y-6">

            <EvidenceImageViewer
              mainImage={selectedEmergency.imageUrl}
              evidence={selectedEmergency.evidence || []}
            />

            <AdminDetailGrid
              data={getDetails(selectedEmergency)}
            />

          </div>
        </AdminModal>
      )}

      {trackingEmergency && (
        <AdminModal
          title="Live Tracking"
          subtitle={`Case ${trackingEmergency._id}`}
          onClose={() => setTrackingEmergency(null)}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${statusBadge(trackingEmergency.status)}`}>
                {trackingEmergency.status}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Driver:{" "}
                <strong className="text-gray-700 dark:text-gray-200">
                  {trackingEmergency.ambulance?.driverName || trackingEmergency.ambulance?.name || "Unassigned"}
                </strong>
                {trackingEmergency.ambulance?.vehicleNumber && (
                  <> · {trackingEmergency.ambulance.vehicleNumber}</>
                )}
              </span>
            </div>

            <LiveTrackingMap
              height="450px"
              userLocation={getPatientLocation(trackingEmergency)}
              driverLocation={getDriverLocation(trackingEmergency)}
            />

            {!getDriverLocation(trackingEmergency) && (
              <p className="text-xs text-gray-400 italic">
                Live driver coordinates aren't available yet — showing patient location only.
              </p>
            )}
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  );
}