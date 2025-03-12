import express from "express";
import { addToCart, removeFromCart, getCart, increaseQuantity, decreaseQuantity , } from "../Controllers/cartController.js";
import authenticate from "../Middleware/authenticate.js";

const router = express.Router();

// Apply authentication middleware to cart routes
router.post("/add", authenticate, addToCart);
router.delete("/remove/:productId", authenticate, removeFromCart);
router.get("/", authenticate, getCart);
router.put('/increase/:productId', authenticate , increaseQuantity);
router.put('/decrease/:productId', authenticate, decreaseQuantity);





export default router;
