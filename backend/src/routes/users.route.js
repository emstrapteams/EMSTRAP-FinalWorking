import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import { createUser, deleteUser, getAllUsers } from "../controllers/admin.controller.js";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/", getAllUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);

export default router;
