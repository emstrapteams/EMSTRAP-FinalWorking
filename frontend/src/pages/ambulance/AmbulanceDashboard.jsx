import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import {
  getDriverHistory, acceptEmergency, declineEmergency, cancelEmergency,
  getHospitals, getAvailableHospitals, assignHospital, completeEmergencyAPI, markArrivedAPI
} from "../../services/api";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import LiveTrackingMap from "../../components/map/LiveTrackingMap";
import toast from "react-hot-toast";
import logo from "../../assets/logo.png";
import {
  LayoutDashboard, Calendar, MapPin, Hospital, Siren, Ambulance,
  Flag, Radar, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  X, ClipboardList, Phone, Inbox, ChevronRight, Bell,
  User, LogOut, Moon, Sun, Camera,
} from "lucide-react";
import EvidenceImageViewer from "../../components/common/EvidenceImageViewer";
// ─── Fixed Header ─────────────────────────────────────────────────────────────

function Header({ activeTab, setActiveTab, onHistoryClick, user, onToggleStatus, onLogout }) {
  const isLive = user?.driverStatus === "LIVE";
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // ── Profile image state (persisted per user in localStorage) ──
  const [profileImage, setProfileImage] = useState(
    () => localStorage.getItem(`profileImage_${user?._id}`) || null
  );
  const fileInputRef = useRef(null);

  // ── Dark mode state — read from DOM so it stays in sync with Navbar ──
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  // Re-sync image when user changes
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

      {/* Hidden file input for profile photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      {/* Left: Logo */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <a href="/" className="flex items-center shrink-0">
          <img src={logo} alt="AmbuGo" className="h-10 w-auto object-contain" />
        </a>
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 shrink-0 hidden sm:block" />
      </div>

      {/* Center: Nav tabs */}
      <nav className="flex items-center gap-1 justify-center shrink-0">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "dashboard"
              ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === "dashboard" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <button
          onClick={onHistoryClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "history"
              ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Calendar className={`w-4 h-4 shrink-0 ${activeTab === "history" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`} />
          <span className="hidden sm:inline">Booking History</span>
        </button>
      </nav>

      {/* Right: status pill + bell + avatar */}
      <div className="flex items-center justify-end gap-2 flex-1 min-w-0">

        {/* Online/Offline pill */}
        <button
          onClick={onToggleStatus}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            isLive
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100"
              : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200"
          }`}
        >
          <span className={`h-2 w-2 rounded-full shrink-0 ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
          <span className="hidden md:inline">{isLive ? "Online" : "Offline"}</span>
        </button>

        {/* Bell */}
        <button
          className="relative h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-gray-950" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="h-9 w-9 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer select-none hover:bg-red-600 transition-colors overflow-hidden border-2 border-white dark:border-gray-800 shadow-md"
            aria-label="Profile menu"
          >
            {profileImage
              ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              : initial}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-[9999]">

              {/* User info */}
              <div className="px-4 pt-4 pb-3 flex items-start gap-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                {/* Clickable avatar */}
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

              {/* Menu items */}
              <div className="p-1.5 space-y-0.5">
                {/* Profile */}
                <button
                  onClick={() => { setProfileOpen(false); navigate("/profile"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                >
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>Profile</span>
                </button>

                {/* Dark / Light mode toggle — label reflects CURRENT state */}
                <button
                  onClick={handleDarkMode}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                >
                  {isDark
                    ? <><Sun className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" /><span>Light mode</span></>
                    : <><Moon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" /><span>Dark mode</span></>
                  }
                </button>

                {/* Logout */}
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AmbulanceDashboard() {
  const { user, loginUser, logoutUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [acceptedHistory, setAcceptedHistory] = useState([]);
  const [socket, setSocket] = useState(null);
  const alarmRef = useRef(
    new Audio("/sounds/emergency-alert.mp3")
  );
  const isPageVisible = useRef(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [historyTab, setHistoryTab] = useState("all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [fullHistory, setFullHistory] = useState({ accepted: [], rejected: [], cancelled: [] });
  const [selectedTrip, setSelectedTrip] = useState(null);

  const [hospitalPickerOpen, setHospitalPickerOpen] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [assigningHospital, setAssigningHospital] = useState(false);

  const [driverLocation, setDriverLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const watchIdRef = useRef(null);
  const busyRef = useRef(false);
  const currentAssignment =
    acceptedHistory.find(req =>
      [
        "AMBULANCE_ACCEPTED",
        "ARRIVED_AT_LOCATION",
        "EN_ROUTE_TO_HOSPITAL",
      ].includes(req.status)
    ) || null;
  const EXPIRY_MS = 30 * 60 * 1000;
  useEffect(() => {
    alarmRef.current.loop = true;
    alarmRef.current.volume = 1;
  }, []);
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisible.current = !document.hidden;
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
  }, []);
  const getPaymentInfo = (req) => {
    const transactionId =
      req.transactionId || req.paymentId ||
      req.payment?.transactionId || req.payment?.paymentId ||
      null;
    const amount = req.estimatedPrice ?? req.payment?.amount ?? req.fare ?? null;
    const method = req.paymentMethod || req.payment?.method || (transactionId ? "Online" : "Cash");
    const isPaid = !!transactionId;
    return {
      method,
      amount,
      transactionId,
      status: isPaid ? "PAID" : "UNPAID",
      label: isPaid ? "Paid" : "Unpaid",
    };
  };

  const fetchHistory = async () => {
    try {
      const res = await getDriverHistory();
      setRequests(res.data.ongoing);
      setAcceptedHistory(res.data.accepted);
    } catch {
      toast.error("Failed to load dashboard data");
    }
  };

  const fetchAllHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getDriverHistory("all");
      setFullHistory({
        accepted: res?.data?.accepted || res?.accepted || [],
        rejected: res?.data?.rejected || res?.rejected || [],
        cancelled: res?.data?.cancelled || res?.cancelled || [],
      });
    } catch {
      toast.error("Failed to load history logs");
    } finally {
      setHistoryLoading(false);
    }
  };

  const startTracking = (id) => {
    if (watchIdRef.current) {
      if (typeof watchIdRef.current === "number" && watchIdRef.current > 1000) clearInterval(watchIdRef.current);
      else navigator.geolocation.clearWatch(watchIdRef.current);
    }
    socket.emit("track_request", { requestId: id });
    socket.on("user_location", (data) => {
      if (data.requestId === id) setUserLocation({ lat: data.lat || data.latitude, lng: data.lng || data.longitude });
    });
    socket.on("emergency_cancelled", (data) => {
      if (data.requestId === id) {
        toast.error("The patient has cancelled the request.");
        stopTracking();
        fetchHistory();
      }
    });
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDriverLocation(loc);
          socket.emit("update_location", { requestId: id, ...loc });
        },
        (err) => console.error("GPS error", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      if (typeof watchIdRef.current === "number" && watchIdRef.current > 1000) clearInterval(watchIdRef.current);
      else navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setDriverLocation(null);
    setUserLocation(null);
    if (socket) { socket.off("user_location"); socket.off("emergency_cancelled"); }
  };

  const startEmergencyAlert = async () => {
    try {
      await alarmRef.current.play();
    } catch (e) {
      console.log("Autoplay blocked");
    }

    if ("vibrate" in navigator) {
      navigator.vibrate([
        500,
        300,
        500,
        300,
        500,
        300,
        500,
      ]);
    }

  };

  const stopEmergencyAlert = () => {
    alarmRef.current.pause();
    alarmRef.current.currentTime = 0;

    if ("vibrate" in navigator) {
      navigator.vibrate(0);
    }
  };
  const showEmergencyNotification = (request) => {

    // Driver is already looking at dashboard
    if (isPageVisible.current) return;

    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") return;

    const notification = new Notification(
      "🚑 EMSTraP Emergency Alert",
      {
        body:
          `${request.aiAnalysis?.severity || "UNKNOWN"} • ${request.aiAnalysis?.predictedClass || "Emergency"
          }`,

        icon: "/logo.png",

        requireInteraction: true,

        silent: false,
      }
    );

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
    fetchHistory();
    const newSocket = io(API_URL, { withCredentials: true });
    setSocket(newSocket);
    newSocket.on("new_emergency_request", (data) => {

      console.log("New request received:", data);

      // If driver is FREE -> play alarm + notification
      if (!busyRef.current) {

        startEmergencyAlert();

        const isEmergency = data.requestType === "EMERGENCY";

        const fareNote =
          !isEmergency && data.estimatedPrice
            ? ` — ₹${data.estimatedPrice}`
            : "";

        toast.success(
          isEmergency
            ? "NEW EMERGENCY ALERT!"
            : `New Ambulance Booking Request!${fareNote}`,
          {
            duration: 6000,
            icon: isEmergency
              ? <Siren className="w-5 h-5 text-red-600" />
              : <Calendar className="w-5 h-5 text-blue-600" />,
          }
        );

        showEmergencyNotification(data);
      }

      // Always add the request to the Incoming Requests list
      setRequests((prev) =>
        prev.find((r) => r._id === data._id)
          ? prev
          : [data, ...prev]
      );
    });
    newSocket.on("emergency_accepted", (data) => {

      stopEmergencyAlert();

      setRequests((prev) =>
        prev.filter(r => r._id !== data.requestId)
      );
    });
    newSocket.on("emergency_cancelled", (data) => {

      stopEmergencyAlert();

      toast.error("Emergency cancelled by user.");

      setRequests((prev) =>
        prev.filter((r) => r._id !== data.requestId)
      );

      setAcceptedHistory((prev) =>
        prev.filter((r) => r._id !== data.requestId)
      );

    });

    return () => {
      newSocket.close();
      if (watchIdRef.current) {
        if (typeof watchIdRef.current === "number" && watchIdRef.current > 1000) clearInterval(watchIdRef.current);
        else navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!socket || !user) return;
    if (user.driverStatus === "LIVE") { socket.emit("join_ambulance", {}); fetchHistory(); }
    else { socket.emit("leave_ambulance", {}); setRequests([]); }
  }, [user?.driverStatus, socket]);

  useEffect(() => {
    if (!socket || acceptedHistory.length === 0) return;
    const active = acceptedHistory.find(r => ["AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION", "EN_ROUTE_TO_HOSPITAL"].includes(r.status));
    if (active && !watchIdRef.current) startTracking(active._id);
  }, [socket, acceptedHistory]);
  useEffect(() => {
    busyRef.current = currentAssignment !== null;
  }, [currentAssignment]);
  useEffect(() => {
    const interval = setInterval(() => {

      const now = Date.now();

      setRequests((prev) => {

        const updated = prev.filter(
          req =>
            (now - new Date(req.createdAt).getTime()) <= EXPIRY_MS
        );

        // If every request expired, stop the alarm
        if (updated.length === 0 && prev.length > 0) {
          stopEmergencyAlert();
        }

        return updated;
      });

    }, 10000);

    return () => clearInterval(interval);

  }, []);

  const handleAccept = async (id) => {
    try {
      const res = await acceptEmergency(id);
      toast.success("Emergency accepted!");
      stopEmergencyAlert();
      setAcceptedHistory((prev) => [res.data || res, ...prev]);

      setRequests((prev) =>
        prev.filter((r) => r._id !== id)
      );
      if (socket) startTracking(id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error accepting request");
      if (error.response?.status === 400) fetchHistory();
    }
  };

  const handleDecline = async (id) => {
    try {
      await declineEmergency(id);
      stopEmergencyAlert();
      toast.success("Request declined");
      setRequests((prev) =>
        prev.filter((r) => r._id !== id)
      );
    } catch { toast.error("Error declining request"); }
  };

  const handleCancelAssignment = () => {
    if (!currentAssignment) return;
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[250px]">
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100">Cancel Assignment?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Are you sure you want to cancel this emergency assignment?</p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">No, Back</button>
          <button onClick={() => { toast.dismiss(t.id); processCancelAssignment(); }} className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors">Yes, Cancel</button>
        </div>
      </div>
    ), { duration: 6000, position: "top-center" });
  };

  const processCancelAssignment = async () => {
    const tid = toast.loading("Cancelling assignment...");
    try {
      await cancelEmergency(currentAssignment._id);

      stopEmergencyAlert();

      stopTracking();

      await fetchHistory();

      toast.success(
        "Assignment cancelled successfully",
        { id: tid }
      );
    } catch { toast.error("Failed to cancel assignment", { id: tid }); }
  };

  const handleArrived = async () => {
    if (!currentAssignment) return;

    if (currentAssignment.status !== "AMBULANCE_ACCEPTED") {
      return;
    }

    const tid = toast.loading("Marking arrival...");

    try {
      await markArrivedAPI(currentAssignment._id);

      toast.success(
        "Arrival marked! Please select a destination hospital.",
        { id: tid }
      );

      fetchHistory();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to mark arrival",
        { id: tid }
      );
    }
  };

  const openHospitalPicker = async () => {
    setHospitalPickerOpen(true);

    if (hospitals.length === 0) {
      setHospitalLoading(true);

      try {
        const res = await getAvailableHospitals();

        
        setHospitals(
          res?.hospitals ||
          res?.data?.hospitals ||
          []
        );

      } catch (err) {
        console.error("HOSPITAL ERROR:", err);
        toast.error("Failed to load hospitals");
      } finally {
        setHospitalLoading(false);
      }
    }
  };

  const handleAssignHospital = async (hospitalId, hospitalName) => {
    if (!currentAssignment) return;
    setAssigningHospital(true);
    try {
      await assignHospital(currentAssignment._id, hospitalId);
      toast.success(`Hospital "${hospitalName}" assigned and notifications sent!`);
      setHospitalPickerOpen(false); fetchHistory();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to assign hospital"); }
    finally { setAssigningHospital(false); }
  };

  const handleCompleteRide = () => {
    if (!currentAssignment) return;
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[250px]">
        <div>
          <p className="font-bold text-gray-900">End this ride?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Confirm if you have reached the destination.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Not Yet</button>
          <button onClick={() => { toast.dismiss(t.id); processCompleteRide(); }} className="px-4 py-2 text-xs font-bold bg-yellow-500 text-gray-900 rounded-xl shadow-lg shadow-yellow-500/20 hover:bg-yellow-600 transition-colors">Yes, End Ride</button>
        </div>
      </div>
    ), { duration: 6000, position: "top-center" });
  };

  const processCompleteRide = async () => {
    const tid = toast.loading("Completing trip...");
    try {
      await completeEmergencyAPI(currentAssignment._id);

      stopTracking();

      await fetchHistory();

      toast.success(
        "Trip completed! You are now available for new requests.",
        { id: tid }
      );
    } catch { toast.error("Failed to complete trip", { id: tid }); }
  };

  const handleToggleStatus = async () => {
    const newStatus = user?.driverStatus === "LIVE" ? "OFFLINE" : "LIVE";
    const tid = toast.loading(`Switching to ${newStatus}...`);
    try {
      const res = await API.put("/auth/profile", { driverStatus: newStatus });
      if (res.data?.user) {
        loginUser({ ...user, driverStatus: res.data.user.driverStatus });
        toast.success(`You are now ${newStatus}`, { id: tid });
      }
    } catch { toast.error("Failed to update status", { id: tid }); }
  };

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch {
      /* ignore */
    }

    stopEmergencyAlert();

    logoutUser?.();
  };
  const getSeverityPriority = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return 1;
      case "HIGH":
        return 2;
      case "MODERATE":
        return 3;
      case "LOW":
        return 4;
      default:
        return 5;
    }
  };

  const sortedRequests = [...requests].sort((a, b) => {
    const aPriority = getSeverityPriority(a.aiAnalysis?.severity);
    const bPriority = getSeverityPriority(b.aiAnalysis?.severity);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">

      {/* ── Fixed Header ── */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onHistoryClick={() => { setActiveTab("history"); fetchAllHistory(); }}
        user={user}
        onToggleStatus={handleToggleStatus}
        onLogout={handleLogout}
      />

      {/* ── Page content below fixed header ── */}
      <div className="flex-1 overflow-hidden pt-16 flex flex-col">

        {activeTab === "dashboard" ? (

          /* ── DASHBOARD VIEW: Map + Alerts Panel ── */
          <div className="flex h-full w-full overflow-hidden flex-col sm:flex-row">

            {/* Map */}
            <div className="flex-1 sm:w-[70%] h-[50vh] sm:h-full relative border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800">
              <LiveTrackingMap
                userLocation={userLocation || (currentAssignment ? {
                  lat: currentAssignment.location?.latitude,
                  lng: currentAssignment.location?.longitude,
                } : null)}
                driverLocation={driverLocation}
                height="100%"
              />
            </div>

            {/* Alerts Panel */}
            <div className="sm:w-[30%] h-[50vh] sm:h-full bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden border-t sm:border-t-0 border-gray-200 dark:border-gray-800">
              <div className="flex-grow overflow-y-auto p-3 sm:p-4 space-y-4">

                {/* Active Assignment */}
                {currentAssignment && (
                  <div className="bg-white dark:bg-gray-900 border-2 border-indigo-500 rounded-2xl p-4 shadow-md overflow-hidden relative">
                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-black tracking-widest px-3 py-1 uppercase rounded-bl-xl">Active Trip</div>
                    <div className="flex items-center gap-2 mb-3 mt-1">
                      <Ambulance className="w-5 h-5" />
                      <h3 className="font-extrabold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                        {currentAssignment?.aiAnalysis && (
                          <div className="mt-2 flex gap-2">

                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                              {currentAssignment.aiAnalysis.predictedClass}
                            </span>

                            <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase">
                              {currentAssignment.aiAnalysis.severity}
                            </span>

                          </div>
                        )}
                        {currentAssignment.requestType === "EMERGENCY" ? "Emergency Mission" : "Scheduled Booking"}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Location State</p>
                        <p className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1.5">
                          {currentAssignment.status === "AMBULANCE_ACCEPTED" ? (
                            <><MapPin className="w-4 h-4 shrink-0" /> En Route to Pickup Site</>
                          ) : currentAssignment.status === "ARRIVED_AT_LOCATION" ? (
                            <><Hospital className="w-4 h-4 shrink-0" /> Arrived at Patient Location</>
                          ) : (
                            <><Hospital className="w-4 h-4 shrink-0" /> Heading to: {currentAssignment.hospital?.name || "Hospital"}</>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          {currentAssignment.status === "AMBULANCE_ACCEPTED"
                            ? "Proceed to the patient location immediately."
                            : currentAssignment.status === "ARRIVED_AT_LOCATION"
                            ? "Please pick up the patient and select destination hospital."
                            : currentAssignment.hospital?.address || "Emergency transport in progress"}
                        </p>
                      </div>

                      {currentAssignment.user && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Patient Info</p>
                          <p className="font-bold text-xs text-gray-800 dark:text-gray-100">{currentAssignment.user.name || "Anonymous Patient"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{currentAssignment.user.mobile || "No phone number listed"}</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 pt-1.5">

                        {currentAssignment.requestType === "EMERGENCY" && (
                          <>
                            {currentAssignment.status === "AMBULANCE_ACCEPTED" && (
                              <button
                                onClick={handleArrived}
                                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                Mark Arrived
                              </button>
                            )}

                            {currentAssignment.status === "ARRIVED_AT_LOCATION" && (
                              <button
                                onClick={openHospitalPicker}
                                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                              >
                                <Hospital className="w-3.5 h-3.5" />
                                {currentAssignment.hospital ? "Change Hospital" : "Select Hospital"}
                              </button>
                            )}

                            {(currentAssignment.status === "EN_ROUTE_TO_HOSPITAL" ||
                              currentAssignment.status === "HOSPITAL_ASSIGNED") && (
                                <button
                                  onClick={handleCompleteRide}
                                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                  Complete Trip
                                </button>
                              )}
                          </>
                        )}

                        {currentAssignment.requestType === "BOOKING" && (
                          <>
                            <button
                              onClick={handleCompleteRide}
                              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              Complete Trip
                            </button>

                            <button
                              onClick={handleCancelAssignment}
                              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-bold text-xs transition-all border border-gray-200 dark:border-gray-700"
                            >
                              Cancel Assignment
                            </button>
                          </>
                        )}

                      </div>
                    </div>
                  </div>
                )}

                {/* Incoming Requests */}
                <div>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                    Incoming Requests ({requests.length})
                  </h3>
                  {requests.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center shadow-sm">
                      <Radar className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Scanning for requests...</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Keep status Online to receive incoming emergency dispatches in real-time.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                        {sortedRequests.map((req) => {
                        const payment = getPaymentInfo(req);
                        return (
                          <div key={req._id} className={`bg-white dark:bg-gray-900 border-2 ${req.requestType === "EMERGENCY" ? "border-red-500" : "border-blue-500"} rounded-2xl shadow-md overflow-hidden flex flex-col`}>
                            <div className={`${req.requestType === "EMERGENCY" ? "bg-gradient-to-r from-red-500 to-rose-600 animate-pulse" : "bg-gradient-to-r from-blue-500 to-indigo-600"} px-3 py-1.5 flex items-center justify-center gap-1 text-white font-extrabold tracking-widest text-[9px] uppercase`}>
                              {req.requestType === "EMERGENCY" ? <>
                                <Siren className="w-3 h-3" />
                                {req.aiAnalysis?.predictedClass
                                  ? req.aiAnalysis.predictedClass.replace("_", " ").toUpperCase()
                                  : "NEW EMERGENCY"}
                              </> : <><Calendar className="w-3 h-3" /> Scheduled Booking</>}
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-between">
                              <div>
                                <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200 mb-2">
                                  {req.requestType === "EMERGENCY" ? "Patient needs immediate ambulance evacuation!" : "Ambulance trip reservation request"}
                                </p>
                                {req.aiAnalysis && (
                                  <div className="flex flex-wrap gap-2 mb-3">

                                    <span
                                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase
      ${req.aiAnalysis.severity === "CRITICAL"
                                          ? "bg-red-100 text-red-700 border border-red-300"
                                          : req.aiAnalysis.severity === "HIGH"
                                            ? "bg-orange-100 text-orange-700 border border-orange-300"
                                            : req.aiAnalysis.severity === "MODERATE"
                                              ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                              : "bg-green-100 text-green-700 border border-green-300"
                                        }`}
                                    >
                                      {req.aiAnalysis.severity}
                                    </span>

                                    <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                                      {(req.aiAnalysis.confidence * 100).toFixed(1)}%
                                    </span>

                                  </div>
                                )}
                                {req.requestType === "BOOKING" && (
                                  <div className="flex items-center justify-between gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-2.5 py-2 rounded-xl mb-2">
                                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-wide">
                                      <Ambulance className="w-3.5 h-3.5 shrink-0" /> {req.ambulanceType || "—"}
                                    </span>
                                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                                      {req.estimatedPrice ? `₹${req.estimatedPrice}` : "—"}
                                    </span>
                                  </div>
                                )}

                                <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl mb-2 border ${
                                  payment.status === "PAID"
                                    ? "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30"
                                    : "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
                                }`}>
                                  <span className={`text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                                    payment.status === "PAID" ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                                  }`}>
                                    {payment.status === "PAID" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                    {payment.label}
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">{payment.method}</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl mb-3">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate font-semibold">Location: [{req.location?.latitude?.toFixed(4)}, {req.location?.longitude?.toFixed(4)}]</span>
                                </div>
                                {req.imageUrl && (
                                  <div className="mb-3">
                                    <EvidenceImageViewer
                                      mainImage={req.imageUrl}
                                      evidence={req.evidence || []}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleDecline(req._id)} className="flex-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-xl font-bold text-xs transition-colors border border-gray-200 dark:border-gray-700">Decline</button>
                                <button
                                  onClick={() => handleAccept(req._id)}
                                  disabled={busyRef.current}
                                  className={`flex-[2] py-2 rounded-xl font-bold text-xs transition-all ${busyRef.current
                                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                                      : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-90 text-white shadow-md shadow-indigo-500/10"
                                    }`}
                                >
                                  {busyRef.current ? "ON TRIP" : "ACCEPT"}
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

        ) : (

          /* ── BOOKING HISTORY VIEW ── */
          <div className="h-full w-full bg-gray-50 dark:bg-gray-950 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Driver Dispatch Logs</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review all your historical accepted, declined, and cancelled bookings.</p>
                </div>
                <button onClick={fetchAllHistory} className="self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-sm transition-all flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
                </button>
              </div>

              <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl max-w-lg overflow-x-auto">
                {["all", "accepted", "rejected", "cancelled"].map((tab) => {
                  const count = tab === "all"
                    ? fullHistory.accepted.length + fullHistory.rejected.length + fullHistory.cancelled.length
                    : fullHistory[tab]?.length || 0;
                  const activeColors = {
                    all: "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm",
                    accepted: "bg-green-500 text-white shadow-sm",
                    rejected: "bg-red-500 text-white shadow-sm",
                    cancelled: "bg-gray-700 text-white shadow-sm"
                  };
                  return (
                    <button key={tab} onClick={() => setHistoryTab(tab)} className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all whitespace-nowrap ${historyTab === tab ? activeColors[tab] : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-20 items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Retrieving logs...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const allLogs = [
                      ...fullHistory.accepted.map(h => ({ ...h, logType: "accepted" })),
                      ...fullHistory.rejected.map(h => ({ ...h, logType: "rejected" })),
                      ...fullHistory.cancelled.map(h => ({ ...h, logType: "cancelled" })),
                    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                    const filtered = historyTab === "all" ? allLogs : allLogs.filter(l => l.logType === historyTab);
                    if (filtered.length === 0) return (
                      <div className="text-center p-12 text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                        <Inbox className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">No historical logs found for "{historyTab}"</p>
                      </div>
                    );
                    return filtered.map((req) => {
                      const payment = getPaymentInfo(req);
                      return (
                        <div key={req._id} className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${req.logType === "accepted" ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400" : req.logType === "rejected" ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400"}`}>{req.logType}</span>
                            <span className="text-[10px] text-gray-400 font-semibold">{new Date(req.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                            Emergency mission request at coordinates:{" "}
                            <span className="font-bold text-gray-900 dark:text-white">[{req.location?.latitude?.toFixed(4)}, {req.location?.longitude?.toFixed(4)}]</span>
                          </p>
                          <div className="mt-3 pt-2.5 border-t border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
                            {req.logType === "accepted" && <span className="text-green-600 dark:text-green-400 font-bold text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Accepted &amp; Transport Completed</span>}
                            {req.logType === "rejected" && <span className="text-red-500 dark:text-red-400 font-bold text-xs flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Declined by you</span>}
                            {req.logType === "cancelled" && <span className="text-gray-600 dark:text-gray-400 font-bold text-xs flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Accepted by you, but cancelled by patient</span>}
                            <div className="flex items-center gap-2 ml-auto">
                              {req.logType === "accepted" && (
                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                                  payment.status === "PAID"
                                    ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                                    : "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
                                }`}>
                                  {payment.status === "PAID" ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertTriangle className="w-3 h-3 shrink-0" />}
                                  {payment.label}
                                </span>
                              )}
                              {req.logType === "accepted" && (
                                <button onClick={() => setSelectedTrip(req)} className="shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90 transition-all shadow-sm flex items-center gap-1">
                                  Trip Details <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Trip Details Modal ── */}
      {selectedTrip && (() => {
        const payment = getPaymentInfo(selectedTrip);
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={() => setSelectedTrip(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><ClipboardList className="w-5 h-5" /></div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight">Trip Details</h2>
                      <p className="text-xs opacity-80 mt-0.5">ID: #{selectedTrip._id?.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTrip(null)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <span className="text-xs font-extrabold text-green-600 dark:text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Accepted &amp; Completed</span>
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date &amp; Time</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{new Date(selectedTrip.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{new Date(selectedTrip.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className={`border rounded-xl p-3 flex items-center justify-between gap-3 ${
                  payment.status === "PAID"
                    ? "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30"
                    : "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
                }`}>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment</p>
                    <span className={`text-xs font-extrabold flex items-center gap-1 ${
                      payment.status === "PAID" ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                    }`}>
                      {payment.status === "PAID" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                      {payment.label}
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Method: {payment.method}</p>
                    {payment.transactionId && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[180px]">Txn: {payment.transactionId}</p>
                    )}
                  </div>
                  {payment.amount != null && (
                    <p className="text-sm font-black text-gray-800 dark:text-gray-100">₹{payment.amount}</p>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Request Type</p>
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${selectedTrip.requestType === "EMERGENCY" ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"}`}>{selectedTrip.requestType || "EMERGENCY"}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Route</p>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5"><MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Pickup Location</p>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 mt-0.5">{selectedTrip.pickupAddress || (selectedTrip.location?.latitude ? `[${selectedTrip.location.latitude.toFixed(4)}, ${selectedTrip.location.longitude.toFixed(4)}]` : "Location not recorded")}</p>
                    </div>
                  </div>
                  <div className="ml-3.5 w-px h-5 bg-gradient-to-b from-indigo-400 to-violet-400 my-1 opacity-50" />
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-violet-100 dark:bg-violet-950/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5"><Hospital className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Destination Hospital</p>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 mt-0.5">{selectedTrip.hospital?.name || selectedTrip.dropAddress || "Hospital not assigned"}</p>
                      {selectedTrip.hospital?.address && <p className="text-[10px] text-gray-500 mt-0.5">{selectedTrip.hospital.address}</p>}
                    </div>
                  </div>
                </div>
                {selectedTrip.user && (
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">{selectedTrip.user.name?.charAt(0) || "P"}</div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patient</p>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{selectedTrip.user.name || "Anonymous"}</p>
                      <p className="text-[10px] text-gray-500">{selectedTrip.user.mobile || selectedTrip.user.email || ""}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => setSelectedTrip(null)} className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-md">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Hospital Picker Modal ── */}
      {hospitalPickerOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Hospital className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Select Destination Hospital</h2>
                  <p className="text-sm opacity-80 mt-0.5">Patient will be notified of the selected hospital</p>
                </div>
              </div>
              {currentAssignment?.user && (
                <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">{currentAssignment.user.name?.charAt(0) || "P"}</div>
                  <div>
                    <p className="font-bold text-sm">{currentAssignment.user.name || "Anonymous Patient"}</p>
                    <p className="text-xs opacity-80">{currentAssignment.user.mobile || currentAssignment.user.email || ""}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {hospitalLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Loading hospitals...</p>
                </div>
              ) : hospitals.length === 0 ? (
                <div className="text-center py-12">
                  <Hospital className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No hospitals found</p>
                  <p className="text-xs text-gray-400 mt-1">Ask admin to add hospitals to the system</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hospitals.map((h) => (
                    <button key={h._id} disabled={assigningHospital} onClick={() => handleAssignHospital(h._id, h.name)} className="w-full text-left p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 rounded-2xl flex items-center justify-center transition-colors shrink-0"><Hospital className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{h.name}</p>
                          <div className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2 py-1">
                            <span className="text-xs font-bold text-green-700">
                              {h.emergencyBeds} Beds Available
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {typeof h.location === "string"
                            ? h.location
                            : h.address ||
                            h.city ||
                            (h.location?.coordinates
                              ? `${h.location.coordinates[1]}, ${h.location.coordinates[0]}`
                              : "Location unavailable")}</p>
                          {h.contact && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" /> {h.contact}</p>}
                        </div>
                        <div className="shrink-0 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="w-6 h-6" /></div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => setHospitalPickerOpen(false)} className="w-full py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}