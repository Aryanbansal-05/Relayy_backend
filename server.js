import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);

// ✅ Middleware
app.use(cookieParser()); // must come before routes

// ✅ CORS setup for Vite + cookie support
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // your Vite frontend
    credentials: true, // allow sending cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// ✅ Body parsers
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ✅ Routes
app.use("/api/v1/users", userRouter);

// ✅ Health check
app.get("/", (req, res) => {
  res.status(200).send("✅ Campus Marketplace Backend is Running!");
});

// ✅ Start server + connect MongoDB
const startServer = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
};

startServer();
