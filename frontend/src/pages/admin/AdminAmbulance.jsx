import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminModal from "../../components/admin/AdminModal";
import AdminSurface from "../../components/admin/AdminSurface";
import { AdminEmptyRow, AdminLoadingRow } from "../../components/admin/AdminTableState";
import { formatDate, getStatusBadgeClasses } from "../../components/admin/admin.utils";
import { getErrorMessage } from "../../services/api";
import {
  addPrivateDriver,
  deleteAmbulance,
  deletePrivateDriver,
  getAmbulances,
  getPrivateDrivers,
  updateAmbulance,
  updatePrivateDriver,
} from "../../services/ambulanceApi";
const initialForm = {
  name: "",
  vehicleNumber: "",
  mobile: "",
  address: "",
  city: "",
  email: "",
  password: "",
  driverStatus: "OFFLINE",
  driverType: "private"
};

const statusOptions = [
  { label: "Online", value: "LIVE" },
  { label: "Offline", value: "OFFLINE" },
];

export default function AdminAmbulance() {
  const [ambulances, setAmbulances] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [editingAmbulance, setEditingAmbulance] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAmbulances = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {

      const [govRes, privateRes] = await Promise.all([
        getAmbulances(),
        getPrivateDrivers()
      ]);

      const governmentDrivers =
        (govRes.ambulances || []).map(driver => ({
          ...driver,
          driverType: "government"
        }));

      const privateDrivers =
        (privateRes.drivers || []).map(driver => ({
          ...driver,
          driverType: "private"
        }));

      setAmbulances([
        ...governmentDrivers,
        ...privateDrivers
      ]);

      setError("");

    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to load ambulance drivers");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAmbulances();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => setForm(initialForm);

  const openEditModal = (ambulance) => {
    setEditingAmbulance(ambulance);
    setForm({
      name: ambulance.name || "",
      vehicleNumber: ambulance.vehicleNumber || "",
      mobile: ambulance.mobile || "",
      address: ambulance.address || "",
      city: ambulance.city || "",
      email: ambulance.email || "",
      password: "",
      driverStatus: ambulance.driverStatus || "OFFLINE",
      driverType: ambulance.driverType || "government",
    });
  };

  const closeEditModal = () => {
    setEditingAmbulance(null);
    resetForm();
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {

      const payload = {
        ...form,
        role:
          form.driverType === "government"
            ? "ambulance_driver"
            : "private_driver"
      };
      console.log("PAYLOAD SENT:", payload);
      const res = await addPrivateDriver(payload);

      if (res.success) {
        toast.success("Driver added successfully");
        resetForm();
        await fetchAmbulances({ silent: true });
      }

    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Failed to add ambulance driver"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingAmbulance) return;

    setSaving(true);

    try {

      let res;

      if (editingAmbulance.driverType === "private") {

        res = await updatePrivateDriver(
          editingAmbulance._id,
          form
        );

      } else {

        res = await updateAmbulance(
          editingAmbulance._id,
          form
        );

      }

      if (res.success) {

        const updatedDriver = {
          ...(res.driver || res.ambulance),
          driverType: editingAmbulance.driverType
        };

        setAmbulances((current) =>
          current.map((item) =>
            item._id === editingAmbulance._id
              ? updatedDriver
              : item
          )
        );

        setSelectedAmbulance((current) =>
          current?._id === editingAmbulance._id
            ? updatedDriver
            : current
        );

        toast.success("Driver updated successfully");

        closeEditModal();
      }

    } catch (requestError) {

      toast.error(
        getErrorMessage(
          requestError,
          "Failed to update driver"
        )
      );

    } finally {

      setSaving(false);

    }
  };
  const handleDelete = async (driver) => {

    const loadingToast =
      toast.loading("Deleting driver...");

    try {

      let res;

      if (driver.driverType === "private") {

        res = await deletePrivateDriver(
          driver._id
        );

      } else {

        res = await deleteAmbulance(
          driver._id
        );

      }

      if (res.success) {

        setAmbulances((current) =>
          current.filter(
            (item) => item._id !== driver._id
          )
        );

        if (
          selectedAmbulance?._id === driver._id
        ) {
          setSelectedAmbulance(null);
        }

        toast.success(
          "Driver deleted successfully",
          { id: loadingToast }
        );
      }

    } catch (requestError) {

      toast.error(
        getErrorMessage(
          requestError,
          "Failed to delete driver"
        ),
        { id: loadingToast }
      );

    }
  };

  const getDetails = (ambulance) => ({
    Name: ambulance.name,
    "Vehicle Number": ambulance.vehicleNumber,
    Mobile: ambulance.mobile,
    Email: ambulance.email,
    Address: ambulance.address,
    City: ambulance.city,
    Status: ambulance.driverStatus === "LIVE" ? "Online" : "Offline",
    "On Trip": ambulance.isOnTrip ? "Yes" : "No",
    "Created Date": formatDate(ambulance.createdAt),
    "Updated Date": formatDate(ambulance.updatedAt),
    "Driver ID": ambulance._id,
  });

  const renderForm = (onSubmit, submitLabel, clearAction) => (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <select
        name="driverType"
        value={form.driverType}
        onChange={handleInputChange}
        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
      >
        <option value="private">
          Private Driver
        </option>

        <option value="government">
          Government Driver
        </option>
      </select>
      <input name="name" value={form.name} onChange={handleInputChange} placeholder="Driver name" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" required />
      <input name="vehicleNumber" value={form.vehicleNumber} onChange={handleInputChange} placeholder="Vehicle number" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" required />
      <input name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="Mobile number" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" required />
      <input name="email" type="email" value={form.email} onChange={handleInputChange} placeholder="Email" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" required />
      <input name="address" value={form.address} onChange={handleInputChange} placeholder="Address" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" required />
      <input name="city" value={form.city} onChange={handleInputChange} placeholder="City" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" required />
      <input name="password" type="password" value={form.password} onChange={handleInputChange} placeholder={editingAmbulance ? "Password (leave blank to keep current)" : "Password"} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" required={!editingAmbulance} />
      <select name="driverStatus" value={form.driverStatus} onChange={handleInputChange} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="flex gap-3 md:col-span-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-60">
          {saving ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={clearAction} className="rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100">
          {editingAmbulance ? "Cancel" : "Clear"}
        </button>
      </div>
    </form>
  );

  return (
    <AdminLayout
      title="Driver Management"
      description="Manage private drivers directly in the User collection."
      actions={
        <button
          type="button"
          onClick={() => fetchAmbulances({ silent: true })}
          disabled={refreshing}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-900 disabled:opacity-60"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {error ? (
        <AdminSurface className="mb-6 border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </AdminSurface>
      ) : null}

      <AdminSurface className="mb-6 p-6">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Add Private Driver</h2>
        {renderForm(handleCreate, "Add Driver", resetForm)}
      </AdminSurface>

      <AdminSurface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                <th className="p-5 font-bold">Name</th>
                <th className="p-5 font-bold">Vehicle</th>
                <th className="p-5 font-bold">Contact</th>
                <th className="p-5 font-bold">Email</th>
                <th className="p-5 font-bold">Driver Type</th>
                <th className="p-5 font-bold">Status</th>
                <th className="p-5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={6} label="Loading ambulance drivers..." />
              ) : ambulances.length === 0 ? (
                <AdminEmptyRow colSpan={6} label="No ambulance drivers found." />
              ) : ambulances.map((ambulance) => (
                <tr key={ambulance._id} onClick={() => setSelectedAmbulance(ambulance)} className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/20">
                  <td className="p-5 font-bold text-gray-900 dark:text-white">{ambulance.name}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{ambulance.vehicleNumber}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{ambulance.mobile}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{ambulance.email}</td>
                  <td className="p-5">
                    <span
                      className={`rounded-full px-3 py-2 text-xs font-bold ${ambulance.driverType === "government"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                        }`}
                    >
                      {ambulance.driverType === "government"
                        ? "Government"
                        : "Private"}
                    </span>
                  </td>
                  <td className="p-5">
                    <span className={`rounded-full px-3 py-2 text-xs font-bold ${ambulance.driverStatus === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {ambulance.driverStatus === 'LIVE' ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedAmbulance(ambulance)} className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">View</button>
                      <button type="button" onClick={() => openEditModal(ambulance)} className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700">Update</button>
                      <button type="button" onClick={() => handleDelete(ambulance)} className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {selectedAmbulance ? (
        <AdminModal title={selectedAmbulance.name} subtitle="Full driver details" onClose={() => setSelectedAmbulance(null)}>
          <AdminDetailGrid data={getDetails(selectedAmbulance)} />
        </AdminModal>
      ) : null}

      {editingAmbulance ? (
        <AdminModal title={`Update ${editingAmbulance.name}`} subtitle="Edit the selected driver" onClose={closeEditModal}>
          {renderForm(handleUpdate, "Update Driver", closeEditModal)}
        </AdminModal>
      ) : null}
    </AdminLayout>
  );
}
