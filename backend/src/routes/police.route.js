import { Router } from "express";
import {
    createPoliceRecord,
    deletePoliceRecord,
    getActiveEmergencies,
    getPoliceCases,
    getPoliceById,
    getPoliceRecords,
    updateCaseStatus,
    updatePoliceRecord
} from "../controllers/police.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import policeMiddleware from "../middlewares/police.middleware.js";

const router = Router();

router.get("/emergencies", authMiddleware, policeMiddleware, getActiveEmergencies);
router.get("/cases", authMiddleware, policeMiddleware, getPoliceCases);
router.put("/cases/:id/status", authMiddleware, policeMiddleware, updateCaseStatus);
router.get("/", authMiddleware, adminMiddleware, getPoliceRecords);
router.get("/:id", authMiddleware, adminMiddleware, getPoliceById);
router.post("/", authMiddleware, adminMiddleware, createPoliceRecord);
router.put("/:id", authMiddleware, adminMiddleware, updatePoliceRecord);
router.delete("/:id", authMiddleware, adminMiddleware, deletePoliceRecord);

export default router;

