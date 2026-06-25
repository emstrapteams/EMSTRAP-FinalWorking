import { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../services/api";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function DriverNotificationListener() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const swRegistrationRef = useRef(null);

    useEffect(() => {
        // Only connect if user is a logged-in ambulance driver
        if (!user || (user.role !== "ambulance" && user.role !== "ambulance_driver")) return;

        // Register Service Worker for robust background notifications
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/service-worker.js")
                .then((reg) => {
                    swRegistrationRef.current = reg;
                })
                .catch(err => console.error("Service Worker registration failed:", err));
        }

        // Request browser notification permission
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        const socket = io(API_URL, { withCredentials: true });

        socket.emit("join_ambulance", {});

        socket.on("new_emergency_request", (data) => {
            // Don't show the generic toast if they are already actively looking at the dashboard
            if (window.location.pathname === "/dashboard") return;

            // 1. In-App Toast Notification
            toast((t) => (
                <div
                    className="cursor-pointer flex flex-col gap-1"
                    onClick={() => {
                        toast.dismiss(t.id);
                        navigate("/dashboard");
                    }}
                >
                    <div className="font-bold text-red-600 flex items-center gap-2">
                        <span className="text-xl">🚨</span>
                        <span>New Emergency Alert!</span>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                        Tap here to open dashboard and respond immediately.
                    </div>
                </div>
            ), {
                duration: 20000,
                position: "top-center",
                style: {
                    border: '1px solid #ef4444',
                    padding: '16px',
                    boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)'
                }
            });

            // 2. Desktop Push Notification (using Service Worker if possible, fallback to standard)
            if ("Notification" in window && Notification.permission === "granted") {
                if (swRegistrationRef.current) {
                    // Robust OS-level Push
                    swRegistrationRef.current.showNotification("🚨 New Emergency Request!", {
                        body: "A patient needs help nearby. Tap to open dashboard.",
                        icon: "/vite.svg", // Default generic app icon
                        vibrate: [200, 100, 200, 100, 200, 100, 200],
                        data: { url: "/dashboard" }
                    });
                } else {
                    // Fallback legacy Notification API
                    const notification = new Notification("🚨 New Emergency Request!", {
                        body: "A patient needs help nearby. Click here to open dashboard.",
                        icon: "/vite.svg"
                    });

                    notification.onclick = () => {
                        window.focus();
                        navigate("/dashboard");
                        notification.close();
                    };
                }
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user, navigate]);

    return null;
}
