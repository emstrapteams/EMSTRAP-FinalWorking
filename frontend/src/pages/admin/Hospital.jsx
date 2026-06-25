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

// ─── Design tokens ────────────────────────────────────────────────────────────

const cls = {
  input:
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/40 hover:border-blue-200",
  btnPrimary:
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold shadow-sm shadow-blue-200 dark:shadow-blue-900/30 transition-all duration-150 disabled:opacity-50",
  btnSave:
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-all duration-150 disabled:opacity-50",
  btnCancel:
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100 text-sm font-bold transition-all duration-150",
  btnRefresh:
    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-violet-400 bg-violet-50 hover:bg-violet-100 active:scale-95 text-violet-700 dark:border-violet-500 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 text-sm font-bold transition-all duration-150 disabled:opacity-50",
  btnView:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-all duration-150 dark:bg-slate-800 dark:hover:bg-blue-950/50 dark:text-slate-300",
  btnEdit:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all duration-150 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300",
  btnDel:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all duration-150 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-400",
  tableRow:
    "group cursor-pointer transition-all duration-150 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 hover:shadow-[inset_3px_0_0_0_#2563eb]",
  th: "p-4 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500",
  td: "p-4",
};

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
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getHospitals();
      if (res.success) setHospitals(res.hospitals || []);
      setError("");
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load hospitals");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHospitals(); }, []);

  const resetForm = () => setForm(initialForm);
  const closeEditModal = () => { setEditingHospital(null); resetForm(); };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  };

  const handleEdit = (h) => {
    setEditingHospital(h);
    setForm({ name: h.name || "", address: h.address || "", city: h.city || "", mobile: h.mobile || "", email: h.email || "", password: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        const res = await updateHospital(editingHospital._id, form);
        if (res.success) {
          setHospitals((c) => c.map((i) => i._id === editingHospital._id ? res.hospital : i));
          setSelectedHospital((c) => c?._id === editingHospital._id ? res.hospital : c);
          toast.success("Hospital updated");
          closeEditModal();
        }
      } else {
        const res = await addHospital(form);
        if (res.success) {
          setHospitals((c) => [res.hospital, ...c]);
          toast.success("Hospital added");
          resetForm();
        }
      }
      setError("");
    } catch (err) {
      const msg = getErrorMessage(err, isEditing ? "Failed to update hospital" : "Failed to add hospital");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (hospitalId) => {
    const tid = toast.loading("Deleting hospital…");
    try {
      const res = await deleteHospital(hospitalId);
      if (res.success) {
        setHospitals((c) => c.filter((i) => i._id !== hospitalId));
        if (selectedHospital?._id === hospitalId) setSelectedHospital(null);
        toast.success("Hospital removed", { id: tid });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete hospital"), { id: tid });
    }
  };

  const getHospitalDetails = (h) => ({
    Name: h.name,
    Address: h.address,
    City: h.city,
    Mobile: h.mobile,
    Email: h.email,
    "Created Date": formatDate(h.createdAt),
    "Updated Date": formatDate(h.updatedAt),
    "Hospital ID": h._id,
  });

  const formFields = (isEdit) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Hospital name</label>
        <input name="name" value={form.name} onChange={handleInputChange} placeholder="e.g. City General Hospital" className={cls.input} required />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Mobile</label>
        <input name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="+91 98765 43210" className={cls.input} required />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
        <input type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="admin@hospital.org" className={cls.input} required />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          {isEdit ? "Password (leave blank to keep)" : "Password"}
        </label>
        <input type="password" name="password" value={form.password} onChange={handleInputChange} placeholder="••••••••" className={cls.input} required={!isEdit} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Address</label>
        <input name="address" value={form.address} onChange={handleInputChange} placeholder="Street address" className={cls.input} required />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">City</label>
        <input name="city" value={form.city} onChange={handleInputChange} placeholder="Bangalore" className={cls.input} required />
      </div>
    </div>
  );

  return (
    <AdminLayout
      title="Hospital Management"
      description="Create, view, update, and remove hospital records."
      actions={
        <button type="button" onClick={() => fetchHospitals({ silent: true })} disabled={refreshing} className={cls.btnRefresh}>
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

      {/* Add form */}
      <AdminSurface className="mb-6 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="1"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v6M9 10h6M8 21v-4h8v4"/></svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Hospital</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Register a new hospital to the platform</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          {formFields(false)}
          <div className="flex gap-3 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="submit" disabled={saving} className={cls.btnPrimary}>
              {saving ? "Saving…" : "Add Hospital"}
            </button>
            <button type="button" onClick={resetForm} className={cls.btnCancel}>Clear</button>
          </div>
        </form>
      </AdminSurface>

      {/* Table */}
      <AdminSurface className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            All Hospitals
            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
              {hospitals.length}
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40">
                <th className={cls.th}>Hospital</th>
                <th className={cls.th}>Location</th>
                <th className={cls.th}>Mobile</th>
                <th className={cls.th}>Email</th>
                <th className={cls.th}>Created</th>
                <th className={cls.th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={6} label="Loading hospitals…" />
              ) : hospitals.length === 0 ? (
                <AdminEmptyRow colSpan={6} label="No hospitals found." />
              ) : hospitals.map((h) => (
                <tr key={h._id} onClick={() => setSelectedHospital(h)} className={cls.tableRow}>
                  <td className={cls.td}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/30 flex items-center justify-center">
                        <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="1"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v6M9 10h6M8 21v-4h8v4"/></svg>
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{h.name}</p>
                    </div>
                  </td>
                  <td className={cls.td}>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{h.city}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-40">{h.address}</p>
                  </td>
                  <td className={`${cls.td} text-sm text-gray-600 dark:text-gray-400`}>{h.mobile}</td>
                  <td className={`${cls.td} text-sm text-gray-600 dark:text-gray-400`}>{h.email}</td>
                  <td className={`${cls.td} text-xs text-gray-500 dark:text-gray-400`}>{formatDate(h.createdAt)}</td>
                  <td className={cls.td}>
                    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedHospital(h)} className={cls.btnView}>View</button>
                      <button type="button" onClick={() => handleEdit(h)} className={cls.btnEdit}>Update</button>
                      <button type="button" onClick={() => handleDelete(h._id)} className={cls.btnDel}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {selectedHospital && (
        <AdminModal title={selectedHospital.name} subtitle="Full hospital record" onClose={() => setSelectedHospital(null)}>
          <AdminDetailGrid data={getHospitalDetails(selectedHospital)} />
        </AdminModal>
      )}

      {editingHospital && (
        <AdminModal title={`Update – ${editingHospital.name}`} subtitle="Edit the selected hospital" onClose={closeEditModal}>
          <form onSubmit={handleSubmit}>
            {formFields(true)}
            <div className="flex gap-3 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={saving} className={cls.btnSave}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button type="button" onClick={closeEditModal} className={cls.btnCancel}>Cancel</button>
            </div>
          </form>
        </AdminModal>
      )}
    </AdminLayout>
  );
}