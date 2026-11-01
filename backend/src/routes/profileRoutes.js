
import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

import uploadProfilePicture from "../middleware/uploadMiddleware.js";

import {
  uploadProfilePicture as uploadPicture,
  getMyProfilePicture,
  removeProfilePicture,
} from "../controllers/profileController.js";

const router = Router();

// Authentication using existing ProConnect cookie
async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.proconnect_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please log in to manage your profile picture.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(decoded.userId),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profile_image: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    // Available for both CUSTOMER and PROFESSIONAL
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    console.error("Profile authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
}

// Handle Multer errors with JSON responses
function handleProfileUpload(req, res, next) {
  uploadProfilePicture.single("profileImage")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Profile picture must not exceed 5 MB."
          : error.message || "Invalid image upload.",
      });
    }

    next();
  });
}

// GET: Logged-in user's profile picture
router.get("/me", authenticate, getMyProfilePicture);

// POST: Upload or replace profile picture
router.post(
  "/upload",
  authenticate,
  handleProfileUpload,
  uploadPicture
);

// DELETE: Remove profile picture
router.delete("/remove", authenticate, removeProfilePicture);

export default router;
