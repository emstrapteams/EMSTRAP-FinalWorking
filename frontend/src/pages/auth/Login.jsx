import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import { getErrorMessage, loginAPI } from "../../services/api";

import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser, user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") navigate("/admin");
      else navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      const data = await loginAPI({ email: email.trim().toLowerCase(), password });

      loginUser(data);
      toast.success(data.message || "Login successful!");

      // redirect based on role (mapping DB role to route)
      if ((data.user?.role || data.role) === "admin") navigate("/admin");
      else navigate("/dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error, "Login failed. Please check your credentials."));
    }
  };
  return (
    <>
      <Navbar />
      <Container>

        <div className="flex justify-center mt-12 mb-12">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl transition-colors dark:border dark:border-gray-700">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
              Welcome Back
            </h2>

            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
              <input
                className="w-full border dark:border-gray-700 p-3.5 rounded-xl mb-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="relative mb-2">
                <input
                  className="w-full border dark:border-gray-700 p-3.5 pr-12 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  onChange={(e) => setPassword(e.target.value)}
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

              <div className="flex justify-end mb-6">
                <span
                  className="text-sm text-red-500 hover:text-red-600 font-semibold cursor-pointer transition-colors"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot Password?
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                Login
              </button>
            </form>
            <p className="text-sm mt-6 text-center text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <span
                className="text-red-500 hover:text-red-600 font-semibold cursor-pointer transition-colors"
                onClick={() => navigate("/register")}
              >
                Register
              </span>
            </p>
          </div>
        </div>

      </Container>
    </>
  );
}

