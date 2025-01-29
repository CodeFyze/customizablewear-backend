import { validationResult } from "express-validator";
import Product from "../Models/Product.js";
import uploadToAzure from '../Utils/uploadToAzureStorage.js';
import deleteFromAzure from '../Utils/deleteFromAzureStorage.js';
import Cart from "../Models/Cart.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
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

export const addProduct = async (req, res) => {
  try {
    console.log("Add Product controller", req.body);
    // console.log(req.files);
    // console.log(req);
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: `Validation errors - ${errors.array()[0].msg}`,
      });
    }

    // At least one image is required
    console.log(req);
    if (!req.files || req.files.length === 0) {
      console.log("req.files", req.files);
      console.log("req.file", req.file);
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    // Check if product already exists
    const existingProduct = await Product.findOne({ title: req.body.title });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product already exists",
      });
    }

    // Uploads all images to azure and stores the urls in photoUrls
    req.files.forEach((file, index) => {
      file.originalname = `${req.user.id}_${req.body.title}_${index}`;
    });
    const photoUrls = await Promise.all(req.files.map(file => uploadToAzure(file, file.originalname)));
    
    // Create a new product
    const product = new Product({
      title: req.body.title,
      // description: req.body.description,
      price: req.body.price,
      photoUrls: photoUrls,
      seller: req.user.id,
    });

    // Save the product
    await product.save();
    
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
    });
    console.error("Error in add product route", error);
  }
};

export const updateProduct = async (req, res) => {
  try {
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: `Validation errors - ${errors.array()[0].msg}`,
      });
    }

    // At least one image is required
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
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

    // Delete the old images from azure
    await Promise.all(existingProduct.photoUrls.map(url => deleteFromAzure(url)));

    // Uploads all images to azure and stores the urls in photoUrls
    req.files.forEach((file, index) => {
      file.originalname = `${req.user.id}_${req.body.title}_${index}`;
    })
    const photoUrls = await Promise.all(req.files.map(file => uploadToAzure(file, file.originalname)));

    // Update the product
    const bodyPayload = {
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      photoUrls
    };
    const product = await Product.findByIdAndUpdate(req.params.id, bodyPayload, {
      new: true,
    });
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
    });
    console.error("Error in update product route", error);
  }
}

export const deleteProduct = async (req, res) => {
  try {
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

    // Delete the images from azure
    await Promise.all(existingProduct.photoUrls.map(url => deleteFromAzure(url)));

    // Delete the product
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occured",
    });
    console.error("Error in delete product route", error);
  }
}
