import express from "express";
import { body, param } from "express-validator";
import {
	getAllOrders,
	getOrderById,
	createOrder,
	getOrdersByUserId,
	updateOrder,
	getCustomers,
	updateOrderMessage,
	sendOrderEmail,
	getOrderMessage,
	downloadInvoice,
	deleteEmail,
	getEmailMessage,
	getTrackingId,
	updateTrackingId,
	removeTrackingId,
} from '../Controllers/orders.controller.js';

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

// Update the message for an order (Admin only)
router.put("/:orderId/message", updateOrderMessage);
router.get("/:orderId/message", getOrderMessage);

router.put('/:orderId/deleteEmail', deleteEmail);
router.get('/:orderId/getEmailMessage', getEmailMessage);
router.post('/:orderId/send-email', sendOrderEmail);
// Route for downloading the invoice
router.get('/:orderId/invoice', downloadInvoice);


router.get("/customers", getCustomers);
// ==================================================
// New Routes for Tracking ID
// ==================================================

// Get Tracking ID for an order
router.get(
	'/:orderId/tracking',
	[param('orderId', 'Invalid order ID').isMongoId()],
	getTrackingId
);

// Update Tracking ID for an order
router.put(
	'/:orderId/tracking',
	[
		param('orderId', 'Invalid order ID').isMongoId(),
		body('trackingId', 'Tracking ID is required').isString().notEmpty(),
	],
	updateTrackingId
);
// Route to remove tracking ID
router.delete('/:orderId/tracking', removeTrackingId);


export default router;
