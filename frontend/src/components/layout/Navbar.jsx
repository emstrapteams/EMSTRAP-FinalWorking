import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import logo from "../../assets/logo.png";
import { LayoutDashboard, Map, Bell, LogOut, Menu, Settings, X, User, Moon, Sun, History, Siren, CalendarPlus, ClipboardList, Users } from "lucide-react";

const icons = {
  dashboard: <LayoutDashboard className="w-6 h-6" />,
  map: <Map className="w-6 h-6" />,
  bell: <Bell className="w-6 h-6" />,
  logout: <LogOut className="w-6 h-6" />,
  hamburger: <Menu className="w-6 h-6" />,
  settings: <Settings className="w-6 h-6" />,
  history: <History className="w-6 h-6" />,
  emergency: <Siren className="w-6 h-6" />,
  booking: <CalendarPlus className="w-6 h-6" />,
  bookings: <ClipboardList className="w-6 h-6" />,
}

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logoutUser, loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem(`profileImage_${user?._id}`) || null);

  useEffect(() => {
    setProfileImage(localStorage.getItem(`profileImage_${user?._id}`) || null);
  }, [user?._id]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setProfileImage(dataUrl);
      localStorage.setItem(`profileImage_${user?._id}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const triggerImagePicker = (e) => {
    e.stopPropagation();
    document.getElementById('navbar-profile-image-input')?.click();
  };

  const removeProfileImage = (e) => {
    e.stopPropagation();
    setProfileImage(null);
    localStorage.removeItem(`profileImage_${user?._id}`);
  };

  const isPoliceContext = user?.role === 'police' || user?.role === 'police_hq';
  const isHospitalContext = user?.role === 'hospital' || user?.role === 'hospital_admin';
  const isAmbulanceRole = user?.role === 'ambulance' || user?.role === 'ambulance_driver';

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleDriverStatus = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const newStatus = user.driverStatus === 'LIVE' ? 'OFFLINE' : 'LIVE';
      const res = await API.put("/auth/profile", { driverStatus: newStatus });
      if (res.data && res.data.user) {
        loginUser({ ...user, driverStatus: res.data.user.driverStatus });
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const navLinkClasses = (active) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active
        ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400"
    }`;

  return (
    <>
      <nav className="fixed top-0 inset-x-0 bg-white dark:bg-gray-900 shadow-md transition-colors z-[1000]">
        <div className="w-full px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              {isAmbulanceRole ? (
                <button
                  className="text-gray-800 dark:text-gray-100 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => document.dispatchEvent(new CustomEvent('toggle-ambulance-sidebar'))}
                  aria-label="Toggle sidebar"
                >
                  <Menu className="w-6 h-6" />
                </button>
              ) : null}

              <Link to="/" className="flex items-center">
                <img src={logo} alt="AmbuGo Logo" className="h-15 sm:h-12 object-contain" />
              </Link>
            </div>

            {/* Nav icons/links, inline in header instead of a sidebar drawer */}
            {!isAmbulanceRole && (
              <div className="hidden sm:flex items-center gap-2">
                {isPoliceContext ? (
                  <>
                    <Link to="/police" className={navLinkClasses(location.pathname === "/police")}>
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                    <Link to="/police/map" className={navLinkClasses(location.pathname.startsWith("/police/map"))}>
                      <Map className="w-5 h-5" />
                      <span>Live Map</span>
                    </Link>
                    <Link to="/police/settings" className={navLinkClasses(location.pathname.startsWith("/police/settings"))}>
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </Link>
                  </>
                ) : isHospitalContext ? (
                  <>
                    <Link to="/hospital" className={navLinkClasses(location.pathname === "/hospital")}>
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                    <Link to="/hospital/PatientRecords" className={navLinkClasses(location.pathname.startsWith("/hospital/PatientRecords"))}>
                      <Users className="w-5 h-5" />
                      <span>Patient Records</span>
                    </Link>
                    <Link to="/hospital/map" className={navLinkClasses(location.pathname.startsWith("/hospital/map"))}>
                      <Map className="w-5 h-5" />
                      <span>Live Map</span>
                    </Link>
                    <Link to="/hospital/settings" className={navLinkClasses(location.pathname.startsWith("/hospital/settings"))}>
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </Link>
                  </>
                ) : (
                  <>
                    {(!user || user?.role === 'user') && (
                      <Link to="/" className={navLinkClasses(location.pathname === "/")}>
                        <Siren className="w-5 h-5" />
                        <span>Emergency</span>
                      </Link>
                    )}
                    {user?.role === 'user' && (
                      <Link to="/dashboard" className={navLinkClasses(location.pathname === "/dashboard")}>
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                      </Link>
                    )}
                    {user?.role === 'user' && (
                      <Link to="/booking" className={navLinkClasses(location.pathname === "/booking")}>
                        <CalendarPlus className="w-5 h-5" />
                        <span>New Booking</span>
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Right side: notifications + profile */}
            <div className="flex items-center gap-2">
              {user && (
                <button
                  className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Notifications"
                >
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                </button>
              )}

              {user && <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>}

              {!user ? (
                <Link to="/login" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full font-medium transition-colors">
                  Login
                </Link>
              ) : (
                <div className="relative">
                  <input
                    id="navbar-profile-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                    className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-red-600 to-rose-500 text-white font-bold flex items-center justify-center hover:scale-105 border-2 border-white dark:border-gray-800 shadow-md transition-all ring-2 ring-red-500/20 hover:ring-red-500/50"
                    title={user?.name || "User"}
                  >
                    {profileImage
                      ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      : user?.name?.charAt(0).toUpperCase() || "U"}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none py-1.5 z-[1000] overflow-hidden transition-all duration-200 transform origin-top-right">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3">
                        <div className="relative group shrink-0 cursor-pointer" onClick={triggerImagePicker}>
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-red-600 to-rose-500 text-white font-bold flex items-center justify-center ring-2 ring-red-500/20">
                            {profileImage
                              ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                              : <span className="text-sm">{user?.name?.charAt(0).toUpperCase() || "U"}</span>}
                          </div>
                          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={triggerImagePicker} className="text-xs text-red-500 hover:text-red-600 font-medium">Change photo</button>
                            {profileImage && <><span className="text-gray-300 dark:text-gray-600">·</span><button onMouseDown={(e) => e.preventDefault()} onClick={removeProfileImage} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium">Remove</button></>}
                          </div>
                        </div>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        {/* Mobile-only links since the inline header nav is hidden below sm */}
                        {!isAmbulanceRole && isPoliceContext && (
                          <>
                            <Link
                              to="/police"
                              onClick={() => setDropdownOpen(false)}
                              className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                            >
                              <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </Link>
                            <Link
                              to="/police/map"
                              onClick={() => setDropdownOpen(false)}
                              className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                            >
                              <Map className="w-4 h-4" /> Live Map
                            </Link>
                            <Link
                              to="/police/settings"
                              onClick={() => setDropdownOpen(false)}
                              className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                            >
                              <Settings className="w-4 h-4" /> Settings
                            </Link>
                          </>
                        )}
                        {!isAmbulanceRole && isHospitalContext && (
                          <>
                            <Link
                              to="/hospital"
                              onClick={() => setDropdownOpen(false)}
                              className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                            >
                              <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </Link>
                            <Link
                              to="/hospital/PatientRecords"
                              onClick={() => setDropdownOpen(false)}
                              className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                            >
                              <Users className="w-4 h-4" /> Patient Records
                            </Link>
                            <Link
                              to="/hospital/map"
                              onClick={() => setDropdownOpen(false)}
                              className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                            >
                              <Map className="w-4 h-4" /> Live Map
                            </Link>
                            <Link
                              to="/hospital/settings"
                              onClick={() => setDropdownOpen(false)}
                              className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                            >
                              <Settings className="w-4 h-4" /> Settings
                            </Link>
                          </>
                        )}
                        {!isAmbulanceRole && !isPoliceContext && !isHospitalContext && (!user || user?.role === 'user') && (
                          <Link
                            to="/"
                            onClick={() => setDropdownOpen(false)}
                            className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                          >
                            <Siren className="w-4 h-4" /> Emergency
                          </Link>
                        )}
                        {!isAmbulanceRole && !isPoliceContext && !isHospitalContext && user?.role === 'user' && (
                          <Link
                            to="/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                          >
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                          </Link>
                        )}
                        {!isAmbulanceRole && !isPoliceContext && !isHospitalContext && user?.role === 'user' && (
                          <Link
                            to="/booking"
                            onClick={() => setDropdownOpen(false)}
                            className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                          >
                            <CalendarPlus className="w-4 h-4" /> New Booking
                          </Link>
                        )}
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                        >
                          <User className="w-4 h-4" /> Profile
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={toggleTheme}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                        >
                          {theme === 'light' ? <><Moon className="w-4 h-4" /> Dark Theme</> : <><Sun className="w-4 h-4" /> Light Theme</>}
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setDropdownOpen(false); logoutUser(); navigate("/"); }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors flex items-center gap-2 font-semibold border-t border-gray-100 dark:border-gray-800 mt-1 pt-2"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer so the fixed header doesn't overlap page content */}
      <div className="h-16" />
    </>
  );
}