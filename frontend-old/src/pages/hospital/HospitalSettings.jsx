import { useState } from "react";
import { changePasswordAPI } from "../../services/api";
import toast from "react-hot-toast";

export default function HospitalSettings() {
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
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-start gap-6 p-4">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-600 dark:text-red-400">
                Settings
            </p>

            <div className="w-full rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8 shadow-xl shadow-gray-200 dark:shadow-black/20">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Security Settings</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                            Current Password
                        </label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={passwords.currentPassword}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 dark:border-slate-700 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                            New Password
                        </label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwords.newPassword}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 dark:border-slate-700 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Must be at least 8 characters long, including an uppercase letter, lowercase letter, number, and special character.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwords.confirmPassword}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 dark:border-slate-700 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
                        >
                            {loading ? "Updating..." : "Change Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
