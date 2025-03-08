import express from "express";
import { body, param } from "express-validator";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  getOrdersByUserId,
  updateOrder, 
  getCustomers,
} from "../Controllers/orders.controller.js";

const router = express.Router();

router.get("/", getAllOrders);

router.get(
  "/orders/:id",
  
  [param("id", "Invalid order ID").isMongoId()],
  getOrderById
);

router.get(
  "/order-user/:id",
  [param("id", "Invalid order ID").isMongoId()],
 getOrdersByUserId
);

router.post(
  "/create",
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

router.put(
	'/update/:id',
	[
		param('id', 'Invalid order ID').isMongoId(),
		body('status', 'Invalid status')
			.optional()
			.isString()
			.isIn(['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']),
		body('products', 'Products must be an array').optional().isArray(),
		body('products.*.productId', 'Product ID is invalid').optional().isMongoId(),
		body('products.*.quantity', 'Quantity must be a positive integer').optional().isInt({ gt: 0 }),
		body('products.*.customizations', 'Customizations must be an object').optional().isObject(),
	],
	updateOrder,
);



router.get("/customers", getCustomers);

export default router;
