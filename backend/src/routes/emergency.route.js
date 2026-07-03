import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import requireRoles from "../middlewares/role.middleware.js";
import {
    createEmergencyRequest,
    precheckEmergency,
    uploadEvidence,
    acceptEmergency,
    declineEmergency,
    getDriverHistory,
    cancelEmergency,
    cancelEmergencyByUser,
    assignHospital,
    completeRequest,
    getEmergencyDetails,
    markArrived
} from "../controllers/emergency.controller.js";
import optionalAuth from "../middlewares/optionalAuth.middleware.js";
const router = express.Router();
const ambulanceDriverOnly = requireRoles("ambulance_driver", "ambulance");
router.post("/precheck", precheckEmergency);
router.post("/", optionalAuth, createEmergencyRequest);
router.post("/:id/evidence", optionalAuth, uploadEvidence);
router.get("/driver/history", authMiddleware, ambulanceDriverOnly, getDriverHistory);
router.get("/:id", optionalAuth, getEmergencyDetails);
router.put("/:id/accept", authMiddleware, ambulanceDriverOnly, acceptEmergency);
router.put("/:id/decline", authMiddleware, ambulanceDriverOnly, declineEmergency);
router.put("/:id/cancel", authMiddleware, ambulanceDriverOnly, cancelEmergency);
router.put(
    "/:id/user-cancel",
    optionalAuth,
    cancelEmergencyByUser
);
router.put("/:id/mark-arrived", authMiddleware, ambulanceDriverOnly, markArrived);
router.put("/:id/assign-hospital", authMiddleware, ambulanceDriverOnly, assignHospital);
router.put("/:id/complete", authMiddleware, ambulanceDriverOnly, completeRequest);

export default router;
