import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminModal from "../../components/admin/AdminModal";
import AdminSurface from "../../components/admin/AdminSurface";
import { AdminEmptyRow, AdminLoadingRow } from "../../components/admin/AdminTableState";
import { bookingStatusOptions, formatDate } from "../../components/admin/admin.utils";
import { deleteBookingById, getAllAdminBookings, getErrorMessage, updateBookingStatus } from "../../services/api";

const cls = {
  select:
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 transition-all duration-150 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800/40 hover:border-indigo-200",
  btnSave:
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-all duration-150 disabled:opacity-50",
  btnCancel:
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100 text-sm font-bold transition-all duration-150",
  btnRefresh:
    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-violet-400 bg-violet-50 hover:bg-violet-100 active:scale-95 text-violet-700 dark:border-violet-500 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 text-sm font-bold transition-all duration-150 disabled:opacity-50",
  btnView:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-xs font-bold transition-all duration-150 dark:bg-slate-800 dark:hover:bg-indigo-950/50 dark:text-slate-300",
  btnEdit:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all duration-150 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300",
  btnDel:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all duration-150 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-400",
  tableRow:
    "group cursor-pointer transition-all duration-150 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 hover:shadow-[inset_3px_0_0_0_#6366f1]",
  th: "p-4 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500",
  td: "p-4",
};

const statusBadge = (status) => {
  const s = (status || "").toUpperCase();
  if (["COMPLETED", "RESOLVED"].includes(s))
    return "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (["PENDING"].includes(s))
    return "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
  if (["IN_PROGRESS", "ASSIGNED"].includes(s))
    return "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
  if (["CANCELLED"].includes(s))
    return "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300";
  return "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300";
};

const typeColor = (type) => {
  const t = (type || "").toUpperCase();
  if (t.includes("EMERGENCY") || t.includes("ALS"))
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (t.includes("ICU") || t.includes("CRITICAL"))
    return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
  return "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300";
};



export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingStatus, setBookingStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBookings = async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getAllAdminBookings();
      if (res.success) setBookings(res.bookings);
      setError("");
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load bookings");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleStatusUpdate = async (bookingId, status) => {
    const tid = toast.loading("Updating booking…");
    try {
      const res = await updateBookingStatus(bookingId, status);
      if (res.success) {
        setBookings((c) => c.map((i) => i._id === bookingId ? res.booking : i));
        setSelectedBooking((c) => c?._id === bookingId ? res.booking : c);
        toast.success("Booking updated", { id: tid });
        return true;
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update booking"), { id: tid });
    }
    return false;
  };

  const openEditModal = (booking) => {
    setEditingBooking(booking);
    setBookingStatus(booking.status || "PENDING");
  };

  const closeEditModal = () => {
    setEditingBooking(null);
    setBookingStatus("PENDING");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;
    setSaving(true);
    try {
      const updated = await handleStatusUpdate(editingBooking._id, bookingStatus);
      if (updated) closeEditModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bookingId) => {
    const tid = toast.loading("Deleting booking…");
    try {
      const res = await deleteBookingById(bookingId);
      if (res.success) {
        setBookings((c) => c.filter((i) => i._id !== bookingId));
        if (selectedBooking?._id === bookingId) setSelectedBooking(null);
        toast.success("Booking deleted", { id: tid });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete booking"), { id: tid });
    }
  };

  const getBookingDetails = (b) => ({
    "Booking ID": b._id,
    User: b.user?.name || "Unknown",
    "User Email": b.user?.email,
    "User Mobile": b.user?.mobile,
    "Pickup Address": b.pickupLocation?.address,
    "Dropoff Address": b.dropoffLocation?.address,
    "Pickup Coordinates": b.pickupLocation
      ? `${b.pickupLocation.latitude ?? "N/A"}, ${b.pickupLocation.longitude ?? "N/A"}` : null,
    "Dropoff Coordinates": b.dropoffLocation
      ? `${b.dropoffLocation.latitude ?? "N/A"}, ${b.dropoffLocation.longitude ?? "N/A"}` : null,
    Hospital: b.hospital?.name,
    Ambulance: b.ambulance?.name,
    "Ambulance Vehicle": b.ambulance?.vehicleNumber,
    "Ambulance Type": b.ambulanceType,
    Status: b.status,
    "Estimated Price": b.estimatedPrice ? `Rs. ${b.estimatedPrice}` : "Rs. 0",
    Distance: `${b.distanceKm || 0} km`,
    // ── Payment details ──────────────────────────────────────────────────
    "Payment Status": b.paymentStatus || "PENDING",
    "Payment Method": b.paymentMethod || "—",
    "Transaction ID": b.transactionId || "Not paid yet",
    "Paid At": b.paidAt ? formatDate(b.paidAt) : "Not paid yet",
    "Created Date": formatDate(b.createdAt),
    "Updated Date": formatDate(b.updatedAt),
  });

  return (
    <AdminLayout
      title="Booking Records"
      description="All booking data with row-level view, update, and delete controls."
      actions={
        <button type="button" onClick={() => fetchBookings({ silent: true })} disabled={refreshing} className={cls.btnRefresh}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 15A8 8 0 1 0 5.07 8.965" />
          </svg>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/30 p-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/></svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <AdminSurface className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            All Bookings
            <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {bookings.length}
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40">
                <th className={cls.th}>User</th>
                <th className={cls.th}>Route</th>
                <th className={cls.th}>Type</th>
                <th className={cls.th}>Price</th>
                <th className={cls.th}>Created</th>
                <th className={cls.th}>Status</th>
                <th className={cls.th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={7} label="Loading bookings…" />
              ) : bookings.length === 0 ? (
                <AdminEmptyRow colSpan={7} label="No bookings found." />
              ) : bookings.map((b) => (
                <tr key={b._id} className={cls.tableRow}>
                  <td className={cls.td}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/30 flex items-center justify-center font-black text-indigo-700 dark:text-indigo-300 text-sm">
                        {(b.user?.name || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{b.user?.name || "Unknown"}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{b.user?.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cls.td}>
                    <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400 max-w-48">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
                        <span className="truncate">{b.pickupLocation?.address || "No pickup"}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                        <span className="truncate">{b.dropoffLocation?.address || "No dropoff"}</span>
                      </span>
                    </div>
                  </td>
                  <td className={cls.td}>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${typeColor(b.ambulanceType)}`}>
                      {b.ambulanceType || "—"}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{b.distanceKm || 0} km</p>
                  </td>
                  <td className={cls.td}>
                    <span className="font-black text-gray-900 dark:text-white text-sm">Rs. {b.estimatedPrice || 0}</span>
                  </td>
                  <td className={`${cls.td} text-xs text-gray-500 dark:text-gray-400`}>{formatDate(b.createdAt)}</td>
                  <td className={cls.td}>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className={cls.td}>
                    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedBooking(b)} className={cls.btnView}>View</button>
                      <button type="button" onClick={() => openEditModal(b)} className={cls.btnEdit}>Update</button>
                      <button type="button" onClick={() => handleDelete(b._id)} className={cls.btnDel}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {selectedBooking && (
        <AdminModal
          title="Booking"
          subtitle={`ID: ${selectedBooking._id}`}
          onClose={() => setSelectedBooking(null)}
        >
          <AdminDetailGrid data={getBookingDetails(selectedBooking)} />
        </AdminModal>
      )}

      {editingBooking && (
        <AdminModal
          title="Update Booking"
          subtitle="Change the current booking status"
          onClose={closeEditModal}
        >
          <form onSubmit={handleUpdate} className="grid gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Booking status</label>
              <select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)} className={cls.select}>
                {(bookingStatusOptions || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className={cls.btnSave}>
                {saving ? "Saving…" : "Update Booking"}
              </button>
              <button type="button" onClick={closeEditModal} className={cls.btnCancel}>Cancel</button>
            </div>
          </form>
        </AdminModal>
      )}
    </AdminLayout>
  );
}