import { validationResult } from "express-validator";
import Product from "../Models/Product.js";
// import uploadToAzure from "../Utils/uploadToAzureStorage.js";
import { uploadToCloudinary } from "../config/uploadToCloudinary.js";
// import deleteFromAzure from "../Utils/deleteFromAzureStorage.js";
import { deleteFromCloudinary } from "../config/deleteFromCloudinary.js"
import Cart from "../Models/Cart.js";



export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    const formattedProducts = products.map(product => ({
      ...product._doc, 
      image: product.frontImage, // ✅ Set image field explicitly
    }));

    res.status(200).json({ success: true, products: formattedProducts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in get all products route", error);
  }
};


export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
    });
    console.error("Error in get product by id route", error);
  }
};

export const getProductByName = async (req, res) => {
  try {
    const product = await Product.findOne({ title: req.params.name });
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
    });
    console.error("Error in get product by id route", error);
  }
};


// export const addProduct = async (req, res) => {
//   try {
//     console.log("Received request to add product", req.body);
//     console.log("Files received:", req.files);

//     // Ensure that the front image is uploaded
//     if (!req.files || !req.files["front"]) {
//       return res.status(400).json({
//         success: false,
//         message: "Front image is required",
//       });
//     }

//     // ✅ Parse colors from request body (ensure it's an array)
//     let colors = req.body.colors ? JSON.parse(req.body.colors) : [];
//     let colorImages = [];

//     // ✅ Upload color images & match them to colors
//     if (req.files["colorImages"]) {
//       req.files["colorImages"].forEach(async (image, index) => {
//         const color = colors[index] || "#000000"; // Default color if missing
//         const imageUrl = await uploadToCloudinary(image, `${req.body.title}_color_${index}`);
//         colorImages.push({ color, imageUrl });
//       });
//     }

//     // Ensure required fields like title and price are provided
//     if (!req.body.title || !req.body.price) {
//       return res.status(400).json({
//         success: false,
//         message: "Title and price are required",
//       });
//     }

//     // ✅ Upload required front image to Cloudinary
//     const frontImageUrl = await uploadToCloudinary(req.files["front"][0], `${req.body.title}_front`);

//     // ✅ Optional side and back images (upload if they exist)
//     let sideImageUrl = null;
//     if (req.files["side"]) {
//       sideImageUrl = await uploadToCloudinary(req.files["side"][0], `${req.body.title}_side`);
//     }

//     let backImageUrl = null;
//     if (req.files["back"]) {
//       backImageUrl = await uploadToCloudinary(req.files["back"][0], `${req.body.title}_back`);
//     }

//     // ✅ Upload additional images
//     const additionalImages = [];
//     if (req.files["images"]) {
//       for (const image of req.files["images"]) {
//         const imageUrl = await uploadToCloudinary(image, `${req.body.title}_extra_${Date.now()}`);
//         additionalImages.push(imageUrl);
//       }
//     }

//     // ✅ Parse sizes from request body
//     let sizes = req.body.sizes ? JSON.parse(req.body.sizes) : [];

//     // ✅ Parse product type from request body
//     const productType = req.body.productType ? JSON.parse(req.body.productType) : [];

//     // Ensure that product type is selected
//     if (productType.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one product type (hoodie, shirt, trouser) must be selected",
//       });
//     }

//     // ✅ Save product to database with colors & images
//     const product = new Product({
//       title: req.body.title,
//       price: req.body.price,
//       stock: req.body.stock || "In Stock",
//       frontImage: frontImageUrl,
//       sideImage: sideImageUrl, // Can be null if not provided
//       backImage: backImageUrl, // Can be null if not provided
//       images: additionalImages,
//       size: sizes,
//       description: req.body.description,
//       colors: colorImages.map((item) => item.color),
//       colorImages: colorImages.map((item) => item.imageUrl),
//       seller: req.user.id,
//       customizable: req.body.customizable || false,
//       productType: productType, // Save the product type
//     });

//     await product.save();
//     res.status(201).json({ success: true, product });
//   } catch (error) {
//     console.error("Error in add product route:", error);
//     res.status(500).json({
//       success: false,
//       message: "An internal server error occurred",
//     });
//   }
// };


export const addProduct = async (req, res) => {
  try {
    console.log("Received request to add product", req.body);
    console.log("Files received:", req.files);

    // Validate required fields first
    if (!req.files?.front?.[0]) {
      return res.status(400).json({ success: false, message: "Front image is required" });
    }
    if (!req.body.title || !req.body.price) {
      return res.status(400).json({ success: false, message: "Title and price are required" });
    }

    // Parse data from request
    const colors = req.body.colors ? JSON.parse(req.body.colors) : [];
    const sizes = req.body.sizes ? JSON.parse(req.body.sizes) : [];
    const productType = req.body.productType ? JSON.parse(req.body.productType) : [];

    if (productType.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one product type must be selected" 
      });
    }

    // Upload all images in parallel with concurrency control
    const uploadTasks = [];
    const MAX_CONCURRENT_UPLOADS = 10; // Prevent overloading server/API

    // 1. Upload front image (required)
    uploadTasks.push(
      uploadToCloudinary(req.files.front[0], `${req.body.title}_front`)
        .then(url => ({ type: 'front', url }))
    );

    // 2. Upload optional images (side, back)
    if (req.files.side?.[0]) {
      uploadTasks.push(
        uploadToCloudinary(req.files.side[0], `${req.body.title}_side`)
          .then(url => ({ type: 'side', url }))
      );
    }
    if (req.files.back?.[0]) {
      uploadTasks.push(
        uploadToCloudinary(req.files.back[0], `${req.body.title}_back`)
          .then(url => ({ type: 'back', url }))
      );
    }

    // 3. Upload additional images
    if (req.files.images) {
      req.files.images.forEach((image, i) => {
        uploadTasks.push(
          uploadToCloudinary(image, `${req.body.title}_extra_${Date.now()}_${i}`)
            .then(url => ({ type: 'additional', url }))
        );
      });
    }

    // 4. Upload color images with concurrency control
    if (req.files.colorImages) {
      const colorUploads = req.files.colorImages.map((image, index) => {
        const color = colors[index] || "#000000";
        return async () => { // Wrap in function for controlled execution
          try {
            const imageUrl = await uploadToCloudinary(
              image, 
              `${req.body.title}_color_${index}_${Date.now()}`
            );
            return { color, imageUrl };
          } catch (error) {
            console.error(`Failed to upload color image ${index}:`, error);
            return { color, imageUrl: null, error: error.message };
          }
        };
      });

      // Process color uploads in batches
      const batchSize = MAX_CONCURRENT_UPLOADS;
      const colorResults = [];
      for (let i = 0; i < colorUploads.length; i += batchSize) {
        const batch = colorUploads.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(task => task()));
        colorResults.push(...batchResults);
      }
      uploadTasks.push(Promise.resolve({ type: 'colors', data: colorResults }));
    }

    // Execute all uploads
    const results = await Promise.all(uploadTasks);

    // Process results
    const frontImageUrl = results.find(r => r.type === 'front').url;
    const sideImageUrl = results.find(r => r.type === 'side')?.url || null;
    const backImageUrl = results.find(r => r.type === 'back')?.url || null;
    const additionalImages = results
      .filter(r => r.type === 'additional')
      .map(r => r.url);
    const colorData = results.find(r => r.type === 'colors')?.data || [];

    // Filter out failed color uploads
    const successfulColors = colorData.filter(item => item.imageUrl);
    if (colorData.length > 0 && successfulColors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All color image uploads failed"
      });
    }

    // Create product
    const product = new Product({
      title: req.body.title,
      price: req.body.price,
      stock: req.body.stock || "In Stock",
      frontImage: frontImageUrl,
      sideImage: sideImageUrl,
      backImage: backImageUrl,
      images: additionalImages,
      size: sizes,
      description: req.body.description,
      colors: successfulColors.map(item => item.color),
      colorImages: successfulColors.map(item => item.imageUrl),
      seller: req.user.id,
      customizable: req.body.customizable || false,
      productType: productType,
    });

    await product.save();
    res.status(201).json({ success: true, product });
    
  } catch (error) {
    console.error("Error in add product route:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An internal server error occurred",
    });
  }
};


export const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: `Validation errors - ${errors.array()[0].msg}`,
      });
    }

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product not found",
      });
    }

    if (existingProduct.seller.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You are not the seller of this product",
      });
    }

    // Delete old images from Cloudinary before uploading new ones
    await deleteFromCloudinary(existingProduct.frontImage);
    await deleteFromCloudinary(existingProduct.sideImage);
    await deleteFromCloudinary(existingProduct.backImage);
    existingProduct.images.forEach(async (image) => {
      await deleteFromCloudinary(image);
    });

    const frontImageUrl = await uploadToCloudinary(req.files.front[0], `${req.body.title}_front`);
    const sideImageUrl = await uploadToCloudinary(req.files.side[0], `${req.body.title}_side`);
    const backImageUrl = await uploadToCloudinary(req.files.back[0], `${req.body.title}_back`);

    const additionalImages = [];
    if (req.files.images) {
      for (const [index, image] of req.files.images.entries()) {
        const imageUrl = await uploadToCloudinary(image, `${req.body.title}_image_${index}`);
        additionalImages.push(imageUrl);
      }
    }

    const updatedProduct = {
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      frontImage: frontImageUrl || existingProduct.frontImage,
      sideImage: sideImageUrl || existingProduct.sideImage,
      backImage: backImageUrl || existingProduct.backImage,
      images: additionalImages || existingProduct.images,
      colors: req.body.colors,
      customizable: req.body.customizable,
    };

    const product = await Product.findByIdAndUpdate(req.params.id, updatedProduct, {
      new: true,
    });

    if (!product) {
      return res.status(500).json({ error: "Failed to update product" });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in update product route", error);
  }
};


export const deleteProduct = async (req, res) => {
  try {
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product not found",
      });
    }

    if (existingProduct.seller.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You are not the seller of this product",
      });
    }

    // Function to extract public_id from Cloudinary URL
    const extractPublicId = (url) => {
      const parts = url.split('/');
      const publicIdWithExtension = parts[parts.length - 1];
      const publicId = publicIdWithExtension.split('.')[0];
      return publicId;
    };

    if (existingProduct.frontImage) {
      const frontImagePublicId = extractPublicId(existingProduct.frontImage);
      await deleteFromCloudinary(frontImagePublicId);
    }

    if (existingProduct.sideImage) {
      const sideImagePublicId = extractPublicId(existingProduct.sideImage);
      await deleteFromCloudinary(sideImagePublicId);
    }

    if (existingProduct.backImage) {
      const backImagePublicId = extractPublicId(existingProduct.backImage);
      await deleteFromCloudinary(backImagePublicId);
    }

    if (existingProduct.images && existingProduct.images.length > 0) {
      for (const image of existingProduct.images) {
        const imagePublicId = extractPublicId(image);
        await deleteFromCloudinary(imagePublicId);
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in delete product route", error);
  }
};


export const getProductCount = async (req, res) => {
  try {
    // Count all products in the database
    const productCount = await Product.countDocuments({});

    // Return the count in the response
    res.status(200).json({ success: true, count: productCount });
  } catch (error) {
    console.error("❌ Error fetching product count:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};