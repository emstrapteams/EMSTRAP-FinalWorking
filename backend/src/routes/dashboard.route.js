import { Router } from "express";
import {
    getAlerts,
    getOverviewStats,
    getStats,
    updateEmergencyStatus
} from "../controllers/dashboard.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";

const router = Router();

// Allow authenticated users
router.get("/alerts", authMiddleware, getAlerts);
router.get("/stats", authMiddleware, getStats);

// Hospital should be able to update emergency status
router.put(
    "/emergencies/:id/status",
    authMiddleware,
    updateEmergencyStatus
);

// Admin-only endpoints
router.get(
    "/overview-stats",
    authMiddleware,
    adminMiddleware,
    getOverviewStats
);

export default router;