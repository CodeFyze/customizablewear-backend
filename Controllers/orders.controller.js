import Order from '../Models/Order.js';
import Product from '../Models/Product.js';
import mongoose from 'mongoose';
import User from '../Models/User.js';
import sendEmail from '../Utils/sendEmail.js';
import Cart from '../Models/Cart.js';
import nodemailer from 'nodemailer';
import { selectFields } from 'express-validator/lib/field-selection.js';
import Promo from '../Models/Promo.js';
import PDFDocument from 'pdfkit';

export const getAllOrders = async (req, res) => {
	console.log('getting all orders');
	try {
		// Log the incoming request to check the user ID and role
		console.log('Fetching orders for user ID:', req.user.id);
		console.log('User role:', req.user.role);

		// Verify user object and ID
		if (!req.user || !req.user.id) {
			console.log('User ID not found in the request.');
			return res.status(400).json({
				success: false,
				message: 'User ID is missing in the request',
			});
		}

		// If the user is a seller, fetch all orders
		let orders;
		if (req.user.role === 'seller') {
			orders = await Order.find(); // Fetch all orders for the seller
			console.log('Fetched all orders for seller:', orders);
		} else {
			// If the user is not a seller, fetch orders based on their userId
			orders = await Order.find({ userId: req.user.id });
			console.log('Fetched orders for user ID:', req.user.id);
		}

		// Check if no orders were found
		if (orders.length === 0) {
			console.log('No orders found for user ID:', req.user.id); // Log when no orders are found
			return res.status(400).json({
				success: false,
				message: 'No orders found',
			});
		}

		// Log the successful response
		console.log('Successfully fetched orders:', orders);
		res.status(200).json({ success: true, orders });
	} catch (error) {
		// Log the error to help with debugging
		console.error('Error in getAllOrders route:', error);

		res.status(500).json({
			success: false,
			message: 'An internal server error occurred',
		});
	}
};

export const getOrdersByUserId = async (req, res) => {
	try {
		let userId;

		// ✅ If a seller/admin is making the request, use the `userId` from URL params
		if (req.user.role === 'seller' || req.user.role === 'admin') {
			userId = req.params.id; // Fetch orders for any user
		} else {
			// ✅ If a normal user, fetch only their own orders
			userId = req.user.id;
		}

		// ✅ Validate `userId` (must be a valid MongoDB ObjectId)
		if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
			console.log('❌ Invalid or missing User ID:', userId);
			return res.status(400).json({ success: false, message: 'Invalid or missing User ID' });
		}

		console.log('✅ Fetching orders for userId:', userId);

		// ✅ Convert `userId` to ObjectId for querying
		const orders = await Order.find({ userId: new mongoose.Types.ObjectId(userId) });

		if (!orders || orders.length === 0) {
			console.log('❌ No orders found for user ID:', userId);
			return res.status(404).json({ success: false, message: 'No orders found for this user' });
		}

		console.log('✅ Orders found:', orders.length);
		res.status(200).json({ success: true, orders });
	} catch (error) {
		console.error('❌ Error fetching orders by user ID:', error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

export const getOrderById = async (req, res) => {
	try {
		if (!req.user || !req.user.id) {
			return res.status(401).json({ success: false, message: 'Unauthorized - No user found' });
		}

		// Find the order by ID
		const order = await Order.findById(req.params.id);

		if (!order) {
			return res.status(404).json({ success: false, message: 'Order not found' });
		}

		// Allow access if the user owns the order OR if they are a seller/admin
		if (order.userId.toString() !== req.user.id && req.user.role !== 'seller' && req.user.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'You are not authorized to view this order' });
		}

		res.status(200).json({ success: true, order });
	} catch (error) {
		console.error('Error fetching order by ID:', error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

export const createOrder = async (req, res) => {
	try {
		console.log('🚀 Incoming Order Request:', JSON.stringify(req.body, null, 2));

		const { shippingAddress, products, totalAmount, promoCode, discount, finalAmount, paymentMode } = req.body;
		const userId = req.user?.id;

		if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
			console.error('❌ Invalid or missing User ID');
			return res.status(400).json({ success: false, message: 'Invalid or missing User ID' });
		}

		if (!shippingAddress || !shippingAddress.firstName || !shippingAddress.address || products.length === 0) {
			console.error('❌ Missing required fields:', { shippingAddress, products });
			return res
				.status(400)
				.json({ success: false, message: 'Missing required fields (Shipping Address or Products)' });
		}
		const productIds = products.map((item) => item.productId);
		console.log('productIds', productIds);
		const existingProducts = await Product.find({ _id: { $in: productIds } });
		console.log('existing ids', existingProducts);

		// if (existingProducts.length !== productIds.length) {
		// 	console.error('❌ Some products do not exist:', { productIds, existingProducts });
		// 	return res.status(400).json({ success: false, message: 'Some products no longer exist' });
		// }

		const orderProducts = products.map((item) => ({
			productId: item.productId,
			title: item.title || 'Untitled Product',
			frontImage: item.frontImage || 'Default',
			sideImage: item.sideImage || '',
			price: item.logo ? item.price + 5 : item.price,
			size: item.size || 'Default',
			color: item.color || 'Default',
			logo: item.logo || '',
			quantity: item.quantity || 1,
			method: item.method || 'Not selected',
			position: item.position || 'Not selected',
			textLine: item.textLine || '',
			font: item.font || '',
			notes: item.notes || '',
		}));

		const order = new Order({
			userId: new mongoose.Types.ObjectId(userId),
			shippingAddress,
			products: orderProducts,
			totalAmount,
			promoCode: promoCode || '',
			discount: discount || 0,
			finalAmount,
			paymentMode,
			paymentStatus: paymentMode === 'Online' ? 'Paid' : 'Pending',
		});

		await order.save();
		console.log(`✅ Order ${order._id} created successfully!`);

		const user = await User.findById(userId);
		if (user && !user.isCustomer) {
			user.isCustomer = true;
			await user.save();
			console.log(`✅ User ${userId} is now marked as a customer.`);
		}

		// ✅ Send order confirmation email to customer
		if (user?.email) {
			const options = {
				email: user.email,
				subject: 'Order Confirmation',
				message: `Thank you for your order! Your order ID is: ${order.id}`,
			};
			await sendEmail(options);
		}
		/// ✅ Delete the user's cart after successful order placement
		try {
			const cart = await Cart.findOne({ user: userId });
			if (cart) {
				await Cart.deleteOne({ user: userId });
				console.log(`🛒 Cart deleted for user ${userId}`);
			} else {
				console.log(`🛒 No cart found for user ${userId}`);
			}
		} catch (error) {
			console.error('❌ Error deleting cart:', error);
		}

		res.status(201).json({ success: true, message: 'Order created successfully', order });
	} catch (error) {
		console.error('❌ Error creating order:', error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};


//update order status
export const updateOrder = async (req, res) => {
	try {
		const { id } = req.params;
		const { status, trackingId } = req.body; // Add trackingId to the request body

		const updates = {
			paymentStatus: status,
			...(trackingId && { trackingId }), // Add trackingId to updates if provided
		};

		// Validate order ID
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid order ID' });
		}

		// Validate updates
		if (!updates || Object.keys(updates).length === 0) {
			return res.status(400).json({ error: 'No updates provided' });
		}

		// Find and update the order
		const updatedOrder = await Order.findByIdAndUpdate(id, updates, { new: true }).populate('userId');

		// If order not found
		if (!updatedOrder) {
			return res.status(404).json({ error: 'Order not found' });
		}

		const customerEmail = updatedOrder.userId.email;

		// If status is updated, send an email
		if (customerEmail) {
			const emailSubject = `Order ${updatedOrder._id} Status Changed`;
			const emailText = `The order with ID ${updatedOrder._id} has been updated to: ${status}.`; // Plain text version
			const emailHtml = `
				<p>Dear ${updatedOrder.userId?.firstName || 'Customer'},</p>
				<p>Your order with ID <strong>#${updatedOrder._id}</strong> has been updated to: <strong>${status}</strong>.</p>
				${
					updatedOrder.trackingId
						? `<p>You can track your order using this tracking ID: <strong>${updatedOrder.trackingId}</strong>.</p>`
						: ''
				}
				<p>Thank you for shopping with us!</p>
			`;

			console.log('Email HTML Content:', emailHtml); // Debugging: Log the HTML content

			await sendEmail({
				email: customerEmail,
				subject: emailSubject,
				message: emailText, // Plain text version
				html: emailHtml, // HTML version
			});
		}

		// Return updated order
		res.json({ success: true, message: 'Order updated successfully', updatedOrder });
	} catch (error) {
		console.error('❌ Error updating order:', error);
		res.status(500).json({ error: 'Failed to update order' });
	}
};


// Delete an order
export const deleteOrder = async (req, res) => {
	try {
		const { id } = req.params;

		// Find the order by ID
		const order = await Order.findById(id);

		// If order not found, return 404 error
		if (!order) {
			return res.status(404).json({ message: 'Order not found' });
		}

		// Check if the user is the owner of the order
		if (order.userId.toString() !== req.user.id) {
			return res.status(403).json({
				message: 'You are not authorized to delete this order',
			});
		}

		// Delete the order from the database
		await Order.findByIdAndDelete(id);
		res.status(200).json({ message: 'Order deleted successfully' });
	} catch (error) {
		res.status(500).json({ error: 'Failed to delete order' });
	}
};

export const getCustomers = async (req, res) => {
	try {
		// Find unique user IDs from orders
		const customerIds = await Order.distinct('userId');

		// Fetch user details for these customers
		const customers = await User.find({ _id: { $in: customerIds } }).select('firstName lastName email phone createdAt');

		// Fetch order count for each customer
		const customersWithOrders = await Promise.all(
			customers.map(async (customer) => {
				const orderCount = await Order.countDocuments({ userId: customer._id });

				return {
					id: customer._id, // Customer ID
					name: `${customer.firstName} ${customer.lastName}`, // Full Name
					email: customer.email,
					phone: customer.phone,
					orders: orderCount, // Number of orders
					status: orderCount > 0 ? 'Active' : 'Inactive', // Status based on orders
					joinedDate: customer.createdAt, // Date of Registration
				};
			}),
		);

		res.status(200).json({
			success: true,
			count: customersWithOrders.length,
			customers: customersWithOrders,
		});
	} catch (error) {
		console.error('❌ Error fetching customers:', error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};

// private messages to specify the order
export const updateOrderMessage = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { message } = req.body; // The new message from the admin

		// Check if the user is an admin
		if (req.user.role !== 'seller') {
			return res.status(403).json({ success: false, message: 'Only admins can update the order message' });
		}

		// Validate the order ID
		if (!mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).json({ success: false, message: 'Invalid order ID' });
		}

		// Find the order and update the message
		const updatedOrder = await Order.findByIdAndUpdate(
			orderId,
			{ message }, // Update the message field
			{ new: true }, // Return the updated order
		);

		if (!updatedOrder) {
			return res.status(404).json({ success: false, message: 'Order not found' });
		}

		res.status(200).json({ success: true, message: 'Message updated successfully', updatedOrder });
	} catch (error) {
		console.error('Error updating order message:', error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

//get private message
export const getOrderMessage = async (req, res) => {
	try {
		const { orderId } = req.params;
		// Check if the user is an admin
		if (req.user.role !== 'seller') {
			return res.status(403).json({ success: false, message: 'Only admins can update the order message' });
		}

		// Validate the order ID
		if (!mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).json({ success: false, message: 'Invalid order ID' });
		}

		// Find the order and update the message
		const { message } = await Order.findById(orderId); // Return the updated order

		if (!message) {
			return res.status(200).json({ success: true, message: ""});
		}

		res.status(200).json({ success: true, message: message });
	} catch (error) {
		console.error('Error getting order message:', error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

export const getEmailMessage = async (req, res) => {
	try {
		const { orderId } = req.params;
		// Check if the user is an admin
		if (req.user.role !== 'seller') {
			return res.status(403).json({ success: false, message: 'Only admins can update the order message' });
		}

		// Validate the order ID
		if (!mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).json({ success: false, message: 'Invalid order ID' });
		}

		// Find the order and update the message
		const { lastEmailSent } = await Order.findById(orderId); // Return the updated order

		if (!lastEmailSent) {
			return res.status(200).json({ success: true, message: '' });
		}

		res.status(200).json({ success: true, message: lastEmailSent });
	} catch (error) {
		console.error('Error getting email message:', error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

// send order email
export const sendOrderEmail = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { message } = req.body;

		// Validate the order ID
		if (!mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).json({ success: false, message: 'Invalid order ID' });
		}

		// Find the order
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ success: false, message: 'Order not found' });
		}

		// Get the user ID from the order
		const userId = order.userId.toString();

		// Find the user by ID to get the email
		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		// Get the customer's email
		const customerEmail = user.email;

		console.log('Recipient Email:', customerEmail); // Debugging line

		if (!customerEmail) {
			return res.status(400).json({ success: false, message: 'Customer email not found' });
		}

		// Send the email to the customer
		await sendEmail({
			email: customerEmail,
			subject: 'Message from Seller',
			message: message,
		});

		order.lastEmailSent = message;
		await order.save();

		res.status(200).json({ success: true, message: 'Email sent successfully' });
	} catch (error) {
		console.error('Error sending email:', error);
		res.status(500).json({ success: false, message: 'Failed to send email' });
	}
};
export const deleteEmail = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { email } = req.body; // The new message from the admin
		``;
		// Check if the user is an admin
		if (req.user.role !== 'seller') {
			return res.status(403).json({ success: false, message: 'Only admins can update the order message' });
		}

		// Validate the order ID
		if (!mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).json({ success: false, message: 'Invalid order ID' });
		}

		// Find the order and update the message
		const updatedOrder = await Order.findByIdAndUpdate(
			orderId,
			{ lastEmailSent: email }, // Update the message field
			{ new: true }, // Return the updated order
		);

		if (!updatedOrder) {
			return res.status(404).json({ success: false, message: 'Order not found' });
		}

		res.status(200).json({ success: true, message: 'Email updated successfully', updatedOrder });
	} catch (error) {
		console.error('Error updating order message:', error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

// download invoice
export const downloadInvoice = async (req, res) => {
	try {
		const orderId = req.params.orderId;

		// Fetch the order details from the database
		const order = await Order.findById(orderId).populate('userId').populate('products.productId');

		if (!order) {
			return res.status(404).json({ success: false, message: 'Order not found' });
		}

		// Create a new PDF document
		const doc = new PDFDocument();

		// Set the response headers for PDF download
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);

		// Pipe the PDF to the response
		doc.pipe(res);

		// Add content to the PDF
		doc.fontSize(25).text('Invoice', { align: 'center' });
		doc.moveDown();

		// Add order details
		doc.fontSize(14).text(`Order ID: ${order._id}`);
		doc.text(`Date: ${order.createdAt.toDateString()}`);
		doc.moveDown();

		// Add customer details
		doc.text(`Customer Name: ${order.userId.firstName} ${order.userId.lastName}`);
		doc.text(`Email: ${order.userId.email}`);
		doc.moveDown();

		// Add tracking ID (if available)
		if (order.trackingId) {
			doc.text(`Tracking ID: ${order.trackingId}`);
			doc.moveDown();
		}

		// Add product details
		doc.text('Products:');
		order.products.forEach((item, index) => {
			doc.text(`${index + 1}. ${item.title} - ${item.quantity} x $${item.price}`);
		});
		doc.moveDown();

		// Add pricing details
		doc.text(`Subtotal: $${order.totalAmount}`);
		doc.text(`Discount: $${order.discount}`);
		doc.text(`Total: $${order.finalAmount}`);
		doc.moveDown();

		// Finalize the PDF
		doc.end();
	} catch (error) {
		console.error('Error generating invoice:', error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};

// Get Tracking ID for an order
export const getTrackingId = async (req, res) => {
	try {
		const { orderId } = req.params;

		// Find the order by ID
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ message: 'Order not found' });
		}

		// Return the tracking ID
		res.status(200).json({ trackingId: order.trackingId || '' });
	} catch (error) {
		console.error('Error fetching tracking ID:', error);
		res.status(500).json({ message: 'Failed to fetch tracking ID' });
	}
};

// Update Tracking ID for an order
export const updateTrackingId = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { trackingId } = req.body;

		// Find the order by ID
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ message: 'Order not found' });
		}

		// Update the tracking ID
		order.trackingId = trackingId;
		await order.save();

		// Return success response
		res.status(200).json({ message: 'Tracking ID updated successfully' });
	} catch (error) {
		console.error('Error updating tracking ID:', error);
		res.status(500).json({ message: 'Failed to update tracking ID' });
	}
};
export const removeTrackingId = async (req, res) => {
	try {
		const { orderId } = req.params;

		// Find the order by ID
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ message: 'Order not found' });
		}

		// Remove the tracking ID
		order.trackingId = ''; // Set tracking ID to an empty string
		await order.save();

		res.status(200).json({ message: 'Tracking ID removed successfully' });
	} catch (error) {
		console.error('Error removing tracking ID:', error);
		res.status(500).json({ message: 'Failed to remove tracking ID' });
	}
};