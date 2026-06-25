import { createContext, useContext, useState, useEffect } from "react";

import API from "../services/api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session via HttpOnly Cookie using /auth/me
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await API.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        setUser(null); // No valid session
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  const loginUser = (data) => {
   
    const nextUser = data?.user || data;
    const token = data?.token;

    if (token) {
      window.localStorage.setItem("authToken", token);
    }

    setUser(nextUser);
  };

  const logoutUser = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed", err);
    }
    window.localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="animate-pulse flex flex-col items-center">
            <div className="text-5xl mb-4 animate-bounce">🚑</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">Connecting to Dispatch...</div>
            <div className="text-sm mt-3 text-gray-500 dark:text-gray-400 max-w-xs text-center">
              Waking up emergency secure servers. This brief delay only happens on the first load!
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
