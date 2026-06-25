import { useState, useEffect } from "react";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import { useAuth } from "../../context/AuthContext";
import LocationSearchInput from "../../components/map/LocationSearchInput";
import DriverHistory from "../ambulance/DriverHistory";
import toast from "react-hot-toast";

// Haversine formula to calculate true distance between coords in KM
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 6371; // Radius of the earth in km
    const l1 = parseFloat(lat1);
    const l2 = parseFloat(lat2);
    const ln1 = parseFloat(lon1);
    const ln2 = parseFloat(lon2);

    const dLat = (l2 - l1) * (Math.PI / 180);
    const dLon = (ln2 - ln1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(l1 * (Math.PI / 180)) * Math.cos(l2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return parseFloat(distance.toFixed(2)); // Actual distance in km
};



export default function Booking() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // // Route Drivers to their explicit history instead of booking a new ambulance
    // if (user?.role === "ambulance" || user?.role === "ambulance_driver") {
    //     return <DriverHistory />;
    // }

    const [pickup, setPickup] = useState(() => JSON.parse(sessionStorage.getItem('booking_pickup')) || null);
    const [dropoff, setDropoff] = useState(() => JSON.parse(sessionStorage.getItem('booking_dropoff')) || null);
    const [ambulanceType, setAmbulanceType] = useState(() => sessionStorage.getItem('booking_ambulanceType') || "BASIC");
    const [distanceKm, setDistanceKm] = useState(0);
    const [loading, setLoading] = useState(false);

    // 10 minutes expiry threshold in milliseconds
    const EXPIRY_MS = 10 * 60 * 1000;

    useEffect(() => {
        // Check expiry on mount and start a polling interval
        const checkExpiry = () => {
            const storedTimestamp = sessionStorage.getItem('booking_timestamp');
            if (storedTimestamp) {
                const now = new Date().getTime();
                const diff = now - parseInt(storedTimestamp, 10);

                if (diff > EXPIRY_MS) {
                    // Expired - clear storage, show toast, and reload
                    sessionStorage.removeItem('booking_pickup');
                    sessionStorage.removeItem('booking_dropoff');
                    sessionStorage.removeItem('booking_ambulanceType');
                    sessionStorage.removeItem('booking_timestamp');

                    toast.error("Booking session expired. Refreshing form.");
                    setTimeout(() => window.location.reload(), 1500);
                }
            } else {
                // If there's data but no timestamp, initialize the timestamp
                if (pickup || dropoff) {
                    sessionStorage.setItem('booking_timestamp', new Date().getTime().toString());
                }
            }
        };

        checkExpiry();
        const interval = setInterval(checkExpiry, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [pickup, dropoff]);

    // Recalculate distance whenever pickup or dropoff changes
    useEffect(() => {
        if (pickup?.lat && dropoff?.lat) {
            const dist = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
            setDistanceKm(dist);
        } else {
            setDistanceKm(0);
        }
        sessionStorage.setItem('booking_pickup', JSON.stringify(pickup));
        sessionStorage.setItem('booking_dropoff', JSON.stringify(dropoff));
    }, [pickup, dropoff]);

    useEffect(() => {
        sessionStorage.setItem('booking_ambulanceType', ambulanceType);
    }, [ambulanceType]);

    const getPrice = () => {
        let baseRate = 100; // BASIC
        if (ambulanceType === "OXYGEN") baseRate = 150;
        if (ambulanceType === "ICU") baseRate = 250;
        if (ambulanceType === "PREGNANT") baseRate = 200;

        return (baseRate * distanceKm);
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error("Please login first to book an ambulance.");
            navigate("/login");
            return;
        }

        if (!pickup || !dropoff) {
            toast.error("Please select locations from the suggestions.");
            return;
        }

        setLoading(true);
        try {
            const res = await API.post("/api/bookings", {
                pickupLocation: {
                    address: pickup.address,
                    latitude: pickup.lat,
                    longitude: pickup.lng
                },
                dropoffLocation: {
                    address: dropoff.address,
                    latitude: dropoff.lat,
                    longitude: dropoff.lng
                },
                ambulanceType,
                distanceKm
            });

            const requestId = res.data?.data?.requestId;

            toast.success("Ambulance booked successfully!");
            sessionStorage.removeItem('booking_pickup');
            sessionStorage.removeItem('booking_dropoff');
            sessionStorage.removeItem('booking_ambulanceType');
            sessionStorage.removeItem('booking_timestamp');

            if (requestId) {
                navigate(`/tracking/${requestId}`);
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            toast.error("Failed to book ambulance. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <Container>
                <div className="max-w-2xl mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl transition-colors">
                    <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Book an Ambulance</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Plan ahead with specific equipment needs and upfront pricing.</p>

                    <form onSubmit={handleBooking} className="space-y-6">

                        {/* Locations API */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <LocationSearchInput
                                    label="Pickup Address"
                                    placeholder="Where are you right now?"
                                    value={pickup}
                                    onSelect={setPickup}
                                />
                            </div>
                            <div className="relative">
                                <LocationSearchInput
                                    label="Dropoff Address"
                                    placeholder="Where do you need to go?"
                                    value={dropoff}
                                    onSelect={setDropoff}
                                    hideCurrentLocation={true}
                                />
                            </div>
                        </div>

                        {/* Calculated Distance Output (Moved outside the grid to span full width) */}
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl mt-6 transition-colors">
                            <label className="block text-sm font-semibold mb-1 flex justify-between text-blue-800 dark:text-blue-300">
                                <span>Calculated Distance</span>
                                <span className="font-bold">
                                    {distanceKm > 0
                                        ? (distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`)
                                        : "Select locations..."}
                                </span>
                            </label>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Estimated based on the most direct route.</p>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Ambulance Type</label>
                            <select
                                className="w-full border dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={ambulanceType}
                                onChange={(e) => setAmbulanceType(e.target.value)}
                            >
                                <option value="BASIC">Basic Support (BLS)</option>
                                <option value="OXYGEN">Oxygen Support</option>
                                <option value="ICU">Advanced / ICU (ALS)</option>
                                <option value="PREGNANT">Pregnancy Care</option>
                            </select>
                        </div>

                        {/* Price Quote */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border dark:border-gray-700 flex justify-between items-center transition-colors mt-6">
                            <div>
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Estimated Total</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Based on distance and equipment</p>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                ₹{getPrice().toFixed(2)}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-lg transition-colors mt-6"
                        >
                            {loading ? "Confirming..." : "Confirm Booking"}
                        </button>

                    </form>
                </div>
            </Container>
        </>
    );
}
