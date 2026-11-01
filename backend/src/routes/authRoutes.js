import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { sendVerificationEmail } from "../services/emailService.js";

const router = Router();

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "CUSTOMER" } = req.body;
    // 1. Validate input
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    let normalizedRole = (role || "CUSTOMER").toString().toUpperCase().trim();
    if (normalizedRole === "PROFFESIONAL") normalizedRole = "PROFESSIONAL";

    if (!["CUSTOMER", "PROFESSIONAL"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected. Must be CUSTOMER or PROFESSIONAL",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
  return res.status(400).json({
    success: false,
    message: "Please enter a valid email address",
  });
}

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Password is too long",
      });
    }


    // 2. Check whether email already exists
const existingUser = await prisma.user.findUnique({
  where: { email: normalizedEmail },
});

if (existingUser) {
  return res.status(409).json({
    success: false,
    message:
      "An account with this email already exists. Please sign in.",
  });
}

// 3. Hash password
const hashedPassword = await bcrypt.hash(password, 12);

// 4. Generate verification token
const rawToken = crypto.randomBytes(32).toString("hex");

const tokenHash = crypto
  .createHash("sha256")
  .update(rawToken)
  .digest("hex");

const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

// 5. Create user with the selected role
const user = await prisma.user.create({
  data: {
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    is_verified: false,
    role: normalizedRole,
    email_verification_tokens: {
      create: {
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    },
  },
});
    // 6. Send verification email
    try {
      await sendVerificationEmail(user.email, rawToken);
    } catch (emailError) {
      console.error("Verification email failed:", emailError.message);

      // Remove the newly created account if email delivery fails.
      await prisma.user.delete({
        where: { id: user.id },
      });

      return res.status(503).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
      });
    }

    // 7. Send response
    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
    });
  }
});

// GET /api/auth/verify-email?token=...
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    // Validate token format
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).send("Invalid verification link.");
    }

    // Hash the received token
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find token in database
    const verificationToken =
      await prisma.emailVerificationToken.findUnique({
        where: { token_hash: tokenHash },
      });

    if (!verificationToken) {
      return res
        .status(400)
        .send("Invalid or already-used verification link.");
    }

    // Check expiration
    if (verificationToken.expires_at <= new Date()) {
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      return res
        .status(400)
        .send("Verification link expired. Please request a new link.");
    }

    // Verify user and invalidate verification tokens
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.user_id },
        data: { is_verified: true },
        select: { id: true, role: true },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: { user_id: verificationToken.user_id },
      }),
    ]);

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");

    const roleParam = updatedUser?.role ? `&role=${encodeURIComponent(updatedUser.role)}` : "";

    return res.redirect(
      302,
      `${frontendUrl}/login?verified=true${roleParam}`
    );
  } catch (error) {
    console.error("Email verification error:", error);

    return res
      .status(500)
      .send("Email verification failed. Please try again.");
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 1. Validate inputs
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3. Handle accounts created via Google OAuth without a password
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account was registered using Google. Please sign in with Google.",
      });
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 5. Verify email confirmation status
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        unverified: true,
        message:
          "Please verify your email address before signing in. Check your inbox for the verification link.",
      });
    }

    // 6. Role check if a specific role was requested / active in UI
    if (role) {
      let requestedRole = role.toString().toUpperCase().trim();
      if (requestedRole === "PROFFESIONAL") requestedRole = "PROFESSIONAL";

      if (
        ["CUSTOMER", "PROFESSIONAL"].includes(requestedRole) &&
        user.role !== requestedRole
      ) {
        const expectedRoleName =
          user.role === "PROFESSIONAL" ? "Professional" : "Customer";
        return res.status(403).json({
          success: false,
          roleMismatch: true,
          registeredRole: user.role,
          message: `This account is registered as a ${expectedRoleName}. Please switch to the ${expectedRoleName} tab to sign in.`,
        });
      }
    }

    // 7. Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 8. Set HTTP-only authentication cookie
    res.cookie("proconnect_token", token, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred during sign in. Please try again.",
    });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("proconnect_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export default router;
