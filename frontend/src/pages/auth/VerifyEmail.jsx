import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import { verifyEmailAPI } from "../../services/api";
import toast from "react-hot-toast";

export default function VerifyEmail() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("loading"); // loading, success, error
    const [message, setMessage] = useState("Verifying your email...");
    const hasFetched = useRef(false);

    useEffect(() => {
        const verify = async () => {
            try {
                const data = await verifyEmailAPI(token);
                setStatus("success");
                setMessage(data.message || "Email successfully verified.");
                toast.success("Email verified!");
            } catch (error) {
                setStatus("error");
                setMessage(error.response?.data?.message || "Verification failed. Token may be invalid or expired.");
                toast.error("Verification failed");
            }
        };

        if (token && !hasFetched.current) {
            hasFetched.current = true;
            verify();
        }
    }, [token]);

    return (
        <>
            <Navbar />
            <Container>
                <div className="flex justify-center mt-12">
                    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg text-center">
                        <h2 className="text-2xl font-bold text-black mb-6">Email Verification</h2>

                        {status === "loading" && (
                            <div className="text-gray-600 mb-6">{message}</div>
                        )}

                        {status === "success" && (
                            <div className="flex items-center justify-center gap-2 text-green-600 mb-6 font-medium">
                                <span>{message}</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                        )}

                        {status === "error" && (
                            <div className="text-red-600 mb-6 font-medium">{message}</div>
                        )}

                        <button
                            onClick={() => navigate("/login")}
                            className="w-full bg-red-600 text-white py-3 rounded-lg mt-4"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </Container>
        </>
    );
}
