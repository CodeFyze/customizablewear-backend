import { validationResult } from "express-validator";
import Product from "../Models/Product.js";
import uploadToAzure from "../Utils/uploadToAzureStorage.js";
import deleteFromAzure from "../Utils/deleteFromAzureStorage.js";
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




export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    // Ensure quantity is a positive integer
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find or create the user's cart
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, products: [] });
    }

    // Check if the product is already in the cart
    const existingProductIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingProductIndex !== -1) {
      // Product is already in the cart, so update the quantity
      cart.products[existingProductIndex].quantity += quantity;
    } else {
      // Product is not in the cart, add it
      cart.products.push({ product: productId, quantity });
    }

    // Save the cart
    await cart.save();

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in add to cart route", error);
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


export const addProduct = async (req, res) => {
  try {
    console.log("Received request to add product", req.body);
    console.log("Files received:", req.files);

    // Ensure images are provided
    if (!req.files || !req.files["front"] || !req.files["side"] || !req.files["back"]) {
      return res.status(400).json({
        success: false,
        message: "Front, side, and back images are required",
      });
    }

    // Convert colors string to array (because it's sent as JSON from FormData)
    let colors = [];
    if (req.body.colors) {
      try {
        colors = JSON.parse(req.body.colors);
      } catch (error) {
        return res.status(400).json({ success: false, message: "Invalid colors format" });
      }
    }

    // Log parsed fields
    console.log("Parsed data:", {
      title: req.body.title,
      price: req.body.price,
      stock: req.body.stock,
      colors: colors,
    });

    // Ensure required fields exist
    if (!req.body.title || !req.body.price) {
      return res.status(400).json({
        success: false,
        message: "Title and price are required",
      });
    }

    // Upload images to Azure or any storage service
    const frontImageUrl = await uploadToAzure(req.files["front"][0], `${req.body.title}_front`);
    const sideImageUrl = await uploadToAzure(req.files["side"][0], `${req.body.title}_side`);
    const backImageUrl = await uploadToAzure(req.files["back"][0], `${req.body.title}_back`);

    // Handle additional images
    const additionalImages = [];
    if (req.files["images"]) {
      for (const image of req.files["images"]) {
        const imageUrl = await uploadToAzure(image, `${req.body.title}_extra`);
        additionalImages.push(imageUrl);
      }
    }

    // Save product in MongoDB
    const product = new Product({
      title: req.body.title,
      price: req.body.price,
      stock: req.body.stock || "In Stock",
      frontImage: frontImageUrl,
      sideImage: sideImageUrl,
      backImage: backImageUrl,
      images: additionalImages,
      colors: colors,
      seller: req.user.id,
      customizable: req.body.customizable || false,
    });

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error("Error in add product route:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
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

    // Check if product exists
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user is the seller
    if (existingProduct.seller.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You are not the seller of this product",
      });
    }

    if (!(req.files.front && req.files.side && req.files.back && req.files.images)) {
      return res.status(400).json({
        success: false,
        message: "Front, side, back, and other images are required",
      });
    }

    // Upload new images if they are provided
    let frontImageUrl, sideImageUrl, backImageUrl;
    const additionalImages = [];
    const timestamp = Date.now();
    await deleteFromAzure(existingProduct.frontImage); // Delete old image
    frontImageUrl = await uploadToAzure(req.files.front[0], `${req.user.id}_${req.body.title}_front_${timestamp}`);
    
    await deleteFromAzure(existingProduct.sideImage); // Delete old image
    sideImageUrl = await uploadToAzure(req.files.side[0], `${req.user.id}_${req.body.title}_side_${timestamp}`);

    await deleteFromAzure(existingProduct.backImage); // Delete old image
    backImageUrl = await uploadToAzure(req.files.back[0], `${req.user.id}_${req.body.title}_back_${timestamp}`);

    existingProduct.images.forEach(async (image) => {
      await deleteFromAzure(image); // Delete old image
    });

    for (const [index, image] of req.files.images.entries()) {
      const imageUrl = await uploadToAzure(image, `${req.user.id}_${req.body.title}_image_${timestamp}_${index}`);
      additionalImages.push(imageUrl);
    }

    if(req.files.images.length !== additionalImages.length) {
      return res.status(400).json({
        success: false,
        message: "Failed to upload images",
      });
    }
    
    if(!frontImageUrl || !sideImageUrl || !backImageUrl) {
      return res.status(400).json({
        success: false,
        message: "Failed to upload images",
      });
    }

    // Prepare updated fields
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
    // Update the product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updatedProduct,
      {
        new: true,
      }
    );

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
    // Check if product exists
    console.log("Hi ", req.params.id);
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user is the seller
    if (existingProduct.seller.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You are not the seller of this product",
      });
    }

    console.log("Front Image: ", existingProduct.frontImage);
    console.log("Side Image: ", existingProduct.sideImage);
    console.log("Back Image: ", existingProduct.backImage);
    // Delete the images from Azure
    await Promise.all([
      deleteFromAzure(existingProduct.frontImage),
      deleteFromAzure(existingProduct.sideImage),
      deleteFromAzure(existingProduct.backImage),
    ]);

    // Delete the product
    await Product.findByIdAndDelete(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
    console.error("Error in delete product route", error);
  }
};
