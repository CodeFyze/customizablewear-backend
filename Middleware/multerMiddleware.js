import multer from "multer";

// Custom error classes
class MulterValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MulterValidationError";
  }
}

class BulkUploadLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "BulkUploadLimitError";
  }
}

// Configure storage - memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// Enhanced file filter
const fileFilter = (req, file, cb) => {
  try {
    // Basic validation
    if (!file.mimetype.startsWith("image/")) {
      throw new MulterValidationError("Only image files are allowed!");
    }
    
    cb(null, true);
  } catch (error) {
    if (error instanceof Error) {
      cb(error);
    } else {
      cb(new Error("File validation failed"));
    }
  }
};

// Main Multer configuration optimized for bulk uploads
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 105, // 1 front + 1 side + 1 back + 100 colors + 3 additional
    fieldSize: 20 * 1024 * 1024, // 20MB for non-file fields
    parts: 110, // Fields + files
    headerPairs: 200 // For large number of files
  },
  fileFilter,
}).fields([
  { name: "front", maxCount: 1 },
  { name: "side", maxCount: 1 },
  { name: "back", maxCount: 1 },
  { name: "colorImages", maxCount: 100 },
  { name: "images", maxCount: 3 }
]);

// Bulk upload middleware
const uploadMiddleware = (req, res, next) => {
  // Early check for total file size
  const totalFiles = req.headers['content-length'] 
    ? Math.ceil(Number(req.headers['content-length']) / (10 * 1024 * 1024))
    : 0;
    
  if (totalFiles > 100) {
    return res.status(413).json({
      success: false,
      message: "Total upload size exceeds reasonable limits"
    });
  }

  upload(req, res, (err) => {
    if (err) {
      // Handle Multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: `Unexpected field ${err.field}. Expected: front, side, back, colorImages[], or images[]`
          });
        }
        
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: "One or more files exceed 10MB limit"
          });
        }
      }

      // Handle memory errors
      if (err instanceof Error && 
          (err.message.includes("ENOMEM") || 
           err.message.includes("Allocation failed"))) {
        console.error("Memory error during upload:", err);
        return res.status(500).json({
          success: false,
          message: "Server resources exceeded. Try uploading fewer files at once."
        });
      }

      // Handle other errors
      console.error("Upload error:", err);
      return res.status(500).json({
        success: false,
        message: "File upload processing failed"
      });
    }

    // For very large uploads, process files in batches
    if (req.files && 'colorImages' in req.files && req.files.colorImages.length > 20) {
      try {
        // Process color images in batches of 20
        const batches = [];
        const colorImages = req.files.colorImages;
        
        for (let i = 0; i < colorImages.length; i += 20) {
          batches.push(colorImages.slice(i, i + 20));
        }
        
        // Add batches to request object for downstream processing
        req.colorImageBatches = batches;
      } catch (batchError) {
        console.error("Batch processing error:", batchError);
        return res.status(500).json({
          success: false,
          message: "Error preparing files for processing"
        });
      }
    }

    next();
  });
};

export default uploadMiddleware;