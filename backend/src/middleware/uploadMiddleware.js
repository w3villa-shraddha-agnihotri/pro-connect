
import multer from "multer";

// Allowed image MIME types
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Store uploaded images temporarily in memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only JPG, JPEG, PNG and WebP images are allowed.")
    );
  }

  callback(null, true);
};

// Multer configuration
const uploadProfilePicture = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum 5 MB
    files: 1,
  },
});

// Export middleware
export default uploadProfilePicture;
