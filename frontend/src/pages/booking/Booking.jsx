import { useState, useEffect } from "react";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import { useAuth } from "../../context/AuthContext";
import LocationSearchInput from "../../components/map/LocationSearchInput";
import DriverHistory from "../ambulance/DriverHistory";
import toast from "react-hot-toast";
import {
    Truck,
    Navigation,
    CheckCircle2,
    Loader2,
    Activity,
    Wind,
    HeartPulse,
    Baby,
} from "lucide-react";

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

// Ambulance type configuration — rate per km + a minimum fare floor
const AMBULANCE_TYPES = [
    {
        id: "BASIC",
        label: "Basic Support",
        sublabel: "BLS",
        icon: Activity,
        baseRate: 100,
        minFare: 250,
        description: "Standard transport with first-aid trained staff.",
        bgClass: "bg-blue-50 dark:bg-blue-900/20",
        iconBgClass: "bg-blue-100 dark:bg-blue-900/40",
        textClass: "text-blue-600 dark:text-blue-400",
    },
    {
        id: "OXYGEN",
        label: "Oxygen Support",
        sublabel: "O2",
        icon: Wind,
        baseRate: 150,
        minFare: 400,
        description: "Equipped with oxygen supply for breathing support.",
        bgClass: "bg-cyan-50 dark:bg-cyan-900/20",
        iconBgClass: "bg-cyan-100 dark:bg-cyan-900/40",
        textClass: "text-cyan-600 dark:text-cyan-400",
    },
    {
        id: "ICU",
        label: "Advanced / ICU",
        sublabel: "ALS",
        icon: HeartPulse,
        baseRate: 250,
        minFare: 600,
        description: "Critical care unit with ventilator & monitoring.",
        bgClass: "bg-violet-50 dark:bg-violet-900/20",
        iconBgClass: "bg-violet-100 dark:bg-violet-900/40",
        textClass: "text-violet-600 dark:text-violet-400",
    },
    {
        id: "PREGNANT",
        label: "Pregnancy Care",
        sublabel: "OBS",
        icon: Baby,
        baseRate: 200,
        minFare: 500,
        description: "Specialized care for expecting mothers.",
        bgClass: "bg-pink-50 dark:bg-pink-900/20",
        iconBgClass: "bg-pink-100 dark:bg-pink-900/40",
        textClass: "text-pink-600 dark:text-pink-400",
    },
];

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

    const activeType = AMBULANCE_TYPES.find((t) => t.id === ambulanceType) || AMBULANCE_TYPES[0];

    // Final fare for any given ambulance type, based on the live distance —
    // shared by both the per-card price tags and the bottom quote box.
    const getPriceForType = (type) => {
        const calculated = type.baseRate * distanceKm;
        return Math.max(calculated, type.minFare);
    };

    const getPrice = () => getPriceForType(activeType);

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

            const bookingId = res.data?.data?._id;

            toast.success("Ambulance booked successfully! Redirecting to payment...");
            sessionStorage.removeItem('booking_pickup');
            sessionStorage.removeItem('booking_dropoff');
            sessionStorage.removeItem('booking_ambulanceType');
            sessionStorage.removeItem('booking_timestamp');

            if (bookingId) {
                navigate(`/payment/${bookingId}`);
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
                <div className="max-w-3xl mx-auto mt-10 mb-16">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100">Book an Ambulance</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Plan ahead with specific equipment needs and upfront pricing.</p>
                        </div>
                    </div>

                    <form onSubmit={handleBooking} className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-xl border dark:border-gray-800 space-y-8 transition-colors">

                            {/* Locations */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Route Details</h3>
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

                                {/* Calculated Distance */}
                                <div className="mt-4 flex items-center justify-between gap-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 px-4 py-3 rounded-2xl transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                            <Navigation size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Calculated Distance</p>
                                            <p className="text-[11px] text-blue-500 dark:text-blue-400 truncate">Estimated based on the most direct route</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-blue-700 dark:text-blue-300 text-lg whitespace-nowrap shrink-0">
                                        {distanceKm > 0
                                            ? (distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`)
                                            : "—"}
                                    </span>
                                </div>
                            </div>

                            {/* Ambulance Type Cards */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                                    Choose Ambulance Type
                                    {distanceKm > 0 && (
                                        <span className="ml-2 normal-case font-medium text-gray-400 dark:text-gray-500">
                                            — final price for your {distanceKm} km trip
                                        </span>
                                    )}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {AMBULANCE_TYPES.map((type) => {
                                        const Icon = type.icon;
                                        const selected = ambulanceType === type.id;
                                        const finalPrice = getPriceForType(type);
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setAmbulanceType(type.id)}
                                                className={`relative text-left p-4 rounded-2xl border transition-all ${
                                                    selected
                                                        ? `${type.bgClass} border-gray-300 dark:border-gray-600 shadow-md`
                                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
                                                }`}
                                            >
                                                {selected && (
                                                    <span className={`absolute top-3 right-3 ${type.textClass}`}>
                                                        <CheckCircle2 size={18} />
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${type.iconBgClass} ${type.textClass}`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">{type.label}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wide">{type.sublabel}</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-snug">{type.description}</p>
                                                {distanceKm > 0 ? (
                                                    <div className="flex items-baseline gap-1.5">
                                                        <p className={`text-lg font-black ${type.textClass}`}>₹{finalPrice.toFixed(0)}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500">final fare</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">Set pickup &amp; drop-off to see fare</p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Price Quote */}
                            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                                <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="flex items-center justify-between relative z-10 gap-4">
                                    <div className="min-w-0">
                                        <p className="text-[11px] uppercase font-bold tracking-wider opacity-80">Estimated Total</p>
                                        <p className="text-xs opacity-70 mt-0.5 truncate">
                                            {distanceKm > 0
                                                ? `${distanceKm} km · ₹${activeType.baseRate}/km`
                                                : "Set pickup & drop-off to see fare"}
                                        </p>
                                    </div>
                                    <p className="text-4xl font-black tracking-tight shrink-0">
                                        {distanceKm > 0 ? `₹${getPrice().toFixed(0)}` : "—"}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-red-600/20 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Confirming...
                                    </>
                                ) : (
                                    "Confirm Booking"
                                )}
                            </button>

                        </div>
                    </form>
                </div>
            </Container>
        </>
    );
}