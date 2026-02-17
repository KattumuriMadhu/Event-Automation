import dotenv from "dotenv";
dotenv.config();


import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

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
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ================= SESSION + PASSPORT ================= */
app.use(
  session({
    secret: "facebook_secret",
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
