import { useEffect, useState } from "react";
import API from "../../services/api";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { API_URL } from "../../services/api";

export default function UserDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const stats = {
    total: bookings.length,
    active: bookings.filter((b) =>
      ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(b.status)
    ).length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  const activeBooking = bookings.find((b) =>
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(b.status)
  );
  const fetchBookings = async () => {
    try {
      const res = await API.get("/api/bookings");
      setBookings(res.data.data);
    } catch (err) {
      console.error("Failed to fetch bookings");
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

  return (
    <>
      <Navbar />
      <Container>
        <div className="py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                Welcome Back 👋
              </h1>

              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Manage bookings, track ambulances and monitor emergency requests.
              </p>
            </div>

            <div className="flex gap-3">
              {user ? (
                <Link
                  to="/booking"
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg"
                >
                  + New Booking
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg"
                >
                  Login to Book
                </Link>
              )}

              <Link
                to="/"
                className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-5 py-3 rounded-2xl font-bold"
              >
                Emergency SOS
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="w-12 h-2 rounded-full bg-blue-500" />
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mt-4">
              Total Bookings
            </p>
            <p className="text-6xl font-black tracking-tighter mt-3">
              {stats.total}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="w-12 h-2 rounded-full bg-yellow-500" />
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mt-4">
              Active
            </p>
            <p className="text-6xl font-black tracking-tighter mt-3">
              {stats.active}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="w-12 h-2 rounded-full bg-green-500" />
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mt-4">
              Completed
            </p>
            <p className="text-6xl font-black tracking-tighter mt-3">
              {stats.completed}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="w-12 h-2 rounded-full bg-red-500" />
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mt-4">
              Cancelled
            </p>
            <p className="text-6xl font-black tracking-tighter mt-3">
              {stats.cancelled}
            </p>
          </div>

        </div>
        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Quick Actions
          </h2>

          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Frequently used actions for emergencies and bookings.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <Link
            to="/booking"
            className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
          >
            <h3 className="font-black text-xl tracking-tight">🚑 Book Ambulance</h3>
            <p className="text-gray-500 mt-2">
              Schedule a new ambulance ride.
            </p>
          </Link>

          <Link
            to="/"
            className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
          >
            <h3 className="font-black text-xl tracking-tight">🚨 Emergency SOS</h3>
            <p className="text-gray-500 mt-2">
              Request immediate emergency help.
            </p>
          </Link>

          <Link
            to="/profile"
            className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
          >
            <h3 className="font-black text-xl tracking-tight">👤 My Profile</h3>
            <p className="text-gray-500 mt-2">
              Manage your personal details.
            </p>
          </Link>

        </div>
        <div className="h-2" />
        {/* Active Booking */}
        {activeBooking && (
          <div className="mb-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-2xl">

            <p className="uppercase tracking-widest text-xs font-black opacity-80">
              Active Request
            </p>

            <h2 className="text-3xl font-black mt-2">
              {activeBooking.ambulanceType}
            </h2>

            <p className="opacity-90 mt-2">
              Status: {activeBooking.status}
            </p>

            {activeBooking.requestId && (
              <div className="mt-6">
                <Link
                  to={
                    activeBooking.isEmergency
                      ? "/emergency"
                      : `/tracking/${activeBooking.requestId}`
                  }
                  className="bg-white text-indigo-700 px-5 py-3 rounded-2xl font-bold"
                >
                  Track Live
                </Link>
              </div>
            )}

          </div>
        )}
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Recent Bookings
          </h2>

          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Your latest ambulance requests and emergency activity.
          </p>
        </div>
        
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading bookings...</p>
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {bookings.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-16 text-center">

                  <div className="text-6xl mb-4">
                    🚑
                  </div>

                  <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">
                    No Bookings Yet
                  </h3>

                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Create your first ambulance booking in seconds.
                  </p>

                  <Link
                    to="/booking"
                    className="inline-flex bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold"
                  >
                    Create Booking
                  </Link>

                </div>
            ) : (
              bookings.map((b) => (
                <div
                  key={b._id}
                  className="
    bg-white dark:bg-gray-900
    rounded-3xl
    p-6
    border border-gray-200 dark:border-gray-800
    shadow-xl
    hover:-translate-y-1
    hover:shadow-2xl
    transition-all duration-300
    flex flex-col lg:flex-row
    justify-between
    gap-6
  "
                >
                  <div>
                    <p className="text-xs font-black tracking-widest uppercase text-gray-400 mb-2">
                      Booking #{String(b._id).slice(-6).toUpperCase()}
                    </p>

                    <h3
                      className={`text-xl font-black tracking-tight ${b.isEmergency
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-gray-100"
                        }`}
                    >
                      {b.ambulanceType} {b.isEmergency ? "⚠️" : "Ambulance"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      From: {b.pickupLocation?.address || "Selected Location"} <br />
                      {!b.isEmergency && `To: ${b.dropoffLocation?.address || "Selected Hospital"}`}
                    </p>
                    {b.distanceKm && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Distance: {b.distanceKm} km
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                        Price
                      </p>

                      <p className="text-3xl font-black text-gray-900 dark:text-white">
                        {b.estimatedPrice > 0 ? `₹${b.estimatedPrice}` : "FREE"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${b.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : b.status === "COMPLETED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : b.status === "CANCELLED"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                      >
                        {b.status}
                      </span>
                       
                      {b.status === "PENDING" || b.status === "ACCEPTED" || b.status === "IN_PROGRESS" ? (
                        <div className="flex flex-col items-end gap-2">
                          {(b.status === "PENDING" || b.status === "ACCEPTED" || b.status === "IN_PROGRESS") && b.requestId && (
                            <Link
                              to={b.isEmergency ? `/emergency` : `/tracking/${b.requestId}`}
                              className={`${b.isEmergency ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors text-center w-full`}
                            >
                              Track Live
                            </Link>
                          )}
                          <button
                            onClick={() => handleCancel(b._id)}
                            className="text-red-600 hover:text-red-700 text-xs font-bold underline"
                          >
                            Cancel Booking
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Container>
    </>
  );
}
