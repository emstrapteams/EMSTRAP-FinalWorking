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

// ─── Design tokens ────────────────────────────────────────────────────────────

const cls = {
  input:
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-800/40 hover:border-violet-200",
  select:
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 transition-all duration-150 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-800/40 hover:border-violet-200",
  btnPrimary:
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-bold shadow-sm shadow-violet-200 dark:shadow-violet-900/30 transition-all duration-150 disabled:opacity-50",
  btnSave:
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-all duration-150 disabled:opacity-50",
  btnCancel:
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100 text-sm font-bold transition-all duration-150",
  btnRefresh:
    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-violet-400 bg-violet-50 hover:bg-violet-100 active:scale-95 text-violet-700 dark:border-violet-500 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 text-sm font-bold transition-all duration-150 disabled:opacity-50",
  btnView:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-violet-50 text-slate-600 hover:text-violet-700 text-xs font-bold transition-all duration-150 dark:bg-slate-800 dark:hover:bg-violet-950/50 dark:text-slate-300",
  btnEdit:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all duration-150 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300",
  btnDel:
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all duration-150 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-400",
  tableRow:
    "group cursor-pointer transition-all duration-150 hover:bg-violet-50/60 dark:hover:bg-violet-950/20 hover:shadow-[inset_3px_0_0_0_#7c3aed]",
  th: "p-4 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500",
  td: "p-4",
};

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  password: "",
  address: "",
  city: "",
  role: "police",
};

const roleBadge = (role) =>
  role === "police_hq"
    ? "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/40"
    : "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40";

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
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getPoliceRecords();
      if (res.success) setPoliceRecords(res.police || []);
      setError("");
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load police records");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPolice(); }, []);

  const resetForm = () => setForm(initialForm);
  const closeEditModal = () => { setEditingPolice(null); resetForm(); };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  };

  const handleEdit = (p) => {
    setEditingPolice(p);
    setForm({ name: p.name || "", mobile: p.mobile || "", email: p.email || "", address: p.address || "", city: p.city || "", role: p.role || "police", password: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        const res = await updatePoliceRecord(editingPolice._id, form);
        if (res.success) {
          setPoliceRecords((c) => c.map((i) => i._id === editingPolice._id ? res.police : i));
          setSelectedPolice((c) => c?._id === editingPolice._id ? res.police : c);
          toast.success("Police record updated");
          closeEditModal();
        }
      } else {
        const res = await addPoliceRecord(form);
        if (res.success) {
          setPoliceRecords((c) => [res.police, ...c]);
          toast.success("Police unit added");
          resetForm();
        }
      }
      setError("");
    } catch (err) {
      const msg = getErrorMessage(err, isEditing ? "Failed to update" : "Failed to add");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const tid = toast.loading("Deleting police record…");
    try {
      const res = await deletePoliceRecord(id);
      if (res.success) {
        setPoliceRecords((c) => c.filter((i) => i._id !== id));
        if (selectedPolice?._id === id) setSelectedPolice(null);
        toast.success("Police record removed", { id: tid });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete"), { id: tid });
    }
  };

  const getPoliceDetails = (p) => ({
    Name: p.name,
    Role: p.role === "police_hq" ? "Police Headquarters" : "Police Station",
    Mobile: p.mobile,
    Email: p.email,
    Address: p.address,
    City: p.city,
    "Created Date": formatDate(p.createdAt),
    "Updated Date": formatDate(p.updatedAt),
    "Police ID": p._id,
  });

  const formFields = (isEdit) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Station / Unit name</label>
        <input name="name" value={form.name} onChange={handleInputChange} placeholder="e.g. MG Road Police Station" className={cls.input} required />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Mobile</label>
        <input name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="+91 98765 43210" className={cls.input} required />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
        <input type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="station@police.gov" className={cls.input} required />
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
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Role</label>
        <select name="role" value={form.role} onChange={handleInputChange} className={cls.select} required>
          <option value="police">Police Station</option>
          <option value="police_hq">Police Headquarters</option>
        </select>
      </div>
    </div>
  );

  return (
    <AdminLayout
      title="Police Management"
      description="Create, view, update, and remove police unit records."
      actions={
        <button type="button" onClick={() => fetchPolice({ silent: true })} disabled={refreshing} className={cls.btnRefresh}>
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
          <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z"/></svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Police Unit</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Register a new police station or headquarters</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          {formFields(false)}
          <div className="flex gap-3 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="submit" disabled={saving} className={cls.btnPrimary}>
              {saving ? "Saving…" : "Add Police Unit"}
            </button>
            <button type="button" onClick={resetForm} className={cls.btnCancel}>Clear</button>
          </div>
        </form>
      </AdminSurface>

      {/* Table */}
      <AdminSurface className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            All Units
            <span className="ml-2 inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-300">
              {policeRecords.length}
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40">
                <th className={cls.th}>Unit</th>
                <th className={cls.th}>Role</th>
                <th className={cls.th}>Contact</th>
                <th className={cls.th}>Email</th>
                <th className={cls.th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={5} label="Loading police units…" />
              ) : policeRecords.length === 0 ? (
                <AdminEmptyRow colSpan={5} label="No police units found." />
              ) : policeRecords.map((p) => (
                <tr key={p._id} onClick={() => setSelectedPolice(p)} className={cls.tableRow}>
                  <td className={cls.td}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/30 flex items-center justify-center">
                        <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z"/></svg>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{p.city || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cls.td}>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${roleBadge(p.role)}`}>
                      {p.role === "police_hq" ? "Headquarters" : "Station"}
                    </span>
                  </td>
                  <td className={`${cls.td} text-sm text-gray-600 dark:text-gray-400`}>{p.mobile}</td>
                  <td className={`${cls.td} text-sm text-gray-600 dark:text-gray-400`}>{p.email}</td>
                  <td className={cls.td}>
                    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedPolice(p)} className={cls.btnView}>View</button>
                      <button type="button" onClick={() => handleEdit(p)} className={cls.btnEdit}>Update</button>
                      <button type="button" onClick={() => handleDelete(p._id)} className={cls.btnDel}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {selectedPolice && (
        <AdminModal title={selectedPolice.name} subtitle="Full police unit record" onClose={() => setSelectedPolice(null)}>
          <AdminDetailGrid data={getPoliceDetails(selectedPolice)} />
        </AdminModal>
      )}

      {editingPolice && (
        <AdminModal title={`Update – ${editingPolice.name}`} subtitle="Edit the selected police unit" onClose={closeEditModal}>
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