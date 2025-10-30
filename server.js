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
// ✅ 1. Correct CORS Configuration (LOCAL + LIVE)
// ======================================================
const allowedOrigins = [
  "http://localhost:5173",
  "https://relayy-mu.vercel.app",
  "https://relayy.shop",
  "https://www.relayy.shop",
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
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// ✅ Apply CORS globally before routes
app.use(cors(corsOptions));

// ✅ Explicitly handle preflight requests
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
  res.status(200).send("✅ Backend running perfectly with relayy.shop!");
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
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("🌍 Allowed Origins:", allowedOrigins.join(", "));
    });
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

startServer();
