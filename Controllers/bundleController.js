import Bundle from '../Models/bundle.js';
import mongoose from 'mongoose';
import { uploadToCloudinary } from "../config/uploadToCloudinary.js";



export const addBundle = async (req, res) => {
  console.log('Starting bundle creation process...');
  
  try {
    // Log incoming files
    console.log('Request files:', req.files);
    if (req.files) {
      console.log('Files received:');
      req.files.forEach(file => {
        console.log(`- ${file.fieldname}:`, file.originalname, file.mimetype, file.size + ' bytes');
      });
    }

    // Parse request data
    const BundleData = JSON.parse(req.body.BundleData || '[]');
    const categories = JSON.parse(req.body.categories || '[]');

    // Validate required fields
    if (!req.body.title) {
      return res.status(400).json({ message: "Bundle title is required" });
    }
    if (!req.body.price || isNaN(req.body.price)) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    // Check for thumbnail
    const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnail');
    if (!thumbnailFile) {
      return res.status(400).json({ message: "Thumbnail image is required" });
    }

    if (categories.length === 0) {
      return res.status(400).json({ message: "At least one category is required" });
    }

    // Upload thumbnail with unique identifier
    const thumbnailUrl = await uploadToCloudinary(
      thumbnailFile,
      'thumbnail'
    );

    // Process products
    const products = [];
    const allSizes = new Set();
    const uploadedUrls = [thumbnailUrl]; // Track all uploaded URLs for cleanup

    try {
      // Process each product in BundleData
      for (const productData of BundleData) {
        const productIndex = productData.productIndex;
        const productImageFile = req.files.find(f => f.fieldname === `productImage_${productIndex}`);
        
        if (!productImageFile) {
          console.log(`Skipping product ${productIndex} - no image found`);
          continue;
        }

        // Upload product image with unique identifier
        const productImageUrl = await uploadToCloudinary(
          productImageFile,
          `product_${productIndex}`
        );
        uploadedUrls.push(productImageUrl);

        const product = {
          image: productImageUrl,
          colors: []
        };

        // Process each color for this product
        for (let colorIndex = 0; colorIndex < productData.colors.length; colorIndex++) {
          const colorData = productData.colors[colorIndex];
          const colorImageFile = req.files.find(f => 
            f.fieldname === `colorImage_${productIndex}_${colorIndex}`
          );
          
          if (!colorImageFile) {
            console.log(`Skipping color ${colorIndex} for product ${productIndex} - no image found`);
            continue;
          }

          // Upload color image with unique identifier
          const colorImageUrl = await uploadToCloudinary(
            colorImageFile,
            `product_${productIndex}_color_${colorIndex}`
          );
          uploadedUrls.push(colorImageUrl);

          if (!colorData.sizes || colorData.sizes.length === 0) {
            console.log(`Skipping color ${colorIndex} for product ${productIndex} - no sizes selected`);
            continue;
          }

          // Add color to the product
          product.colors.push({
            color: colorData.color,
            image: colorImageUrl,
            sizes: colorData.sizes
          });

          // Add sizes to the global set
          colorData.sizes.forEach(size => allSizes.add(size));
        }

        // Only add product if it has at least one valid color
        if (product.colors.length > 0) {
          products.push(product);
        }
      }

      if (products.length === 0) {
        throw new Error("At least one valid product with image is required");
      }

      // Create new bundle
      const newBundle = new Bundle({
        title: req.body.title,
        price: parseFloat(req.body.price),
        description: req.body.description || 'Premium custom bundle',
        thumbnail: thumbnailUrl,
        categories: categories,
        products: products,
        size: Array.from(allSizes),
        seller: req.user.id
      });

      await newBundle.save();
      
      console.log('Created bundle:', {
        title: newBundle.title,
        thumbnail: newBundle.thumbnail,
        products: newBundle.products.map(p => ({
          image: p.image,
          colors: p.colors.map(c => c.image)
        }))
      });
      
      return res.status(201).json({ 
        success: true, 
        bundle: newBundle,
        message: "Bundle created successfully"
      });

    } catch (error) {
      // Cleanup any uploaded files if there was an error
      await cleanupUploads(uploadedUrls);
      throw error;
    }

  } catch (error) {
    console.error("Error in bundle creation:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An internal server error occurred",
    });
  }
};

// Cleanup function for failed uploads
const cleanupUploads = async (urls) => {
  try {
    await Promise.all(urls.map(async url => {
      if (!url) return;
      try {
        // Extract public_id from URL
        const parts = url.split('/');
        const publicId = parts[parts.length - 1].split('.')[0];
        await cloudinary.v2.uploader.destroy(`product_images/${publicId}`);
        console.log(`Cleaned up: ${publicId}`);
      } catch (err) {
        console.error(`Failed to cleanup ${url}:`, err);
      }
    }));
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Get All Bundles
// Get All Bundles
export const getAllBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find(); // Removed populate
    if (!bundles || bundles.length === 0) {
      return res.status(404).json({ success: false, message: "No bundles found" });
    }
    return res.status(200).json({ success: true, bundles });
  } catch (error) {
    console.error("Error fetching bundles:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Similarly update other methods that use populate

// Get Bundles by Category
export const getBundlesByCategory = async (req, res) => {
  const { category } = req.params;

  try {
    const bundles = await Bundle.find({ categories: category }).populate("seller", "name email");
    if (!bundles || bundles.length === 0) {
      return res.status(404).json({ success: false, message: "No bundles found for this category" });
    }
    return res.status(200).json({ success: true, bundles });
  } catch (error) {
    console.error("Error fetching bundles by category:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get Single Bundle by ID
export const getBundleById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid bundle ID" });
  }

  try {
    const bundle = await Bundle.findById(id).populate("seller", "name email");
    if (!bundle) {
      return res.status(404).json({ success: false, message: "Bundle not found" });
    }
    return res.status(200).json({ success: true, bundle });
  } catch (error) {
    console.error("Error fetching bundle:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update a Bundle
export const updateBundle = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if the bundle exists
    const bundle = await Bundle.findById(id);
    if (!bundle) {
      return res.status(404).json({ success: false, message: "Bundle not found" });
    }

    // Check if user is the owner of the bundle
    if (bundle.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this bundle" });
    }

    // Handle thumbnail update if provided
    if (req.files?.thumbnail) {
      try {
        const thumbnailBuffer = req.files.thumbnail[0].buffer;
        const thumbnailResult = await uploadToCloudinary({
          buffer: thumbnailBuffer,
          originalname: req.files.thumbnail[0].originalname
        });
        bundle.thumbnail = thumbnailResult;
      } catch (error) {
        console.error("Error updating thumbnail:", error);
        return res.status(500).json({ message: "Failed to update thumbnail" });
      }
    }

    // Handle product images and color variants updates
    if (req.files) {
      const updatedProductImages = [...bundle.productImages];
      const allSizes = new Set(bundle.size);

      // Process product image updates
      const productImageKeys = Object.keys(req.files).filter(key => key.startsWith('productImage_'));
      for (const key of productImageKeys) {
        const productIndex = parseInt(key.replace('productImage_', ''));
        
        try {
          const productImageBuffer = req.files[key][0].buffer;
          const productImageResult = await uploadToCloudinary({
            buffer: productImageBuffer,
            originalname: req.files[key][0].originalname
          });

          if (updatedProductImages[productIndex]) {
            updatedProductImages[productIndex].image = productImageResult;
          } else {
            updatedProductImages.push({
              image: productImageResult,
              colors: []
            });
          }
        } catch (error) {
          console.error(`Error updating product image ${productIndex}:`, error);
          return res.status(500).json({ message: `Failed to update product image ${productIndex + 1}` });
        }
      }

      // Process color variant updates
      const colorImageKeys = Object.keys(req.files).filter(key => key.startsWith('colorImage_'));
      for (const key of colorImageKeys) {
        const [_, productIndex, colorIndex] = key.split('_').map(Number);
        
        if (!updatedProductImages[productIndex]) continue;

        try {
          const colorImageBuffer = req.files[key][0].buffer;
          const colorImageResult = await uploadToCloudinary({
            buffer: colorImageBuffer,
            originalname: req.files[key][0].originalname
          });

          if (updatedProductImages[productIndex].colors[colorIndex]) {
            updatedProductImages[productIndex].colors[colorIndex].image = colorImageResult;
          } else {
            // If new color variant, we need the color data from BundleData
            const BundleData = req.body.BundleData ? JSON.parse(req.body.BundleData) : [];
            const productData = BundleData.find(p => p.productIndex === productIndex);
            if (productData && productData.colors[colorIndex]) {
              updatedProductImages[productIndex].colors.push({
                color: productData.colors[colorIndex].color,
                image: colorImageResult,
                sizes: productData.colors[colorIndex].sizes
              });
              productData.colors[colorIndex].sizes.forEach(size => allSizes.add(size));
            }
          }
        } catch (error) {
          console.error(`Error updating color image ${productIndex}-${colorIndex}:`, error);
          return res.status(500).json({ message: `Failed to update color variant ${colorIndex + 1} for product ${productIndex + 1}` });
        }
      }

      bundle.productImages = updatedProductImages;
      bundle.size = Array.from(allSizes);
    }

    // Update other fields
    if (req.body.title) bundle.title = req.body.title;
    if (req.body.price) bundle.price = parseFloat(req.body.price);
    if (req.body.description) bundle.description = req.body.description;
    if (req.body.productType) bundle.productType = JSON.parse(req.body.productType);
    if (req.body.categories) bundle.categories = JSON.parse(req.body.categories);
    if (req.body.customizable) bundle.customizable = req.body.customizable === 'true';

    await bundle.save();
    return res.status(200).json({ success: true, message: "Bundle updated successfully", bundle });
  } catch (error) {
    console.error("Error updating bundle:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete a Bundle
export const deleteBundle = async (req, res) => {
  const { id } = req.params;
  try {
    const bundle = await Bundle.findById(id);
    if (!bundle) {
      return res.status(404).json({ success: false, message: "Bundle not found" });
    }

    if (bundle.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this bundle" });
    }

    await bundle.remove();
    return res.status(200).json({ success: true, message: "Bundle deleted successfully" });
  } catch (error) {
    console.error("Error deleting bundle:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};