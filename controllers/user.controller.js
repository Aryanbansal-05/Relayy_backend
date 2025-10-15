import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";

// ---------------- SIGNUP ----------------
const signup = async (req, res) => {
  try {
    const { username, email, password, college, hostel } = req.body;

    if (!username || !email || !password || !college || !hostel) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(httpStatus.CONFLICT)
        .json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      college,
      hostel,
    });

    // ✅ Generate token tied to user ID
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const sessionExpiry = new Date();
    sessionExpiry.setHours(sessionExpiry.getHours() + 1);
    newUser.sessionExpiry = sessionExpiry;
    newUser.token = token;
    await newUser.save();

    // ✅ Use flexible cookie configuration
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS in production only
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // "Lax" for localhost
      expires: sessionExpiry,
    });

    res.status(httpStatus.CREATED).json({
      message: "Signup successful",
      user: {
        username: newUser.username,
        email: newUser.email,
        college: newUser.college,
        hostel: newUser.hostel,
      },
      token,
      sessionExpiry,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Server error during signup",
      error: error.message,
    });
  }
};

// ---------------- LOGIN ----------------
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "Please provide username and password" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found" });
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

    const sessionExpiry = new Date();
    sessionExpiry.setHours(sessionExpiry.getHours() + 1);
    user.sessionExpiry = sessionExpiry;
    user.token = token;
    await user.save({ validateBeforeSave: false });

    // ✅ Proper cookie setup
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // false in dev
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
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
      sessionExpiry,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Server error during login",
      error: error.message,
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
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res
      .status(500)
      .json({ message: "Server error during logout", error: error.message });
  }
};

// ---------------- VERIFY USER ----------------
const verifyUser = async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ message: "No token found" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "username email college hostel"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export { signup, login, logout, verifyUser };
