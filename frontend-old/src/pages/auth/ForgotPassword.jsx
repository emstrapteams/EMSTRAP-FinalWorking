import { useState } from "react";
import { forgotPasswordAPI } from "../../services/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setStatus("loading");
    try {
      await forgotPasswordAPI(email);
      setStatus("success");
    } catch (error) {
      setStatus("idle");
      // Display specific API message if available, else generic error
      const message = error.response?.data?.message || "Failed to send reset email. Please try again.";
      toast.error(message);
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
                  We've sent a password reset link to <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>. Please check your inbox and spam folder.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">
                  Reset Password
                </h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
                  Enter your email address to receive a secure password reset link.
                </p>

                <input
                  className="w-full border dark:border-gray-700 p-3.5 rounded-xl mb-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  placeholder="name@email.com"
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  autoFocus
                />

                <button
                  onClick={handleForgotPassword}
                  disabled={status === "loading"}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl flex justify-center items-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed mb-4"
                >
                  {status === "loading" ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : "Send Reset Link"}
                </button>

                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  Remember your password?{" "}
                  <span
                    className="text-red-500 hover:text-red-600 font-semibold cursor-pointer transition-colors"
                    onClick={() => navigate("/login")}
                  >
                    Log in
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
