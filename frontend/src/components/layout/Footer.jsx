import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";

export default function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <footer className="bg-slate-900 text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

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

          {/* Legal */}
          <div>
            <h3 className="font-bold mb-3">Legal</h3>

            <div className="flex flex-col gap-2 text-gray-400 items-start">
              <a
                href="/privacy-policy.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </a>

              <a
                href="/terms-and-conditions.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Terms & Conditions
              </a>
            </div>
          </div>
          {/* Contact */}
          <div>
            <h3 className="font-bold mb-3">Contact</h3>
            <p className="text-gray-400 mb-3">contact@emstrap.com</p>
            <p className="text-gray-400 mb-3">+91 9880882476</p>
            <p className="text-gray-400 mb-3">Bangalore, Karnataka, India</p>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} EMSTRAP Pvt Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}