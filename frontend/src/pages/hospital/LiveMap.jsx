import { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";
import { API_URL, getAlerts, getOverviewStats } from "../../services/api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";

const createCustomIcon = (emoji, color = "#ff3b30") => L.divIcon({
    html: `<div class="bg-white rounded-full p-2 text-xl shadow-lg border-2 border-[${color}] flex items-center justify-center">${emoji}</div>`,
    className: "custom-leaflet-icon",
    iconSize: [44, 44],
    iconAnchor: [22, 22]
});

const emergencyIcon = createCustomIcon("🚑", "#ef4444");
const patientIcon = createCustomIcon("👤", "#3b82f6");

export default function LiveMap() {
    const [alerts, setAlerts] = useState([]);
    const [ambulanceLocations, setAmbulanceLocations] = useState({});
    const [liveAmbulancesCount, setLiveAmbulancesCount] = useState(0);
    
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const res = await getAlerts();
                if (res.success) {
                    setAlerts(res.alerts.filter(a => a.status === "PENDING" || a.status === "AMBULANCE_ACCEPTED"));
                }
                
                const statsRes = await getOverviewStats();
                if (statsRes.liveAmbulances !== undefined) {
                    setLiveAmbulancesCount(statsRes.liveAmbulances);
                }
            } catch (err) {
                toast.error("Failed to fetch map data.");
            }
        };

        fetchInitialState();

        // Refresh stats every 5 minutes
        const interval = setInterval(async () => {
            try {
                const statsRes = await getOverviewStats();
                if (statsRes.liveAmbulances !== undefined) {
                    setLiveAmbulancesCount(statsRes.liveAmbulances);
                }
            } catch (error) {
                console.error("Failed to update active ambulances count", error);
            }
        }, 5 * 60 * 1000);

        const socketUrl = API_URL || window.location.origin;
        const socket = io(socketUrl, { withCredentials: true });
        socket.emit("join_hospital", {});

        socket.on("hospital_alert", (data) => {
            setAlerts((prev) => {
                if (prev.some(a => a._id === data.request._id)) return prev;
                return [data.request, ...prev];
            });
        });

        socket.on("update_location", (data) => {
            setAmbulanceLocations((prev) => ({
                ...prev,
                [data.requestId]: { lat: data.lat, lng: data.lng }
            }));
        });

        return () => {
            socket.close();
            clearInterval(interval);
        };
    }, []);

    const computedCenter = useMemo(() => {
        if (alerts.length > 0 && alerts[0].location) {
            return [alerts[0].location.latitude, alerts[0].location.longitude];
        }
        return [20.5937, 78.9629]; // India Center
    }, [alerts]);

    return (
        <div className="relative h-[calc(100vh-8rem)] w-full overflow-hidden rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <div className="absolute top-6 left-6 z-[900] bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-5 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center min-w-[12rem]">
                <h3 className="text-white font-black tracking-tighter uppercase text-xs text-center mb-1">Active Ambulances</h3>
                <p className="text-4xl font-black text-emerald-400">{liveAmbulancesCount}</p>
                <p className="text-slate-500 text-[10px] font-black tracking-[0.2em] uppercase mt-1">Updates every 5 min</p>
            </div>

            <div className="absolute top-6 right-6 z-[900] bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span>Inbound Ambulance</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <span>Patient Location</span>
                </div>
            </div>

            <MapContainer 
                center={computedCenter} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> CartoDB'
                />

                {alerts.map(alert => {
                    const ambulanceLoc = ambulanceLocations[alert._id];
                    const patientLoc = alert.location;

                    return (
                        <div key={alert._id}>
                            {/* Patient Marker */}
                            {patientLoc && (
                                <Marker 
                                    position={[patientLoc.latitude, patientLoc.longitude]}
                                    icon={patientIcon}
                                >
                                    <Popup className="rounded-2xl">
                                        <div className="p-2">
                                            <p className="font-black text-slate-900">Patient: {alert.user?.name || "Anonymous"}</p>
                                            <p className="text-xs text-slate-500 font-bold uppercase mt-1">Status: {alert.status}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}

                            {/* Ambulance Marker (Live) */}
                            {ambulanceLoc && (
                                <Marker 
                                    position={[ambulanceLoc.lat, ambulanceLoc.lng]}
                                    icon={emergencyIcon}
                                >
                                    <Popup>
                                        <div className="p-2">
                                            <p className="font-black text-slate-900">Ambulance: {alert.ambulance?.vehicleNumber || "Fleet"}</p>
                                            <p className="text-xs text-red-500 font-bold uppercase mt-1">Live Tracking Enabled</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                        </div>
                    );
                })}
            </MapContainer>
        </div>
    );
}
