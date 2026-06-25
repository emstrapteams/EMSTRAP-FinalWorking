import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEmergencyDetailsAPI, API_URL } from "../../services/api";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import LiveTrackingMap from "../../components/map/LiveTrackingMap";

export default function Tracking() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [driverInfo, setDriverInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [socket, setSocket] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!requestId) return;

    // 0. Fetch initial data to handle refreshes
    const fetchInitialData = async () => {
      try {
        const res = await getEmergencyDetailsAPI(requestId);
        if (res.success && res.data.ambulance) {
          const amb = res.data.ambulance;
          setDriverInfo({
            driverName: amb.name,
            driverMobile: amb.mobile,
            vehicleNumber: amb.vehicleNumber,
            location: amb.currentLocation ? { 
              lat: amb.currentLocation.latitude, 
              lng: amb.currentLocation.longitude 
            } : null,
            hospitalName: res.data.hospital?.name,
          });
        }
      } catch (err) {
        console.error("Failed to fetch initial tracking data", err);
      }
    };

    fetchInitialData();

    // 1. Get initial location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("GPS error", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    // 2. Connect Socket
    const newSocket = io(API_URL, { withCredentials: true });
    newSocket.emit("track_request", { requestId });

    newSocket.on("ambulance_assigned", (data) => {
      setDriverInfo(data);
    });

    newSocket.on("ambulance_location", (data) => {
      setDriverInfo((prev) => {
        const info = prev || {};
        return {
          ...info,
          location: { lat: data.lat || data.latitude, lng: data.lng || data.longitude }
        };
      });
    });

    newSocket.on("emergency_cancelled", () => {
      toast.error("This request was cancelled.");
      navigate("/dashboard");
    });

    newSocket.on("trip_completed", () => {
      toast.success("Trip completed! Thank you for using Emstrap.");
      navigate("/dashboard");
    });

    setSocket(newSocket);

    // 3. Start watching user location and emitting it
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const currentLoc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          newSocket.emit("update_user_location", {
            requestId,
            ...currentLoc
          });
          setUserLocation({ lat: currentLoc.latitude, lng: currentLoc.longitude });
        },
        (err) => console.error("GPS error", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      newSocket.disconnect();
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestId, navigate]);

  return (
    <>
      <Navbar />
      <Container>
        <div className="pt-6 pb-20">
          <button 
            onClick={() => navigate("/dashboard")}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-4"
          >
            ← Back to Bookings
          </button>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Map Area */}
            <div className="w-full lg:flex-1 bg-gray-100 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-inner h-[350px] sm:h-[450px] lg:h-[650px] relative z-10">
              <LiveTrackingMap
                userLocation={userLocation}
                driverLocation={driverInfo?.location}
                height="100%"
              />
              
              {!driverInfo?.location && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-[1001]">
                  <div className="bg-white dark:bg-gray-900 px-6 py-3 rounded-full shadow-xl animate-pulse flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
                    <span className="font-bold text-sm">Waiting for driver signal...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Status Panel - Ensure it stays below on mobile */}
            <div className="w-full lg:w-96 space-y-4 shrink-0 relative z-20">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-xl border dark:border-gray-800">
                <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                  <span className="text-blue-500">📋</span> Ambulance Details
                </h2>
                
                <div className="space-y-4">
                  {/* Vehicle Info */}
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl transition-colors">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">🚑</div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Vehicle Number</p>
                      <p className="font-bold text-lg truncate">{driverInfo?.vehicleNumber || "Assigned"}</p>
                    </div>
                  </div>

                  {/* Driver Name */}
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl transition-colors">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">👤</div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Driver Name</p>
                      <p className="font-bold text-lg truncate">{driverInfo?.driverName || "On the way"}</p>
                    </div>
                  </div>

                  {/* Mobile No */}
                  {driverInfo?.driverMobile && (
                    <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">📱</div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mobile Number</p>
                          <p className="font-bold text-lg truncate">{driverInfo.driverMobile}</p>
                        </div>
                      </div>
                      <a 
                        href={`tel:${driverInfo.driverMobile}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all shrink-0"
                        title="Call Driver"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </a>
                    </div>
                  )}

                  <div className="pt-4 border-t dark:border-gray-800">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1.5">Current Status</p>
                    <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/10 p-3 rounded-2xl border border-green-100 dark:border-green-900/20">
                      <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                      </div>
                      <span className="font-bold text-green-700 dark:text-green-400 text-sm">En Route to your location</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                <p className="text-[10px] opacity-80 uppercase font-bold tracking-wider">Estimated Arrival</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-5xl font-black tracking-tighter">{driverInfo?.eta || "5-8"}</p>
                  <p className="font-bold opacity-90">mins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
