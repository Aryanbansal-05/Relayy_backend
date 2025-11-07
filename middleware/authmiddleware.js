// backend/middleware/authmiddleware.js
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import cookie from "cookie"; // Import the cookie parsing library

export const protect = async (req, res, next) => {
  try {
    const token =
      req.cookies?.auth_token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    console.log("✅ Authenticated user:", user.email);
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
export const verifySocketToken = async (socket, next) => {
  try {
    console.log("🔍 Socket handshake headers:", socket.handshake.headers);
    
    // Get cookies from the socket handshake
    const cookieString = socket.handshake.headers.cookie;
    if (!cookieString) {
      console.error("❌ No cookies in socket handshake");
      return next(new Error("Authentication error: No cookies found."));
    }

    // Parse the 'auth_token' from the cookie string
    const cookies = cookie.parse(cookieString);
    const token = cookies?.auth_token;

    if (!token) {
      console.error("❌ No auth_token in cookies:", cookies);
      return next(new Error("Authentication error: No auth_token cookie."));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user
    const user = await User.findById(decoded.id).select(
      "username email college hostel"
    );

    if (!user) {
      console.error("❌ User not found for decoded id:", decoded.id);
      return next(new Error("Authentication error: User not found."));
    }

    console.log("✅ Socket authenticated for user:", user.username);
    // Attach the user to the socket object for later use
    socket.user = user;
    next();
  } catch (err) {
    console.error("❌ Socket Auth Error:", err.message);
    return next(new Error("Authentication error: Invalid token."));
  }
};
