import { useState } from "react";
import { registerAPI } from '../../services/api';
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";

import toast from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    city: "",
    address: "",
    role: "",
    vehicleNumber: "",
  });

  const [status, setStatus] = useState("idle");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    // Validate Mobile Number
    if (!form.mobile || !/^[6-9]\d{9}$/.test(form.mobile)) {
      toast.error("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    // Validate Strong Password
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(form.password)) {
      toast.error("Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character (e.g., @, $, !).");
      return;
    }

    setStatus("loading");
    try {
      await registerAPI(form);
      setStatus("success");
    } catch (err) {
      setStatus("idle");
      // Safely show backend message if exists
      const errorMsg = err.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMsg);
    }
  };
  return (
    <>
      <Navbar />
      <Container>

        <div className="flex justify-center mt-12 mb-12">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl transition-colors dark:border dark:border-gray-700">
            {status === "success" ? (
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Email Sent!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                  We've sent a verification link to your email. Please check your inbox and verify your email address to continue.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
                  Create Account
                </h2>
                <input name="name"
                  className="w-full border dark:border-gray-700 p-3.5 rounded-xl mb-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  placeholder="Full Name" required
                  onChange={handleChange}
                  disabled={status === "loading"}
                />
                <input name="email"
                  className="w-full border dark:border-gray-700 p-3.5 rounded-xl mb-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  placeholder="Email" onChange={handleChange} required
                  disabled={status === "loading"}
                />
                <div className="flex mb-4 relative group">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 dark:border-gray-700 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold border-gray-300 pointer-events-none">
                    +91
                  </span>
                  <input name="mobile"
                    type="tel"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) => {
                      // Only allow numeric input
                      const val = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, mobile: val });
                    }}
                    className="w-full border dark:border-gray-700 p-3.5 rounded-r-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                    placeholder="Mobile Number" required
                    disabled={status === "loading"}
                  />
                </div>
                <div className="relative mb-6">
                  <input name="password"
                    className="w-full border dark:border-gray-700 p-3.5 pr-12 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                    type={showPassword ? "text" : "password"} required
                    placeholder="Password" onChange={handleChange}
                    disabled={status === "loading"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1 bg-transparent"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                <input name="city"
                  className="w-full border dark:border-gray-700 p-3.5 rounded-xl mb-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  placeholder="City" onChange={handleChange}
                  disabled={status === "loading"}
                />
                <input name="address"
                  className="w-full border dark:border-gray-700 p-3.5 rounded-xl mb-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  placeholder="Address" onChange={handleChange}
                  disabled={status === "loading"}
                />
                {/* Role dropdown */}
                <select
                  name="role"
                  value={form.role}
                  className="w-full border dark:border-gray-700 p-3.5 mb-6 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors appearance-none"
                  onChange={handleChange}
                  disabled={status === "loading"}
                >
                  <option value="">Choose Role</option>
                  <option value="user">User</option>
                  <option value="ambulance_driver">Ambulance Driver</option>
                </select>

                {form.role === "ambulance_driver" && (
                  <input name="vehicleNumber"
                    className="w-full border dark:border-gray-700 p-3.5 rounded-xl mb-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                    placeholder="Vehicle Number (e.g. MH-12-AB-3456)" onChange={handleChange} required
                    disabled={status === "loading"}
                  />
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl flex justify-center items-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </>
                  ) : "Register"}
                </button>
                <p className="text-sm mt-6 text-center text-gray-600 dark:text-gray-400">
                  Already have an account?{" "}
                  <span
                    className="text-red-500 hover:text-red-600 font-semibold cursor-pointer transition-colors"
                    onClick={() => navigate("/login")}
                  >
                    Login
                  </span>
                </p>
              </form>
            )}
          </div>
        </div>

      </Container>
    </>
  );
}

