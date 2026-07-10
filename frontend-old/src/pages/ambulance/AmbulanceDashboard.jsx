import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../../services/api";
import { getDriverHistory, acceptEmergency, declineEmergency, cancelEmergency, getHospitals, assignHospital, completeEmergencyAPI, markArrivedAPI } from "../../services/api";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import LiveTrackingMap from "../../components/map/LiveTrackingMap";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

export default function AmbulanceDashboard() {
  const { user, loginUser } = useAuth();
  const [requests, setRequests] = useState([]); // Actively pending nearby emergencies
  // "active" state is now represented by mapping over requests in a modal over the map
  // "accepted" history is tracked to route the driver to the user, handled inside the map
  const [acceptedHistory, setAcceptedHistory] = useState([]);
  const [socket, setSocket] = useState(null);

  // Hospital picker state
  const [hospitalPickerOpen, setHospitalPickerOpen] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [assigningHospital, setAssigningHospital] = useState(false);

  // Real-time Driver Tracking State
  const [driverLocation, setDriverLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const watchIdRef = useRef(null);

  // Expiry in milliseconds (30 mins) - gives drivers more time to see bookings
  const EXPIRY_MS = 30 * 60 * 1000;

  const fetchHistory = async () => {
    try {
      const res = await getDriverHistory();
      const ongoing = res.data.ongoing;
      const accepted = res.data.accepted;

      setRequests(
        ongoing.filter(
          req => req.duplicateDetected !== true
        )
      );
      setAcceptedHistory(accepted);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    }
  };

  // Helper to start tracking logic
  const startTracking = (id) => {
    // Clear existing watch if any
    if (watchIdRef.current) {
      if (typeof watchIdRef.current === 'number' && watchIdRef.current > 1000) {
        clearInterval(watchIdRef.current);
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    }
    // Remove old listeners before creating new ones
    socket.off("user_location");
    socket.off("emergency_cancelled");
    socket.emit("track_request", { requestId: id });

    socket.on("user_location", (data) => {
      console.log("USER LOCATION EVENT FIRED");
      if (data.requestId === id) {
        setUserLocation({ lat: data.lat || data.latitude, lng: data.lng || data.longitude });
      }
    });

    socket.on("emergency_cancelled", (data) => {
      console.log("CANCEL EVENT FIRED");
      if (data.requestId === id) {
        toast.error("The patient has cancelled the request.");
        stopTracking();
        fetchHistory();
      }
    });

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDriverLocation(currentLoc);
          socket.emit("update_location", { requestId: id, ...currentLoc });
        },
        (err) => console.error("GPS error", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      if (typeof watchIdRef.current === 'number' && watchIdRef.current > 1000) {
        clearInterval(watchIdRef.current);
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
    setDriverLocation(null);
    setUserLocation(null);
    if (socket) {
      socket.off("user_location");
      socket.off("emergency_cancelled");
    }
  };

  useEffect(() => {
    fetchHistory();
    console.log("API_URL =", API_URL);
    const newSocket = io(API_URL, { withCredentials: true });
    newSocket.on("connect", () => {
      console.log("SOCKET CONNECTED", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("SOCKET DISCONNECTED");
    });
    setSocket(newSocket);

    newSocket.on("new_emergency_request", (data) => {
      console.log("🚑 NEW EMERGENCY RECEIVED", data);
      console.log("New request received via socket:", data);
      toast.success(data.requestType === "EMERGENCY" ? "🚨 NEW EMERGENCY ALERT!" : "📅 New Ambulance Booking Request!", {
        duration: 6000,
        icon: data.requestType === "EMERGENCY" ? "🚑" : "📅"
      });
      // Add only if not already there to prevent dupes
      setRequests((prev) => {
        if (prev.find(r => r._id === data._id)) return prev;
        return [data, ...prev];
      });
    });

    // If another driver accepted it, remove it from our active list
    newSocket.on("emergency_accepted", (data) => {
      setRequests((prev) => prev.filter(r => r._id !== data.requestId));
    });

    return () => {
      newSocket.close();
      if (watchIdRef.current) {
        // Clear either interval or watch, depending on what it is
        if (typeof watchIdRef.current === 'number' && watchIdRef.current > 1000) {
          clearInterval(watchIdRef.current);
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
    };
  }, []);

  // Sync Room Membership with Driver Status
  useEffect(() => {
    if (!socket || !user) return;

    console.log("USER OBJECT", user);
    console.log("Driver Status:", user?.driverStatus);
    console.log("Role:", user?.role);

    if (user.driverStatus === "LIVE") {

      if (user.role === "ambulance_driver") {

        console.log("EMITTING JOIN_AMBULANCE");
        socket.emit("join_ambulance", {});
        console.log("Joined ambulance room");

      } else if (user.role === "private_driver") {

        console.log("EMITTING JOIN_PRIVATE_DRIVER");
        socket.emit("join_private_driver");
        console.log("Joined private_driver room");

      }

      fetchHistory();

    } else {

      if (user.role === "ambulance_driver") {

        socket.emit("leave_ambulance", {});

      } else if (user.role === "private_driver") {

        socket.emit("leave_private_driver");

      }

      setRequests([]);
      console.log("Left driver room");
    }

  }, [user?.driverStatus, user?.role, socket]);

  // Resume tracking on refresh if active assignment exists
  useEffect(() => {
    if (!socket || acceptedHistory.length === 0) return;
    
    const active = acceptedHistory.find(r => ["AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION", "EN_ROUTE_TO_HOSPITAL"].includes(r.status));
    if (active && !watchIdRef.current) {
        console.log("Resuming tracking for active assignment:", active._id);
        startTracking(active._id);
    }
  }, [socket, acceptedHistory]);

  // Cleanup effect: Remove requests older than 10 mins from the Active screen
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setRequests((prev) =>
        prev.filter(req => {
          const reqTime = new Date(req.createdAt).getTime();
          return (now - reqTime) <= EXPIRY_MS;
        })
      );
    }, 10000); // Check every 10 secs
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (id) => {
    try {
      const res = await acceptEmergency(id);
      const updatedRequest = res.data || res;
      toast.success("Emergency accepted!");

      // Move from active requests to accepted History locally
      setAcceptedHistory([updatedRequest, ...acceptedHistory]);
      setRequests(requests.filter((r) => r._id !== id));

      if (socket) {
        startTracking(id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error accepting request");
      // If someone else already took it, refresh the board
      if (error.response?.status === 400) {
        fetchHistory();
      }
    }
  };

  const handleDecline = async (id) => {
    try {
      await declineEmergency(id);
      toast.success("Request declined");

      setRequests(requests.filter((r) => r._id !== id));
    } catch (error) {
      toast.error("Error declining request");
    }
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
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            No, Back
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              processCancelAssignment();
            }}
            className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors"
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center' });
  };

  const processCancelAssignment = async () => {
    const loadingToast = toast.loading("Cancelling assignment...");
    try {
      await cancelEmergency(currentAssignment._id);
      toast.success("Assignment cancelled successfully", { id: loadingToast });
      stopTracking();
      fetchHistory();
    } catch (err) {
      toast.error("Failed to cancel assignment", { id: loadingToast });
    }
  };

  const handleArrived = async () => {
    if (!currentAssignment) return;
    const loadingToast = toast.loading("Marking arrival...");
    try {
      await markArrivedAPI(currentAssignment._id);
      toast.success("Arrival marked! Please select a destination hospital.", { id: loadingToast });
      fetchHistory();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark arrival", { id: loadingToast });
    }
  };

  const openHospitalPicker = async () => {
    setHospitalPickerOpen(true);
    if (hospitals.length === 0) {
      setHospitalLoading(true);
      try {
        const res = await getHospitals();
        setHospitals(res.hospitals || []);
      } catch {
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
      setHospitalPickerOpen(false);
      fetchHistory(); // refresh to show updated hospital
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to assign hospital");
    } finally {
      setAssigningHospital(false);
    }
  };

  const handleCompleteRide = () => {
    if (!currentAssignment) return;
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[250px]">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-900">End this ride?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Confirm if you have reached the destination.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Not Yet
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              processCompleteRide();
            }}
            className="px-4 py-2 text-xs font-bold bg-yellow-500 text-gray-900 rounded-xl shadow-lg shadow-yellow-500/20 hover:bg-yellow-600 transition-colors"
          >
            Yes, End Ride
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center' });
  };

  const processCompleteRide = async () => {
    const loadingToast = toast.loading("Completing trip...");
    try {
      await completeEmergencyAPI(currentAssignment._id);
      toast.success("Trip completed! You are now available for new requests.", { id: loadingToast });
      stopTracking();
      fetchHistory();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to complete trip",
        {
          id: loadingToast
        }
      );
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = user?.driverStatus === 'LIVE' ? 'OFFLINE' : 'LIVE';
    const loadingToast = toast.loading(`Switching to ${newStatus}...`);
    try {
      const res = await API.put("/auth/profile", { driverStatus: newStatus });
      if (res.data && res.data.user) {
        loginUser({ ...user, driverStatus: res.data.user.driverStatus });
        toast.success(`You are now ${newStatus}`, { id: loadingToast });
      }
    } catch (err) {
      toast.error("Failed to update status", { id: loadingToast });
    }
  };

  // The currently assigned emergency the driver is en route to
  const currentAssignment = acceptedHistory.find(req => ["AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION", "EN_ROUTE_TO_HOSPITAL"].includes(req.status)) || null;

  return (
    <>
      <div className="flex flex-col h-screen overflow-hidden">
        <Navbar />

        {/* Fullscreen Map Area */}
        <div className="relative flex-1 bg-gray-100 dark:bg-gray-900 w-full">
          <LiveTrackingMap
            userLocation={userLocation || (currentAssignment ? { lat: currentAssignment.location?.latitude, lng: currentAssignment.location?.longitude } : null)}
            driverLocation={driverLocation}
            height="100%"
          />

          {/* Floating Accepted Status Header */}
          {currentAssignment && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-lg">
              <div className="bg-green-600 shadow-xl rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse shrink-0">
                  🚑
                </div>
                <div className="text-white flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">
                    {currentAssignment.status === "AMBULANCE_ACCEPTED" 
                      ? "En Route to Patient"
                      : currentAssignment.status === "ARRIVED_AT_LOCATION"
                        ? "Arrived at Patient Location"
                        : `Heading to: ${currentAssignment.hospital?.name || "Hospital"}`}
                  </h3>
                  <p className="text-sm opacity-90 truncate">
                    {currentAssignment.status === "AMBULANCE_ACCEPTED"
                      ? "Navigating to pickup site..."
                      : currentAssignment.status === "ARRIVED_AT_LOCATION"
                        ? "Waiting to select hospital"
                        : (currentAssignment.hospital?.address || "Emergency transport in progress")}
                  </p>
                </div>
                <div className="flex flex-col gap-1 ml-auto shrink-0">
                  {currentAssignment.requestType === "EMERGENCY" && (
                    <>
                      {currentAssignment.status === "AMBULANCE_ACCEPTED" ? (
                        <button
                          onClick={handleArrived}
                          className="text-xs bg-white text-blue-700 px-3 py-1.5 rounded-full font-bold shadow-sm text-center hover:bg-blue-50 transition-colors"
                        >
                          📍 Mark Arrived
                        </button>
                      ) : (
                        <button
                          onClick={openHospitalPicker}
                          className="text-xs bg-white text-green-700 px-3 py-1.5 rounded-full font-bold shadow-sm text-center hover:bg-green-50 transition-colors"
                        >
                          🏥 {currentAssignment.hospital ? "Change" : "Select"} Hospital
                        </button>
                      )}
                    </>
                  )}
                  <Link to="/booking-history" className="text-xs bg-white/20 text-white px-3 py-1.5 rounded-full font-bold shadow-sm text-center hover:bg-white/30 transition-colors">
                    Details
                  </Link>
                  <button
                    onClick={handleCompleteRide}
                    className="text-xs bg-yellow-400 text-gray-900 px-3 py-1.5 rounded-full font-bold shadow-sm text-center hover:bg-yellow-300 transition-colors"
                  >
                    End Ride
                  </button>
                  {currentAssignment.requestType === "BOOKING" && (
                    <button
                      onClick={handleCancelAssignment}
                      className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-full font-bold shadow-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Incoming Emergency Modal Overlays */}
          {/* We stack them absolute at the bottom like Uber/Rapido */}
          <div className="absolute bottom-6 left-0 w-full px-4 flex flex-col gap-3 z-20 pointer-events-none">
            {!currentAssignment && requests.map((req) => (
              <div key={req._id} className={`mx-auto w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 ${req.requestType === "EMERGENCY" ? "border-red-500" : "border-blue-500"} overflow-hidden pointer-events-auto transform transition-all translate-y-0 opacity-100 animate-slide-up`}>
                <div className={`${req.requestType === "EMERGENCY" ? "bg-red-500 animate-pulse" : "bg-blue-500"} p-2.5 text-center text-white font-bold tracking-widest text-sm`}>
                  {req.requestType === "EMERGENCY" ? "🚨 NEW EMERGENCY" : "📅 "}
                </div>
                <div className="p-4">
                  <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">
                    {req.requestType === "EMERGENCY" ? "Patient Needs Immediate Help!" : "New trip request from patient"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                    <span className="text-xl">📍</span>
                    <span className="truncate">[{req.location?.latitude?.toFixed(4)}, {req.location?.longitude?.toFixed(4)}]</span>
                  </div>

                  {req.imageUrl && (
                    <div className="mb-4">
                      <img
                        src={req.imageUrl}
                        alt="Patient"
                        className="w-full h-48 object-cover rounded-xl shadow-inner border border-gray-100 dark:border-gray-700"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecline(req._id)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold transition-all"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(req._id)}
                      className="flex-[2] bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-md shadow-green-500/20 transition-all flex justify-center items-center gap-2"
                    >
                      ACCEPT
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Driver Status Chip at the very bottom when no modals */}
            {requests.length === 0 && !currentAssignment && (
              <button
                onClick={handleToggleStatus}
                className="mx-auto bg-gray-900/90 hover:bg-black backdrop-blur-sm text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl pointer-events-auto border border-gray-700 transition-all active:scale-95 group"
              >
                {user?.driverStatus === 'LIVE' ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping group-hover:bg-green-400"></div>
                    <span className="font-bold tracking-wide text-sm uppercase">Go Offline</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-gray-500 rounded-full group-hover:bg-green-500"></div>
                    <span className="font-bold tracking-wide text-sm uppercase text-gray-300 group-hover:text-white">Go Online</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hospital Picker Modal */}
      {hospitalPickerOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🏥</div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Select Destination Hospital</h2>
                  <p className="text-sm opacity-80 mt-0.5">Patient will be notified of the selected hospital</p>
                </div>
              </div>
              {currentAssignment?.user && (
                <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                    {currentAssignment.user.name?.charAt(0) || "P"}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{currentAssignment.user.name || "Anonymous Patient"}</p>
                    <p className="text-xs opacity-80">{currentAssignment.user.mobile || currentAssignment.user.email || ""}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hospital List */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {hospitalLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Loading hospitals...</p>
                </div>
              ) : hospitals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">🏥</div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No hospitals found</p>
                  <p className="text-xs text-gray-400 mt-1">Ask admin to add hospitals to the system</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hospitals.map((h) => (
                    <button
                      key={h._id}
                      disabled={assigningHospital}
                      onClick={() => handleAssignHospital(h._id, h.name)}
                      className="w-full text-left p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50 rounded-2xl flex items-center justify-center text-2xl transition-colors shrink-0">🏥</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">{h.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">📍 {h.address || h.city || "Location unavailable"}</p>
                          {h.contact && <p className="text-xs text-gray-400 mt-0.5">📞 {h.contact}</p>}
                        </div>
                        <div className="shrink-0 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                onClick={() => setHospitalPickerOpen(false)}
                className="w-full py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
