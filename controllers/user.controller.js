// backend/controllers/user.controller.js
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { sendOtpEmail } from "../utils/sendOtpEmail.js";

// ---------------- Generate 6-digit OTP ----------------
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// simple mobile validator: 10 digits (adjust if you expect country codes)
const isValidMobile = (m) => {
  if (!m) return false;
  const s = String(m).trim();
  return /^[0-9]{10}$/.test(s);
};

// ---------------- SIGNUP ----------------
const signup = async (req, res) => {
  try {
    const { username, email, password, college, hostel, mobile } = req.body;

    if (!username || !email || !password || !college || !hostel) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "All fields (username, email, password, college, hostel) are required" });
    }

    // Validate mobile if provided
    if (mobile && !isValidMobile(mobile)) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid mobile number. Provide a 10-digit number without spaces or symbols." });
    }

    // Normalize email for lookup
    const normalizedEmail = String(email).trim().toLowerCase();

    // Check for duplicate mobile if provided
    if (mobile) {
      const existingMobile = await User.findOne({ mobile: String(mobile).trim() });
      if (existingMobile && existingMobile.email !== normalizedEmail) {
        return res
          .status(httpStatus.CONFLICT)
          .json({ message: "Mobile number already registered with another account." });
      }
    }
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    // Generate OTP and expiry
    const otp = generateOtp();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // If user exists and is verified -> conflict
    if (existingUser && existingUser.isVerified) {
      return res.status(httpStatus.CONFLICT).json({ message: "User already exists. Please log in." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create or update user record
    let user;
    if (existingUser) {
      // update unverified user (optionally update password when they re-signup)
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

    // Try sending email but don't fail signup if email fails (log error)
    let emailSent = true;
    try {
      await sendOtpEmail(normalizedEmail, otp);
      console.log("[signup] OTP sent to", normalizedEmail);
    } catch (sendErr) {
      console.error("[signup] sendOtpEmail failed for", normalizedEmail, sendErr?.message || sendErr);
      emailSent = false;
    }

    // Respond with helpful message
    if (emailSent) {
      return res.status(httpStatus.CREATED).json({
        message: "Signup successful — OTP sent to your email. Verify to complete signup.",
        email: normalizedEmail,
      });
    } else {
      // User created but email failed: allow resend via resend endpoint
      return res.status(httpStatus.CREATED).json({
        message:
          "Signup created but OTP could not be sent. Please use the resend-otp endpoint or contact support.",
        email: normalizedEmail,
      });
    }
  } catch (error) {
    console.error("Signup error:", error?.stack || error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Server error during signup",
      error: error?.message || "internal_error",
    });
  }
};

// ---------------- VERIFY OTP ----------------
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

    if (user.isVerified) return res.status(httpStatus.BAD_REQUEST).json({ message: "User already verified" });
    if (user.otp !== String(otp).trim()) return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid OTP" });

    // otpExpires may be Date or number — numeric compare works in both
    if (Date.now() > new Date(user.otpExpires).getTime())
      return res.status(httpStatus.BAD_REQUEST).json({ message: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(httpStatus.OK).json({ message: "Email verified successfully! You can now log in." });
  } catch (error) {
    console.error("OTP verification error:", error?.stack || error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error during OTP verification", error: error?.message || "internal_error" });
  }
};

// ---------------- RESEND OTP ----------------
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(httpStatus.BAD_REQUEST).json({ message: "Email is required" });

    const normalizedEmail = String(email).trim().toLowerCase();
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
    } catch (sendErr) {
      console.error("[resendOtp] sendOtpEmail failed:", sendErr?.message || sendErr);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to send OTP. Try again later." });
    }
  } catch (error) {
    console.error("Resend OTP error:", error?.stack || error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error resending OTP", error: error?.message || "internal_error" });
  }
};

// ---------------- LOGIN ----------------
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide username and password" });

    // DB-level protection: only find verified users
    const user = await User.findOne({ username: String(username).trim(), isVerified: true });
    if (!user) return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not found or not verified" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
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
      user: { username: user.username, email: user.email, college: user.college, hostel: user.hostel, mobile: user.mobile },
      token,
    });
  } catch (error) {
    console.error("Login error:", error?.stack || error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error during login", error: error?.message || "internal_error" });
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

export { signup, verifyOtp, resendOtp, login, logout, verifyUser };
