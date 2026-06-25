import { useEffect, useState, useMemo, useRef } from "react";
import { getPoliceEmergencies, getPoliceCases } from "../../services/api";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import toast from "react-hot-toast";

const createCustomIcon = (emoji) => L.divIcon({
    html: `<div class="bg-white rounded-full p-2 text-xl shadow-lg border-2 border-[#ff3b30] flex items-center justify-center">${emoji}</div>`,
    className: "custom-leaflet-icon",
    iconSize: [44, 44],
    iconAnchor: [22, 22]
});

const emergencyIcon = createCustomIcon("🚨");

// Inner component that manages the heatmap layer lifecycle
function HeatmapLayer({ points }) {
    const map = useMap();
    const heatRef = useRef(null);

    useEffect(() => {
        if (!points || points.length === 0) return;

        // Remove old layer first
        if (heatRef.current) {
            map.removeLayer(heatRef.current);
        }

        heatRef.current = L.heatLayer(points, {
            radius: 35,
            blur: 25,
            maxZoom: 14,
            max: 1.0,
            gradient: {
                0.0: "#00008B", // deep blue – sparse
                0.3: "#1E90FF", // dodger blue
                0.5: "#FFFF00", // yellow – moderate
                0.7: "#FF8C00", // orange – dense
                1.0: "#FF0000", // red – hotspot
            },
        }).addTo(map);

        return () => {
            if (heatRef.current) {
                map.removeLayer(heatRef.current);
            }
        };
    }, [map, points]);

    return null;
}

const VIEWS = {
    HEATMAP: "heatmap",
    LIVE: "live",
};

export default function LiveMap() {
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [allCases, setAllCases] = useState([]);
    const [view, setView] = useState(VIEWS.HEATMAP);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [activeRes, casesRes] = await Promise.all([
                    getPoliceEmergencies(),
                    getPoliceCases(),
                ]);

                if (activeRes.success) {
                    setActiveAlerts(activeRes.emergencies.filter(
                        a => a.status === "PENDING" || a.status === "AMBULANCE_ACCEPTED"
                    ));
                }
                if (casesRes.success) {
                    setAllCases(casesRes.cases);
                }
            } catch (err) {
                toast.error("Failed to load map data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Heat points: [lat, lng, intensity] — weight completed/cancelled cases higher for hotspot detection
    const heatPoints = useMemo(() => {
        return allCases
            .filter(c => c.location?.latitude && c.location?.longitude)
            .map(c => {
                const intensity = c.status === "COMPLETED" ? 1.0 : c.status === "AMBULANCE_ACCEPTED" ? 0.7 : 0.5;
                return [c.location.latitude, c.location.longitude, intensity];
            });
    }, [allCases]);

    const computedCenter = useMemo(() => {
        const source = activeAlerts.length > 0 ? activeAlerts : allCases;
        if (source.length > 0 && source[0].location) {
            return [source[0].location.latitude, source[0].location.longitude];
        }
        return [20.5937, 78.9629];
    }, [activeAlerts, allCases]);

    return (
        <div className="h-[calc(100vh-8rem)] w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 relative bg-white dark:bg-gray-900">

            {/* Top Info Bar */}
            <div className="absolute top-4 left-4 z-[900] bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-lg flex items-center gap-3">
                <span className="text-red-500 animate-pulse text-2xl">📡</span>
                <div>
                    <h3 className="text-gray-900 dark:text-white font-bold tracking-widest uppercase text-sm">
                        {view === VIEWS.HEATMAP ? "Accident Heatmap" : "Live Incidents"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-mono">
                        {view === VIEWS.HEATMAP
                            ? `${heatPoints.length} total cases plotted`
                            : `${activeAlerts.length} active alerts`
                        }
                    </p>
                </div>
            </div>

            {/* View Toggle */}
            <div className="absolute top-4 right-4 z-[900] bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-1 flex gap-1">
                <button
                    onClick={() => setView(VIEWS.HEATMAP)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        view === VIEWS.HEATMAP
                            ? "bg-red-600 text-white shadow"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                    🔥 Heatmap
                </button>
                <button
                    onClick={() => setView(VIEWS.LIVE)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        view === VIEWS.LIVE
                            ? "bg-red-600 text-white shadow"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                    🚨 Live
                </button>
            </div>

            {/* Heatmap Legend */}
            {view === VIEWS.HEATMAP && (
                <div className="absolute bottom-6 left-4 z-[900] bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-lg">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Incident Density</p>
                    <div className="flex items-center gap-1">
                        <div className="w-20 h-3 rounded-full" style={{
                            background: "linear-gradient(to right, #00008B, #1E90FF, #FFFF00, #FF8C00, #FF0000)"
                        }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500 dark:text-gray-400 mt-1 font-mono">
                        <span>Low</span>
                        <span>High</span>
                    </div>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 z-[950] flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Loading map data...</p>
                    </div>
                </div>
            )}

            <MapContainer
                center={computedCenter}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> CartoDB'
                />

                {/* Heatmap Layer */}
                {view === VIEWS.HEATMAP && heatPoints.length > 0 && (
                    <HeatmapLayer points={heatPoints} />
                )}

                {/* Live Incident Markers */}
                {view === VIEWS.LIVE && activeAlerts.map(alert => {
                    if (!alert.location) return null;
                    return (
                        <Marker
                            key={alert._id}
                            position={[alert.location.latitude, alert.location.longitude]}
                            icon={emergencyIcon}
                        >
                            <Popup className="rounded-2xl">
                                <div className="font-sans text-center">
                                    <p className="font-bold text-gray-900 border-b pb-2 mb-2">Active Emergency</p>
                                    <p className="text-sm font-semibold text-gray-800">{alert.user?.name || "Unknown"}</p>
                                    <p className="text-xs text-gray-500 mt-1">Status: <span className="font-bold text-red-600">{alert.status}</span></p>
                                    <p className="text-xs text-gray-500 font-mono mt-1">
                                        {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
