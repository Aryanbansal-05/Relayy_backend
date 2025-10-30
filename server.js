import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import Productrouter from "./routes/product.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);

// ======================================================
// ✅ 1. CORS Configuration (Local + Production Domains)
// ======================================================
const allowedOrigins = [
  "http://localhost:5173",        // Local frontend
  "https://relayy-mu.vercel.app", // Old deployment
  "https://relayy.shop",          // ✅ New custom domain
  "https://www.relayy.shop"       // ✅ WWW version
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true, // ✅ Allow cookies and credentials
};

// ✅ Apply CORS globally (before routes)
app.use(cors(corsOptions));

// ✅ Handle CORS preflight requests manually (Express 5 safe)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(204); // ✅ No Content, successful preflight
  }
  next();
});

// ======================================================
// ✅ 2. Middleware
// ======================================================
app.use(cookieParser());
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ======================================================
// ✅ 3. Routes
// ======================================================
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", Productrouter);

app.get("/", (req, res) => {
  res
    .status(200)
    .send("✅ Campus Marketplace Backend is Running with relayy.shop!");
});

// ======================================================
// ✅ 4. Database Connection
// ======================================================
const startServer = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV})`);
      console.log("🌍 Allowed Origins:", allowedOrigins.join(", "));
    });
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
};

startServer();

// ======================================================
// ✅ 5. Debug Logs (for Development Only)
// ======================================================
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("🛰️ Request:", req.method, req.originalUrl);
    console.log("📦 Cookies:", req.cookies);
    next();
  });
}
