import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to={role === "admin" ? "/login" : "/login"} />;
  }

  if (role) {
    // Some roles might be named slightly differently in DB vs Routes
    const isAmbulance = role === "ambulance" && (user.role === "ambulance" || user.role === "ambulance_driver");
    const isHospital = role === "hospital" && (user.role === "hospital" || user.role === "hospital_admin");
    const isPolice = role === "police" && (user.role === "police" || user.role === "police_hq");
    const isExactMatch = user.role === role;

    if (!isExactMatch && !isAmbulance && !isHospital && !isPolice) {
      return <Navigate to="/" />;
    }
  }

  return children;
}
