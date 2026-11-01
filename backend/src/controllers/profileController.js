
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma.js";

import {
  uploadToStorj,
  getStorjImageUrl,
  deleteFromStorj,
} from "../config/storj.js";

const getUserId = (req) => {
const id = req.user?.id ?? req.user?.userId;
  if (!id || !Number.isInteger(Number(id))) {
    return null;
  }

  return Number(id);
};

const getExtension = (mimeType) => {
  const extensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  return extensions[mimeType] || null;
};

// Upload or replace profile picture
export const uploadProfilePicture = async (req, res) => {
  let uploadedKey = null;

  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a profile picture.",
      });
    }

    const extension = getExtension(req.file.mimetype);

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Only JPG, PNG and WebP images are allowed.",
      });
    }

    // Verify that the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile_image: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Generate a unique Storj object key
    const key = `profiles/${userId}/${randomUUID()}${extension}`;

    // Upload new picture to Storj
    await uploadToStorj({
      key,
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
    });

    uploadedKey = key;

    // Update database only after successful upload
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profile_image: key,
      },
      select: {
        id: true,
        name: true,
        profile_image: true,
      },
    });

    // Delete previous picture after successful database update
    if (
      user.profile_image &&
      user.profile_image !== key
    ) {
      try {
        await deleteFromStorj(user.profile_image);
      } catch (deleteError) {
        // Keep the new picture even if old image deletion fails.
        console.error(
          "Old profile picture deletion failed:",
          deleteError.message
        );
      }
    }

    const imageUrl = await getStorjImageUrl(key);

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully.",
      user: {
        ...updatedUser,
        profile_image_url: imageUrl,
      },
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);

    // Clean up newly uploaded image if database update failed
    if (uploadedKey) {
      try {
        await deleteFromStorj(uploadedKey);
      } catch (cleanupError) {
        console.error(
          "New image cleanup failed:",
          cleanupError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to upload profile picture.",
    });
  }
};

// Get logged-in user's profile picture
export const getMyProfilePicture = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        profile_image: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const imageUrl = user.profile_image
      ? await getStorjImageUrl(user.profile_image)
      : null;

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        profile_image_url: imageUrl,
      },
    });
  } catch (error) {
    console.error("Get profile picture error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile picture.",
    });
  }
};

// Remove profile picture
export const removeProfilePicture = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile_image: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.profile_image) {
      return res.status(200).json({
        success: true,
        message: "No profile picture to remove.",
      });
    }

    // Remove database reference first
    await prisma.user.update({
      where: { id: userId },
      data: {
        profile_image: null,
      },
    });

    // Then delete image from Storj
    try {
      await deleteFromStorj(user.profile_image);
    } catch (deleteError) {
      console.error(
        "Storj profile picture deletion failed:",
        deleteError.message
      );

      return res.status(200).json({
        success: true,
        message:
          "Profile picture removed from your profile. Storage cleanup is pending.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully.",
    });
  } catch (error) {
    console.error("Remove profile picture error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove profile picture.",
    });
  }
};
