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
  "http://localhost:5173",        // Local React frontend
  "https://relayy-mu.vercel.app", // Old Vercel deployment
  "https://relayy.shop",          // ✅ Custom domain
  "https://www.relayy.shop"       // ✅ www version
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true, // ✅ Required for cookies (auth)
};

// ✅ Apply CORS globally (important: before any routes)
app.use(cors(corsOptions));

// ✅ Handle preflight requests explicitly (for browsers)
app.options("*", cors(corsOptions));

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
    console.log("🛰️  Request:", req.method, req.originalUrl);
    console.log("📦 Cookies:", req.cookies);
    next();
  });
}
