import { useState } from "react";
import { changePasswordAPI } from "../../services/api";
import toast from "react-hot-toast";

export default function PoliceSettings() {
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await changePasswordAPI(passwords.currentPassword, passwords.newPassword);
            toast.success(res.message || "Password updated successfully.");
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Settings
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    Manage your account preferences and security.
                </p>
            </div>

            {/* Security Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900 sm:p-8">

                {/* Card header */}
                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5 dark:border-white/10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Security Settings</h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Update the password used to sign in to your police account.</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="max-w-md space-y-5">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Current Password
                        </label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={passwords.currentPassword}
                            onChange={handleChange}
                            required
                            placeholder="Enter current password"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500/40 dark:focus:bg-white/5"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            New Password
                        </label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwords.newPassword}
                            onChange={handleChange}
                            required
                            placeholder="Enter new password"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500/40 dark:focus:bg-white/5"
                        />
                        <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                            Min 8 characters — include uppercase, lowercase, number and special character.
                        </p>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwords.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder="Re-enter new password"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500/40 dark:focus:bg-white/5"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Updating…" : "Change Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}