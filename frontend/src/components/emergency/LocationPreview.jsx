import { useEffect, useState } from "react";

export default function LocationPreview({ onLocation }) {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      setLocation(loc);
      onLocation(loc);
    });
  }, [onLocation]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
      <h3 className="font-bold mb-3">Your Location</h3>

      {location ? (
        <div className="text-green-600">
          📍 Lat: {location.lat.toFixed(4)} <br />
          📍 Lng: {location.lng.toFixed(4)}
        </div>
      ) : (
        <p>Fetching location...</p>
      )}
    </div>
  );
}
