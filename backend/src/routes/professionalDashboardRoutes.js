
import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();

async function authenticateProfessional(req, res, next) {
  try {
    const token = req.cookies?.proconnect_token;

    if (!token) {
      return res.status(401).json({ message: "Please log in." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "PROFESSIONAL") {
      return res.status(403).json({ message: "Professional access required." });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.userId) },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "PROFESSIONAL") {
      return res.status(403).json({ message: "Access denied." });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed." });
  }
}

router.use(authenticateProfessional);

// Get availability and saved services
router.get("/", async (req, res) => {
  try {
    const [user, services] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { is_available: true },
      }),
      prisma.professionalService.findMany({
        where: { user_id: req.userId },
        orderBy: { created_at: "desc" },
      }),
    ]);

    return res.json({
      is_available: user?.is_available ?? true,
      services,
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return res.status(500).json({ message: "Could not load dashboard." });
  }
});

// Update availability
router.patch("/availability", async (req, res) => {
  try {
    const { is_available } = req.body;

    if (typeof is_available !== "boolean") {
      return res.status(400).json({ message: "A valid availability status is required." });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { is_available },
      select: { is_available: true },
    });

    return res.json(user);
  } catch (error) {
    console.error("Availability update error:", error);
    return res.status(500).json({ message: "Could not update availability." });
  }
});

// Create a service
router.post("/services", async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Service title is required." });
    }

    const parsedPrice =
      price === "" || price == null ? null : Number(price);

    if (
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) || parsedPrice < 0)
    ) {
      return res.status(400).json({ message: "Enter a valid price." });
    }

    const service = await prisma.professionalService.create({
      data: {
        user_id: req.userId,
        title: title.trim(),
        description: description?.trim() || null,
        price: parsedPrice,
      },
    });

    return res.status(201).json({
      message: "Service added successfully.",
      service,
    });
  } catch (error) {
    console.error("Service creation error:", error);
    return res.status(500).json({ message: "Could not add service." });
  }
});

// Delete a service belonging to the logged-in professional
router.delete("/services/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid service ID." });
    }

    const result = await prisma.professionalService.deleteMany({
      where: { id, user_id: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: "Service not found." });
    }

    return res.json({ message: "Service deleted successfully." });
  } catch (error) {
    console.error("Service deletion error:", error);
    return res.status(500).json({ message: "Could not delete service." });
  }
});

export default router;
