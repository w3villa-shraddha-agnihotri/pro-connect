
import { Router } from "express";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";

const router = Router();

const frontendUrl = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/$/, "");

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.get("/google", (req, res, next) => {
  const rawRole = (req.query.role || "CUSTOMER")
    .toString()
    .toUpperCase()
    .trim();
  const role =
    rawRole === "PROFESSIONAL" || rawRole === "PROFFESIONAL"
      ? "PROFESSIONAL"
      : "CUSTOMER";

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: JSON.stringify({ role }),
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  passport.authenticate(
    "google",
    { session: false },
    (err, user, info) => {
      if (err) {
        console.error("Google OAuth error:", err.message);
        return res.redirect(
          `${frontendUrl}/login?error=google_auth_failed`
        );
      }

      if (!user) {
        return res.redirect(
          `${frontendUrl}/login?error=google_account_unavailable`
        );
      }

      try {
        const token = jwt.sign(
          {
            userId: user.id,
            role: user.role,
          },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.cookie("proconnect_token", token, cookieOptions);

        return res.redirect(`${frontendUrl}/auth/callback`);
      } catch (tokenError) {
        console.error("JWT creation error:", tokenError.message);

        return res.redirect(
          `${frontendUrl}/login?error=google_auth_failed`
        );
      }
    }
  )(req, res, next);
});

export default router;
