import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Container from "../../components/layout/Container";
import { API_URL, getAlerts, getErrorMessage, getStats, updateHospitalAlertStatus } from "../../services/api";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminModal from "../../components/admin/AdminModal";
import { formatDate, getStatusBadgeClasses } from "../../components/admin/admin.utils";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";
import EmergencyPopup from "../../components/notifications/EmergencyPopup";

const ambulanceIcon = L.divIcon({
  html: `<div class="bg-white rounded-full p-2 text-xl shadow-lg border-2 border-red-500 flex items-center justify-center">🚑</div>`,
  className: "custom-leaflet-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const patientIcon = L.divIcon({
  html: `<div class="bg-white rounded-full p-2 text-xl shadow-lg border-2 border-blue-500 flex items-center justify-center">👤</div>`,
  className: "custom-leaflet-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const hospitalIcon = L.divIcon({
  html: `<div class="bg-white rounded-full p-2 text-xl shadow-lg border-2 border-emerald-500 flex items-center justify-center">🏥</div>`,
  className: "custom-leaflet-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

import { useAuth } from "../../context/AuthContext";

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
  const [ambulanceLocations, setAmbulanceLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [popupNotifications, setPopupNotifications] = useState([]);

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
          // If we received a full update (not lite), replace it
          if (!data.isLite) {
             return prev.map((a) => a._id === data.request._id ? data.request : a);
          }
          // If it's a status update in a lite alert, update only status
          return prev.map((a) => a._id === data.request._id ? { ...a, ...data.request } : a);
        }
        return [data.request, ...prev];
      });
      // Show rich in-app popup
      setPopupNotifications((prev) => [
        ...prev,
        { id: `${data.request._id}-${Date.now()}`, type: "hospital", request: data.request, hospitalSelected: data.hospitalSelected }
      ]);
    });

    // Listen for live ambulance location updates
    newSocket.on("update_location", (data) => {
      setAmbulanceLocations((prev) => ({
        ...prev,
        [data.requestId]: { lat: data.lat, lng: data.lng }
      }));
    });

    return () => newSocket.close();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await updateHospitalAlertStatus(id, status);
      if (res.success) {
        setAlerts((prev) => prev.map((a) => a._id === id ? res.emergency : a));
        if (selectedAlert?._id === id) setSelectedAlert(res.emergency);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const getAlertDetails = (alert) => {
    const liveLoc = ambulanceLocations[alert._id];
    return {
      Status: alert.status,
      "Patient Name": alert.user?.name || "Anonymous",
      "Patient Mobile": alert.user?.mobile || "N/A",
      "Pickup Location": alert.location
        ? `${alert.location.latitude}, ${alert.location.longitude}`
        : "N/A",
      "Destination Hospital": alert.hospital?.name || "Assigning...",
      "Ambulance Driver": alert.ambulance?.name || "Pending",
      "Live Location": liveLoc
        ? `${liveLoc.lat.toFixed(4)}, ${liveLoc.lng.toFixed(4)} (Live Update)`
        : "Waiting for signal...",
      Image: alert.imageUrl || "N/A",
      "Created Date": formatDate(alert.createdAt),
    };
  };

  return (
    <>
      <div className="w-full">
        <Container>
          <div className="py-10">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Hospital ER Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium italic">Monitoring incoming ambulance arrivals with live backend data.</p>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400 font-medium">
                {error}
              </div>
            ) : null}

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
              {[
                ["Total Alerts", stats.totalAlerts],
                ["Active Alerts", stats.activeAlerts],
                ["Hospitals", stats.totalHospitals],
                ["Bookings", stats.totalBookings],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white dark:border-gray-800 bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</p>
                  <p className="mt-2 text-4xl font-black text-gray-900 dark:text-white">{value || 0}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 space-y-4">
              {loading ? (
                <div className="text-center p-20 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-full mb-4"></div>
                    <span>Loading live emergency alerts...</span>
                  </div>
                </div>
              ) : alerts.map((alert) => (
                <div
                  key={alert._id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-white dark:border-gray-800 rounded-[2rem] bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all gap-6 ring-1 ring-gray-100 dark:ring-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-[10px] px-3 py-1 rounded-full uppercase font-black tracking-widest ${getStatusBadgeClasses(alert.status)}`}>
                        {alert.status || "PENDING"}
                      </span>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{formatDate(alert.createdAt)}</span>
                    </div>
                    <p className="text-gray-900 dark:text-white font-black text-xl">
                      {alert.user?.name || "Anonymous Patient"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">
                      {alert.ambulance?.name ? `Ambulance ${alert.ambulance.vehicleNumber || ""} is bringing the patient to ${alert.hospital?.name || "Hospital"}.` : "Emergency alert received. Awaiting ambulance assignment."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAlert(alert)}
                      className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
                    >
                      Details
                    </button>
                    {alert.ambulance && alert.status !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => setTrackingAlert(alert)}
                        className="px-6 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Live Location
                      </button>
                    )}
                    {alert.status !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(alert._id, "COMPLETED")}
                        className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!loading && alerts.length === 0 && (
                <div className="text-center p-20 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  No incoming emergencies right now.
                </div>
              )}
            </div>
          </div>
        </Container>

        {/* Details Modal */}
        {selectedAlert ? (
          <AdminModal title="Alert Details" subtitle="Full emergency alert details from backend" onClose={() => setSelectedAlert(null)}>
            <AdminDetailGrid data={getAlertDetails(selectedAlert)} />
          </AdminModal>
        ) : null}

        {/* Tracking Modal */}
        {trackingAlert ? (
          <AdminModal
            title="Live Tracking Pipeline"
            subtitle={`Route tracking for ${trackingAlert.user?.name || "Patient"}`}
            onClose={() => setTrackingAlert(null)}
          >
            <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-gray-200">
              <MapContainer
                center={[trackingAlert.location?.latitude || 20.5937, trackingAlert.location?.longitude || 78.9629]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                />

                {/* Patient Starting Point (Pickup) */}
                {trackingAlert.location && (
                  <Marker position={[trackingAlert.location.latitude, trackingAlert.location.longitude]} icon={patientIcon}>
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold">Starting Point</p>
                        <p className="text-xs text-gray-500">Patient Pickup Location</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Destination Hospital (requires geocoding from address) */}
                {/*
                {trackingAlert.hospital?.address && (
                  <Marker position={[trackingAlert.hospital.location.latitude, trackingAlert.hospital.location.longitude]} icon={hospitalIcon}>
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-emerald-600">{trackingAlert.hospital.name}</p>
                        <p className="text-xs text-gray-500">Emergency Destination</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                */}

                {/* Ambulance Location (Live) */}
                {ambulanceLocations[trackingAlert._id] && (
                  <>
                    <Marker
                      position={[ambulanceLocations[trackingAlert._id].lat, ambulanceLocations[trackingAlert._id].lng]}
                      icon={ambulanceIcon}
                    >
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold">Live Ambulance</p>
                          <p className="text-xs text-red-500 animate-pulse font-bold uppercase tracking-tighter">Updating GPS...</p>
                        </div>
                      </Popup>
                    </Marker>
                    {/* Trail from start to current */}
                    <Polyline
                      positions={[
                        [trackingAlert.location.latitude, trackingAlert.location.longitude],
                        [ambulanceLocations[trackingAlert._id].lat, ambulanceLocations[trackingAlert._id].lng]
                      ]}
                      color="#ef4444"
                      dashArray="10, 10"
                      weight={3}
                      opacity={0.6}
                    />
                    {/* Trail from current to hospital (requires geocoding) */}
                    {/*
                    {trackingAlert.hospital?.address && (
                      <Polyline
                        positions={[
                          [ambulanceLocations[trackingAlert._id].lat, ambulanceLocations[trackingAlert._id].lng],
                          [trackingAlert.hospital.location.latitude, trackingAlert.hospital.location.longitude]
                        ]}
                        color="#10b981"
                        dashArray="5, 10"
                        weight={2}
                        opacity={0.4}
                      />
                    )}
                    */}
                  </>
                )}
              </MapContainer>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Origin</p>
                <p className="font-black text-gray-800 dark:text-gray-200 truncate">Patient Site</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Current</p>
                <p className="font-black text-red-800 dark:text-red-300 truncate">{trackingAlert.ambulance?.vehicleNumber || "Fleet"}</p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Destination</p>
                <p className="font-black text-emerald-800 dark:text-emerald-300 truncate">Hospital ER</p>
              </div>
            </div>
          </AdminModal>
        ) : null}
      </div>

      {/* Emergency Popup Notifications */}
      <EmergencyPopup notifications={popupNotifications} onDismiss={dismissPopup} />
    </>
  );
}
