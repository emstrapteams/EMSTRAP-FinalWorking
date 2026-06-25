import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import { getBookingByIdAPI, getPaymentStatusAPI, processPaymentAPI } from "../../services/api";
import toast from "react-hot-toast";
import {
  CreditCard,
  Wallet,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  MapPin,
  Navigation,
  Receipt,
  Loader2,
  ShieldCheck,
  Activity,
  Wind,
  HeartPulse,
  Baby,
  Siren,
  AlertTriangle,
} from "lucide-react";

// Same icon/accent mapping as the AMBULANCE_TYPES config on the booking form
// (pages/booking/Booking.jsx) — reusing it here keeps the visual thread
// between "choosing a ride" and "paying for it" instead of feeling like two
// different apps stitched together.
const AMBULANCE_TYPE_META = {
  BASIC:     { label: "Basic Support", icon: Activity,   bg: "bg-blue-100 dark:bg-blue-900/40",     text: "text-blue-600 dark:text-blue-400" },
  OXYGEN:    { label: "Oxygen Support", icon: Wind,        bg: "bg-cyan-100 dark:bg-cyan-900/40",     text: "text-cyan-600 dark:text-cyan-400" },
  ICU:       { label: "Advanced / ICU", icon: HeartPulse,  bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-600 dark:text-violet-400" },
  PREGNANT:  { label: "Pregnancy Care", icon: Baby,        bg: "bg-pink-100 dark:bg-pink-900/40",     text: "text-pink-600 dark:text-pink-400" },
  EMERGENCY: { label: "Emergency",      icon: Siren,       bg: "bg-red-100 dark:bg-red-900/40",       text: "text-red-600 dark:text-red-400" },
};

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash", icon: Wallet },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "UPI",  label: "UPI",  icon: Smartphone },
];

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("UPI");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!bookingId) return;
    const fetchData = async () => {
      try {
        const bookingRes = await getBookingByIdAPI(bookingId);
        if (bookingRes.success) setBooking(bookingRes.data);
      } catch {
        toast.error("Failed to load booking details");
        setLoading(false);
        return;
      }
      try {
        const paymentRes = await getPaymentStatusAPI(bookingId);
        if (paymentRes.success) setPayment(paymentRes.data);
      } catch {
        // No payment record yet — unpaid
      }
      setLoading(false);
    };
    fetchData();
  }, [bookingId]);

  const handlePay = async () => {
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await processPaymentAPI(bookingId, selectedMethod);
      if (res.success) {
        setSuccess(res.data);
        toast.success("Payment successful!");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const typeMeta = AMBULANCE_TYPE_META[booking?.ambulanceType] || AMBULANCE_TYPE_META.BASIC;
  const TypeIcon = typeMeta.icon;
  const amountDue = payment?.amount || booking?.estimatedPrice || 0;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <Navbar />
        <Container>
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="h-10 w-10 border-[3px] border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">Loading payment details…</p>
          </div>
        </Container>
      </div>
    );
  }

  // ── Booking not found ────────────────────────────────────────────────────
  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <Navbar />
        <Container>
          <div className="max-w-md mx-auto text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-semibold">Booking not found.</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </Container>
      </div>
    );
  }

  // ── Success: ticket-stub receipt ────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <Navbar />
        <Container>
          <div className="max-w-md mx-auto mt-12 mb-16">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Payment Successful</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your trip is paid and confirmed.</p>
            </div>

            {/* Ticket stub */}
            <div className="rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-800">
              {/* Top half — trip */}
              <div className="bg-white dark:bg-gray-900 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.bg} ${typeMeta.text}`}>
                    <TypeIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-gray-900 dark:text-gray-100 leading-tight">{typeMeta.label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">Ambulance Trip Receipt</p>
                  </div>
                </div>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-gray-600 dark:text-gray-300 truncate">{booking.pickupLocation?.address || "Pickup location"}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-gray-600 dark:text-gray-300 truncate">{booking.dropoffLocation?.address || "Drop-off location"}</p>
                  </div>
                </div>
              </div>

              {/* Perforation with cutout notches — matches the page background */}
              <div className="relative h-0">
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-950" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-950" />
                <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700" />
              </div>

              {/* Bottom half — payment */}
              <div className="bg-white dark:bg-gray-900 p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Transaction ID</span>
                  <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{success.transactionId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Method</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{success.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Paid At</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{new Date(success.paidAt).toLocaleString()}</span>
                </div>
                <div className="border-t border-dashed border-gray-100 dark:border-gray-800 pt-3 flex justify-between items-center">
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100">Amount Paid</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{success.amount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-indigo-500/20 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </Container>
      </div>
    );
  }

  const isAlreadyPaid = payment?.status === "COMPLETED";

  // ── Default: payment form ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />
      <Container>
        <div className="max-w-lg mx-auto mt-10 mb-16">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1.5 mb-6 text-sm font-semibold transition-colors"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <CreditCard size={22} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">Complete Payment</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Review your trip, then pay to confirm your ambulance.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-xl border dark:border-gray-800 space-y-8 transition-colors">

            {/* Booking summary */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Booking Summary</h3>

              <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.bg} ${typeMeta.text}`}>
                  <TypeIcon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{typeMeta.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{booking.distanceKm ? `${booking.distanceKm} km trip` : "Distance not recorded"}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Pickup</p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{booking.pickupLocation?.address || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Navigation size={15} className="text-violet-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Drop-off</p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{booking.dropoffLocation?.address || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount due — same gradient treatment as the booking page's price quote */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-between relative z-10 gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase font-bold tracking-wider opacity-80">Amount Due</p>
                  <p className="text-xs opacity-70 mt-0.5 flex items-center gap-1.5">
                    <Receipt size={12} /> Booking #{booking._id?.slice(-8).toUpperCase()}
                  </p>
                </div>
                <p className="text-4xl font-black tracking-tight shrink-0">₹{amountDue}</p>
              </div>
            </div>

            {isAlreadyPaid ? (
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Already Paid</p>
                  <p className="text-emerald-600 dark:text-emerald-500 text-xs mt-0.5">This booking has already been settled.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Payment method */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Choose Payment Method</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const selected = selectedMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedMethod(method.id)}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                            selected
                              ? "border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 shadow-md"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          {selected && (
                            <span className="absolute top-2 right-2 text-indigo-600 dark:text-indigo-400">
                              <CheckCircle2 size={14} />
                            </span>
                          )}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            selected ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          }`}>
                            <Icon size={16} />
                          </div>
                          <span className={`text-xs font-bold ${selected ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400"}`}>
                            {method.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handlePay}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:opacity-95 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing Payment…
                    </>
                  ) : (
                    `Pay ₹${amountDue}`
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}