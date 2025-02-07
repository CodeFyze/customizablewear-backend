import express from "express";
import { body } from "express-validator";
import multer from 'multer';
import { getAllProducts, getProductById, getProductByName, addProduct , updateProduct , deleteProduct  } from "../Controllers/products.controller.js";
import authenticate from "../Middleware/authenticate.js"; 
import { addToCart } from "../Controllers/products.controller.js";


// Set up multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage }).fields([
  { name: 'front', maxCount: 1 },
  { name: 'side', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]);

const router = express.Router();

// Get all products: GET "/api/products". No Auth required
router.get("/", getAllProducts);

// Get product by id: GET "/api/products/:id". No Auth required
router.get("/:id", getProductById);

// Get product by name: GET "/api/products/name/:name". No Auth required
router.get("/name/:name", getProductByName);


// Add a new product: POST "/api/products/add". Requires Auth
router.post(
  "/add",
  authenticate,
  upload,
  [
    body("title", "Title is required and must be at least 3 characters long").trim().isString().isLength({ min: 3 }),
    // body("description", "Description must be a string").optional().trim().isString().isLength({ min: 10 }),
    // body("price", "Price must be a positive number").trim().isNumeric().isFloat({ gt: 0 }),
    body("colors", "Colors must be an array of strings").optional().isArray().custom((value) => {
      return value.every(color => typeof color === 'string');
    }),
  ],
  addProduct
);

// Update a product: PUT "/api/products/update/:id". Requires Auth
router.put(
  "/update/:id",
  authenticate,
  upload,
  [
    body("title", "Title is required and must be at least 3 characters long").optional().trim().isString().isLength({ min: 3 }),
    body("price", "Price must be a positive number").optional().trim().isNumeric().isFloat({ gt: 0 }),
    // body("description", "Description must be a string").optional().trim().isString(),
    body("colors", "Colors must be an array of strings").optional().isArray().custom((value) => {
      return value.every(color => typeof color === 'string');
    }),
  ],
  updateProduct
);

// Delete a product: DELETE "/api/products/delete/:id". Requires Auth
router.delete("/delete/:id",authenticate, deleteProduct);

router.post(
  "/cart",
  authenticate,
  [
    body("productId", "Product ID is required").isMongoId(),
    body("quantity", "Quantity must be a positive integer").isInt({ gt: 0 }),
  ],
  addToCart
);


export default router;
