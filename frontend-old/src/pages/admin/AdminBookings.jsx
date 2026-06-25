import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminModal from "../../components/admin/AdminModal";
import AdminSurface from "../../components/admin/AdminSurface";
import { AdminEmptyRow, AdminLoadingRow } from "../../components/admin/AdminTableState";
import { bookingStatusOptions, formatDate, getStatusBadgeClasses } from "../../components/admin/admin.utils";
import { deleteBookingById, getAllAdminBookings, getErrorMessage, updateBookingStatus } from "../../services/api";

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
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getAllAdminBookings();
      if (res.success) setBookings(res.bookings);
      setError("");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load bookings");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusUpdate = async (bookingId, status) => {
    const loadingToast = toast.loading("Updating booking...");

    try {
      const res = await updateBookingStatus(bookingId, status);
      if (res.success) {
        setBookings((current) => current.map((item) => item._id === bookingId ? res.booking : item));
        setSelectedBooking((current) => current?._id === bookingId ? res.booking : current);
        toast.success("Booking updated", { id: loadingToast });
        return true;
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update booking"), { id: loadingToast });
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

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editingBooking) return;

    setSaving(true);

    try {
      const updated = await handleStatusUpdate(editingBooking._id, bookingStatus);
      if (updated) {
        closeEditModal();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bookingId) => {
    const loadingToast = toast.loading("Deleting booking...");

    try {
      const res = await deleteBookingById(bookingId);
      if (res.success) {
        setBookings((current) => current.filter((item) => item._id !== bookingId));
        if (selectedBooking?._id === bookingId) setSelectedBooking(null);
        toast.success("Booking deleted", { id: loadingToast });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete booking"), { id: loadingToast });
    }
  };

  const getBookingDetails = (booking) => ({
    "Booking ID": booking._id,
    User: booking.user?.name || "Unknown user",
    "User Email": booking.user?.email,
    "User Mobile": booking.user?.mobile,
    "Pickup Address": booking.pickupLocation?.address,
    "Dropoff Address": booking.dropoffLocation?.address,
    "Pickup Coordinates": booking.pickupLocation
      ? `${booking.pickupLocation.latitude ?? "N/A"}, ${booking.pickupLocation.longitude ?? "N/A"}`
      : null,
    "Dropoff Coordinates": booking.dropoffLocation
      ? `${booking.dropoffLocation.latitude ?? "N/A"}, ${booking.dropoffLocation.longitude ?? "N/A"}`
      : null,
    Hospital: booking.hospital?.name,
    Ambulance: booking.ambulance?.name,
    "Ambulance Vehicle": booking.ambulance?.vehicleNumber,
    "Ambulance Type": booking.ambulanceType,
    Status: booking.status,
    "Estimated Price": booking.estimatedPrice ? `Rs. ${booking.estimatedPrice}` : "Rs. 0",
    Distance: `${booking.distanceKm || 0} km`,
    "Created Date": formatDate(booking.createdAt),
    "Updated Date": formatDate(booking.updatedAt),
  });

  return (
    <AdminLayout
      title="Booking Records"
      description="All booking data from the backend in one place with row-level view, update, and delete controls."
      actions={
        <button
          type="button"
          onClick={() => fetchBookings({ silent: true })}
          disabled={refreshing}
          className="px-4 py-2 rounded-xl bg-white text-gray-900 border border-gray-200 font-semibold disabled:opacity-60"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {error ? (
        <AdminSurface className="p-4 mb-6 border border-red-200 bg-red-50 text-red-700">
          {error}
        </AdminSurface>
      ) : null}

      <AdminSurface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                <th className="p-5 font-bold">User</th>
                <th className="p-5 font-bold">Route</th>
                <th className="p-5 font-bold">Type</th>
                <th className="p-5 font-bold">Price</th>
                <th className="p-5 font-bold">Created</th>
                <th className="p-5 font-bold">Status</th>
                <th className="p-5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={7} label="Loading bookings..." />
              ) : bookings.length === 0 ? (
                <AdminEmptyRow colSpan={7} label="No bookings found in the system." />
              ) : bookings.map((booking) => (
                <tr
                  key={booking._id}
                  onClick={() => setSelectedBooking(booking)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                >
                  <td className="p-5">
                    <div className="font-bold text-gray-900 dark:text-white">{booking.user?.name || "Unknown user"}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{booking.user?.email || "No email"}</div>
                  </td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">
                    <div>{booking.pickupLocation?.address || "No pickup address"}</div>
                    <div>{booking.dropoffLocation?.address || "No dropoff address"}</div>
                  </td>
                  <td className="p-5">
                    <div className="font-semibold text-gray-900 dark:text-white">{booking.ambulanceType}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{booking.distanceKm || 0} km</div>
                  </td>
                  <td className="p-5 font-bold text-gray-900 dark:text-white">Rs. {booking.estimatedPrice || 0}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{formatDate(booking.createdAt)}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${getStatusBadgeClasses(booking.status)}`}>{booking.status}</span>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(booking)}
                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(booking._id)}
                        className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {selectedBooking ? (
        <AdminModal title={`Booking ${selectedBooking._id.slice(-6)}`} subtitle="Full booking details from the backend" onClose={() => setSelectedBooking(null)}>
          <AdminDetailGrid data={getBookingDetails(selectedBooking)} />
        </AdminModal>
      ) : null}

      {editingBooking ? (
        <AdminModal title={`Update Booking ${editingBooking._id.slice(-6)}`} subtitle="Change the current booking status" onClose={closeEditModal}>
          <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4">
            <select
              value={bookingStatus}
              onChange={(event) => setBookingStatus(event.target.value)}
              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 font-semibold"
            >
              {bookingStatusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60">
                {saving ? "Saving..." : "Update Booking"}
              </button>
              <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold">
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </AdminLayout>
  );
}
