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
// ✅ 1. Dynamic CORS Configuration (Local + Deployed Domains)
// ======================================================
const allowedOrigins = [
  "http://localhost:5173",        // Local React frontend
  "https://relayy-mu.vercel.app", // Old Vercel deployment
  "https://relayy.shop",          // ✅ New custom domain
  "https://www.relayy.shop",      // ✅ Also allow www just in case
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // ✅ Required to allow cookies (auth)
  })
);
// ======================================================
// ✅ 1.5 Handle CORS Preflight Requests
// ======================================================
app.options("*", cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS (preflight):", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));


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
  res.status(200).send("✅ Campus Marketplace Backend is Running with relayy.shop!");
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
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log("🌍 Allowed Origins:", allowedOrigins.join(", "));
    });
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
};

startServer();

// ======================================================
// ✅ 5. Optional Debug Logs (Development Only)
// ======================================================
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("🛰️  Request:", req.method, req.originalUrl);
    console.log("📦 Cookies:", req.cookies);
    next();
  });
}
