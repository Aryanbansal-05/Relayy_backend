// backend/routes/userRoutes.js
import { Router } from "express";
import {
  signup,
  login,
  logout,
  verifyUser,
  verifyOtp,
  resendOtp,
  updateMe,
} from "../controllers/user.controller.js";
import { User } from "../models/user.model.js";
import { protect } from "../middleware/authmiddleware.js";

const router = Router();

/* Public auth routes */
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.get("/verify", verifyUser);

/* Protected: update current user */
router.patch("/updateMe", protect, updateMe);

/* Public: get user by email (sanitized) */
router.get("/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select("-password -otp -otpExpires -token");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error("GET /users/:email error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
