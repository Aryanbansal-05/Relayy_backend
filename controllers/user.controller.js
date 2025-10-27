import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { sendOtpEmail } from "../utils/sendOtpEmail.js";

// ---------------- Generate 6-digit OTP ----------------
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ---------------- SIGNUP ----------------
const signup = async (req, res) => {
  try {
    const { username, email, password, college, hostel } = req.body;

    if (!username || !email || !password || !college || !hostel) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res
          .status(httpStatus.CONFLICT)
          .json({ message: "User already exists. Please log in." });
      } else {
        // If user exists but not verified, resend OTP
        const newOtp = generateOtp();
        existingUser.otp = newOtp;
        existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
        await existingUser.save();

        await sendOtpEmail(email, newOtp);
        return res.status(httpStatus.OK).json({
          message:
            "You are not verified. A new OTP has been sent to your email.",
          email,
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOtp();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10-minute expiry

    // Create new user with isVerified:false
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      college,
      hostel,
      otp,
      otpExpires,
      isVerified: false,
    });

    // Send verification email
    await sendOtpEmail(email, otp);

    res.status(httpStatus.CREATED).json({
      message:
        "An OTP has been sent to your email for verification.",
      email,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error during signup" });
  }
};

// ---------------- VERIFY OTP ----------------
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ message: "User already verified" });

    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (Date.now() > user.otpExpires)
      return res.status(400).json({ message: "OTP expired" });

    // Mark user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully! You can now log in.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error during OTP verification" });
  }
};

// ---------------- RESEND OTP ----------------
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res
        .status(400)
        .json({ message: "User already verified. Please log in." });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOtpEmail(email, otp);
    res.status(200).json({
      message: "A new OTP has been sent to your email address.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Error resending OTP" });
  }
};

// ---------------- LOGIN ----------------
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "Please provide username and password" });

    // Find only verified users
    const user = await User.findOne({ username, isVerified: true });
    if (!user)
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid credentials" });

    // Generate JWT
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

    res.status(httpStatus.OK).json({
      message: "Login successful",
      user: {
        username: user.username,
        email: user.email,
        college: user.college,
        hostel: user.hostel,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error during login" });
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
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error during logout" });
  }
};

// ---------------- VERIFY USER SESSION ----------------
const verifyUser = async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token)
      return res.status(401).json({ message: "No token found" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "username email college hostel"
    );

    if (!user)
      return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export { signup, verifyOtp, resendOtp, login, logout, verifyUser };
