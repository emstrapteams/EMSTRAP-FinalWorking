import { Router } from "express";
import {
  getHospitals,
  getAvailableHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  updateEmergencyBeds,
  deleteHospital,
} from "../controllers/hospital.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";

const router = Router();
console.log("HOSPITAL ROUTE FILE LOADED");
router.get("/", getHospitals);
router.get("/available", getAvailableHospitals);
router.get("/:id", getHospitalById);
router.patch(
  "/update-beds",
  authMiddleware,
  updateEmergencyBeds
);
router.post("/", authMiddleware, adminMiddleware, createHospital);
router.put("/:id", authMiddleware, adminMiddleware, updateHospital);
router.delete("/:id", authMiddleware, adminMiddleware, deleteHospital);

export default router;
