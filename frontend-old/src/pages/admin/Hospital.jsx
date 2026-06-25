import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminModal from "../../components/admin/AdminModal";
import AdminSurface from "../../components/admin/AdminSurface";
import { AdminEmptyRow, AdminLoadingRow } from "../../components/admin/AdminTableState";
import { formatDate } from "../../components/admin/admin.utils";
import { getErrorMessage } from "../../services/api";
import { addHospital, deleteHospital, getHospitals, updateHospital } from "../../services/hospitalApi";

const initialForm = {
  name: "",
  address: "",
  city: "",
  mobile: "",
  email: "",
  password: "",
};

export default function Hospital() {
  const [form, setForm] = useState(initialForm);
  const [editingHospital, setEditingHospital] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const isEditing = useMemo(() => Boolean(editingHospital), [editingHospital]);

  const fetchHospitals = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getHospitals();
      if (res.success) {
        setHospitals(res.hospitals || []);
      }
      setError("");
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to load hospitals");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
  };

  const closeEditModal = () => {
    setEditingHospital(null);
    resetForm();
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleEdit = (hospital) => {
    setEditingHospital(hospital);
    setForm({
      name: hospital.name || "",
      address: hospital.address || "",
      city: hospital.city || "",
      mobile: hospital.mobile || "",
      email: hospital.email || "",
      password: "", // Leave blank on edit unless updating
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        const res = await updateHospital(editingHospital._id, form);
        if (res.success) {
          setHospitals((current) => current.map((item) => item._id === editingHospital._id ? res.hospital : item));
          setSelectedHospital((current) => current?._id === editingHospital._id ? res.hospital : current);
          toast.success("Hospital updated successfully");
          closeEditModal();
        }
      } else {
        const res = await addHospital(form);
        if (res.success) {
          setHospitals((current) => [res.hospital, ...current]);
          toast.success("Hospital added successfully");
          resetForm();
        }
      }

      setError("");
    } catch (requestError) {
      const message = getErrorMessage(requestError, isEditing ? "Failed to update hospital" : "Failed to add hospital");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (hospitalId) => {
    const loadingToast = toast.loading("Deleting hospital...");

    try {
      const res = await deleteHospital(hospitalId);
      if (res.success) {
        setHospitals((current) => current.filter((item) => item._id !== hospitalId));
        if (selectedHospital?._id === hospitalId) setSelectedHospital(null);
        toast.success("Hospital removed", { id: loadingToast });
      }
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Failed to delete hospital"), { id: loadingToast });
    }
  };

  const getHospitalDetails = (hospital) => ({
    Name: hospital.name,
    Address: hospital.address,
    City: hospital.city,
    Mobile: hospital.mobile,
    Email: hospital.email,
    "Created Date": formatDate(hospital.createdAt),
    "Updated Date": formatDate(hospital.updatedAt),
    "Hospital ID": hospital._id,
  });

  return (
    <AdminLayout
      title="Hospital Management"
      description="Create, view, update, and remove hospital records."
      actions={
        <button
          type="button"
          onClick={() => fetchHospitals({ silent: true })}
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Hospital</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="name" value={form.name} onChange={handleInputChange} placeholder="Hospital name" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input name="address" value={form.address} onChange={handleInputChange} placeholder="Address" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input name="city" value={form.city} onChange={handleInputChange} placeholder="City" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="Mobile number" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="Email" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <input type="password" name="password" value={form.password} onChange={handleInputChange} placeholder="Password" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-60">
              {saving ? "Saving..." : "Add Hospital"}
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
                <th className="p-5 font-bold">Name</th>
                <th className="p-5 font-bold">Address</th>
                <th className="p-5 font-bold">Mobile</th>
                <th className="p-5 font-bold">Email</th>
                <th className="p-5 font-bold">Created</th>
                <th className="p-5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={6} label="Loading hospitals..." />
              ) : hospitals.length === 0 ? (
                <AdminEmptyRow colSpan={6} label="No hospitals found." />
              ) : hospitals.map((hospital) => (
                <tr key={hospital._id} onClick={() => setSelectedHospital(hospital)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="p-5 font-bold text-gray-900 dark:text-white">{hospital.name}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{hospital.address}, {hospital.city}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{hospital.mobile}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{hospital.email}</td>
                  <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{formatDate(hospital.createdAt)}</td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedHospital(hospital)} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold">View</button>
                      <button type="button" onClick={() => handleEdit(hospital)} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold">Update</button>
                      <button type="button" onClick={() => handleDelete(hospital._id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-semibold">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {selectedHospital ? (
        <AdminModal title={selectedHospital.name} subtitle="Full hospital record" onClose={() => setSelectedHospital(null)}>
          <AdminDetailGrid data={getHospitalDetails(selectedHospital)} />
        </AdminModal>
      ) : null}

      {editingHospital ? (
        <AdminModal title={`Update ${editingHospital.name}`} subtitle="Edit the selected hospital record" onClose={closeEditModal}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input name="name" value={form.name} onChange={handleInputChange} placeholder="Hospital name" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input name="address" value={form.address} onChange={handleInputChange} placeholder="Address" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input name="city" value={form.city} onChange={handleInputChange} placeholder="City" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="Mobile number" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="Email" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" required />
            <input type="password" name="password" value={form.password} onChange={handleInputChange} placeholder="Password (leave blank to keep current)" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3" />
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60">
                {saving ? "Saving..." : "Update Hospital"}
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
