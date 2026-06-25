import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { EmergencyProvider } from "../context/EmergencyContext";
import { AuthProvider } from "../context/AuthContext";
import Footer from "../components/layout/Footer";
import DriverNotificationListener from "../components/emergency/DriverNotificationListener";


import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <AuthProvider>
      <EmergencyProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <DriverNotificationListener />
          <div className="flex flex-col min-h-screen">
            <main className="flex-grow">
              <AppRoutes />
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </EmergencyProvider>
    </AuthProvider>
  );
}
