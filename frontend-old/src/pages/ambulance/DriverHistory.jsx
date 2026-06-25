import { useEffect, useState } from "react";
import { getDriverHistory } from "../../services/api";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

export default function DriverHistory() {
    const { user } = useAuth();
    const [acceptedHistory, setAcceptedHistory] = useState([]);
    const [rejectedHistory, setRejectedHistory] = useState([]);
    const [cancelledHistory, setCancelledHistory] = useState([]);
    const [completedHistory, setCompletedHistory] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await getDriverHistory("all");

const accepted = res.data?.accepted || [];

setAcceptedHistory(
    accepted.filter(req => req.status !== "COMPLETED")
);

setCompletedHistory(
    accepted.filter(req => req.status === "COMPLETED")
);

setRejectedHistory(res.data?.rejected || []);
setCancelledHistory(res.data?.cancelled || []);
            } catch (err) {
                toast.error("Failed to load history");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const renderCard = (req, type) => (
        <div key={req._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-2">
                <span
                    className={`text-white text-xs px-2 py-1 rounded-full uppercase font-bold ${req.requestType === "BOOKING"
                            ? "bg-blue-600"
                            : "bg-red-600"
                        }`}
                >
                    {req.requestType || "EMERGENCY"}
                </span>
                <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Emergency response request recorded.
            </p>

            {req.location?.latitude && req.location?.longitude && (
                <p className="mt-1 text-xs text-gray-500">
                    Location captured successfully
                </p>
            )}

            {type === "accepted" && (
                <div className="mt-4 pt-3 border-t dark:border-gray-700 border-dashed">
                    <div className="text-green-600 font-semibold text-sm">
                        ✓ Accepted by you
                    </div>

                    <div className="mt-2">
                        <span
                            className={`px-2 py-1 text-xs rounded-full font-semibold ${req.status === "COMPLETED"
                                    ? "bg-green-100 text-green-700"
                                    : req.status === "EN_ROUTE_TO_HOSPITAL"
                                        ? "bg-blue-100 text-blue-700"
                                        : req.status === "ARRIVED_AT_LOCATION"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-gray-100 text-gray-700"
                                }`}
                        >
                            {req.status}
                        </span>
                    </div>
                </div>
            )}

            {type === "rejected" && (
                <div className="mt-4 pt-3 border-t dark:border-gray-700 border-dashed text-gray-500 font-semibold text-sm">
                    ✗ Declined by you
                </div>
            )}

            {type === "cancelled" && (
                <div className="mt-4 pt-3 border-t dark:border-gray-700 border-dashed text-orange-500 font-semibold text-sm">
                    ⚠ Accepted by you, but cancelled by patient
                </div>
            )}
        </div>
    );

    const allHistory = [...acceptedHistory, ...rejectedHistory, ...cancelledHistory].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return (
        <>
            <Navbar />
            <Container>
                <div className="mt-10 mb-8 border-b dark:border-gray-700 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Driver Booking History</h1>
                    <p className="text-gray-500 dark:text-gray-400">All previously accepted and declined emergency dispatch bookings.</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl max-w-lg">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${activeTab === 'all' ? 'bg-white dark:bg-gray-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        All ({allHistory.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("accepted")}
                        className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${activeTab === 'accepted' ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Accepted ({acceptedHistory.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("completed")}
                        className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${activeTab === 'completed'
                                ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Completed ({completedHistory.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("rejected")}
                        className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${activeTab === 'rejected' ? 'bg-white dark:bg-gray-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Declined ({rejectedHistory.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("cancelled")}
                        className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${activeTab === 'cancelled' ? 'bg-white dark:bg-gray-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Other ({cancelledHistory.length})
                    </button>
                </div>

                {loading ? (
                    <div className="text-center p-10 text-gray-500">Loading history...</div>
                ) : (
                    <div className="space-y-4 max-w-3xl mb-12">
                        {activeTab === "all" && (
                            <>
                                {allHistory.map((req) => renderCard(req, req.status === "CANCELLED" ? "cancelled" : (req.declinedBy?.includes(user?._id) ? "rejected" : "accepted")))}
                                {allHistory.length === 0 && (
                                    <div className="text-center p-10 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed dark:border-gray-700">
                                        No history available.
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === "accepted" && (
                            <>
                                {acceptedHistory.map((req) => renderCard(req, "accepted"))}
                                {acceptedHistory.length === 0 && (
                                    <div className="text-center p-10 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed dark:border-gray-700">
                                        No accepted history available.
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === "completed" && (
                                <>
                                    {completedHistory.map((req) =>
                                        renderCard(req, "accepted")
                                    )}

                                    {completedHistory.length === 0 && (
                                        <div className="text-center p-10 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed dark:border-gray-700">
                                            No completed trips available.
                                        </div>
                                    )}
                                </>
                        )}
                        {activeTab === "cancelled" && (
                            <>
                                {cancelledHistory.map((req) => renderCard(req, "cancelled"))}
                                {cancelledHistory.length === 0 && (
                                    <div className="text-center p-10 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed dark:border-gray-700">
                                        No cancelled history available.
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === "rejected" && (
                            <>
                                {rejectedHistory.map((req) => renderCard(req, "rejected"))}
                                {rejectedHistory.length === 0 && (
                                    <div className="text-center p-10 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed dark:border-gray-700">
                                        No declined history available.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </Container>
        </>
    );
}
