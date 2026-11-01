
import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { getStorjImageUrl } from "../config/storj.js";

const router = Router();

// Generate a displayable image URL for a profile picture.
// Storj object keys are converted to temporary signed URLs.
async function addProfileImageUrl(user) {
  if (!user) return user;

  let profileImageUrl = null;

  if (user.profile_image) {
    try {
      // Preserve existing external URLs if any older records use them.
      profileImageUrl = user.profile_image.startsWith("http")
        ? user.profile_image
        : await getStorjImageUrl(user.profile_image);
    } catch (error) {
      console.error(
        `Profile image URL generation failed for user ${user.id}:`,
        error.message
      );
    }
  }

  return {
    ...user,
    profile_image_url: profileImageUrl,
  };
}

// Authenticate logged-in users using the existing auth cookie.
async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.proconnect_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please log in to view professional profiles.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: Number(decoded.userId),
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
}

// Check whether the customer has an active subscription.
async function hasActiveSubscription(userId) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      user_id: userId,
      status: "ACTIVE",
      expires_at: {
        gt: new Date(),
      },
    },
    orderBy: {
      expires_at: "desc",
    },
    select: {
      id: true,
    },
  });

  return Boolean(subscription);
}

const ACTIVE_CONNECTION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "HIRED",
  "COMPLETED",
];

// GET /api/professionals
// Browse professionals (excluding those with active connections for logged-in customers).
router.get("/", async (req, res) => {
  try {
    let excludedProfessionalIds = [];
    let isSubscribed = false;

    // Check optional authentication token.
    const token = req.cookies?.proconnect_token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUserId = Number(decoded.userId);

        const user = await prisma.user.findUnique({
          where: {
            id: currentUserId,
          },
          select: {
            id: true,
            role: true,
          },
        });

        if (user) {
          const role = (user.role || "").toUpperCase();

          if (role === "PROFESSIONAL") {
            // Professionals should not see themselves in explore list.
            excludedProfessionalIds.push(currentUserId);
          } else if (role === "CUSTOMER" || role === "USER") {
            // Customers should not see professionals with active requests/connections.
            const activeConnections = await prisma.connectionRequest.findMany({
              where: {
                customer_id: currentUserId,
                status: {
                  in: ACTIVE_CONNECTION_STATUSES,
                },
                connection_removed_at: null,
              },
              select: {
                professional_id: true,
              },
            });

            excludedProfessionalIds.push(
              ...activeConnections.map((conn) => conn.professional_id)
            );

            isSubscribed = await hasActiveSubscription(currentUserId);
          }
        }
      } catch {
        // If token is invalid or expired, proceed as guest.
      }
    }

    const professionals = await prisma.user.findMany({
      where: {
        role: "PROFESSIONAL",
        is_verified: true,
        ...(excludedProfessionalIds.length > 0
          ? {
              id: {
                notIn: excludedProfessionalIds,
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        profile_image: true,
        address: true,
        latitude: true,
        longitude: true,
        professional_profile: {
          select: {
            domain: true,
            bio: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Generate Storj signed URLs for all professional profile pictures.
    const professionalsWithImages = await Promise.all(
      professionals.map((professional) =>
        addProfileImageUrl(professional)
      )
    );

    return res.status(200).json({
      success: true,
      professionals: isSubscribed
        ? professionalsWithImages
        : professionalsWithImages.slice(0, 5),
    });
  } catch (error) {
    console.error("Fetch professionals error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch professionals.",
    });
  }
});

// GET /api/professionals/map
// Return verified professionals from the customer's saved city.
router.get("/map", authenticate, async (req, res) => {
  try {
    const role = (req.user.role || "").toUpperCase();

    if (role !== "CUSTOMER") {
      return res.status(403).json({
        success: false,
        message: "Only customers can view nearby professionals.",
      });
    }

    // Preserve the existing subscription restriction.
    const active = await hasActiveSubscription(req.user.id);

    if (!active) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_REQUIRED",
        message: "An active subscription is required.",
      });
    }

    // Get customer's saved address.
    const customer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        address: true,
      },
    });

    if (!customer?.address) {
      return res.status(400).json({
        success: false,
        code: "LOCATION_REQUIRED",
        message: "Please complete your profile location first.",
      });
    }

    const parseCityState = (address) => {
      if (!address || typeof address !== "string") {
        return { city: "", state: "" };
      }

      const parts = address
        .replace(/\s*-\s*\d{5,6}\s*$/, "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length < 2) {
        return { city: "", state: "" };
      }

      return {
        city: parts[parts.length - 2],
        state: parts[parts.length - 1],
      };
    };

    const normalize = (value) =>
      String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

    const customerLocation = parseCityState(customer.address);

    if (!customerLocation.city || !customerLocation.state) {
      return res.status(400).json({
        success: false,
        code: "LOCATION_REQUIRED",
        message: "Please save a valid city and state in your profile.",
      });
    }

    // Fetch verified professionals without exposing full addresses.
    const professionals = await prisma.user.findMany({
      where: {
        role: "PROFESSIONAL",
        is_verified: true,
      },
      select: {
        id: true,
        name: true,
        profile_image: true,
        address: true,
        latitude: true,
        longitude: true,
        professional_profile: {
          select: {
            domain: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Keep only professionals in the same city and state.
    const sameCityProfessionals = professionals.filter((professional) => {
      const location = parseCityState(professional.address);

      return (
        normalize(location.city) === normalize(customerLocation.city) &&
        normalize(location.state) === normalize(customerLocation.state)
      );
    });

    const professionalsWithImages = await Promise.all(
      sameCityProfessionals.map(async (professional) => {
        const withImage = await addProfileImageUrl(professional);

        return {
          id: withImage.id,
          name: withImage.name,
          profile_image_url: withImage.profile_image_url,
          domain: withImage.professional_profile?.domain || null,
          latitude: withImage.latitude,
          longitude: withImage.longitude,
          city: customerLocation.city,
          state: customerLocation.state,
        };
      })
    );

    return res.status(200).json({
      success: true,
      customerLocation,
      professionals: professionalsWithImages,
    });
  } catch (error) {
    console.error("Fetch map professionals error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch professionals for map.",
    });
  }
});

// GET /api/professionals/:id
// Login and active subscription required for customers.
router.get("/:id", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const role = (req.user.role || "").toUpperCase();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid professional ID.",
      });
    }

    if (!["CUSTOMER", "PROFESSIONAL"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    // Subscription verification for customers only.
    if (role === "CUSTOMER") {
      const active = await hasActiveSubscription(req.user.id);

      if (!active) {
        return res.status(403).json({
          success: false,
          code: "SUBSCRIPTION_REQUIRED",
          message:
            "An active subscription is required to view professional profiles.",
        });
      }
    }

    const professional = await prisma.user.findFirst({
      where: {
        id,
        role: "PROFESSIONAL",
        is_verified: true,
      },
      select: {
        id: true,
        name: true,
        profile_image: true,
        address: true,
        latitude: true,
        longitude: true,
        professional_profile: {
          select: {
            domain: true,
            bio: true,
            experience_years: true,
            portfolio_url: true,
            skills: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        services: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
          },
          orderBy: {
            created_at: "desc",
          },
        },
      },
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional profile not found.",
      });
    }

    // Generate signed URL for this professional's profile picture.
    const professionalWithImage = await addProfileImageUrl(professional);

    return res.status(200).json({
      success: true,
      professional: professionalWithImage,
    });
  } catch (error) {
    console.error("Get professional profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load professional profile.",
    });
  }
});

export default router;
