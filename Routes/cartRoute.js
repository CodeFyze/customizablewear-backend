import express from "express";
import { addToCart, removeFromCart, getCart, } from "../Controllers/cartController.js";
import authenticate from "../Middleware/authenticate.js";

const router = express.Router();

// Apply authentication middleware to cart routes
router.post("/add", authenticate, addToCart);
router.delete("/remove/:productId", authenticate, removeFromCart);
router.get("/", authenticate, getCart);

export default router;
