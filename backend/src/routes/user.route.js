import { Router } from "express";
import { registerUser, loginUser, loginAdminUser, logoutUser, getMe, updateUser, changePassword, verifyEmail, forgotPassword, resetPassword, setupAdminUser } from "../controllers/auth.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin/login", loginAdminUser);
router.post("/setup-admin", setupAdminUser);
router.post("/logout", logoutUser);
router.get("/me", authMiddleware, getMe);
router.put("/profile", authMiddleware, updateUser);
router.put("/change-password", authMiddleware, changePassword);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

export default router;
