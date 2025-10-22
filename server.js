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
// ✅ 1. Dynamic CORS Configuration (for local + production)
// ======================================================
const allowedOrigins = [
  "http://localhost:5173",        // local React frontend
  "https://relayy-mu.vercel.app", // deployed Vercel frontend
];

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite dev
      "https://relayy-mu.vercel.app", // Deployed frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // ✅ required to send cookies
  })
);

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
  res.status(200).send("✅ Campus Marketplace Backend is Running!");
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
// ✅ 5. Optional Debug Logs (for Development Only)
// ======================================================
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("🛰️  Request:", req.method, req.originalUrl);
    console.log("📦 Cookies:", req.cookies);
    next();
  });
}
