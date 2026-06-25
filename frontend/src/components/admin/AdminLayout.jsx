import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  LogOut,
  Menu,
  Moon,
  Shield,
  Siren,
  Sun,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";

// Sub-pages that live under the "Users" dropdown
const userSubItems = [
  { name: "Emergencies", path: "/admin/emergencies", icon: Siren },
  { name: "Bookings", path: "/admin/bookings", icon: ClipboardList },
  { name: "Hospitals", path: "/admin/hospitals", icon: Building2 },
  { name: "Ambulance", path: "/admin/ambulance", icon: Truck },
  { name: "Police", path: "/admin/police", icon: Shield },
];

export default function AdminLayout({ title, description, actions, children }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [profileImage, setProfileImage] = useState(
    () => localStorage.getItem(`profileImage_${user?._id}`) || null
  );

  const usersMenuRef = useRef(null);

  // Keep theme in sync with the rest of the app
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  // Close the Users dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (usersMenuRef.current && !usersMenuRef.current.contains(event.target)) {
        setUsersMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setUsersMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setProfileImage(dataUrl);
      localStorage.setItem(`profileImage_${user?._id}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const triggerImagePicker = (event) => {
    event.stopPropagation();
    document.getElementById("admin-profile-image-input")?.click();
  };

  const removeProfileImage = (event) => {
    event.stopPropagation();
    setProfileImage(null);
    localStorage.removeItem(`profileImage_${user?._id}`);
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const isOverviewActive = location.pathname === "/admin/overview";
  const isUsersActive =
    location.pathname === "/admin/users" ||
    userSubItems.some((item) => location.pathname === item.path);

  const navLinkClasses = (active) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active
        ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* TOP BAR: logo, nav pills, notifications, profile */}
      <div className="h-16 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 md:px-12 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Mobile nav toggle */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <img src={logo} alt="EmSTraP Logo" className="h-9 sm:h-10 object-contain" />
        </div>

        {/* Desktop nav pills */}
        <div className="hidden md:flex items-center gap-2">
          <Link to="/admin/overview" className={navLinkClasses(isOverviewActive)}>
            <BarChart3 className="w-5 h-5" />
            <span>Overview</span>
          </Link>

          <div className="relative" ref={usersMenuRef}>
            <button
              type="button"
              onClick={() => setUsersMenuOpen((prev) => !prev)}
              className={navLinkClasses(isUsersActive || usersMenuOpen)}
              aria-haspopup="listbox"
              aria-expanded={usersMenuOpen}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${usersMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {usersMenuOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none py-1.5 z-50 overflow-hidden">
                <Link
                  to="/admin/users"
                  onClick={() => setUsersMenuOpen(false)}
                  className={`mx-1.5 mb-0.5 flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-colors font-semibold ${
                    location.pathname === "/admin/users"
                      ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  All Users
                </Link>
                <div className="mx-1.5 my-1 border-t border-gray-100 dark:border-gray-800" />
                {userSubItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setUsersMenuOpen(false)}
                      className={`mx-1.5 flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-colors font-medium ${
                        isActive
                          ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
          </button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

          {/* Profile dropdown */}
          <div className="relative">
            <input
              id="admin-profile-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfileImageChange}
            />
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
              className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-red-600 to-rose-500 text-white font-bold flex items-center justify-center hover:scale-105 border-2 border-white dark:border-gray-800 shadow-md transition-all ring-2 ring-red-500/20 hover:ring-red-500/50"
              title={user?.name || "Admin"}
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || "A"
              )}
            </button>

            {dropdownOpen && (
              <div
                className="fixed inset-0 z-[999]"
                onClick={() => setDropdownOpen(false)}
                aria-hidden="true"
              />
            )}

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none py-1.5 z-[1000] overflow-hidden transition-all duration-200 transform origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3">
                  <div className="relative group shrink-0 cursor-pointer" onClick={triggerImagePicker}>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-red-600 to-rose-500 text-white font-bold flex items-center justify-center ring-2 ring-red-500/20">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">{user?.name?.charAt(0).toUpperCase() || "A"}</span>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={triggerImagePicker}
                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        Change photo
                      </button>
                      {profileImage && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={removeProfileImage}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-1.5 space-y-0.5">
                  {/* Mobile-only nav links (desktop pills are hidden below md) */}
                  <Link
                    to="/admin/overview"
                    onClick={() => setDropdownOpen(false)}
                    className="md:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                  >
                    <BarChart3 className="w-4 h-4" /> Overview
                  </Link>
                  <Link
                    to="/admin/users"
                    onClick={() => setDropdownOpen(false)}
                    className="md:hidden w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                  >
                    <Users className="w-4 h-4" /> Users
                  </Link>
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
                    {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setDropdownOpen(false); handleLogout(); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors flex items-center gap-2 font-semibold border-t border-gray-100 dark:border-gray-800 mt-1 pt-2"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav panel (Overview / Users + sub-items), shown below the header */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 space-y-1 sticky top-16 z-30">
          <Link
            to="/admin/overview"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold ${
              isOverviewActive
                ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Overview
          </Link>
          <Link
            to="/admin/users"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold ${
              location.pathname === "/admin/users"
                ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            <Users className="w-4 h-4" /> All Users
          </Link>
          {userSubItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-2.5 pl-8 pr-3 py-2 rounded-xl text-sm font-medium ${
                  isActive
                    ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon className="w-4 h-4" /> {item.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* PAGE CONTENT */}
      <div className="p-6 md:p-12 w-full">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h1>
            {description ? <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">{description}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>

        {children}
      </div>
    </div>
  );
}