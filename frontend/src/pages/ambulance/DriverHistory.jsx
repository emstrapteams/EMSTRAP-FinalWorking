import { useEffect, useState } from "react";
import { getDriverHistory } from "../../services/api";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle2, XCircle, AlertTriangle, CreditCard, MapPin } from "lucide-react";

export default function DriverHistory() {
    const { user } = useAuth();
    const [acceptedHistory, setAcceptedHistory] = useState([]);
    const [rejectedHistory, setRejectedHistory] = useState([]);
    const [cancelledHistory, setCancelledHistory] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(true);
    // Tracks which card ids are currently showing their payment-details face
    const [flippedCards, setFlippedCards] = useState({});

    // Ensure dark mode class is applied based on saved preference
    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await getDriverHistory("all");
                setAcceptedHistory(res.data?.accepted || []);
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

    const toggleFlip = (id) => {
        setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // Pull payment info off the request, falling back gracefully if the API
    // hasn't sent these fields yet. Swap the `req.payment?.x` paths for your
    // real field names once the backend includes them.
    const getPaymentInfo = (req) => {
        const p = req.payment || {};
        return {
            amount: p.amount != null ? `₹${Number(p.amount).toFixed(2)}` : "N/A",
            method: p.method || "N/A",
            status: p.status || "N/A",
            transactionId: p.transactionId || req._id || "N/A",
            paidAt: p.paidAt ? new Date(p.paidAt).toLocaleString() : "N/A",
        };
    };

    const statusBadgeClass = (status) => {
        const s = (status || "").toLowerCase();
        if (s === "paid" || s === "completed") return "text-green-500 dark:text-green-400";
        if (s === "pending") return "text-orange-500 dark:text-orange-400";
        if (s === "failed" || s === "refunded") return "text-red-500 dark:text-red-400";
        return "text-gray-500 dark:text-gray-400";
    };

    const renderCard = (req, type) => {
        const isFlipped = !!flippedCards[req._id];
        const payment = getPaymentInfo(req);

        return (
            <div key={req._id} className="[perspective:1200px]">
                <div
                    className={`relative w-full min-h-[200px] transition-transform duration-500 [transform-style:preserve-3d] ${
                        isFlipped ? "[transform:rotateY(180deg)]" : ""
                    }`}
                >
                    {/* FRONT — Trip details (unchanged content) */}
                    <div className="[backface-visibility:hidden] p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full uppercase font-bold">Booking History</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            Emergency Booking at Location [{req.location?.latitude?.toFixed(4)}, {req.location?.longitude?.toFixed(4)}].
                        </p>

                        {type === "accepted" && (
                            <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 text-green-500 dark:text-green-400 font-semibold text-sm flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 shrink-0" /> Accepted by you
                            </div>
                        )}
                        {type === "rejected" && (
                            <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold text-sm flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 shrink-0" /> Declined by you
                            </div>
                        )}
                        {type === "cancelled" && (
                            <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 text-orange-500 dark:text-orange-400 font-semibold text-sm flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> Accepted by you, but cancelled by patient
                            </div>
                        )}

                        <button
                            onClick={() => toggleFlip(req._id)}
                            className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <CreditCard className="w-3.5 h-3.5" /> Payment Details
                        </button>
                    </div>

                    {/* BACK — Payment details */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-colors flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded-full uppercase font-bold">Payment Details</span>
                            <span className={`text-xs font-semibold ${statusBadgeClass(payment.status)}`}>{payment.status}</span>
                        </div>

                        <dl className="mt-3 space-y-2 text-sm flex-1">
                            <div className="flex justify-between gap-2">
                                <dt className="text-gray-400 dark:text-gray-500">Amount</dt>
                                <dd className="text-gray-800 dark:text-gray-200 font-semibold">{payment.amount}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-gray-400 dark:text-gray-500">Method</dt>
                                <dd className="text-gray-800 dark:text-gray-200">{payment.method}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-gray-400 dark:text-gray-500">Transaction ID</dt>
                                <dd className="text-gray-800 dark:text-gray-200 truncate max-w-[55%] text-right">{payment.transactionId}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-gray-400 dark:text-gray-500">Paid At</dt>
                                <dd className="text-gray-800 dark:text-gray-200">{payment.paidAt}</dd>
                            </div>
                        </dl>

                        <button
                            onClick={() => toggleFlip(req._id)}
                            className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <MapPin className="w-3.5 h-3.5" /> Trip Details
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const allHistory = [...acceptedHistory, ...rejectedHistory, ...cancelledHistory].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    const tabClass = (tab, textColor = "text-gray-900 dark:text-white") =>
        `flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
            activeTab === tab
                ? `bg-white dark:bg-gray-700 ${textColor} shadow-sm`
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        }`;

    const emptyState = (message) => (
        <div className="text-center p-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            {message}
        </div>
    );

    return (
        /* min-h-screen + bg ensure the whole page background is dark-mode aware */
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
            <Navbar />
            <Container>
                <div className="mt-10 mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Driver Booking History</h1>
                    <p className="text-gray-500 dark:text-gray-400">All previously accepted and declined emergency dispatch bookings.</p>
                </div>

                {/* Tab bar */}
                <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl max-w-lg">
                    <button onClick={() => setActiveTab("all")} className={tabClass("all")}>
                        All ({allHistory.length})
                    </button>
                    <button onClick={() => setActiveTab("accepted")} className={tabClass("accepted", "text-green-600 dark:text-green-400")}>
                        Accepted ({acceptedHistory.length})
                    </button>
                    <button onClick={() => setActiveTab("rejected")} className={tabClass("rejected", "text-red-500 dark:text-red-400")}>
                        Declined ({rejectedHistory.length})
                    </button>
                    <button onClick={() => setActiveTab("cancelled")} className={tabClass("cancelled", "text-orange-500 dark:text-orange-400")}>
                        Other ({cancelledHistory.length})
                    </button>
                </div>

                {loading ? (
                    <div className="text-center p-10 text-gray-500 dark:text-gray-400">Loading history...</div>
                ) : (
                    <div className="space-y-4 max-w-3xl mb-12">
                        {activeTab === "all" && (
                            <>
                                {allHistory.map((req) =>
                                    renderCard(
                                        req,
                                        req.status === "CANCELLED"
                                            ? "cancelled"
                                            : req.declinedBy?.includes(user?._id)
                                            ? "rejected"
                                            : "accepted"
                                    )
                                )}
                                {allHistory.length === 0 && emptyState("No history available.")}
                            </>
                        )}

                        {activeTab === "accepted" && (
                            <>
                                {acceptedHistory.map((req) => renderCard(req, "accepted"))}
                                {acceptedHistory.length === 0 && emptyState("No accepted history available.")}
                            </>
                        )}

                        {activeTab === "cancelled" && (
                            <>
                                {cancelledHistory.map((req) => renderCard(req, "cancelled"))}
                                {cancelledHistory.length === 0 && emptyState("No cancelled history available.")}
                            </>
                        )}

                        {activeTab === "rejected" && (
                            <>
                                {rejectedHistory.map((req) => renderCard(req, "rejected"))}
                                {rejectedHistory.length === 0 && emptyState("No declined history available.")}
                            </>
                        )}
                    </div>
                )}
            </Container>
        </div>
    );
}