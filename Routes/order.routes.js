// order.routes.js
import express from "express";
import { body, param } from "express-validator";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder, // Import updateOrder
} from "../Controllers/orders.controller.js";

const router = express.Router();

// Get all orders: GET "/api/orders". Requires Auth
router.get("/orders", getAllOrders);

// Get order by ID: GET "/api/orders/:id". Requires Auth
router.get(
  "/orders/:id",
  [param("id", "Invalid order ID").isMongoId()],
  getOrderById
);

// Create a new order: POST "/api/orders/create". Requires Auth
router.post(
  "/orders/create",
  [
    body("products", "Products are required").isArray({ min: 1 }),
    body("products.*.productId", "Product ID is invalid").isMongoId(),
    body("products.*.quantity", "Quantity must be a positive integer").isInt({
      gt: 0,
    }),
    body("products.*.customizations", "Customizations must be an object")
      .optional()
      .isObject(),
    body("totalAmount", "Total amount must be a positive number")
      .isNumeric()
      .isFloat({ gt: 0 }),
  ],
  createOrder
);

// Update an order: PUT "/api/orders/update/:id". Requires Auth
router.put(
  "/orders/update/:id",
  [
    param("id", "Invalid order ID").isMongoId(),
    body("status", "Invalid status")
      .optional()
      .isString()
      .isIn(["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"]),
    body("products", "Products must be an array").optional().isArray(),
    body("products.*.productId", "Product ID is invalid")
      .optional()
      .isMongoId(),
    body("products.*.quantity", "Quantity must be a positive integer")
      .optional()
      .isInt({ gt: 0 }),
    body("products.*.customizations", "Customizations must be an object")
      .optional()
      .isObject(),
  ],
  updateOrder
);

export default router;
