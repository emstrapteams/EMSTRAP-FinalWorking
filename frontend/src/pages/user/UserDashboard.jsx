import { useEffect, useState } from "react";
import API from "../../services/api";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { API_URL } from "../../services/api";
import {
  MapPin,
  Navigation,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Siren,
  Truck,
  CalendarX,
} from "lucide-react";

const STATUS_CONFIG = {
  PENDING: { icon: Clock, classes: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  ACCEPTED: { icon: CheckCircle2, classes: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  IN_PROGRESS: { icon: Loader2, classes: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  COMPLETED: { icon: CheckCircle2, classes: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  CANCELLED: { icon: XCircle, classes: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const getGoogleMapsUrl = (item, driverLocation) => {
  if (!item) return "";
  const startLat = driverLocation?.lat || driverLocation?.latitude || item.ambulance?.currentLocation?.latitude || item.ambulance?.latitude;
  const startLng = driverLocation?.lng || driverLocation?.longitude || item.ambulance?.currentLocation?.longitude || item.ambulance?.longitude;
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

export default function UserDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const [bookingsRes, emergenciesRes] = await Promise.all([
        API.get("/api/bookings"),
        API.get("/api/emergency")
      ]);

      const bookingsData = (bookingsRes.data?.data ?? []).map(b => ({
        ...b,
        type: "booking",
        isEmergency: false
      }));

      const emergenciesData = (emergenciesRes.data?.data ?? []).map(e => {
        const mapEmergencyStatus = (status) => {
          switch (status) {
            case "PENDING":
              return "PENDING";
            case "AMBULANCE_ACCEPTED":
            case "ARRIVED_AT_LOCATION":
            case "EN_ROUTE_TO_HOSPITAL":
              return "IN_PROGRESS";
            case "COMPLETED":
              return "COMPLETED";
            case "CANCELLED":
              return "CANCELLED";
            default:
              return status;
          }
        };

        return {
          ...e,
          _id: e._id,
          requestId: e._id,
          type: "emergency",
          status: mapEmergencyStatus(e.status),
          ambulanceType: "EMERGENCY",
          pickupLocation: { address: e.location?.address || "Live Emergency Location" },
          estimatedPrice: 0,
          createdAt: e.createdAt,
          isEmergency: true
        };
      });

      const combined = [...bookingsData, ...emergenciesData].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setBookings(combined);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    const socket = io(API_URL, { withCredentials: true });

    // Listen for events that should trigger a list refresh
    socket.on("trip_completed", () => {
      toast.success("One of your trips has been completed!");
      fetchBookings();
    });

    socket.on("emergency_cancelled", () => {
      toast.error("An assignment was cancelled.");
      fetchBookings();
    });

    socket.on("ambulance_assigned", () => {
      toast.success("An ambulance has been assigned to your request!");
      fetchBookings();
    });

    // Join user-specific room if available, or just join the general user room
    // For now, these events are usually emitted to request rooms,
    // so we might need the driver to emit to a 'user_{id}' room as well.
    if (user?._id) {
      socket.emit("join_user", { userId: user._id });
    }

    return () => {
      socket.disconnect();
    };
  }, [user?._id]);

  const handleCancel = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[250px]">
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100">Cancel Booking?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Are you sure you want to cancel this booking?</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            No, Keep it
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              processCancel(id);
            }}
            className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors"
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center' });
  };

  const processCancel = async (id) => {
    const loadingToast = toast.loading("Cancelling booking...");
    try {
      await API.put(`/api/bookings/${id}/cancel`);
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: "CANCELLED" } : b))
      );
      toast.success("Booking cancelled successfully", { id: loadingToast });
    } catch (err) {
      console.error("Failed to cancel booking", err);
      toast.error("Failed to cancel booking", { id: loadingToast });
    }
  };
  const handleEmergencyCancel = async (id) => {
    const loadingToast = toast.loading("Cancelling emergency...");

    try {
      await API.put(`/api/emergency/${id}/user-cancel`);

      setBookings((prev) =>
        prev.map((item) =>
          item._id === id
            ? { ...item, status: "CANCELLED" }
            : item
        )
      );

      toast.success("Emergency cancelled successfully", {
        id: loadingToast,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel emergency", {
        id: loadingToast,
      });
    }
  };
  const [activeFilter, setActiveFilter] = useState("total");

  const STAT_FILTERS = {
    total: { label: "Total Bookings", match: () => true },
    active: { label: "Active", match: (b) => ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(b.status) },
    completed: { label: "Completed", match: (b) => b.status === "COMPLETED" },
    cancelled: { label: "Cancelled", match: (b) => b.status === "CANCELLED" },
  };

  const stats = {
    total: bookings.length,
    active: bookings.filter(STAT_FILTERS.active.match).length,
    completed: bookings.filter(STAT_FILTERS.completed.match).length,
    cancelled: bookings.filter(STAT_FILTERS.cancelled.match).length,
  };

  const handleFilterClick = (key) => {
    setActiveFilter((prev) => (prev === key ? "total" : key));
  };

  const recentBookings =
    activeFilter === "total"
      ? bookings.slice(0, 5)
      : bookings.filter(STAT_FILTERS[activeFilter].match);

  return (
    <>
      <Navbar />
      <Container>
        {/* Welcome header */}
        <div className="mt-10 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage bookings, track ambulances and monitor emergency requests.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Total Bookings"
            value={stats.total}
            isActive={activeFilter === "total"}
            onClick={() => handleFilterClick("total")}
          />
          <StatCard
            label="Active"
            value={stats.active}
            isActive={activeFilter === "active"}
            onClick={() => handleFilterClick("active")}
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            isActive={activeFilter === "completed"}
            onClick={() => handleFilterClick("completed")}
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            isActive={activeFilter === "cancelled"}
            onClick={() => handleFilterClick("cancelled")}
          />
        </div>

        {/* Recent bookings */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {activeFilter === "total" ? "Recent Bookings" : `${STAT_FILTERS[activeFilter].label} Bookings`}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {activeFilter === "total"
              ? "Your latest ambulance requests and emergency activity."
              : `Showing only ${STAT_FILTERS[activeFilter].label.toLowerCase()} bookings.`}
          </p>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 animate-pulse h-28"
                />
              ))}
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-3 p-14 bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 dark:text-gray-500 transition-colors">
              <span className="text-4xl" role="img" aria-label="ambulance">🚑</span>
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {activeFilter === "total" ? "No Bookings Yet" : `No ${STAT_FILTERS[activeFilter].label} Bookings`}
              </p>
              <p className="text-sm">
                {activeFilter === "total"
                  ? "Create your first ambulance booking in seconds."
                  : "Try a different filter to see other bookings."}
              </p>
              {activeFilter === "total" && (
                <Link
                  to="/booking"
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 transition-colors"
                >
                  Create Booking
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((b) => {
                const status = STATUS_CONFIG[b.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = status.icon;
                const canAct = b.status === "PENDING" || b.status === "ACCEPTED" || b.status === "IN_PROGRESS";

                return (
                  <div
                    key={b._id}
                    className="p-5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between md:items-center gap-4"
                  >
                    <div className="flex gap-4 items-start">
                      <span
                        className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${
                          b.isEmergency
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {b.isEmergency ? <Siren size={20} /> : <Truck size={20} />}
                      </span>

                      <div>
                        <h3
                          className={`font-bold text-lg ${
                            b.isEmergency ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {b.ambulanceType} {b.isEmergency ? "Emergency" : "Ambulance"}
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-1.5 mt-1">
                          <MapPin size={14} className="mt-0.5 shrink-0" />
                          <span>
                            From: {b.pickupLocation?.address || "Selected Location"}
                            {!b.isEmergency && (
                              <>
                                <br />
                                To: {b.dropoffLocation?.address || "Selected Hospital"}
                              </>
                            )}
                          </span>
                        </p>

                        {b.distanceKm && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                            <Navigation size={12} />
                            {b.distanceKm} km
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:self-stretch">
                      <span className="font-bold text-xl text-gray-900 dark:text-gray-100">
                        {b.estimatedPrice > 0 ? `₹${b.estimatedPrice}` : "FREE"}
                      </span>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase rounded-full ${status.classes}`}>
                          <StatusIcon size={12} className={b.status === "IN_PROGRESS" ? "animate-spin" : ""} />
                          {b.status}
                        </span>

                        {canAct && (
                          <div className="flex flex-col items-end gap-2">
                            {(b.requestId || b._id) && (
                              <Link
                                to={`/tracking/${b.requestId || b._id}`}
                                className={`${
                                  b.isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                                } text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors text-center w-full`}
                              >
                                Track Live
                              </Link>
                            )}
                            {b.ambulance && (b.ambulance.currentLocation || b.ambulance.latitude != null || b.ambulance.longitude != null) && (
                              <a
                                href={getGoogleMapsUrl(b)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors text-center w-full flex items-center justify-center gap-1"
                              >
                                <Navigation size={12} />
                                Navigation
                              </a>
                            )}
                            <button
                              onClick={() => {
                                if (b.type === "emergency") {
                                  handleEmergencyCancel(b._id);
                                } else {
                                  handleCancel(b._id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 text-xs font-bold underline"
                            >
                              {b.type === "emergency" ? "Cancel Emergency" : "Cancel Booking"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </>
  );
}

function StatCard({ label, value, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-5 rounded-2xl border shadow-sm transition-colors ${
        isActive
          ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/80"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-3xl font-bold mt-1 ${
          isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </p>
    </button>
  );
}