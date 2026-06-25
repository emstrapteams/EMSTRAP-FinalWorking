import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import {
    createPrivateDriver,
    getPrivateDrivers,
    updatePrivateDriver,
    deletePrivateDriver,
} from "../controllers/privateDriver.controller.js";

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.post("/", createPrivateDriver);
router.get("/", getPrivateDrivers);
router.put("/:id", updatePrivateDriver);
router.delete("/:id", deletePrivateDriver);

export default router;
