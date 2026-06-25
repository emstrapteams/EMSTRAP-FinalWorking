import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
    createBooking,
    getBookings,
    cancelBooking,
    getBookingById,
    getPaymentStatus,
    processPayment,
    getAvailableBookings,
    acceptBooking,
    arriveBooking,
    startBookingTrip,
    completeBooking,
    getPrivateDriverDashboard,
} from "../controllers/booking.controller.js";
const router = express.Router();

router.post("/", authMiddleware, createBooking);
router.get("/", authMiddleware, getBookings);
router.put("/:id/cancel", authMiddleware, cancelBooking);
router.get("/available", authMiddleware, getAvailableBookings);
router.get(
    "/driver/dashboard",
    authMiddleware,
    getPrivateDriverDashboard
);
router.get("/:id", authMiddleware, getBookingById);
router.get("/:id/payment", authMiddleware, getPaymentStatus);
router.post("/:id/pay", authMiddleware, processPayment);
router.put("/:id/accept", authMiddleware, acceptBooking);
router.put("/:id/arrive", authMiddleware, arriveBooking);
router.put("/:id/start", authMiddleware, startBookingTrip);
router.put("/:id/complete", authMiddleware, completeBooking);
export default router;
