// backend/routes/user.routes.js
import { Router } from "express";
import {
  signup,
  login,
  logout,
  verifyUser,
  verifyOtp,
  resendOtp,
  updateMe,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/user.controller.js";
import { User } from "../models/user.model.js";
import { protect } from "../middleware/authmiddleware.js";

const router = Router();

/* ==========================================================
   🟢 AUTHENTICATION ROUTES
   ========================================================== */
router.post("/signup", signup);               // Register user + send OTP
router.post("/verify-otp", verifyOtp);        // Verify signup OTP
router.post("/resend-otp", resendOtp);        // Resend signup OTP
router.post("/login", login);                 // Login (verified users only)
router.post("/logout", logout);               // Logout user
router.get("/verify", verifyUser);            // Verify session (JWT check)

/* ==========================================================
   🟡 PASSWORD RECOVERY ROUTES
   ========================================================== */
router.post("/forgot-password", forgotPassword);     // Send reset OTP
router.post("/verify-reset-otp", verifyResetOtp);    // Verify reset OTP
router.post("/reset-password", resetPassword);       // Update password after OTP verification

/* ==========================================================
   🔒 USER MANAGEMENT (Protected Routes)
   ========================================================== */
router.patch("/updateMe", protect, updateMe);        // Update profile of logged-in user

/* ==========================================================
   🧾 PUBLIC UTILITY ROUTES
   ========================================================== */
// Get a user by email (public, sanitized)
router.get("/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email })
      .select("-password -otp -otpExpires -token -resetOtp -resetOtpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error("GET /users/:email error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
