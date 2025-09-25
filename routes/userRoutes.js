import express from "express";
import { createUser, loginUser, sendResetLink, verifyUser, resetPassword, getAllUsers, getUserById, sendAdminResetLink, logoutUser, setupTwoFactorAuth, verifyTwoFactorAuth, validateTwoFactorAuth } from "../controllers/userController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", createUser);
router.post("/login", loginUser);
router.post('/resetlink', sendResetLink);
router.post('/resetpassword/:token', resetPassword);
router.post("/admin/sendresetlink", sendAdminResetLink);
router.get("/verify-user",verifyToken, verifyUser);
router.get('/', verifyToken, getAllUsers);
router.get('/:id', verifyToken, getUserById);
router.post("/2fa/setup", verifyToken, setupTwoFactorAuth);
router.post("/2fa/verify", verifyToken, verifyTwoFactorAuth);
router.post("/2fa/validate", validateTwoFactorAuth);
router.post("/logout",verifyToken, logoutUser);


export default router;