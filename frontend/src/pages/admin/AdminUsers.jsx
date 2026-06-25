import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AdminDetailGrid from "../../components/admin/AdminDetailGrid";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminModal from "../../components/admin/AdminModal";
import AdminSurface from "../../components/admin/AdminSurface";
import { AdminEmptyRow, AdminLoadingRow } from "../../components/admin/AdminTableState";
import { formatDate, roleOptions } from "../../components/admin/admin.utils";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { deleteUser, getUsers, updateUser } from "../../services/userApi";

// ─── Design tokens ────────────────────────────────────────────────────────────

const cls = {
  input:
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800/40 hover:border-indigo-200",
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
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all duration-150 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed",
  tableRow:
    "group cursor-pointer transition-all duration-150 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 hover:shadow-[inset_3px_0_0_0_#6366f1]",
  th: "p-4 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500",
  td: "p-4",
};

// ─── Role config ──────────────────────────────────────────────────────────────

const getRoleConfig = (role) => {
  switch (role) {
    case "police":
    case "police_hq":
      return {
        avatarBg: "from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/30",
        avatarText: "text-blue-700 dark:text-blue-300",
        badge: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40",
        label: role === "police_hq" ? "Police HQ" : "Police",
      };
    case "hospital":
    case "hospital_admin":
      return {
        avatarBg: "from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/30",
        avatarText: "text-cyan-700 dark:text-cyan-300",
        badge: "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800/40",
        label: "Hospital",
      };
    case "ambulance_driver":
      return {
        avatarBg: "from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/30",
        avatarText: "text-red-700 dark:text-red-300",
        badge: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/40",
        label: "Driver",
      };
    case "admin":
      return {
        avatarBg: "from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/30",
        avatarText: "text-amber-700 dark:text-amber-300",
        badge: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40",
        label: "Admin",
      };
    default:
      return {
        avatarBg: "from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/30",
        avatarText: "text-indigo-700 dark:text-indigo-300",
        badge: "bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/40",
        label: "User",
      };
  }
};

// ─── Form initial state ───────────────────────────────────────────────────────

const initialForm = {
  name: "",
  email: "",
  mobile: "",
  city: "",
  address: "",
  role: "user",
  vehicleNumber: "",
  isEmailVerified: false,
};

export default function AdminUsers() {
  const { user: authUser } = useAuth();
  const [users, setUsers]               = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser]   = useState(null);
  const [form, setForm]                 = useState(initialForm);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");

  const fetchUsers = async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getUsers();
      if (res.success) setUsers(res.users || []);
      setError("");
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load users");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.city || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((c) => ({ ...c, [name]: type === "checkbox" ? checked : value }));
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      city: user.city || "",
      address: user.address || "",
      role: user.role || "user",
      vehicleNumber: user.vehicleNumber || "",
      isEmailVerified: user.isEmailVerified || false,
    });
  };

  const closeEditModal = () => { setEditingUser(null); setForm(initialForm); };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await updateUser(editingUser._id, form);
      if (res.success) {
        setUsers((c) => c.map((u) => u._id === editingUser._id ? res.user : u));
        setSelectedUser((c) => c?._id === editingUser._id ? res.user : c);
        toast.success("User updated");
        closeEditModal();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update user"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const tid = toast.loading("Deleting user…");
    try {
      const res = await deleteUser(userId);
      if (res.success) {
        setUsers((c) => c.filter((u) => u._id !== userId));
        if (selectedUser?._id === userId) setSelectedUser(null);
        toast.success("User deleted", { id: tid });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete user"), { id: tid });
    }
  };

  const getUserDetails = (u) => ({
    Name: u.name,
    Email: u.email,
    Mobile: u.mobile,
    City: u.city,
    Address: u.address,
    Role: u.role,
    "Vehicle Number": u.vehicleNumber,
    "Email Verified": u.isEmailVerified ? "Yes" : "No",
    "Created Date": formatDate(u.createdAt),
    "Updated Date": formatDate(u.updatedAt),
    "User ID": u._id,
  });

  return (
    <AdminLayout
      title="User Management"
      description="View, update, and delete user records from the platform."
      actions={
        <button type="button" onClick={() => fetchUsers({ silent: true })} disabled={refreshing} className={cls.btnRefresh}>
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
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white shrink-0">
            All Users
            <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {filteredUsers.length}
            </span>
          </h2>
          <div className="relative flex-1 max-w-sm sm:ml-auto">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, role…"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800/40 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40">
                <th className={cls.th}>User</th>
                <th className={cls.th}>Contact</th>
                <th className={cls.th}>Location</th>
                <th className={cls.th}>Joined</th>
                <th className={cls.th}>Role</th>
                <th className={cls.th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={6} label="Loading users…" />
              ) : filteredUsers.length === 0 ? (
                <AdminEmptyRow colSpan={6} label="No users found." />
              ) : filteredUsers.map((user) => {
                const config = getRoleConfig(user.role);
                return (
                  <tr key={user._id} onClick={() => setSelectedUser(user)} className={cls.tableRow}>
                    <td className={cls.td}>
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${config.avatarBg} flex items-center justify-center font-black text-sm ${config.avatarText}`}>
                          {(user.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{user.name || "Unnamed"}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {user.isEmailVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 dark:text-amber-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={cls.td}>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{user.mobile || "—"}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{user.email}</p>
                    </td>
                    <td className={cls.td}>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{user.city || "—"}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-40">{user.address || "—"}</p>
                    </td>
                    <td className={`${cls.td} text-xs text-gray-500 dark:text-gray-400`}>{formatDate(user.createdAt)}</td>
                    <td className={cls.td}>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${config.badge}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className={cls.td}>
                      <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setSelectedUser(user)} className={cls.btnView}>View</button>
                        <button type="button" onClick={() => openEditModal(user)} className={cls.btnEdit}>Update</button>
                        <button
                          type="button"
                          disabled={authUser?._id === user._id}
                          onClick={() => handleDeleteUser(user._id)}
                          className={cls.btnDel}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {selectedUser && (
        <AdminModal title={selectedUser.name || "User details"} subtitle="Full stored user details" onClose={() => setSelectedUser(null)}>
          <AdminDetailGrid data={getUserDetails(selectedUser)} />
        </AdminModal>
      )}

      {editingUser && (
        <AdminModal title={`Update – ${editingUser.name || "User"}`} subtitle="Edit the existing user record" onClose={closeEditModal}>
          <form onSubmit={handleUpdateUser} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { name: "name",    label: "Name",    placeholder: "Full name",  type: "text" },
              { name: "email",   label: "Email",   placeholder: "Email",      type: "email" },
              { name: "mobile",  label: "Mobile",  placeholder: "Mobile",     type: "text" },
              { name: "city",    label: "City",    placeholder: "City",       type: "text" },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{f.label}</label>
                <input name={f.name} type={f.type} value={form[f.name]} onChange={handleInputChange} placeholder={f.placeholder} className={cls.input} required={["name","email"].includes(f.name)} />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Address</label>
              <input name="address" value={form.address} onChange={handleInputChange} placeholder="Street address" className={cls.input} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Role</label>
              <select name="role" value={form.role} onChange={handleInputChange} className={cls.select}>
                {(roleOptions || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Vehicle number</label>
              <input name="vehicleNumber" value={form.vehicleNumber} onChange={handleInputChange} placeholder="KA-01-AB-1234" className={cls.input} />
            </div>
            <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 cursor-pointer hover:border-indigo-300 transition-colors">
              <input type="checkbox" name="isEmailVerified" checked={form.isEmailVerified} onChange={handleInputChange} className="h-4 w-4 accent-indigo-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email verified</span>
            </label>
            <div className="md:col-span-2 flex gap-3 pt-1 border-t border-gray-100 dark:border-gray-800 mt-1">
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