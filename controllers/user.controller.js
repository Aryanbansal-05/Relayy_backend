// backend/controllers/user.controller.js
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { sendOtpEmail } from "../utils/sendOtpEmail.js";

// ---------------- Utilities ----------------
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const isValidMobile = (m) => {
  if (!m) return false;
  const s = String(m).trim();
  return /^[0-9]{10}$/.test(s);
};
const normalizeEmail = (e) => (e ? String(e).trim().toLowerCase() : "");

// ---------------- SIGNUP ----------------
const signup = async (req, res) => {
  try {
    const { username, email, password, college, hostel, mobile } = req.body;

    if (!username || !email || !password || !college || !hostel) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "All fields (username, email, password, college, hostel) are required" });
    }

    if (mobile && !isValidMobile(mobile)) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid mobile number. Use 10 digits." });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check existing user by email
    const existingUser = await User.findOne({ email: normalizedEmail });

    // Generate OTP and expiry
    const otp = generateOtp();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // If verified user exists -> conflict
    if (existingUser && existingUser.isVerified) {
      return res.status(httpStatus.CONFLICT).json({ message: "User already exists. Please log in." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    if (existingUser) {
      // Update unverified user (refresh OTP & update fields)
      existingUser.username = username;
      existingUser.password = hashedPassword;
      existingUser.college = college;
      existingUser.hostel = hostel;
      if (mobile) existingUser.mobile = String(mobile).trim();
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      existingUser.isVerified = false;
      user = await existingUser.save();
    } else {
      user = await User.create({
        username,
        email: normalizedEmail,
        password: hashedPassword,
        college,
        hostel,
        mobile: mobile ? String(mobile).trim() : undefined,
        otp,
        otpExpires,
        isVerified: false,
      });
    }

    // Send OTP email (don't fail signup if email fails — allow resend)
    let emailSent = true;
    try {
      await sendOtpEmail(normalizedEmail, otp);
      console.log("[signup] OTP sent to", normalizedEmail);
    } catch (err) {
      emailSent = false;
      console.error("[signup] sendOtpEmail failed for", normalizedEmail, err?.message || err);
    }

    return res.status(httpStatus.CREATED).json({
      message: emailSent
        ? "Signup successful — OTP sent to your email. Verify to complete signup."
        : "Signup created but OTP could not be sent. Use resend-otp or contact support.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Signup error:", error?.stack || error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Server error during signup",
      error: error?.message || "internal_error",
    });
  }
};

// ---------------- VERIFY SIGNUP OTP ----------------
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

    if (user.isVerified) return res.status(httpStatus.BAD_REQUEST).json({ message: "User already verified" });
    if (String(user.otp).trim() !== String(otp).trim()) return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid OTP" });

    // Support otpExpires stored as Date or number
    const expires = new Date(user.otpExpires).getTime();
    if (Date.now() > expires) return res.status(httpStatus.BAD_REQUEST).json({ message: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(httpStatus.OK).json({ message: "Email verified successfully! You can now log in." });
  } catch (error) {
    console.error("OTP verification error:", error?.stack || error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Server error during OTP verification",
      error: error?.message || "internal_error",
    });
  }
};

// ---------------- RESEND SIGNUP OTP ----------------
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(httpStatus.BAD_REQUEST).json({ message: "Email is required" });

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
    if (user.isVerified) return res.status(httpStatus.BAD_REQUEST).json({ message: "User already verified. Please log in." });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      await sendOtpEmail(normalizedEmail, otp);
      console.log("[resendOtp] sent to", normalizedEmail);
      return res.status(httpStatus.OK).json({ message: "A new OTP has been sent to your email address." });
    } catch (err) {
      console.error("[resendOtp] sendOtpEmail failed:", err?.message || err);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to send OTP. Try again later." });
    }
  } catch (error) {
    console.error("Resend OTP error:", error?.stack || error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error resending OTP", error: error?.message || "internal_error" });
  }
};

// ---------------- LOGIN ----------------
// ---------------- LOGIN (email-based) ----------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "Please provide email and password" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // only allow verified users to login, searched by email
    const user = await User.findOne({
      email: normalizedEmail,
      isVerified: true,
    });

    if (!user) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "User not found or not verified" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000);

    user.sessionExpiry = sessionExpiry;
    user.token = token;
    await user.save({ validateBeforeSave: false });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
      expires: sessionExpiry,
    });

    return res.status(httpStatus.OK).json({
      message: "Login successful",
      user: {
        username: user.username,
        email: user.email,
        college: user.college,
        hostel: user.hostel,
        mobile: user.mobile,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error?.stack || error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({
        message: "Server error during login",
        error: error?.message || "internal_error",
      });
  }
};


// ---------------- LOGOUT ----------------
const logout = async (req, res) => {
  try {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    });
    return res.status(httpStatus.OK).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error?.stack || error);
    return res.status(500).json({ message: "Server error during logout" });
  }
};

// ---------------- VERIFY USER SESSION ----------------
const verifyUser = async (req, res) => {
  try {
    const token = req.cookies?.auth_token;
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "No token found" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("username email college hostel mobile");
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

    return res.status(httpStatus.OK).json({ user });
  } catch (error) {
    console.error("verifyUser error:", error?.stack || error);
    return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired token" });
  }
};

// ---------------- UPDATE CURRENT USER (protected) ----------------
const updateMe = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ message: "Not authenticated" });

    const allowedFields = ["username", "email", "college", "hostel", "mobile"];
    const bodyKeys = Object.keys(req.body || {});
    const updates = {};

    bodyKeys.forEach((key) => {
      if (allowedFields.includes(key)) updates[key] = req.body[key];
    });

    if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No updatable fields provided" });

    if (updates.email) {
      updates.email = normalizeEmail(updates.email);
      const existing = await User.findOne({ email: updates.email }).select("_id");
      if (existing && String(existing._id) !== String(authUser._id)) {
        return res.status(409).json({ message: "Email is already in use by another account" });
      }
    }

    if (updates.mobile && !isValidMobile(updates.mobile)) {
      return res.status(400).json({ message: "Invalid mobile number" });
    }

    const updatedUser = await User.findByIdAndUpdate(authUser._id, { $set: updates }, { new: true, runValidators: true, context: "query" }).select("-password -otp -otpExpires -token -resetOtp -resetOtpExpires");
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        college: updatedUser.college,
        hostel: updatedUser.hostel,
        mobile: updatedUser.mobile,
      },
    });
  } catch (err) {
    console.error("updateMe error:", err?.stack || err);
    return res.status(500).json({ message: "Failed to update profile", error: err?.message || "internal_error" });
  }
};

// ---------------- FORGOT PASSWORD (send reset OTP) ----------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(httpStatus.BAD_REQUEST).json({ message: "Email is required" });

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      await sendOtpEmail(normalizedEmail, otp);
      return res.status(httpStatus.OK).json({ message: "OTP sent to your email for password reset" });
    } catch (sendErr) {
      console.error("[forgotPassword] sendOtpEmail failed:", sendErr?.message || sendErr);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to send OTP. Try again later." });
    }
  } catch (error) {
    console.error("Forgot password error:", error?.stack || error);
    return res.status(500).json({ message: "Failed to process forgot password", error: error?.message || "internal_error" });
  }
};

// ---------------- VERIFY RESET OTP ----------------
const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(httpStatus.BAD_REQUEST).json({ message: "Email and OTP are required" });

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({
      email: normalizedEmail,
      resetOtp: String(otp).trim(),
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid or expired OTP" });

    return res.status(httpStatus.OK).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("verifyResetOtp error:", error?.stack || error);
    return res.status(500).json({ message: "Error verifying OTP", error: error?.message || "internal_error" });
  }
};

// ---------------- RESET PASSWORD ----------------
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(httpStatus.BAD_REQUEST).json({ message: "Email, OTP, and newPassword are required" });

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({
      email: normalizedEmail,
      resetOtp: String(otp).trim(),
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid or expired OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    return res.status(httpStatus.OK).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("resetPassword error:", error?.stack || error);
    return res.status(500).json({ message: "Failed to reset password", error: error?.message || "internal_error" });
  }
};

// ---------------- export ----------------
export {
  signup,
  verifyOtp,
  resendOtp,
  login,
  logout,
  verifyUser,
  updateMe,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
