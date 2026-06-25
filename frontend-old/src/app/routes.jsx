import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoutes";

// Lazy-loaded page components for better performance
const Emergency = lazy(() => import("../pages/emergency/Emergency"));
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const Tracking = lazy(() => import("../pages/user/Tracking"));
const Booking = lazy(() => import("../pages/booking/Booking"));
const DashboardRouter = lazy(() => import("../pages/dashboard/DashboardRouter"));
const UserProfile = lazy(() => import("../pages/user/UserProfile"));
const VerifyEmail = lazy(() => import("../pages/auth/VerifyEmail"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const DriverHistory = lazy(() => import("../pages/ambulance/DriverHistory"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers"));
const AdminEmergencies = lazy(() => import("../pages/admin/AdminEmergencies"));
const AdminBookings = lazy(() => import("../pages/admin/AdminBookings"));
const Hospital = lazy(() => import("../pages/admin/Hospital"));
const AdminAmbulance = lazy(() => import("../pages/admin/AdminAmbulance"));
const AdminPolice = lazy(() => import("../pages/admin/AdminPolice"));

const HospitalLayout = lazy(() => import("../pages/hospital/HospitalLayout"));
const HospitalDashboard = lazy(() => import("../pages/hospital/HospitalDashboard"));
const HospitalMap = lazy(() => import("../pages/hospital/LiveMap"));
const HospitalSettings = lazy(() => import("../pages/hospital/HospitalSettings"));

const PoliceLayout = lazy(() => import("../pages/Police/PoliceLayout"));
const PoliceDashboard = lazy(() => import("../pages/Police/PoliceDashboard"));
const LiveMap = lazy(() => import("../pages/Police/LiveMap"));
const PoliceSettings = lazy(() => import("../pages/Police/PoliceSettings"));


export default function AppRoutes() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="text-4xl mb-4">🚑</div>
          <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading Emstrap...</div>
        </div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Emergency />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/tracking/:requestId" element={<Tracking />} />

        {/* Protected Routes */}
        <Route path="/booking" element={
          <ProtectedRoute >
            <Booking />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        <Route path="/booking-history" element={
          <ProtectedRoute>
            <DriverHistory />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/overview" element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute role="admin">
            <AdminUsers />
          </ProtectedRoute>
        } />

        <Route path="/admin/emergencies" element={
          <ProtectedRoute role="admin">
            <AdminEmergencies />
          </ProtectedRoute>
        } />

        <Route path="/admin/bookings" element={
          <ProtectedRoute role="admin">
            <AdminBookings />
          </ProtectedRoute>
        } />

        <Route path="/admin/hospitals" element={
          <ProtectedRoute role="admin">
            <Hospital />
          </ProtectedRoute>
        } />

        <Route path="/admin/ambulance" element={
          <ProtectedRoute role="admin">
            <AdminAmbulance />
          </ProtectedRoute>
        } />

        <Route path="/admin/police" element={
          <ProtectedRoute role="admin">
            <AdminPolice />
          </ProtectedRoute>
        } />

        {/* Hospital Protected Hierarchy */}
        <Route path="/hospital" element={<ProtectedRoute role="hospital"><HospitalLayout /></ProtectedRoute>}>
          <Route index element={<HospitalDashboard />} />
          <Route path="map" element={<HospitalMap />} />
          <Route path="settings" element={<HospitalSettings />} />
        </Route>

        {/* Police Protected Hierarchy */}
        <Route path="/police" element={<ProtectedRoute role="police"><PoliceLayout /></ProtectedRoute>}>
          <Route index element={<PoliceDashboard />} />
          <Route path="map" element={<LiveMap />} />
          <Route path="settings" element={<PoliceSettings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
