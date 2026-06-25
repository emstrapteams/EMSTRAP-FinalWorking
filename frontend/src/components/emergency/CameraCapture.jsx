import {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useEmergency } from "../../context/EmergencyContext";
import toast from "react-hot-toast";

const isMobile = typeof window !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const CameraCaptureComponent = ({ onSend, onCancel }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [image, setImage] = useState(null);
  const { setPhoto } = useEmergency();

  const isStartingRef = useRef(false);

  // 📷 Start camera on all devices
  const startCamera = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // back camera if available
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Camera permission denied. Please allow camera access for safety.");
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  useImperativeHandle(ref, () => ({ stopCamera }));

  // 📷 Capture and Send in one go
  const handleCaptureAndSend = () => {
    if (!videoRef.current) return;
    
    const ctx = canvasRef.current.getContext("2d");
    // Match canvas to video size for better capture
    canvasRef.current.width = videoRef.current.videoWidth || 300;
    canvasRef.current.height = videoRef.current.videoHeight || 220;
    
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const data = canvasRef.current.toDataURL("image/jpeg", 0.7); // Smaller file size

    setImage(data);
    setPhoto(data);
    stopCamera();
    onSend(data); // Trigger the actual emergency send with the data
  };

  const retakePhoto = () => {
    setImage(null);
    startCamera();
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    const handleExit = () => stopCamera();
    window.addEventListener("pagehide", handleExit);
    window.addEventListener("beforeunload", handleExit);

    return () => {
      window.removeEventListener("pagehide", handleExit);
      window.removeEventListener("beforeunload", handleExit);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-bold mb-3 text-center text-gray-900 dark:text-white">
        {isMobile ? "Take Patient Photo" : "Upload Patient Photo"}
      </h3>

      {!image ? (
        <>
          <video ref={videoRef} autoPlay playsInline className="rounded-xl w-full object-cover aspect-video bg-black" />

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="w-1/3 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleCaptureAndSend();
              }}
              className="w-2/3 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
            >
              SEND EMERGENCY
            </button>
          </div>
        </>
      ) : (
        <>
          <img src={image} className="rounded-xl w-full" />

          <div className="flex gap-3 mt-4">
            <button
              onClick={retakePhoto}
              className="w-1/2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Retake
            </button>

            <button
              onClick={() => {
                stopCamera();
                onSend(image);
              }}
              className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Send Emergency
            </button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} width="300" height="220" hidden />
    </div>
  );
};

const CameraCapture = forwardRef(CameraCaptureComponent);
export default CameraCapture;
