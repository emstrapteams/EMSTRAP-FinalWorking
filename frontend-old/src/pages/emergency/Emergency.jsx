import { useState, useRef, useEffect } from "react";
import API, { API_URL, cancelEmergency } from "../../services/api";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import CameraCapture from "../../components/emergency/CameraCapture";
import EmergencyProgress from "../../components/emergency/EmergencyProgress";
import AmbulanceFound from "../../components/emergency/AmbulanceFound";
import { useEmergency } from "../../context/EmergencyContext";

export default function Emergency() {
  const [step, setStepState] = useState(() => {
    return sessionStorage.getItem("emergency_step") || "start";
  }); // start, capture, searching, accepted, timeout
  const [driverInfo, setDriverInfo] = useState(null);
  const { location, setLocation, photo, setPhoto } = useEmergency();
  const cameraRef = useRef(null);
  const watchIdRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const setStep = (newStep) => {
    sessionStorage.setItem("emergency_step", newStep);
    setStepState(newStep);
  };

  // On mount, if we are in "searching" or "accepted" state, we need to reconnect and fetch data
  useEffect(() => {
    const requestId = sessionStorage.getItem("emergency_requestId");
    if (!requestId) return;

    if (step === "searching") {
      reconnectSocket(requestId);
    } else if (step === "accepted") {
      // Fetch current driver info if we are already accepted but refreshed
      const fetchCurrentStatus = async () => {
        try {
          const res = await API.get(`/api/emergency/${requestId}`);
          if (res.data?.success && res.data.data.ambulance) {
            const request = res.data.data;
            setDriverInfo({
              driverName: request.ambulance.name,
              driverMobile: request.ambulance.mobile,
              vehicleNumber: request.ambulance.vehicleNumber,
              location: request.ambulance.currentLocation ? {
                lat: request.ambulance.currentLocation.latitude,
                lng: request.ambulance.currentLocation.longitude
              } : null,
              eta: "5-8 mins"
            });
            reconnectSocket(requestId);
          }
        } catch (err) {
          console.error("Failed to restore emergency state", err);
        }
      };
      fetchCurrentStatus();
    }
  }, []);

  const reconnectSocket = (requestId) => {
    const socket = io(API_URL, { withCredentials: true });
    socket.emit("track_request", { requestId });

    // We don't know exactly how much time is left, but we can give it a fresh 60s
    // Or we could store a timestamp in sessionStorage to calculate remaining time
    const timer = setTimeout(() => {
      setStep("timeout");
      socket.disconnect();
      // Clear persistence so refresh doesn't search again
      setLocation(null);
      setPhoto(null);
      sessionStorage.removeItem("emergency_requestId");
    }, 60000);

    socket.on("ambulance_assigned", (data) => {
      clearTimeout(timer);
      setDriverInfo(data);
      setStep("accepted");
    });

    socket.on("ambulance_location", (data) => {
      setDriverInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          location: { lat: data.lat || data.latitude, lng: data.lng || data.longitude }
        };
      });
    });

    // Listen for ride completion by driver
    socket.on("trip_completed", () => {
      clearTimeout(timer);
      toast.success("Your ride has been completed! Stay safe. 🚑", { duration: 6000 });
      resetEmergency();
    });

    socket.on("emergency_cancelled", () => {
      toast.error("This emergency request was cancelled.");
      resetEmergency();
    });

    setSocket(socket);
  };

  const startEmergency = () => {
    // try GPS first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          // IP Fallback
          fetch("https://ipapi.co/json/")
            .then(res => res.json())
            .then(data => setLocation({ lat: data.latitude, lng: data.longitude }))
            .catch(() => console.error("Location fallback failed"));
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      fetch("https://ipapi.co/json/")
        .then(res => res.json())
        .then(data => setLocation({ lat: data.latitude, lng: data.longitude }))
        .catch(() => console.error("Location fallback failed"));
    }

    setStep("capture");
  };

  const handleSendEmergency = async (photoData) => {
    //stop camera NOW
    cameraRef.current?.stopCamera();
    setStep("searching");

    try {
      if (!location) {
        toast.error("Failed to acquire live location. Please allow GPS.");
        setStep("start");
        return;
      }

      // Create request on backend using API service
      const response = await API.post("/api/emergency", {
        latitude: location.lat,
        longitude: location.lng,
        imageUrl: photoData || photo || ""
      });

      const requestId = response.data.data._id;
      sessionStorage.setItem("emergency_requestId", requestId);

      // Connect to websocket for real-time tracking
      const socket = io(API_URL, { withCredentials: true });
      socket.emit("track_request", { requestId });

      // Timeout if no one accepts in 1 minute (60000 ms)
      const timer = setTimeout(() => {
        setStep("timeout");
        socket.disconnect(); // Stop listening for this request
        // Clear persistence
        setLocation(null);
        setPhoto(null);
        sessionStorage.removeItem("emergency_requestId");
      }, 60000);

      // Listen for acceptance
      socket.on("ambulance_assigned", (data) => {
        clearTimeout(timer);
        setDriverInfo(data);
        setStep("accepted");
      });

      // Listen for real-time location updates
      socket.on("ambulance_location", (data) => {
        setDriverInfo((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            location: { lat: data.lat || data.latitude, lng: data.lng || data.longitude }
          };
        });
      });

      socket.on("emergency_cancelled", () => {
        toast.error("This emergency request was cancelled.");
        resetEmergency();
      });

      // Listen for ride completion by driver
      socket.on("trip_completed", () => {
        clearTimeout(timer);
        toast.success("Your ride has been completed! Stay safe. 🚑", { duration: 6000 });
        resetEmergency();
      });

      setSocket(socket);

    } catch (error) {
      console.error("Failed to call ambulance", error);
      toast.error("Error reaching server. Trying again...");
      setStep("start");
    }
  };

  const resetEmergency = () => {
    setStep("start");
    setDriverInfo(null);
    setLocation(null);
    setPhoto(null);
    sessionStorage.removeItem("emergency_requestId");

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    if (watchIdRef.current) {
      if (typeof watchIdRef.current === 'number' && watchIdRef.current > 1000) {
        clearInterval(watchIdRef.current);
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
  };

  const handleCancel = async () => {
    // We'll use a custom toast for the confirmation prompt!
    toast(
      (t) => (
        <div className="flex flex-col items-center p-2 md:p-4 md:min-w-[320px]">
          <p className="font-bold text-gray-900 text-lg mb-2">Cancel Ambulance?</p>
          <p className="text-gray-600 mb-6 text-center text-sm">Are you sure you want to cancel the emergency request?</p>
          <div className="flex gap-3 w-full">
            <button
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-xl transition-colors"
              onClick={() => toast.dismiss(t.id)}
            >
              No, keep it
            </button>
            <button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const requestId = sessionStorage.getItem("emergency_requestId");
                  if (requestId) {
                    await cancelEmergency(requestId);
                    toast.success("Emergency cancelled successfully.");
                  }
                  resetEmergency();
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to cancel emergency.");
                }
              }}
            >
              Yes, cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: window.innerWidth >= 768 ? "top-center" : "bottom-center",
        style: window.innerWidth >= 768 ? { marginTop: "30vh", maxWidth: "400px" } : {}
      }
    );
  };

  // Start sending live user location once accepted
  useEffect(() => {
    if (step === "accepted" && socket) {
      if (navigator.geolocation) {
        const requestId = sessionStorage.getItem("emergency_requestId");
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const currentLoc = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            socket.emit("update_user_location", {
              requestId,
              ...currentLoc
            });
            // Update local state too so the map reflects the user's latest coords
            setLocation({ lat: currentLoc.latitude, lng: currentLoc.longitude });
          },
          (err) => {
            console.error("GPS error", err);
            toast.error("Waiting for live GPS signal...");
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }
    }

    return () => {
      if (watchIdRef.current && step !== "accepted") {
        if (typeof watchIdRef.current === 'number' && watchIdRef.current > 1000) {
          clearInterval(watchIdRef.current);
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
    };
  }, [step, socket]);

  return (
    <>
      <Navbar />
      <Container>

        {/* STEP 1 — BIG BUTTON */}
        {step === "start" && (
          <div className="flex flex-col items-center justify-center text-center h-[80vh]">
            <h1 className="text-3xl sm:text-5xl font-bold">
              Emergency Ambulance
            </h1>

            <p className="mt-4 text-gray-500">
              Tap to alert nearby ambulances
            </p>

            <button
              onClick={startEmergency}
              className="
                mt-12 bg-red-600 hover:bg-red-700
                text-white font-bold
                px-10 py-6
                text-xl sm:text-2xl lg:text-3xl
                rounded-2xl shadow-xl
              "
            >
              CALL AMBULANCE
            </button>
          </div>
        )}

        {/* STEP 2 — CAMERA + LOCATION */}
        {step === "capture" && (
          <div className="mt-10 max-w-md mx-auto">
            <CameraCapture ref={cameraRef} onSend={handleSendEmergency} onCancel={resetEmergency} />
          </div>
        )}

        {/* STEP 3 */}
        {step === "searching" && <EmergencyProgress />}

        {/* STEP 4: TIMEOUT */}
        {step === "timeout" && (
          <div className="text-center mt-16 sm:mt-24 max-w-lg mx-auto p-6 bg-red-50 border border-red-100 rounded-3xl dark:bg-red-900/10 dark:border-red-900/30">
            <span className="text-5xl mb-4 block">⏳</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Ambulance Available
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Unfortunately, no ambulances accepted your request.
            </p>
            <button
              onClick={resetEmergency}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg"
            >
              Try Again
            </button>
          </div>
        )}

        {step === "accepted" && <AmbulanceFound driverInfo={driverInfo} onCancel={handleCancel} />}

      </Container>
    </>
  );
}
