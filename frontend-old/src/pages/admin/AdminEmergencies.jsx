import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminModal from "../../components/admin/AdminModal";
import AdminSurface from "../../components/admin/AdminSurface";
import { emergencyStatusOptions, formatDate, getStatusBadgeClasses } from "../../components/admin/admin.utils";
import { deleteEmergencyById, getAllEmergencies, getErrorMessage, updateEmergencyStatus } from "../../services/api";

export default function AdminEmergencies() {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchEmergencies = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getAllEmergencies();
      if (res.success) setEmergencies(res.emergencies);
      setError("");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load emergencies log");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const handleStatusUpdate = async (emergencyId, status) => {
    const loadingToast = toast.loading("Updating emergency...");

    try {
      const res = await updateEmergencyStatus(emergencyId, status);
      if (res.success) {
        setEmergencies((current) => current.map((item) => item._id === emergencyId ? res.emergency : item));
        setSelectedEmergency((current) => current?._id === emergencyId ? res.emergency : current);
        toast.success("Emergency updated", { id: loadingToast });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update emergency"), { id: loadingToast });
    }
  };

  const handleDelete = async (emergencyId) => {
    const loadingToast = toast.loading("Deleting emergency...");

    try {
      const res = await deleteEmergencyById(emergencyId);
      if (res.success) {
        setEmergencies((current) => current.filter((item) => item._id !== emergencyId));
        if (selectedEmergency?._id === emergencyId) setSelectedEmergency(null);
        toast.success("Emergency deleted", { id: loadingToast });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete emergency"), { id: loadingToast });
    }
  };

  const getEmergencyDetails = (emergency) => ({
    Status: emergency.status,
    Patient: emergency.user?.name || "Anonymous / System",
    "Patient Email": emergency.user?.email,
    "Patient Mobile": emergency.user?.mobile,
    "Patient City": emergency.user?.city,
    "Assigned Driver": emergency.ambulance?.driverName || emergency.ambulance?.name || "Awaiting response",
    "Driver Contact": emergency.ambulance?.contact || emergency.ambulance?.mobile,
    "Vehicle Number": emergency.ambulance?.vehicleNumber,
    Coordinates: emergency.location
      ? `${emergency.location.latitude}, ${emergency.location.longitude}`
      : "N/A",
    Image: emergency.imageUrl || "N/A",
    "Created Date": formatDate(emergency.createdAt),
  });

  return (
    <AdminLayout
      title="Emergency Logs"
      description="Live dispatch records from the backend with status and assignment controls."
      actions={
        <button
          type="button"
          onClick={() => fetchEmergencies({ silent: true })}
          disabled={refreshing}
          className="px-4 py-2 rounded-xl bg-white text-gray-900 border border-gray-200 font-semibold disabled:opacity-60"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {error ? (
        <AdminSurface className="p-4 mb-6 border border-red-200 bg-red-50 text-red-700">
          {error}
        </AdminSurface>
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center p-12 text-gray-400">Loading emergency records...</div>
        ) : emergencies.map((em) => (
          <AdminSurface
            key={em._id}
            className="p-6 flex cursor-pointer flex-col gap-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80"
            onClick={() => setSelectedEmergency(em)}
          >
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadgeClasses(em.status)}`}>
                    {em.status}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">{formatDate(em.createdAt)}</span>
                </div>

                <div className="text-gray-600 dark:text-gray-400 text-sm grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  <span><strong>ID:</strong> {em._id}</span>
                  <span><strong>Location:</strong> [{em.location?.latitude?.toFixed?.(4) || "0.0000"}, {em.location?.longitude?.toFixed?.(4) || "0.0000"}]</span>
                  <span><strong>Patient:</strong> {em.user?.name || "Anonymous / System"}</span>
                  <span><strong>Driver:</strong> {em.ambulance?.name || "Awaiting Response"}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 xl:w-auto w-full" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setSelectedEmergency(em)}
                  className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  View
                </button>
                <select
                  value={em.status}
                  onChange={(e) => handleStatusUpdate(em._id, e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 font-semibold"
                >
                  {emergencyStatusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(em._id)}
                  className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Requester (Patient)</h4>
                {em.user ? (
                  <>
                    <div className="font-bold text-gray-900 dark:text-white">{em.user.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{em.user.mobile || "No mobile"}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{em.user.email || "No email"}</div>
                  </>
                ) : (
                  <div className="text-gray-400 italic">Anonymous / System</div>
                )}
              </div>

              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30">
                <h4 className="text-xs font-bold text-red-400 dark:text-red-500/80 uppercase tracking-widest mb-2">Assigned Driver</h4>
                {em.ambulance ? (
                  <>
                    <div className="font-bold text-gray-900 dark:text-white">{em.ambulance.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{em.ambulance.mobile || "No mobile"} - {em.ambulance.vehicleNumber || "No vehicle number"}</div>
                  </>
                ) : (
                  <div className="text-gray-400 italic">Awaiting Response</div>
                )}
              </div>
            </div>
          </AdminSurface>
        ))}

        {!loading && emergencies.length === 0 && (
          <AdminSurface className="p-12 text-center text-gray-500">
            No emergencies recorded in the system yet.
          </AdminSurface>
        )}
      </div>

      {selectedEmergency ? (
        <AdminModal title="Emergency Details" subtitle="Full emergency alert details from the backend" onClose={() => setSelectedEmergency(null)}>
          <AdminDetailGrid data={getEmergencyDetails(selectedEmergency)} />
        </AdminModal>
      ) : null}
    </AdminLayout>
  );
}
