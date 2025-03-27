import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// export const uploadToCloudinary = async (file, publicId) => {
//   try {
//     console.log("Received file for upload:", file);
//     console.log("File publicId:", publicId);

//     // Ensure the file buffer exists
//     if (!file || !file.buffer) {
//       console.log("Error: No file buffer received.");
//       throw new Error('File buffer is missing.');
//     }

//     // Upload to Cloudinary using a stream
//     const uploadResult = await new Promise((resolve, reject) => {
//       const uploadStream = cloudinary.v2.uploader.upload_stream(
//         { 
//           public_id: publicId, 
//           folder: 'product_images', // Ensure images are uploaded to this folder
//           use_filename: true, 
//           unique_filename: false
//         },
//         (error, result) => {
//           if (error) {
//             console.log("Cloudinary upload error:", error);
//             return reject(error); // Reject with error
//           }
//           console.log("Uploaded to Cloudinary:", result.secure_url);
//           resolve(result.secure_url); // Return the secure URL of the uploaded image
//         }
//       );

//       // Pipe the file buffer to Cloudinary's upload stream
//       uploadStream.end(file.buffer); // Using .buffer since multer handles file buffer
//     });

//     return uploadResult; // Return the Cloudinary URL

//   } catch (error) {
//     console.error("Error uploading to Cloudinary:", error);
//     throw new Error("Error uploading to Cloudinary");
//   }
// };

export const uploadToCloudinary = async (file, identifier) => {
  try {
    console.log("Uploading file with identifier:", identifier);
    
    if (!file || !file.buffer) {
      throw new Error('File buffer is missing');
    }

    // Generate a unique public ID using the identifier and original filename
    const publicId = `bundle_${identifier}_${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, '')}`;
    
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          public_id: publicId,
          folder: 'product_images',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    console.log("Upload successful. Public ID:", result.public_id);
    return result.secure_url;

  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};