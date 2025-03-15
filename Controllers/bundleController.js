import Bundle from "../Models/Bundle.js"; // ES Modules import
import { uploadToCloudinary } from "../config/uploadToCloudinary.js"; // Cloudinary upload utility



export const submitForm = async (req, res) => {
    try {
      const { BundleData, categories } = req.body;
  
      // Check if categories are selected
      if (categories.length === 0) {
        return res.status(400).json({ message: "At least one category must be selected" });
      }
  
      // Parse colors from the request body (ensure it's an array)
      let colors = Array.isArray(BundleData) ? BundleData : JSON.parse(BundleData || "[]"); // Only parse if it's a string
      let colorImages = [];
  
      // If color images are URLs (as in your JSON body), push them directly into colorImages array
      if (req.body.colorImages && req.body.colorImages.length > 0) {
        req.body.colorImages.forEach((imageUrl, index) => {
          const color = colors[index] ? colors[index].color : "#000000"; // Default color if missing
          colorImages.push({ color, image: imageUrl });
        });
      } else {
        console.warn("No color images provided.");
      }
  
      // Ensure required fields like title and price are provided
      if (!req.body.title || !req.body.price) {
        return res.status(400).json({
          success: false,
          message: "Title and price are required",
        });
      }
  
      // If product image is being provided as URL
      const mainImageUrl = req.body.productImage_0 || ""; // Assuming productImage_0 is URL
  
      // Ensure that sizes is an array
      const sizes = Array.isArray(req.body.sizes) ? req.body.sizes : req.body.sizes.split(","); // Handle size as a string or array
  
      // Ensure productType is an array
      const productType = Array.isArray(req.body.productType) ? req.body.productType : req.body.productType.split(","); // Handle product type as a string or array
  
      // Ensure that product type is selected
      if (productType.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one product type (hoodie, shirt, trouser) must be selected",
        });
      }
  
      // Ensure price is a valid number
      const price = parseFloat(req.body.price);
      if (isNaN(price)) {
        return res.status(400).json({
          success: false,
          message: "Invalid price value",
        });
      }
  
      // Save the bundle to the database with colors & images
      const newBundle = new Bundle({
        image: mainImageUrl,  // Main image of the bundle (it could be a URL)
        colors: colorImages.map((item) => ({
          color: item.color,
          image: item.image,
          sizes: sizes,  // Ensuring sizes are saved with the color
        })),
        categories: categories,
        size: sizes,
        description: req.body.description,
        seller: req.user.id,  // Seller ID (user)
        customizable: req.body.customizable || false,
        productType: productType,  // Save the product type
        price: price,  // Save the price correctly
      });
  
      // Save the new bundle object
      await newBundle.save();
  
      return res.status(201).json({ success: true, bundle: newBundle });
  
    } catch (error) {
      console.error("Error in form submission:", error);
      return res.status(500).json({
        success: false,
        message: "An internal server error occurred",
      });
    }
  };
  