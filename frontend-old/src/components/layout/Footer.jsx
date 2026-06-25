import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";

export default function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isPoliceContext = user?.role === 'police' || user?.role === 'police_hq';
  const isHospitalContext = user?.role === 'hospital' || user?.role === 'hospital_admin';
  const hasSidebar = isPoliceContext || isHospitalContext;

  if (location.pathname.startsWith('/police') || isPoliceContext) {
      return null;
  }

  const sidebarStyle = hasSidebar ? { paddingLeft: 'var(--sidebar-width)' } : {};

  return (
    <footer className="bg-slate-900 text-white mt-16 transition-all duration-300" style={sidebarStyle}>
      <div className="max-w-6xl mx-auto px-4 py-10">

        <div className="grid md:grid-cols-3 gap-8">

          {/* Logo + About */}
          <div>
            <img src={logo} alt="logo" className="h-12 mb-4" />
            <p className="text-gray-400">
              Fast emergency ambulance service connecting users,
              hospitals and police in real-time.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold mb-3">Quick Links</h3>
            <div className="flex flex-col gap-2 text-gray-400 items-start">
              <Link to="/" className="hover:text-white transition-colors">Emergency</Link>
              <button
                onClick={() => navigate(user ? "/dashboard" : "/login")}
                className="hover:text-white transition-colors text-left"
              >
                Booking
              </button>
              {!user && (
                <>
                  <Link to="/login" className="hover:text-white transition-colors">Login</Link>
                  <Link to="/register" className="hover:text-white transition-colors">Register</Link>
                </>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-3">Contact</h3>
            <p className="text-gray-400">📧 emstrap51@gmail.com</p>
            <p className="text-gray-400">📞 +91 9880882476</p>
            <p className="text-gray-400">📍 Bangalore, Karnataka, India</p>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} EmSTraP. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
