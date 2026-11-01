
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { prisma } from "./src/lib/prisma.js";

import authRoutes from "./src/routes/authRoutes.js";
import professionalRoutes from "./src/routes/professionalRoutes.js";
import meRoutes from "./src/routes/meRoutes.js";
import googleAuthRoutes from "./src/routes/googleAuthRoutes.js";
import ProfessionalDashboardRoutes from "./src/routes/professionalDashboardRoutes.js";
import professionalProfileRoutes from "./src/routes/professionalProfileRoutes.js";
import connectionRoutes from "./src/routes/connectionRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import profileRoutes from "./src/routes/profileRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS policy violation: " + origin),
        false
      );
    },
    credentials: true,
  })
);

app.use(cookieParser());

// Stripe webhook must receive raw body before express.json()
app.use("/api/payments", paymentRoutes);

// JSON middleware
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ProConnect backend is running",
  });
});

// Database health check
app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Database connected successfully",
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/auth", meRoutes);

// Profile picture routes (Storj)
app.use("/api/profile", profileRoutes);

// Existing application routes
app.use("/api/professional-profile", professionalProfileRoutes);
app.use("/api/professional-dashboard", ProfessionalDashboardRoutes);
app.use("/api/professionals", professionalRoutes);
app.use("/api/connections", connectionRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`ProConnect server running at http://localhost:${PORT}`);
});
