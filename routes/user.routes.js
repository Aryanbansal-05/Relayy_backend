import { Router } from "express";
import { signup, login, logout, verifyUser } from "../controllers/user.controller.js"; // ✅ renamed to match improved controller

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify", verifyUser);

export default router;
