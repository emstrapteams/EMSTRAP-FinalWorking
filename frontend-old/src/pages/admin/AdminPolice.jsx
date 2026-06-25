import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminModal from "../../components/admin/AdminModal";
import AdminSurface from "../../components/admin/AdminSurface";
import { AdminEmptyRow, AdminLoadingRow } from "../../components/admin/AdminTableState";
import { formatDate } from "../../components/admin/admin.utils";
import { getErrorMessage } from "../../services/api";
import { addPoliceRecord, deletePoliceRecord, getPoliceRecords, updatePoliceRecord } from "../../services/policeApi";

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  password: "",
  address: "",
  city: "",
  role: "police",
};

export default function AdminPolice() {
  const [form, setForm] = useState(initialForm);
  const [editingPolice, setEditingPolice] = useState(null);
  const [selectedPolice, setSelectedPolice] = useState(null);
  const [policeRecords, setPoliceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const isEditing = useMemo(() => Boolean(editingPolice), [editingPolice]);

  const fetchPolice = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getPoliceRecords();
      if (res.success) {
        setPoliceRecords(res.police || []);
      }
      setError("");
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to load police records");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPolice();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
  };

  const closeEditModal = () => {
    setEditingPolice(null);
    resetForm();
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleEdit = (police) => {
    setEditingPolice(police);
    setForm({
      name: police.name || "",
      mobile: police.mobile || "",
      email: police.email || "",
      address: police.address || "",
      city: police.city || "",
      role: police.role || "police",
      password: "", // Leave blank on edit
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        const res = await updatePoliceRecord(editingPolice._id, form);
        if (res.success) {
          setPoliceRecords((current) => current.map((item) => item._id === editingPolice._id ? res.police : item));
          setSelectedPolice((current) => current?._id === editingPolice._id ? res.police : current);
          toast.success("Police record updated successfully");
          closeEditModal();
        }
      } else {
        const res = await addPoliceRecord(form);
        if (res.success) {
          setPoliceRecords((current) => [res.police, ...current]);
          toast.success("Police record added successfully");
          resetForm();
        }
      }

      setError("");
    } catch (requestError) {
      const message = getErrorMessage(requestError, isEditing ? "Failed to update police record" : "Failed to add police record");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policeId) => {
    const loadingToast = toast.loading("Deleting police record...");

    try {
      const res = await deletePoliceRecord(policeId);
      if (res.success) {
        setPoliceRecords((current) => current.filter((item) => item._id !== policeId));
        if (selectedPolice?._id === policeId) setSelectedPolice(null);
        toast.success("Police record removed", { id: loadingToast });
      }
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Failed to delete police record"), { id: loadingToast });
    }
  };

  const getPoliceDetails = (police) => ({
    Name: police.name,
    Role: police.role === "police_hq" ? "Police Headquarters" : "Police Station",
    Mobile: police.mobile,
    Email: police.email,
    Address: police.address,
    City: police.city,
    "Created Date": formatDate(police.createdAt),
    "Updated Date": formatDate(police.updatedAt),
    "Police ID": police._id,
  });

  return (
    <AdminLayout
      title="Police Management"
      description="Create, view, update, and remove police records."
      actions={
        <button
          type="button"
          onClick={() => fetchPolice({ silent: true })}
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

      <AdminSurface className="p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Police Unit</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="name" value={form.name} onChange={handleInputChange} placeholder="Station/Unit name" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="Mobile number" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="Email" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input type="password" name="password" value={form.password} onChange={handleInputChange} placeholder="Password" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input name="address" value={form.address} onChange={handleInputChange} placeholder="Address" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input name="city" value={form.city} onChange={handleInputChange} placeholder="City" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <select name="role" value={form.role} onChange={handleInputChange} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required>
            <option value="police">Police Station</option>
            <option value="police_hq">Police Headquarters</option>
          </select>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-60">
              {saving ? "Saving..." : "Add Police Unit"}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold">
              Clear
            </button>
          </div>
        </form>
      </AdminSurface>

      <AdminSurface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                <th className="p-5 font-bold">Unit Name</th>
                <th className="p-5 font-bold">Role</th>
                <th className="p-5 font-bold">Contact</th>
                <th className="p-5 font-bold">Email</th>
                <th className="p-5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={5} label="Loading police units..." />
              ) : policeRecords.length === 0 ? (
                <AdminEmptyRow colSpan={5} label="No police units found." />
              ) : policeRecords.map((police) => (
                <tr key={police._id} onClick={() => setSelectedPolice(police)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="p-5 font-bold text-gray-900 dark:text-white">{police.name}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${police.role === "police_hq" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {police.role === "police_hq" ? "HQ" : "Station"}
                    </span>
                  </td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{police.mobile}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{police.email}</td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedPolice(police)} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold">View</button>
                      <button type="button" onClick={() => handleEdit(police)} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold">Update</button>
                      <button type="button" onClick={() => handleDelete(police._id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-semibold">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {selectedPolice ? (
        <AdminModal title={selectedPolice.name} subtitle="Full police unit record" onClose={() => setSelectedPolice(null)}>
          <AdminDetailGrid data={getPoliceDetails(selectedPolice)} />
        </AdminModal>
      ) : null}

      {editingPolice ? (
        <AdminModal title={`Update ${editingPolice.name}`} subtitle="Edit the selected police unit" onClose={closeEditModal}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input name="name" value={form.name} onChange={handleInputChange} placeholder="Unit name" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="Mobile number" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="Email" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input type="password" name="password" value={form.password} onChange={handleInputChange} placeholder="Password (leave blank to keep current)" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" />
            <input name="address" value={form.address} onChange={handleInputChange} placeholder="Address" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input name="city" value={form.city} onChange={handleInputChange} placeholder="City" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <select name="role" value={form.role} onChange={handleInputChange} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required>
              <option value="police">Police Station</option>
              <option value="police_hq">Police Headquarters</option>
            </select>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60">
                {saving ? "Saving..." : "Update Unit"}
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
