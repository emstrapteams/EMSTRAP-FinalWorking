import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Line-style icon set used throughout the sidebar (replaces emoji)
const HamburgerIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const ChevronIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
  </svg>
);

const OverviewIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 19V9m5 10V5m5 14v-7" />
  </svg>
);

const UsersIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="9" cy="8" r="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 20c0-3 2.7-5 6-5s6 2 6 5M16 8a3 3 0 1 0 0-6M16.5 14.5c2.4.4 4.5 1.9 4.5 4.5" />
  </svg>
);

const AlertIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.28 2.25h17.8A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
  </svg>
);

const CalendarIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4M16 3v4M4 10h16" />
  </svg>
);

const HospitalIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v6M9 10h6M8 21v-4h8v4" />
  </svg>
);

const AmbulanceIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16V8a1 1 0 0 1 1-1h9l4 4h3a1 1 0 0 1 1 1v4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16h17" />
    <circle cx="7" cy="18" r="1.5" />
    <circle cx="17" cy="18" r="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.5v3M7.5 11h3" />
  </svg>
);

const ShieldIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
  </svg>
);

const LogoutIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const subItems = [
  { name: "Emergencies", path: "/admin/emergencies", icon: AlertIcon },
  { name: "Bookings", path: "/admin/bookings", icon: CalendarIcon },
  { name: "Hospitals", path: "/admin/hospitals", icon: HospitalIcon },
  { name: "Ambulance", path: "/admin/ambulance", icon: AmbulanceIcon },
  { name: "Police", path: "/admin/police", icon: ShieldIcon },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const [collapsed, setCollapsed] = useState(false);

  const isSubActive = subItems.some((item) => location.pathname === item.path);
  const isOverviewActive = location.pathname === "/admin/overview";
  const isUsersActive = location.pathname === "/admin/users";

  const [usersExpanded, setUsersExpanded] = useState(isSubActive);

  useEffect(() => {
    if (isSubActive) setUsersExpanded(true);
  }, [isSubActive]);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  const handleUsersClick = () => {
    if (collapsed) {
      setCollapsed(false);
      setUsersExpanded(true);
      return;
    }
    setUsersExpanded((prev) => !prev);
  };

  return (
    <aside
      className={`
        ${collapsed ? "w-20" : "w-64"} 
        bg-white dark:bg-gray-800 
        border-r border-gray-200 dark:border-gray-700 
        h-screen sticky top-0 
        flex flex-col 
        transition-all duration-300 z-30
      `}
    >
      {/* Top Header Branding Section */}
      <div className="h-16 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            type="button"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>
          {!collapsed && (
            <h2 className="text-xl font-black bg-gradient-to-r from-red-600 via-rose-500 to-red-700 bg-clip-text text-transparent whitespace-nowrap select-none tracking-tight">
              EmSTraP
            </h2>
          )}
        </div>
        
        {/* Mobile close button */}
        <button
          onClick={onClose}
          type="button"
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors shrink-0"
          aria-label="Close sidebar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation items container panel */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {/* Overview */}
        <Link
          to="/admin/overview"
          onClick={onClose}
          title="Overview"
          className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-200 font-bold ${
            collapsed ? "justify-center px-0" : "px-4"
          } ${
            isOverviewActive
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 shadow-sm"
              : "text-gray-600 hover:bg-indigo-50/40 dark:text-gray-300 dark:hover:bg-gray-700/50"
          }`}
        >
          <OverviewIcon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Overview</span>}
        </Link>

        {/* Users Dropdown Selection */}
        <div>
          <Link
            to="/admin/users"
            onClick={handleUsersClick}
            title="Users"
            className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-200 font-bold ${
              collapsed ? "justify-center px-0" : "px-4"
            } ${
              isUsersActive || isSubActive
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 shadow-sm"
                : "text-gray-600 hover:bg-indigo-50/40 dark:text-gray-300 dark:hover:bg-gray-700/50"
            }`}
          >
            <UsersIcon className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">Users</span>
                <ChevronIcon
                  className={`h-4 w-4 transition-transform duration-200 ${usersExpanded ? "rotate-90" : ""}`}
                />
              </>
            )}
          </Link>

          {!collapsed && usersExpanded && (
            <div className="mt-1.5 ml-5 pl-3 border-l-2 border-indigo-100 dark:border-gray-700 space-y-1">
              {subItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-all duration-200 font-semibold ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
                        : "text-gray-500 hover:bg-indigo-50/40 dark:text-gray-400 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer Controls Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <button
          onClick={handleLogout}
          title="Logout"
          className={`w-full flex items-center gap-3 py-3 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/20 rounded-xl transition-all duration-200 font-bold ${
            collapsed ? "justify-center px-0" : "px-4"
          }`}
        >
          <LogoutIcon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}