import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { getStorjImageUrl } from "../config/storj.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDirectory = path.join(
  __dirname,
  "../uploads/connection-documents"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      allowedTypes.includes(file.mimetype) &&
      allowedExtensions.includes(extension)
    ) {
      return cb(null, true);
    }

    cb(new Error("Only PDF, DOC and DOCX files are allowed."));
  },
});

function handleDocumentUpload(req, res, next) {
  documentUpload.single("attachment")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Document upload failed.",
      });
    }

    next();
  });
}

async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.proconnect_token;

    if (!token) {
      return res.status(401).json({ message: "Please log in." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number(decoded.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Authentication failed." });
  }
}

async function requireActiveSubscription(req, res, next) {
  try {
    const role = (req.user.role || "").toUpperCase();

    if (role !== "CUSTOMER" && role !== "USER") {
      return res.status(403).json({
        success: false,
        message: "Customer access required.",
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: req.user.id,
        status: "ACTIVE",
        expires_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        expires_at: "desc",
      },
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_REQUIRED",
        message: "Please activate your subscription to access this feature.",
      });
    }

    next();
  } catch (error) {
    console.error("Subscription verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify subscription.",
    });
  }
}

// PROFESSIONAL SUBSCRIPTION CHECK
async function requireProfessionalActiveSubscription(req, res, next) {
  try {
    const role = (req.user.role || "").toUpperCase();

    if (role !== "PROFESSIONAL") {
      return res.status(403).json({
        success: false,
        message: "Professional access required.",
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: req.user.id,
        status: "ACTIVE",
        expires_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        expires_at: "desc",
      },
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_REQUIRED",
        message:
          "Please activate your subscription to send connection requests.",
      });
    }

    next();
  } catch (error) {
    console.error("Professional subscription verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify subscription.",
    });
  }
}

router.use(authenticate);

const ACTIVE_CONNECTION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "HIRED",
  "COMPLETED",
];

// Generate a temporary signed URL for a customer's Storj profile image.
async function addCustomerProfileImageUrl(customer) {
  if (!customer) return customer;

  let profileImageUrl = null;

  if (customer.profile_image) {
    try {
      profileImageUrl = customer.profile_image.startsWith("http")
        ? customer.profile_image
        : await getStorjImageUrl(customer.profile_image);
    } catch (error) {
      console.error(
        `Customer profile image URL generation failed for user ${customer.id}:`,
        error.message
      );
    }
  }

  return {
    ...customer,
    profile_image_url: profileImageUrl,
  };
}

// PROFESSIONAL: SEARCH CUSTOMERS
// GET /api/connections/customers?search=kanpur

router.get("/customers", async (req, res) => {
  try {
    if ((req.user.role || "").toUpperCase() !== "PROFESSIONAL") {
      return res.status(403).json({
        message: "Only professionals can search customers.",
      });
    }

    const search = String(req.query.search || "").trim();

    // Exclude customers who already have an active connection.
    const activeRequests = await prisma.connectionRequest.findMany({
      where: {
        professional_id: req.user.id,
        status: { in: ACTIVE_CONNECTION_STATUSES },
        connection_removed_at: null,
      },
      select: { customer_id: true },
    });

    const excludedCustomerIds = [
      req.user.id,
      ...activeRequests.map((r) => r.customer_id),
    ];

    const customers = await prisma.user.findMany({
      where: {
        id: { notIn: excludedCustomerIds },
        role: { in: ["CUSTOMER", "customer", "USER", "user"] },
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { address: { contains: search } },
              ],
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
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    const customersWithImages = await Promise.all(
      customers.map(addCustomerProfileImageUrl)
    );

    return res.json({
      customers: customersWithImages,
    });
  } catch (error) {
    console.error("Search customers error:", error);

    return res.status(500).json({
      message: "Unable to search customers.",
    });
  }
});

// PROFESSIONAL: SEND REQUEST TO CUSTOMER
// POST /api/connections/to-customer
// multipart/form-data:
// customer_id, description, attachment (optional)

router.post(
  "/to-customer",
  requireProfessionalActiveSubscription,
  handleDocumentUpload,
  async (req, res) => {
    try {
      if ((req.user.role || "").toUpperCase() !== "PROFESSIONAL") {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(403).json({
          message: "Only professionals can send customer requests.",
        });
      }

      const customerId = Number(req.body.customer_id);

      const description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";

      if (!Number.isInteger(customerId) || customerId <= 0) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(400).json({
          message: "Please select a valid customer.",
        });
      }

      if (description.length < 10 || description.length > 2000) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(400).json({
          message:
            "Introduction must be between 10 and 2000 characters.",
        });
      }

      const customer = await prisma.user.findFirst({
        where: {
          id: customerId,
          role: { in: ["CUSTOMER", "customer", "USER", "user"] },
        },
        select: { id: true },
      });

      if (!customer) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(404).json({
          message: "Customer not found.",
        });
      }

      // Check if an active connection exists between this pair.
      const existing = await prisma.connectionRequest.findFirst({
        where: {
          customer_id: customerId,
          professional_id: req.user.id,
          status: { in: ACTIVE_CONNECTION_STATUSES },
          connection_removed_at: null,
        },
      });

      if (existing) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(409).json({
          message:
            existing.status === "PENDING"
              ? "A pending connection request already exists between you and this customer."
              : `An active connection already exists with this customer (${existing.status.toLowerCase()}).`,
          status: existing.status,
          requestId: existing.id,
        });
      }

      const attachmentUrl = req.file
        ? `/api/connections/attachments/${req.file.filename}`
        : null;

      const request = await prisma.connectionRequest.create({
        data: {
          customer_id: customerId,
          professional_id: req.user.id,
          direction: "PROFESSIONAL_TO_CUSTOMER",
          description,
          attachment_url: attachmentUrl,
          status: "PENDING",
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              profile_image: true,
            },
          },
        },
      });

      return res.status(201).json({
        message: "Connection request sent successfully.",
        request,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.error("Professional to customer request error:", error);

      return res.status(500).json({
        message: "Unable to send connection request.",
      });
    }
  }
);

// PROFESSIONAL: VIEW REQUESTS SENT TO CUSTOMERS
// GET /api/connections/professional-sent

router.get("/professional-sent", async (req, res) => {
  try {
    if ((req.user.role || "").toUpperCase() !== "PROFESSIONAL") {
      return res.status(403).json({
        message: "Professional access required.",
      });
    }

    const requests = await prisma.connectionRequest.findMany({
      where: {
        professional_id: req.user.id,
        direction: "PROFESSIONAL_TO_CUSTOMER",
        connection_removed_at: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            profile_image: true,
            address: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return res.json({ requests });
  } catch (error) {
    console.error("Professional sent requests error:", error);

    return res.status(500).json({
      message: "Unable to load sent requests.",
    });
  }
});

// CUSTOMER: VIEW REQUESTS RECEIVED FROM PROFESSIONALS
// GET /api/connections/customer-received

router.get("/customer-received", async (req, res) => {
  try {
    const role = (req.user.role || "").toUpperCase();

    if (role !== "CUSTOMER" && role !== "USER") {
      return res.status(403).json({
        message: "Customer access required.",
      });
    }

    const requests = await prisma.connectionRequest.findMany({
      where: {
        customer_id: req.user.id,
        direction: "PROFESSIONAL_TO_CUSTOMER",
        connection_removed_at: null,
      },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            profile_image: true,
            professional_profile: {
              select: {
                domain: true,
                bio: true,
                experience_years: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return res.json({ requests });
  } catch (error) {
    console.error("Customer received requests error:", error);

    return res.status(500).json({
      message: "Unable to load received requests.",
    });
  }
});

// CUSTOMER: ACCEPT OR REJECT PROFESSIONAL REQUEST
// PATCH /api/connections/:id/customer-status

router.patch("/:id/customer-status", async (req, res) => {
  try {
    const role = (req.user.role || "").toUpperCase();

    if (role !== "CUSTOMER" && role !== "USER") {
      return res.status(403).json({
        message: "Only customers can respond to these requests.",
      });
    }

    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "Status must be ACCEPTED or REJECTED.",
      });
    }

    const result = await prisma.connectionRequest.updateMany({
      where: {
        id,
        customer_id: req.user.id,
        direction: "PROFESSIONAL_TO_CUSTOMER",
        status: "PENDING",
        connection_removed_at: null,
      },
      data: { status },
    });

    if (!result.count) {
      return res.status(404).json({
        message: "Pending request not found.",
      });
    }

    const request = await prisma.connectionRequest.findUnique({
      where: { id },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            profile_image: true,
          },
        },
      },
    });

    return res.json({
      message: `Request ${status.toLowerCase()} successfully.`,
      request,
    });
  } catch (error) {
    console.error("Customer request response error:", error);

    return res.status(500).json({
      message: "Unable to update request.",
    });
  }
});

// SECURE DOCUMENT DOWNLOAD
// GET /api/connections/attachments/:filename

router.get("/attachments/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;

    if (!/^[a-f0-9-]+\.(pdf|doc|docx)$/i.test(filename)) {
      return res.status(400).json({
        message: "Invalid document name.",
      });
    }

    const attachmentUrl = `/api/connections/attachments/${filename}`;

    const request = await prisma.connectionRequest.findFirst({
      where: {
        attachment_url: attachmentUrl,
        OR: [
          { customer_id: req.user.id },
          { professional_id: req.user.id },
        ],
      },
      select: { id: true },
    });

    if (!request) {
      return res.status(404).json({
        message: "Document not found or access denied.",
      });
    }

    const filePath = path.join(uploadDirectory, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Document file is unavailable.",
      });
    }

    return res.download(filePath);
  } catch (error) {
    console.error("Attachment download error:", error);

    return res.status(500).json({
      message: "Unable to download document.",
    });
  }
});

// PROFESSIONAL: MARK SERVICE COMPLETED
// PATCH /api/connections/:id/complete

router.patch("/:id/complete", async (req, res) => {
  try {
    if ((req.user.role || "").toUpperCase() !== "PROFESSIONAL") {
      return res.status(403).json({
        message: "Only professionals can complete services.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    const result = await prisma.connectionRequest.updateMany({
      where: {
        id,
        professional_id: Number(req.user.id),
        status: "HIRED",
      },
      data: {
        status: "COMPLETED",
      },
    });

    if (result.count === 0) {
      return res.status(409).json({
        message: "Only hired services can be marked completed.",
      });
    }

    const updatedRequest = await prisma.connectionRequest.findUnique({
      where: { id },
      include: {
        skills: true,
        customer: {
          select: {
            id: true,
            name: true,
            profile_image: true,
          },
        },
      },
    });

    return res.json({
      message: "Service marked as completed.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Complete service error:", error);

    return res.status(500).json({
      message: "Unable to complete service.",
    });
  }
});

// CHECK CONNECTION STATUS WITH A SPECIFIC PROFESSIONAL (EITHER DIRECTION)
// GET /api/connections/status-with/:professionalId

router.get("/status-with/:professionalId", async (req, res) => {
  try {
    const professionalId = Number(req.params.professionalId);

    if (!Number.isInteger(professionalId) || professionalId <= 0) {
      return res.status(400).json({
        message: "Invalid professional ID.",
      });
    }

    // Check active request first.
    let request = await prisma.connectionRequest.findFirst({
      where: {
        customer_id: req.user.id,
        professional_id: professionalId,
        status: { in: ACTIVE_CONNECTION_STATUSES },
        connection_removed_at: null,
      },
      orderBy: { updated_at: "desc" },
      include: {
        skills: true,
        professional: {
          select: { id: true, name: true, profile_image: true },
        },
      },
    });

    // If no active request, check for most recent non-removed request.
    if (!request) {
      request = await prisma.connectionRequest.findFirst({
        where: {
          customer_id: req.user.id,
          professional_id: professionalId,
          connection_removed_at: null,
        },
        orderBy: { created_at: "desc" },
        include: {
          skills: true,
          professional: {
            select: { id: true, name: true, profile_image: true },
          },
        },
      });
    }

    return res.json({
      success: true,
      request: request || null,
    });
  } catch (error) {
    console.error("Check connection status error:", error);

    return res.status(500).json({
      message: "Unable to check connection status.",
    });
  }
});

// CUSTOMER SENDS A CONNECTION REQUEST

router.post("/", requireActiveSubscription, async (req, res) => {
  try {
    const userRole = (req.user.role || "").toUpperCase();

    if (userRole !== "CUSTOMER" && userRole !== "USER") {
      return res.status(403).json({
        message: "Only customers can send connection requests.",
      });
    }

    const professionalId = Number(req.body.professional_id);

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    const skills = Array.isArray(req.body.skills)
      ? [
          ...new Set(
            req.body.skills
              .filter((skill) => typeof skill === "string")
              .map((skill) => skill.trim())
              .filter(Boolean)
              .map((skill) => skill.slice(0, 80))
          ),
        ]
      : [];

    if (!Number.isInteger(professionalId) || professionalId <= 0) {
      return res.status(400).json({
        message: "Invalid professional.",
      });
    }

    if (description.length < 10 || description.length > 2000) {
      return res.status(400).json({
        message: "Description must be between 10 and 2000 characters.",
      });
    }

    if (skills.length > 5) {
      return res.status(400).json({
        message: "You can select up to 5 skills.",
      });
    }

    const professional = await prisma.user.findFirst({
      where: {
        id: professionalId,
        role: { in: ["PROFESSIONAL", "professional"] },
      },
      select: { id: true },
    });

    if (!professional) {
      return res.status(404).json({
        message: "Verified professional not found.",
      });
    }

    // Check if an active connection exists between this pair.
    const existing = await prisma.connectionRequest.findFirst({
      where: {
        customer_id: req.user.id,
        professional_id: professionalId,
        status: { in: ACTIVE_CONNECTION_STATUSES },
        connection_removed_at: null,
      },
    });

    if (existing) {
      return res.status(409).json({
        message:
          existing.status === "PENDING"
            ? existing.direction === "PROFESSIONAL_TO_CUSTOMER"
              ? "This professional has already sent you a connection request. Check your received requests."
              : "You already have a pending request for this professional."
            : `An active connection already exists with this professional (${existing.status.toLowerCase()}).`,
        status: existing.status,
        requestId: existing.id,
      });
    }

    const request = await prisma.connectionRequest.create({
      data: {
        customer_id: req.user.id,
        professional_id: professionalId,
        direction: "CUSTOMER_TO_PROFESSIONAL",
        description,
        skills: {
          create: skills.map((name) => ({ name })),
        },
      },
      include: {
        skills: true,
        professional: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(201).json({
      message: "Connection request sent successfully.",
      request,
    });
  } catch (error) {
    console.error("Create connection request:", error);

    return res.status(500).json({
      message: "Unable to send connection request.",
    });
  }
});

// GET ALL ACTIVE CONNECTED PROFESSIONALS AND CONNECTED CUSTOMERS
// GET /api/connections/connected

router.get("/connected", async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);
    const userRole = (req.user.role || "").toUpperCase();

    const connections = await prisma.connectionRequest.findMany({
      where: {
        OR: [
          { customer_id: currentUserId },
          { professional_id: currentUserId },
        ],
        status: { in: ["ACCEPTED", "HIRED", "COMPLETED"] },
        connection_removed_at: null,
      },
      include: {
        skills: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_image: true,
            address: true,
            phone: true,
            created_at: true,
          },
        },
        professional: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_image: true,
            address: true,
            phone: true,
            is_available: true,
            created_at: true,
            professional_profile: {
              select: {
                id: true,
                domain: true,
                bio: true,
                experience_years: true,
                portfolio_url: true,
                skills: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updated_at: "desc" },
    });

    const formatted = connections.map((conn) => {
      const isCustomerSide = conn.customer_id === currentUserId;
      const otherUser = isCustomerSide ? conn.professional : conn.customer;
      const otherRole = isCustomerSide ? "PROFESSIONAL" : "CUSTOMER";

      return {
        id: conn.id,
        status: conn.status,
        direction: conn.direction,
        description: conn.description,
        attachment_url: conn.attachment_url,
        skills: conn.skills.map((s) => s.name),
        created_at: conn.created_at,
        updated_at: conn.updated_at,
        my_role: isCustomerSide ? "CUSTOMER" : "PROFESSIONAL",
        connected_user_role: otherRole,
        connected_user: otherUser,
        customer: conn.customer,
        professional: conn.professional,
      };
    });

    const connectedProfessionals = formatted.filter(
      (c) => c.connected_user_role === "PROFESSIONAL"
    );
    const connectedCustomers = formatted.filter(
      (c) => c.connected_user_role === "CUSTOMER"
    );

    return res.json({
      success: true,
      current_user_role: userRole,
      count: formatted.length,
      connections: formatted,
      connectedProfessionals,
      connectedCustomers,
    });
  } catch (error) {
    console.error("Fetch connected users error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load connections.",
    });
  }
});

// CUSTOMER GETS CURRENTLY HIRED PROFESSIONALS

router.get("/hired", requireActiveSubscription, async (req, res) => {
  try {
    if ((req.user.role || "").toUpperCase() !== "CUSTOMER") {
      return res.status(403).json({
        message: "Customer access required.",
      });
    }

    const hiredProfessionals =
      await prisma.connectionRequest.findMany({
        where: {
          customer_id: req.user.id,
          status: "HIRED",
          connection_removed_at: null,
        },
        include: {
          skills: true,
          professional: {
            select: {
              id: true,
              name: true,
              profile_image: true,
              professional_profile: {
                select: {
                  domain: true,
                  bio: true,
                  experience_years: true,
                },
              },
            },
          },
        },
        orderBy: {
          updated_at: "desc",
        },
      });

    return res.json({
      success: true,
      count: hiredProfessionals.length,
      professionals: hiredProfessionals,
    });
  } catch (error) {
    console.error("Fetch hired professionals error:", error);

    return res.status(500).json({
      message: "Unable to load hired professionals.",
    });
  }
});

// CUSTOMER SEES THEIR SENT REQUESTS

router.get("/sent", requireActiveSubscription, async (req, res) => {
  try {
    if ((req.user.role || "").toUpperCase() !== "CUSTOMER") {
      return res.status(403).json({
        message: "Customer access required.",
      });
    }

    const requests = await prisma.connectionRequest.findMany({
      where: {
        customer_id: req.user.id,
        direction: "CUSTOMER_TO_PROFESSIONAL",
        connection_removed_at: null,
      },
      include: {
        skills: true,
        professional: {
          select: {
            id: true,
            name: true,
            profile_image: true,
            professional_profile: {
              select: {
                domain: true,
                bio: true,
                experience_years: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return res.json({ requests });
  } catch (error) {
    console.error("Fetch sent requests:", error);

    return res.status(500).json({
      message: "Unable to load requests.",
    });
  }
});

// PROFESSIONAL SEES INCOMING CUSTOMER REQUESTS

router.get("/received", async (req, res) => {
  try {
    if ((req.user.role || "").toUpperCase() !== "PROFESSIONAL") {
      return res.status(403).json({
        message: "Professional access required.",
      });
    }

    const requests = await prisma.connectionRequest.findMany({
      where: {
        professional_id: req.user.id,
        direction: "CUSTOMER_TO_PROFESSIONAL",
        connection_removed_at: null,
      },
      include: {
        skills: true,
        customer: {
          select: { id: true, name: true, profile_image: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return res.json({ requests });
  } catch (error) {
    console.error("Fetch received requests:", error);

    return res.status(500).json({
      message: "Unable to load requests.",
    });
  }
});

// PROFESSIONAL ACCEPTS OR REJECTS CUSTOMER REQUEST

router.patch("/:id/status", async (req, res) => {
  try {
    if ((req.user.role || "").toUpperCase() !== "PROFESSIONAL") {
      return res.status(403).json({
        message: "Only professionals can respond to requests.",
      });
    }

    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "Status must be ACCEPTED or REJECTED.",
      });
    }

    const result = await prisma.connectionRequest.updateMany({
      where: {
        id,
        professional_id: req.user.id,
        direction: "CUSTOMER_TO_PROFESSIONAL",
        status: "PENDING",
        connection_removed_at: null,
      },
      data: { status },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message: "Pending request not found.",
      });
    }

    const request = await prisma.connectionRequest.findUnique({
      where: { id },
      include: {
        skills: true,
        customer: {
          select: { id: true, name: true, profile_image: true },
        },
      },
    });

    return res.json({
      message: `Request ${status.toLowerCase()}.`,
      request,
    });
  } catch (error) {
    console.error("Update connection request:", error);

    return res.status(500).json({
      message: "Unable to update request.",
    });
  }
});

// SAVE A PROFESSIONAL

router.post("/saved/:professionalId", requireActiveSubscription, async (req, res) => {
  try {
    const userRole = (req.user.role || "").toUpperCase();

    if (userRole !== "CUSTOMER" && userRole !== "USER") {
      return res.status(403).json({
        message: "Customer access required.",
      });
    }

    const professionalId = Number(req.params.professionalId);

    if (!Number.isInteger(professionalId) || professionalId <= 0) {
      return res.status(400).json({
        message: "Invalid professional ID.",
      });
    }

    const professional = await prisma.user.findFirst({
      where: {
        id: professionalId,
        role: { in: ["PROFESSIONAL", "professional"] },
      },
      select: { id: true },
    });

    if (!professional) {
      return res.status(404).json({
        message: "Professional not found.",
      });
    }

    let saved = await prisma.savedProfessional.findUnique({
      where: {
        customer_id_professional_id: {
          customer_id: req.user.id,
          professional_id: professionalId,
        },
      },
    });

    if (!saved) {
      saved = await prisma.savedProfessional.create({
        data: {
          customer_id: req.user.id,
          professional_id: professionalId,
        },
      });
    }

    return res.status(201).json({
      message: "Professional saved.",
      saved,
    });
  } catch (error) {
    console.error("Save professional:", error);

    return res.status(500).json({
      message: "Unable to save professional.",
    });
  }
});

// LIST SAVED PROFESSIONALS

router.get("/saved/list", requireActiveSubscription, async (req, res) => {
  try {
    const userRole = (req.user.role || "").toUpperCase();

    if (userRole !== "CUSTOMER" && userRole !== "USER") {
      return res.status(403).json({
        message: "Customer access required.",
      });
    }

    const saved = await prisma.savedProfessional.findMany({
      where: { customer_id: req.user.id },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            profile_image: true,
            professional_profile: {
              select: {
                domain: true,
                bio: true,
                experience_years: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return res.json({ saved });
  } catch (error) {
    console.error("List saved professionals:", error);

    return res.status(500).json({
      message: "Unable to load saved professionals.",
    });
  }
});

// CUSTOMER HIRES PROFESSIONAL

router.patch("/:id/hire", requireActiveSubscription, async (req, res) => {
  try {
    const customerId = Number(req.user.id);
    const requestId = Number(req.params.id);

    if ((req.user.role || "").toUpperCase() !== "CUSTOMER") {
      return res.status(403).json({
        message: "Only customers can hire professionals.",
      });
    }

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        message: "Invalid connection request ID.",
      });
    }

    // Only a currently connected, non-removed request can be hired.
    const connection = await prisma.connectionRequest.findFirst({
      where: {
        id: requestId,
        customer_id: customerId,
        connection_removed_at: null,
      },
      include: {
        skills: true,
      },
    });

    if (!connection) {
      return res.status(404).json({
        message: "Active connection request not found.",
      });
    }

    if (!["ACCEPTED", "COMPLETED"].includes(connection.status)) {
      return res.status(400).json({
        message: "Only accepted or completed connections can be hired.",
        status: connection.status,
      });
    }

    let updatedConnection;

    if (connection.status === "COMPLETED") {
      // Re-hiring creates a NEW booking record.
      // The previous COMPLETED booking remains unchanged as history.
      updatedConnection = await prisma.connectionRequest.create({
        data: {
          customer_id: connection.customer_id,
          professional_id: connection.professional_id,
          direction: connection.direction,
          description: connection.description,
          attachment_url: connection.attachment_url,
          status: "HIRED",
          skills: {
            create: connection.skills.map((skill) => ({
              name: skill.name,
            })),
          },
        },
        include: {
          skills: true,
          professional: {
            select: { id: true, name: true, profile_image: true },
          },
        },
      });
    } else {
      // First hire updates the accepted request.
      updatedConnection = await prisma.connectionRequest.update({
        where: { id: requestId },
        data: { status: "HIRED" },
        include: {
          skills: true,
          professional: {
            select: { id: true, name: true, profile_image: true },
          },
        },
      });
    }

    return res.json({
      message:
        connection.status === "COMPLETED"
          ? "Professional hired again successfully. Previous booking history is preserved."
          : "Professional hired successfully.",
      request: updatedConnection,
    });
  } catch (error) {
    console.error("Hire professional error:", error);

    return res.status(500).json({
      message: "Failed to hire professional.",
    });
  }
});

// REMOVE SAVED PROFESSIONAL

router.delete("/saved/:professionalId", requireActiveSubscription, async (req, res) => {
  try {
    const userRole = (req.user.role || "").toUpperCase();

    if (userRole !== "CUSTOMER" && userRole !== "USER") {
      return res.status(403).json({
        message: "Customer access required.",
      });
    }

    const professionalId = Number(req.params.professionalId);

    const result = await prisma.savedProfessional.deleteMany({
      where: {
        customer_id: req.user.id,
        professional_id: professionalId,
      },
    });

    if (!result.count) {
      return res.status(404).json({
        message: "Saved profile not found.",
      });
    }

    return res.json({
      message: "Professional removed from saved list.",
    });
  } catch (error) {
    console.error("Remove saved professional:", error);

    return res.status(500).json({
      message: "Unable to remove saved professional.",
    });
  }
});

// REMOVE / DISCONNECT CONNECTION (BOTH CUSTOMER AND PROFESSIONAL)
// DELETE /api/connections/:id
// Connection requests and booking records are retained.
// Only connection_removed_at is updated.

router.delete("/:id", async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    const connection = await prisma.connectionRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        customer_id: true,
        professional_id: true,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found.",
      });
    }

    if (
      connection.customer_id !== userId &&
      connection.professional_id !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to remove this connection.",
      });
    }

    // Mark every historical request/booking for this pair as removed.
    // No request, booking, skill, or attachment is deleted.
    const result = await prisma.connectionRequest.updateMany({
      where: {
        OR: [
          {
            customer_id: connection.customer_id,
            professional_id: connection.professional_id,
          },
          {
            customer_id: connection.professional_id,
            professional_id: connection.customer_id,
          },
        ],
        connection_removed_at: null,
      },
      data: {
        connection_removed_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      count: result.count,
      message:
        result.count > 0
          ? "Connection removed successfully. Previous booking history has been preserved."
          : "Connection was already removed. Previous booking history is preserved.",
    });
  } catch (error) {
    console.error("Remove connection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove connection.",
    });
  }
});

// REMOVE CONNECTION BY TARGET USER ID
// DELETE /api/connections/with-user/:targetUserId

router.delete("/with-user/:targetUserId", async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);
    const targetUserId = Number(req.params.targetUserId);

    if (
      !Number.isInteger(targetUserId) ||
      targetUserId <= 0 ||
      targetUserId === currentUserId
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user ID.",
      });
    }

    // This query also verifies that the current user belongs to this pair.
    const connection = await prisma.connectionRequest.findFirst({
      where: {
        OR: [
          {
            customer_id: currentUserId,
            professional_id: targetUserId,
          },
          {
            customer_id: targetUserId,
            professional_id: currentUserId,
          },
        ],
      },
      select: {
        customer_id: true,
        professional_id: true,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found.",
      });
    }

    const result = await prisma.connectionRequest.updateMany({
      where: {
        OR: [
          {
            customer_id: connection.customer_id,
            professional_id: connection.professional_id,
          },
          {
            customer_id: connection.professional_id,
            professional_id: connection.customer_id,
          },
        ],
        connection_removed_at: null,
      },
      data: {
        connection_removed_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      count: result.count,
      message:
        "Connection removed successfully. Previous booking history is preserved.",
    });
  } catch (error) {
    console.error("Remove connection by target user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove connection.",
    });
  }
});

export default router;