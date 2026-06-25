import { Router } from "express";
import {
    getAdminStats,
    getAllUsers,
    updateUserRole,
    getAllEmergencies,
    getAllBookings,
    deleteUser,
    updateUser,
    updateBookingStatus,
    deleteBooking,
    updateEmergencyStatus,
    deleteEmergency
} from "../controllers/admin.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";

const router = Router();

// Apply auth and admin protections securely to all downstream routes in this router
router.use(authMiddleware, adminMiddleware);

router.get("/stats", getAdminStats);
router.get("/users", getAllUsers);
router.put("/users/:id", updateUser);
router.put("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);
router.get("/emergencies", getAllEmergencies);
router.put("/emergencies/:id/status", updateEmergencyStatus);
router.delete("/emergencies/:id", deleteEmergency);
router.get("/bookings", getAllBookings);
router.put("/bookings/:id/status", updateBookingStatus);
router.delete("/bookings/:id", deleteBooking);

export default router;
