import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { getAllEmergencies, getErrorMessage } from "../../services/api";

// Same fallback center used by LiveTrackingMap.jsx
const DEFAULT_CENTER = [20.5937, 78.9629];

// Imperatively adds/removes the heat layer on the underlying Leaflet map
// instance — leaflet.heat has no React wrapper, so this is the cleanest way
// to hook it into react-leaflet's lifecycle.
function HeatLayer({ points }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!points.length) return undefined;

    layerRef.current = L.heatLayer(points, {
      radius: 26,
      blur: 20,
      maxZoom: 14,
      gradient: { 0.2: "#fde047", 0.45: "#fb923c", 0.7: "#ef4444", 1: "#7f1d1d" },
    }).addTo(map);

    const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map, points]);

  return null;
}

export default function AdminAccidentHeatmap() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const res = await getAllEmergencies();
        if (ignore) return;
        const pts = (res?.emergencies || [])
          .filter((e) => e?.location?.latitude && e?.location?.longitude)
          .map((e) => [e.location.latitude, e.location.longitude, 1]); // [lat, lng, intensity]
        setPoints(pts);
        if (!pts.length) setError("No location data yet");
      } catch (err) {
        if (!ignore) setError(getErrorMessage(err, "Failed to load emergency locations."));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => { ignore = true; };
  }, []);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-gray-900 dark:text-gray-100">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M11.3 4.2a1 1 0 0 1 1.4 0l7.7 12.8a1 1 0 0 1-.86 1.5H3.46a1 1 0 0 1-.86-1.5Z" strokeLinejoin="round" />
            <path d="M12 9.8v3.6" strokeLinecap="round" />
            <circle cx="12" cy="16.2" r="0.15" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">Accident Hotspots</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Density of emergency requests by location</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800" style={{ height: 220 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/40">
            <div className="h-8 w-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error && !points.length ? (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/40">
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : (
          <MapContainer
            center={points[0] ? [points[0][0], points[0][1]] : DEFAULT_CENTER}
            zoom={points.length ? 11 : 5}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatLayer points={points} />
          </MapContainer>
        )}
      </div>
    </div>
  );
}