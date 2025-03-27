import express from "express";
import { addBundle, getAllBundles, updateBundle, deleteBundle, getBundleById, getBundlesByCategory } from "../Controllers/bundleController.js";
import authenticate from "../Middleware/authenticate.js";
import multer from "multer";

const storage = multer.memoryStorage();

// Create a more flexible upload configuration
const createUploadMiddleware = () => {
  return (req, res, next) => {
    const upload = multer({
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 20 // Maximum 20 files
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
          cb(null, true);
        } else {
          cb(new Error("Only image files are allowed"), false);
        }
      }
    }).any(); // Using .any() to handle dynamic field names

    upload(req, res, (err) => {
      if (err) {
        // Handle Multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size too large (max 10MB)' });
        }
        if (err.message === 'Only image files are allowed') {
          return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: 'File upload error' });
      }
      
      // Verify thumbnail was uploaded
      if (!req.files || !req.files.some(file => file.fieldname === 'thumbnail')) {
        return res.status(400).json({ message: 'Thumbnail is required' });
      }
      
      next();
    });
  };
};

const router = express.Router();

// Use the new middleware
router.post("/add", authenticate, createUploadMiddleware(), addBundle);
router.put("/update/:id", authenticate, createUploadMiddleware(), updateBundle);

// Other routes remain the same
router.get("/", getAllBundles);
router.delete("/delete/:id", authenticate, deleteBundle);
router.get("/:id", getBundleById);
router.get("/category/:category", getBundlesByCategory);

export default router;