import { useState, useRef, useEffect } from "react";
import API, {
  API_URL,
  cancelEmergencyByUser,
  precheckEmergency,
  uploadEvidence,
} from "../../services/api";
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
  });
  const [driverInfo, setDriverInfo] = useState(null);
  const { location, setLocation, photo, setPhoto } = useEmergency();
  const cameraRef = useRef(null);
  const watchIdRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [showAIWarning, setShowAIWarning] = useState(false);
  const [pendingEmergency, setPendingEmergency] = useState(null);
  const [aiResult, setAIResult] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [showEvidenceCamera, setShowEvidenceCamera] = useState(false);
  const setStep = (newStep) => {
    sessionStorage.setItem("emergency_step", newStep);
    setStepState(newStep);
  };

  useEffect(() => {
    const requestId = sessionStorage.getItem("emergency_requestId");
    if (!requestId) return;

    if (step === "searching") {
      reconnectSocket(requestId);
    } else if (step === "accepted") {
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

    const timer = setTimeout(() => {
      setStep("timeout");
      socket.disconnect();
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
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

    if (!location) {
      toast.error("Waiting for GPS location...");
      return;
    }

    try {

      const precheck = await precheckEmergency({
        latitude: location.lat,
        longitude: location.lng,
        imageUrl: photoData || photo || "",
      });
      console.log("PRECHECK RESPONSE", precheck);
      console.log("WARNING?", precheck.warningRequired);
      if (precheck.warningRequired) {
        console.log("OPENING MODAL");
        setAIResult(precheck);

        // Store the uploaded Cloudinary URL, not the Base64 image
        setPendingEmergency(precheck.secureImageUrl);

        setShowAIWarning(true);

        return;

      }
      console.log("SUBMITTING DIRECTLY");

      // No warning → use the already uploaded image
      await submitEmergency(precheck.secureImageUrl);

    } catch (err) {

      console.error(err);

      toast.error("AI pre-check failed.");

    }

  };
  const submitEmergency = async (photoData) => {
    cameraRef.current?.stopCamera();
    setStep("searching");

    try {
      console.log("submitEmergency() CALLED");
      if (!location) {
        toast.error("Failed to acquire live location. Please allow GPS.");
        setStep("start");
        return;
      }

      const response = await API.post("/api/emergency", {
        latitude: location.lat,
        longitude: location.lng,
        imageUrl: photoData,
      });

      const requestId = response.data.data._id;
      sessionStorage.setItem("emergency_requestId", requestId);

      const socket = io(API_URL, { withCredentials: true });
      socket.emit("track_request", { requestId });

      const timer = setTimeout(() => {
        setStep("timeout");
        socket.disconnect();
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

      socket.on("emergency_cancelled", () => {
        toast.error("This emergency request was cancelled.");
        resetEmergency();
      });

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
  const handleUploadEvidence = async (photoData) => {
    try {
      setUploadingEvidence(true);

      const requestId = sessionStorage.getItem(
        "emergency_requestId"
      );

      if (!requestId) {
        toast.error("Emergency not found.");
        return;
      }
      await uploadEvidence(requestId, photoData);

      setShowEvidenceCamera(false);

      toast.success("Evidence uploaded successfully.");

    } catch (err) {

      console.error(err);

      toast.error("Failed to upload evidence.");

    } finally {

      setUploadingEvidence(false);

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
    toast(
      (t) => (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-xl">
          <h4 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">Cancel Request?</h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
            This will cancel your current dispatch request and return you to the dashboard.
          </p>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
              onClick={() => toast.dismiss(t.id)}
            >
              Keep Dispatch
            </button>
            <button
              className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium transition"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const requestId = sessionStorage.getItem("emergency_requestId");
                  if (requestId) {
                    await cancelEmergencyByUser(requestId);
                    toast.success("Emergency cancelled successfully.");
                    sessionStorage.removeItem("emergency_requestId");
                    
                  }
                  resetEmergency();
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to cancel emergency.");
                }
              }}
            >
              Confirm Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
        style: { padding: 0, background: "transparent", boxShadow: "none" }
      }
    );
  };

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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 font-sans tracking-tight antialiased selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navbar />
      <Container>
        <div className="min-h-[calc(100vh-120px)] flex flex-col justify-center items-center py-10 px-4">

          {/* STEP 1 — MINIMAL LANDING (matches reference design) */}
          {step === "start" && (
            <div className="w-full flex flex-col items-center text-center space-y-10 py-16">
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Emergency Ambulance
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg">
                  Tap to alert nearby ambulances
                </p>
              </div>

              <button
                onClick={startEmergency}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold tracking-wide px-14 py-6 rounded-2xl shadow-lg shadow-red-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 text-xl sm:text-2xl"
              >
                Emergency
              </button>
            </div>
          )}

          {/* STEP 2 — CAMERA CAPTURE BLOCK */}
          {step === "capture" && (
            <div className="w-full max-w-md bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Visual Context</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Attach a situational photo if safe. Otherwise click Skip.</p>
              </div>
              <div className="rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 p-2">
                <CameraCapture ref={cameraRef} onSend={handleSendEmergency} onCancel={resetEmergency} />
              </div>
            </div>
          )}

          {/* STEP 3 — SEARCHING INLINE ELEVATION */}
          {step === "searching" && (
            <div className="w-full max-w-lg bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl p-8 md:p-10 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Connecting to Nearby Units...</h3>
                <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
                  Locating and synchronizing routes with medical responders closest to you.
                </p>
              </div>
              <div className="px-2">
                <EmergencyProgress />
              </div>
              <div className="mt-6 border-t pt-5">

                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                  Have more photos? Upload them to help responders understand the emergency better.
                </p>

                <button
                  onClick={() => setShowEvidenceCamera(true)}
                  className="w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                >
                  Add More Evidence Images
                </button>
                {showEvidenceCamera && (
                  <div className="mt-4 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 p-2">
                    <CameraCapture
                      onSend={handleUploadEvidence}
                      onCancel={() => setShowEvidenceCamera(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 — OVERDUE TIMEOUT REVAMP */}
          {step === "timeout" && (
            <div className="w-full max-w-md bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl p-8 text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-xl mx-auto">
                ⏳
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Dispatch Timeout
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto">
                  No medical unit has locked coordinates yet. Resubmit to look for incoming responders or connect to general local emergency backup lines.
                </p>
              </div>
              <button
                onClick={resetEmergency}
                className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-white text-white dark:text-zinc-900 font-medium py-3 rounded-xl text-sm transition"
              >
                Resubmit Dispatch Sequence
              </button>
            </div>
          )}

          {/* STEP 5 — ASSIGNED */}
          {step === "accepted" && (
            <div className="w-full max-w-4xl">
              <AmbulanceFound driverInfo={driverInfo} onCancel={handleCancel} />
            </div>
          )}

        </div>
        {showAIWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 w-[420px] shadow-2xl">

              <h2 className="text-2xl font-bold text-red-600">
                ⚠ AI Safety Check
              </h2>

              <p className="mt-4 text-zinc-600 dark:text-zinc-300">
                Our AI believes this image may not represent
                an emergency.
              </p>

              <div className="mt-6 space-y-2">

                <p>
                  <strong>Prediction:</strong>{" "}
                  {aiResult?.aiAnalysis?.predictedClass}
                </p>

                <p>
                  <strong>Confidence:</strong>{" "}
                  {(aiResult?.aiAnalysis?.confidence * 100).toFixed(1)}%
                </p>

                <p>
                  <strong>Severity:</strong>{" "}
                  {aiResult?.aiAnalysis?.severity}
                </p>

              </div>

              <div className="flex justify-end gap-3 mt-8">

                <button
                  onClick={() => {
                    setShowAIWarning(false);
                  }}
                  className="px-5 py-2 rounded-lg border"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {

                    setShowAIWarning(false);

                    await submitEmergency(
                      pendingEmergency
                    );

                  }}
                  className="bg-red-600 text-white px-5 py-2 rounded-lg"
                >
                  Continue Anyway
                </button>

              </div>

            </div>
          </div>
        )}
      </Container>
    </div>
  );
}