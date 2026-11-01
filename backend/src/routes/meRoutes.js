
import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();

function parseAddressComponents(rawAddress) {
  if (!rawAddress || typeof rawAddress !== "string") {
    return {
      street: "",
      city: "",
      state: "",
      pincode: "",
      fullAddress: "",
    };
  }

  const raw = rawAddress.trim();
  let pincode = "";
  let withoutPin = raw;

  const pinMatch = raw.match(/[-,\s]+(\b\d{5,6}\b)$/);

  if (pinMatch) {
    pincode = pinMatch[1];
    withoutPin = raw.slice(0, pinMatch.index).trim();
  }

  const parts = withoutPin
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let street = "";
  let city = "";
  let state = "";

  if (parts.length === 1) {
    city = parts[0];
  } else if (parts.length === 2) {
    city = parts[0];
    state = parts[1];
  } else if (parts.length >= 3) {
    state = parts[parts.length - 1];
    city = parts[parts.length - 2];
    street = parts.slice(0, parts.length - 2).join(", ");
  }

  return {
    street,
    city,
    state,
    pincode,
    fullAddress: raw,
  };
}

function getAuthenticatedUserId(req, res) {
  const token = req.cookies?.proconnect_token;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Please log in.",
    });

    return null;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number(payload.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user ID");
    }

    return userId;
  } catch {
    res.clearCookie("proconnect_token", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
});

    res.status(401).json({
      success: false,
      message: "Session expired. Please sign in again.",
    });

    return null;
  }
}

// Get current logged-in user
router.get("/me", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);

    if (!userId) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        latitude: true,
        longitude: true,
        role: true,
        is_verified: true,
        profile_image: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    const parsed = parseAddressComponents(user.address);

    return res.json({
      user: {
        ...user,
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        pincode: parsed.pincode,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user.",
    });
  }
});

// Update user address and location coordinates
router.put(["/address", "/me/address"], async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);

    if (!userId) return;

    const {
      street,
      city,
      state,
      pincode,
      address,
      latitude,
      longitude,
    } = req.body;

    const finalStreet =
      typeof street === "string" ? street.trim() : "";

    const finalCity =
      typeof city === "string" ? city.trim() : "";

    const finalState =
      typeof state === "string" ? state.trim() : "";

    const finalPincode =
      typeof pincode === "string" ? pincode.trim() : "";

    if (!finalCity || !finalState) {
      return res.status(400).json({
        success: false,
        message: "City and State are required for address.",
      });
    }

    let finalAddress =
      typeof address === "string" ? address.trim() : "";

    if (finalStreet || !finalAddress) {
      const parts = [];

      if (finalStreet) parts.push(finalStreet);
      parts.push(finalCity);
      parts.push(finalState);

      finalAddress =
        parts.join(", ") +
        (finalPincode ? ` - ${finalPincode}` : "");
    }

    // Preserve existing coordinates if frontend does not send them.
    const hasLatitude = Object.prototype.hasOwnProperty.call(
      req.body,
      "latitude"
    );

    const hasLongitude = Object.prototype.hasOwnProperty.call(
      req.body,
      "longitude"
    );

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude must be provided together.",
      });
    }

    const updateData = {
      address: finalAddress,
    };

    if (hasLatitude && hasLongitude) {
      if (latitude === null && longitude === null) {
        updateData.latitude = null;
        updateData.longitude = null;
      } else {
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
          latitude == null ||
          longitude == null ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid latitude or longitude.",
          });
        }

        updateData.latitude = lat;
        updateData.longitude = lng;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        latitude: true,
        longitude: true,
        role: true,
        is_verified: true,
        profile_image: true,
      },
    });

    const parsed = parseAddressComponents(updatedUser.address);

    return res.json({
      success: true,
      message: "Address updated successfully.",
      user: {
        ...updatedUser,
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        pincode: parsed.pincode,
      },
    });
  } catch (error) {
    console.error("Update address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update address.",
    });
  }
});

export default router;
