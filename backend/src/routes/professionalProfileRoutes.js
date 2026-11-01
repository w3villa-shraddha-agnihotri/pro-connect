import { Router } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";

const requireModule = createRequire(import.meta.url);
let pdfParseLib = null;
try {
  pdfParseLib = requireModule("pdf-parse");
} catch {
  console.warn("pdf-parse library not available");
}

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resumeUploadDirectory = path.join(__dirname, "../uploads/resumes");
fs.mkdirSync(resumeUploadDirectory, { recursive: true });

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumeUploadDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume-${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error("Only PDF, DOC, DOCX and TXT resume files are allowed."));
  },
});

const DOMAINS = [
  "Web Development",
  "Graphic Design",
  "Video Editing",
  "Digital Marketing",
  "Content Writing",
  "UI/UX Design",
];

const COMMON_SKILLS_DICTIONARY = [
  "JavaScript", "TypeScript", "React", "React.js", "Node.js", "Express.js",
  "Vue.js", "Angular", "Next.js", "Python", "Django", "Flask",
  "Java", "Spring Boot", "C++", "C#", ".NET", "PHP", "Laravel",
  "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "HTML", "HTML5",
  "CSS", "CSS3", "Tailwind CSS", "Bootstrap", "Sass", "UI/UX Design",
  "Figma", "Adobe XD", "Photoshop", "Illustrator", "Graphic Design",
  "Logo Design", "Video Editing", "Premiere Pro", "After Effects",
  "DaVinci Resolve", "Content Writing", "Copywriting", "Technical Writing",
  "SEO", "Digital Marketing", "Social Media Marketing", "Email Marketing",
  "Google Ads", "Git", "GitHub", "Docker", "Kubernetes", "AWS", "Azure",
  "GCP", "Linux", "REST APIs", "GraphQL", "Agile", "Scrum"
];

// Authenticate the user using the existing HTTP-only cookie.
async function requireProfessional(req, res, next) {
  try {
    const token = req.cookies?.proconnect_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to continue.",
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
      where: { id: Number(decoded.userId) },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    const userRole = (user.role || "").toUpperCase();
    if (userRole !== "PROFESSIONAL") {
      return res.status(403).json({
        success: false,
        message: "Only professionals can update this profile.",
      });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please sign in again.",
      });
    }

    console.error("Professional authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
}

function validOptionalUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// POST /api/professional-profile/parse-resume
// Upload resume and automatically extract key professional details
router.post(
  "/parse-resume",
  requireProfessional,
  (req, res, next) => {
    resumeUpload.single("resume")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to upload resume.",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a resume file to upload.",
        });
      }

      const filePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();
      let rawText = "";

      if (ext === ".pdf" && pdfParseLib?.PDFParse) {
        try {
          const buffer = fs.readFileSync(filePath);
          const parser = new pdfParseLib.PDFParse({ data: buffer });
          const parsed = await parser.getText();
          rawText = typeof parsed === "string" ? parsed : (parsed?.text || "");
          await parser.destroy?.();
        } catch (pdfErr) {
          console.warn("pdf-parse extraction failed:", pdfErr.message);
        }
      }

      // Fallback text extraction
      if (!rawText || rawText.trim().length === 0) {
        try {
          const buffer = fs.readFileSync(filePath);
          rawText = buffer.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
        } catch {
          rawText = "";
        }
      }

      const extracted = {
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        skills: [],
        experience_years: "",
        domain: "",
        bio: "",
      };

      if (rawText) {
        const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

        // 1. Email extraction
        const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          extracted.email = emailMatch[0].trim();
        }

        // 2. Phone extraction (10-digit, with or without country code, hyphens, spaces, parens)
        const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b[6-9]\d{9}\b|\b\d{10,12}\b/);
        if (phoneMatch) {
          extracted.phone = phoneMatch[0].trim();
        }

        // 3. Location / Address (City, State) extraction
        const locMatch = rawText.match(/(?:location|address|city|residence|based in)[\s:]+([A-Za-z\s]+),\s*([A-Za-z\s]+)/i);
        if (locMatch) {
          const c = locMatch[1].trim();
          const s = locMatch[2].split(/[\r\n;.]/)[0].trim();
          extracted.city = c;
          extracted.state = s;
          extracted.address = `${c}, ${s}`;
        } else {
          // Scan early lines for City, State patterns
          for (const line of lines.slice(0, 15)) {
            const pairMatch = line.match(/\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?),\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?|[A-Z]{2})\b/);
            if (
              pairMatch &&
              !/university|college|institute|school|bachelor|master|degree|curriculum|resume|experience|technologies|skills/i.test(line)
            ) {
              const c = pairMatch[1].trim();
              const s = pairMatch[2].trim();
              extracted.city = c;
              extracted.state = s;
              extracted.address = `${c}, ${s}`;
              break;
            }
          }
        }

        // 4. Skills extraction
        const foundSkills = [];
        for (const skill of COMMON_SKILLS_DICTIONARY) {
          const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:[^a-zA-Z0-9_#+]|$)`, "i");
          if (regex.test(rawText)) {
            foundSkills.push(skill);
          }
        }
        extracted.skills = foundSkills.slice(0, 15);

        // 5. Experience extraction
        const expMatch = rawText.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s*(?:of)?\s*experience)?/i) ||
          rawText.match(/experience\s*:\s*(\d+)/i) ||
          rawText.match(/(\d+)\+?\s*years?\s*in/i);
        if (expMatch && expMatch[1]) {
          const years = parseInt(expMatch[1], 10);
          if (years >= 0 && years <= 50) {
            extracted.experience_years = String(years);
          }
        }

        // 6. Domain inference
        const lowerText = rawText.toLowerCase();
        if (lowerText.includes("ui/ux") || lowerText.includes("figma") || lowerText.includes("user experience")) {
          extracted.domain = "UI/UX Design";
        } else if (lowerText.includes("graphic") || lowerText.includes("photoshop") || lowerText.includes("illustrator")) {
          extracted.domain = "Graphic Design";
        } else if (lowerText.includes("video edit") || lowerText.includes("premiere") || lowerText.includes("after effects")) {
          extracted.domain = "Video Editing";
        } else if (lowerText.includes("marketing") || lowerText.includes("seo") || lowerText.includes("social media")) {
          extracted.domain = "Digital Marketing";
        } else if (lowerText.includes("content writ") || lowerText.includes("copywrit")) {
          extracted.domain = "Content Writing";
        } else if (lowerText.includes("web") || lowerText.includes("react") || lowerText.includes("node") || lowerText.includes("developer") || lowerText.includes("software")) {
          extracted.domain = "Web Development";
        }

        // 7. Bio / Summary (Brief intro) extraction
        const summaryMatch = rawText.match(/(?:summary|professional summary|profile|about me|objective|brief intro|introduction)[\s:]*\n+([^\n]+(?:\n+[^\n]+){1,3})/i);
        if (summaryMatch && summaryMatch[1]) {
          const cleanSummary = summaryMatch[1].replace(/\s+/g, " ").trim();
          if (cleanSummary.length >= 20) {
            extracted.bio = cleanSummary.slice(0, 500);
          }
        }

        // 8. Name extraction (first non-empty line if short and reasonable)
        for (const line of lines.slice(0, 5)) {
          if (
            line.length >= 3 &&
            line.length <= 40 &&
            !line.includes("@") &&
            !line.includes("http") &&
            !/\d/.test(line) &&
            !/resume|curriculum|vitae|page|profile/i.test(line)
          ) {
            extracted.name = line;
            break;
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: "Resume processed successfully.",
        fileName: req.file.originalname,
        fileUrl: `/api/professional-profile/resume/${req.file.filename}`,
        extracted,
      });
    } catch (error) {
      console.error("Resume parse error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process resume.",
      });
    }
  }
);

function parseAddressComponents(rawAddress) {
  if (!rawAddress || typeof rawAddress !== "string") {
    return { street: "", city: "", state: "", pincode: "", fullAddress: "" };
  }

  const raw = rawAddress.trim();
  let pincode = "";
  let withoutPin = raw;
  const pinMatch = raw.match(/[-,\s]+(\b\d{5,6}\b)$/);
  if (pinMatch) {
    pincode = pinMatch[1];
    withoutPin = raw.slice(0, pinMatch.index).trim();
  }

  const parts = withoutPin.split(",").map((p) => p.trim()).filter(Boolean);
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

  return { street, city, state, pincode, fullAddress: raw };
}

// GET /api/professional-profile
// Fetch the logged-in professional's profile.
router.get("/", requireProfessional, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        latitude: true,
        longitude: true,
        profile_image: true,
        professional_profile: {
          include: {
            skills: {
              orderBy: { name: "asc" },
            },
          },
        },
      },
    });

    const profile = user.professional_profile;
    const parsed = parseAddressComponents(user.address);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        pincode: parsed.pincode,
        latitude: user.latitude ?? null,
        longitude: user.longitude ?? null,
        profile_image: user.profile_image,
      },
      profile: profile
        ? {
            domain: profile.domain,
            bio: profile.bio || "",
            experience_years: profile.experience_years,
            portfolio_url: profile.portfolio_url || "",
            skills: profile.skills.map((skill) => skill.name),
          }
        : null,
    });
  } catch (error) {
    console.error("Fetch professional profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load your profile.",
    });
  }
});

// PUT /api/professional-profile
// Create the profile for the first time or update the existing profile.
router.put("/", requireProfessional, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      street,
      city,
      state,
      pincode,
      latitude,
      longitude,
      profile_image,
      domain,
      bio,
      experience_years,
      portfolio_url,
      skills,
    } = req.body;

    // 1. Name validation
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required.",
      });
    }

    // 2. Email validation (Mandatory)
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    const emailTrimmed = email.trim().toLowerCase();

    const existingEmail = await prisma.user.findFirst({
      where: {
        email: emailTrimmed,
        id: { not: req.userId },
      },
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "This email address is already registered to another account.",
      });
    }

    // 3. Phone validation (Mandatory)
    if (typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const cleanPhone = phone.trim();
    if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number (at least 7 to 15 digits).",
      });
    }

    // 4. Address validation
    const finalStreet = (street || "").trim();
    const finalCity = (city || "").trim();
    const finalState = (state || "").trim();
    const finalPincode = (pincode || "").trim();
    let finalAddress = (address || "").trim();

    if (finalStreet || !finalAddress) {
      const parts = [];
      if (finalStreet) parts.push(finalStreet);
      if (finalCity) parts.push(finalCity);
      if (finalState) parts.push(finalState);
      finalAddress = parts.join(", ");
      if (finalPincode) {
        finalAddress += ` - ${finalPincode}`;
      }
    }

    if (!finalCity || !finalState) {
      // Check if address was provided formatted as "City, State"
      const parts = finalAddress.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Address (City and State) is mandatory. Please provide both city and state.",
        });
      }
    }

    let parsedLat = null;
    let parsedLng = null;
    if (latitude !== undefined && latitude !== null && latitude !== "") {
      const num = Number(latitude);
      if (!Number.isNaN(num) && num >= -90 && num <= 90) parsedLat = num;
    }
    if (longitude !== undefined && longitude !== null && longitude !== "") {
      const num = Number(longitude);
      if (!Number.isNaN(num) && num >= -180 && num <= 180) parsedLng = num;
    }

    // 5. Domain validation
    if (!DOMAINS.includes(domain)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid professional domain.",
      });
    }

    // 6. Brief intro / Bio validation (Mandatory)
    if (typeof bio !== "string" || !bio.trim()) {
      return res.status(400).json({
        success: false,
        message: "Brief intro is mandatory. Please provide a short description about yourself.",
      });
    }

    if (bio.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Brief intro must be 2000 characters or fewer.",
      });
    }

    // 7. Skills validation (Mandatory)
    if (
      !Array.isArray(skills) ||
      !skills.every((skill) => typeof skill === "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Skills must be provided as a list of strings.",
      });
    }

    const normalizedSkills = [
      ...new Set(
        (skills || [])
          .map((skill) => skill.trim())
          .filter(Boolean)
          .map((skill) => skill.slice(0, 50))
      ),
    ];

    if (normalizedSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Skills is mandatory. Please enter at least one skill.",
      });
    }

    if (normalizedSkills.length > 25) {
      return res.status(400).json({
        success: false,
        message: "You can add up to 25 skills.",
      });
    }

    // 8. Optional Experience & URLs
    let experience = null;
    if (
      experience_years !== "" &&
      experience_years !== null &&
      experience_years !== undefined
    ) {
      experience = Number(experience_years);

      if (
        !Number.isInteger(experience) ||
        experience < 0 ||
        experience > 80
      ) {
        return res.status(400).json({
          success: false,
          message: "Experience must be a whole number between 0 and 80.",
        });
      }
    }

    const rawImage =
      typeof profile_image === "string" ? profile_image.trim() : "";
    const rawPortfolio =
      typeof portfolio_url === "string" ? portfolio_url.trim() : "";

    const imageUrl =
      rawImage && !/^https?:\/\//i.test(rawImage) && !rawImage.startsWith("/") && !rawImage.startsWith("data:")
        ? `https://${rawImage}`
        : rawImage;

    const portfolioUrl =
      rawPortfolio && !/^https?:\/\//i.test(rawPortfolio)
        ? `https://${rawPortfolio}`
        : rawPortfolio;

    if (
      !validOptionalUrl(imageUrl) ||
      !validOptionalUrl(portfolioUrl)
    ) {
      return res.status(400).json({
        success: false,
        message: "Image and portfolio URLs must be valid HTTP or HTTPS URLs.",
      });
    }

    const saved = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.userId },
        data: {
          name: name.trim(),
          email: emailTrimmed,
          phone: cleanPhone,
          address: finalAddress || (finalCity && finalState ? `${finalCity}, ${finalState}` : null),
          latitude: parsedLat,
          longitude: parsedLng,
          profile_image: imageUrl || null,
        },
      });

      const profile = await tx.professionalProfile.upsert({
        where: { user_id: req.userId },
        update: {
          domain,
          bio: bio.trim(),
          experience_years: experience,
          portfolio_url: portfolioUrl || null,
        },
        create: {
          user_id: req.userId,
          domain,
          bio: bio.trim(),
          experience_years: experience,
          portfolio_url: portfolioUrl || null,
        },
        select: { id: true },
      });

      // Replace the existing skills with the updated list.
      await tx.professionalSkill.deleteMany({
        where: { professional_profile_id: profile.id },
      });

      if (normalizedSkills.length > 0) {
        await tx.professionalSkill.createMany({
          data: normalizedSkills.map((skill) => ({
            professional_profile_id: profile.id,
            name: skill,
          })),
        });
      }

      return tx.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          latitude: true,
          longitude: true,
          profile_image: true,
          professional_profile: {
            include: { skills: { orderBy: { name: "asc" } } },
          },
        },
      });
    });

    const profile = saved?.professional_profile || {};
    const savedParsed = parseAddressComponents(saved?.address);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        phone: saved.phone || "",
        address: saved.address || "",
        street: savedParsed.street,
        city: savedParsed.city,
        state: savedParsed.state,
        pincode: savedParsed.pincode,
        latitude: saved.latitude ?? null,
        longitude: saved.longitude ?? null,
        profile_image: saved.profile_image,
      },
      profile: {
        domain: profile.domain || "",
        bio: profile.bio || "",
        experience_years: profile.experience_years,
        portfolio_url: profile.portfolio_url || "",
        skills: Array.isArray(profile.skills)
          ? profile.skills.map((skill) => skill.name)
          : [],
      },
    });
  } catch (error) {
    console.error("Update professional profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update your profile.",
    });
  }
});

export default router;