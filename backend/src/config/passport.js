
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/prisma.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${
        process.env.BACKEND_URL || "http://localhost:5000"
      }/api/auth/google/callback`,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // 1. Validate Google's email.
        const email = profile.emails?.[0]?.value
          ?.trim()
          .toLowerCase();

        const emailVerified = profile._json?.email_verified === true;

        if (!email || !emailVerified) {
          return done(null, false, {
            message: "Google did not provide a verified email address.",
          });
        }

        const providerId = profile.id;
        const name = profile.displayName || email.split("@")[0];

        // 2. Determine the requested role for a NEW account.
        let selectedRole = "CUSTOMER";

        try {
          const rawState = req.query?.state;

          if (rawState) {
            let parsed = rawState;

            if (typeof rawState === "string") {
              try {
                parsed = JSON.parse(rawState);
              } catch {
                try {
                  parsed = JSON.parse(decodeURIComponent(rawState));
                } catch {
                  parsed = rawState;
                }
              }
            }

            const candidateRole = (
              typeof parsed === "object" && parsed !== null
                ? parsed.role
                : parsed
            )
              ?.toString()
              ?.toUpperCase()
              ?.trim();

            if (
              candidateRole === "PROFESSIONAL" ||
              candidateRole === "PROFFESIONAL"
            ) {
              selectedRole = "PROFESSIONAL";
            }
          }
        } catch (error) {
          console.error("Error parsing Google OAuth state:", error);
        }

        // 3. Check whether this Google account is already linked.
        const socialAccount = await prisma.socialAccount.findUnique({
          where: {
            provider_provider_id: {
              provider: "GOOGLE",
              provider_id: providerId,
            },
          },
          include: {
            user: true,
          },
        });

        if (socialAccount) {
          // Existing Google account: preserve its stored role.
          return done(null, socialAccount.user);
        }

        // 4. Check whether the email already belongs to a user.
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        // 5. Link Google to the existing user or create a new user.
        const user = await prisma.$transaction(async (tx) => {
          let accountUser;

          if (existingUser) {
            // Do not change the existing user's role.
            accountUser = await tx.user.update({
              where: { id: existingUser.id },
              data: {
                is_verified: true,
              },
            });
          } else {
            // Apply the selected role only when creating a new account.
            accountUser = await tx.user.create({
              data: {
                name,
                email,
                is_verified: true,
                role: selectedRole,
              },
            });
          }

          // Link this Google identity to the user.
          await tx.socialAccount.create({
            data: {
              user_id: accountUser.id,
              provider: "GOOGLE",
              provider_id: providerId,
            },
          });

          return accountUser;
        });

        return done(null, user);
      } catch (error) {
        // 6. Handle a concurrent request that created the Google link first.
        if (error.code === "P2002") {
          try {
            const linked = await prisma.socialAccount.findUnique({
              where: {
                provider_provider_id: {
                  provider: "GOOGLE",
                  provider_id: profile.id,
                },
              },
              include: {
                user: true,
              },
            });

            if (linked) {
              return done(null, linked.user);
            }
          } catch (lookupError) {
            return done(lookupError);
          }
        }

        console.error("Google authentication error:", error);
        return done(error);
      }
    }
  )
);

export default passport;
