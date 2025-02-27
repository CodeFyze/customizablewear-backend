import multer from "multer";

// Configure Multer storage (Memory Storage since we upload to Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  }
}).fields([
  { name: "front", maxCount: 1 }, 
  { name: "side", maxCount: 1 }, 
  { name: "back", maxCount: 1 },
  { name: "colorImages", maxCount: 10 }, // ✅ Allows multiple color images
  { name: "images", maxCount: 10 } // ✅ Allows multiple additional images
]);

export default upload;
