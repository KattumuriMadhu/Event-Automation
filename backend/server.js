import dotenv from "dotenv";
dotenv.config();


import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import morgan from "morgan";

import connectDB from "./config/db.js";
import passport from "./config/passport.js";

import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import approvalRoutes from "./routes/approvalRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import "./jobs/instagramScheduler.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ================= MIDDLEWARE ================= */
// Request logging
app.use(morgan("dev"));

// Set security HTTP headers
app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased to 1000 to accommodate frontend polling (/api/auth/verify every 5s)
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api", limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Implement CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ================= SESSION + PASSPORT ================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "facebook_secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* ================= DATABASE ================= */
connectDB();

/* ================= STATIC FILES ================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/approval", approvalRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/chat", chatRoutes);

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

/* ================= GLOBAL ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.stack);

  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ message: "Internal Server Error" });
  } else {
    res.status(500).json({
      message: err.message,
      stack: err.stack
    });
  }
});
