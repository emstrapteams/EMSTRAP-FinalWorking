import { Router } from "express";
import {
  createAmbulance,
  deleteAmbulance,
  getAmbulanceById,
  getAmbulances,
  updateAmbulance,
} from "../controllers/ambulance.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";

const router = Router();

router.get("/", authMiddleware, adminMiddleware, getAmbulances);
router.get("/:id", authMiddleware, adminMiddleware, getAmbulanceById);
router.post("/", authMiddleware, adminMiddleware, createAmbulance);
router.put("/:id", authMiddleware, adminMiddleware, updateAmbulance);
router.delete("/:id", authMiddleware, adminMiddleware, deleteAmbulance);

export default router;
