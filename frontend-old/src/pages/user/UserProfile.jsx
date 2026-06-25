import { useState, useEffect } from "react";
import API from "../../services/api";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function UserProfile() {
    const { user, loginUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        city: "",
        address: "",
    });

    const [profileUser, setProfileUser] = useState(user);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Fetch fresh profile data directly from DB
                const res = await API.get("/auth/me");
                const freshUser = res.data;
                setProfileUser(freshUser);
                setFormData({
                    name: freshUser?.name || "",
                    email: freshUser?.email || "",
                    mobile: freshUser?.mobile || "",
                    city: freshUser?.city || "",
                    address: freshUser?.address || "",
                });
            } catch (error) {
                console.error("Failed to load profile", error);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.put("/auth/profile", formData);
            toast.success("Profile updated successfully!");
            // Update local state and global context
            const updated = res.data.user;
            setProfileUser(updated);
            loginUser(updated);
            setIsEditing(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const isPoliceContext = user?.role === 'police' || user?.role === 'police_hq';

    return (
        <>
            <Navbar />
            <main
                className={isPoliceContext ? "transition-all duration-300 min-h-screen" : "flex-grow"}
                style={isPoliceContext ? { paddingLeft: 'var(--sidebar-width)', paddingTop: '4rem' } : {}}
            >
                <Container>
                <div className="max-w-xl mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 rounded-full bg-red-600 text-white font-bold text-4xl flex items-center justify-center mb-4 shadow-lg">
                            {profileUser?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        {!isEditing && (
                            <>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profileUser?.name || "User"}</h2>
                                <p className="text-gray-500 dark:text-gray-400 capitalize">{profileUser?.role?.replace('_', ' ') || "User"}</p>
                            </>
                        )}
                        {isEditing && (
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Profile</h2>
                        )}
                    </div>

                    {!isEditing ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{profileUser?.name || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{profileUser?.email || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Mobile Number</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{profileUser?.mobile || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">City</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{profileUser?.city || "N/A"}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{profileUser?.address || "N/A"}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 rounded-lg text-lg transition-colors mt-6"
                            >
                                Edit Profile
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full border dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full border dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Mobile Number</label>
                                <input
                                    type="tel"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    required
                                    className="w-full border dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                    placeholder="+91 9999999999"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                    className="w-full border dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                    placeholder="Bangalore"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    required
                                    rows="3"
                                    className="w-full border dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                    placeholder="123 Main St, Appt 4B"
                                ></textarea>
                            </div>

                            <div className="flex gap-4 mt-8 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            name: profileUser?.name || "",
                                            email: profileUser?.email || "",
                                            mobile: profileUser?.mobile || "",
                                            city: profileUser?.city || "",
                                            address: profileUser?.address || "",
                                        });
                                    }}
                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-lg text-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 rounded-lg text-lg transition-colors flex justify-center items-center"
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Container>
        </main>
        </>
    );
}
