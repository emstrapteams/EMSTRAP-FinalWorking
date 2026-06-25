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

const roleColors = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200",
  ambulance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200",
  ambulance_driver: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200",
  hospital: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200",
  hospital_admin: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200",
  police: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200",
  police_hq: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200",
  user: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalAccounts = useMemo(() => users.length, [users]);

  const fetchUsers = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getUsers();
      if (res.success) setUsers(res.users || []);
      setError("");
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to load users database");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      isEmailVerified: Boolean(user.isEmailVerified),
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setForm(initialForm);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleDeleteUser = async (userId) => {
    const loadingToast = toast.loading("Deleting user...");

    try {
      const res = await deleteUser(userId);
      if (res.success) {
        setUsers((current) => current.filter((item) => item._id !== userId));
        if (selectedUser?._id === userId) setSelectedUser(null);
        toast.success("User removed successfully", { id: loadingToast });
      }
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Failed to delete user"), { id: loadingToast });
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!editingUser) return;

    setSaving(true);

    try {
      const res = await updateUser(editingUser._id, form);
      if (res.success) {
        setUsers((current) => current.map((item) => item._id === editingUser._id ? res.user : item));
        setSelectedUser((current) => current?._id === editingUser._id ? res.user : current);
        toast.success("User updated successfully");
        closeEditModal();
      }
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Failed to update user"));
    } finally {
      setSaving(false);
    }
  };

  const getUserDetails = (user) => ({
    Name: user.name,
    Email: user.email,
    Role: user.role,
    Mobile: user.mobile,
    City: user.city,
    Address: user.address,
    "Vehicle Number": user.vehicleNumber,
    "Email Verified": user.isEmailVerified,
    "Created Date": formatDate(user.createdAt),
    "Updated Date": formatDate(user.updatedAt),
    "User ID": user._id,
  });

  return (
    <AdminLayout
      title="User Management"
      description="Open any user for a full detail view, update their stored profile fields, or remove the account."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fetchUsers({ silent: true })}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-white text-gray-900 border border-gray-200 font-semibold disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">
            Total Accounts: {totalAccounts}
          </div>
        </div>
      }
    >
      {error ? (
        <AdminSurface className="p-4 mb-6 border border-red-200 bg-red-50 text-red-700">
          {error}
        </AdminSurface>
      ) : null}

      <AdminSurface className="overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                <th className="p-5 font-bold">User Identity</th>
                <th className="p-5 font-bold">Contact</th>
                <th className="p-5 font-bold">Location</th>
                <th className="p-5 font-bold">Join Date</th>
                <th className="p-5 font-bold">Current Role</th>
                <th className="p-5 font-bold w-56">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <AdminLoadingRow colSpan={6} label="Loading user records..." />
              ) : users.length === 0 ? (
                <AdminEmptyRow colSpan={6} label="No users found in the database." />
              ) : users.map((user) => (
                <tr
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                >
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 shadow-inner">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.isEmailVerified ? "Verified email" : "Pending verification"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-gray-600 dark:text-gray-400 text-sm">
                    <div className="font-medium text-gray-800 dark:text-gray-300">{user.mobile || "No mobile"}</div>
                    <div>{user.email}</div>
                  </td>
                  <td className="p-5 text-gray-600 dark:text-gray-400 text-sm">
                    <div>{user.city || "No city"}</div>
                    <div className="truncate max-w-48">{user.address || "No address"}</div>
                  </td>
                  <td className="p-5 text-gray-600 dark:text-gray-400 text-sm">{formatDate(user.createdAt)}</td>
                  <td className="p-5">
                    <span className={`inline-flex rounded-full border px-3 py-2 text-xs font-bold uppercase ${roleColors[user.role] || roleColors.user}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedUser(user)} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold">View</button>
                      <button type="button" onClick={() => openEditModal(user)} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold">Update</button>
                      <button
                        type="button"
                        disabled={currentUser?._id === user._id}
                        onClick={() => handleDeleteUser(user._id)}
                        className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-semibold disabled:opacity-50"
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

      {selectedUser ? (
        <AdminModal title={selectedUser.name || "User details"} subtitle="Full stored user details from the backend" onClose={() => setSelectedUser(null)}>
          <AdminDetailGrid data={getUserDetails(selectedUser)} />
        </AdminModal>
      ) : null}

      {editingUser ? (
        <AdminModal title={`Update ${editingUser.name || "user"}`} subtitle="Edit the existing user record with pre-filled data" onClose={closeEditModal}>
          <form onSubmit={handleUpdateUser} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input name="name" value={form.name} onChange={handleInputChange} placeholder="Name" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100" required />
            <input type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="Email" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100" required />
            <input name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="Mobile" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100" />
            <input name="city" value={form.city} onChange={handleInputChange} placeholder="City" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100" />
            <input name="address" value={form.address} onChange={handleInputChange} placeholder="Address" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 md:col-span-2" />
            <select name="role" value={form.role} onChange={handleInputChange} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100">
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input name="vehicleNumber" value={form.vehicleNumber} onChange={handleInputChange} placeholder="Vehicle Number" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100" />
            <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <input type="checkbox" name="isEmailVerified" checked={form.isEmailVerified} onChange={handleInputChange} />
              Email verified
            </label>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60">
                {saving ? "Saving..." : "Update User"}
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
