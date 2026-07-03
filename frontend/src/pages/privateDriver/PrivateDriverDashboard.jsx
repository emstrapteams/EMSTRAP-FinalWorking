import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import LiveTrackingMap from "../../components/map/LiveTrackingMap";
import toast from "react-hot-toast";
import logo from "../../assets/logo.png";
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Ambulance,
  Radar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ClipboardList,
  Inbox,
  ChevronRight,
  Bell,
  User,
  LogOut,
  Moon,
  Sun,
  Camera,
  Navigation,
  Flag,
  Clock,
  TrendingUp,
  IndianRupee,
} from "lucide-react";
import { declineBooking } from "../../services/api";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:     { label: "Pending",      color: "text-yellow-600 dark:text-yellow-400",  bg: "bg-yellow-50 dark:bg-yellow-950/20",   border: "border-yellow-200 dark:border-yellow-800" },
  ACCEPTED:    { label: "Accepted",     color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-950/20",       border: "border-blue-200 dark:border-blue-800" },
  ARRIVED:     { label: "Arrived",      color: "text-indigo-600 dark:text-indigo-400",  bg: "bg-indigo-50 dark:bg-indigo-950/20",  border: "border-indigo-200 dark:border-indigo-800" },
  IN_PROGRESS: { label: "In Progress",  color: "text-green-600 dark:text-green-400",    bg: "bg-green-50 dark:bg-green-950/20",     border: "border-green-200 dark:border-green-800" },
  COMPLETED:   { label: "Completed",    color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800" },
  CANCELLED:   { label: "Cancelled",    color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/20",         border: "border-red-200 dark:border-red-800" },
};

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ activeTab, setActiveTab, onHistoryClick, user, onToggleStatus, onLogout }) {
  const isLive = user?.driverStatus === "LIVE";
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(
    () => localStorage.getItem(`profileImage_${user?._id}`) || null
  );
  const fileInputRef = useRef(null);

  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    setProfileImage(localStorage.getItem(`profileImage_${user?._id}`) || null);
  }, [user?._id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setProfileImage(url);
      localStorage.setItem(`profileImage_${user?._id}`, url);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setProfileImage(null);
    localStorage.removeItem(`profileImage_${user?._id}`);
  };

  const handleDarkMode = () => {
    const nowDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", nowDark ? "dark" : "light");
    setIsDark(nowDark);
    setProfileOpen(false);
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || "D";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 sm:px-6 gap-4 shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      {/* Logo */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <a href="/" className="flex items-center shrink-0">
          <img src={logo} alt="EMSTRAP" className="h-10 w-auto object-contain" />
        </a>
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 shrink-0 hidden sm:block" />
      </div>

      {/* Nav tabs */}
      <nav className="flex items-center gap-1 justify-center shrink-0">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "dashboard"
              ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <button
          onClick={onHistoryClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "history"
              ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Trip History</span>
        </button>
      </nav>

      {/* Right side */}
      <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
        {/* Online / Offline pill */}
        <button
          onClick={onToggleStatus}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            isLive
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
              : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
          }`}
        >
          <span className={`h-2 w-2 rounded-full shrink-0 ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
          <span className="hidden md:inline">{isLive ? "Online" : "Offline"}</span>
        </button>

        {/* Bell */}
        <button className="relative h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-gray-950" />
        </button>

        {/* Avatar */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="h-9 w-9 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:bg-red-600 transition-colors overflow-hidden border-2 border-white dark:border-gray-800 shadow-md"
          >
            {profileImage
              ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              : initial}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-[9999]">
              <div className="px-4 pt-4 pb-3 flex items-start gap-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div
                  className="relative group shrink-0 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-base overflow-hidden ring-2 ring-red-500/20">
                    {profileImage
                      ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      : <span className="text-sm">{initial}</span>}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name || "Driver"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email || ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => { fileInputRef.current?.click(); setProfileOpen(false); }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" /> Change photo
                    </button>
                    {profileImage && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <button
                          onClick={handleRemoveImage}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { setProfileOpen(false); navigate("/profile"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                >
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={handleDarkMode}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                >
                  {isDark
                    ? <><Sun className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" /><span>Light mode</span></>
                    : <><Moon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" /><span>Dark mode</span></>}
                </button>

                <button
                  onClick={() => { setProfileOpen(false); onLogout?.(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors font-semibold border-t border-gray-100 dark:border-gray-800 mt-1 pt-2"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ─── Trip Detail Modal ────────────────────────────────────────────────────────

function TripDetailModal({ trip, onClose }) {
  if (!trip) return null;
  const payment = getPaymentInfo(trip);
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Trip Details</h2>
                <p className="text-xs opacity-80 mt-0.5">ID: #{trip._id?.slice(-8).toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {/* Status + Date */}
          <div className="flex gap-3">
            <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <StatusBadge status={trip.status} />
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{new Date(trip.createdAt).toLocaleDateString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{new Date(trip.createdAt).toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Payment */}
          <div className={`border rounded-xl p-3 flex items-center justify-between gap-3 ${
            payment.isPaid
              ? "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30"
              : "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
          }`}>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment</p>
              <span className={`text-xs font-extrabold flex items-center gap-1 ${
                payment.isPaid ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
              }`}>
                {payment.isPaid ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                {payment.isPaid ? "Paid" : "Unpaid"}
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Method: {payment.method}</p>
            </div>
            {trip.estimatedPrice != null && (
              <p className="text-sm font-black text-gray-800 dark:text-gray-100 flex items-center gap-0.5">
                <IndianRupee className="w-3.5 h-3.5" />{trip.estimatedPrice}
              </p>
            )}
          </div>

          {/* Route */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Route</p>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-green-100 dark:bg-green-950/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Pickup</p>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 mt-0.5">
                  {trip.pickupLocation?.address || "Address not recorded"}
                </p>
              </div>
            </div>
            <div className="ml-3.5 w-px h-5 bg-gradient-to-b from-green-400 to-red-400 my-1 opacity-50" />
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-red-100 dark:bg-red-950/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Flag className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Dropoff</p>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 mt-0.5">
                  {trip.dropoffLocation?.address || "Address not recorded"}
                </p>
              </div>
            </div>
          </div>

          {/* Ambulance type + distance */}
          <div className="flex gap-3">
            <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</p>
              <p className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300">{trip.ambulanceType || "BASIC"}</p>
            </div>
            {trip.distanceKm != null && (
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Distance</p>
                <p className="text-xs font-extrabold text-gray-800 dark:text-gray-100">{trip.distanceKm} km</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment helper ───────────────────────────────────────────────────────────

function getPaymentInfo(booking) {
  const isPaid = !!booking?.transactionId;
  const method = booking?.paymentMethod || (isPaid ? "Online" : "Cash");
  return { isPaid, method };
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function PrivateDriverDashboard() {
  const { user, loginUser, logoutUser } = useAuth();
  const navigate = useNavigate();

  // Booking state
  const [pendingBookings, setPendingBookings] = useState([]);
  const [acceptedBookings, setAcceptedBookings] = useState([]);
  const [historyBookings, setHistoryBookings] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Map/location state
  const [driverLocation, setDriverLocation] = useState(null);
  const watchIdRef = useRef(null);

  // Socket
  const socketRef = useRef(null);

  const alarmRef = useRef(
    new Audio("/sounds/private-driver-alert.mp3")
  );
  useEffect(() => {
    alarmRef.current.loop = true;
    alarmRef.current.volume = 1;
  }, []);
  const busyRef = useRef(false);

  // ── Derived: current active assignment (ACCEPTED / ARRIVED / IN_PROGRESS) ──
  const currentAssignment = acceptedBookings.find((b) =>
    ["ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(b.status)
  ) || null;

  useEffect(() => {
    busyRef.current = !!currentAssignment;
  }, [currentAssignment]);

  // ── Map destination based on status ──
  const mapDestination = currentAssignment
    ? currentAssignment.status === "IN_PROGRESS"
      ? {
          lat: currentAssignment.dropoffLocation?.latitude,
          lng: currentAssignment.dropoffLocation?.longitude,
        }
      : {
          lat: currentAssignment.pickupLocation?.latitude,
          lng: currentAssignment.pickupLocation?.longitude,
        }
    : null;

  // ── Fetch dashboard data (pending + accepted) ──
  const fetchDashboard = async () => {
    try {
      const [availableRes, dashRes] = await Promise.all([
        API.get("/api/bookings/available"),
        API.get("/api/bookings/driver/dashboard"),
      ]);
      setPendingBookings(availableRes.data.data || []);
      setAcceptedBookings(dashRes.data.data?.accepted || []);
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    }
  };

  // ── Fetch full history ──
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await API.get("/api/bookings/driver/dashboard");
      setHistoryBookings(res.data.data?.accepted || []);
    } catch (error) {
      toast.error("Failed to load trip history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── GPS tracking ──
  const startGPSTracking = () => {
    if (!navigator.geolocation || watchIdRef.current) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(loc);
        if (socketRef.current && currentAssignment) {
          socketRef.current.emit("update_location", {
            requestId: currentAssignment._id,
            ...loc,
          });
        }
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  };

  const stopGPSTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setDriverLocation(null);
  };

  const startEmergencyAlert = async () => {
    try {
      alarmRef.current.currentTime = 0;
      await alarmRef.current.play();
    } catch (err) {
      console.log(err);
    }
  };

  const stopEmergencyAlert = () => {
    alarmRef.current.pause();
    alarmRef.current.currentTime = 0;

    if ("vibrate" in navigator) {
      navigator.vibrate(0);
    }
  };

  useEffect(() => {

    if (
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }

    fetchDashboard();

    const interval = setInterval(fetchDashboard, 5000);

    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on("new_booking_request", (data) => {

      fetchDashboard();

      if (!busyRef.current) {

        startEmergencyAlert(); // your private-driver MP3

        if (Notification.permission === "granted") {
          new Notification("🚑 New Booking Request", {
            body: "A new ambulance booking has been assigned to you.",
            icon: "/logo.png",
            badge: "/logo.png",
            requireInteraction: true,
          });
        }

        if ("vibrate" in navigator) {
          navigator.vibrate([500, 300, 500]);
        }
      }
    });
    socket.on("booking_declined", () => {
      fetchDashboard();
    });
    
    return () => {
      clearInterval(interval);
      stopEmergencyAlert();
      socket.disconnect();
      stopGPSTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join/leave driver room on status change
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user) return;
    console.log("ROLE:", user.role);
    console.log("STATUS:", user.driverStatus);
    if (user.driverStatus === "LIVE") {
      socket.emit("join_private_driver", {});
      fetchDashboard();
    } else {
      socket.emit("leave_private_driver", {});
      setPendingBookings([]);
    }
  }, [user?.driverStatus]);

  // Start GPS when there's an active assignment
  useEffect(() => {
    if (currentAssignment && !watchIdRef.current) {
      startGPSTracking();
    } else if (!currentAssignment && watchIdRef.current) {
      stopGPSTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAssignment?._id]);

  // ── Booking actions ──
  const handleAccept = async (bookingId) => {
    try {
      await API.put(`/api/bookings/${bookingId}/accept`);
      stopEmergencyAlert();
      toast.success("Booking accepted! Navigate to pickup location.");
      fetchDashboard();
    } catch {
      toast.error("Failed to accept booking");
    }
  };

  const handleArrived = async () => {
    if (!currentAssignment) return;
    try {
      await API.put(`/api/bookings/${currentAssignment._id}/arrive`);
      toast.success("Marked as arrived at pickup location");
      fetchDashboard();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleStartTrip = async () => {
    if (!currentAssignment) return;
    try {
      await API.put(`/api/bookings/${currentAssignment._id}/start`);
      toast.success("Trip started — navigate to dropoff location");
      fetchDashboard();
    } catch {
      toast.error("Failed to start trip");
    }
  };

  const handleCompleteTrip = () => {
    if (!currentAssignment) return;
    toast(
      (t) => (
        <div className="flex flex-col gap-3 min-w-[250px]">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">Complete this trip?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Confirm you have reached the destination.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Not Yet
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); processCompleteTrip(); }}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-colors"
            >
              Yes, Complete
            </button>
          </div>
        </div>
      ),
      { duration: 6000, position: "top-center" }
    );
  };

  const processCompleteTrip = async () => {
    const tid = toast.loading("Completing trip...");
    try {
      await API.put(`/api/bookings/${currentAssignment._id}/complete`);
      toast.success("Trip completed! You are now available for new requests.", { id: tid });
      stopGPSTracking();
      fetchDashboard();
      stopEmergencyAlert();
    } catch {
      toast.error("Failed to complete trip", { id: tid });
    }
  };

  // ── Driver status toggle ──
  const handleToggleStatus = async () => {
    const newStatus = user?.driverStatus === "LIVE" ? "OFFLINE" : "LIVE";
    const tid = toast.loading(`Switching to ${newStatus}...`);
    try {
      const res = await API.put("/auth/profile", { driverStatus: newStatus });
      if (res.data?.user) {
        if (newStatus === "OFFLINE") {
          stopEmergencyAlert();
        }
        loginUser({ ...user, driverStatus: res.data.user.driverStatus });
        toast.success(`You are now ${newStatus}`, { id: tid });
      }
    } catch {
      toast.error("Failed to update status", { id: tid });
    }
  };

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch { /* ignore */ }
    stopEmergencyAlert();

    logoutUser?.();
  };

  // ── History filtering ──
  const filteredHistory = (() => {
    if (historyFilter === "all") return historyBookings;
    if (historyFilter === "completed") return historyBookings.filter((b) => b.status === "COMPLETED");
    if (historyFilter === "cancelled") return historyBookings.filter((b) => b.status === "CANCELLED");
    return historyBookings;
  })();

  // ── Step descriptions for active assignment ──
  const getStepDescription = (status) => {
    switch (status) {
      case "ACCEPTED":    return { title: "Navigate to Pickup", subtitle: "Head to the patient's pickup location", icon: Navigation, color: "text-blue-600 dark:text-blue-400" };
      case "ARRIVED":     return { title: "Arrived at Pickup", subtitle: "You have reached the pickup location. Start the trip when ready.", icon: CheckCircle2, color: "text-indigo-600 dark:text-indigo-400" };
      case "IN_PROGRESS": return { title: "Trip In Progress", subtitle: "Navigate to the dropoff destination", icon: Flag, color: "text-green-600 dark:text-green-400" };
      default:            return { title: "Active Trip", subtitle: "", icon: Ambulance, color: "text-gray-600 dark:text-gray-400" };
    }
  };

  // ── Render ──
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onHistoryClick={() => { setActiveTab("history"); fetchHistory(); }}
        user={user}
        onToggleStatus={handleToggleStatus}
        onLogout={handleLogout}
      />

      <div className="flex-1 overflow-hidden pt-16 flex flex-col">

        {/* ── DASHBOARD TAB ── */}
        {activeTab === "dashboard" && (
          <div className="flex h-full w-full overflow-hidden flex-col sm:flex-row">

            {/* Map */}
            <div className="flex-1 sm:w-[65%] h-[45vh] sm:h-full relative border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800">
              <LiveTrackingMap
                userLocation={mapDestination?.lat ? mapDestination : null}
                driverLocation={driverLocation}
                height="100%"
              />

              {/* Map overlay: status indicator */}
              {currentAssignment && (
                <div className="absolute top-3 left-3 z-[500] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {currentAssignment.status === "ACCEPTED" && "En Route to Pickup"}
                    {currentAssignment.status === "ARRIVED" && "At Pickup Location"}
                    {currentAssignment.status === "IN_PROGRESS" && "Trip In Progress"}
                  </span>
                </div>
              )}
            </div>

            {/* Sidebar Panel */}
            <div className="sm:w-[35%] h-[55vh] sm:h-full bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
              <div className="flex-grow overflow-y-auto p-3 sm:p-4 space-y-4">

                {/* ── Active Assignment Card ── */}
                {currentAssignment && (() => {
                  const step = getStepDescription(currentAssignment.status);
                  const StepIcon = step.icon;
                  return (
                    <div className="bg-white dark:bg-gray-900 border-2 border-indigo-500 dark:border-indigo-400 rounded-2xl overflow-hidden shadow-md">
                      {/* Card header */}
                      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Ambulance className="w-4 h-4 text-white" />
                          <span className="text-white font-extrabold text-[10px] uppercase tracking-widest">Active Trip</span>
                        </div>
                        <StatusBadge status={currentAssignment.status} />
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Step description */}
                        <div className={`flex items-start gap-3 p-3 rounded-xl border ${STATUS_CONFIG[currentAssignment.status]?.bg} ${STATUS_CONFIG[currentAssignment.status]?.border}`}>
                          <StepIcon className={`w-5 h-5 shrink-0 mt-0.5 ${step.color}`} />
                          <div>
                            <p className={`text-xs font-extrabold ${step.color}`}>{step.title}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{step.subtitle}</p>
                          </div>
                        </div>

                        {/* Pickup / Dropoff */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-600" />
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Pickup</p>
                              <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                                {currentAssignment.pickupLocation?.address || "Location not available"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Flag className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Dropoff</p>
                              <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                                {currentAssignment.dropoffLocation?.address || "Location not available"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Fare */}
                        {currentAssignment.estimatedPrice != null && (
                          <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800 px-3 py-2 rounded-xl">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" /> Estimated Fare
                            </span>
                            <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                              ₹{currentAssignment.estimatedPrice}
                            </span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 pt-1">
                          {currentAssignment.status === "ACCEPTED" && (
                            <button
                              onClick={handleArrived}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Mark Arrived at Pickup
                            </button>
                          )}

                          {currentAssignment.status === "ARRIVED" && (
                            <button
                              onClick={handleStartTrip}
                              className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                            >
                              <Navigation className="w-4 h-4" /> Start Trip
                            </button>
                          )}

                          {currentAssignment.status === "IN_PROGRESS" && (
                            <button
                              onClick={handleCompleteTrip}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                            >
                              <Flag className="w-4 h-4" /> Complete Trip
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Incoming Bookings ── */}
                <div>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Radar className="w-4 h-4" />
                    Incoming Bookings ({pendingBookings.filter((b) => b.status === "PENDING").length})
                  </h3>

                  {pendingBookings.filter((b) => b.status === "PENDING").length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
                      <Radar className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Scanning for bookings...</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        Stay online to receive booking requests in real‑time.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingBookings
                        .filter((b) => b.status === "PENDING")
                        .map((booking) => {
                          const payment = getPaymentInfo(booking);
                          return (
                            <div key={booking._id} className="bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-2xl shadow-md overflow-hidden">
                              {/* Booking card header */}
                              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 flex items-center justify-center gap-1 text-white font-extrabold tracking-widest text-[9px] uppercase">
                                <Calendar className="w-3 h-3" />
                                Booking Request
                              </div>

                              <div className="p-3 space-y-2">
                                {/* Ambulance type + price */}
                                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-2.5 py-2 rounded-xl">
                                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase">
                                    <Ambulance className="w-3.5 h-3.5 shrink-0" />
                                    {booking.ambulanceType || "BASIC"}
                                  </span>
                                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-0.5">
                                    <IndianRupee className="w-3 h-3" />
                                    {booking.estimatedPrice ?? "—"}
                                  </span>
                                </div>

                                {/* Payment badge */}
                                <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border ${
                                  payment.isPaid
                                    ? "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30"
                                    : "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
                                }`}>
                                  <span className={`text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                                    payment.isPaid ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                                  }`}>
                                    {payment.isPaid ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                    {payment.isPaid ? "Paid" : "Unpaid"}
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">{payment.method}</span>
                                </div>

                                {/* Pickup / Dropoff */}
                                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-xl text-[11px] border border-gray-100 dark:border-gray-700 space-y-1.5">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-600" />
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      {booking.pickupLocation?.address || "Pickup not specified"}
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Flag className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      {booking.dropoffLocation?.address || "Dropoff not specified"}
                                    </span>
                                  </div>
                                </div>

                                {/* Distance */}
                                {booking.distanceKm != null && (
                                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> {booking.distanceKm} km
                                  </p>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await declineBooking(booking._id);

                                        stopEmergencyAlert();

                                        fetchDashboard();

                                        toast.success("Booking declined.");
                                      } catch (err) {
                                        console.error(err);
                                        toast.error("Failed to decline booking.");
                                      }
                                    }}
                                    
                                    className="flex-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-xl font-bold text-xs transition-colors border border-gray-200 dark:border-gray-700"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    onClick={() => handleAccept(booking._id)}
                                    className="flex-[2] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-90 text-white py-2 rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 transition-all"
                                  >
                                    ACCEPT
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className="h-full w-full bg-gray-50 dark:bg-gray-950 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">

              {/* Header */}
              <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Trip History</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All your completed and cancelled booking trips.</p>
                </div>
                <button
                  onClick={fetchHistory}
                  className="self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl max-w-sm overflow-x-auto">
                {[
                  { key: "all",       label: "All",       count: historyBookings.length },
                  { key: "completed", label: "Completed", count: historyBookings.filter((b) => b.status === "COMPLETED").length },
                  { key: "cancelled", label: "Cancelled", count: historyBookings.filter((b) => b.status === "CANCELLED").length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setHistoryFilter(key)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all whitespace-nowrap ${
                      historyFilter === key
                        ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              {/* History list */}
              {historyLoading ? (
                <div className="flex justify-center py-20 items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Loading history...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center p-12 text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Inbox className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">No trips found for "{historyFilter}"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .map((booking) => {
                      const payment = getPaymentInfo(booking);
                      return (
                        <div
                          key={booking._id}
                          className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all"
                        >
                          {/* Top row */}
                          <div className="flex justify-between items-start mb-3">
                            <StatusBadge status={booking.status} />
                            <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(booking.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {/* Locations */}
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-600" />
                              <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block">Pickup</span>
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                                  {booking.pickupLocation?.address || "Not recorded"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Flag className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                              <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block">Dropoff</span>
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                                  {booking.dropoffLocation?.address || "Not recorded"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom row */}
                          <div className="pt-2.5 border-t border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              {booking.estimatedPrice != null && (
                                <span className="text-xs font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-0.5">
                                  <IndianRupee className="w-3.5 h-3.5" />{booking.estimatedPrice}
                                </span>
                              )}
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                                payment.isPaid
                                  ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                                  : "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
                              }`}>
                                {payment.isPaid ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertTriangle className="w-3 h-3 shrink-0" />}
                                {payment.isPaid ? "Paid" : "Unpaid"}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedTrip(booking)}
                              className="shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90 transition-all shadow-sm flex items-center gap-1"
                            >
                              Details <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Trip Detail Modal ── */}
      {selectedTrip && (
        <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}
    </div>
  );
}