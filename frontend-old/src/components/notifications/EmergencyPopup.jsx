import { useState, useEffect, useCallback } from "react";

/**
 * EmergencyPopup — Premium stacking in-app notification popup.
 * Used by Hospital and Police dashboards to show incoming emergency alerts
 * with full patient details instead of a simple toast.
 *
 * Props:
 *   notifications: Array<{ id, type, request, hospitalSelected }>
 *   onDismiss: (id) => void
 */
export default function EmergencyPopup({ notifications, onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      {notifications.map((n) => (
        <NotificationCard key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function NotificationCard({ notification, onDismiss }) {
  const { id, type, request, hospitalSelected } = notification;
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);
  const AUTO_DISMISS_MS = 15000;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(id), 300);
  }, [id, onDismiss]);

  // Auto-dismiss after 15s with progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p <= 0) {
          clearInterval(interval);
          dismiss();
          return 0;
        }
        return p - (100 / (AUTO_DISMISS_MS / 100));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [dismiss]);

  const isHospital = type === "hospital";
  const req = request || {};
  const user = req.user || {};
  const ambulance = req.ambulance || {};
  const hospital = req.hospital || null;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300 ${
        exiting ? "opacity-0 translate-x-8 scale-95" : "opacity-100 translate-x-0 scale-100"
      } ${isHospital
        ? "bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800"
        : "bg-white dark:bg-gray-900 border-red-200 dark:border-red-800"
      }`}
    >
      {/* Progress bar */}
      <div className={`absolute top-0 left-0 h-1 transition-all duration-100 ${isHospital ? "bg-blue-500" : "bg-red-500"}`} style={{ width: `${progress}%` }} />

      {/* Header stripe */}
      <div className={`px-4 py-3 flex items-center gap-3 ${isHospital ? "bg-blue-50 dark:bg-blue-900/30" : "bg-red-50 dark:bg-red-900/30"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${isHospital ? "bg-blue-100 dark:bg-blue-900/50" : "bg-red-100 dark:bg-red-900/50"}`}>
          {isHospital ? "🚑" : "🚨"}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-black text-sm ${isHospital ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}>
            {isHospital
              ? hospitalSelected ? "🏥 Hospital Assignment Update" : "Incoming Ambulance Alert"
              : hospitalSelected ? "🏥 Hospital Selected for Case" : "New Emergency Case"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Patient Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-gray-600 dark:text-gray-300 shrink-0">
            {user.name?.charAt(0)?.toUpperCase() || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{user.name || "Anonymous Patient"}</p>
            {user.mobile && <p className="text-xs text-gray-500 dark:text-gray-400">📞 {user.mobile}</p>}
            {user.address && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">🏠 {user.address}</p>}
          </div>
        </div>

        {/* Location */}
        {req.location && (
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2">
            <span className="text-base">📍</span>
            <span className="text-xs text-gray-600 dark:text-gray-300 font-mono">
              {req.location.latitude?.toFixed(5)}, {req.location.longitude?.toFixed(5)}
            </span>
          </div>
        )}

        {/* Patient Photo */}
        {req.imageUrl && (
          <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 h-32">
            <img src={req.imageUrl} alt="Patient" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Ambulance (if assigned) */}
        {ambulance.name && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span>🚑</span>
            <span>{ambulance.name}</span>
            {ambulance.vehicleNumber && <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">{ambulance.vehicleNumber}</span>}
          </div>
        )}

        {/* Hospital (if selected) */}
        {hospital && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-base">🏥</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">{hospital.name}</p>
              {hospital.address && <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 truncate">{hospital.address}{hospital.city ? `, ${hospital.city}` : ""}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
