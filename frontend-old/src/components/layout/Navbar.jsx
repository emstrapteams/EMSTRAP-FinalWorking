import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import logo from "../../assets/logo.png";

const icons = {
  dashboard: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v1h6a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1h-6v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /></svg>,
  map: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  bell: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  logout: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  hamburger: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  settings: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logoutUser, loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Sidebar logic for dashboard roles
  const isPoliceContext = user?.role === 'police' || user?.role === 'police_hq';
  const isHospitalContext = user?.role === 'hospital' || user?.role === 'hospital_admin';
  const hasSidebar = isPoliceContext || isHospitalContext;
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  // Sync sidebar dimension variable for parent layouts
  useEffect(() => {
      if (hasSidebar) {
          document.documentElement.style.setProperty('--sidebar-width', sidebarExpanded ? '16rem' : '5rem');
      } else {
          document.documentElement.style.removeProperty('--sidebar-width');
      }
  }, [sidebarExpanded, hasSidebar]);

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

  if (hasSidebar) {
      let menuItems = [];
      if (isPoliceContext) {
          menuItems = [
              { name: "Dashboard", path: "/police", icon: icons.dashboard },
              { name: "Live Map", path: "/police/map", icon: icons.map },
              { name: "Settings", path: "/police/settings", icon: icons.settings },
          ];
      } else if (isHospitalContext) {
          menuItems = [
              { name: "Dashboard", path: "/hospital", icon: icons.dashboard },
              { name: "Live Map", path: "/hospital/map", icon: icons.map },
              { name: "Settings", path: "/hospital/settings", icon: icons.settings },
          ];
      }

      return (
          <>
              {/* DASHBOARD SIDEBAR (Full Height) */}
              <div className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50 flex flex-col overflow-x-hidden ${sidebarExpanded ? 'w-64' : 'w-20'}`}>
                  
                  {/* Top Sidebar Header - Toggle Button */}
                  <div className={`h-16 shrink-0 border-b border-gray-200 dark:border-gray-800 flex items-center transition-all ${sidebarExpanded ? 'justify-end px-4' : 'justify-center'}`}>
                      {sidebarExpanded ? (
                          <button onClick={() => setSidebarExpanded(false)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors p-2">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                      ) : (
                          <button onClick={() => setSidebarExpanded(true)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors p-2">
                              {icons.hamburger}
                          </button>
                      )}
                  </div>

                  {/* Nav Links */}
                  <div className="flex-1 overflow-y-auto w-full">
                      <nav className="px-3 py-6 space-y-2">
                          {menuItems.map((item) => {
                              // Ensure that exact match for parent path /police or /hospital so that /police doesn't highlight when /police/map is active
                              const isBaseRoute = item.path === '/police' || item.path === '/hospital';
                              const isActive = isBaseRoute 
                                  ? location.pathname === item.path 
                                  : location.pathname.startsWith(item.path);
                              return (
                                  <Link 
                                      key={item.name} 
                                      to={item.path}
                                      title={!sidebarExpanded ? item.name : ""}
                                      className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-200 font-medium ${
                                          isActive 
                                          ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-semibold" 
                                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                                      } ${!sidebarExpanded && 'justify-center'}`}
                                  >
                                      <span className={isActive ? "text-red-600 dark:text-red-400" : ""}>{item.icon}</span>
                                      {sidebarExpanded && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
                                  </Link>
                              );
                          })}
                      </nav>
                  </div>

                  {/* Logical Logout Button at Bottom */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                      <button 
                          onClick={() => { logoutUser(); navigate("/"); }}
                          title={!sidebarExpanded ? "Logout" : ""}
                          className={`flex items-center gap-4 w-full px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 transition-all font-medium ${!sidebarExpanded && 'justify-center'}`}
                      >
                          <span>{icons.logout}</span>
                          {sidebarExpanded && <span>Logout</span>}
                      </button>
                  </div>
              </div>

              {/* SIDEBAR TOP HEADER (Contracted via width calculated variable) */}
              <nav className="fixed top-0 right-0 h-16 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 z-[1000] flex items-center justify-between px-6 transition-all duration-300" style={{ width: `calc(100% - var(--sidebar-width))` }}>
                  
                  {/* Left Side: Logo */}
                  <div className="flex items-center">
                      <Link to="/" className="flex items-center">
                          <img src={logo} alt="AmbuGo Logo" className="h-10 sm:h-12 object-contain" />
                      </Link>
                  </div>

                  {/* Right Side: Reusing Standard Navbar Profile Logic */}
                  <div className="flex items-center gap-4">
                      {/* Notifications */}
                      <button className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                          {icons.bell}
                          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                      </button>

                      <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

                      <div className="relative">
                          <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                            className="w-10 h-10 rounded-full bg-red-600 text-white font-bold flex items-center justify-center hover:bg-red-700 transition"
                            title={user?.name || "User"}
                          >
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                          </button>

                          {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-xl shadow-lg py-1 z-[1000]">
                              <div className="px-4 py-2 border-b dark:border-gray-700">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                              </div>
                              <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Profile
                              </button>
                              <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={toggleTheme}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
                              </button>
                            </div>
                          )}
                      </div>
                  </div>
              </nav>
          </>
      );
  }

  // STANDARD NAVBAR RENDERING FOR USERS/AMBULANCE
  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md transition-colors relative z-[1000]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <Link to="/">
            <img src={logo} alt="AmbuGo Logo" className="h-15 sm:h-12 object-contain" />
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex gap-6 items-center">
            {user && (
              <Link to="/dashboard" className="text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors">
                Dashboard
              </Link>
            )}
            {(!user || user.role === 'user') && (
              <Link to="/" className="text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors">
                Emergency
              </Link>
            )}
            {(user?.role === 'ambulance' || user?.role === 'ambulance_driver') && (
              <Link to="/booking-history" className="text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors">
                Booking History
              </Link>
            )}
            {(!user || user?.role === 'user') && (
              <button
                onClick={() => navigate(user ? "/booking" : "/login")}
                className="text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors"
              >Booking
              </button>
            )}
            {!user ? (
              <Link to="/login" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full font-medium transition-colors">
                Login
              </Link>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                  className="w-10 h-10 rounded-full bg-red-600 text-white font-bold flex items-center justify-center hover:bg-red-700 transition"
                  title={user?.name || "User"}
                >
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-xl shadow-lg py-1 z-[1000]">
                    <div className="px-4 py-2 border-b dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Profile
                    </button>
                    {(user?.role === 'ambulance' || user?.role === 'ambulance_driver') && (
                      <div className="px-4 py-2 border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <label className="flex items-center cursor-pointer justify-between w-full" onMouseDown={(e) => e.preventDefault()} onClick={toggleDriverStatus}>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Status: <span className={user.driverStatus === 'LIVE' ? 'text-green-500 font-bold' : 'text-gray-500'}>{user.driverStatus === 'LIVE' ? 'Live' : 'Offline'}</span>
                          </span>
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={user.driverStatus === 'LIVE'} readOnly />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${user.driverStatus === 'LIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${user.driverStatus === 'LIVE' ? 'transform translate-x-4' : ''}`}></div>
                          </div>
                        </label>
                      </div>
                    )}
                    <button
                      onMouseDown={(e) => e.preventDefault()} // prevent blur
                      onClick={toggleTheme}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setDropdownOpen(false); logoutUser(); navigate("/"); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 font-semibold rounded-b-xl"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile button */}
          <button
            className="md:hidden text-gray-800 dark:text-gray-100 text-2xl"
            onClick={() => setOpen(true)}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col pt-16 md:hidden ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl"
        >
          ✕
        </button>

        <div className="flex flex-col px-6">
          {!user ? (
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="text-lg font-medium text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors"
              >
                Emergency
              </Link>
              <button
                onClick={() => { setOpen(false); navigate("/login"); }}
                className="text-lg font-medium text-left text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors"
              >
                Booking
              </button>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-medium transition-colors text-center"
              >
                Login
              </Link>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex flex-col items-center justify-center border-b dark:border-gray-800 pb-6 mb-4">
                <div className="w-16 h-16 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-3xl mb-3 shadow-md">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <p className="font-semibold text-lg text-gray-900 dark:text-white truncate w-full text-center">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-full text-center">{user?.email}</p>
              </div>

              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => { setOpen(false); navigate("/profile"); }}
                  className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors text-lg"
                >
                  Profile
                </button>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors text-lg block"
                >
                  Dashboard
                </Link>

                {user?.role === 'user' && (
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors text-lg block"
                  >
                    Emergency
                  </Link>
                )}
                {(!user || user?.role === 'user') && (
                  <button
                    onClick={() => { setOpen(false); navigate(user ? "/booking" : "/login"); }}
                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors text-lg"
                  >
                    Booking
                  </button>
                )}
                {(user?.role === 'ambulance' || user?.role === 'ambulance_driver') && (
                  <>
                    <button
                      onClick={() => { setOpen(false); navigate(user ? "/booking-history" : "/login"); }}
                      className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors text-lg"
                    >
                      Booking History
                    </button>
                    <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl cursor-pointer" onClick={toggleDriverStatus}>
                      <span className="text-lg font-medium text-gray-700 dark:text-gray-200">
                        Status: <span className={user.driverStatus === 'LIVE' ? 'text-green-500 font-bold' : 'text-gray-500'}>{user.driverStatus === 'LIVE' ? 'Live' : 'Offline'}</span>
                      </span>
                      <div className="relative">
                        <div className={`block w-12 h-7 rounded-full transition-colors ${user.driverStatus === 'LIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${user.driverStatus === 'LIVE' ? 'transform translate-x-5' : ''}`}></div>
                      </div>
                    </div>
                  </>
                )}
                <button
                  onClick={() => { setOpen(false); toggleTheme(); }}
                  className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors text-lg"
                >
                  {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
                </button>

                <div className="pt-4 mt-4 border-t dark:border-gray-800 pb-4">
                  <button
                    onClick={() => { setOpen(false); logoutUser(); navigate("/"); }}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium transition-colors text-lg"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
