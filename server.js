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
// ✅ 1. CORS Configuration
// ======================================================
const allowedOrigins = [
  "http://localhost:5173",
  "https://relayy-mu.vercel.app",
  "https://relayy.shop",
  "https://www.relayy.shop",
  "https://relayy-backend-9war.onrender.com" // ✅ Add your backend URL
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// ✅ Apply CORS middleware FIRST (before any routes)
app.use(cors(corsOptions));

// ======================================================
// ✅ 2. Middleware
// ======================================================
app.use(cookieParser());
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ======================================================
// ✅ 3. Debug Logs (for Development)
// ======================================================
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("🛰️ Request:", req.method, req.originalUrl);
    console.log("🌍 Origin:", req.headers.origin);
    console.log("📦 Cookies:", req.cookies);
    next();
  });
}

// ======================================================
// ✅ 4. Routes
// ======================================================
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", Productrouter);

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "✅ Campus Marketplace Backend is Running!",
    allowedOrigins
  });
});

// ======================================================
// ✅ 5. Database Connection
// ======================================================
const startServer = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("🌍 Allowed Origins:", allowedOrigins.join(", "));
    });
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
};

startServer();